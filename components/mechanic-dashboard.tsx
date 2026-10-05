import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useMessages } from '@/components/messages-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { parseDateInput } from '@/lib/date-input';
import {
  acceptRequest,
  completeRequest,
  describeMechanicError,
  releaseRequest,
  startRequest,
  subscribeServiceRequests,
  type ServiceRequest,
} from '@/lib/mechanic';
import { getRequestType, getServiceStatus, getStatusLabel, type RequestType, type ServiceStatus } from '@/lib/service-status';

type Tab = 'requests' | 'jobs' | 'completed';
type TypeFilter = 'all' | RequestType;
type Notice = { ok: boolean; text: string } | null;
type Confirmation = { request: ServiceRequest; kind: 'complete' | 'release' };

const tabs: { key: Tab; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'jobs', label: 'My jobs' },
  { key: 'completed', label: 'Completed' },
];

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'service', label: 'Services' },
  { key: 'checkup', label: 'Checkups' },
];

function scheduledTime(request: ServiceRequest) {
  return parseDateInput(request.scheduledDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

// The screen a mechanic sees instead of the customer's garage dashboard.
export function MechanicDashboard() {
  const { user, mechanicApproved } = useAuth();
  const navigate = useSafeNavigation(false);
  const { startConversation } = useMessages();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uid = user?.uid ?? '';
  const mechanicName = user?.displayName?.trim() || 'Mechanic';

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>('requests');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // Only approved mechanics may read other people's bookings; until an admin approves the account
  // the query would just be refused, so it isn't started. When the approval arrives, this re-runs.
  useEffect(() => {
    if (!mechanicApproved) {
      setLoading(false);
      return;
    }

    setLoading(true);

    return subscribeServiceRequests(
      (next) => {
        setRequests(next);
        setLoadError('');
        setLoading(false);
      },
      (error) => {
        console.error('AutoWise: mechanic requests failed', error);
        setLoadError('Could not load requests. Make sure the latest firestore.rules are published.');
        setLoading(false);
      },
    );
  }, [mechanicApproved]);

  const { available, mine, done } = useMemo(() => {
    const visible = requests.filter((request) => typeFilter === 'all' || getRequestType(request) === typeFilter);
    const byDate = (a: ServiceRequest, b: ServiceRequest) => scheduledTime(a) - scheduledTime(b) || a.createdAtMs - b.createdAtMs;

    return {
      available: visible.filter((request) => getServiceStatus(request) === 'pending').sort(byDate),
      mine: visible
        .filter((request) => request.mechanicId === uid && ['accepted', 'in_progress'].includes(getServiceStatus(request)))
        .sort(byDate),
      done: visible.filter((request) => request.mechanicId === uid && getServiceStatus(request) === 'completed').sort((a, b) => byDate(b, a)),
    };
  }, [requests, typeFilter, uid]);

  const shown = tab === 'requests' ? available : tab === 'jobs' ? mine : done;
  const counts: Record<Tab, number> = { requests: available.length, jobs: mine.length, completed: done.length };

  const run = async (request: ServiceRequest, action: () => Promise<void>, success: string, failure: string) => {
    setBusyId(request.id);
    setNotice(null);

    try {
      await action();
      setNotice({ ok: true, text: success });
    } catch (error) {
      console.error(`AutoWise: ${failure}`, error);
      setNotice({ ok: false, text: describeMechanicError(error, failure) });
    } finally {
      setBusyId('');
    }
  };

  const handleAccept = (request: ServiceRequest) =>
    run(request, () => acceptRequest(request, { uid, name: mechanicName }), `Accepted ${request.title}. It's now in My jobs.`, 'Could not accept this request.');

  // Opens (or starts) the chat with the customer who booked this job.
  const handleMessage = async (request: ServiceRequest) => {
    setBusyId(request.id);
    setNotice(null);

    try {
      const conversationId = await startConversation({ uid: request.customerId, name: request.customerName || 'Customer', role: 'customer' });
      navigate(`/message/${conversationId}`);
    } catch (error) {
      console.error('AutoWise: could not open chat', error);
      setNotice({ ok: false, text: describeMechanicError(error, 'Could not open the chat.') });
    } finally {
      setBusyId('');
    }
  };

  const handleStart = (request: ServiceRequest) => run(request, () => startRequest(request), `Started ${request.title}.`, 'Could not start this job.');

  const runConfirmation = async () => {
    const pending = confirmation;
    setConfirmation(null);

    if (!pending) {
      return;
    }

    if (pending.kind === 'complete') {
      await run(pending.request, () => completeRequest(pending.request), `${pending.request.title} marked as completed.`, 'Could not complete this job.');
    } else {
      await run(pending.request, () => releaseRequest(pending.request), `${pending.request.title} was released back to the request list.`, 'Could not release this job.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>AUTOWISE</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>MECHANIC</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open mechanic account"
            hitSlop={6}
            onPress={() => navigate('/mechanic/account')}
            style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
          >
            <Ionicons name="person" size={17} color={colors.dark} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.dashboardTitle}>{mechanicName}</Text>

          {!mechanicApproved ? (
            <View style={styles.pendingCard}>
              <View style={styles.pendingIcon}>
                <Ionicons name="hourglass-outline" size={26} color={colors.gold} />
              </View>
              <Text style={styles.pendingTitle}>Waiting for approval</Text>
              <Text style={styles.pendingText}>
                Your mechanic account has been created. An administrator needs to approve it before you can see and accept service and checkup requests. This page updates
                by itself as soon as that happens.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{available.length}</Text>
                  <Text style={styles.statLabel}>OPEN</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{mine.length}</Text>
                  <Text style={styles.statLabel}>MY JOBS</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{done.length}</Text>
                  <Text style={styles.statLabel}>DONE</Text>
                </View>
              </View>

              <View style={styles.segment}>
                {tabs.map((item) => {
                  const selected = tab === item.key;

                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setTab(item.key)}
                      style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                    >
                      <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                        {item.label} ({counts[item.key]})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.filterRow}>
                {typeFilters.map((item) => {
                  const selected = typeFilter === item.key;

                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setTypeFilter(item.key)}
                      style={[styles.filterChip, selected && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextActive]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {notice && (
                <View style={[styles.noticeCard, { borderColor: notice.ok ? colors.green : colors.danger }]}>
                  <Ionicons name={notice.ok ? 'checkmark-circle' : 'alert-circle'} size={19} color={notice.ok ? colors.green : colors.danger} />
                  <Text accessibilityLiveRegion="polite" style={[styles.noticeText, { color: notice.ok ? colors.green : colors.danger }]}>
                    {notice.text}
                  </Text>
                </View>
              )}

              {loading && <ActivityIndicator color={colors.gold} style={styles.loader} />}

              {loadError.length > 0 && (
                <View style={styles.messageCard}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                  <Text style={[styles.messageText, { color: colors.danger }]}>{loadError}</Text>
                </View>
              )}

              {!loading && !loadError && shown.length === 0 && (
                <View style={styles.messageCard}>
                  <Ionicons name="clipboard-outline" size={20} color={colors.muted} />
                  <Text style={styles.messageText}>
                    {tab === 'requests'
                      ? 'No open requests right now. New bookings from customers show up here automatically.'
                      : tab === 'jobs'
                        ? 'You have no active jobs. Accept a request to see it here.'
                        : 'Jobs you complete will be listed here.'}
                  </Text>
                </View>
              )}

              {shown.map((request) => {
                const status = getServiceStatus(request);
                const isCheckup = getRequestType(request) === 'checkup';
                const busy = busyId === request.id;
                const statusColor = getStatusColor(status, colors);

                return (
                  <View key={`${request.customerId}-${request.id}`} style={styles.requestCard}>
                    <View style={styles.requestTop}>
                      <View style={styles.requestIcon}>
                        <Ionicons name={isCheckup ? 'search' : 'construct'} size={18} color={colors.gold} />
                      </View>
                      <View style={styles.requestTitleWrap}>
                        <Text style={styles.requestTitle}>{request.title}</Text>
                        <Text style={styles.typeTag}>{isCheckup ? 'CHECKUP' : 'SERVICE'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.14), borderColor: withAlpha(statusColor, 0.38) }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{getStatusLabel(status)}</Text>
                      </View>
                    </View>

                    <View style={styles.detailLine}>
                      <Ionicons name="car-outline" size={15} color={colors.muted} />
                      <Text style={styles.detailText}>
                        {request.vehicle}
                        {request.vehicleModel ? ` • ${request.vehicleModel}` : ''}
                      </Text>
                    </View>
                    <View style={styles.detailLine}>
                      <Ionicons name="person-outline" size={15} color={colors.muted} />
                      <Text style={styles.detailText}>{request.customerName || 'Customer'}</Text>
                    </View>
                    <View style={styles.detailLine}>
                      <Ionicons name="calendar-outline" size={15} color={colors.muted} />
                      <Text style={styles.detailText}>
                        {request.scheduledDate} at {request.time}
                      </Text>
                    </View>
                    {request.notes ? (
                      <Text numberOfLines={4} style={styles.notes}>
                        {request.notes}
                      </Text>
                    ) : null}

                    {tab === 'requests' && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Accept ${request.title}`}
                        disabled={busy}
                        onPress={() => handleAccept(request)}
                        style={({ pressed }) => [styles.primaryAction, (pressed || busy) && styles.pressed]}
                      >
                        {busy ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryActionText}>Accept {isCheckup ? 'checkup' : 'service'}</Text>}
                      </Pressable>
                    )}

                    {tab === 'completed' && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => handleMessage(request)}
                        style={({ pressed }) => [styles.secondaryAction, styles.messageRow, (pressed || busy) && styles.pressed]}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.gold} />
                        <Text style={styles.secondaryActionText}>Message customer</Text>
                      </Pressable>
                    )}

                    {tab === 'jobs' && (
                      <View style={styles.actionRow}>
                        {status === 'accepted' && (
                          <Pressable
                            accessibilityRole="button"
                            disabled={busy}
                            onPress={() => handleStart(request)}
                            style={({ pressed }) => [styles.secondaryAction, (pressed || busy) && styles.pressed]}
                          >
                            <Text style={styles.secondaryActionText}>Start work</Text>
                          </Pressable>
                        )}
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => setConfirmation({ request, kind: 'complete' })}
                          style={({ pressed }) => [styles.primaryAction, styles.actionFlex, (pressed || busy) && styles.pressed]}
                        >
                          {busy ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryActionText}>Mark completed</Text>}
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Message ${request.customerName || 'customer'}`}
                          disabled={busy}
                          hitSlop={6}
                          onPress={() => handleMessage(request)}
                          style={({ pressed }) => [styles.releaseAction, pressed && styles.pressed]}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.gold} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Release ${request.title}`}
                          disabled={busy}
                          hitSlop={6}
                          onPress={() => setConfirmation({ request, kind: 'release' })}
                          style={({ pressed }) => [styles.releaseAction, pressed && styles.pressed]}
                        >
                          <Ionicons name="return-up-back-outline" size={19} color={colors.muted} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        <BottomNavigation activeRoute="/(tabs)" />

        <Modal animationType="fade" transparent visible={confirmation !== null} onRequestClose={() => setConfirmation(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrap}>
                <Ionicons name={confirmation?.kind === 'complete' ? 'checkmark-done-outline' : 'return-up-back-outline'} size={24} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>{confirmation?.kind === 'complete' ? 'Mark as completed?' : 'Release this job?'}</Text>
              <Text style={styles.modalMessage}>
                {confirmation?.kind === 'complete'
                  ? `${confirmation.request.title} for ${confirmation.request.customerName || 'the customer'} will be marked as completed in their history.`
                  : `${confirmation?.request.title ?? 'This job'} goes back to the open requests so another mechanic can accept it.`}
              </Text>
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={() => setConfirmation(null)} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={runConfirmation} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                  <Text style={styles.confirmButtonText}>{confirmation?.kind === 'complete' ? 'Complete' : 'Release'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function getStatusColor(status: ServiceStatus, colors: ThemeColors) {
  if (status === 'completed') return colors.green;
  if (status === 'pending') return colors.blue;
  return colors.gold;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', backgroundColor: colors.background, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 18 },
    brandWrap: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    brand: { color: colors.gold, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
    rolePill: { backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    rolePillText: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    profileButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
    pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 },
    eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
    dashboardTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginBottom: 16, marginTop: 4 },
    pendingCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 24 },
    pendingIcon: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 18, height: 56, justifyContent: 'center', marginBottom: 14, width: 56 },
    pendingTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    pendingText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 14 },
    statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
    statLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
    segment: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 4 },
    segmentButton: { alignItems: 'center', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 38 },
    segmentButtonActive: { backgroundColor: colors.gold },
    segmentText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
    segmentTextActive: { color: colors.dark },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    filterChip: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
    filterChipActive: { backgroundColor: withAlpha(colors.gold, 0.14), borderColor: colors.gold },
    filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    filterTextActive: { color: colors.gold },
    noticeCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 14, padding: 12 },
    noticeText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
    loader: { marginVertical: 24 },
    messageCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
    messageText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 },
    requestCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
    requestTop: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
    requestIcon: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderRadius: 12, height: 38, justifyContent: 'center', marginRight: 12, width: 38 },
    requestTitleWrap: { flex: 1, marginRight: 8 },
    requestTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
    typeTag: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
    statusBadge: { borderRadius: 999, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
    statusBadgeText: { fontSize: 9, fontWeight: '800' },
    detailLine: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
    detailText: { color: colors.text, flex: 1, fontSize: 13 },
    notes: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
    primaryAction: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 11, justifyContent: 'center', marginTop: 14, minHeight: 44, paddingHorizontal: 16 },
    primaryActionText: { color: colors.dark, fontSize: 13, fontWeight: '800' },
    actionRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 14 },
    actionFlex: { flex: 1, marginTop: 0 },
    secondaryAction: { alignItems: 'center', backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
    secondaryActionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
    messageRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    releaseAction: { alignItems: 'center', backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 20, width: '100%' },
    modalIconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 16, height: 48, justifyContent: 'center', marginBottom: 12, width: 48 },
    modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
    modalMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelButton: { alignItems: 'center', backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
    cancelButtonText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    confirmButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 46 },
    confirmButtonText: { color: colors.dark, fontSize: 14, fontWeight: '800' },
  });
}
