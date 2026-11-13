import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

export type ToastVariant = 'success' | 'warning' | 'error';

export type ScanToast = {
  variant: ToastVariant;
  title: string;
  message?: string;
  // Stays until OK is tapped (something the GA must act on), not just 5
  // seconds - scanning waits meanwhile
  sticky?: boolean;
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-green-600',
  warning: 'bg-amber-500',
  error: 'bg-red-600',
};

// Bar shown over the scanner with the result of the last scan.
export function ScanResultToast({
  variant,
  title,
  message,
  sticky,
  onClose,
}: ScanToast & { onClose?: () => void }) {
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOut}>
      <View className={`rounded-lg px-4 py-3 ${VARIANT_CLASSES[variant]}`}>
        <Text className="text-center text-xl font-bold text-white">
          {title}
        </Text>
        {message ? (
          <Text className="mt-1 text-center text-base text-white">
            {message}
          </Text>
        ) : null}
        {sticky ? (
          <>
            <Text className="mt-2 text-center text-base text-white">
              Scanning paused until you tap OK
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              className="mt-3 items-center self-center rounded-full bg-white px-10 py-3 active:opacity-80"
            >
              <Text className="text-lg font-bold text-black">OK</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}
