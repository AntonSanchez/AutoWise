import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { getNextMaintenanceRecommendation, useProfile } from '@/components/profile-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';

const colors = {
  background: '#171a1d',
  card: '#1b1f23',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f2',
  softText: '#d0cbc2',
  muted: '#8d8a86',
  gold: '#f2bc39',
  green: '#7ae1a2',
  red: '#ff6d68',
  dark: '#0b0d10',
};

export default function NotificationsScreen() {
  const navigate = useSafeNavigation(false);
  const goBack = useSafeBack();
  const { profile, activeVehicleId, remindersEnabled, scheduledServices } = useProfile();
  const nextService = getNextMaintenanceRecommendation(profile.odometer);
  const nextBooking = scheduledServices.find((service) => (!service.vehicleId || service.vehicleId === activeVehicleId) && service.status !== 'Cancelled' && service.status !== 'Completed');
  const notifications = [
    ...(remindersEnabled && nextService.dueIn <= 3000 ? [{
      title: `${nextService.title} status: ${nextService.status}`,
      message: `Recommended action: ${nextService.action}. ${nextService.dueIn.toLocaleString()} km remaining until the next check window.`,
      time: 'Maintenance reminder',
      icon: nextService.icon,
      tone: colors.gold,
      unread: true,
    }] : []),
    ...(nextBooking ? [{
      title: `Booking ${nextBooking.status?.toLowerCase() ?? 'pending'}`,
      message: `${nextBooking.title} is scheduled for ${nextBooking.scheduledDate}.`,
      time: 'Upcoming booking',
      icon: 'calendar-outline',
      tone: colors.green,
      unread: nextBooking.status === 'Confirmed',
    }] : []),
  ];
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back to previous page"
                hitSlop={8}
                onPress={goBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Ionicons name="arrow-back" size={21} color={colors.text} />
              </Pressable>
              <View style={styles.titleTextWrap}>
                <Text style={styles.eyebrow}>AUTO WISE</Text>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>Stay on top of {profile.vehicleName}.</Text>
              </View>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unreadCount} new</Text>
            </View>
          </View>

          <View style={styles.list}>
            {notifications.length === 0 ? <Text style={styles.emptyText}>No upcoming reminders or booking updates.</Text> : notifications.map((notification) => (
              <Pressable
                key={notification.title}
                style={({ pressed }) => [
                  styles.notificationCard,
                  notification.unread && styles.unreadCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => navigate('/schedule')}
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
                <Ionicons name="chevron-forward" size={17} color={colors.muted} />
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.scheduleButton, pressed && styles.pressed]}
            onPress={() => navigate('/schedule')}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.dark} />
            <Text style={styles.scheduleButtonText}>View schedule</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 18 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  titleContent: { alignItems: 'center', flex: 1, flexDirection: 'row', marginRight: 12 },
  titleTextWrap: { flex: 1 },
  backButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
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
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 12,
    marginTop: 7,
  },
  countBadge: {
    backgroundColor: 'rgba(242,188,57,0.14)',
    borderColor: 'rgba(242,188,57,0.25)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countText: { color: colors.gold, fontFamily: 'Arial', fontSize: 11, fontWeight: '800' },
  list: { gap: 11 },
  emptyText: { color: colors.muted, fontFamily: 'Arial', fontSize: 13, paddingVertical: 28, textAlign: 'center' },
  notificationCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 14,
  },
  unreadCard: { borderColor: 'rgba(242,188,57,0.3)' },
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
