import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';

export default function LoadingScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Ionicons name="car-sport" size={44} color={colors.gold} />
        </View>
        <Text style={styles.brand}>AUTOWISE</Text>
        <Text style={styles.tagline}>Your vehicle, always one step ahead.</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/auth')}
          style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
        >
          <Text style={styles.continueText}>Continue to AutoWise</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.background} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 28 },
  brandMark: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderColor: withAlpha(colors.gold, 0.28), borderRadius: 28, borderWidth: 1, height: 92, justifyContent: 'center', width: 92 },
  brand: { color: colors.gold, fontSize: 28, fontWeight: '900', letterSpacing: 2, marginTop: 22 },
  tagline: { color: colors.muted, fontSize: 14, marginTop: 8, textAlign: 'center' },
  continueButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 13, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 46, minHeight: 52, paddingHorizontal: 20 },
  continueButtonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  continueText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  });
}

