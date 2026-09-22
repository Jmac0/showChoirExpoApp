import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  useContext,
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

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

// Matches the website's UserDataType (src/types/types.ts)
export interface MemberProfile {
  email: string;
  first_name: string;
  active_member: boolean;
  active_mandate: boolean;
  flexi_sessions: number;
  flexi_type: string;
  membership_type: string;
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
  session: SessionData | null;
  profile: MemberProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  signIn: async () => ({ success: false }),
  signOut: () => null,
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
  const res = await axios.get<MemberProfile>(
    `${BASE_URL}/api/member-resources/get-profile`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore a previously persisted session on app start.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          tokenStorage.getItem(ACCESS_TOKEN_KEY),
          tokenStorage.getItem(REFRESH_TOKEN_KEY),
        ]);
        if (accessToken && refreshToken) {
          const memberProfile = await fetchProfile(accessToken);
          setSession({ accessToken, refreshToken });
          setProfile(memberProfile);
        }
      } catch {
        // Stored token is missing/expired/invalid - fall back to logged-out state.
        await tokenStorage.deleteItem(ACCESS_TOKEN_KEY);
        await tokenStorage.deleteItem(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const signIn: AuthContextType['signIn'] = async (formData) => {
    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    try {
      const { data } = await axios.post<SessionData>(
        `${BASE_URL}/api/auth/appLogin`,
        { email, password }
      );

      const memberProfile = await fetchProfile(data.accessToken);

      await tokenStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      await tokenStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

      setSession(data);
      setProfile(memberProfile);

      return { success: true };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ??
          'Unable to log in. Please try again.')
        : 'Unable to log in. Please try again.';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    await tokenStorage.deleteItem(ACCESS_TOKEN_KEY);
    await tokenStorage.deleteItem(REFRESH_TOKEN_KEY);
    setSession(null);
    setProfile(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        session,
        profile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
