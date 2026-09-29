import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

export type ToastVariant = 'success' | 'warning' | 'error';

export type ScanToast = {
  variant: ToastVariant;
  title: string;
  message?: string;
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-green-600',
  warning: 'bg-amber-500',
  error: 'bg-red-600',
};

// Bar shown over the scanner with the result of the last scan.
export function ScanResultToast({ variant, title, message }: ScanToast) {
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
      </View>
    </Animated.View>
  );
}
