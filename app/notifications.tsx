import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useNotifications } from '@/hooks/use-notifications';
import { useMemo } from 'react';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';

export default function NotificationsScreen() {
  const navigate = useSafeNavigation(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { notifications, unreadCount, primaryCar, clearAll, clearOne } = useNotifications();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.eyebrow}>AUTO WISE</Text>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>Stay on top of {primaryCar?.vehicleName ?? 'your vehicles'}.</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unreadCount} new</Text>
            </View>
          </View>

          {notifications.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear all notifications" onPress={clearAll} style={({ pressed }) => [styles.clearAll, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={15} color={colors.gold} />
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          )}

          {notifications.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={30} color={colors.muted} />
              <Text style={styles.emptyText}>No new notification yet</Text>
            </View>
          )}

          <View style={styles.list}>
            {notifications.map((notification) => (
              <Pressable
                key={notification.id}
                style={({ pressed }) => [
                  styles.notificationCard,
                  notification.unread && styles.unreadCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => navigate(notification.href ? notification.href : notification.carId ? `/car/${notification.carId}` : primaryCar ? `/car/${primaryCar.id}` : '/cars')}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${notification.tone}1f` }]}>
                  <Ionicons name={notification.icon as any} size={21} color={notification.tone} />
                </View>
                <View style={styles.textWrap}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {notification.unread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.message}>{notification.message}</Text>
                  <Text style={styles.time}>{notification.time}</Text>
                </View>
                <Pressable accessibilityLabel={`Clear ${notification.title}`} accessibilityRole="button" hitSlop={10} onPress={() => clearOne(notification.id)}>
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.scheduleButton, pressed && styles.pressed]}
            onPress={() => navigate(primaryCar ? `/car/${primaryCar.id}` : '/cars')}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.dark} />
            <Text style={styles.scheduleButtonText}>View schedule</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 18 },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 7,
  },
  title: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 12,
    marginTop: 7,
  },
  countBadge: {
    backgroundColor: withAlpha(colors.gold, 0.14),
    borderColor: withAlpha(colors.gold, 0.25),
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countText: { color: colors.gold, fontFamily: 'Arial', fontSize: 11, fontWeight: '800' },
  list: { gap: 11 },
  clearAll: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 6, marginBottom: 10, minHeight: 32 },
  clearAllText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  emptyCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 10, marginBottom: 14, padding: 28 },
  emptyText: { color: colors.softText, fontSize: 14, fontWeight: '700' },
  notificationCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 14,
  },
  unreadCard: { borderColor: withAlpha(colors.gold, 0.3) },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  textWrap: { flex: 1, paddingRight: 8 },
  notificationTitleRow: { alignItems: 'center', flexDirection: 'row' },
  notificationTitle: { color: colors.text, fontFamily: 'Arial', fontSize: 14, fontWeight: '800', flex: 1 },
  unreadDot: { backgroundColor: colors.gold, borderRadius: 4, height: 7, marginLeft: 7, width: 7 },
  message: { color: colors.softText, fontFamily: 'Arial', fontSize: 12, lineHeight: 17, marginTop: 5 },
  time: { color: colors.muted, fontFamily: 'Arial', fontSize: 10, marginTop: 7 },
  scheduleButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 50,
  },
  scheduleButtonText: { color: colors.dark, fontFamily: 'Arial', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  });
}
