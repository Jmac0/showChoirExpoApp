import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '@/contexts/authContext';

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
  const { profile, authRequest } = useAuth();
  const isGA = profile?.role === 'ga';

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetches the venue list and picks today's venue. Only sets state after the
  // request returns, so it's safe to call straight from an effect.
  const loadVenues = async () => {
    try {
      const data = await authRequest<VenuesResponse>({
        url: '/api/member-resources/venues',
      });
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
    } finally {
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
