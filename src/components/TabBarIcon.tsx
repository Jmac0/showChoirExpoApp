import Ionicons from '@expo/vector-icons/Ionicons';
import { type IconProps } from '@expo/vector-icons/build/createIconSet';
import { type ComponentProps } from 'react';
import { type ColorValue } from 'react-native';

// The tab bar hands over its colour as a ColorValue, which (since React
// Native 0.88) can also be null or a number - Ionicons only takes the
// usual colour values (in practice the tab bar sends text like "#999").
export function TabBarIcon({
  style,
  color,
  ...rest
}: Omit<IconProps<ComponentProps<typeof Ionicons>['name']>, 'color'> & {
  color?: ColorValue;
}) {
  return (
    <Ionicons
      size={28}
      style={[{ marginBottom: -3 }, style]}
      color={color === null || typeof color === 'number' ? undefined : color}
      {...rest}
    />
  );
}
