import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Login() {
  return (
    <View className="flex-1">
      <Text className="text-center text-4xl font-bold mt-8">Login</Text>
    </View>
  );
}
