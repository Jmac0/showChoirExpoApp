import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';

import { api } from '@/lib/api';

// Matches `lightGold` in tailwind.config.js (cursor colour isn't styled via
// className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// "Forgot your password?" - from the login screen, same look. They give
// their email and the website (api/members/forgot-password) emails a link to
// choose a new password - the link opens the website's page, then they come
// back here and log in. The answer is the same whether or not the email is a
// member's.
export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const send = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setIsSending(true);
    try {
      const { data } = await api.post<{ message: string }>(
        '/api/members/forgot-password',
        { email: email.trim() }
      );
      setMessage(data.message);
    } catch (err) {
      setError(
        isAxiosError(err) && err.response
          ? (err.response.data?.message ?? 'Please try again.')
          : "Can't reach the server. Check your connection and try again."
      );
    } finally {
      setIsSending(false);
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
          style={{ width: 160, height: 142 }}
          resizeMode="contain"
          accessibilityLabel="Show Choir"
        />
        <Text className="mb-8 mt-6 text-center text-lg tracking-widest text-lightGold">
          FORGOT YOUR PASSWORD?
        </Text>

        {message ? (
          // Sent - what happens next
          <Text className="text-center text-base text-gray-200">
            {message}
            {'\n\n'}
            The link opens a page to choose your new password - then come back
            and log in with it.
          </Text>
        ) : (
          <>
            <Text className="mb-6 text-center text-gray-300">
              Enter your email and we&apos;ll send you a link to choose a new
              password.
            </Text>
            <Text className="self-start text-sm font-bold uppercase tracking-widest text-lightGold">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="send"
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              selectionColor={LIGHT_GOLD}
              onSubmitEditing={send}
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-base text-white"
            />
            {error ? (
              <Text className="mt-4 text-center text-red-300">{error}</Text>
            ) : null}
            <Pressable
              onPress={send}
              disabled={isSending}
              className="mt-8 w-full flex-row items-center justify-center rounded-lg bg-lightGold py-4"
            >
              {isSending ? (
                <ActivityIndicator color="black" />
              ) : (
                <Text className="text-lg font-bold text-black">Send link</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.back()} hitSlop={8} className="mt-8">
          <Text className="text-center text-sm text-lightGold underline">
            Back to log in
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
