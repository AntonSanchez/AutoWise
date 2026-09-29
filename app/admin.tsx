import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePendingUsers } from '@/components/pending-users-provider';

const colors = {
  background: '#171a1d', card: '#1d2227', border: 'rgba(255,255,255,0.09)',
  gold: '#f2bc39', muted: '#8d8a86', text: '#f5f4f2', green: '#70d6a0', red: '#ff7a6b',
};

type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';
type MechanicStatus = 'Available' | 'Busy' | 'Off-duty';
type Mechanic = { id: number; name: string; specialty: string; status: MechanicStatus; jobs: number };
type DashboardTab = 'approvals' | 'mechanics';

const sampleMechanics: Mechanic[] = [
  { id: 1, name: 'Carlos Garcia', specialty: 'Engine Repair', status: 'Available', jobs: 3 },
  { id: 2, name: 'Jose Martinez', specialty: 'Brake & Suspension', status: 'Busy', jobs: 5 },
  { id: 3, name: 'Marco Villanueva', specialty: 'Oil Change & Tune-up', status: 'Available', jobs: 2 },
  { id: 4, name: 'Rafael Torres', specialty: 'Electrical System', status: 'Off-duty', jobs: 0 },
  { id: 5, name: 'Luis Mendoza', specialty: 'Transmission', status: 'Busy', jobs: 4 },
];

