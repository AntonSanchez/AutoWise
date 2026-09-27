import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { type Car, useProfile } from '@/components/profile-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';

export default function CarsScreen() {
  const navigate = useSafeNavigation(false);
  const { cars, profile, updateProfile, deleteCar } = useProfile();
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    deleteCar(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Your Garage</Text>
            <Text style={styles.sectionMini}>{cars.length} car{cars.length === 1 ? '' : 's'}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a car"
            hitSlop={8}
            onPress={() => navigate('/add-car')}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Ionicons name="add" size={19} color={colors.dark} />
            <Text style={styles.addButtonText}>Add Car</Text>
          </Pressable>

          {cars.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={22} color={colors.muted} />
              <Text style={styles.emptyText}>No cars yet. Add your first vehicle to start tracking maintenance.</Text>
            </View>
          )}

          {cars.map((car) => (
            <Pressable
              key={car.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${car.vehicleName}`}
              onPress={() => navigate(`/car/${car.id}`)}
              style={({ pressed }) => [styles.carCard, pressed && styles.carCardPressed]}
            >
              <View style={styles.carIconWrap}>
                <Ionicons name="car-sport" size={22} color={colors.gold} />
              </View>
              <View style={styles.carTextWrap}>
                <View style={styles.carTitleRow}>
                  <Text style={styles.carTitle}>{car.vehicleName}</Text>
                  {car.id === profile.primaryCarId && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.carMeta}>{car.vehicleModel} • {car.fuelType}</Text>
              </View>
              <Pressable
                accessibilityLabel={car.id === profile.primaryCarId ? `${car.vehicleName} is your primary car` : `Set ${car.vehicleName} as primary`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => updateProfile({ primaryCarId: car.id === profile.primaryCarId ? '' : car.id })}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              >
                <Ionicons
                  name={car.id === profile.primaryCarId ? 'star' : 'star-outline'}
                  size={18}
                  color={car.id === profile.primaryCarId ? colors.gold : colors.muted}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={`Edit ${car.vehicleName}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigate(`/add-car?carId=${car.id}`)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              >
                <Ionicons name="create-outline" size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${car.vehicleName}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setDeleteTarget(car)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>

        <BottomNavigation activeRoute="/cars" />

        <Modal
          animationType="fade"
          transparent
          visible={deleteTarget !== null}
          onRequestClose={() => setDeleteTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.deleteModal}>
              <View style={styles.warningIconWrap}>
                <Ionicons name="trash-outline" size={24} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>Delete car?</Text>
              <Text style={styles.modalMessage}>
                Remove <Text style={styles.modalEntry}>{deleteTarget?.vehicleName}</Text> from your garage? Its booked
                services will be removed too.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeleteTarget(null)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmDelete}
                  style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.buttonPressed]}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    sectionMini: { color: colors.muted, fontSize: 10 },
    buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    addButton: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderRadius: 10,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 18,
      minHeight: 48,
    },
    addButtonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    addButtonText: { color: colors.dark, fontSize: 15, fontWeight: '800' },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 10,
      padding: 22,
    },
    emptyText: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    carCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 12,
      padding: 12,
    },
    carCardPressed: { opacity: 0.85 },
    carIconWrap: {
      alignItems: 'center',
      backgroundColor: withAlpha(colors.gold, 0.12),
      borderRadius: 12,
      height: 42,
      justifyContent: 'center',
      marginRight: 12,
      width: 42,
    },
    carTextWrap: { flex: 1, minWidth: 0 },
    carTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    primaryBadge: {
      backgroundColor: withAlpha(colors.gold, 0.16),
      borderColor: withAlpha(colors.gold, 0.4),
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    primaryBadgeText: { color: colors.gold, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
    carTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
    carMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
    iconButton: { alignItems: 'center', height: 34, justifyContent: 'center', marginLeft: 4, width: 34 },
    iconButtonPressed: { opacity: 0.65 },
    modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 24 },
    deleteModal: { backgroundColor: colors.card, borderColor: withAlpha(colors.gold, 0.26), borderRadius: 22, borderWidth: 1, maxWidth: 420, padding: 24, width: '100%' },
    warningIconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 16, width: 56 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    modalMessage: { color: colors.softText, fontSize: 13, lineHeight: 20, marginTop: 10, textAlign: 'center' },
    modalEntry: { color: colors.text, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
    cancelButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
    cancelButtonText: { color: colors.softText, fontSize: 13, fontWeight: '700' },
    confirmDeleteButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 11, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 46 },
    confirmDeleteText: { color: colors.dark, fontSize: 13, fontWeight: '800' },
  });
}
