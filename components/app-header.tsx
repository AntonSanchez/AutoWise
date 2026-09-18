import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSafeNavigation } from '@/hooks/use-safe-navigation';

const colors = {
  background: '#101112',
  border: 'rgba(255,255,255,0.08)',
  gold: '#f2bc39',
  text: '#f5f4f2',
  muted: '#a9a6a0',
};

export function AppHeader() {
  const navigate = useSafeNavigation(false);

  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}>
        <Text style={styles.brand}>AUTOWISE</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={10}
          onPress={() => navigate('/notifications')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="notifications-outline" size={23} color={colors.text} />
          <View style={styles.notificationDot} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open vehicle profile"
          hitSlop={6}
          onPress={() => navigate('/profile')}
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
        >
          <Ionicons name="person" size={17} color="#51431e" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
    paddingHorizontal: 18,
  },
  brandWrap: {
    flex: 1,
  },
  brand: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 0,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 32,
  },
  notificationDot: {
    backgroundColor: colors.gold,
    borderColor: colors.background,
    borderRadius: 5,
    borderWidth: 1,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 4,
    width: 8,
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: '#f4d26b',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.7,
  },
});