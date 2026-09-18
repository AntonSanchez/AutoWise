import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';

const navItems = [
  { label: 'Home', icon: 'home', route: '/(tabs)' },
  { label: 'Schedule', icon: 'calendar', route: '/schedule' },
  { label: 'Records', icon: 'document-text', route: '/records' },
  { label: 'History', icon: 'time', route: '/history' },
];

const records = [
  { title: 'Maintenance Summary', value: '12 completed tasks', detail: 'Last 12 months' },
  { title: 'Fuel Efficiency', value: '7.3 L/100km', detail: 'Average this year' },
  { title: 'Service Cost', value: '$1,240', detail: 'Total recorded spend' },
  { title: 'Inspection Status', value: 'Healthy', detail: 'No major issues' },
];

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
};

export default function RecordsScreen() {
  const goBack = useSafeBack();
  const { profile } = useProfile();
  const [recordItems, setRecordItems] = useState(records);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const deleteSelectedRecord = () => {
    if (!deleteTarget) {
      return;
    }

    setRecordItems((current) => current.filter((item) => item.title !== deleteTarget));
    setDeleteTarget(null);
  };

  const clearAllRecords = () => {
    setRecordItems([]);
    setClearAllOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.pageHeader}>
          <View style={styles.titleRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.backButton, styles.inlineBackButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.pageTitle}>Records</Text>
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="car" size={22} color={colors.gold} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle}>{profile.vehicleName}</Text>
            <Text style={styles.vehicleMeta}>Odometer: {profile.odometer}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>

        {recordItems.length > 0 && (
          <Pressable
            accessibilityLabel="Clear all records"
            accessibilityRole="button"
            onPress={() => setClearAllOpen(true)}
            style={({ pressed }) => [styles.clearAllButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.dark} />
            <Text style={styles.clearAllText}>Clear All Records</Text>
          </Pressable>
        )}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {recordItems.map((item) => (
            <View key={item.title} style={styles.recordCard}>
              <View style={styles.iconWrap}>
                <Ionicons name="document-text-outline" size={18} color={colors.gold} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.recordTitle}>{item.title}</Text>
                <Text style={styles.recordValue}>{item.value}</Text>
                <Text style={styles.recordDetail}>{item.detail}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Delete ${item.title} record`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setDeleteTarget(item.title)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
              >
                <Ionicons name="trash-outline" size={17} color={colors.muted} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <BottomNavigation activeRoute="/records" />

        <Modal
          animationType="fade"
          transparent
          visible={deleteTarget !== null || clearAllOpen}
          onRequestClose={() => {
            setDeleteTarget(null);
            setClearAllOpen(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.deleteModal}>
              <View style={styles.warningIconWrap}>
                <Ionicons name="trash-outline" size={24} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>{clearAllOpen ? 'Clear all records?' : 'Delete record?'}</Text>
              <Text style={styles.modalMessage}>
                {clearAllOpen ? 'This will remove every record shown for this vehicle.' : <>Remove <Text style={styles.modalEntry}>{deleteTarget}</Text> from your records?</>}
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDeleteTarget(null);
                    setClearAllOpen(false);
                  }}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={clearAllOpen ? clearAllRecords : deleteSelectedRecord}
                  style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.buttonPressed]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.dark} />
                  <Text style={styles.confirmDeleteText}>{clearAllOpen ? 'Clear All' : 'Delete'}</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  pageHeader: {
    marginHorizontal: 18,
    marginBottom: 16,
    paddingTop: 14,
  },
  greeting: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '700',
  },
  pageTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  inlineBackButton: {
    marginRight: 8,
  },
  clearAllButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginHorizontal: 18,
    marginBottom: 16,
    minHeight: 48,
  },
  clearAllText: {
    color: colors.dark,
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '800',
  },
  subGreeting: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 12,
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  profileSummaryCard: {
    backgroundColor: '#22272d',
    borderColor: 'rgba(242,188,57,0.24)',
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 16,
  },
  profileSummaryLabel: {
    color: colors.gold,
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  profileSummaryTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 7,
  },
  profileSummaryMeta: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 12,
    marginTop: 5,
  },
  vehicleCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 12,
  },
  vehicleIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(242,188,57,0.12)',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  vehicleInfo: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleMeta: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 11,
    marginTop: 4,
  },
  recordCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(242,188,57,0.12)',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    marginRight: 12,
    width: 34,
  },
  textWrap: {
    flex: 1,
  },
  recordTitle: {
    color: colors.softText,
    fontFamily: 'Arial',
    fontSize: 12,
    marginBottom: 4,
  },
  recordValue: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '800',
  },
  recordDetail: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 11,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    marginLeft: 8,
    width: 34,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  deleteModal: {
    backgroundColor: '#242a30',
    borderColor: 'rgba(242,188,57,0.26)',
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  warningIconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(242,188,57,0.14)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalMessage: {
    color: colors.softText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  modalEntry: {
    color: colors.text,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  cancelButtonText: {
    color: colors.softText,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 46,
  },
  confirmDeleteText: {
    color: colors.dark,
    fontSize: 13,
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
    justifyContent: 'center',
    minHeight: 52,
  },
  tabButtonPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: colors.gold,
  },
});