export default function AdminScreen() {
  const pendingUsers = usePendingUsers();
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReviewStatus>('Pending');
  const [mechanics, setMechanics] = useState(sampleMechanics);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('approvals');
  const [mechanicFilter, setMechanicFilter] = useState<MechanicStatus | 'All'>('All');

  const login = () => {
    if (email.trim().toLowerCase() !== 'admin@autowise.com' || password !== 'admin123') {
      setError('Incorrect admin email or password.');
      return;
    }
    setError('');
    setLoggedIn(true);
  };

  const updateStatus = (id: number, status: ReviewStatus) => {
    if (status !== 'Approved') {
      pendingUsers.updateStatus(id, status);
      return;
    }

    const availableMechanic = mechanics
      .filter((mechanic) => mechanic.status === 'Available')
      .sort((first, second) => first.jobs - second.jobs)[0];
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    pendingUsers.updateStatus(id, status, availableMechanic ? { mechanic: availableMechanic.name, date: today } : undefined);
    if (availableMechanic) {
      setMechanics((current) => current.map((mechanic) => mechanic.id === availableMechanic.id
        ? { ...mechanic, status: 'Busy' }
        : mechanic));
    }
  };

  const updateMechanicStatus = (id: number, status: MechanicStatus) => {
    setMechanics((current) => current.map((m) => m.id === id ? { ...m, status } : m));
  };

  if (!loggedIn) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loginContainer}>
          <View style={styles.brandMark}><Ionicons name="shield-checkmark" size={24} color={colors.gold} /></View>
          <Text style={styles.brand}>AUTOWISE ADMIN</Text>
          <View style={styles.card}>
            <Text style={styles.title}>Admin login</Text>
            <Text style={styles.subtitle}>Sign in to review new user requests.</Text>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder="admin@autowise.com" placeholderTextColor={colors.muted} style={styles.input} value={email} />
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordContainer}>
              <TextInput onChangeText={setPassword} onSubmitEditing={login} placeholder="Enter admin password" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]} value={password} />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
              </Pressable>
            </View>
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={login} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Sign in</Text><Ionicons name="arrow-forward" size={18} color={colors.background} />
            </Pressable>
            <Text style={styles.hint}>Demo: admin@autowise.com · admin123</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const visibleApplicants = pendingUsers.users.filter((applicant) => applicant.status === filter);
  const pendingCount = pendingUsers.users.filter((applicant) => applicant.status === 'Pending').length;
  const availableCount = mechanics.filter((m) => m.status === 'Available').length;
  const visibleMechanics = mechanicFilter === 'All' ? mechanics : mechanics.filter((m) => m.status === mechanicFilter);

  const statusColor = (s: MechanicStatus) => s === 'Available' ? colors.green : s === 'Busy' ? colors.gold : colors.muted;
  const statusIcon = (s: MechanicStatus): 'checkmark-circle' | 'time' | 'moon' =>
    s === 'Available' ? 'checkmark-circle' : s === 'Busy' ? 'time' : 'moon';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.dashboard}>
        <View style={styles.topBar}>
          <View><Text style={styles.eyebrow}>AUTOWISE ADMIN</Text><Text style={styles.title}>Dashboard</Text></View>
          <Pressable accessibilityRole="button" onPress={() => setLoggedIn(false)} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={18} color={colors.muted} /><Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {/* Dashboard Tabs */}
        <View style={styles.dashboardTabs}>
          <Pressable accessibilityRole="button" onPress={() => setDashboardTab('approvals')} style={[styles.dashboardTab, dashboardTab === 'approvals' && styles.dashboardTabActive]}>
            <Ionicons name="people" size={16} color={dashboardTab === 'approvals' ? colors.gold : colors.muted} />
            <Text style={[styles.dashboardTabText, dashboardTab === 'approvals' && styles.dashboardTabTextActive]}>Approvals</Text>
            {pendingCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setDashboardTab('mechanics')} style={[styles.dashboardTab, dashboardTab === 'mechanics' && styles.dashboardTabActive]}>
            <Ionicons name="construct" size={16} color={dashboardTab === 'mechanics' ? colors.gold : colors.muted} />
            <Text style={[styles.dashboardTabText, dashboardTab === 'mechanics' && styles.dashboardTabTextActive]}>Mechanics</Text>
          </Pressable>
        </View>

        {dashboardTab === 'approvals' ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}><Ionicons name="people" size={20} color={colors.gold} /></View>
              <View style={{ flex: 1 }}><Text style={styles.summaryLabel}>PENDING REQUESTS</Text><Text style={styles.summaryCaption}>Users waiting for your review</Text></View>
              <Text style={styles.summaryCount}>{pendingCount}</Text>
            </View>
            <View style={styles.filters}>
              {(['Pending', 'Approved', 'Rejected'] as const).map((status) => (
                <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: filter === status }} onPress={() => setFilter(status)} style={[styles.filterButton, filter === status && styles.filterActive]}>
                  <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>{status}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {visibleApplicants.length === 0 ? (
                <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={32} color={colors.muted} /><Text style={styles.emptyText}>No {filter.toLowerCase()} users.</Text></View>
              ) : visibleApplicants.map((applicant) => (
                <View key={applicant.id} style={styles.applicantCard}>
                  <View style={styles.applicantTop}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{applicant.name.split(' ').map((part) => part[0]).join('')}</Text></View>
                    <View style={{ flex: 1 }}><Text style={styles.applicantName}>{applicant.name}</Text><Text style={styles.applicantEmail}>{applicant.email}</Text></View>
                    <Text style={styles.joined}>{applicant.joined}</Text>
                  </View>
                  {applicant.status === 'Pending' ? (
                    <View style={styles.actions}>
                      <Pressable accessibilityRole="button" onPress={() => updateStatus(applicant.id, 'Rejected')} style={[styles.actionButton, styles.rejectButton]}><Ionicons name="close" size={17} color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Reject</Text></Pressable>
                      <Pressable accessibilityRole="button" onPress={() => updateStatus(applicant.id, 'Approved')} style={[styles.actionButton, styles.approveButton]}><Ionicons name="checkmark" size={17} color={colors.green} /><Text style={[styles.actionText, { color: colors.green }]}>Approve</Text></Pressable>
                    </View>
                  ) : (
                    <View style={styles.reviewResult}>
                      <Text style={[styles.statusLabel, applicant.status === 'Approved' ? styles.approved : styles.rejected]}>{applicant.status}</Text>
                      {applicant.status === 'Approved' && (
                        <Text style={styles.assignmentText}>
                          {applicant.assignedMechanic
                            ? `Assigned to ${applicant.assignedMechanic} · ${applicant.assignedDate}`
                            : 'No mechanic available today'}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(112,214,160,0.12)' }]}><Ionicons name="construct" size={20} color={colors.green} /></View>
              <View style={{ flex: 1 }}><Text style={styles.summaryLabel}>AVAILABLE MECHANICS</Text><Text style={styles.summaryCaption}>{availableCount} of {mechanics.length} ready for work</Text></View>
              <Text style={[styles.summaryCount, { color: colors.green }]}>{availableCount}</Text>
            </View>
            <View style={styles.filters}>
              {(['All', 'Available', 'Busy', 'Off-duty'] as const).map((status) => (
                <Pressable key={status} accessibilityRole="button" onPress={() => setMechanicFilter(status)} style={[styles.filterButton, mechanicFilter === status && styles.filterActive]}>
                  <Text style={[styles.filterText, mechanicFilter === status && styles.filterTextActive]}>{status}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {visibleMechanics.length === 0 ? (
                <View style={styles.emptyState}><Ionicons name="construct-outline" size={32} color={colors.muted} /><Text style={styles.emptyText}>No {mechanicFilter.toLowerCase()} mechanics.</Text></View>
              ) : visibleMechanics.map((mechanic) => (
                <View key={mechanic.id} style={styles.applicantCard}>
                  <View style={styles.applicantTop}>
                    <View style={[styles.avatar, { backgroundColor: `${statusColor(mechanic.status)}18` }]}>
                      <Ionicons name={statusIcon(mechanic.status)} size={20} color={statusColor(mechanic.status)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.applicantName}>{mechanic.name}</Text>
                      <Text style={styles.applicantEmail}>{mechanic.specialty}</Text>
                    </View>
                    <View style={[styles.mechanicStatusBadge, { backgroundColor: `${statusColor(mechanic.status)}18` }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(mechanic.status) }]} />
                      <Text style={[styles.mechanicStatusText, { color: statusColor(mechanic.status) }]}>{mechanic.status}</Text>
                    </View>
                  </View>
                  <View style={styles.mechanicMeta}>
                    <Text style={styles.mechanicJobs}><Ionicons name="briefcase-outline" size={12} color={colors.muted} /> {mechanic.jobs} jobs completed</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" onPress={() => updateMechanicStatus(mechanic.id, 'Available')} style={[styles.actionButton, styles.approveButton, mechanic.status === 'Available' && styles.actionActive]}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.green} /><Text style={[styles.actionText, { color: colors.green }]}>Available</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => updateMechanicStatus(mechanic.id, 'Busy')} style={[styles.actionButton, { backgroundColor: 'rgba(242,188,57,0.1)' }, mechanic.status === 'Busy' && styles.actionActive]}>
                      <Ionicons name="time" size={15} color={colors.gold} /><Text style={[styles.actionText, { color: colors.gold }]}>Busy</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => updateMechanicStatus(mechanic.id, 'Off-duty')} style={[styles.actionButton, { backgroundColor: 'rgba(141,138,134,0.1)' }, mechanic.status === 'Off-duty' && styles.actionActive]}>
                      <Ionicons name="moon" size={15} color={colors.muted} /><Text style={[styles.actionText, { color: colors.muted }]}>Off-duty</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}
        <Text style={styles.demoNote}>Sample data · Changes are saved for this session only</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  brandMark: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 14, height: 52, justifyContent: 'center', width: 52 },
  brand: { color: colors.gold, fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginBottom: 25, marginTop: 12, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 18 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 48, paddingHorizontal: 13 },
  passwordContainer: { position: 'relative' as const },
  passwordInput: { paddingRight: 48 },
  eyeButton: { alignItems: 'center' as const, bottom: 0, justifyContent: 'center' as const, position: 'absolute' as const, right: 0, top: 0, width: 48 },
  error: { color: colors.red, fontSize: 12, marginTop: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 23, minHeight: 52 },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  hint: { color: colors.muted, fontSize: 11, marginTop: 16, textAlign: 'center' },
  dashboard: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5 },
  logoutButton: { alignItems: 'center', flexDirection: 'row', gap: 5, padding: 8 },
  logoutText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summaryCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  summaryIcon: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  summaryLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  summaryCaption: { color: colors.text, fontSize: 12, marginTop: 5 },
  summaryCount: { color: colors.gold, fontSize: 26, fontWeight: '900' },
  filters: { backgroundColor: colors.card, borderRadius: 12, flexDirection: 'row', marginTop: 20, padding: 4 },
  filterButton: { alignItems: 'center', borderRadius: 9, flex: 1, minHeight: 38, justifyContent: 'center' },
  filterActive: { backgroundColor: 'rgba(242,188,57,0.13)' },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.gold },
  list: { gap: 12, paddingBottom: 12, paddingTop: 14 },
  applicantCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, padding: 14 },
  applicantTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#292f34', borderRadius: 22, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  applicantName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  applicantEmail: { color: colors.muted, fontSize: 11, marginTop: 4 },
  joined: { color: colors.muted, fontSize: 10 },
  actions: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12 },
  actionButton: { alignItems: 'center', borderRadius: 9, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 38 },
  rejectButton: { backgroundColor: 'rgba(255,122,107,0.1)' },
  approveButton: { backgroundColor: 'rgba(112,214,160,0.1)' },
  actionText: { fontSize: 12, fontWeight: '800' },
  statusLabel: { fontSize: 12, fontWeight: '800', marginTop: 14 },
  reviewResult: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 12, paddingTop: 2 },
  assignmentText: { color: colors.muted, fontSize: 11, marginTop: 5 },
  approved: { color: colors.green },
  rejected: { color: colors.red },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 45 },
  emptyText: { color: colors.muted, fontSize: 13 },
  demoNote: { color: colors.muted, fontSize: 10, paddingBottom: 8, textAlign: 'center' },
  dashboardTabs: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 16, padding: 4 },
  dashboardTab: { alignItems: 'center', borderRadius: 10, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  dashboardTabActive: { backgroundColor: 'rgba(242,188,57,0.13)' },
  dashboardTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  dashboardTabTextActive: { color: colors.gold },
  badge: { alignItems: 'center', backgroundColor: colors.red, borderRadius: 10, justifyContent: 'center', minWidth: 20, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  mechanicStatusBadge: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  mechanicStatusText: { fontSize: 10, fontWeight: '800' },
  mechanicMeta: { marginTop: 10, paddingLeft: 52 },
  mechanicJobs: { color: colors.muted, fontSize: 11 },
  actionActive: { borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 },
});
