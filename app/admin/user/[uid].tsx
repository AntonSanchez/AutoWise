import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/components/auth-provider';
import type { Car } from '@/components/profile-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';
import {
  deleteAccountData,
  deleteUserCar,
  sendUserPasswordReset,
  setMechanicApproved,
  setUserDisabled,
  subscribeAdminIds,
  subscribeUser,
  subscribeUserCars,
  updateUserProfile,
  type AdminUser,
} from '@/lib/admin';

type Notice = { ok: boolean; text: string } | null;

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => Promise<void>;
  success: string;
  failure: string;
};

export default function AdminUserScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user: currentUser } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [account, setAccount] = useState<AdminUser | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribeUser = subscribeUser(
      uid,
      (next) => {
        setAccount(next);
        setLoading(false);
      },
      (error) => {
        console.error('AutoWise: admin account load failed', error);
        setLoading(false);
      },
    );
    const unsubscribeCars = subscribeUserCars(uid, setCars, (error) => console.error('AutoWise: admin cars load failed', error));
    const unsubscribeAdmins = subscribeAdminIds(setAdminIds);

    return () => {
      unsubscribeUser();
      unsubscribeCars();
      unsubscribeAdmins();
    };
  }, [uid]);

  const isSelf = uid === currentUser?.uid;
  const isTargetAdmin = adminIds.has(uid);
  // Admins can't lock themselves (or each other) out from inside the app.
  const canModerate = !isSelf && !isTargetAdmin;

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    setBusy(true);
    setNotice(null);

    try {
      await action();
      setNotice({ ok: true, text: success });
    } catch (error) {
      console.error(`AutoWise: ${failure}`, error);
      setNotice({ ok: false, text: `${failure}. Check your connection and that the latest firestore.rules are published.` });
    } finally {
      setBusy(false);
    }
  };

  const runConfirmation = async () => {
    const pending = confirmation;
    setConfirmation(null);

    if (pending) {
      await run(pending.action, pending.success, pending.failure);
    }
  };

  const openProfileEditor = () => {
    setNameDraft(account?.ownerName ?? '');
    setPhoneDraft(account?.phoneNumber ?? '');
    setProfileError('');
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    if (nameDraft.trim().length === 0) {
      setProfileError('Please enter a name.');
      return;
    }

    setEditingProfile(false);
    await run(
      () => updateUserProfile(uid, { ownerName: nameDraft.trim(), phoneNumber: phoneDraft.trim() }),
      'Profile updated.',
      'Could not update the profile',
    );
  };

  const askResetPassword = () => {
    if (!account?.email) {
      setNotice({ ok: false, text: 'This account has no email on file yet. It is saved the next time the user signs in.' });
      return;
    }

    const email = account.email;
    setConfirmation({
      title: 'Send password reset?',
      message: `A password reset link will be emailed to ${email}.`,
      confirmLabel: 'Send email',
      destructive: false,
      icon: 'mail-outline',
      action: () => sendUserPasswordReset(email),
      success: `Password reset email sent to ${email}.`,
      failure: 'Could not send the password reset email',
    });
  };

  const askToggleMechanicApproval = () => {
    if (!account) {
      return;
    }

    const approving = !account.mechanicApproved;
    setConfirmation({
      title: approving ? 'Approve mechanic?' : 'Revoke approval?',
      message: approving
        ? `${account.ownerName || 'This mechanic'} will be able to see every customer's service and checkup requests and accept them.`
        : `${account.ownerName || 'This mechanic'} will lose access to customer requests. Jobs they already accepted stay assigned to them until they release them or you remove them.`,
      confirmLabel: approving ? 'Approve' : 'Revoke',
      destructive: !approving,
      icon: approving ? 'construct-outline' : 'close-circle-outline',
      action: () => setMechanicApproved(uid, approving),
      success: approving ? 'Mechanic approved.' : 'Mechanic approval revoked.',
      failure: approving ? 'Could not approve the mechanic' : 'Could not revoke the approval',
    });
  };

  const askToggleDisabled = () => {
    if (!account) {
      return;
    }

    const disabling = !account.disabled;
    setConfirmation({
      title: disabling ? 'Disable account?' : 'Enable account?',
      message: disabling
        ? `${account.ownerName || 'This user'} will be signed out and won't be able to use AutoWise until you enable the account again. Their data is kept.`
        : `${account.ownerName || 'This user'} will be able to sign in and use AutoWise again.`,
      confirmLabel: disabling ? 'Disable' : 'Enable',
      destructive: disabling,
      icon: disabling ? 'ban-outline' : 'checkmark-circle-outline',
      action: () => setUserDisabled(uid, disabling),
      success: disabling ? 'Account disabled.' : 'Account enabled.',
      failure: disabling ? 'Could not disable the account' : 'Could not enable the account',
    });
  };

  const askDeleteAccount = () => {
    setConfirmation({
      title: 'Delete account data?',
      message:
        `This permanently deletes all ${cars.length} car${cars.length === 1 ? '' : 's'}, booked services, history and records for ` +
        `${account?.ownerName || 'this user'}, and disables the account. This cannot be undone. ` +
        'The sign-in itself stays in Firebase Authentication until you remove it in the Firebase console.',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      action: () => deleteAccountData(uid, account?.email),
      success: 'Account data deleted and the account disabled.',
      failure: 'Could not delete the account data',
    });
  };

  const askDeleteCar = (car: Car) => {
    setConfirmation({
      title: 'Delete car?',
      message: `Remove ${car.vehicleName} from this garage? Its booked services, history and records will be removed too.`,
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      action: () => deleteUserCar(uid, car.id, account?.primaryCarId === car.id),
      success: `${car.vehicleName} deleted.`,
      failure: 'Could not delete the car',
    });
  };

  const statusLabel = account?.deletedByAdmin ? 'Deleted' : account?.disabled ? 'Disabled' : 'Active';
  const statusColor = account?.disabled ? colors.danger : colors.green;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.pageTitle}>Manage account</Text>
          </View>

          {loading && <ActivityIndicator color={colors.gold} style={styles.loader} />}

          {!loading && !account && (
            <View style={styles.messageCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={[styles.messageText, { color: colors.danger }]}>This account could not be found.</Text>
            </View>
          )}

          {notice && (
            <View style={[styles.noticeCard, { borderColor: notice.ok ? colors.green : colors.danger }]}>
              <Ionicons name={notice.ok ? 'checkmark-circle' : 'alert-circle'} size={19} color={notice.ok ? colors.green : colors.danger} />
              <Text accessibilityLiveRegion="polite" style={[styles.noticeText, { color: notice.ok ? colors.green : colors.danger }]}>
                {notice.text}
              </Text>
            </View>
          )}

          {account && (
            <>
              <View style={styles.card}>
                <View style={styles.accountHeader}>
                  <Avatar
                    uri={account.avatarUri}
                    size={46}
                    radius={14}
                    icon={isTargetAdmin ? 'shield-checkmark' : account.role === 'mechanic' ? 'construct' : 'person'}
                    style={styles.avatar}
                  />
                  <View style={styles.accountHeaderText}>
                    <Text style={styles.accountName}>{account.ownerName || 'Unnamed account'}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      {isTargetAdmin && <Text style={styles.adminTag}>{isSelf ? 'YOU · ADMIN' : 'ADMIN'}</Text>}
                    </View>
                  </View>
                  <Pressable
                    accessibilityLabel="Edit profile"
                    accessibilityRole="button"
                    disabled={busy}
                    hitSlop={8}
                    onPress={openProfileEditor}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="create-outline" size={19} color={colors.muted} />
                  </Pressable>
                </View>

                <InfoRow
                  styles={styles}
                  label="ACCOUNT TYPE"
                  value={account.role === 'mechanic' ? (account.mechanicApproved ? 'Mechanic (approved)' : 'Mechanic (waiting for approval)') : 'Customer'}
                />
                <InfoRow styles={styles} label="EMAIL" value={account.email || 'Not saved yet'} />
                <InfoRow styles={styles} label="PHONE" value={account.phoneNumber || 'Not set'} />
                <InfoRow styles={styles} label="JOINED" value={account.createdAtMs ? new Date(account.createdAtMs).toLocaleDateString() : 'Unknown'} />
                <InfoRow styles={styles} label="USER ID" value={account.uid} selectable />
              </View>

              <Text style={styles.sectionTitle}>Account actions</Text>
              <View style={styles.card}>
                {account.role === 'mechanic' && (
                  <ActionRow
                    styles={styles}
                    colors={colors}
                    icon={account.mechanicApproved ? 'close-circle-outline' : 'construct-outline'}
                    title={account.mechanicApproved ? 'Revoke mechanic approval' : 'Approve mechanic'}
                    subtitle={account.mechanicApproved ? 'Stop this mechanic from seeing and accepting requests' : 'Let this mechanic see and accept service and checkup requests'}
                    disabled={busy}
                    onPress={askToggleMechanicApproval}
                    danger={account.mechanicApproved}
                  />
                )}
                <ActionRow
                  styles={styles}
                  colors={colors}
                  icon="mail-outline"
                  title="Send password reset email"
                  subtitle={account.email ? `Emails a reset link to ${account.email}` : 'Needs an email address on file'}
                  disabled={busy}
                  onPress={askResetPassword}
                  bordered={account.role === 'mechanic'}
                />
                {canModerate ? (
                  <>
                    <ActionRow
                      styles={styles}
                      colors={colors}
                      icon={account.disabled ? 'checkmark-circle-outline' : 'ban-outline'}
                      title={account.disabled ? 'Enable account' : 'Disable account'}
                      subtitle={account.disabled ? 'Let this user sign in again' : 'Sign this user out and block access'}
                      disabled={busy}
                      onPress={askToggleDisabled}
                      bordered
                    />
                    <ActionRow
                      styles={styles}
                      colors={colors}
                      icon="trash-outline"
                      title="Delete account data"
                      subtitle="Remove all cars, services and history, and disable the account"
                      disabled={busy}
                      onPress={askDeleteAccount}
                      danger
                      bordered
                    />
                  </>
                ) : (
                  <Text style={styles.protectedNote}>
                    {isSelf ? "You can't disable or delete your own account." : "Administrator accounts can't be disabled or deleted from the app."}
                  </Text>
                )}
              </View>

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitleInline}>Cars ({cars.length})</Text>
                <Pressable
                  accessibilityLabel="Add a car to this account"
                  accessibilityRole="button"
                  disabled={busy}
                  hitSlop={8}
                  onPress={() => navigate(`/admin/car?uid=${uid}`)}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Ionicons name="add" size={17} color={colors.dark} />
                  <Text style={styles.addButtonText}>Add car</Text>
                </Pressable>
              </View>

              {cars.length === 0 && (
                <View style={styles.messageCard}>
                  <Ionicons name="car-outline" size={20} color={colors.muted} />
                  <Text style={styles.messageText}>This account has no cars.</Text>
                </View>
              )}

              {cars.map((car) => (
                <View key={car.id} style={styles.carCard}>
                  <Avatar uri={car.photoUri} size={40} radius={12} icon="car-sport" style={styles.carIconWrap} />
                  <View style={styles.carTextWrap}>
                    <View style={styles.carTitleRow}>
                      <Text numberOfLines={2} style={styles.carTitle}>
                        {car.vehicleName}
                      </Text>
                      {car.id === account.primaryCarId && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.carMeta}>
                      {car.vehicleModel} • {car.transmissionType} • {car.fuelType}
                    </Text>
                    {car.dateBought ? <Text style={styles.carMeta}>Owned since {car.dateBought}</Text> : null}
                  </View>
                  <Pressable
                    accessibilityLabel={`Edit ${car.vehicleName}`}
                    accessibilityRole="button"
                    disabled={busy}
                    hitSlop={8}
                    onPress={() => navigate(`/admin/car?uid=${uid}&carId=${car.id}`)}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Delete ${car.vehicleName}`}
                    accessibilityRole="button"
                    disabled={busy}
                    hitSlop={8}
                    onPress={() => askDeleteCar(car)}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {busy && <ActivityIndicator color={colors.gold} style={styles.loader} />}
        </ScrollView>

        <Modal animationType="fade" transparent visible={confirmation !== null} onRequestClose={() => setConfirmation(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIconWrap, confirmation?.destructive && { backgroundColor: withAlpha(colors.danger, 0.14) }]}>
                <Ionicons name={confirmation?.icon ?? 'alert-circle-outline'} size={24} color={confirmation?.destructive ? colors.danger : colors.gold} />
              </View>
              <Text style={styles.modalTitle}>{confirmation?.title}</Text>
              <Text style={styles.modalMessage}>{confirmation?.message}</Text>
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={() => setConfirmation(null)} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={runConfirmation}
                  style={({ pressed }) => [styles.confirmButton, confirmation?.destructive && { backgroundColor: colors.danger }, pressed && styles.pressed]}
                >
                  <Text style={styles.confirmButtonText}>{confirmation?.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal animationType="fade" transparent visible={editingProfile} onRequestClose={() => setEditingProfile(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit profile</Text>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={(value) => {
                  setProfileError('');
                  setNameDraft(value);
                }}
                placeholder="Full name"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={nameDraft}
              />
              <Text style={styles.fieldLabel}>PHONE</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhoneDraft}
                placeholder="Phone number"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={phoneDraft}
              />
              {profileError.length > 0 && <Text style={styles.profileError}>{profileError}</Text>}
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={() => setEditingProfile(false)} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={saveProfile} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                  <Text style={styles.confirmButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function InfoRow({ styles, label, value, selectable }: { styles: Styles; label: string; value: string; selectable?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable={selectable} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  styles,
  colors,
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  danger,
  bordered,
}: {
  styles: Styles;
  colors: ThemeColors;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  bordered?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, bordered && styles.actionRowBordered, pressed && styles.pressed, disabled && { opacity: 0.5 }]}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.gold} />
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, danger && { color: colors.danger }]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
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
    loader: { marginVertical: 20 },
    messageCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 10, padding: 16 },
    messageText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 },
    noticeCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 14, padding: 12 },
    noticeText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 20, padding: 16 },
    accountHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 6 },
    avatar: { marginRight: 12 },
    accountHeaderText: { flex: 1 },
    accountName: { color: colors.text, fontSize: 17, fontWeight: '800' },
    statusRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
    statusDot: { borderRadius: 4, height: 8, width: 8 },
    statusText: { fontSize: 12, fontWeight: '800' },
    adminTag: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginLeft: 4 },
    iconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    infoRow: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
    infoLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    infoValue: { color: colors.text, fontSize: 14, marginTop: 4 },
    sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
    sectionTitleInline: { color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
    sectionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    actionRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 48 },
    actionRowBordered: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
    actionText: { flex: 1 },
    actionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    actionSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
    protectedNote: { borderTopColor: colors.border, borderTopWidth: 1, color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 12, paddingTop: 12 },
    addButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, flexDirection: 'row', gap: 4, minHeight: 34, paddingHorizontal: 12 },
    addButtonText: { color: colors.dark, fontSize: 12, fontWeight: '800' },
    carCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 10, padding: 14 },
    carIconWrap: { marginRight: 12 },
    carTextWrap: { flex: 1, marginRight: 4 },
    carTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    carTitle: { color: colors.text, flexShrink: 1, fontSize: 14, fontWeight: '800' },
    carMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    primaryBadge: { backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    primaryBadgeText: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
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
    fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 16 },
    input: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 46, paddingHorizontal: 13 },
    profileError: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 12 },
  });
}
