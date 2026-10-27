// GA-only "Taster bookings" screen (in the staff menu): people who booked a
// free taster at the selected choir with the website's "Book a taster" form.
// The form only asks which choir, so this lists the last 8 weeks' bookings
// that haven't come yet, who's here today, and who came to an earlier
// rehearsal - tap a booking to check them in as a taster attendee (they move
// to "Here today", and appear on "Who's here" too). Long-press a
// check-in to undo it (today's only). Once someone's been checked in, the
// Email button sends them the "great to meet you - here's how to join" email
// (the website's TasterFollowUpEmail).
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
  // The rehearsal's UK date they came to, "YYYY-MM-DD"
  attended_date: string | null;
  // When the follow-up email was last sent, if it has been
  follow_up_sent_at: string | null;
};

type TasterBookingsResponse = {
  venue: string;
  choir: string;
  // UK date of today's rehearsal, "YYYY-MM-DD"
  today: string;
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

  // The follow-up email - asks first, and warns if it's already been sent
  const sendEmail = async (booking: TasterBooking) => {
    setSavingId(booking.id);
    try {
      const { message } = await authRequest<{ message: string }>({
        method: 'POST',
        url: '/api/member-resources/taster-email',
        data: { booking_id: booking.id },
      });
      showMessage('Email sent', message);
    } catch {
      showMessage("Couldn't send the email", 'Please try again.');
    } finally {
      setSavingId(null);
    }
    load();
  };

  const confirmEmail = (booking: TasterBooking) =>
    confirm({
      title: booking.follow_up_sent_at
        ? `Already emailed on ${bookedOn(booking.follow_up_sent_at)} - send again?`
        : `Email ${booking.first_name}?`,
      message: `Sends the "great to meet you - here's how to join" email to ${booking.email}.`,
      confirmText: 'Send',
      onConfirm: () => sendEmail(booking),
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
  // Not come yet / checked in tonight / came to an earlier rehearsal
  const booked = matching.filter((booking) => !booking.attended_at);
  const hereToday = matching.filter(
    (booking) => booking.attended_at && booking.attended_date === current?.today
  );
  const cameEarlier = matching
    .filter(
      (booking) =>
        booking.attended_at && booking.attended_date !== current?.today
    )
    .sort((a, b) => String(b.attended_at).localeCompare(String(a.attended_at)));
  const sections = [
    { title: 'Booked', data: booked },
    { title: 'Here today', data: hereToday },
    { title: 'Came earlier', data: cameEarlier },
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
          // --- One row per booking: tap to check in, long-press to undo
          // (today's check-ins only), Email once they've been ---
          renderItem={({ item }) => {
            const hasCome = !!item.attended_at;
            const isToday = hasCome && item.attended_date === current?.today;
            return (
              <Pressable
                onPress={() => (hasCome ? undefined : confirmCheckIn(item))}
                onLongPress={() => (isToday ? confirmUndo(item) : undefined)}
                disabled={savingId === item.id}
                className="mx-4 flex-row items-center justify-between border-b border-white/10 py-3"
              >
                <View className="flex-1">
                  <Text className="text-lg text-white">{fullName(item)}</Text>
                  <Text className="text-sm text-gray-400">
                    {item.email} · booked {bookedOn(item.booked_at)}
                  </Text>
                  {item.follow_up_sent_at ? (
                    <Text className="text-xs text-lightGold">
                      Emailed {bookedOn(item.follow_up_sent_at)}
                    </Text>
                  ) : null}
                </View>
                {/* Follow-up email ("great to meet you - here's how to
                    join") - only once they've been checked in */}
                {hasCome ? (
                  <Pressable
                    onPress={() => confirmEmail(item)}
                    disabled={savingId === item.id}
                    hitSlop={6}
                    accessibilityLabel={`Email ${fullName(item)}`}
                    className="mr-2 rounded-md border border-lightGold/60 p-1.5"
                  >
                    <Ionicons
                      name={
                        item.follow_up_sent_at
                          ? 'mail-open-outline'
                          : 'mail-outline'
                      }
                      size={20}
                      color={LIGHT_GOLD}
                    />
                  </Pressable>
                ) : null}
                {hasCome ? (
                  // When they came: "19:42" tonight, "28 Sep" earlier
                  <View className="flex-row items-center">
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={isToday ? '#4ade80' : '#9ca3af'}
                    />
                    <Text
                      className={`ml-1 text-base ${isToday ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      {isToday
                        ? timeOf(item.attended_at as string)
                        : bookedOn(item.attended_at as string)}
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
            hereToday.length || cameEarlier.length ? (
              <Text className="mb-8 mt-4 px-6 text-center text-xs text-gray-500">
                ✉ sends the &ldquo;great to meet you&rdquo; email. Long-press
                someone who&apos;s here today to undo their check-in.
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
