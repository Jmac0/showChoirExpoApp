import { View, Text, TextInput, Button } from "react-native";
import React from "react";

type LoginFormProps = {
  handleChange: (name: string, value: string) => void;
  handleLogin: () => void;
};

const LoginForm = ({ handleChange, handleLogin }) => {
  return (
    <View className="px-8 py-10">
      <View className="flex-col">
        <Text className="text-xl color-slate-100">Email</Text>
        <TextInput
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-4 mt-4 rounded-md border border-gray-300 bg-white px-4 py-2"
          onChangeText={(value) => handleChange("email", value)}
        />
      </View>
      <View className="">
        <Text className="pt-5 text-xl color-slate-100">Password</Text>
        <TextInput
          autoCapitalize="none"
          className="mb-5 mt-4 rounded-md border border-gray-300 bg-white px-4 py-2"
          placeholder="Password"
          secureTextEntry
          onChangeText={(value) => handleChange("password", value)}
        />
      </View>
      <Button
        title="Login"
        onPress={() => {
          handleLogin();
        }}
      />
    </View>
  );
};

export default LoginForm;
