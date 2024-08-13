import { View, Text, TextInput, Button } from "react-native";
import React from "react";

const LoginForm = () => {
  return (
    <View className="bg-gray-900">
      <View className="flex-col">
        <Text>Email</Text>
        <TextInput
          className="border border-gray-300 rounded-md px-4 py-2 mt-4"
          placeholder="Username"
        />
      </View>
      <View className="">
        <Text>Password</Text>
        <TextInput
          className="border border-gray-300 rounded-md px-4 py-2 mt-4"
          placeholder="Password"
          secureTextEntry
        />
      </View>
      <Button
        title="Login"
        onPress={() => {
          // Handle login logic here
        }}
      />
    </View>
  );
};

export default LoginForm;
