import Ionicons from '@expo/vector-icons/Ionicons';
import { Ref, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  // Passed on to the box, e.g. to focus it from the email box's "Next"
  ref?: Ref<TextInput>;
  // Margins go here, not in className - the eye is centred on this wrapper,
  // so a margin on the box itself would push it off centre
  containerClassName?: string;
};

// Password box with an eye button inside it, on the right, to show or hide
// what's been typed - like the website's PasswordInput. Hidden by default.
// Takes the same props as a TextInput (className styles the box).
export function PasswordInput({
  ref,
  className,
  containerClassName,
  ...inputProps
}: Props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className={`justify-center ${containerClassName ?? ''}`}>
      <TextInput
        ref={ref}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
        // pr-12 leaves room for the eye, so long passwords don't run under it
        className={`${className ?? ''} pr-12`}
      />
      <Pressable
        onPress={() => setIsVisible(!isVisible)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
        className="absolute bottom-0 right-0 top-0 justify-center px-4"
      >
        <Ionicons
          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color="#9ca3af"
        />
      </Pressable>
    </View>
  );
}
