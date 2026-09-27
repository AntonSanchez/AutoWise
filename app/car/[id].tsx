import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { type ThemeColors, useThemeColors, withAlpha } from '@/components/theme-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';

export default function CarDetailScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cars, profile, scheduledServices, removeScheduledService, records, addRecord, deleteRecord, clearRecordsForCar } = useProfile();
  const [activeTab, setActiveTab] = useState<'schedule' | 'records'>('schedule');
  const [removeTarget, setRemoveTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<{ id: string; title: string } | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [addRecordVisible, setAddRecordVisible] = useState(false);
  const [recordForm, setRecordForm] = useState({ title: '', value: '', detail: '' });
  const [recordError, setRecordError] = useState('');
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const car = cars.find((item) => item.id === id);
  const carServices = scheduledServices.filter((service) => service.carId === id);
  const carRecords = records.filter((record) => record.carId === id);

  const confirmRemove = () => {
    if (!removeTarget) {
      return;
    }

    removeScheduledService(removeTarget.id);
    setRemoveTarget(null);
  };

  const deleteSelectedRecord = () => {
    if (!deleteRecordTarget) {
      return;
    }

    deleteRecord(deleteRecordTarget.id);
    setDeleteRecordTarget(null);
  };

  const clearAllRecords = () => {
    if (id) {
      clearRecordsForCar(id);
    }
    setClearAllOpen(false);
  };

  const openAddRecord = () => {
    setRecordError('');
    setRecordForm({ title: '', value: '', detail: '' });
    setAddRecordVisible(true);
  };

  const handleSaveRecord = () => {
    const trimmed = {
      title: recordForm.title.trim(),
      value: recordForm.value.trim(),
      detail: recordForm.detail.trim(),
    };

    if (trimmed.title.length === 0 || trimmed.value.length === 0) {
      setRecordError('Please enter at least a title and value.');
      return;
    }

    if (!id) {
      return;
    }

    addRecord({ id: `${Date.now()}`, carId: id, ...trimmed });
    setAddRecordVisible(false);
  };

  if (!car) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <AppHeader />
          <View style={styles.headerRow}>
            <Pressable hitSlop={8} onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.pageTitle}>Car not found</Text>
          </View>
          <Text style={styles.notFoundText}>This car may have been removed. Go back to your garage to pick another one.</Text>
          <BottomNavigation activeRoute="/cars" />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.pageTitle}>{car.vehicleName}</Text>
          </View>

          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <Ionicons name="car" size={24} color={colors.gold} />
            </View>
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleTitleRow}>
                <Text style={styles.vehicleTitle}>{car.vehicleModel}</Text>
                {car.id === profile.primaryCarId && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                )}
              </View>
              <Text style={styles.vehicleMeta}>{car.transmissionType} • {car.fuelType}</Text>
            </View>
            <Pressable
              accessibilityLabel="Edit car"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigate(`/add-car?carId=${car.id}`)}
            >
              <Ionicons name="create-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.segmentRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveTab('schedule')}
              style={[styles.segmentButton, activeTab === 'schedule' && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, activeTab === 'schedule' && styles.segmentTextActive]}>Schedule</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveTab('records')}
              style={[styles.segmentButton, activeTab === 'records' && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, activeTab === 'records' && styles.segmentTextActive]}>Records</Text>
            </Pressable>
          </View>

          {activeTab === 'schedule' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Book a vehicle service"
                hitSlop={8}
                style={({ pressed }) => [styles.addButton, styles.topBookButton, pressed && styles.addButtonPressed]}
                onPress={() => navigate(`/add-schedule?carId=${car.id}`)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.dark} />
                <Text style={styles.addButtonText}>Book Services</Text>
              </Pressable>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Owner scheduled</Text>
                <Text style={styles.sectionMini}>{carServices.length} service{carServices.length === 1 ? '' : 's'} booked</Text>
              </View>

              {carServices.length === 0 && (
                <View style={styles.protocolCard}>
                  <Text style={styles.protocolSubtitle}>No services booked yet. Tap Book Services to add one.</Text>
                </View>
              )}

              {carServices.map((service) => (
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
                    <Text style={styles.protocolMeta}>Time: {service.time}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.recordActionsRow}>
                <Pressable
                  accessibilityLabel="Add a record"
                  accessibilityRole="button"
                  onPress={openAddRecord}
                  style={({ pressed }) => [styles.addButton, styles.recordActionButton, pressed && styles.addButtonPressed]}
                >
                  <Ionicons name="add" size={18} color={colors.dark} />
                  <Text style={styles.addButtonText}>Add Record</Text>
                </Pressable>
                {carRecords.length > 0 && (
                  <Pressable
                    accessibilityLabel="Clear all records"
                    accessibilityRole="button"
                    onPress={() => setClearAllOpen(true)}
                    style={({ pressed }) => [styles.clearAllButton, pressed && styles.buttonPressed]}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.muted} />
                  </Pressable>
                )}
              </View>

              {carRecords.length === 0 && (
                <View style={styles.recordCard}>
                  <Text style={styles.recordDetail}>No records yet. Tap Add Record to log one.</Text>
                </View>
              )}

              {carRecords.map((item) => (
                <View key={item.id} style={styles.recordCard}>
                  <View style={styles.protocolIconWrap}>
                    <Ionicons name="document-text-outline" size={18} color={colors.gold} />
                  </View>
                  <View style={styles.protocolTextWrap}>
                    <Text style={styles.recordTitle}>{item.title}</Text>
                    <Text style={styles.recordValue}>{item.value}</Text>
                    {item.detail.length > 0 && <Text style={styles.recordDetail}>{item.detail}</Text>}
                  </View>
                  <Pressable
                    accessibilityLabel={`Delete ${item.title} record`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setDeleteRecordTarget({ id: item.id, title: item.title })}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <BottomNavigation activeRoute="/cars" />

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

        <Modal
          animationType="fade"
          transparent
          visible={deleteRecordTarget !== null || clearAllOpen}
          onRequestClose={() => {
            setDeleteRecordTarget(null);
            setClearAllOpen(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.removeModal}>
              <View style={styles.warningIconWrap}>
                <Ionicons name="trash-outline" size={24} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>{clearAllOpen ? 'Clear all records?' : 'Delete record?'}</Text>
              <Text style={styles.modalMessage}>
                {clearAllOpen ? 'This will remove every record for this vehicle.' : <>Remove <Text style={styles.modalEntry}>{deleteRecordTarget?.title}</Text> from your records?</>}
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDeleteRecordTarget(null);
                    setClearAllOpen(false);
                  }}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.modalButtonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={clearAllOpen ? clearAllRecords : deleteSelectedRecord}
                  style={({ pressed }) => [styles.confirmRemoveButton, pressed && styles.modalButtonPressed]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.dark} />
                  <Text style={styles.confirmRemoveText}>{clearAllOpen ? 'Clear All' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={addRecordVisible}
          onRequestClose={() => setAddRecordVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.removeModal}>
              <View style={styles.warningIconWrap}>
                <Ionicons name="document-text-outline" size={24} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>Add record</Text>
              <Text style={styles.modalMessage}>Log a maintenance or expense record for this vehicle.</Text>

              <Text style={styles.recordFormLabel}>Title</Text>
              <TextInput
                style={styles.recordFormInput}
                value={recordForm.title}
                onChangeText={(value) => {
                  setRecordError('');
                  setRecordForm((current) => ({ ...current, title: value }));
                }}
                placeholder="e.g. Oil Change"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.recordFormLabel}>Value</Text>
              <TextInput
                style={styles.recordFormInput}
                value={recordForm.value}
                onChangeText={(value) => {
                  setRecordError('');
                  setRecordForm((current) => ({ ...current, value }));
                }}
                placeholder="e.g. $65 or 45,000 km"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.recordFormLabel}>Detail (optional)</Text>
              <TextInput
                style={styles.recordFormInput}
                value={recordForm.detail}
                onChangeText={(value) => setRecordForm((current) => ({ ...current, detail: value }))}
                placeholder="e.g. Done at QuickLube on Main St"
                placeholderTextColor={colors.muted}
              />

              {recordError.length > 0 && <Text style={styles.recordFormError}>{recordError}</Text>}

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAddRecordVisible(false)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.modalButtonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSaveRecord}
                  style={({ pressed }) => [styles.confirmRemoveButton, pressed && styles.modalButtonPressed]}
                >
                  <Text style={styles.confirmRemoveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
    pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800', flexShrink: 1 },
    inlineBackButton: { marginRight: 8 },
    headerRow: { alignItems: 'center', flexDirection: 'row', marginHorizontal: 18, marginTop: 14, marginBottom: 16 },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
    buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    notFoundText: { color: colors.muted, fontSize: 13, marginHorizontal: 18, lineHeight: 19 },
    vehicleCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 16, padding: 12 },
    vehicleIconWrap: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderRadius: 12, height: 38, justifyContent: 'center', marginRight: 12, width: 38 },
    vehicleInfo: { flex: 1 },
    vehicleTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    primaryBadge: {
      backgroundColor: withAlpha(colors.gold, 0.16),
      borderColor: withAlpha(colors.gold, 0.4),
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    primaryBadgeText: { color: colors.gold, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
    vehicleTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
    vehicleMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
    segmentRow: { backgroundColor: colors.cardAlt, borderRadius: 12, flexDirection: 'row', marginBottom: 16, padding: 4 },
    segmentButton: { alignItems: 'center', borderRadius: 9, flex: 1, minHeight: 38, justifyContent: 'center' },
    segmentButtonActive: { backgroundColor: colors.gold },
    segmentText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: colors.dark },
    addButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, justifyContent: 'center', marginTop: 14, minHeight: 48 },
    topBookButton: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 0 },
    recordActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    recordActionButton: { flex: 1, flexDirection: 'row', gap: 8, marginTop: 0 },
    clearAllButton: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      width: 48,
    },
    addButtonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    addButtonText: { color: colors.dark, fontSize: 15, fontWeight: '800' },
    summaryCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 14 },
    summaryBody: { marginBottom: 10 },
    summaryItem: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    summaryItemValue: { color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    summaryDate: { color: colors.muted, fontSize: 10, fontWeight: '700' },
    taskCard: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: 12 },
    taskHeadRow: { alignItems: 'center', flexDirection: 'row' },
    taskIconWrap: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderRadius: 10, height: 34, justifyContent: 'center', marginRight: 10, width: 34 },
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
    sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    sectionMini: { color: colors.muted, fontSize: 10 },
    protocolCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 12 },
    protocolRow: { alignItems: 'center', flexDirection: 'row' },
    protocolIconWrap: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
    protocolTextWrap: { flex: 1, marginLeft: 10 },
    protocolTitle: { color: colors.text, flexShrink: 1, fontSize: 14, fontWeight: '700' },
    protocolSubtitle: { color: colors.muted, flexShrink: 1, fontSize: 10, marginTop: 3 },
    protocolMetaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, rowGap: 5 },
    protocolMeta: { color: colors.muted, flexShrink: 1, fontSize: 10, marginRight: 8 },
    removeButton: { alignItems: 'center', flexShrink: 0, height: 32, justifyContent: 'center', marginLeft: 8, width: 32 },
    removeButtonPressed: { opacity: 0.65 },
    recordCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 14 },
    recordTitle: { color: colors.softText, fontSize: 12, marginBottom: 4 },
    recordValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
    recordDetail: { color: colors.muted, fontSize: 11, marginTop: 4 },
    recordFormLabel: {
      alignSelf: 'stretch',
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
    },
    recordFormInput: {
      alignSelf: 'stretch',
      backgroundColor: colors.cardAlt,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: colors.text,
      fontSize: 14,
      minHeight: 44,
      paddingHorizontal: 12,
    },
    recordFormError: {
      alignSelf: 'stretch',
      color: colors.danger,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 10,
      textAlign: 'center',
    },
    modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 24 },
    removeModal: { backgroundColor: colors.card, borderColor: withAlpha(colors.gold, 0.26), borderRadius: 22, borderWidth: 1, maxWidth: 420, padding: 24, width: '100%' },
    warningIconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 16, width: 56 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    modalMessage: { color: colors.softText, fontSize: 13, lineHeight: 20, marginTop: 10, textAlign: 'center' },
    modalEntry: { color: colors.text, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
    modalButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    cancelButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
    cancelButtonText: { color: colors.softText, fontSize: 13, fontWeight: '700' },
    confirmRemoveButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 11, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 46 },
    confirmRemoveText: { color: colors.dark, fontSize: 13, fontWeight: '800' },
  });
}
