import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { getMaintenanceRecommendations, useProfile } from '@/components/profile-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';

const colors = {
  background: '#171a1d',
  card: '#1b1f23',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f2',
  softText: '#d0cbc2',
  muted: '#8d8a86',
  gold: '#f2bc39',
  dark: '#0b0d10',
  white: '#ffffff',
  green: '#7ae1a2',
  red: '#ff6d68',
  orange: '#ffad66',
  blue: '#82b8ff',
};

function getStatusColors(status: string) {
  if (status === 'GOOD') {
    return { backgroundColor: 'rgba(122,225,162,0.14)', borderColor: 'rgba(122,225,162,0.38)', color: colors.green };
  }

  if (status === 'UPCOMING' || status === 'DUE SOON') {
    return { backgroundColor: 'rgba(242,188,57,0.15)', borderColor: 'rgba(242,188,57,0.42)', color: colors.gold };
  }

  if (status === 'DUE') {
    return { backgroundColor: 'rgba(255,173,102,0.16)', borderColor: 'rgba(255,173,102,0.44)', color: colors.orange };
  }

  return { backgroundColor: 'rgba(255,109,104,0.15)', borderColor: 'rgba(255,109,104,0.42)', color: colors.red };
}

const navItems = [
  { label: 'Home', icon: 'home', route: '/(tabs)' },
  { label: 'Schedule', icon: 'calendar', route: '/schedule' },
  { label: 'Records', icon: 'document-text', route: '/records' },
  { label: 'History', icon: 'time', route: '/history' },
];

