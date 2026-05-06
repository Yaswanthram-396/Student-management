import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Demo credentials — each maps to a role dashboard
const DEMO_ACCOUNTS: Record<string, { role: string; route: string; color: string }> = {
  '9000000001': { role: 'Principal', route: '/(tabs)/principal/', color: '#534AB7' },
  '9000000002': { role: 'Teacher',   route: '/(tabs)/teacher/',   color: '#185FA5' },
  '9000000003': { role: 'Parent',    route: '/(tabs)/parent/',    color: '#1D9E75' },
};
const DEMO_PASSWORD = '123456';

export default function LoginScreen() {
  const [phone, setPhone]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  function handleLogin() {
    setError('');
    if (phone.length < 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }

    const account = DEMO_ACCOUNTS[phone];
    if (!account || password !== DEMO_PASSWORD) {
      setError('Invalid phone number or password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace(account.route as any);
    }, 600);
  }

  function fillDemo(phone: string) {
    setPhone(phone);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>SchoolApp</Text>
            <Text style={styles.appTagline}>Connecting schools, teachers & parents</Text>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {/* Phone */}
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#AAAAAA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={t => { setPhone(t.replace(/\D/g, '')); setError(''); }}
                placeholder="Enter your phone number"
                placeholderTextColor="#AAAAAA"
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#AAAAAA" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputPassword]}
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                placeholder="Enter your password"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#AAAAAA"
                />
              </Pressable>
            </View>

            {/* Error */}
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login button */}
            <Pressable
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </Pressable>
          </View>

          {/* Demo accounts */}
          <View style={styles.demoSection}>
            <Text style={styles.demoHeading}>Demo Accounts</Text>
            <Text style={styles.demoNote}>Password for all accounts: 123456</Text>
            {Object.entries(DEMO_ACCOUNTS).map(([ph, { role, color }]) => (
              <Pressable
                key={ph}
                style={styles.demoRow}
                onPress={() => fillDemo(ph)}
              >
                <View style={[styles.roleDot, { backgroundColor: color }]} />
                <View style={styles.demoInfo}>
                  <Text style={styles.demoRole}>{role}</Text>
                  <Text style={styles.demoPhone}>{ph}</Text>
                </View>
                <Text style={[styles.demoFill, { color }]}>Use</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F4F8' },
  flex:     { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },

  // Branding
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#534AB7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#534AB7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  appName: {
    fontSize: 26, fontWeight: '700',
    color: '#111111', letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13, color: '#888888',
    marginTop: 4, textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle:    { fontSize: 20, fontWeight: '600', color: '#111111', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#888888', marginBottom: 24 },

  // Fields
  fieldLabel: {
    fontSize: 12, fontWeight: '500',
    color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'transparent',
  },
  inputIcon:     { marginRight: 10 },
  input:         { flex: 1, height: 48, fontSize: 15, color: '#111111' },
  inputPassword: { paddingRight: 8 },
  eyeBtn:        { padding: 4 },

  // Error
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 14, marginTop: -4,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  // Login button
  loginBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#534AB7',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#534AB7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnLoading: { backgroundColor: '#1D9E75' },
  loginBtnText:    { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // Demo section
  demoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: '#EEEEEE',
  },
  demoHeading: {
    fontSize: 11, fontWeight: '600', color: '#AAAAAA',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  demoNote: { fontSize: 12, color: '#BBBBBB', marginBottom: 14 },
  demoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: '#F0F0F0',
  },
  roleDot:  { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  demoInfo: { flex: 1 },
  demoRole: { fontSize: 14, fontWeight: '500', color: '#111111' },
  demoPhone:{ fontSize: 12, color: '#AAAAAA', marginTop: 1 },
  demoFill: { fontSize: 13, fontWeight: '600' },
});
