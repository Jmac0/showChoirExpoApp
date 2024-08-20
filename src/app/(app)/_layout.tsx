import { View, Text } from "react-native";
import React from "react";
import { Redirect, Tabs, useRouter } from "expo-router";
import { TabBarIcon } from "@/components/TabBarIcon";
import { useAuth } from "@/contexts/authContext";
const TabsLayout = () => {
  const { signIn, session } = useAuth();
  const router = useRouter();
  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "hotpink",
        headerStyle: { backgroundColor: "hotpink" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={focused ? "hotpink" : "gray"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="QrCode"
        options={{
          title: "Membership Card",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "qr-code" : "qr-code-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "bulb" : "bulb-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Resources"
        options={{
          title: "Resources",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "musical-note" : "musical-note-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
