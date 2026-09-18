import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { getMaintenanceRecommendations, getNextMaintenanceRecommendation, useProfile } from '@/components/profile-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';

const navItems = [
  { label: 'Home', icon: 'home', route: '/(tabs)' },
  { label: 'Schedule', icon: 'calendar', route: '/schedule' },
  { label: 'Records', icon: 'document-text', route: '/records' },
  { label: 'History', icon: 'time', route: '/history' },
];

const colors = {
  background: '#171a1d',
  panel: '#171b1f',
  card: '#1b1f23',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f2',
  softText: '#d0cbc2',
  muted: '#8d8a86',
  gold: '#f2bc39',
  dark: '#0b0d10',
  white: '#ffffff',
};

function formatScheduledDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidScheduledDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return false;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

export default function AddScheduleScreen() {
  const goBack = useSafeBack();
  const { profile, addScheduledService } = useProfile();
  const actionInProgress = useRef(false);
  const nextMaintenance = getNextMaintenanceRecommendation(profile.odometer);
  const serviceOptions = getMaintenanceRecommendations(profile.odometer);
  const [validationError, setValidationError] = useState('');
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: nextMaintenance.title,
    vehicle: profile.vehicleName,
    targetMileage: `${nextMaintenance.targetMileage.toLocaleString()} km`,
    scheduledDate: '',
    notes: `${nextMaintenance.action}. ${nextMaintenance.replacementNote ?? 'Recommendation based on mileage and vehicle condition.'}`,
  });

  const requiredFields = [
    serviceForm.title.trim(),
    serviceForm.vehicle.trim(),
    serviceForm.targetMileage.trim(),
    serviceForm.scheduledDate.trim(),
    serviceForm.notes.trim(),
  ];

  const handleChange = (field: keyof typeof serviceForm, value: string) => {
    setValidationError('');
    setServiceForm((current) => ({ ...current, [field]: value }));
  };

  const selectServiceType = (title: string) => {
    const selectedService = serviceOptions.find((item) => item.title === title);

    if (!selectedService) {
      return;
    }

    setServiceForm((current) => ({
      ...current,
      title: selectedService.title,
      targetMileage: `${selectedService.targetMileage.toLocaleString()} km`,
      notes: `${selectedService.action}. ${selectedService.replacementNote ?? 'Recommendation based on mileage and vehicle condition.'}`,
    }));
    setValidationError('');
    setServiceTypeOpen(false);
  };

  const handleSave = () => {
    if (actionInProgress.current) {
      return;
    }

    const hasBlankRequiredField = requiredFields.some((field) => field.length === 0);
    const hasInvalidMileage = !/^\s*\d[\d,]*(?:\s*km)?\s*$/i.test(serviceForm.targetMileage);
    const hasInvalidDate = !isValidScheduledDate(serviceForm.scheduledDate);

    if (hasBlankRequiredField || hasInvalidMileage || hasInvalidDate) {
      setValidationError(hasInvalidMileage ? 'Target mileage must be a valid number.' : hasInvalidDate ? 'Enter a valid date: month 01–12, day for that month (February 01–28), and a four-digit year.' : 'Please complete all fields before saving.');
      return;
    }

    actionInProgress.current = true;
    setSaving(true);
    addScheduledService({
      id: `${Date.now()}`,
      title: serviceForm.title.trim(),
      vehicle: serviceForm.vehicle.trim(),
      targetMileage: serviceForm.targetMileage.trim(),
      scheduledDate: serviceForm.scheduledDate.trim(),
      notes: serviceForm.notes.trim(),
    });
    goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
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
          <Text style={styles.headerTitle}>Add Schedule</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.label}>Service type</Text>
            <Pressable
              accessibilityLabel="Choose service type"
              accessibilityRole="button"
              onPress={() => setServiceTypeOpen(true)}
              style={({ pressed }) => [styles.input, styles.selectInput, pressed && styles.selectPressed]}
            >
              <Text style={styles.selectText}>{serviceForm.title || 'Choose a vehicle service'}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>

            <Text style={styles.label}>Vehicle</Text>
            <TextInput
              style={styles.input}
              value={serviceForm.vehicle}
              onChangeText={(value) => handleChange('vehicle', value)}
              placeholder="Vehicle name"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Target mileage</Text>
            <TextInput
              style={styles.input}
              value={serviceForm.targetMileage}
              onChangeText={(value) => handleChange('targetMileage', value)}
              keyboardType="numeric"
              inputMode="numeric"
              placeholder="Example: 45000 km"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Scheduled date</Text>
            <TextInput
              style={styles.input}
              value={serviceForm.scheduledDate}
              onChangeText={(value) => handleChange('scheduledDate', formatScheduledDate(value))}
              keyboardType="numeric"
              inputMode="numeric"
              maxLength={10}
              placeholder="MM/DD/YYYY (01/31/2026)"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={serviceForm.notes}
              onChangeText={(value) => handleChange('notes', value)}
              multiline
              placeholder="Service notes"
              placeholderTextColor={colors.muted}
            />
          </View>

          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleSave}
          >
            {saving ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryButtonText}>Save Schedule</Text>}
          </Pressable>
          {validationError && (
            <Text style={styles.requiredError}>{validationError}</Text>
          )}
        </ScrollView>

        <BottomNavigation activeRoute="/schedule" />

        <Modal
          animationType="slide"
          transparent
          visible={serviceTypeOpen}
          onRequestClose={() => setServiceTypeOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.serviceModal}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Choose a service</Text>
                  <Text style={styles.modalSubtitle}>Select the part or system to maintain.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Close service selector"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setServiceTypeOpen(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color={colors.softText} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {serviceOptions.map((item) => (
                  <Pressable
                    key={item.title}
                    onPress={() => selectServiceType(item.title)}
                    style={({ pressed }) => [styles.serviceOption, pressed && styles.serviceOptionPressed]}
                  >
                    <View style={styles.serviceOptionIcon}>
                      <Ionicons name={item.icon as any} size={18} color={colors.gold} />
                    </View>
                    <View style={styles.serviceOptionText}>
                      <Text style={styles.serviceOptionTitle}>{item.title}</Text>
                      <Text style={styles.serviceOptionMeta}>{item.action} at {item.targetMileage.toLocaleString()} km</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                  </Pressable>
                ))}
              </ScrollView>
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
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 112,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    color: colors.muted,
    fontFamily: 'Arial',
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
    fontFamily: 'Arial',
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  selectInput: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectPressed: {
    opacity: 0.75,
  },
  selectText: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
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
    fontFamily: 'Arial',
    fontSize: 15,
    fontWeight: '800',
  },
  requiredError: {
    color: '#ff8c86',
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  serviceModal: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '82%',
    padding: 18,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  serviceOption: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 66,
    paddingVertical: 10,
  },
  serviceOptionPressed: {
    opacity: 0.7,
  },
  serviceOptionIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(242,188,57,0.12)',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  serviceOptionText: {
    flex: 1,
  },
  serviceOptionTitle: {
    color: colors.text,
    fontFamily: 'Arial',
    fontSize: 13,
    fontWeight: '800',
  },
  serviceOptionMeta: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 11,
    marginTop: 3,
  },
});
