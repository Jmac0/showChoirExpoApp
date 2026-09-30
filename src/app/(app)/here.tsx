// GA-only "Who's here" tab: everyone scanned in at the selected rehearsal.
// Signing out and walk-ins are handled on paper, so this is "who arrived".
//
// Keeps itself up to date (polls while the tab is open, plus pull to
// refresh), and a long-press on a name undoes that check-in - e.g. a mis-scan
// or someone scanned under the wrong venue. Undo reverses the scan: it gives
// back any flexi session used and removes any payment taken at the desk.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { VenueBar } from '@/components/VenueBar';
import { useAuth } from '@/contexts/authContext';
import { useRehearsal } from '@/contexts/rehearsalContext';
import { confirm, showMessage } from '@/lib/confirm';

// How often the list refreshes itself while the tab is open, so it picks up
// scans made on other GAs' phones.
const POLL_INTERVAL_MS = 20000;

// Matches `lightGold` in tailwind.config.js (RefreshControl isn't styled via className).
const LIGHT_GOLD = 'rgb(222,204,120)';

// Mirrors AttendanceEntry / AttendanceResponse in the website's
// api/member-resources/attendance.ts
type AttendanceEntry = {
  id: string;
  first_name: string;
  last_name: string;
  membership_type?: string;
  scanned_at: string;
  // Set if they weren't paid up when scanned
  payment?: 'cash' | 'card' | 'pay_later';
};

// Badge next to someone's name if they weren't paid up when scanned, showing
// how they got in (green = paid at the desk, amber = owes). Handy for
// checking the cash box and iZettle takings at the end of the night.
const PAYMENT_BADGES = {
  cash: { label: 'Cash', className: 'bg-green-700' },
  card: { label: 'Card', className: 'bg-green-700' },
  pay_later: { label: 'Pay later', className: 'bg-amber-500' },
};

type AttendanceResponse = {
  venue: string;
  session_date: string;
  count: number;
  checkins: AttendanceEntry[];
};

const fullName = (entry: AttendanceEntry) =>
  `${entry.first_name} ${entry.last_name}`.trim();

// ISO timestamp -> "19:42"
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

const WhosHereScreen = () => {
  // --- State & hooks ---

  const { profile, authRequest } = useAuth();
  const { venue, today } = useRehearsal();
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // --- Talk to the website ---

  const loadAttendance = useCallback(async () => {
    if (!venue || !today) return;
    try {
      const data = await authRequest<AttendanceResponse>({
        url: '/api/member-resources/attendance',
        params: { venue: venue.slug, date: today },
      });
      setAttendance(data);
      setError(false);
    } catch {
      // Keep showing the last list we had, with a warning.
      setError(true);
    }
    // authRequest changes identity every render; the venue/date are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.slug, today]);

  const undoCheckIn = async (entry: AttendanceEntry) => {
    try {
      await authRequest({
        method: 'POST',
        url: '/api/member-resources/undo-check-in',
        data: { checkin_id: entry.id },
      });
    } catch {
      showMessage("Couldn't undo", 'Please try again.');
    }
    loadAttendance();
  };

  // --- Keeping the list up to date ---

  // Load now, then poll - but only while this tab is on screen.
  useFocusEffect(
    useCallback(() => {
      loadAttendance();
      const interval = setInterval(loadAttendance, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [loadAttendance])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAttendance();
    setIsRefreshing(false);
  };

  // --- Actions ---

  // Ask before undoing (confirm() also works in a web browser).
  const confirmUndo = (entry: AttendanceEntry) => {
    confirm({
      title: `Undo ${fullName(entry)}'s check-in?`,
      message:
        'They will be removed from this list. Any session used is given back, and any payment taken at the desk is removed.',
      confirmText: 'Undo check-in',
      onConfirm: () => undoCheckIn(entry),
    });
  };

  // --- What to render ---

  // Not a GA. The tab is hidden for them anyway (see (app)/_layout.tsx);
  // this guards against reaching the route some other way.
  if (profile?.role !== 'ga') {
    return (
      <View className="flex-1 items-center bg-lightBlack pt-10">
        <Text className="text-white">Only GAs can see who&apos;s here.</Text>
      </View>
    );
  }

  // Only show a list that belongs to the selected rehearsal - after switching
  // venue, the old one is hidden until the new one has loaded.
  const current =
    attendance?.venue === venue?.slug && attendance?.session_date === today
      ? attendance
      : null;

  const query = search.trim().toLowerCase();
  const visible = (current?.checkins ?? []).filter((entry) =>
    fullName(entry).toLowerCase().includes(query)
  );

  return (
    <View className="flex-1 bg-lightBlack">
      <VenueBar label="Here at" />

      {venue ? (
        <FlatList
          data={visible}
          keyExtractor={(entry) => entry.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={LIGHT_GOLD}
              colors={[LIGHT_GOLD]}
            />
          }
          keyboardShouldPersistTaps="handled"
          // --- Count + search, scrolls with the list ---
          ListHeaderComponent={
            <View className="px-4 pb-2 pt-6">
              <Text className="text-center text-6xl font-bold text-lightGold">
                {current?.count ?? '–'}
              </Text>
              <Text className="mb-4 text-center text-base text-white">
                scanned in
              </Text>
              {error ? (
                <Text className="mb-3 rounded-md bg-amber-500 px-3 py-2 text-center font-bold text-white">
                  Couldn&apos;t update the list - pull down to retry
                </Text>
              ) : null}
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name"
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                clearButtonMode="while-editing"
                className="rounded-lg bg-white/10 px-4 py-3 text-base text-white"
              />
            </View>
          }
          // --- One row per person ---
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => confirmUndo(item)}
              className="mx-4 flex-row items-center justify-between border-b border-white/10 py-3"
            >
              <View className="flex-1">
                <Text className="text-lg text-white">{fullName(item)}</Text>
                <View className="flex-row items-center">
                  <Text className="text-sm text-gray-400">
                    {item.membership_type === 'flexi'
                      ? 'Flexi'
                      : 'Direct Debit'}
                  </Text>
                  {/* Cash / Card / Pay later badge, if they paid at the desk */}
                  {item.payment ? (
                    <Text
                      className={`ml-2 rounded px-1.5 py-0.5 text-xs font-bold text-white ${PAYMENT_BADGES[item.payment].className}`}
                    >
                      {PAYMENT_BADGES[item.payment].label}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text className="text-base text-gray-300">
                {formatTime(item.scanned_at)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            current ? (
              <Text className="mt-6 text-center text-gray-400">
                {query ? 'No one matches that name' : 'No one scanned in yet'}
              </Text>
            ) : null
          }
          ListFooterComponent={
            visible.length ? (
              <Text className="mb-8 mt-4 text-center text-xs text-gray-500">
                Long-press a name to undo a check-in
              </Text>
            ) : null
          }
        />
      ) : (
        <Text className="mt-10 px-8 text-center text-white">
          Choose the rehearsal venue above to see who&apos;s here.
        </Text>
      )}
    </View>
  );
};

export default WhosHereScreen;
