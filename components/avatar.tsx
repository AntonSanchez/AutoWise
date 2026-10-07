import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors, withAlpha } from '@/components/theme-provider';

type Props = {
  uri?: string;
  size: number;
  radius?: number;
  icon?: ComponentProps<typeof Ionicons>['name'];
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A profile picture, or an icon in a tinted box when there is no picture.
export function Avatar({ uri, size, radius, icon = 'person', muted, style }: Props) {
  const colors = useThemeColors();
  const borderRadius = radius ?? Math.round(size * 0.3);

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius, backgroundColor: withAlpha(muted ? colors.muted : colors.gold, muted ? 0.14 : 0.12) },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Ionicons name={icon} size={Math.round(size * 0.46)} color={muted ? colors.muted : colors.gold} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
