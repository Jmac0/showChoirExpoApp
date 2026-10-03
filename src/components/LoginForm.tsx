import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

type LoginFormProps = {
  handleChange: (name: string, value: string) => void;
  handleLogin: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

// Matches `lightGold` in tailwind.config.js (placeholder/cursor colours
// aren't styled via className).
const LIGHT_GOLD = 'rgb(222,204,120)';

const inputClass =
  'mt-2 rounded-lg border bg-white/10 px-4 py-3 text-base text-white';

const LoginForm = ({
  handleChange,
  handleLogin,
  error,
  isSubmitting,
}: LoginFormProps) => {
  const router = useRouter();
  const passwordInput = useRef<TextInput>(null);
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
        placeholder="you@example.com"
        placeholderTextColor="#6b7280"
        selectionColor={LIGHT_GOLD}
        className={`${inputClass} ${borderFor('email')}`}
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
      <TextInput
        ref={passwordInput}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        placeholder="Password"
        placeholderTextColor="#6b7280"
        selectionColor={LIGHT_GOLD}
        secureTextEntry
        className={`${inputClass} ${borderFor('password')}`}
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
    </View>
  );
};

export default LoginForm;
