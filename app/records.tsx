import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';

const colors = {
  background: '#171a1d', card: '#1b1f23', border: 'rgba(255,255,255,0.08)', text: '#f5f4f2',
  softText: '#d0cbc2', muted: '#8d8a86', gold: '#f2bc39', dark: '#0b0d10', green: '#7ae1a2',
};

const monthKey = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key: string) => {
  if (!key) return 'Other dates';
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export default function RecordsScreen() {
  const goBack = useSafeBack();
  const { profile, activeVehicleId, historyItems } = useProfile();
  const vehicleRecords = historyItems.filter((item) => (!item.vehicleId || item.vehicleId === activeVehicleId) && item.status === 'Completed' && (item.cost ?? 0) > 0);
  const months = useMemo(() => [...new Set(vehicleRecords.map((item) => monthKey(item.date)).filter(Boolean))].sort().reverse(), [vehicleRecords]);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedType, setSelectedType] = useState('All');
  const effectiveMonth = months.includes(selectedMonth) ? selectedMonth : months[0] ?? currentMonth;
  const monthRecords = vehicleRecords.filter((item) => monthKey(item.date) === effectiveMonth);
  const visibleRecords = selectedType === 'All' ? monthRecords : monthRecords.filter((item) => (item.serviceType ?? 'Other') === selectedType);
  const total = monthRecords.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const types = [...new Set(vehicleRecords.map((item) => item.serviceType ?? 'Other'))].sort();
  const categoryTotals = types.map((type) => ({ type, total: monthRecords.filter((item) => (item.serviceType ?? 'Other') === type).reduce((sum, item) => sum + (item.cost ?? 0), 0) })).filter((item) => item.total > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View><Text style={styles.title}>Expense summary</Text><Text style={styles.subtitle}>{profile.vehicleName}</Text></View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.totalCard}>
            <View style={styles.totalIcon}><Ionicons name="wallet-outline" size={21} color={colors.gold} /></View>
            <Text style={styles.totalLabel}>SPENT IN {monthLabel(effectiveMonth).toUpperCase()}</Text>
            <Text style={styles.totalAmount}>₱{total.toLocaleString()}</Text>
            <Text style={styles.totalDetail}>{monthRecords.length} recorded service{monthRecords.length === 1 ? '' : 's'}</Text>
          </View>

          <Text style={styles.sectionTitle}>By month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(months.length ? months : [currentMonth]).map((month) => (
              <Pressable key={month} accessibilityRole="button" accessibilityState={{ selected: effectiveMonth === month }} onPress={() => setSelectedMonth(month)} style={[styles.chip, effectiveMonth === month && styles.chipActive]}>
                <Text style={[styles.chipText, effectiveMonth === month && styles.chipTextActive]}>{monthLabel(month)}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>By service type</Text>
          {categoryTotals.length ? categoryTotals.map((category) => (
            <View key={category.type} style={styles.categoryRow}>
              <View style={styles.categoryIcon}><Ionicons name="construct-outline" size={16} color={colors.gold} /></View>
              <Text style={styles.categoryName}>{category.type}</Text>
              <Text style={styles.categoryAmount}>₱{category.total.toLocaleString()}</Text>
            </View>
          )) : <Text style={styles.emptyText}>No expenses recorded for this month yet. Add a completed service in History to see it here.</Text>}

          <View style={styles.typeFilterRow}>
            <Text style={styles.sectionTitle}>Service expenses</Text>
            <Pressable accessibilityRole="button" onPress={() => setSelectedType('All')}><Text style={styles.filterReset}>Clear filter</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {['All', ...types].map((type) => (
              <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: selectedType === type }} onPress={() => setSelectedType(type)} style={[styles.chip, selectedType === type && styles.chipActive]}>
                <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {visibleRecords.map((item) => (
            <View key={item.id} style={styles.expenseCard}>
              <View style={styles.categoryIcon}><Ionicons name="receipt-outline" size={17} color={colors.gold} /></View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseTitle}>{item.title}</Text>
                <Text style={styles.expenseMeta}>{item.date}{item.shop ? ` · ${item.shop}` : ''}</Text>
              </View>
              <Text style={styles.categoryAmount}>₱{(item.cost ?? 0).toLocaleString()}</Text>
            </View>
          ))}
          {visibleRecords.length === 0 && monthRecords.length > 0 && <Text style={styles.emptyText}>No {selectedType.toLowerCase()} expenses this month.</Text>}
        </ScrollView>
        <BottomNavigation activeRoute="/records" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, container: { backgroundColor: colors.background, flex: 1 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 10 },
  backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  content: { padding: 18, paddingBottom: 24 },
  totalCard: { backgroundColor: '#22272d', borderColor: 'rgba(242,188,57,0.24)', borderRadius: 17, borderWidth: 1, marginBottom: 22, padding: 18 },
  totalIcon: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 11, height: 39, justifyContent: 'center', marginBottom: 13, width: 39 },
  totalLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  totalAmount: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 5 }, totalDetail: { color: colors.softText, fontSize: 11, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  chipRow: { gap: 8, paddingBottom: 15 }, chip: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: 'rgba(242,188,57,0.12)', borderColor: 'rgba(242,188,57,0.4)' }, chipText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, chipTextActive: { color: colors.gold },
  categoryRow: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 8, padding: 12 },
  categoryIcon: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.1)', borderRadius: 9, height: 33, justifyContent: 'center', width: 33 }, categoryName: { color: colors.softText, flex: 1, fontSize: 12, fontWeight: '700', marginLeft: 10 }, categoryAmount: { color: colors.text, fontSize: 13, fontWeight: '800' },
  typeFilterRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, filterReset: { color: colors.gold, fontSize: 10, fontWeight: '700' },
  expenseCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 8, padding: 12 }, expenseInfo: { flex: 1, marginHorizontal: 10 }, expenseTitle: { color: colors.text, fontSize: 12, fontWeight: '800' }, expenseMeta: { color: colors.muted, fontSize: 10, marginTop: 4 },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 15 },
});
