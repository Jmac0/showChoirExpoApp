import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { StaffMenu } from '@/components/StaffMenu';
import { TabBarIcon } from '@/components/TabBarIcon';
import { useAuth } from '@/contexts/authContext';
import { RehearsalProvider } from '@/contexts/rehearsalContext';

// Matches `lightGold` in tailwind.config.js - kept as a raw value here since
// React Navigation's screenOptions/tabBarIcon aren't styled via className.
const LIGHT_GOLD = 'rgb(222,204,120)';

const TabsLayout = () => {
  const { session, profile, isLoading } = useAuth();

  // Wait for a persisted session to be restored before deciding to redirect,
  // otherwise a logged-in user briefly flashes the login screen on cold start.
  if (isLoading) {
    return <View className="flex-1 bg-lightBlack" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  // Notifications and Music & Lyrics are for active members only - hidden
  // when the website says their membership isn't active (Direct Debit
  // stopped over 14 days ago, or Flexi sessions expired). An older website
  // doesn't say, so show them.
  const isActiveMember = profile?.card_active !== false;

  return (
    // Shares the GA's chosen rehearsal venue between the Scan and Who's here
    // screens
    <RehearsalProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: LIGHT_GOLD,
          headerStyle: { backgroundColor: LIGHT_GOLD },
          // GA / admin screens are in a menu (top right) instead of the tab
          // bar, so it isn't crowded - only shown to those who have any
          headerRight: () => <StaffMenu />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'home' : 'home-outline'}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan Members',
            // Never in the tab bar - GAs open it from the staff menu
            // (components/StaffMenu.tsx)
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'scan' : 'scan-outline'}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="here"
          options={{
            title: "Who's here",
            // In the staff menu, not the tab bar
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'people' : 'people-outline'}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tasters"
          options={{
            title: 'Taster bookings',
            // In the staff menu, not the tab bar
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            href: isActiveMember ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'bulb' : 'bulb-outline'}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="resources"
          options={{
            title: 'Resources',
            href: isActiveMember ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'musical-note' : 'musical-note-outline'}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'person-circle' : 'person-circle-outline'}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </RehearsalProvider>
  );
};

export default TabsLayout;