export default function ScheduleScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { profile, scheduledServices, removeScheduledService } = useProfile();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; title: string } | null>(null);
  const maintenanceItems = getMaintenanceRecommendations(profile.odometer);
  const nextMaintenance = maintenanceItems[0];
  const nextStatus = getStatusColors(nextMaintenance?.status ?? 'GOOD');

  const confirmRemove = () => {
    if (!removeTarget) {
      return;
    }

    removeScheduledService(removeTarget.id);
    setRemoveTarget(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageTitleRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.backButton, styles.inlineBackButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.pageTitle}>Maintenance Planner</Text>
          </View>

          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <Ionicons name="car" size={24} color={colors.gold} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleTitle}>{profile.vehicleName}</Text>
              <Text style={styles.vehicleMeta}>Odometer: {profile.odometer}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book a vehicle service"
            hitSlop={8}
            style={({ pressed }) => [styles.addButton, styles.topBookButton, pressed && styles.addButtonPressed]}
            onPress={() => navigate('/add-schedule')}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.dark} />
            <Text style={styles.addButtonText}>Book Services</Text>
          </Pressable>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>By Mileage</Text>
              <Text style={styles.summaryLabel}>By Date</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>

            <View style={styles.summaryBody}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>● NEXT MAINTENANCE</Text>
                <Text style={styles.summaryDate}>Priority 01</Text>
              </View>
            </View>

            <View style={styles.taskCard}>
              <View style={styles.taskHeadRow}>
                <View style={styles.taskIconWrap}>
                  <Ionicons name={nextMaintenance?.icon as any} size={18} color={colors.gold} />
                </View>
                <View style={styles.taskTextWrap}>
                  <Text style={styles.taskTitle}>{nextMaintenance?.title ?? 'Service'}</Text>
                  <Text style={styles.taskMeta}>{nextMaintenance?.action ?? 'Recommended service'}</Text>
                </View>
                <View style={[styles.statusBadge, nextStatus]}>
                  <Text style={[styles.statusBadgeText, { color: nextStatus.color }]}>{nextMaintenance?.status ?? 'GOOD'}</Text>
                </View>
              </View>

              <View style={styles.taskDetailsRow}>
                <View>
                  <Text style={styles.detailLabel}>Target mileage</Text>
                  <Text style={styles.detailValue}>{nextMaintenance?.targetMileage.toLocaleString() ?? '0'} km</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>Due in</Text>
                  <Text style={styles.detailValue}>{nextMaintenance?.dueIn.toLocaleString() ?? '0'} km</Text>
                </View>
              </View>

              <Text style={styles.taskFooter}>{nextMaintenance?.replacementNote ?? 'Recommendation based on vehicle condition and mileage.'}</Text>

              <View style={styles.progressWrap}>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.progressText}>70% elapsed</Text>
              </View>

            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Owner scheduled</Text>
            <Text style={styles.sectionMini}>{scheduledServices.length} service{scheduledServices.length === 1 ? '' : 's'} booked</Text>
          </View>

          {scheduledServices.length === 0 && (
            <View style={styles.protocolCard}>
              <Text style={styles.protocolSubtitle}>No services booked yet. Tap Book Services to add one.</Text>
            </View>
          )}

          {scheduledServices.map((service) => (
            <View key={service.id} style={styles.protocolCard}>
              <View style={styles.protocolRow}>
                <View style={styles.protocolIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={colors.gold} />
                </View>
                <View style={styles.protocolTextWrap}>
                  <Text style={styles.protocolTitle}>{service.title}</Text>
                  <Text style={styles.protocolSubtitle}>{service.vehicle}</Text>
                </View>
                <View style={[styles.statusBadge, styles.bookedBadge]}>
                  <Text style={[styles.statusBadgeText, { color: colors.blue }]}>BOOKED</Text>
                </View>
                <Pressable
                  accessibilityLabel={`Remove ${service.title} schedule`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setRemoveTarget({ id: service.id, title: service.title })}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.muted} />
                </Pressable>
              </View>

              <View style={styles.protocolMetaRow}>
                <Text style={styles.protocolMeta}>Date: {service.scheduledDate}</Text>
                <Text style={styles.protocolMeta}>Target: {service.targetMileage}</Text>
              </View>
            </View>
          ))}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Upcoming Protocol</Text>
            <Text style={styles.sectionMini}>{maintenanceItems.length} items</Text>
          </View>

          {maintenanceItems.map((item) => (
            <View key={item.title} style={styles.protocolCard}>
              <View style={styles.protocolRow}>
                <View style={styles.protocolIconWrap}>
                  <Ionicons name={item.icon as any} size={16} color={colors.gold} />
                </View>
                <View style={styles.protocolTextWrap}>
                  <Text style={styles.protocolTitle}>{item.title}</Text>
                  <Text style={styles.protocolSubtitle}>{item.action} at {item.targetMileage.toLocaleString()} km</Text>
                </View>
                <View style={[styles.statusBadge, getStatusColors(item.status)]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColors(item.status).color }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.protocolMetaRow}>
                <Text style={styles.protocolMeta}>Action: {item.action}</Text>
                <Text style={styles.protocolMeta}>Due in {item.dueIn.toLocaleString()} km</Text>
              </View>
            </View>
          ))}

        </ScrollView>

        <BottomNavigation activeRoute="/schedule" />

        <Modal
          animationType="fade"
          transparent
          visible={removeTarget !== null}
          onRequestClose={() => setRemoveTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.removeModal}>
              <View style={styles.warningIconWrap}>
                <Ionicons name="trash-outline" size={24} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>Remove schedule?</Text>
              <Text style={styles.modalMessage}>
                Remove <Text style={styles.modalEntry}>{removeTarget?.title}</Text> from your booked services? Its scheduled entry in History will be removed too.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRemoveTarget(null)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.modalButtonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmRemove}
                  style={({ pressed }) => [styles.confirmRemoveButton, pressed && styles.modalButtonPressed]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.dark} />
                  <Text style={styles.confirmRemoveText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
  greetingRow: { marginBottom: 10 },
  greeting: { color: colors.gold, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  pageTitleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 0 },
  inlineBackButton: { marginRight: 8 },
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginLeft: 10 },
  profileLink: { marginLeft: 10 },
  vehicleCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 16, padding: 12 },
  vehicleIconWrap: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 12, height: 38, justifyContent: 'center', marginRight: 12, width: 38 },
  vehicleInfo: { flex: 1 },
  vehicleTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  vehicleMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  summaryCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 14 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8, rowGap: 6 },
  summaryLabel: { color: colors.muted, flexShrink: 1, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  summaryBody: { marginBottom: 10 },
  summaryItem: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryItemValue: { color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  summaryDate: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  taskCard: { backgroundColor: '#1d2126', borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: 12 },
  taskHeadRow: { alignItems: 'center', flexDirection: 'row' },
  taskIconWrap: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 10, height: 34, justifyContent: 'center', marginRight: 10, width: 34 },
  taskTextWrap: { flex: 1 },
  taskTitle: { color: colors.text, flexShrink: 1, fontSize: 15, fontWeight: '800' },
  taskMeta: { color: colors.muted, flexShrink: 1, fontSize: 11, marginTop: 4 },
  statusBadge: { borderRadius: 999, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  bookedBadge: { backgroundColor: 'rgba(130,184,255,0.14)', borderColor: 'rgba(130,184,255,0.38)' },
  taskDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  detailLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  taskFooter: { color: colors.softText, fontSize: 12, marginTop: 10 },
  progressWrap: { marginTop: 10 },
  progressBar: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, height: 8, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: colors.gold, borderRadius: 999, height: 8, width: '70%' },
  progressText: { color: colors.muted, fontSize: 10, marginTop: 6, textAlign: 'right' },
  inlineActionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  inlineNote: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  inlineNoteText: { color: colors.softText, fontSize: 11 },
  bookButton: { backgroundColor: colors.gold, borderRadius: 10, minHeight: 38, paddingHorizontal: 12, paddingVertical: 8 },
  bookButtonText: { color: colors.dark, fontSize: 11, fontWeight: '800' },
  sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sectionMini: { color: colors.muted, fontSize: 10 },
  protocolCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 12 },
  protocolRow: { alignItems: 'center', flexDirection: 'row' },
  protocolIconWrap: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
  protocolTextWrap: { flex: 1, marginLeft: 10 },
  protocolTitle: { color: colors.text, flexShrink: 1, fontSize: 14, fontWeight: '700' },
  protocolSubtitle: { color: colors.muted, flexShrink: 1, fontSize: 10, marginTop: 3 },
  protocolMetaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, rowGap: 5 },
  protocolMeta: { color: colors.muted, flexShrink: 1, fontSize: 10, marginRight: 8 },
  removeButton: { alignItems: 'center', flexShrink: 0, height: 32, justifyContent: 'center', marginLeft: 8, width: 32 },
  removeButtonPressed: { opacity: 0.65 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 24 },
  removeModal: { backgroundColor: '#242a30', borderColor: 'rgba(242,188,57,0.26)', borderRadius: 22, borderWidth: 1, maxWidth: 420, padding: 24, width: '100%' },
  warningIconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(242,188,57,0.14)', borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 16, width: 56 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalMessage: { color: colors.softText, fontSize: 13, lineHeight: 20, marginTop: 10, textAlign: 'center' },
  modalEntry: { color: colors.text, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  modalButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  cancelButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
  cancelButtonText: { color: colors.softText, fontSize: 13, fontWeight: '700' },
  confirmRemoveButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 11, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 46 },
  confirmRemoveText: { color: colors.dark, fontSize: 13, fontWeight: '800' },
  addButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, justifyContent: 'center', marginTop: 14, minHeight: 48 },
  topBookButton: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 0 },
  addButtonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  addButtonText: { color: colors.dark, fontSize: 15, fontWeight: '800' },
  tabBar: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 10, paddingTop: 12 },
  tabButton: { alignItems: 'center', flex: 1, gap: 4, justifyContent: 'center', minHeight: 52 },
  tabButtonPressed: { opacity: 0.75 },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  activeTabLabel: { color: colors.gold },
});
