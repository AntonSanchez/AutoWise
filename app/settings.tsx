import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useProfile } from '@/components/profile-provider';
import { accentOptions, useAppTheme, useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack, useSafeNavigation } from '@/hooks/use-safe-navigation';

export default function SettingsScreen() {
  const goBack = useSafeBack();
  const navigate = useSafeNavigation(false);
  const { profile } = useProfile();
  const { isDark, toggleMode, accentKey, setAccentKey } = useAppTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open vehicle profile"
            onPress={() => navigate('/profile')}
            style={({ pressed }) => [styles.profileCard, pressed && styles.buttonPressed]}
          >
            <View style={styles.profileIconWrap}>
              <Ionicons name="person" size={20} color={colors.gold} />
            </View>
            <View style={styles.profileTextWrap}>
              <Text style={styles.profileName}>{profile.ownerName}</Text>
              <Text style={styles.profileMeta}>View profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>

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
        </ScrollView>

        <BottomNavigation activeRoute="/settings" />
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
    profileCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 22,
      padding: 14,
    },
    profileIconWrap: {
      alignItems: 'center',
      backgroundColor: withAlpha(colors.gold, 0.12),
      borderRadius: 12,
      height: 40,
      justifyContent: 'center',
      marginRight: 12,
      width: 40,
    },
    profileTextWrap: { flex: 1 },
    profileName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    profileMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
    sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 16 },
    row: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
    rowBorder: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
    accentRow: { marginBottom: 4 },
    rowTextWrap: { flex: 1, marginLeft: 12, marginRight: 10 },
    rowText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    rowSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
    swatchButton: { alignItems: 'center', width: 56 },
    swatch: {
      alignItems: 'center',
      borderColor: 'transparent',
      borderRadius: 18,
      borderWidth: 2,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    swatchSelected: { borderColor: colors.text },
    swatchLabel: { color: colors.muted, fontSize: 10, marginTop: 6, textAlign: 'center' },
  });
}
