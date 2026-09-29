import LoginForm from '@/components/LoginForm';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from 'react-native';

import { useAuth } from '@/contexts/authContext';

export default function Login() {
  const { signIn, session } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await signIn(formData);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Unable to log in. Please try again.');
    }
  };

  return (
    // Moves the form up out of the way when the keyboard opens
    <KeyboardAvoidingView
      className="flex-1 bg-lightBlack"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center px-8 py-16"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo image is 600x533 */}
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 200, height: 178 }}
          resizeMode="contain"
          accessibilityLabel="Show Choir"
        />
        <Text className="mb-10 mt-6 text-center text-lg tracking-widest text-lightGold">
          MEMBERS LOGIN
        </Text>
        <LoginForm
          handleChange={handleChange}
          handleLogin={handleLogin}
          error={error}
          isSubmitting={isSubmitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
