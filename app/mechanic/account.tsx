import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { BottomNavigation } from '@/components/bottom-navigation';
import { PhotoSourceModal } from '@/components/photo-source-modal';
import { useProfile } from '@/components/profile-provider';
import { accentOptions, useAppTheme, useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';
import { auth } from '@/lib/firebase';
import { AVATAR_PHOTO, pickPhoto, type PhotoSource } from '@/lib/photo';

// A mechanic's settings page. It mirrors the customer's Settings screen (profile card, appearance with
// dark mode and accent color) and adds the account details a mechanic needs: approval status, email, sign out.
const phonePattern = /^[0-9+\-()\s]{7,20}$/;

export default function MechanicAccountScreen() {
  const goBack = useSafeBack();
  const { user, mechanicApproved, signOut } = useAuth();
  const { profile, updateProfile, isSyncing } = useProfile();
  const { isDark, toggleMode, accentKey, setAccentKey } = useAppTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ownerName: '', phoneNumber: '' });
  const [validationError, setValidationError] = useState('');
  const [savedVisible, setSavedVisible] = useState(false);
  // The saved profile name, falling back to the sign-up name until the profile has loaded.
  const name = (isSyncing ? '' : profile.ownerName.trim()) || user?.displayName || 'Mechanic';

  const openEditor = () => {
    setValidationError('');
    setForm({ ownerName: name, phoneNumber: profile.phoneNumber });
    setEditing(true);
  };

  const handleSave = () => {
    const trimmedName = form.ownerName.trim();
    const trimmedPhone = form.phoneNumber.trim();

    if (trimmedName.length === 0) {
      setValidationError('Please enter your name.');
      return;
    }

    if (trimmedPhone.length > 0 && !phonePattern.test(trimmedPhone)) {
      setValidationError('Enter a valid phone number.');
      return;
    }

    updateProfile({ ownerName: trimmedName, phoneNumber: trimmedPhone });

    // Keep the sign-in name in step too: it is what customers see when a job is accepted.
    if (auth.currentUser) {
      updateAuthProfile(auth.currentUser, { displayName: trimmedName }).catch((error) => console.warn('AutoWise: could not update display name', error));
    }

    setEditing(false);
    setSavedVisible(true);
  };

  const choosePhoto = async (source: PhotoSource) => {
    setPhotoBusy(true);

    try {
      const uri = await pickPhoto(source, AVATAR_PHOTO);

      if (uri) {
        updateProfile({ avatarUri: uri });
      }
    } finally {
      setPhotoBusy(false);
      setPhotoModalVisible(false);
    }
  };

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
              style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.pageTitle}>Settings</Text>
          </View>

          {editing ? (
            <View style={[styles.card, styles.profileSpacing]}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderText}>
                  <Text style={styles.formTitle}>Edit profile</Text>
                  <Text style={styles.formSubtitle}>Update the name and phone number on your account.</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close profile editor" hitSlop={8} onPress={() => setEditing(false)}>
                  <Ionicons name="close" size={19} color={colors.softText} />
                </Pressable>
              </View>

              <Text style={styles.label}>Name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={(value) => {
                  setValidationError('');
                  setForm((current) => ({ ...current, ownerName: value }));
                }}
                style={styles.input}
                value={form.ownerName}
              />

              <Text style={styles.label}>Email</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{user?.email ?? 'No email on file'}</Text>
              </View>
              <Text style={styles.helperText}>Managed by your account - it can't be changed here.</Text>

              <Text style={styles.label}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) => {
                  setValidationError('');
                  setForm((current) => ({ ...current, phoneNumber: value }));
                }}
                placeholder="Optional"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.phoneNumber}
              />

              <Pressable hitSlop={8} onPress={handleSave} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.primaryButtonText}>Save Profile</Text>
              </Pressable>
              {validationError.length > 0 && <Text style={styles.validationError}>{validationError}</Text>}
            </View>
          ) : (
            <View style={[styles.card, styles.profileSpacing]}>
              <View style={styles.avatarRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile picture"
                  hitSlop={6}
                  onPress={() => setPhotoModalVisible(true)}
                  style={({ pressed }) => [styles.avatarWrap, pressed && styles.buttonPressed]}
                >
                  <Avatar uri={profile.avatarUri} size={56} radius={16} icon="construct" />
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={10} color={colors.dark} />
                  </View>
                </Pressable>
                <View style={styles.profileTextWrap}>
                  <Text style={styles.profileName}>{name}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: mechanicApproved ? colors.green : colors.gold }]} />
                    <Text style={[styles.statusText, { color: mechanicApproved ? colors.green : colors.gold }]}>
                      {mechanicApproved ? 'Approved mechanic' : 'Waiting for approval'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={17} color={colors.muted} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{name}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={17} color={colors.muted} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{user?.email ?? 'No email on file'}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={17} color={colors.muted} />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.detailLabel}>Phone number</Text>
                  <Text style={styles.detailValue}>{profile.phoneNumber || 'Not added'}</Text>
                </View>
              </View>

              <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" hitSlop={8} onPress={openEditor} style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}>
                <Ionicons name="create-outline" size={17} color={colors.gold} />
                <Text style={styles.editButtonText}>Edit profile</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={19} color={colors.gold} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowText}>Dark mode</Text>
                <Text style={styles.rowSubtitle}>{isDark ? 'On' : 'Off'}</Text>
              </View>
              <Switch
                accessibilityLabel="Toggle dark mode"
                onValueChange={toggleMode}
                value={isDark}
                trackColor={{ false: '#343a40', true: colors.gold }}
                thumbColor={isDark ? colors.dark : colors.muted}
              />
            </View>

            <View style={[styles.row, styles.rowBorder, styles.accentRow]}>
              <Ionicons name="color-palette-outline" size={19} color={colors.gold} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowText}>Accent color</Text>
                <Text style={styles.rowSubtitle}>Changes the highlight color used throughout AutoWise</Text>
              </View>
            </View>
            <View style={styles.swatchRow}>
              {accentOptions.map((option) => {
                const selected = option.key === accentKey;

                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${option.label} accent color`}
                    accessibilityState={{ selected }}
                    hitSlop={6}
                    onPress={() => setAccentKey(option.key)}
                    style={({ pressed }) => [styles.swatchButton, pressed && styles.buttonPressed]}
                  >
                    <View style={[styles.swatch, { backgroundColor: option.value }, selected && styles.swatchSelected]}>
                      {selected && <Ionicons name="checkmark" size={16} color={colors.dark} />}
                    </View>
                    <Text style={styles.swatchLabel}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionGap]}>Account</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.gold} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowText}>Approval</Text>
                <Text style={styles.rowSubtitle}>
                  {mechanicApproved ? 'An administrator approved your account. You can accept requests.' : 'An administrator still needs to approve your account.'}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => signOut().catch((error) => console.error('AutoWise: sign out failed', error))}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>

        <Modal animationType="fade" transparent visible={savedVisible} onRequestClose={() => setSavedVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="checkmark" size={28} color={colors.dark} />
              </View>
              <Text style={styles.modalTitle}>Profile updated</Text>
              <Text style={styles.modalMessage}>Your name and phone number have been saved.</Text>
              <Pressable accessibilityRole="button" onPress={() => setSavedVisible(false)} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <PhotoSourceModal
          visible={photoModalVisible}
          title="Profile picture"
          busy={photoBusy}
          onPick={choosePhoto}
          onRemove={
            profile.avatarUri
              ? () => {
                  updateProfile({ avatarUri: '' });
                  setPhotoModalVisible(false);
                }
              : undefined
          }
          onClose={() => setPhotoModalVisible(false)}
        />

        <BottomNavigation activeRoute="/mechanic/account" />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', marginRight: 8, width: 38 },
    buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    profileCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 22, padding: 14 },
    profileSpacing: { marginBottom: 22 },
    avatarRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 6 },
    detailRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 4, marginTop: 12, paddingTop: 12 },
    detailLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    detailValue: { color: colors.text, fontSize: 14, marginTop: 3 },
    editButton: { alignItems: 'center', borderColor: colors.gold, borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 16, minHeight: 44 },
    editButtonText: { color: colors.gold, fontSize: 13, fontWeight: '800' },
    formHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    formHeaderText: { flex: 1, marginRight: 10 },
    formTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    formSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
    label: { color: colors.softText, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 14 },
    input: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 48, paddingHorizontal: 13 },
    readOnlyField: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 48, opacity: 0.7, paddingHorizontal: 13 },
    readOnlyText: { color: colors.text, fontSize: 14 },
    helperText: { color: colors.muted, fontSize: 11, marginTop: 5 },
    primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, justifyContent: 'center', marginTop: 18, minHeight: 50 },
    primaryButtonText: { color: colors.dark, fontSize: 14, fontWeight: '800' },
    validationError: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 10, textAlign: 'center' },
    modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderColor: withAlpha(colors.gold, 0.26), borderRadius: 22, borderWidth: 1, maxWidth: 380, padding: 24, width: '100%' },
    modalIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.gold, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 14, width: 56 },
    modalTitle: { color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
    modalMessage: { color: colors.softText, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: 'center' },
    avatarWrap: { marginRight: 12 },
    cameraBadge: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 9, bottom: -3, height: 18, justifyContent: 'center', position: 'absolute', right: -3, width: 18 },
    profileTextWrap: { flex: 1 },
    profileName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    statusRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
    statusDot: { borderRadius: 4, height: 8, width: 8 },
    statusText: { fontSize: 12, fontWeight: '700' },
    sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
    sectionGap: { marginTop: 22 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16 },
    row: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
    rowBorder: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
    accentRow: { marginBottom: 4 },
    rowTextWrap: { flex: 1, marginLeft: 12, marginRight: 10 },
    rowText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    rowSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
    swatchButton: { alignItems: 'center', width: 56 },
    swatch: { alignItems: 'center', borderColor: 'transparent', borderRadius: 18, borderWidth: 2, height: 36, justifyContent: 'center', width: 36 },
    swatchSelected: { borderColor: colors.text },
    swatchLabel: { color: colors.muted, fontSize: 10, marginTop: 6, textAlign: 'center' },
    signOutButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.danger, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 22, minHeight: 50 },
    signOutText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  });
}
