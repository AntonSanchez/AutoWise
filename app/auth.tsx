import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { usePendingUsers } from '@/components/pending-users-provider';

const colors = {
  background: '#171a1d',
  card: '#1d2227',
  border: 'rgba(255,255,255,0.09)',
  gold: '#f2bc39',
  muted: '#8d8a86',
  text: '#f5f4f2',
  danger: '#ff7a6b',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const pendingUsers = usePendingUsers();
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
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

    if (isSignUp) {
      // Check if email already exists
      const existing = pendingUsers.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (existing) {
        setError('An account with this email already exists.');
        return;
      }
      // Add to pending list — admin will approve
      pendingUsers.addUser(fullName.trim(), email.trim().toLowerCase(), password);
      setSubmitted(true);
      return;
    }

    // Sign in flow — check approval status
    if (pendingUsers.isPending(email.trim())) {
      setError('Your account is still waiting for admin approval.');
      return;
    }
    if (pendingUsers.isRejected(email.trim())) {
      setError('Your account has been rejected by the admin.');
      return;
    }
    if (pendingUsers.isApproved(email.trim())) {
      const user = pendingUsers.findUser(email.trim(), password);
      if (!user) {
        setError('Incorrect password.');
        return;
      }
      signIn();
      return;
    }

    // User not found in the system at all — for demo, just sign in
    signIn();
  };

  const toggleMode = () => {
    setError('');
    setSubmitted(false);
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
          <Text style={styles.title}>{submitted ? 'Request submitted' : isSignUp ? 'Create your account' : 'Welcome'}</Text>
          <Text style={styles.subtitle}>
            {submitted ? 'Your account is pending admin approval. You can sign in after it is approved.' : isSignUp ? 'Sign up to keep your vehicle maintenance organized.' : 'Sign in to continue to your garage.'}
          </Text>
          {!submitted && <>
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
          <View style={styles.passwordContainer}>
            <TextInput
              onChangeText={(value) => {
                setError('');
                setPassword(value);
              }}
              onSubmitEditing={handleSubmit}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              returnKeyType="go"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </Pressable>
          </View>

          {error.length > 0 && (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {error}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={toggleMode} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? ' : 'New to AutoWise? '}
              <Text style={styles.switchAction}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </Text>
          </Pressable>
          {!isSignUp && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/admin')} style={styles.adminLink}>
              <Text style={styles.adminLinkText}>Admin login</Text>
            </Pressable>
          )}
          </>}
          {submitted && <Pressable accessibilityRole="button" onPress={() => { setSubmitted(false); setIsSignUp(false); }} style={styles.switchButton}>
            <Text style={styles.switchAction}>Back to sign in</Text>
          </Pressable>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 24 },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  brandMark: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 12, height: 42, justifyContent: 'center', marginRight: 10, width: 42 },
  brand: { color: colors.gold, fontSize: 21, fontWeight: '900', letterSpacing: 1.4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 18 },
  input: { backgroundColor: '#171a1d', borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 48, paddingHorizontal: 13 },
  passwordContainer: { position: 'relative' as const },
  passwordInput: { paddingRight: 48 },
  eyeButton: { alignItems: 'center' as const, bottom: 0, justifyContent: 'center' as const, position: 'absolute' as const, right: 0, top: 0, width: 48 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 16 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: 24, minHeight: 52, gap: 8 },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  switchButton: { alignItems: 'center', marginTop: 18, padding: 4 },
  switchText: { color: colors.muted, fontSize: 12 },
  switchAction: { color: colors.gold, fontWeight: '800' },
  adminLink: { alignItems: 'center', marginTop: 13, padding: 4 },
  adminLinkText: { color: colors.muted, fontSize: 12, textDecorationLine: 'underline' },
});
