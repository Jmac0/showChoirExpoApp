import LoginForm from '@/components/LoginForm';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/contexts/authContext';

export default function Login() {
  const { signIn, session } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (session) {
      console.log(session);
      router.push('/');
    }
  }, [session, router]);

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
