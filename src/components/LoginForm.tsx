import { View, Text, TextInput, Button } from 'react-native';
import React from 'react';

type LoginFormProps = {
  handleChange: (name: string, value: string) => void;
  handleLogin: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

const LoginForm = ({
  handleChange,
  handleLogin,
  error,
  isSubmitting,
}: LoginFormProps) => {
  return (
    <View className="px-8 py-10">
      <View className="flex-col">
        <Text className="text-xl color-slate-100">Email</Text>
        <TextInput
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          className="mb-4 mt-4 rounded-md border border-gray-300 bg-white px-4 py-2"
          onChangeText={(value) => handleChange('email', value)}
        />
      </View>
      <View className="">
        <Text className="pt-5 text-xl color-slate-100">Password</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          className="mb-5 mt-4 rounded-md border border-gray-300 bg-white px-4 py-2"
          placeholder="Password"
          secureTextEntry
          onChangeText={(value) => handleChange('password', value)}
        />
      </View>
      {error ? (
        <Text className="mb-4 text-center text-red-500">{error}</Text>
      ) : null}
      <Button
        title={isSubmitting ? 'Logging in...' : 'Login'}
        disabled={isSubmitting}
        onPress={() => {
          handleLogin();
        }}
      />
    </View>
  );
};

export default LoginForm;
