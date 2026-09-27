import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useMemo } from 'react';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { useThemeColors, type ThemeColors } from '@/components/theme-provider';

const navItems = [
  { label: 'Home', icon: 'home', route: '/(tabs)' },
  { label: 'Cars', icon: 'car', route: '/cars' },
  { label: 'Messages', icon: 'chatbubble', route: '/messages' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
] as const;

type BottomNavigationProps = {
  activeRoute: (typeof navItems)[number]['route'] | '/history';
};

export function BottomNavigation({ activeRoute }: BottomNavigationProps) {
  const navigate = useSafeNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const compact = width < 360;

  return (
    <View style={styles.tabBar}>
      {navItems.map((item) => {
        const isActive = item.route === activeRoute;

        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            hitSlop={8}
            style={({ pressed }) => [styles.tabButton, compact && styles.compactTabButton, pressed && styles.tabButtonPressed]}
            onPress={() => navigate(item.route)}
          >
            <Ionicons name={item.icon as any} size={19} color={isActive ? colors.gold : colors.muted} />
            <Text style={[styles.tabLabel, compact && styles.compactTabLabel, isActive && styles.activeTabLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  tabBar: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 54,
  },
  compactTabButton: {
    gap: 3,
    minHeight: 48,
  },
  tabButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  tabLabel: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '700',
  },
  compactTabLabel: {
    fontSize: 9,
  },
  activeTabLabel: {
    color: colors.gold,
  },
  });
}

