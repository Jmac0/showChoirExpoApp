import { View, Text } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { TabBarIcon } from "@/components/TabBarIcon";

const TabsLayout = () => {
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
    </Tabs>
  );
};

export default TabsLayout;
