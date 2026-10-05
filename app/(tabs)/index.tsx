import { Ionicons } from '@expo/vector-icons';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/components/auth-provider';
import { MechanicDashboard } from '@/components/mechanic-dashboard';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { useMemo } from 'react';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { useAppTheme, withAlpha, type ThemeColors } from '@/components/theme-provider';

// Mechanics land on their job dashboard instead of the customer's garage dashboard.
export default function HomeScreen() {
  const { role } = useAuth();

  return role === 'mechanic' ? <MechanicDashboard /> : <CustomerHome />;
}

function CustomerHome() {
  const navigate = useSafeNavigation(false);
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { cars, profile, scheduledServices } = useProfile();
  const primaryCar = cars.find((car) => car.id === profile.primaryCarId) ?? cars[0];
  const nextScheduledService = scheduledServices[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.greetingRow}>
            <Text style={styles.eyebrow}>YOUR GARAGE</Text>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your cars"
            onPress={() => navigate('/cars')}
            style={({ pressed }) => [styles.heroCard, pressed && styles.buttonPressed]}
          >
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroLabel}>{primaryCar ? 'CURRENT VEHICLE' : 'NO CARS YET'}</Text>
              <Text style={styles.heroTitle}>{primaryCar?.vehicleName ?? 'Add your first vehicle'}</Text>
              <Text style={styles.heroMeta}>{primaryCar?.vehicleModel ?? 'Tap to open your garage'}</Text>
              {primaryCar && (
                <View style={styles.heroDetailRow}>
                  <Ionicons name="cog-outline" size={13} color={colors.gold} />
                  <Text style={styles.heroDetail}>{primaryCar.transmissionType}</Text>
                </View>
              )}
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="car" size={24} color={colors.gold} />
            </View>
          </Pressable>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons name="calendar-outline" size={17} color={colors.gold} />
              </View>
              <Text style={styles.summaryTitle}>Upcoming appointment</Text>
            </View>
            {nextScheduledService ? (
              <>
                <Text style={styles.summaryItem}>{nextScheduledService.title}</Text>
                <Text style={styles.summaryMeta}>
                  Scheduled for {nextScheduledService.scheduledDate} • {nextScheduledService.vehicle}
                </Text>
              </>
            ) : (
              <Text style={styles.summaryMeta}>No service has been booked yet.</Text>
            )}
          </View>
        </ScrollView>

        <BottomNavigation activeRoute="/(tabs)" />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  greetingRow: {
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dashboardTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(122,225,162,0.1)',
    borderRadius: 99,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusDot: {
    backgroundColor: colors.green,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
  },
  greeting: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'left',
  },
  subGreeting: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 13,
    textAlign: 'left',
  },
  pageTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.gold, isDark ? 0.18 : 0.14),
    borderColor: withAlpha(colors.gold, isDark ? 0.6 : 0.55),
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 20,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  heroLabel: {
    color: colors.gold,
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  heroMeta: {
    color: colors.text,
    opacity: 0.8,
    fontFamily: 'Arial',
    fontSize: 11,
    marginTop: 7,
  },
  heroDetailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 12,
  },
  heroDetail: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.gold, isDark ? 0.28 : 0.22),
    borderColor: withAlpha(colors.gold, 0.5),
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 22,
  },
  statCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: 12,
  },
  statLabel: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'left',
    textTransform: 'uppercase',
    marginTop: 9,
  },
  statValue: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  statDetail: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 10,
    marginTop: 5,
  },
  vehicleCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
  },
  vehicleIconWrap: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.gold, 0.12),
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 10,
  },
  summaryMeta: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 12,
    marginTop: 6,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.gold, 0.12),
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  maintenanceRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  maintenanceMarker: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 8,
    marginRight: 10,
    width: 8,
  },
  maintenanceTextWrap: {
    flex: 1,
  },
  maintenanceDistance: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryBody: {
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: 'center',
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: '800',
    flexDirection: 'row',
    justifyContent: 'space-between',
    textAlign: 'left',
  },
  summaryItemValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  summaryDate: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  taskHeadRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  taskIconWrap: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.gold, 0.12),
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    marginRight: 10,
    width: 34,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  taskMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  tagHigh: {
    backgroundColor: 'rgba(255,109,104,0.14)',
    borderColor: 'rgba(255,109,104,0.4)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.red,
    fontSize: 9,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  taskDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  taskFooter: {
    color: colors.softText,
    fontSize: 12,
    marginTop: 10,
  },
  progressWrap: {
    marginTop: 10,
  },
  progressBar: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    height: 8,
    width: '70%',
  },
  progressText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  inlineActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  inlineNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  inlineNoteText: {
    color: colors.softText,
    fontSize: 11,
  },
  bookButton: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookButtonText: {
    color: colors.dark,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 100,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  actionText: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 9,
    textAlign: 'center',
  },
  sectionMini: {
    color: colors.muted,
    fontSize: 10,
  },
  protocolCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  protocolRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  protocolIconWrap: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.gold, 0.12),
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  protocolTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  protocolTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  protocolSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  protocolBadge: {
    backgroundColor: colors.border,
    borderRadius: 999,
    color: colors.text,
    fontSize: 9,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  protocolMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  protocolMeta: {
    color: colors.muted,
    fontSize: 10,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  addButtonText: {
    color: colors.dark,
    fontSize: 15,
    fontWeight: '800',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 10,
    paddingTop: 12,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  tabButtonPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: colors.gold,
  },
  });
}

