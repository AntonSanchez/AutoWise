import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { SelectField } from '@/components/select-field';
import { useThemeColors, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';
import { getUserCar, saveUserCar } from '@/lib/admin';
import { formatDateInput, parseDateInput, startOfToday } from '@/lib/date-input';

const transmissionOptions = ['Automatic', 'Manual'] as const;
const fuelOptions = ['Gasoline', 'Diesel', 'Electric'] as const;

const emptyForm = {
  vehicleName: '',
  vehicleModel: '',
  transmissionType: 'Automatic',
  fuelType: 'Gasoline',
  dateBought: '',
  description: '',
};

// Add or edit a car inside another user's garage. Route: /admin/car?uid=<user>&carId=<optional car>
export default function AdminCarScreen() {
  const goBack = useSafeBack();
  const { uid, carId } = useLocalSearchParams<{ uid: string; carId?: string }>();
  const isEditing = Boolean(carId);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const actionInProgress = useRef(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!carId) {
      return;
    }

    let cancelled = false;
    getUserCar(uid, carId)
      .then((car) => {
        if (cancelled) return;
        if (car) {
          setForm({
            vehicleName: car.vehicleName ?? '',
            vehicleModel: car.vehicleModel ?? '',
            transmissionType: car.transmissionType ?? 'Automatic',
            fuelType: car.fuelType ?? 'Gasoline',
            dateBought: car.dateBought ?? '',
            description: car.description ?? '',
          });
        } else {
          setError('This car could not be found. It may have been deleted.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this car.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid, carId]);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
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
      setError('Please enter at least a vehicle name and model.');
      return;
    }

    const boughtDate = parseDateInput(trimmed.dateBought);

    if (!boughtDate) {
      setError('Enter a valid date bought/owned in MM/DD/YYYY format.');
      return;
    }

    if (boughtDate.getTime() > startOfToday().getTime()) {
      setError("Date bought/owned can't be in the future.");
      return;
    }

    actionInProgress.current = true;
    setSaving(true);

    try {
      await saveUserCar(uid, carId ?? null, trimmed);
      goBack();
    } catch (saveError) {
      console.error('AutoWise: admin failed to save car', saveError);
      setError('Could not save the car. Check your connection and that the latest firestore.rules are published.');
      actionInProgress.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
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

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.adminNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.gold} />
            <Text style={styles.adminNoteText}>Admin: you are changing a car in another user's garage.</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.gold} style={styles.loader} />
          ) : (
            <>
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
                accessibilityRole="button"
                disabled={saving}
                hitSlop={8}
                style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.primaryButtonPressed]}
                onPress={handleSave}
              >
                {saving ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryButtonText}>{isEditing ? 'Save Changes' : 'Add Car'}</Text>}
              </Pressable>
            </>
          )}

          {error.length > 0 && <Text style={styles.requiredError}>{error}</Text>}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
    pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginLeft: 12 },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 40 },
    loader: { marginVertical: 30 },
    adminNote: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
    adminNoteText: { color: colors.muted, flex: 1, fontSize: 12 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16 },
    label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 10, textTransform: 'uppercase' },
    input: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 46, paddingHorizontal: 12 },
    multilineInput: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
    primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, justifyContent: 'center', marginTop: 18, minHeight: 52 },
    primaryButtonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    primaryButtonText: { color: colors.dark, fontSize: 15, fontWeight: '800' },
    requiredError: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  });
}
