import LoginForm from "@/components/LoginForm";
import axios from "axios";
import { Link, Redirect, router, useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "@env";
export default function Login() {
  const router = useRouter();

  const [formData, setFromData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (key: string, value: string) => {
    setFromData({ ...formData, [key]: value });
  };
  const handleSubmit = () => {
    axios
      .post(`${API_URL}`, formData)
      .then((res) => {
        console.log(res.data);
        router.push("/(tabs)");
      })
      .catch((error) => {
        console.log(error);
      });
  };
  return (
    <View className="bg-lightBlack flex-1 pt-36">
      <Text className="mt-8 text-center text-4xl font-bold">Login</Text>
      <LoginForm handleChange={handleChange} handleSubmit={handleSubmit} />
    </View>
  );
}
