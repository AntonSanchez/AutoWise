import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/components/auth-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';
import { subscribeAdminIds, subscribeUsers, type AdminUser } from '@/lib/admin';

type Filter = 'all' | 'customers' | 'mechanics' | 'pending';

export default function AdminUsersScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const unsubscribeUsers = subscribeUsers(
      (next) => {
        setUsers(next);
        setError('');
        setLoading(false);
      },
      (snapshotError) => {
        console.error('AutoWise: admin user list failed', snapshotError);
        setError('Could not load accounts. Make sure the latest firestore.rules are published and this account is listed in the admins collection.');
        setLoading(false);
      },
    );
    const unsubscribeAdmins = subscribeAdminIds(setAdminIds);

    return () => {
      unsubscribeUsers();
      unsubscribeAdmins();
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byFilter = users.filter((item) => {
      if (filter === 'customers') return item.role === 'customer';
      if (filter === 'mechanics') return item.role === 'mechanic';
      if (filter === 'pending') return item.role === 'mechanic' && !item.mechanicApproved && !item.disabled;
      return true;
    });

    if (!term) {
      return byFilter;
    }

    return byFilter.filter((item) => [item.ownerName, item.email, item.phoneNumber, item.uid].some((value) => value.toLowerCase().includes(term)));
  }, [users, search, filter]);

  const disabledCount = users.filter((item) => item.disabled).length;
  const pendingMechanics = users.filter((item) => item.role === 'mechanic' && !item.mechanicApproved && !item.disabled).length;
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'customers', label: 'Customers' },
    { key: 'mechanics', label: 'Mechanics' },
    { key: 'pending', label: pendingMechanics > 0 ? `Pending (${pendingMechanics})` : 'Pending' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.pageTitleRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.pageTitle}>Administration</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{users.length}</Text>
              <Text style={styles.statLabel}>ACCOUNTS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{users.length - disabledCount}</Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, disabledCount > 0 && { color: colors.danger }]}>{disabledCount}</Text>
              <Text style={styles.statLabel}>DISABLED</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={17} color={colors.muted} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Search name, email, phone or ID"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={search}
            />
            {search.length > 0 && (
              <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
            {filters.map((item) => {
              const selected = filter === item.key;

              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(item.key)}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading && <ActivityIndicator color={colors.gold} style={styles.loader} />}

          {error.length > 0 && (
            <View style={styles.messageCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {!loading && !error && filtered.length === 0 && (
            <View style={styles.messageCard}>
              <Ionicons name="people-outline" size={20} color={colors.muted} />
              <Text style={styles.messageText}>{search ? 'No accounts match your search.' : 'No accounts yet.'}</Text>
            </View>
          )}

          {filtered.map((item) => {
            const isSelf = item.uid === user?.uid;
            const isOtherAdmin = adminIds.has(item.uid);

            return (
              <Pressable
                key={item.uid}
                accessibilityRole="button"
                accessibilityLabel={`Manage ${item.ownerName || item.email || 'account'}`}
                onPress={() => navigate(`/admin/user/${item.uid}`)}
                style={({ pressed }) => [styles.userCard, pressed && styles.pressed]}
              >
                <Avatar
                  uri={item.avatarUri}
                  size={40}
                  radius={12}
                  muted={item.disabled}
                  icon={isOtherAdmin ? 'shield-checkmark' : item.role === 'mechanic' ? 'construct' : 'person'}
                  style={styles.avatar}
                />
                <View style={styles.userText}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={styles.userName}>
                      {item.ownerName || 'Unnamed account'}
                    </Text>
                    {isOtherAdmin && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{isSelf ? 'YOU · ADMIN' : 'ADMIN'}</Text>
                      </View>
                    )}
                    {item.role === 'mechanic' && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>MECHANIC</Text>
                      </View>
                    )}
                    {item.role === 'mechanic' && !item.mechanicApproved && !item.disabled && (
                      <View style={[styles.badge, styles.dangerBadge]}>
                        <Text style={[styles.badgeText, { color: colors.danger }]}>NEEDS APPROVAL</Text>
                      </View>
                    )}
                    {item.deletedByAdmin ? (
                      <View style={[styles.badge, styles.dangerBadge]}>
                        <Text style={[styles.badgeText, { color: colors.danger }]}>DELETED</Text>
                      </View>
                    ) : (
                      item.disabled && (
                        <View style={[styles.badge, styles.dangerBadge]}>
                          <Text style={[styles.badgeText, { color: colors.danger }]}>DISABLED</Text>
                        </View>
                      )
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.userMeta}>
                    {item.email || 'No email on file yet'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30 },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', marginRight: 8, width: 38 },
    pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 14 },
    statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
    statLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
    searchRow: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 14, minHeight: 48, paddingHorizontal: 13 },
    searchInput: { color: colors.text, flex: 1, fontSize: 14, minHeight: 46 },
    filterScroll: { flexGrow: 0, marginBottom: 14 },
    filterRow: { gap: 8 },
    filterChip: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
    filterChipActive: { backgroundColor: withAlpha(colors.gold, 0.14), borderColor: colors.gold },
    filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    filterTextActive: { color: colors.gold },
    loader: { marginVertical: 24 },
    messageCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
    messageText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 },
    userCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 10, padding: 14 },
    avatar: { marginRight: 12 },
    avatarDisabled: { backgroundColor: withAlpha(colors.muted, 0.14) },
    userText: { flex: 1, marginRight: 8 },
    nameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    userName: { color: colors.text, flexShrink: 1, fontSize: 15, fontWeight: '800' },
    userMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    badge: { backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    dangerBadge: { backgroundColor: withAlpha(colors.danger, 0.14) },
    badgeText: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  });
}
