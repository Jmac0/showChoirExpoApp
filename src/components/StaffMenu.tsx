import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/authContext';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

type IconName = ComponentProps<typeof Ionicons>['name'];

// What's in the menu, and who it's for (the member's role on the website).
// Add admin-only screens here with roles: ['admin']. The screens themselves
// live in src/app/(app)/ and are hidden from the tab bar (href: null).
const ITEMS: {
  label: string;
  href: Href;
  path: string;
  icon: IconName;
  roles: string[];
}[] = [
  {
    label: 'Scan members',
    href: '/scan',
    path: '/scan',
    icon: 'scan-outline',
    roles: ['ga'],
  },
  {
    label: "Who's here",
    href: '/here',
    path: '/here',
    icon: 'people-outline',
    roles: ['ga'],
  },
  {
    label: 'Taster bookings',
    href: '/tasters',
    path: '/tasters',
    icon: 'ticket-outline',
    roles: ['ga'],
  },
];

// The menu items this member can see
export const staffMenuItems = (role?: string) =>
  ITEMS.filter((item) => !!role && item.roles.includes(role));

// Menu button (top right of the header) and the drawer it opens, holding
// the GA and admin screens - so they don't crowd the tab bar at the bottom.
// Only shown to members who have something in it.
export function StaffMenu() {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const items = staffMenuItems(profile?.role);
  if (items.length === 0) return null;

  const go = (href: Href) => {
    setIsOpen(false);
    router.navigate(href);
  };

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Staff menu"
        className="mr-4"
      >
        <Ionicons name="menu" size={28} color="black" />
      </Pressable>

      <Modal
        visible={isOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 flex-row">
          {/* Tap the dimmed area to close */}
          <Pressable
            className="flex-1 bg-black/60"
            onPress={() => setIsOpen(false)}
            accessibilityLabel="Close menu"
          />

          {/* The drawer, on the right under the menu button */}
          <View
            className="w-72 bg-lightBlack"
            style={{
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom,
            }}
          >
            <View className="mb-4 flex-row items-center justify-between px-5">
              <Text className="text-lg font-bold uppercase tracking-widest text-lightGold">
                {profile?.role === 'admin' ? 'Admin' : 'GA menu'}
              </Text>
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={10}
                accessibilityLabel="Close menu"
              >
                <Ionicons name="close" size={26} color={LIGHT_GOLD} />
              </Pressable>
            </View>

            {items.map((item) => {
              const isHere = pathname === item.path;
              return (
                <Pressable
                  key={item.path}
                  onPress={() => go(item.href)}
                  className={`flex-row items-center border-l-4 px-5 py-4 ${
                    isHere
                      ? 'border-lightGold bg-white/10'
                      : 'border-transparent'
                  }`}
                >
                  <Ionicons name={item.icon} size={24} color={LIGHT_GOLD} />
                  <Text className="ml-4 text-lg text-white">{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
