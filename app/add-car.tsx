import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { SelectField } from '@/components/select-field';
import { useThemeColors, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';
import { formatDateInput, parseDateInput, startOfToday } from '@/lib/date-input';

const transmissionOptions = ['Automatic', 'Manual'] as const;
const fuelOptions = ['Gasoline', 'Electric'] as const;

const emptyForm = {
  vehicleName: '',
  vehicleModel: '',
  transmissionType: 'Automatic',
  fuelType: 'Gasoline',
  dateBought: '',
  description: '',
};

export default function AddCarScreen() {
  const goBack = useSafeBack();
  const { carId } = useLocalSearchParams<{ carId?: string }>();
  const { cars, addCar, updateCar } = useProfile();
  const actionInProgress = useRef(false);
  const editingCar = carId ? cars.find((car) => car.id === carId) : undefined;
  const isEditing = editingCar !== undefined;
  const [form, setForm] = useState(editingCar ?? emptyForm);
  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setValidationError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (actionInProgress.current) {
      return;
    }

    const trimmed = {
      vehicleName: form.vehicleName.trim(),
      vehicleModel: form.vehicleModel.trim(),
      transmissionType: form.transmissionType.trim(),
      fuelType: form.fuelType.trim(),
      dateBought: form.dateBought.trim(),
      description: form.description.trim(),
    };

    if (trimmed.vehicleName.length === 0 || trimmed.vehicleModel.length === 0) {
      setValidationError('Please enter at least a vehicle name and model.');
      return;
    }

    const boughtDate = parseDateInput(trimmed.dateBought);

    if (!boughtDate) {
      setValidationError('Enter a valid date bought/owned in MM/DD/YYYY format.');
      return;
    }

    if (boughtDate.getTime() > startOfToday().getTime()) {
      setValidationError("Date bought/owned can't be in the future.");
      return;
    }

    actionInProgress.current = true;
    setSaving(true);

    if (isEditing && editingCar) {
      updateCar(editingCar.id, trimmed);
    } else {
      addCar({ id: `${Date.now()}`, ...trimmed });
    }

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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Car' : 'Add Car'}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.label}>Vehicle name</Text>
            <TextInput
              style={styles.input}
              value={form.vehicleName}
              onChangeText={(value) => handleChange('vehicleName', value)}
              placeholder="e.g. 2023 Hatchback 1.2L Turbo"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              value={form.vehicleModel}
              onChangeText={(value) => handleChange('vehicleModel', value)}
              placeholder="e.g. Hyundai Accent"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Transmission type</Text>
            <SelectField
              title="Transmission type"
              value={form.transmissionType}
              options={transmissionOptions}
              onChange={(value) => handleChange('transmissionType', value)}
              placeholder="Select transmission type"
            />

            <Text style={styles.label}>Fuel type</Text>
            <SelectField
              title="Fuel type"
              value={form.fuelType}
              options={fuelOptions}
              onChange={(value) => handleChange('fuelType', value)}
              placeholder="Select fuel type"
            />

            <Text style={styles.label}>Date bought/owned</Text>
            <TextInput
              style={styles.input}
              value={form.dateBought}
              onChangeText={(value) => handleChange('dateBought', formatDateInput(value))}
              keyboardType="numeric"
              inputMode="numeric"
              maxLength={10}
              placeholder="MM/DD/YYYY (04/14/2023)"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={form.description}
              onChangeText={(value) => handleChange('description', value)}
              placeholder="e.g. Notes about this vehicle"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
            />
          </View>

          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator color={colors.dark} />
            ) : (
              <Text style={styles.primaryButtonText}>{isEditing ? 'Save Changes' : 'Add Car'}</Text>
            )}
          </Pressable>
          {validationError && <Text style={styles.requiredError}>{validationError}</Text>}
        </ScrollView>

        <BottomNavigation activeRoute="/cars" />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 10,
    },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
    buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginLeft: 12 },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 40 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16 },
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
      backgroundColor: colors.cardAlt,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: colors.text,
      fontSize: 14,
      minHeight: 46,
      paddingHorizontal: 12,
    },
    multilineInput: {
      minHeight: 90,
      paddingTop: 12,
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
    primaryButtonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    primaryButtonText: { color: colors.dark, fontSize: 15, fontWeight: '800' },
    requiredError: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 10,
      textAlign: 'center',
    },
  });
}
