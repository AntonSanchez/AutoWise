import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';

const colors = {
  background: '#171a1d', card: '#1b1f23', border: 'rgba(255,255,255,0.08)', text: '#f5f4f2',
  softText: '#d0cbc2', muted: '#8d8a86', gold: '#f2bc39', dark: '#0b0d10',
};

export default function ReceiptsScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { profile, activeVehicleId, historyItems } = useProfile();
  const receipts = historyItems.filter((item) =>
    (!item.vehicleId || item.vehicleId === activeVehicleId) && Boolean(item.receiptUri),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Receipts</Text>
            <Text style={styles.subtitle}>{profile.vehicleName}</Text>
          </View>
          <Text style={styles.count}>{receipts.length}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {receipts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={25} color={colors.gold} /></View>
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptyMessage}>Add a receipt image URI to a service record and it will appear here with its date, shop, and cost.</Text>
              <Pressable accessibilityRole="button" onPress={() => navigate('/history')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Ionicons name="add" size={18} color={colors.dark} />
                <Text style={styles.primaryButtonText}>Go to service history</Text>
              </Pressable>
            </View>
          ) : receipts.map((item) => (
            <View key={item.id} style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptIcon}><Ionicons name="receipt-outline" size={17} color={colors.gold} /></View>
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptTitle}>{item.title}</Text>
                  <Text style={styles.receiptMeta}>{item.date}{item.shop ? ` · ${item.shop}` : ''}</Text>
                </View>
                {item.cost !== undefined && <Text style={styles.cost}>₱{item.cost.toLocaleString()}</Text>}
              </View>
              <Image source={{ uri: item.receiptUri }} style={styles.receiptImage} resizeMode="contain" />
              {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            </View>
          ))}
        </ScrollView>
        <BottomNavigation activeRoute="/history" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 14 },
  backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
  headerText: { flex: 1 }, title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  count: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  content: { flexGrow: 1, gap: 12, padding: 18, paddingBottom: 24 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 20, padding: 22 },
  emptyIcon: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptyMessage: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 18, minHeight: 44, paddingHorizontal: 14 },
  primaryButtonText: { color: colors.dark, fontSize: 12, fontWeight: '800' },
  receiptCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, padding: 12 },
  receiptHeader: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 10 },
  receiptIcon: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.1)', borderRadius: 9, height: 34, justifyContent: 'center', width: 34 },
  receiptInfo: { flex: 1 }, receiptTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  receiptMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, cost: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  receiptImage: { backgroundColor: '#111416', borderRadius: 10, height: 250, width: '100%' },
  notes: { color: colors.softText, fontSize: 11, lineHeight: 16, marginTop: 9 },
  pressed: { opacity: 0.78 },
});
