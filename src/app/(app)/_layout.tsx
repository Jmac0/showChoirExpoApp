import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
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

  const isGA = profile?.role === 'ga';
  // Notifications and Music & Lyrics are for active members only - hidden
  // when the website says their membership isn't active (Direct Debit
  // stopped over 14 days ago, or Flexi sessions expired). An older website
  // doesn't say, so show them.
  const isActiveMember = profile?.card_active !== false;

  return (
    // Shares the GA's chosen rehearsal venue between the Scan and Who's here tabs
    <RehearsalProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: LIGHT_GOLD,
          headerStyle: { backgroundColor: LIGHT_GOLD },
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
            // Only GAs get the scanner; href: null hides the tab for everyone else.
            href: isGA ? undefined : null,
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
            href: isGA ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? 'people' : 'people-outline'}
                color={color}
              />
            ),
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
