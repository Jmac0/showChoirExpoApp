import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/authContext';

// Mirrors MemberSearchResult in the website's
// api/member-resources/search-members.ts
export type MemberSearchResult = {
  email: string;
  first_name: string;
  last_name: string;
  home_choir?: string;
  membership_type?: string;
  active_mandate: boolean;
  // Negative if they owe sessions after "pay later"
  flexi_sessions: number;
  is_ga: boolean;
};

// Matches `lightGold` in tailwind.config.js (icons/placeholder aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// Wait this long after the last key press before searching, so we don't
// send a request for every letter
const SEARCH_DELAY_MS = 300;
// The website ignores shorter searches
const MIN_QUERY_LENGTH = 2;

// Their status, the same things a QR scan would tell you, e.g.
// "GA" / "Direct Debit active" / "Flexi · 7 sessions" / "Flexi · owes 1"
function statusOf(member: MemberSearchResult): {
  text: string;
  className: string;
} {
  if (member.is_ga) return { text: 'GA', className: 'text-lightGold' };
  if (member.active_mandate)
    return { text: 'Direct Debit active', className: 'text-green-400' };
  const sessions = member.flexi_sessions;
  if (sessions > 0)
    return {
      text: `Flexi · ${sessions} session${sessions === 1 ? '' : 's'}`,
      className: 'text-green-400',
    };
  if (sessions < 0)
    return { text: `Flexi · owes ${-sessions}`, className: 'text-red-400' };
  if (member.membership_type === 'flexi_expired')
    return { text: 'Flexi expired', className: 'text-amber-400' };
  return {
    text:
      member.membership_type === 'DD'
        ? 'Direct Debit not active'
        : 'No sessions left',
    className: 'text-amber-400',
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  // Check this member in - the Scan tab treats it like a QR scan
  onCheckIn: (member: MemberSearchResult) => void;
};

// "Search by name" panel on the Scan tab, for someone who turns up without
// their QR code (no phone, no printed card). Type part of their name, see
// their status, and tap Check in - which then works exactly like scanning
// their card (toast, ting, payment drawer if they're not paid up).
export function MemberSearch({ visible, onClose, onCheckIn }: Props) {
  const { authRequest } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  // The search the current results are for, so stale answers are ignored
  const [resultsFor, setResultsFor] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(false);

  const trimmed = query.trim();

  // --- Search as they type (after a short pause) ---

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return undefined;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await authRequest<{ results: MemberSearchResult[] }>({
          url: '/api/member-resources/search-members',
          params: { q: trimmed },
        });
        setResults(data.results);
        setResultsFor(trimmed);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
    // authRequest changes identity every render; the search text is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  // Start fresh each time it's opened
  const close = () => {
    setQuery('');
    setResults([]);
    setResultsFor('');
    setError(false);
    onClose();
  };

  // Only show results for what's typed now (not an older, slower search)
  const shownResults =
    trimmed.length >= MIN_QUERY_LENGTH && resultsFor === trimmed ? results : [];

  // --- What to show under the search box when there are no results ---

  let emptyMessage = '';
  if (trimmed.length < MIN_QUERY_LENGTH) {
    emptyMessage = 'Type at least 2 letters of their name';
  } else if (error) {
    emptyMessage = "Couldn't search - check the connection and try again";
  } else if (!isSearching && resultsFor === trimmed) {
    emptyMessage = 'No members found';
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/60"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="max-h-[85%] min-h-[60%] rounded-t-2xl bg-lightBlack pb-8">
          {/* --- Header --- */}
          <View className="flex-row items-center justify-between p-4">
            <Text className="text-xl font-bold text-lightGold">
              Find a member
            </Text>
            <Pressable onPress={close} hitSlop={8}>
              <Text className="text-lg font-bold text-white">✕</Text>
            </Pressable>
          </View>

          {/* --- Search box --- */}
          <View className="mx-4 mb-3 flex-row items-center rounded-lg border border-lightGold/60 bg-white/10 px-3">
            <Ionicons name="search" size={18} color={LIGHT_GOLD} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="First or last name"
              placeholderTextColor="#9ca3af"
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              clearButtonMode="while-editing"
              selectionColor={LIGHT_GOLD}
              className="ml-2 flex-1 py-3 text-base text-white"
            />
            {isSearching ? <ActivityIndicator color={LIGHT_GOLD} /> : null}
          </View>

          {/* --- Results --- */}
          <FlatList
            data={shownResults}
            keyExtractor={(member) => member.email}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const status = statusOf(item);
              return (
                <View className="mx-4 flex-row items-center border-b border-white/10 py-3">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <Text className="text-lg text-white">
                        {item.first_name} {item.last_name}
                      </Text>
                      {item.is_ga ? (
                        <Ionicons
                          name="star"
                          size={14}
                          color={LIGHT_GOLD}
                          style={{ marginLeft: 6 }}
                        />
                      ) : null}
                    </View>
                    <Text className={`text-sm ${status.className}`}>
                      {status.text}
                    </Text>
                    {/* Helps tell apart members with the same name */}
                    {item.home_choir ? (
                      <Text className="text-xs text-gray-400">
                        {item.home_choir}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => {
                      close();
                      onCheckIn(item);
                    }}
                    className="rounded-md bg-lightGold px-4 py-2 active:opacity-80"
                  >
                    <Text className="font-bold text-black">Check in</Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              emptyMessage ? (
                <Text className="mt-6 px-8 text-center text-gray-400">
                  {emptyMessage}
                </Text>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
