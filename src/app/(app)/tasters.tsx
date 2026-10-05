// GA-only "Taster bookings" screen (in the staff menu): people who booked a
// free taster at the selected choir with the website's "Book a taster" form.
// The form only asks which choir, so this lists the last 8 weeks' bookings
// that haven't come yet - tap someone to check them in as a taster attendee
// (they move to "Here today", and appear on "Who's here" too). Long-press a
// check-in to undo it.
//
// Keeps itself up to date while open (polls, plus pull to refresh), so it
// picks up check-ins made on other GAs' phones.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';

import { VenueBar } from '@/components/VenueBar';
import { useAuth } from '@/contexts/authContext';
import { useRehearsal } from '@/contexts/rehearsalContext';
import { confirm, showMessage } from '@/lib/confirm';

const POLL_INTERVAL_MS = 20000;

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// Mirrors TasterListEntry / TasterBookingsResponse in the website's
// lib/tasters.ts and api/member-resources/taster-bookings.ts
type TasterBooking = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  booked_at: string;
  // Checked in at today's rehearsal here: when
  attended_at: string | null;
};

type TasterBookingsResponse = {
  venue: string;
  choir: string;
  weeks: number;
  bookings: TasterBooking[];
};

const fullName = (booking: TasterBooking) =>
  `${booking.first_name} ${booking.last_name}`.trim();

// "booked 3 Oct"
const bookedOn = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// "19:42"
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

const TastersScreen = () => {
  const { profile, authRequest } = useAuth();
  const { venue } = useRehearsal();
  const [list, setList] = useState<TasterBookingsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);
  // The booking being saved (tap / undo), to avoid double taps
  const [savingId, setSavingId] = useState<string | null>(null);

  // --- Talk to the website ---

  const load = useCallback(async () => {
    if (!venue) return;
    try {
      const data = await authRequest<TasterBookingsResponse>({
        url: '/api/member-resources/taster-bookings',
        params: { venue: venue.slug },
      });
      setList(data);
      setError(false);
    } catch {
      setError(true);
    }
    // authRequest changes identity every render; the venue is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.slug]);

  const send = async (booking: TasterBooking, undo: boolean) => {
    setSavingId(booking.id);
    try {
      await authRequest({
        method: 'POST',
        url: '/api/member-resources/taster-check-in',
        data: undo
          ? { booking_id: booking.id, undo: true }
          : { booking_id: booking.id, venue: venue?.slug },
      });
    } catch {
      showMessage(
        undo ? "Couldn't undo" : "Couldn't check them in",
        'Please try again.'
      );
    } finally {
      setSavingId(null);
    }
    load();
  };

  // --- Keeping the list up to date ---

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  // --- Actions (ask first - confirm() also works in a web browser) ---

  const confirmCheckIn = (booking: TasterBooking) =>
    confirm({
      title: `Check in ${fullName(booking)}?`,
      message: 'As a taster attendee at tonight’s rehearsal.',
      confirmText: 'Check in',
      onConfirm: () => send(booking, false),
    });

  const confirmUndo = (booking: TasterBooking) =>
    confirm({
      title: `Undo ${fullName(booking)}'s check-in?`,
      message: 'They go back to the booked list.',
      confirmText: 'Undo check-in',
      onConfirm: () => send(booking, true),
    });

  // --- What to render ---

  // The screen is only in GAs' staff menu; this guards other ways in
  if (profile?.role !== 'ga') {
    return (
      <View className="flex-1 items-center bg-lightBlack pt-10">
        <Text className="text-white">Only GAs can see taster bookings.</Text>
      </View>
    );
  }

  // Only show a list that belongs to the selected venue
  const current = list?.venue === venue?.slug ? list : null;
  const query = search.trim().toLowerCase();
  const matching = (current?.bookings ?? []).filter((booking) =>
    `${fullName(booking)} ${booking.email}`.toLowerCase().includes(query)
  );
  const booked = matching.filter((booking) => !booking.attended_at);
  const hereToday = matching.filter((booking) => booking.attended_at);
  const sections = [
    { title: 'Booked', data: booked },
    { title: 'Here today', data: hereToday },
  ].filter((section) => section.data.length);

  return (
    <View className="flex-1 bg-lightBlack">
      <VenueBar label="Tasters for" />

      {venue ? (
        <SectionList
          sections={sections}
          keyExtractor={(booking) => booking.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={LIGHT_GOLD}
              colors={[LIGHT_GOLD]}
            />
          }
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          // --- Counts + search ---
          ListHeaderComponent={
            <View className="px-4 pb-2 pt-6">
              <View className="mb-4 flex-row justify-center">
                <View className="mx-6 items-center">
                  <Text className="text-5xl font-bold text-lightGold">
                    {current ? booked.length : '–'}
                  </Text>
                  <Text className="text-base text-white">booked</Text>
                </View>
                <View className="mx-6 items-center">
                  <Text className="text-5xl font-bold text-green-400">
                    {current ? hereToday.length : '–'}
                  </Text>
                  <Text className="text-base text-white">here today</Text>
                </View>
              </View>
              {current ? (
                <Text className="mb-3 text-center text-xs text-gray-400">
                  Bookings for {current.choir} from the last {current.weeks}{' '}
                  weeks
                </Text>
              ) : null}
              {error ? (
                <Text className="mb-3 rounded-md bg-amber-500 px-3 py-2 text-center font-bold text-white">
                  Couldn&apos;t update the list - pull down to retry
                </Text>
              ) : null}
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or email"
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                className="rounded-lg bg-white/10 px-4 py-3 text-base text-white"
              />
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text className="mx-4 mt-4 text-sm font-bold uppercase tracking-widest text-lightGold">
              {section.title}
            </Text>
          )}
          // --- One row per booking: tap to check in, long-press to undo ---
          renderItem={({ item }) => {
            const isHere = !!item.attended_at;
            return (
              <Pressable
                onPress={() => (isHere ? undefined : confirmCheckIn(item))}
                onLongPress={() => (isHere ? confirmUndo(item) : undefined)}
                disabled={savingId === item.id}
                className="mx-4 flex-row items-center justify-between border-b border-white/10 py-3"
              >
                <View className="flex-1">
                  <Text className="text-lg text-white">{fullName(item)}</Text>
                  <Text className="text-sm text-gray-400">
                    {item.email} · booked {bookedOn(item.booked_at)}
                  </Text>
                </View>
                {isHere ? (
                  <View className="flex-row items-center">
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#4ade80"
                    />
                    <Text className="ml-1 text-base text-green-400">
                      {timeOf(item.attended_at as string)}
                    </Text>
                  </View>
                ) : (
                  <View className="rounded-md border border-lightGold px-3 py-1">
                    <Text className="text-sm font-bold text-lightGold">
                      Check in
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            current ? (
              <Text className="mt-6 px-8 text-center text-gray-400">
                {query
                  ? 'No one matches that search'
                  : `No taster bookings for ${current.choir} in the last ${current.weeks} weeks`}
              </Text>
            ) : null
          }
          ListFooterComponent={
            hereToday.length ? (
              <Text className="mb-8 mt-4 text-center text-xs text-gray-500">
                Long-press someone who&apos;s here to undo their check-in
              </Text>
            ) : null
          }
        />
      ) : (
        <Text className="mt-10 px-8 text-center text-white">
          Choose the rehearsal venue above to see its taster bookings.
        </Text>
      )}
    </View>
  );
};

export default TastersScreen;
