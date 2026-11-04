// Announcements tab - the admins' notice board for active members (the same
// announcements as the website's dashboard). No replies: a notice board, not
// a chat. Admins also get a "New announcement" button, and Share / Pin /
// Edit / Delete on each one; Share sends it to WhatsApp via the share sheet.

import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Announcement,
  AnnouncementFields,
  AnnouncementForm,
  shareAnnouncement,
} from '@/components/AnnouncementForm';
import { useAuth } from '@/contexts/authContext';
import { confirm, showMessage } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// "Wednesday 4 November 2026"
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// The message from a failed request to the website
const errorMessage = (error: unknown) =>
  (axios.isAxiosError(error) && error.response?.data?.message) ||
  'Please try again.';

// A small round icon button for the admin actions on each announcement
function ActionButton({
  icon,
  label,
  onPress,
  color = LIGHT_GOLD,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="ml-1 h-10 w-10 items-center justify-center active:opacity-60"
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

const AnnouncementsScreen = () => {
  const { authRequest, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(
    null
  );
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // The form: closed, a new one, or editing one
  const [form, setForm] = useState<{ editing: Announcement | null } | null>(
    null
  );

  // --- Load whenever the tab opens (pinned first, then newest) ---

  const load = useCallback(async () => {
    try {
      const data = await authRequest<{ announcements: Announcement[] }>({
        url: '/api/member-resources/announcements',
      });
      setAnnouncements(data.announcements);
      setError(false);
    } catch {
      setError(true);
    }
    // authRequest changes identity every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  // --- Admins: every change replies with the whole list ---

  const change = async (
    config: Parameters<typeof authRequest>[0],
    failTitle: string
  ) => {
    try {
      const data = await authRequest<{ announcements: Announcement[] }>(config);
      setAnnouncements(data.announcements);
      return true;
    } catch (err) {
      showMessage(failTitle, errorMessage(err));
      return false;
    }
  };

  const save = (fields: AnnouncementFields) =>
    form?.editing
      ? change(
          {
            url: `/api/admin/announcements/${form.editing.id}`,
            method: 'PATCH',
            data: fields,
          },
          "Couldn't save the changes"
        )
      : change(
          { url: '/api/admin/announcements', method: 'POST', data: fields },
          "Couldn't post the announcement"
        );

  const togglePin = (announcement: Announcement) =>
    change(
      {
        url: `/api/admin/announcements/${announcement.id}`,
        method: 'PATCH',
        data: { pinned: !announcement.pinned },
      },
      "Couldn't change the pin"
    );

  const remove = (announcement: Announcement) =>
    confirm({
      title: 'Delete this announcement?',
      message: `"${announcement.title}" will disappear for everyone, in the app and on the website.`,
      confirmText: 'Delete',
      onConfirm: () =>
        change(
          {
            url: `/api/admin/announcements/${announcement.id}`,
            method: 'DELETE',
          },
          "Couldn't delete the announcement"
        ),
    });

  // --- What to show ---

  const renderAnnouncement = (announcement: Announcement) => (
    <View
      key={announcement.id}
      className="mx-4 mb-4 overflow-hidden rounded-xl border-2 border-lightGold"
    >
      {/* Gold header: title, pin */}
      <View className="flex-row items-center bg-lightGold px-4 py-3">
        <Text className="flex-1 text-xl font-bold text-black">
          {announcement.title}
        </Text>
        {announcement.pinned ? (
          <Ionicons
            name="pin"
            size={22}
            color="black"
            accessibilityLabel="Pinned"
          />
        ) : null}
      </View>
      <View className="bg-lightBlack px-4 py-3">
        <Text className="text-xs text-gray-400">
          {formatDate(announcement.created_at)}
          {/* Admins see who wrote it, and whether it's been changed */}
          {isAdmin && announcement.author_name
            ? ` · ${announcement.author_name}`
            : ''}
          {isAdmin && announcement.updated_at ? ' · edited' : ''}
        </Text>
        {/* selectable: members can copy dates, addresses etc. */}
        <Text selectable className="mt-2 text-base text-white">
          {announcement.message}
        </Text>

        {isAdmin ? (
          <View className="mt-2 flex-row justify-end border-t border-white/10 pt-1">
            <ActionButton
              icon="logo-whatsapp"
              label={`Share "${announcement.title}" to WhatsApp`}
              onPress={() => shareAnnouncement(announcement)}
            />
            <ActionButton
              icon={announcement.pinned ? 'pin' : 'pin-outline'}
              label={announcement.pinned ? 'Unpin' : 'Pin to the top'}
              onPress={() => togglePin(announcement)}
            />
            <ActionButton
              icon="create-outline"
              label={`Edit "${announcement.title}"`}
              onPress={() => setForm({ editing: announcement })}
            />
            <ActionButton
              icon="trash-outline"
              label={`Delete "${announcement.title}"`}
              onPress={() => remove(announcement)}
              color="rgb(248,113,113)"
            />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-lightBlack"
        contentContainerClassName="pb-10 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={LIGHT_GOLD}
            colors={[LIGHT_GOLD]}
          />
        }
      >
        {isAdmin ? (
          <Pressable
            onPress={() => setForm({ editing: null })}
            className="mx-4 mb-4 flex-row items-center justify-center rounded-lg bg-lightGold py-3 active:opacity-80"
          >
            <Ionicons name="add-circle-outline" size={22} color="black" />
            <Text className="ml-2 text-base font-bold text-black">
              New announcement
            </Text>
          </Pressable>
        ) : null}

        {error && !announcements ? (
          <Text className="mx-4 text-center text-gray-300">
            Couldn&apos;t load the announcements - pull down to try again
          </Text>
        ) : null}
        {announcements && announcements.length === 0 ? (
          <Text className="mx-4 text-center text-gray-300">
            No announcements yet
          </Text>
        ) : null}
        {(announcements || []).map(renderAnnouncement)}
      </ScrollView>

      {isAdmin ? (
        <AnnouncementForm
          visible={!!form}
          editing={form?.editing ?? null}
          onSave={save}
          onClose={() => setForm(null)}
        />
      ) : null}
    </>
  );
};

export default AnnouncementsScreen;
