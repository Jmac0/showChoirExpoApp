import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { AppState } from 'react-native';

import { useAuth } from '@/contexts/authContext';
import { canUseGAScreens } from '@/lib/roles';

// Mirrors AppVenue / VenuesResponse in the website's
// api/member-resources/venues.ts
export type Venue = {
  slug: string;
  location: string;
  choirDayOfWeek: string;
  time: string;
  rehearsesToday: boolean;
};

type VenuesResponse = {
  today: string;
  suggested: string | null;
  venues: Venue[];
};

// The venue a GA picked, remembered on this phone for the rest of that day.
const SELECTED_VENUE_KEY = 'gaSelectedVenue';
type StoredVenue = { slug: string; date: string };
// The last venue list the website sent - used if the website can't be
// reached, but only on the same day (it says which choirs rehearse today)
const SAVED_VENUES_KEY = 'gaVenues';

// Today's date in the UK, "YYYY-MM-DD" (the same form as the website's)
const ukToday = () => {
  try {
    // From the parts, not a formatted string - phones differ in how they
    // write dates
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

interface RehearsalContextType {
  venues: Venue[];
  // The rehearsal the GA is scanning for, or null if they still need to pick
  venue: Venue | null;
  // UK date of today's rehearsal, "YYYY-MM-DD"
  today: string | null;
  setVenue: (slug: string) => void;
  isLoading: boolean;
  error: boolean;
  reload: () => Promise<void>;
}

const RehearsalContext = createContext<RehearsalContextType>({
  venues: [],
  venue: null,
  today: null,
  setVenue: () => {},
  isLoading: true,
  error: false,
  reload: async () => {},
});

export const useRehearsal = () => useContext(RehearsalContext);

// Shared by the GA's Scan and Who's here tabs, so both show the same
// rehearsal. Only loads anything for GAs.
export function RehearsalProvider({ children }: PropsWithChildren) {
  const { profile, authRequest, isOffline } = useAuth();
  // GAs, and admins standing in for one
  const isGA = canUseGAScreens(profile?.role);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetches the venue list and picks today's venue. Only sets state after the
  // request returns, so it's safe to call straight from an effect.
  // A load under way - so returning to the app and the signal coming back
  // at the same moment don't load it twice
  const loading = useRef(false);
  const loadVenues = async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      let data: VenuesResponse;
      try {
        data = await authRequest<VenuesResponse>({
          url: '/api/member-resources/venues',
        });
        AsyncStorage.setItem(SAVED_VENUES_KEY, JSON.stringify(data)).catch(
          () => {}
        );
      } catch (error) {
        // No signal: today's saved list, if there is one, so the GA can
        // still choose the rehearsal (scans themselves need signal)
        const saved: VenuesResponse | null = JSON.parse(
          (await AsyncStorage.getItem(SAVED_VENUES_KEY)) || 'null'
        );
        if (saved?.today !== ukToday()) throw error;
        data = saved;
      }
      setError(false);
      setVenues(data.venues);
      setToday(data.today);

      // Keep the GA's choice from earlier today; otherwise use the server's
      // suggestion (today's rehearsal nearest to now).
      const stored = await AsyncStorage.getItem(SELECTED_VENUE_KEY);
      const saved: StoredVenue | null = stored ? JSON.parse(stored) : null;
      const savedIsValid =
        saved?.date === data.today &&
        data.venues.some((venue) => venue.slug === saved.slug);
      setSelectedSlug(savedIsValid ? saved!.slug : data.suggested);
    } catch {
      setError(true);
      // Still showing another day's rehearsals (left open overnight):
      // don't let scans go on being recorded against yesterday's venue
      if (today && today !== ukToday()) {
        setVenues([]);
        setToday(null);
        setSelectedSlug(null);
      }
    } finally {
      loading.current = false;
      setIsLoading(false);
    }
  };

  // "Retry" button in the VenueBar
  const reload = async () => {
    setIsLoading(true);
    setError(false);
    await loadVenues();
  };

  useEffect(() => {
    // loadVenues only sets state once the request returns, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isGA) loadVenues();
    // Only (re)load when the logged-in user becomes / stops being a GA.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGA]);

  // Back in the app: load again if the list is from another day (left open
  // overnight - last week's rehearsal), or couldn't be loaded before
  const onAppActive = useEffectEvent(() => {
    if (isGA && (error || (today && today !== ukToday()))) loadVenues();
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onAppActive();
    });
    return () => subscription.remove();
  }, []);

  // Signal's back (the website has just answered): try again if the list
  // couldn't be loaded
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isGA && !isOffline && error) loadVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  const setVenue = (slug: string) => {
    setSelectedSlug(slug);
    if (today) {
      const toStore: StoredVenue = { slug, date: today };
      AsyncStorage.setItem(SELECTED_VENUE_KEY, JSON.stringify(toStore));
    }
  };

  const venue = venues.find((v) => v.slug === selectedSlug) ?? null;

  return (
    <RehearsalContext.Provider
      value={{ venues, venue, today, setVenue, isLoading, error, reload }}
    >
      {children}
    </RehearsalContext.Provider>
  );
}
