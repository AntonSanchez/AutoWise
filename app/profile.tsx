import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { useProfile } from '@/components/profile-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';

const phonePattern = /^[0-9+\-()\s]{7,20}$/;
// Firestore documents cap out at 1 MiB; a 240px JPEG at 50% quality lands
// around 15-40 KB, comfortably inside that with room for the rest of the profile.
const AVATAR_MAX_DIMENSION = 240;

export default function ProfileScreen() {
  const goBack = useSafeBack();
  const { signOut, user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const actionInProgress = useRef(false);
  const [form, setForm] = useState({ ownerName: profile.ownerName, phoneNumber: profile.phoneNumber });
  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [profileSavedModalVisible, setProfileSavedModalVisible] = useState(false);
  const [settingsModal, setSettingsModal] = useState<'about' | null>(null);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const email = user?.email ?? 'No email on file';

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);

    try {
      // Shrinks and compresses the picked photo so it can be stored directly on the
      // Firestore profile document - no Firebase Storage (and its billing plan) needed.
      const resized = await manipulateAsync(uri, [{ resize: { width: AVATAR_MAX_DIMENSION } }], {
        compress: 0.5,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (!resized.base64) {
        throw new Error('Image processing returned no data.');
      }

      updateProfile({ avatarUri: `data:image/jpeg;base64,${resized.base64}` });
    } catch (error) {
      console.error('AutoWise: failed to process profile picture', error);
      Alert.alert("Couldn't use that photo", 'Please try a different photo.');
    } finally {
      setUploadingAvatar(false);
      setAvatarModalVisible(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in your device settings to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6 });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access in your device settings to choose a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const openEditor = () => {
    setValidationError('');
    setForm({ ownerName: profile.ownerName, phoneNumber: profile.phoneNumber });
    setEditorVisible(true);
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setValidationError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (actionInProgress.current) {
      return;
    }

    const trimmedName = form.ownerName.trim();
    const trimmedPhone = form.phoneNumber.trim();
    const hasInvalidPhone = trimmedPhone.length > 0 && !phonePattern.test(trimmedPhone);

    if (trimmedName.length === 0) {
      setValidationError('Please enter your name.');
      return;
    }

    if (hasInvalidPhone) {
      setValidationError('Enter a valid phone number.');
      return;
    }

    actionInProgress.current = true;
    setSaving(true);
    updateProfile({ ownerName: trimmedName, phoneNumber: trimmedPhone });
    setSaving(false);
    setEditorVisible(false);
    setProfileSavedModalVisible(true);
    actionInProgress.current = false;
  };

  const handleLogout = () => {
    if (actionInProgress.current) {
      return;
    }

    actionInProgress.current = true;
    setSettingsModal(null);
    signOut().catch((error) => console.error('AutoWise: sign out failed', error));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
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
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {editorVisible ? (
            <View style={styles.card}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formTitle}>Edit profile</Text>
                  <Text style={styles.formSubtitle}>Update the name and phone number on your account.</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close profile editor"
                  hitSlop={8}
                  onPress={() => setEditorVisible(false)}
                  style={({ pressed }) => [styles.closeEditorButton, pressed && styles.buttonPressed]}
                >
                  <Ionicons name="close" size={19} color={colors.softText} />
                </Pressable>
              </View>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.ownerName}
                onChangeText={(value) => handleChange('ownerName', value)}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Email</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyFieldText}>{email}</Text>
              </View>
              <Text style={styles.helperText}>Managed by your account - it can't be changed here.</Text>

              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={form.phoneNumber}
                onChangeText={(value) => handleChange('phoneNumber', value)}
                keyboardType="phone-pad"
                placeholder="Optional"
                placeholderTextColor={colors.muted}
              />

              <Pressable
                hitSlop={8}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                onPress={handleSave}
              >
                {saving ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
              </Pressable>
              {validationError && <Text style={styles.validationError}>{validationError}</Text>}
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.avatarRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile picture"
                  hitSlop={6}
                  onPress={() => setAvatarModalVisible(true)}
                  style={({ pressed }) => [styles.avatarPressable, pressed && styles.primaryButtonPressed]}
                >
                  <View style={styles.avatar}>
                    {profile.avatarUri ? (
                      <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                      <Ionicons name="person" size={26} color={colors.gold} />
                    )}
                  </View>
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={12} color={colors.dark} />
                  </View>
                </Pressable>
                <View style={styles.avatarTextWrap}>
                  <Text style={styles.avatarName}>{profile.ownerName}</Text>
                  <Text style={styles.avatarMeta}>AutoWise account</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={17} color={colors.muted} />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{profile.ownerName}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={17} color={colors.muted} />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{email}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={17} color={colors.muted} />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Phone number</Text>
                  <Text style={styles.detailValue}>{profile.phoneNumber || 'Not added'}</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={openEditor}
                style={({ pressed }) => [styles.editButton, pressed && styles.primaryButtonPressed]}
              >
                <Ionicons name="create-outline" size={16} color={colors.dark} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.settingsList}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: remindersEnabled }}
              onPress={() => setRemindersEnabled((enabled) => !enabled)}
              style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="settings-outline" size={19} color={colors.gold} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.settingsRowText}>Reminders</Text>
                <Text style={styles.rowSubtitle}>Maintenance reminders {remindersEnabled ? 'on' : 'off'}</Text>
              </View>
              <Switch
                accessibilityLabel="Toggle maintenance reminders"
                onValueChange={setRemindersEnabled}
                value={remindersEnabled}
                pointerEvents="none"
                trackColor={{ false: '#343a40', true: withAlpha(colors.gold, 0.45) }}
                thumbColor={remindersEnabled ? colors.gold : colors.muted}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSettingsModal('about')}
              style={({ pressed }) => [styles.settingsRow, styles.settingsRowBorder, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="information-circle-outline" size={19} color={colors.gold} />
              <Text style={styles.settingsRowText}>About</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              style={({ pressed }) => [styles.settingsRow, styles.settingsRowBorder, pressed && styles.settingsRowPressed]}
            >
              <Ionicons name="log-out-outline" size={19} color={colors.danger} />
              <Text style={styles.logoutText}>Log out</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
          </View>

        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={avatarModalVisible}
          onRequestClose={() => (uploadingAvatar ? null : setAvatarModalVisible(false))}
        >
          <View style={styles.settingsModalBackdrop}>
            <View style={styles.settingsModal}>
              <View style={styles.settingsModalIcon}>
                <Ionicons name="camera-outline" size={25} color={colors.gold} />
              </View>
              <Text style={styles.settingsModalTitle}>Profile picture</Text>
              <Text style={styles.settingsModalMessage}>Take a new photo or choose one from your library.</Text>

              {uploadingAvatar ? (
                <ActivityIndicator color={colors.gold} style={styles.avatarModalSpinner} />
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={takePhoto}
                    style={({ pressed }) => [styles.avatarModalOption, pressed && styles.buttonPressed]}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.text} />
                    <Text style={styles.avatarModalOptionText}>Take Photo</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={pickFromLibrary}
                    style={({ pressed }) => [styles.avatarModalOption, pressed && styles.buttonPressed]}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.text} />
                    <Text style={styles.avatarModalOptionText}>Choose from Library</Text>
                  </Pressable>
                </>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={uploadingAvatar}
                onPress={() => setAvatarModalVisible(false)}
                style={({ pressed }) => [styles.settingsCancelButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.settingsCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={settingsModal !== null}
          onRequestClose={() => setSettingsModal(null)}
        >
          <View style={styles.settingsModalBackdrop}>
            <View style={styles.settingsModal}>
              <View style={styles.settingsModalIcon}>
                <Ionicons name="information-circle-outline" size={25} color={colors.gold} />
              </View>
              <Text style={styles.settingsModalTitle}>About AutoWise</Text>
              <Text style={styles.settingsModalMessage}>
                AutoWise helps you track vehicle maintenance and plan upcoming service.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSettingsModal(null)}
                style={({ pressed }) => [styles.settingsCancelButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.settingsCancelText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={profileSavedModalVisible}
          onRequestClose={() => setProfileSavedModalVisible(false)}
        >
          <View style={styles.settingsModalBackdrop}>
            <View style={styles.settingsModal}>
              <View style={styles.successModalIcon}>
                <Ionicons name="checkmark" size={28} color={colors.dark} />
              </View>
              <Text style={styles.settingsModalTitle}>Profile updated</Text>
              <Text style={styles.settingsModalMessage}>
                Your name and phone number have been saved.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProfileSavedModalVisible(false)}
                style={({ pressed }) => [styles.successModalButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.successModalButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
    },
    backButton: {
      alignItems: 'center',
      borderRadius: 20,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    buttonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginLeft: 10,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 18,
      paddingBottom: 28,
      paddingTop: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    avatarRow: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 16,
    },
    avatarPressable: {
      marginRight: 14,
      position: 'relative',
    },
    avatarImage: {
      borderRadius: 28,
      height: 56,
      width: 56,
    },
    avatarEditBadge: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderColor: colors.card,
      borderRadius: 11,
      borderWidth: 2,
      bottom: -2,
      height: 22,
      justifyContent: 'center',
      position: 'absolute',
      right: -2,
      width: 22,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: withAlpha(colors.gold, 0.14),
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    avatarTextWrap: { flex: 1 },
    avatarName: { color: colors.text, fontSize: 17, fontWeight: '800' },
    avatarMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    detailRow: {
      alignItems: 'center',
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      paddingVertical: 12,
    },
    detailTextWrap: { flex: 1, marginLeft: 12 },
    detailLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    detailValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 3 },
    editButton: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
      marginTop: 18,
      minHeight: 48,
    },
    editButtonText: { color: colors.dark, fontSize: 14, fontWeight: '800' },
    formHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    formTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    formSubtitle: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
      maxWidth: 255,
    },
    closeEditorButton: {
      alignItems: 'center',
      borderRadius: 18,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
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
    readOnlyField: {
      backgroundColor: colors.cardAlt,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 46,
      paddingHorizontal: 12,
    },
    readOnlyFieldText: { color: colors.muted, fontSize: 14 },
    helperText: { color: colors.muted, fontSize: 10, marginTop: 6 },
    settingsList: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 16,
      overflow: 'hidden',
    },
    settingsRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 58,
      paddingHorizontal: 14,
    },
    settingsRowBorder: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
    },
    settingsRowPressed: {
      backgroundColor: colors.cardAlt,
    },
    settingsRowText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 11,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowSubtitle: {
      color: colors.muted,
      fontSize: 10,
      marginLeft: 11,
      marginTop: 2,
    },
    logoutText: {
      color: colors.danger,
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 11,
    },
    settingsModalBackdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.72)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    settingsModal: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: withAlpha(colors.gold, 0.26),
      borderRadius: 22,
      borderWidth: 1,
      maxWidth: 420,
      padding: 24,
      width: '100%',
    },
    settingsModalIcon: {
      alignItems: 'center',
      backgroundColor: withAlpha(colors.gold, 0.14),
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      marginBottom: 16,
      width: 56,
    },
    successModalIcon: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      marginBottom: 16,
      width: 56,
    },
    settingsModalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
    settingsModalMessage: {
      color: colors.softText,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 10,
      textAlign: 'center',
    },
    avatarModalOption: {
      alignItems: 'center',
      backgroundColor: colors.cardAlt,
      borderRadius: 11,
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      minHeight: 48,
      paddingHorizontal: 14,
      width: '100%',
    },
    avatarModalOptionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    avatarModalSpinner: {
      marginTop: 18,
    },
    settingsCancelButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 11,
      borderWidth: 1,
      marginTop: 22,
      minHeight: 46,
      justifyContent: 'center',
      width: '100%',
    },
    settingsCancelText: {
      color: colors.softText,
      fontSize: 13,
      fontWeight: '700',
    },
    successModalButton: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderRadius: 11,
      justifyContent: 'center',
      marginTop: 22,
      minHeight: 46,
      width: '100%',
    },
    successModalButtonText: {
      color: colors.dark,
      fontSize: 13,
      fontWeight: '800',
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderRadius: 12,
      justifyContent: 'center',
      marginTop: 18,
      minHeight: 52,
    },
    primaryButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.99 }],
    },
    primaryButtonText: {
      color: colors.dark,
      fontSize: 15,
      fontWeight: '800',
    },
    validationError: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 10,
      textAlign: 'center',
    },
  });
}
