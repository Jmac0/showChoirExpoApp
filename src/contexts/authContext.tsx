import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { type AxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  useContext,
  createContext,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';

import { api } from '@/lib/api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
// The last profile the website sent, so the app (and the membership card)
// still works when it's opened with no signal. Not secret - name, email,
// membership details - so plain AsyncStorage.
const PROFILE_KEY = 'memberProfile';

// Our website's own answer - it always replies with { message }. A hall
// wifi's sign-in page (or a proxy) can also answer 401/403/404, and that
// mustn't log anyone out.
const fromOurWebsite = (error: unknown, statuses: number[]) =>
  axios.isAxiosError(error) &&
  statuses.includes(error.response?.status ?? 0) &&
  typeof (error.response?.data as { message?: unknown })?.message === 'string';

// The website said no to the login (bad or expired), as opposed to "couldn't
// reach the website" - only then do we log the member out
const isRejected = (error: unknown) => fromOurWebsite(error, [401, 403]);

// expo-secure-store has no keychain equivalent on web, so fall back to localStorage there.
const tokenStorage = {
  getItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(window.localStorage.getItem(key))
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(window.localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(window.localStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

// Which member a token belongs to (its "id"), read without checking it -
// only used to make sure a saved profile is this login's, not the last one's
const tokenOwner = (token: string): string | null => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    // JWTs leave off the "=" padding, which atob may want
    const part = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return (JSON.parse(atob(part)) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
};

type SavedProfile = {
  profile: MemberProfile;
  // When the website sent it (ISO) - shown as "saved at ..." when offline
  savedAt: string;
  // The member it belongs to (from their login)
  owner: string | null;
};

const saveProfile = (profile: MemberProfile | null, refreshToken?: string) =>
  (profile
    ? AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          profile,
          savedAt: new Date().toISOString(),
          owner: refreshToken ? tokenOwner(refreshToken) : null,
        } satisfies SavedProfile)
      )
    : AsyncStorage.removeItem(PROFILE_KEY)
  ).catch(() => {
    // Not kept - only matters for the next offline start
  });

// The saved profile, if it's this login's
const loadSavedProfile = async (
  refreshToken: string
): Promise<SavedProfile | null> => {
  try {
    const saved = JSON.parse(
      (await AsyncStorage.getItem(PROFILE_KEY)) || 'null'
    ) as SavedProfile | null;
    if (!saved?.profile) return null;
    const owner = tokenOwner(refreshToken);
    return !saved.owner || !owner || saved.owner === owner ? saved : null;
  } catch {
    return null;
  }
};

// The website says the member's account has gone (deleted)
const isMemberGone = (error: unknown) =>
  fromOurWebsite(error, [404]) &&
  (error as { response: { data: { message: string } } }).response.data
    .message === 'Member not found';

// A real profile, not e.g. a wifi sign-in page that answered instead
const checkProfile = (data: unknown): MemberProfile => {
  if (typeof (data as MemberProfile)?.email !== 'string') {
    throw new Error('Unexpected reply instead of the member profile');
  }
  return data as MemberProfile;
};

// Their Direct Debit has stopped - mirrors DirectDebitNotice in the
// website's src/lib/directDebit.ts. Dates are ISO strings.
export interface DirectDebitNotice {
  ended_at: string;
  // Their membership stays active until this date (14 days after it stopped)
  grace_ends_at: string;
  in_grace_period: boolean;
  // e.g. "cancelled", "subscription cancelled"
  what_happened: string;
  reason: string;
}

// Matches the website's UserDataType (src/types/types.ts)
export interface MemberProfile {
  email: string;
  first_name: string;
  last_name: string;
  active_member: boolean;
  // Direct Debit membership active (including the grace period after it stops)
  active_mandate: boolean;
  // Set if their Direct Debit has stopped - the home screen shows a notice
  direct_debit?: DirectDebitNotice | null;
  // Whether to show the membership card (QR code) - false once a Direct
  // Debit membership has ended (the website's isMembershipCardActive)
  card_active?: boolean;
  // Flexi: when their sessions expire, if within a month (the website's
  // lib/flexiExpiry.ts - 6 months without a check-in)
  flexi_expiry?: { expires_at: string; in_warning: boolean } | null;
  // When their Flexi sessions expired (membership_type "flexi_expired")
  flexi_expired_at?: string | null;
  flexi_sessions: number;
  // False for a Flexi member brought over from paper whose sessions haven't
  // been entered yet - the welcome desk does it at their next rehearsal
  // (missing from an older website - treat as confirmed)
  flexi_sessions_confirmed?: boolean;
  flexi_type: string;
  // Price of their next Flexi pack of 10, in pounds - the "Buy 10 more
  // sessions" button (missing from an older website)
  flexi_pack_price?: number;
  membership_type: string;
  // "ga" (glamorous assistant) unlocks the member-scanning tab
  role: string;
}

interface SessionData {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  signIn: (formData: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  // Swaps the refresh token for a new access token (they expire after ~15 min).
  // Returns null, and signs out, if the website rejects the login. If the
  // website just can't be reached it throws and the member stays logged in.
  refreshAccessToken: () => Promise<string | null>;
  // Calls the website as the logged-in member and returns the response body,
  // refreshing an expired access token and retrying once if needed.
  // e.g. authRequest<Venues>({ url: '/api/member-resources/venues' })
  authRequest: <T>(config: AxiosRequestConfig) => Promise<T>;
  // Re-fetches the member's profile (e.g. flexi sessions left) from the DB.
  // 'ok', 'offline' (the website couldn't be reached - showing what we
  // have), or 'signedOut' (their account or login has gone).
  refreshProfile: () => Promise<'ok' | 'offline' | 'signedOut'>;
  // The website couldn't be reached last time we tried - showing the
  // details saved on the phone, from profileSavedAt (ISO)
  isOffline: boolean;
  profileSavedAt: string | null;
  session: SessionData | null;
  profile: MemberProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  signIn: async () => ({ success: false }),
  signOut: () => null,
  refreshAccessToken: async () => null,
  authRequest: async () => {
    throw new Error('authRequest must be used inside <AuthProvider />');
  },
  refreshProfile: async () => 'offline',
  isOffline: false,
  profileSavedAt: null,
  session: null,
  profile: null,
  isLoading: true,
});

// This hook can be used to access the user info.
export function useAuth() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useAuth must be wrapped in a <AuthProvider />');
    }
  }

  return value;
}

