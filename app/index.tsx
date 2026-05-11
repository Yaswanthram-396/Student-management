import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingScreen } from "../components/shared";
import { authApi } from "../services/auth";
import { signInWithTokens, useAuthStore } from "../store/auth-store";
import type { UserRole } from "../types/auth";

const ROLE_ROUTES: Partial<Record<UserRole, string>> = {
  PRINCIPAL: "/(tabs)/principal/",
  TEACHER: "/teacher-sections",
  PARENT: "/(tabs)/parent/",
};

export default function LoginScreen() {
  const { bootstrapped, currentUser, loadingMe } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bootstrapped || !currentUser) return;
    const route = ROLE_ROUTES[currentUser.role];
    if (route) {
      router.replace(route as any);
    }
  }, [bootstrapped, currentUser]);

  if (!bootstrapped || loadingMe) {
    return <LoadingScreen label="Checking your session..." />;
  }

  async function handleLogin() {
    setError("");
    if (phone.length < 10) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    if (!password) {
      setError("Password cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login(phone, password);
      const currentUser = await signInWithTokens(data.access, data.refresh);
      const role = currentUser?.role ?? data.user.role;
      const route = ROLE_ROUTES[role];
      if (route) {
        router.replace(route as any);
      } else {
        setError("Unknown role. Please contact your school administrator.");
      }
    } catch (err: any) {
      setError(err.details ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>SchoolApp</Text>
            <Text style={styles.appTagline}>
              Connecting schools, teachers & parents
            </Text>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {/* Phone */}
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={18}
                color="#AAAAAA"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/\D/g, ""));
                  setError("");
                }}
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
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#AAAAAA"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputPassword]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError("");
                }}
                placeholder="Enter your password"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#AAAAAA"
                />
              </Pressable>
            </View>

            {/* Error */}
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color="#DC2626"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login button */}
            <Pressable
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>
          </View>

          {/* Info section */}
          <View style={styles.infoSection}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#AAAAAA"
            />
            <Text style={styles.infoText}>
              Use the phone number and password provided by your school
              administrator to sign in.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F4F8" },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "center",
  },

  // Branding
  brandSection: { alignItems: "center", marginBottom: 36 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#534AB7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#534AB7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: "#888888",
    marginTop: 4,
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 13, color: "#888888", marginBottom: 24 },

  // Fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 15, color: "#111111" },
  inputPassword: { paddingRight: 8 },
  eyeBtn: { padding: 4 },

  // Error
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    marginTop: -4,
  },
  errorText: { fontSize: 13, color: "#DC2626", flex: 1 },

  // Login button
  loginBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#534AB7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#534AB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnLoading: { backgroundColor: "#1D9E75" },
  loginBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },

  // Info
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: { flex: 1, fontSize: 12, color: "#AAAAAA", lineHeight: 18 },
});
