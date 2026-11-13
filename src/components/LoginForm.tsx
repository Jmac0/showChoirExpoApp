import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  TextInput,
  TextInputInstance,
  View,
} from 'react-native';

import { PasswordInput } from '@/components/PasswordInput';
import { BASE_URL } from '@/lib/api';

type LoginFormProps = {
  handleChange: (name: string, value: string) => void;
  handleLogin: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

// Matches `lightGold` in tailwind.config.js (placeholder/cursor colours
// aren't styled via className).
const LIGHT_GOLD = 'rgb(222,204,120)';

const boxClass = 'rounded-lg border bg-white/10 px-4 py-3 text-base text-white';

const LoginForm = ({
  handleChange,
  handleLogin,
  error,
  isSubmitting,
}: LoginFormProps) => {
  const router = useRouter();
  const passwordInput = useRef<TextInputInstance>(null);
  // Which field has focus, to highlight its border in gold
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const borderFor = (field: 'email' | 'password') =>
    focused === field ? 'border-lightGold' : 'border-white/20';

  return (
    <View className="w-full">
      {/* --- Email --- */}
      <Text className="text-sm font-bold uppercase tracking-widest text-lightGold">
        Email
      </Text>
      <TextInput
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        accessibilityLabel="Email"
        placeholder="you@example.com"
        placeholderTextColor="#6b7280"
        selectionColor={LIGHT_GOLD}
        className={`mt-2 ${boxClass} ${borderFor('email')}`}
        onFocus={() => setFocused('email')}
        onBlur={() => setFocused(null)}
        onChangeText={(value) => handleChange('email', value)}
        // "Next" on the keyboard jumps to the password field
        submitBehavior="submit"
        onSubmitEditing={() => passwordInput.current?.focus()}
      />

      {/* --- Password --- */}
      <Text className="mt-6 text-sm font-bold uppercase tracking-widest text-lightGold">
        Password
      </Text>
      {/* With the eye button to show / hide what's typed */}
      <PasswordInput
        ref={passwordInput}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        accessibilityLabel="Password"
        placeholder="Password"
        placeholderTextColor="#6b7280"
        selectionColor={LIGHT_GOLD}
        containerClassName="mt-2"
        className={`${boxClass} ${borderFor('password')}`}
        onFocus={() => setFocused('password')}
        onBlur={() => setFocused(null)}
        onChangeText={(value) => handleChange('password', value)}
        // "Go" on the keyboard logs in
        onSubmitEditing={() => {
          if (!isSubmitting) handleLogin();
        }}
      />

      {/* --- Error --- */}
      {error ? (
        <View className="mt-6 rounded-lg border border-red-500/60 bg-red-500/15 px-4 py-3">
          <Text className="text-center text-red-300">{error}</Text>
        </View>
      ) : null}

      {/* --- Log in button --- */}
      <Pressable
        onPress={handleLogin}
        disabled={isSubmitting}
        className={`mt-8 flex-row items-center justify-center rounded-lg bg-lightGold py-4 active:opacity-80 ${isSubmitting ? 'opacity-70' : ''}`}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator color="#000" />
            <Text className="ml-3 text-lg font-bold text-black">
              Logging in…
            </Text>
          </>
        ) : (
          <Text className="text-lg font-bold text-black">Log in</Text>
        )}
      </Pressable>

      {/* The app's own screen (src/app/forgot-password.tsx) */}
      <Pressable
        onPress={() => router.push('/forgot-password')}
        hitSlop={8}
        className="mt-5"
      >
        <Text className="text-center text-sm text-lightGold underline">
          Forgot your password?
        </Text>
      </Pressable>

      {/* Not a member yet: the website's Join page (membership options and
          free taster) - so nobody, app reviewers included, hits a dead end */}
      <View className="mt-8 items-center border-t border-white/10 pt-6">
        <Text className="text-center text-base text-gray-300">
          Not a member yet?
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL(`${BASE_URL}/show-choir-membership-options`)
          }
          accessibilityRole="link"
          hitSlop={8}
          className="mt-2 self-stretch"
        >
          {/* Full width + "simple" line breaking: some Android phones (e.g.
              Motorola) draw bold text wider than it was measured, which cut
              off the last word ("taster") when the link hugged its text */}
          <Text
            textBreakStrategy="simple"
            className="text-center text-base font-bold text-lightGold underline"
          >
            Join or book a free taster
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default LoginForm;