async function fetchProfile(accessToken: string) {
  const res = await api.get<MemberProfile>(
    '/api/member-resources/get-profile',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<SessionData | null>(null);
  const [profile, setProfileState] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The same session, for authRequest / refreshAccessToken. Screens keep hold
  // of the functions from their first render, so these read the session from
  // here rather than from that render - otherwise every request after the
  // first token refresh would go out with the expired token.
  const sessionRef = useRef<SessionData | null>(null);
  // A token refresh already under way - shared, so several requests failing
  // at once (a poll, a screen opening, the app coming back) only refresh once
  const refreshing = useRef<Promise<string | null> | null>(null);
  // ...and which login it's for
  const refreshingFor = useRef<string | null>(null);
  // Showing the saved profile (opened offline / poor signal) - and when it
  // was saved. Cleared once the website answers.
  const [profileStale, setProfileStale] = useState(false);
  // ...and the website didn't answer when we tried
  const [isOffline, setIsOffline] = useState(false);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  const setSession = useCallback((next: SessionData | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  // A fresh profile from the website: show it, and keep a copy for next time
  const setProfile = useCallback((next: MemberProfile | null) => {
    setProfileState(next);
    setProfileStale(false);
    setIsOffline(false);
    // When it's from - shown if Show Choir can't be reached later on
    setProfileSavedAt(next ? new Date().toISOString() : null);
    saveProfile(next, sessionRef.current?.refreshToken);
  }, []);

  // Still the same login as when something started? (A reply that arrives
  // after they've logged out - or someone else has logged in on the same
  // phone - must be ignored.)
  const isStillLoggedInAs = (refreshToken: string) =>
    sessionRef.current?.refreshToken === refreshToken;

  const signIn: AuthContextType['signIn'] = async (formData) => {
    const email = formData.email.trim().toLowerCase();
    // Passwords are sent exactly as typed (spaces included), like the
    // website's login - only the email is tidied up
    const { password } = formData;

    try {
      const { data } = await api.post<SessionData>('/api/auth/appLogin', {
        email,
        password,
      });

      const memberProfile = await fetchProfile(data.accessToken);

      await tokenStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      await tokenStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

      refreshing.current = null;
      refreshingFor.current = null;
      setSession(data);
      setProfile(memberProfile);

      return { success: true };
    } catch (error) {
      let message = 'Unable to log in. Please try again.';
      if (axios.isAxiosError(error)) {
        message = error.response
          ? (error.response.data?.message ?? message)
          : // No response at all - timed out or the server couldn't be reached.
            "Can't reach the server. Check your connection and try again.";
      }
      return { success: false, error: message };
    }
  };

  const signOut = useCallback(async () => {
    // Tell the website this phone's login is finished, so the saved token
    // can't be used again. Not waited for - with no signal they're still
    // logged out here, and the token runs out by itself after 30 days.
    const refreshToken = sessionRef.current?.refreshToken;
    if (refreshToken) {
      api
        .post('/api/auth/appLogout', { refreshToken }, { timeout: 5000 })
        .catch(() => {
          // Offline or an older website - nothing more to do
        });
    }
    // Forget the session first, so any reply still on its way is ignored
    refreshing.current = null;
    refreshingFor.current = null;
    setSession(null);
    setProfile(null);
    await tokenStorage.deleteItem(ACCESS_TOKEN_KEY);
    await tokenStorage.deleteItem(REFRESH_TOKEN_KEY);
    router.replace('/login');
  }, [setSession, setProfile]);

  const refreshAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return null;
    if (!refreshing.current) {
      refreshingFor.current = current.refreshToken;
      refreshing.current = (async () => {
        try {
          const { data } = await api.post<{ accessToken: string }>(
            '/api/auth/refresh',
            { refreshToken: current.refreshToken }
          );
          // A wifi sign-in page can answer instead - not a token
          if (typeof data?.accessToken !== 'string') {
            throw new Error('Unexpected reply instead of a token');
          }
          // Logged out (or someone else logged in) meanwhile - not theirs
          if (!isStillLoggedInAs(current.refreshToken)) return null;
          await tokenStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
          setSession({ ...current, accessToken: data.accessToken });
          return data.accessToken;
        } catch (error) {
          // Only a "no" from the website logs them out - and only if it's
          // still the login it was about. No signal or a timeout (bad hall
          // wifi) leaves them logged in: the request that needed the token
          // fails, and the next one tries again.
          if (isRejected(error)) {
            if (isStillLoggedInAs(current.refreshToken)) await signOut();
            return null;
          }
          throw error;
        } finally {
          // (Unless a new login has started its own meanwhile)
          if (refreshingFor.current === current.refreshToken) {
            refreshing.current = null;
            refreshingFor.current = null;
          }
        }
      })();
    }
    return refreshing.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSession, signOut]);

  const authRequest = useCallback(
    async <T,>(config: AxiosRequestConfig) => {
      const current = sessionRef.current;
      if (!current) throw new Error('Not logged in');

      const send = async (token: string) => {
        const res = await api.request<T>({
          ...config,
          headers: { ...config.headers, Authorization: `Bearer ${token}` },
        });
        return res.data;
      };

      try {
        return await send(current.accessToken);
      } catch (error) {
        // Anything other than "not authorised" is a real failure - pass it on.
        if (!axios.isAxiosError(error) || error.response?.status !== 401) {
          throw error;
        }
        // Access token expired - get a new one and try once more.
        // (If the website rejects the refresh, refreshAccessToken signs the
        // member out; if it can't be reached, that error is passed on.)
        const newToken = await refreshAccessToken();
        if (!newToken) throw error;
        return send(newToken);
      }
    },
    [refreshAccessToken]
  );

  const refreshProfile = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return 'signedOut' as const;
    try {
      const fresh = checkProfile(
        await authRequest<MemberProfile>({
          url: '/api/member-resources/get-profile',
        })
      );
      // Only if it's still the same login
      if (isStillLoggedInAs(current.refreshToken)) setProfile(fresh);
      return 'ok' as const;
    } catch (error) {
      if (!isStillLoggedInAs(current.refreshToken)) return 'signedOut' as const;
      // The website says their account's gone - log out. (A login the
      // website turns down has already been logged out by the refresh.)
      if (isMemberGone(error)) {
        await signOut();
        return 'signedOut' as const;
      }
      if (!sessionRef.current) return 'signedOut' as const;
      // Offline, timeout, website down etc: keep showing what we have
      setIsOffline(true);
      return 'offline' as const;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authRequest, setProfile, signOut]);

  // Restore a previously persisted session on app start.
  useEffect(() => {
    const restoreSession = async () => {
      const [accessToken, refreshToken] = await Promise.all([
        tokenStorage.getItem(ACCESS_TOKEN_KEY),
        tokenStorage.getItem(REFRESH_TOKEN_KEY),
      ]).catch(() => [null, null]);
      if (!accessToken || !refreshToken) return;

      // Saved profile for this login: show it straight away (the
      // membership card at the door shouldn't wait for hall wifi), and check
      // with the website in the background
      const saved = await loadSavedProfile(refreshToken);
      if (saved) {
        setSession({ accessToken, refreshToken });
        setProfileState(saved.profile);
        setProfileSavedAt(saved.savedAt);
        setProfileStale(true);
        setIsLoading(false);
        refreshProfile();
        return;
      }

      // Nothing saved yet (e.g. the first start after updating) - wait for
      // the website
      try {
        let currentToken = accessToken;
        let memberProfile: MemberProfile;
        try {
          memberProfile = checkProfile(await fetchProfile(currentToken));
        } catch (error) {
          if (!axios.isAxiosError(error) || error.response?.status !== 401) {
            throw error;
          }
          // Access token expired while the app was closed (they only last
          // ~15 min) - swap the refresh token for a new one and try again.
          const { data } = await api.post<{ accessToken: string }>(
            '/api/auth/refresh',
            { refreshToken }
          );
          if (typeof data?.accessToken !== 'string') {
            throw new Error('Unexpected reply instead of a token');
          }
          currentToken = data.accessToken;
          await tokenStorage.setItem(ACCESS_TOKEN_KEY, currentToken);
          memberProfile = checkProfile(await fetchProfile(currentToken));
        }
        setSession({ accessToken: currentToken, refreshToken });
        setProfile(memberProfile);
      } catch (error) {
        if (isRejected(error) || isMemberGone(error)) {
          // The server turned the saved login down (e.g. the 30-day refresh
          // token expired, or the member's gone) - forget it, they'll log in
          // again
          await tokenStorage.deleteItem(ACCESS_TOKEN_KEY);
          await tokenStorage.deleteItem(REFRESH_TOKEN_KEY);
          saveProfile(null);
          return;
        }
        // No signal (or the website's down): carry on logged in, with no
        // profile yet - tried again below
        setSession({ accessToken, refreshToken });
        setProfileStale(true);
        setIsOffline(true);
      }
    };

    restoreSession().finally(() => setIsLoading(false));
  }, [setSession, setProfile, refreshProfile]);

  // Refresh the profile whenever the app comes back to the foreground, so a
  // member sees their updated flexi count after being scanned in.
  // useEffectEvent always sees the latest session without re-subscribing.
  const onAppStateChange = useEffectEvent((state: string) => {
    if (state === 'active') refreshProfile();
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  // Showing saved details: keep trying every 20 seconds (while the app's
  // open) until the website answers, so it catches up by itself once
  // they're back in signal
  useEffect(() => {
    if (!profileStale && !isOffline) return undefined;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refreshProfile();
    }, 20_000);
    return () => clearInterval(timer);
  }, [profileStale, isOffline, refreshProfile]);

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        refreshAccessToken,
        authRequest,
        refreshProfile,
        isOffline,
        profileSavedAt,
        session,
        profile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
