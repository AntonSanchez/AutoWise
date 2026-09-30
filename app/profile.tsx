import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { getNextMaintenanceRecommendation, useProfile } from '@/components/profile-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';

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
};

export default function ProfileScreen() {
  const goBack = useSafeBack();
  const { signOut } = useAuth();
  const { profile, vehicles, activeVehicleId, remindersEnabled, setRemindersEnabled, selectVehicle, addVehicle, updateProfile, resetProfileSession } = useProfile();
  const actionInProgress = useRef(false);
  const [form, setForm] = useState(profile);
  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileEditorVisible, setProfileEditorVisible] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [profileCreatedModalVisible, setProfileCreatedModalVisible] = useState(false);
  const [settingsModal, setSettingsModal] = useState<'about' | 'vehicle' | 'logout' | null>(null);
  const liveRecommendation = getNextMaintenanceRecommendation(form.odometer);

  const handleChange = (field: keyof typeof form, value: string) => {
    setValidationError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (actionInProgress.current) {
      return;
    }

    const textFields = [form.ownerName, form.vehicleName, form.vehicleModel, form.purchaseDate, form.insurance, form.servicePlan];
    const hasBlankTextField = textFields.some((field) => field.trim().length === 0);
    const hasInvalidOdometer = !/^\s*\d[\d,]*(?:\s*km)?\s*$/i.test(form.odometer) || form.odometer.replace(/[^0-9]/g, '').length === 0;

    if (hasBlankTextField || hasInvalidOdometer) {
      setValidationError(hasInvalidOdometer ? 'Current odometer must contain a valid number.' : 'Please complete all fields with valid text.');
      return;
    }

    actionInProgress.current = true;
    setSaving(true);
    if (addingVehicle) {
      addVehicle(form);
      setAddingVehicle(false);
    } else {
      updateProfile(form);
    }
    setSaving(false);
    setProfileEditorVisible(false);
    setProfileCreatedModalVisible(true);
    actionInProgress.current = false;
  };

  const handleLogout = () => {
    if (actionInProgress.current) {
      return;
    }

    actionInProgress.current = true;
    setSettingsModal(null);
    resetProfileSession();
    signOut();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={() => {
              if (!actionInProgress.current) {
                actionInProgress.current = true;
                goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Vehicle Profile</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {profileEditorVisible && <View style={styles.card}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>{addingVehicle ? 'Add a vehicle' : 'Edit vehicle profile'}</Text>
                <Text style={styles.formSubtitle}>Add the details AutoWise uses for maintenance reminders.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close profile editor"
                hitSlop={8}
                onPress={() => setProfileEditorVisible(false)}
                style={({ pressed }) => [styles.closeEditorButton, pressed && styles.buttonPressed]}
              >
                <Ionicons name="close" size={19} color={colors.softText} />
              </Pressable>
            </View>
            <Text style={styles.label}>Owner name</Text>
            <TextInput
              style={styles.input}
              value={form.ownerName}
              onChangeText={(value) => handleChange('ownerName', value)}
            />

            <Text style={styles.label}>Vehicle name</Text>
            <TextInput
              style={styles.input}
              value={form.vehicleName}
              onChangeText={(value) => handleChange('vehicleName', value)}
            />

            <Text style={styles.label}>Vehicle model</Text>
            <TextInput
              style={styles.input}
              value={form.vehicleModel}
              onChangeText={(value) => handleChange('vehicleModel', value)}
            />

            <Text style={styles.label}>Current odometer</Text>
            <TextInput
              style={styles.input}
              value={form.odometer}
              onChangeText={(value) => handleChange('odometer', value)}
              keyboardType="numeric"
              inputMode="numeric"
            />

            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationLabel}>Live recommendation</Text>
              <Text style={styles.recommendationTitle}>{liveRecommendation.title}</Text>
              <Text style={styles.recommendationMeta}>
                {liveRecommendation.status} • {liveRecommendation.action} • next at {liveRecommendation.targetMileage.toLocaleString()} km
              </Text>
            </View>

            <Text style={styles.label}>Purchase date</Text>
            <TextInput
              style={styles.input}
              value={form.purchaseDate}
              onChangeText={(value) => handleChange('purchaseDate', value)}
            />

            <Text style={styles.label}>Insurance</Text>
            <TextInput
              style={styles.input}
              value={form.insurance}
              onChangeText={(value) => handleChange('insurance', value)}
            />

            <Text style={styles.label}>Service plan</Text>
            <TextInput
              style={styles.input}
              value={form.servicePlan}
              onChangeText={(value) => handleChange('servicePlan', value)}
            />
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              onPress={handleSave}
            >
              {saving ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryButtonText}>{addingVehicle ? 'Add Vehicle' : 'Save Vehicle Profile'}</Text>}
            </Pressable>
            {validationError && <Text style={styles.validationError}>{validationError}</Text>}
          </View>}

          <View style={styles.vehicleSelectorSection}>
            <Text style={styles.selectorTitle}>Your vehicles</Text>
            {vehicles.map((vehicle) => (
              <Pressable
                key={vehicle.id}
                accessibilityRole="button"
                accessibilityState={{ selected: vehicle.id === activeVehicleId }}
                onPress={() => {
                  selectVehicle(vehicle.id);
                  setForm(vehicle);
                  setAddingVehicle(false);
                  setProfileEditorVisible(false);
                }}
                style={({ pressed }) => [styles.vehicleOption, vehicle.id === activeVehicleId && styles.vehicleOptionActive, pressed && styles.settingsRowPressed]}
              >
                <Ionicons name="car-outline" size={19} color={colors.gold} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.settingsRowText}>{vehicle.vehicleName}</Text>
                  <Text style={styles.rowSubtitle}>{vehicle.vehicleModel} · {vehicle.odometer}</Text>
                </View>
                {vehicle.id === activeVehicleId && <Ionicons name="checkmark-circle" size={19} color={colors.gold} />}
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setForm({ ...profile, id: `vehicle-${Date.now()}`, vehicleName: '', vehicleModel: '', odometer: '0 km', purchaseDate: '', insurance: '', servicePlan: 'Every 5,000 km' });
                setAddingVehicle(true);
                setProfileEditorVisible(true);
              }}
              style={({ pressed }) => [styles.addVehicleButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="add-circle-outline" size={19} color={colors.gold} />
              <Text style={styles.addVehicleText}>Add another vehicle</Text>
            </Pressable>
          </View>

          <View style={styles.settingsList}>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setForm(profile); setAddingVehicle(false); setProfileEditorVisible(true); }}
              style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="person-outline" size={19} color={colors.gold} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.settingsRowText}>Profile</Text>
                <Text style={styles.rowSubtitle}>{profileEditorVisible ? 'Creating vehicle profile' : 'Create or update your vehicle profile'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: remindersEnabled }}
              onPress={() => setRemindersEnabled(!remindersEnabled)}
              style={({ pressed }) => [styles.settingsRow, styles.settingsRowBorder, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="settings-outline" size={19} color={colors.gold} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.settingsRowText}>Settings</Text>
                <Text style={styles.rowSubtitle}>Maintenance reminders {remindersEnabled ? 'on' : 'off'}</Text>
              </View>
              <Switch
                accessibilityLabel="Toggle maintenance reminders"
                onValueChange={setRemindersEnabled}
                value={remindersEnabled}
                pointerEvents="none"
                trackColor={{ false: '#343a40', true: 'rgba(242,188,57,0.45)' }}
                thumbColor={remindersEnabled ? colors.gold : colors.muted}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSettingsModal('about')}
              style={({ pressed }) => [styles.settingsRow, styles.settingsRowBorder, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="information-circle-outline" size={19} color={colors.gold} />
              <Text style={styles.settingsRowText}>About</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSettingsModal('logout')}
              style={({ pressed }) => [styles.settingsRow, styles.settingsRowBorder, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="log-out-outline" size={19} color="#ff8c86" />
              <Text style={styles.logoutText}>Log out</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
          </View>

        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={settingsModal !== null}
          onRequestClose={() => setSettingsModal(null)}
        >
          <View style={styles.settingsModalBackdrop}>
            <View style={styles.settingsModal}>
              <View style={styles.settingsModalIcon}>
                <Ionicons
                  name={settingsModal === 'about' ? 'information-circle-outline' : settingsModal === 'vehicle' ? 'car-outline' : 'log-out-outline'}
                  size={25}
                  color={settingsModal === 'logout' ? '#ff8c86' : colors.gold}
                />
              </View>
              <Text style={styles.settingsModalTitle}>
                {settingsModal === 'about' ? 'About AutoWise' : settingsModal === 'vehicle' ? 'Vehicle details' : 'Log out'}
              </Text>
              <Text style={styles.settingsModalMessage}>
                {settingsModal === 'about'
                  ? 'AutoWise helps you track vehicle maintenance and plan upcoming service.'
                  : settingsModal === 'vehicle'
                    ? `${form.vehicleName}\n${form.vehicleModel}\n${form.odometer}`
                    : 'Are you sure you want to log out?'}
              </Text>
              <View style={styles.settingsModalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSettingsModal(null)}
                  style={({ pressed }) => [styles.settingsCancelButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.settingsCancelText}>{settingsModal === 'logout' ? 'Cancel' : 'Close'}</Text>
                </Pressable>
                {settingsModal === 'logout' && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleLogout}
                    style={({ pressed }) => [styles.settingsLogoutButton, pressed && styles.buttonPressed]}
                  >
                    <Text style={styles.settingsLogoutButtonText}>Log out</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={profileCreatedModalVisible}
          onRequestClose={() => setProfileCreatedModalVisible(false)}
        >
          <View style={styles.settingsModalBackdrop}>
            <View style={styles.settingsModal}>
              <View style={styles.successModalIcon}>
                <Ionicons name="checkmark" size={28} color={colors.dark} />
              </View>
              <Text style={styles.settingsModalTitle}>Vehicle profile saved</Text>
              <Text style={styles.settingsModalMessage}>
                Your vehicle details are saved and ready for maintenance reminders.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProfileCreatedModalVisible(false)}
                style={({ pressed }) => [styles.successModalButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.successModalButtonText}>Done</Text>
              </Pressable>
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
    paddingBottom: 12,
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
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  formHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  formSubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    maxWidth: 255,
  },
  closeEditorButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1a1d22',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  recommendationCard: {
    backgroundColor: '#1f2428',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  recommendationLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  recommendationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  recommendationMeta: {
    color: colors.softText,
    fontSize: 12,
    lineHeight: 18,
  },
  settingsList: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    overflow: 'hidden',
  },
  vehicleSelectorSection: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: 16, overflow: 'hidden', padding: 12 },
  selectorTitle: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  vehicleOption: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 10, minHeight: 52, paddingHorizontal: 8 },
  vehicleOptionActive: { backgroundColor: 'rgba(242,188,57,0.09)' },
  addVehicleButton: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 9, marginTop: 7, minHeight: 45, paddingHorizontal: 8 },
  addVehicleText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 14,
  },
  settingsRowBorder: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  settingsRowPressed: {
    backgroundColor: '#242a30',
  },
  settingsRowText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 11,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginLeft: 11,
    marginTop: 2,
  },
  logoutText: {
    color: '#ff8c86',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 11,
  },
  settingsModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  settingsModal: {
    alignItems: 'center',
    backgroundColor: '#242a30',
    borderColor: 'rgba(242,188,57,0.26)',
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  settingsModalIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(242,188,57,0.14)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  successModalIcon: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  settingsModalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  settingsModalMessage: {
    color: colors.softText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  settingsModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  settingsCancelButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  settingsCancelText: {
    color: colors.softText,
    fontSize: 13,
    fontWeight: '700',
  },
  settingsLogoutButton: {
    alignItems: 'center',
    backgroundColor: '#ff8c86',
    borderRadius: 11,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  settingsLogoutButtonText: {
    color: colors.dark,
    fontSize: 13,
    fontWeight: '800',
  },
  successModalButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 11,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 46,
    width: '100%',
  },
  successModalButtonText: {
    color: colors.dark,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
  },
  primaryButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: colors.dark,
    fontSize: 15,
    fontWeight: '800',
  },
  validationError: {
    color: '#ff8c86',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
});
