import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { getNextMaintenanceRecommendation, useProfile } from '@/components/profile-provider';
import { useMemo } from 'react';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { getRequestType, getServiceStatus } from '@/lib/service-status';

type NotificationItem = {
  title: string;
  message: string;
  time: string;
  icon: string;
  tone: string;
  unread: boolean;
  carId?: string;
};

export default function NotificationsScreen() {
  const navigate = useSafeNavigation(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cars, profile, scheduledServices } = useProfile();
  const primaryCar = cars.find((car) => car.id === profile.primaryCarId) ?? cars[0];
  const nextService = getNextMaintenanceRecommendation(primaryCar?.odometer ?? '0');
  // Real updates from mechanics on this customer's bookings (accepted, started, finished).
  const serviceUpdates: NotificationItem[] = scheduledServices
    .filter((service) => getServiceStatus(service) !== 'pending')
    .map((service) => {
      const status = getServiceStatus(service);
      const kind = getRequestType(service) === 'checkup' ? 'Checkup' : 'Service';
      const verb = status === 'completed' ? 'completed' : status === 'in_progress' ? 'in progress' : 'accepted';

      return {
        title: `${kind} ${verb}: ${service.title}`,
        message: `${service.mechanicName || 'A mechanic'} ${
          status === 'completed' ? 'finished' : status === 'in_progress' ? 'started work on' : 'accepted'
        } your ${kind.toLowerCase()} for ${service.vehicle} on ${service.scheduledDate} at ${service.time}.`,
        time: service.scheduledDate,
        icon: status === 'completed' ? 'checkmark-done-outline' : 'construct-outline',
        tone: status === 'completed' ? colors.green : colors.gold,
        unread: status !== 'completed',
        carId: service.carId,
      };
    });
  const notifications: NotificationItem[] = [
    ...serviceUpdates,
    {
      title: `${nextService.title} status: ${nextService.status}`,
      message: `Recommended action: ${nextService.action}. ${nextService.dueIn.toLocaleString()} km remaining until the next check window.`,
      time: 'Today',
      icon: nextService.icon,
      tone: colors.gold,
      unread: true,
    },
    {
      title: 'Vehicle profile is up to date',
      message: 'Your vehicle information is ready across AutoWise.',
      time: 'Yesterday',
      icon: 'checkmark-circle-outline',
      tone: colors.green,
      unread: false,
    },
    {
      title: 'Inspection reminder',
      message: `Use condition-based checks and inspect before reaching ${nextService.targetMileage.toLocaleString()} km.`,
      time: '3 days ago',
      icon: 'warning-outline',
      tone: colors.red,
      unread: false,
    },
  ];

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
              <Text style={styles.countText}>{notifications.filter((item) => item.unread).length} new</Text>
            </View>
          </View>

          <View style={styles.list}>
            {notifications.map((notification, index) => (
              <Pressable
                key={`${notification.title}-${index}`}
                style={({ pressed }) => [
                  styles.notificationCard,
                  notification.unread && styles.unreadCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => navigate(notification.carId ? `/car/${notification.carId}` : primaryCar ? `/car/${primaryCar.id}` : '/cars')}
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
