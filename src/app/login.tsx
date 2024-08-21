import LoginForm from "@/components/LoginForm";
import axios from "axios";
import { Link, Redirect, router, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { useAuth } from "@/contexts/authContext";

export default function Login() {
  const { signIn, session } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (session) {
      console.log(session);
      router.push("/");
    }
  }, [session]);

  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleLogin = () => {
    signIn(formData);
  };

  return (
    <View className="flex-1 bg-lightBlack pt-36">
      <Text className="mt-8 text-center text-4xl font-bold">Login</Text>
      <LoginForm handleChange={handleChange} handleLogin={handleLogin} />
    </View>
  );
}
