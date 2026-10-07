import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { useProfile } from '@/components/profile-provider';
import { useThemeColors, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { useMemo } from 'react';

export function AppHeader() {
  const navigate = useSafeNavigation(false);
  const { role } = useAuth();
  const { profile } = useProfile();
  const isMechanic = role === 'mechanic';
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isMechanic ? 'Open mechanic account' : 'Open vehicle profile'}
          hitSlop={6}
          onPress={() => navigate(isMechanic ? '/mechanic/account' : '/profile')}
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
        >
          <Avatar uri={profile.avatarUri} size={38} radius={19} icon="person" style={styles.avatarFrame} />
        </Pressable>
        <Text style={styles.brand}>AUTOWISE</Text>
      </View>

      <View style={styles.actions}>
        {!isMechanic && (
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
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
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
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarFrame: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  });
}
