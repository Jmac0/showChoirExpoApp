import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

// Mirror MIN/MAX_CONFIRMED_SESSIONS in the website's lib/flexiMembersShared.ts
const MIN_SESSIONS = -20;
const MAX_SESSIONS = 100;

// Who the sheet is for - from the check-in-member "confirm_sessions" response
export type MemberToConfirm = {
  email: string;
  name: string;
};

type Props = {
  // The member to show, or null to hide the sheet
  member: MemberToConfirm | null;
  // True while the number is being sent - shows a spinner, disables buttons
  isSaving: boolean;
  onConfirm: (sessions: number) => void;
  onCancel: () => void;
};

// Slides up on the Scan tab the first time a Flexi member brought over from
// the paper records is scanned (their sessions haven't been entered yet). The
// GA checks the paper record and enters the sessions they have left - before
// tonight, negative if they owe some. The scanner then checks them in as
// usual (one session used, or the payment drawer if they have none).
export function ConfirmSessionsSheet({
  member,
  isSaving,
  onConfirm,
  onCancel,
}: Props) {
  // What's typed - text so it can be empty or "-" while typing
  const [text, setText] = useState('');
  const sessions = Number(text);
  const isValid =
    text.trim() !== '' &&
    Number.isInteger(sessions) &&
    sessions >= MIN_SESSIONS &&
    sessions <= MAX_SESSIONS;

  // − / + buttons (and the only way to go negative on some keyboards)
  const step = (by: number) => {
    const current = Number.isInteger(sessions) ? sessions : 0;
    const next = Math.min(MAX_SESSIONS, Math.max(MIN_SESSIONS, current + by));
    setText(String(next));
  };

  const close = (action: () => void) => {
    action();
    setText('');
  };

  return (
    <Modal
      visible={!!member}
      animationType="slide"
      transparent
      // Android back button - same as Cancel (ignored while saving)
      onRequestClose={isSaving ? undefined : () => close(onCancel)}
    >
      <View className="flex-1 justify-end bg-black/60">
        {member ? (
          <View className="rounded-t-2xl bg-lightBlack px-6 pb-10 pt-6">
            {/* --- Who and why --- */}
            <Text className="text-center text-2xl font-bold text-white">
              {member.name}
            </Text>
            <Text className="mt-1 text-center text-lg font-bold text-amber-400">
              Flexi sessions still on paper
            </Text>
            <Text className="mt-4 text-center text-base text-gray-300">
              Check their paper record: how many sessions do they have left,
              before tonight? (Negative if they owe some.)
            </Text>

            {/* --- The number --- */}
            <View className="mt-5 flex-row items-center justify-center gap-4">
              <Pressable
                onPress={() => step(-1)}
                disabled={isSaving}
                hitSlop={8}
                accessibilityLabel="One less"
                className="h-14 w-14 items-center justify-center rounded-full border-2 border-lightGold active:opacity-80"
              >
                <Ionicons name="remove" size={28} color="rgb(222,204,120)" />
              </Pressable>
              <TextInput
                value={text}
                onChangeText={(value) =>
                  setText(value.replace(/[^0-9-]/g, '').slice(0, 4))
                }
                keyboardType="numbers-and-punctuation"
                placeholder="0"
                placeholderTextColor="#6b7280"
                editable={!isSaving}
                accessibilityLabel="Sessions left"
                className="w-28 rounded-lg bg-white py-3 text-center text-3xl font-bold text-black"
              />
              <Pressable
                onPress={() => step(1)}
                disabled={isSaving}
                hitSlop={8}
                accessibilityLabel="One more"
                className="h-14 w-14 items-center justify-center rounded-full border-2 border-lightGold active:opacity-80"
              >
                <Ionicons name="add" size={28} color="rgb(222,204,120)" />
              </Pressable>
            </View>

            {/* --- Save and check in --- */}
            <Pressable
              disabled={!isValid || isSaving}
              onPress={() => close(() => onConfirm(sessions))}
              className={`mt-6 items-center rounded-lg bg-lightGold py-4 active:opacity-80 ${
                !isValid ? 'opacity-50' : ''
              }`}
            >
              <Text className="text-lg font-bold text-black">
                Save and check in
              </Text>
              {isValid ? (
                <Text className="text-xs text-black">
                  {sessions > 0
                    ? `Uses 1 tonight - ${sessions - 1} left after`
                    : 'They have none - you can take payment next'}
                </Text>
              ) : null}
            </Pressable>

            {/* --- Don't check them in --- */}
            {isSaving ? (
              <ActivityIndicator className="mt-6" color="#fff" />
            ) : (
              <Pressable
                onPress={() => close(onCancel)}
                hitSlop={8}
                className="mt-6"
              >
                <Text className="text-center text-base text-gray-400 underline">
                  Cancel - don&apos;t check in
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
