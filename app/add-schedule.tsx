import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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
import { requestTypeOptions, type RequestType } from '@/lib/service-status';
import { useSafeBack } from '@/hooks/use-safe-navigation';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import {
  formatDateInput,
  formatTimeDisplay,
  formatTimeInput,
  parseDateInput,
  parseTimeInput,
  startOfToday,
  type Meridiem,
} from '@/lib/date-input';

export default function AddScheduleScreen() {
  const goBack = useSafeBack();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { carId } = useLocalSearchParams<{ carId?: string }>();
  const { cars, profile, addScheduledService } = useProfile();
  const car = cars.find((item) => item.id === carId);
  const actionInProgress = useRef(false);
  const nextMaintenance = getNextMaintenanceRecommendation(car?.odometer ?? '0');
  const serviceOptions = getMaintenanceRecommendations(car?.odometer ?? '0');
  const [validationError, setValidationError] = useState('');
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meridiem, setMeridiem] = useState<Meridiem>('AM');
  const [requestType, setRequestType] = useState<RequestType>('service');
  const [serviceForm, setServiceForm] = useState({
    title: nextMaintenance.title,
    vehicle: car?.vehicleName ?? '',
    time: '',
    scheduledDate: '',
    notes: `${nextMaintenance.action}. ${nextMaintenance.replacementNote ?? 'Recommendation based on mileage and vehicle condition.'}`,
  });

  const requiredFields = [
    serviceForm.title.trim(),
    serviceForm.vehicle.trim(),
    serviceForm.time.trim(),
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

    if (hasBlankRequiredField) {
      setValidationError('Please complete all fields before saving.');
      return;
    }

    const scheduledDate = parseDateInput(serviceForm.scheduledDate);

    if (!scheduledDate) {
      setValidationError('Enter a valid date in MM/DD/YYYY format (month 01–12, a real day for that month, four-digit year).');
      return;
    }

    if (scheduledDate.getTime() < startOfToday().getTime()) {
      setValidationError("Scheduled date can't be in the past.");
      return;
    }

    const parsedTime = parseTimeInput(serviceForm.time, meridiem);

    if (!parsedTime) {
      setValidationError('Enter a valid time in hh:mm format, e.g. 10:30, then choose AM or PM.');
      return;
    }

    const scheduledAt = new Date(scheduledDate);
    scheduledAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    if (scheduledAt.getTime() < Date.now()) {
      setValidationError("The scheduled time can't be in the past.");
      return;
    }

    if (!carId) {
      setValidationError('No car selected. Go back and open a car first.');
      return;
    }

    actionInProgress.current = true;
    setSaving(true);
    addScheduledService({
      id: `${Date.now()}`,
      carId,
      title: serviceForm.title.trim(),
      vehicle: serviceForm.vehicle.trim(),
      time: formatTimeDisplay(serviceForm.time, meridiem),
      scheduledDate: serviceForm.scheduledDate.trim(),
      notes: serviceForm.notes.trim(),
      requestType,
      customerName: profile.ownerName,
      vehicleModel: car?.vehicleModel ?? '',
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
            <Text style={styles.label}>Request</Text>
            <View style={styles.timeRow}>
              {requestTypeOptions.map((option) => {
                const selected = requestType === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Request a ${option.label.toLowerCase()}`}
                    accessibilityState={{ selected }}
                    onPress={() => setRequestType(option.value)}
                    style={({ pressed }) => [styles.requestTypeButton, selected && styles.meridiemSelected, pressed && styles.selectPressed]}
                  >
                    <Text style={[styles.meridiemText, selected && styles.meridiemTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

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

            <Text style={styles.label}>Time</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                value={serviceForm.time}
                onChangeText={(value) => handleChange('time', formatTimeInput(value))}
                keyboardType="numeric"
                inputMode="numeric"
                maxLength={5}
                placeholder="hh:mm (10:30)"
                placeholderTextColor={colors.muted}
              />
              {(['AM', 'PM'] as const).map((option) => {
                const selected = meridiem === option;

                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${option}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setValidationError('');
                      setMeridiem(option);
                    }}
                    style={({ pressed }) => [styles.meridiemButton, selected && styles.meridiemSelected, pressed && styles.selectPressed]}
                  >
                    <Text style={[styles.meridiemText, selected && styles.meridiemTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Scheduled date</Text>
            <TextInput
              style={styles.input}
              value={serviceForm.scheduledDate}
              onChangeText={(value) => handleChange('scheduledDate', formatDateInput(value))}
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

        <BottomNavigation activeRoute="/cars" />

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    backgroundColor: colors.cardAlt,
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
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timeInput: {
    flex: 1,
  },
  meridiemButton: {
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    width: 54,
  },
  requestTypeButton: {
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  meridiemSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  meridiemText: {
    color: colors.muted,
    fontFamily: 'Arial',
    fontSize: 13,
    fontWeight: '800',
  },
  meridiemTextSelected: {
    color: colors.dark,
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
    color: colors.danger,
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
    backgroundColor: withAlpha(colors.gold, 0.12),
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
}

