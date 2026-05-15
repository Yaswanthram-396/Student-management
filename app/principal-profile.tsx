import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { principalApi } from "../services/principal";
import { refreshCurrentUser, useAuthStore } from "../store/auth-store";
import type { PrincipalMeResponse } from "../types/auth";

function getInitials(name?: string) {
  if (!name) return "P";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function PrincipalProfileScreen() {
  const { currentUser } = useAuthStore();
  const principal = currentUser as PrincipalMeResponse | null;

  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPicUrl, setLocalPicUrl] = useState<string | null>(null);

  const picUrl = localPicUrl ?? principal?.profile_pic_url ?? null;
  const initials = getInitials(principal?.profile.name);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshCurrentUser();
    setLocalPicUrl(null);
    setRefreshing(false);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library to upload a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const res = await principalApi.uploadProfilePic({
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.fileName,
      });
      setLocalPicUrl(res.profile_pic_url);
      await refreshCurrentUser();
    } catch (err: any) {
      Alert.alert(
        "Upload failed",
        err.details ?? "Could not upload profile picture. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!principal) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.navbar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111111" />
          </Pressable>
          <Text style={styles.navTitle}>Profile</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>Profile not available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.navbar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.navTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.principal}
            colors={[colors.principal]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            {picUrl ? (
              <Image source={{ uri: picUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.cameraBtn, pressed && styles.cameraBtnPressed]}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          <Text style={styles.heroName}>{principal.profile.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Principal</Text>
          </View>
          {!!principal.school.name && (
            <Text style={styles.heroSchool}>{principal.school.name}</Text>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionLabel}>Personal Information</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Full Name" value={principal.profile.name} />
            <Divider />
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={principal.profile.mobile_number || "—"}
            />
          </View>

          {!!principal.school.name && (
            <>
              <Text style={styles.sectionLabel}>School</Text>
              <View style={styles.card}>
                <InfoRow icon="school-outline" label="School Name" value={principal.school.name} />
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <InfoRow icon="at-outline" label="Username" value={principal.username} />
            <Divider />
            <InfoRow icon="shield-checkmark-outline" label="Role" value="Principal" accent />
          </View>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={accent ? colors.principal : "#888888"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, accent && { color: colors.principal }]}>{value}</Text>
      </View>
    </View>
  );
}

const ACCENT = colors.principal;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F4F8" },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  navTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: { backgroundColor: "#F0F0F0" },
  hero: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  avatarWrap: { position: "relative", marginBottom: 16 },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: ACCENT + "30",
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarInitials: { fontSize: 32, fontWeight: "700", color: "#FFFFFF" },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cameraBtnPressed: { opacity: 0.8 },
  heroName: { fontSize: 20, fontWeight: "700", color: "#111111", marginBottom: 6 },
  roleBadge: {
    backgroundColor: "#EDEDFA",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  roleBadgeText: { fontSize: 12, fontWeight: "600", color: ACCENT },
  heroSchool: { fontSize: 13, color: "#888888", marginTop: 4 },
  body: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: "#F5F5F5", marginLeft: 52 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoLabel: { fontSize: 11, color: "#AAAAAA", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#111111" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 14, color: "#AAAAAA" },
});
