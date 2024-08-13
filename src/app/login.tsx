import LoginForm from "@/components/LoginForm";
import { Link } from "expo-router";
import React from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Login() {
  return (
    <View className="flex-col">
      <Text className="text-center text-4xl font-bold mt-8">Login</Text>
      <LoginForm />
    </View>
  );
}
