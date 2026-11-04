import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { showMessage } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (icons/switch aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// Mirror MAX_ANNOUNCEMENT_TITLE / _MESSAGE in the website's
// lib/announcementsShared.ts
const MAX_TITLE = 100;
const MAX_MESSAGE = 2000;

// Mirrors AnnouncementRow in the website's lib/announcementsShared.ts
export type Announcement = {
  id: string;
  title: string;
  message: string;
  pinned: boolean;
  // ISO date-times
  created_at: string;
  updated_at: string | null;
  author_name: string;
};

export type AnnouncementFields = Pick<
  Announcement,
  'title' | 'message' | 'pinned'
>;

// Opens the phone's share sheet with the announcement as text, so an admin
// can pick WhatsApp and the choir's group (WhatsApp doesn't let apps post
// into a group by themselves). Same text as the website's WhatsApp button
// (announcementShareText): the title in WhatsApp bold, then the message.
export async function shareAnnouncement({
  title,
  message,
}: Pick<Announcement, 'title' | 'message'>) {
  try {
    await Share.share({ message: `*${title}*\n\n${message}` });
  } catch {
    showMessage("Couldn't share", 'Please try again.');
  }
}

type Props = {
  visible: boolean;
  // The announcement being edited, or null for a new one
  editing: Announcement | null;
  // Saves it - resolves true if it worked (the screen shows any error)
  onSave: (fields: AnnouncementFields) => Promise<boolean>;
  onClose: () => void;
};

// Admins only: the sheet for writing or editing an announcement, from the
// Announcements tab. After posting a new one it offers to share it to
// WhatsApp too, so the choir's group gets the same message.
export function AnnouncementForm({ visible, editing, onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [pinned, setPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Just posted (a new one) - show the "Share to WhatsApp" step
  const [posted, setPosted] = useState<AnnouncementFields | null>(null);

  // Fill the boxes each time the sheet opens (blank for a new one)
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = visible ? (editing?.id ?? 'new') : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setTitle(editing?.title ?? '');
    setMessage(editing?.message ?? '');
    setPinned(editing?.pinned ?? false);
    setPosted(null);
  }

  const canSave = !!title.trim() && !!message.trim() && !isSaving;

  const save = async () => {
    setIsSaving(true);
    const fields = { title: title.trim(), message: message.trim(), pinned };
    const saved = await onSave(fields);
    setIsSaving(false);
    if (!saved) return;
    // Edits just close; a new one offers WhatsApp next
    if (editing) onClose();
    else setPosted(fields);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      // Android back button - same as Cancel (ignored while saving)
      onRequestClose={isSaving ? undefined : onClose}
    >
      {/* "padding" on both platforms - Android no longer shrinks the screen
          for the keyboard (see CLAUDE.md) */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[90%] rounded-t-2xl bg-lightBlack px-6 pb-10 pt-6">
            {posted ? (
              // --- Posted: share it to WhatsApp too? ---
              <View className="items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={LIGHT_GOLD}
                />
                <Text className="mt-2 text-center text-2xl font-bold text-white">
                  Posted
                </Text>
                <Text className="mt-2 text-center text-base text-gray-300">
                  Members can see it now. Send it to the choir&apos;s WhatsApp
                  group too?
                </Text>
                <Pressable
                  onPress={() => shareAnnouncement(posted)}
                  className="mt-6 w-full flex-row items-center justify-center rounded-lg bg-lightGold py-4 active:opacity-80"
                >
                  <Ionicons name="logo-whatsapp" size={22} color="black" />
                  <Text className="ml-2 text-lg font-bold text-black">
                    Share to WhatsApp
                  </Text>
                </Pressable>
                <Pressable onPress={onClose} hitSlop={8} className="mt-6">
                  <Text className="text-center text-base text-gray-400 underline">
                    Done
                  </Text>
                </Pressable>
              </View>
            ) : (
              // --- Write / edit ---
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className="text-center text-2xl font-bold text-white">
                  {editing ? 'Edit announcement' : 'New announcement'}
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-400">
                  Active members see it in the app and on the website
                </Text>

                <Text className="mt-5 text-sm text-gray-300">Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  maxLength={MAX_TITLE}
                  editable={!isSaving}
                  placeholder="e.g. Concert this Saturday"
                  placeholderTextColor="#6b7280"
                  accessibilityLabel="Title"
                  className="mt-1 rounded-lg bg-white px-3 py-3 text-base text-black"
                />

                <Text className="mt-4 text-sm text-gray-300">Message</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  maxLength={MAX_MESSAGE}
                  editable={!isSaving}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Message"
                  className="mt-1 h-40 rounded-lg bg-white px-3 py-3 text-base text-black"
                />

                <View className="mt-4 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base text-white">Pin to the top</Text>
                    <Text className="text-xs text-gray-400">
                      Stays above newer announcements
                    </Text>
                  </View>
                  <Switch
                    value={pinned}
                    onValueChange={setPinned}
                    disabled={isSaving}
                    trackColor={{ true: LIGHT_GOLD }}
                    accessibilityLabel="Pin to the top"
                  />
                </View>

                <Pressable
                  disabled={!canSave}
                  onPress={save}
                  className={`mt-6 items-center rounded-lg bg-lightGold py-4 active:opacity-80 ${
                    canSave ? '' : 'opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <ActivityIndicator color="black" />
                  ) : (
                    <Text className="text-lg font-bold text-black">
                      {editing ? 'Save changes' : 'Post announcement'}
                    </Text>
                  )}
                </Pressable>

                {!isSaving ? (
                  <Pressable onPress={onClose} hitSlop={8} className="mt-6">
                    <Text className="text-center text-base text-gray-400 underline">
                      Cancel
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
