import LoginForm from "@/components/LoginForm";
import { Link } from "expo-router";
import React, { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Login() {
  const [formData, setFromData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (key: string, value: string) => {
    setFromData({ ...formData, [key]: value });
  };
  const handleSubmit = () => {
    console.log(formData);
  };
  return (
    <View className="bg-lightBlack flex-1 pt-36">
      <Text className="mt-8 text-center text-4xl font-bold">Login</Text>
      <LoginForm handleChange={handleChange} handleSubmit={handleSubmit} />
    </View>
  );
}
