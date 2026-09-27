import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (isSignUp && fullName.trim().length === 0) {
      setError('Please enter your full name.');
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length === 0) {
      setError('Please enter your password.');
      return;
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(fullName, email, password);
      } else {
        await signIn(email, password);
      }
      // The route guard in app/_layout.tsx takes over from here and moves to the home screen.
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setError('');
    setIsSignUp((value) => !value);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="car-sport" size={22} color={colors.gold} />
          </View>
          <Text style={styles.brand}>AUTOWISE</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Sign up to keep your vehicle maintenance organized.' : 'Sign in to continue to your garage.'}
          </Text>
          {isSignUp && (
            <>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={(value) => {
                  setError('');
                  setFullName(value);
                }}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                style={styles.input}
                value={fullName}
              />
            </>
          )}
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={(value) => {
              setError('');
              setEmail(value);
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
            style={styles.input}
            value={email}
          />
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            onChangeText={(value) => {
              setError('');
              setPassword(value);
            }}
            onSubmitEditing={handleSubmit}
            placeholder="Enter your password"
            placeholderTextColor={colors.muted}
            returnKeyType="go"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          {error.length > 0 && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {error}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [styles.primaryButton, (pressed || submitting) && styles.pressed]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.background} />
              </>
            )}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={submitting} onPress={toggleMode} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? ' : 'New to AutoWise? '}
              <Text style={styles.switchAction}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 24 },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  brandMark: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderRadius: 12, height: 42, justifyContent: 'center', marginRight: 10, width: 42 },
  brand: { color: colors.gold, fontSize: 21, fontWeight: '900', letterSpacing: 1.4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 18 },
  input: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 48, paddingHorizontal: 13 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 16 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: 24, minHeight: 52, gap: 8 },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  switchButton: { alignItems: 'center', marginTop: 18, padding: 4 },
  switchText: { color: colors.muted, fontSize: 12 },
  switchAction: { color: colors.gold, fontWeight: '800' },
  });
}

