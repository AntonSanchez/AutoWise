import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';

const navItems = [
  { label: 'Home', icon: 'home', route: '/(tabs)' },
  { label: 'Schedule', icon: 'calendar', route: '/schedule' },
  { label: 'Records', icon: 'document-text', route: '/records' },
  { label: 'History', icon: 'time', route: '/history' },
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

export default function HistoryScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { profile, activeVehicleId, historyItems, addHistoryItem, deleteHistoryItem, clearHistoryItems } = useProfile();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Scheduled' | 'In Progress' | 'Cancelled'>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [entry, setEntry] = useState({ title: '', date: '', mileage: '', shop: '', cost: '', serviceType: 'Maintenance', notes: '', receiptUri: '' });
  const vehicleHistory = historyItems.filter((item) => !item.vehicleId || item.vehicleId === activeVehicleId);
  const filteredHistory = vehicleHistory.filter((item) =>
    (statusFilter === 'All' || item.status === statusFilter)
    && `${item.title} ${item.shop ?? ''} ${item.notes ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const saveEntry = () => {
    const cost = Number(entry.cost || 0);
    if (!entry.title.trim() || !entry.date.trim() || !entry.mileage.trim() || !Number.isFinite(cost) || cost < 0) {
      setEntryError('Enter a service name, date, mileage, and a valid non-negative cost.');
      return;
    }
    addHistoryItem({
      id: `service-${Date.now()}`,
      title: entry.title.trim(),
      date: entry.date.trim(),
      mileage: entry.mileage.trim(),
      status: 'Completed',
      vehicleId: activeVehicleId,
      shop: entry.shop.trim(),
      cost,
      serviceType: entry.serviceType.trim() || 'Maintenance',
      notes: entry.notes.trim(),
      receiptUri: entry.receiptUri.trim() || undefined,
    });
    setEntry({ title: '', date: '', mileage: '', shop: '', cost: '', serviceType: 'Maintenance', notes: '', receiptUri: '' });
    setEntryError('');
    setAddOpen(false);
  };

  const confirmDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const deleteSelectedItem = () => {
    if (!deleteTarget) {
      return;
    }

    deleteHistoryItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  const confirmClearAll = () => {
    clearHistoryItems(activeVehicleId);
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
            <Text style={styles.pageTitle}>History</Text>
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

        <View style={styles.historyToolbar}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search service, shop, notes" placeholderTextColor={colors.muted} style={styles.searchInput} />
          <Pressable accessibilityRole="button" onPress={() => { setEntryError(''); setAddOpen(true); }} style={({ pressed }) => [styles.addRecordButton, pressed && styles.modalButtonPressed]}>
            <Ionicons name="add" size={20} color={colors.dark} />
            <Text style={styles.addRecordText}>Add</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open receipts" onPress={() => navigate('/receipts')} style={({ pressed }) => [styles.receiptButton, pressed && styles.modalButtonPressed]}>
            <Ionicons name="receipt-outline" size={18} color={colors.gold} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', 'Completed', 'Scheduled', 'In Progress', 'Cancelled'] as const).map((filter) => (
            <Pressable key={filter} accessibilityRole="button" accessibilityState={{ selected: statusFilter === filter }} onPress={() => setStatusFilter(filter)} style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {vehicleHistory.length > 0 && (
          <Pressable
            accessibilityLabel="Clear all history"
            accessibilityRole="button"
            onPress={() => setClearAllOpen(true)}
            style={({ pressed }) => [styles.clearAllButton, pressed && styles.modalButtonPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.dark} />
            <Text style={styles.clearAllText}>Clear All History</Text>
          </Pressable>
        )}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {filteredHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name="construct-outline" size={16} color={colors.gold} />
                </View>
                <View style={styles.titleWrap}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDate}>{item.date}</Text>
                </View>
                <Text style={[styles.statusTag, item.status === 'Cancelled' && styles.cancelledStatusTag]}>{item.status}</Text>
                <Pressable
                  accessibilityLabel={`Delete ${item.title} history entry`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => confirmDelete(item.id, item.title)}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.muted} />
                </Pressable>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Mileage</Text>
                <Text style={styles.metaValue}>{item.mileage}</Text>
              </View>
              {!!item.shop && <View style={styles.metaRow}><Text style={styles.metaLabel}>Shop</Text><Text style={styles.metaValue}>{item.shop}</Text></View>}
              {item.cost !== undefined && item.cost > 0 && <View style={styles.metaRow}><Text style={styles.metaLabel}>Cost · {item.serviceType ?? 'Service'}</Text><Text style={styles.metaValue}>₱{item.cost.toLocaleString()}</Text></View>}
              {!!item.notes && <Text style={styles.entryNotes}>{item.notes}</Text>}
              {!!item.receiptUri && <Pressable accessibilityRole="button" onPress={() => navigate('/receipts')} style={styles.receiptRow}><Ionicons name="image-outline" size={15} color={colors.gold} /><Text numberOfLines={1} style={styles.receiptText}>View receipt</Text><Ionicons name="chevron-forward" size={14} color={colors.gold} /></Pressable>}
            </View>
          ))}
          {filteredHistory.length === 0 && <Text style={styles.emptyHistory}>No service records match your search.</Text>}
        </ScrollView>

        <BottomNavigation activeRoute="/history" />

        <Modal animationType="fade" transparent visible={addOpen} onRequestClose={() => setAddOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.addRecordModal}>
              <Text style={styles.modalTitle}>Add service record</Text>
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.entryForm}>
                {([
                  ['title', 'Service name'], ['date', 'Date (e.g. Sep 30, 2026)'], ['mileage', 'Mileage (km)'], ['shop', 'Shop or mechanic'], ['cost', 'Cost (₱)'], ['serviceType', 'Service type'], ['notes', 'Notes'], ['receiptUri', 'Receipt image URI (optional)'],
                ] as const).map(([key, label]) => (
                  <TextInput key={key} value={entry[key]} onChangeText={(value) => { setEntryError(''); setEntry((current) => ({ ...current, [key]: value })); }} placeholder={label} placeholderTextColor={colors.muted} keyboardType={key === 'cost' || key === 'mileage' ? 'numeric' : 'default'} multiline={key === 'notes'} style={[styles.entryInput, key === 'notes' && styles.notesInput]} />
                ))}
                {!!entryError && <Text style={styles.entryError}>{entryError}</Text>}
                {!!entry.receiptUri && <Image source={{ uri: entry.receiptUri }} style={styles.receiptPreview} resizeMode="cover" />}
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={() => setAddOpen(false)} style={[styles.cancelButton, styles.modalButton]}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={saveEntry} style={[styles.confirmDeleteButton, styles.modalButton]}><Text style={styles.confirmDeleteText}>Save record</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>

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
              <Text style={styles.modalTitle}>{clearAllOpen ? 'Clear all history?' : 'Delete history entry?'}</Text>
              <Text style={styles.modalMessage}>
                {clearAllOpen ? 'This will remove every saved history entry from this vehicle.' : <>Remove <Text style={styles.modalEntry}>{deleteTarget?.title}</Text> from your vehicle history?</>}
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDeleteTarget(null);
                    setClearAllOpen(false);
                  }}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.modalButtonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={clearAllOpen ? confirmClearAll : deleteSelectedItem}
                  style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.modalButtonPressed]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.dark} />
                  <Text style={styles.confirmDeleteText}>Delete</Text>
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
    flexShrink: 1,
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    minWidth: 0,
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
  historyToolbar: { alignItems: 'center', flexDirection: 'row', gap: 9, marginHorizontal: 18, marginBottom: 10 },
  searchInput: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, flex: 1, fontSize: 12, minHeight: 44, paddingHorizontal: 12 },
  addRecordButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, flexDirection: 'row', gap: 3, justifyContent: 'center', minHeight: 44, paddingHorizontal: 11 },
  receiptButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  addRecordText: { color: colors.dark, fontSize: 12, fontWeight: '800' },
  filterRow: { gap: 7, paddingHorizontal: 18, paddingBottom: 12 },
  filterChip: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: 'rgba(242,188,57,0.12)', borderColor: 'rgba(242,188,57,0.4)' },
  filterChipText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  filterChipTextActive: { color: colors.gold },
  emptyHistory: { color: colors.muted, fontSize: 13, paddingVertical: 30, textAlign: 'center' },
  entryNotes: { color: colors.softText, fontSize: 11, lineHeight: 17, marginTop: 10 },
  receiptRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 9 },
  receiptText: { color: colors.gold, flex: 1, fontSize: 10 },
  addRecordModal: { backgroundColor: '#242a30', borderColor: 'rgba(242,188,57,0.26)', borderRadius: 20, borderWidth: 1, maxHeight: '88%', maxWidth: 460, padding: 18, width: '100%' },
  entryForm: { marginTop: 12 },
  entryInput: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 13, marginBottom: 9, minHeight: 44, paddingHorizontal: 12 },
  notesInput: { minHeight: 72, paddingTop: 10, textAlignVertical: 'top' },
  entryError: { color: '#ff8c86', fontSize: 11, lineHeight: 16, marginBottom: 8 },
  receiptPreview: { borderRadius: 10, height: 140, marginBottom: 10, width: '100%' },
  modalButton: { minHeight: 44, paddingHorizontal: 9 },
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
    flexShrink: 1,
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
  historyCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(242,188,57,0.12)',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '700',
  },
  itemDate: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 11,
    marginTop: 3,
  },
  statusTag: {
    color: colors.green,
    flexShrink: 1,
    maxWidth: '34%',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cancelledStatusTag: { color: '#ff6d68' },
  deleteButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginLeft: 10,
    flexShrink: 0,
    width: 32,
  },
  deleteButtonPressed: {
    opacity: 0.65,
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
  modalButtonPressed: {
    opacity: 0.75,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaLabel: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: '700',
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
