import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useSafeNavigation } from '@/hooks/use-safe-navigation';

const colors = {
  card: '#1b1f23',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f2',
  muted: '#8d8a86',
  gold: '#f2bc39',
};

const navItems = [
  { label: 'Home', icon: 'home', route: '/(tabs)' },
  { label: 'Schedule', icon: 'calendar', route: '/schedule' },
  { label: 'Records', icon: 'document-text', route: '/records' },
  { label: 'History', icon: 'time', route: '/history' },
] as const;

type BottomNavigationProps = {
  activeRoute: (typeof navItems)[number]['route'];
};

export function BottomNavigation({ activeRoute }: BottomNavigationProps) {
  const navigate = useSafeNavigation();
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

const styles = StyleSheet.create({
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
