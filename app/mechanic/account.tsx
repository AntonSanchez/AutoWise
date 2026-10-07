import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { BottomNavigation } from '@/components/bottom-navigation';
import { PhotoSourceModal } from '@/components/photo-source-modal';
import { useProfile } from '@/components/profile-provider';
import { useAppTheme, useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';
import { AVATAR_PHOTO, pickPhoto, type PhotoSource } from '@/lib/photo';

// A mechanic's account page: who they're signed in as, whether they're approved, appearance, sign out.
export default function MechanicAccountScreen() {
  const goBack = useSafeBack();
  const { user, mechanicApproved, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { isDark, toggleMode } = useAppTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.title}>Mechanic account</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.profileRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change profile picture"
                onPress={() => setPhotoModalVisible(true)}
                style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
              >
                <Avatar uri={profile.avatarUri} size={56} radius={16} icon="construct" />
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={11} color={colors.dark} />
                </View>
              </Pressable>
              <View style={styles.profileText}>
                <Text style={styles.name}>{user?.displayName || 'Mechanic'}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: mechanicApproved ? colors.green : colors.gold }]} />
                  <Text style={[styles.statusText, { color: mechanicApproved ? colors.green : colors.gold }]}>
                    {mechanicApproved ? 'Approved' : 'Waiting for approval'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={19} color={colors.gold} />
              <View style={styles.switchText}>
                <Text style={styles.switchTitle}>Dark mode</Text>
                <Text style={styles.switchSubtitle}>{isDark ? 'On' : 'Off'}</Text>
              </View>
              <Switch
                accessibilityLabel="Toggle dark mode"
                onValueChange={toggleMode}
                value={isDark}
                trackColor={{ false: '#343a40', true: colors.gold }}
                thumbColor={isDark ? colors.dark : colors.muted}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => signOut().catch((error) => console.error('AutoWise: sign out failed', error))}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>

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
    content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 },
    titleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 18 },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', marginRight: 8, width: 38 },
    pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    title: { color: colors.text, fontSize: 18, fontWeight: '800' },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 14, padding: 16 },
    profileRow: { alignItems: 'center', flexDirection: 'row' },
    cameraBadge: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, bottom: -4, height: 20, justifyContent: 'center', position: 'absolute', right: -4, width: 20 },
    avatar: { marginRight: 12 },
    profileText: { flex: 1 },
    name: { color: colors.text, fontSize: 17, fontWeight: '800' },
    statusRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
    statusDot: { borderRadius: 4, height: 8, width: 8 },
    statusText: { fontSize: 12, fontWeight: '800' },
    infoRow: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
    infoLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    infoValue: { color: colors.text, fontSize: 14, marginTop: 4 },
    switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    switchText: { flex: 1 },
    switchTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    switchSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
    signOutButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.danger, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 6, minHeight: 50 },
    signOutText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  });
}
