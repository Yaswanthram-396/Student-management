import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { PARENT_PROFILE, type Student } from "../../../constants/parentData";
import { spacing } from "../../../constants/spacing";
import { typography } from "../../../constants/typography";
import { authApi } from "../../../../services/auth";
import { BottomSheet, HeaderBar } from "../../shared";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function StudentCard({ item }: { item: Student }) {
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentTop}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentMeta}>
            {item.academic_class.name} · Section {item.section.name}
          </Text>
          <Text style={styles.studentMeta}>Roll No. {item.roll_number}</Text>
        </View>
      </View>

      <View style={styles.studentDivider} />

      <View
        style={[
          styles.queryPill,
          item.is_parent_query_disabled
            ? styles.queryPillDisabled
            : styles.queryPillEnabled,
        ]}
      >
        <Text
          style={[
            styles.queryPillText,
            item.is_parent_query_disabled
              ? styles.queryPillTextDisabled
              : styles.queryPillTextEnabled,
          ]}
        >
          {item.is_parent_query_disabled
            ? "Queries Disabled"
            : "Queries Enabled"}
        </Text>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const parentInitials = useMemo(() => getInitials(PARENT_PROFILE.name), []);

  async function handleLogout() {
    if (loggingOut) return;
    setShowLogoutModal(false);
    setLogoutMessage("");
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      setLogoutMessage("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar center={<Text style={styles.headerTitle}>Profile</Text>} />

      <FlatList
        data={PARENT_PROFILE.students}
        keyExtractor={(student) => student.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => <StudentCard item={item} />}
        ListHeaderComponent={
          <View>
            <View style={styles.parentCard}>
              <View style={styles.parentTopRow}>
                <View style={styles.parentAvatar}>
                  <Text style={styles.parentAvatarText}>{parentInitials}</Text>
                </View>
                <View style={styles.parentInfo}>
                  <Text style={styles.parentName}>{PARENT_PROFILE.name}</Text>
                  <View style={styles.phoneRow}>
                    <Ionicons
                      name="call-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.parentPhone}>
                      {PARENT_PROFILE.phone_number}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.parentDivider} />

              <Text style={styles.schoolLabel}>SCHOOL</Text>
              <View style={styles.schoolRow}>
                <Ionicons
                  name="school-outline"
                  size={16}
                  color={colors.parent}
                />
                <Text style={styles.schoolName}>
                  {PARENT_PROFILE.school.name}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>LINKED STUDENTS</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.accountSection}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>

            <View style={styles.accountCard}>
              <Pressable
                style={styles.accountRow}
                onPress={() => setShowPinSheet(true)}
              >
                <View style={styles.accountRowLeft}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.accountRowText}>Change PIN</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>

              <View style={styles.accountDivider} />

              <View style={styles.accountRow}>
                <View style={styles.accountRowLeft}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.accountRowText}>App Version</Text>
                </View>
                <Text style={styles.appVersion}>1.0.0</Text>
              </View>
            </View>

            <Pressable
              style={styles.logoutBtn}
              onPress={() => setShowLogoutModal(true)}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color={colors.danger}
              />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </Pressable>

            {!!logoutMessage && (
              <Text style={styles.logoutMessage}>{logoutMessage}</Text>
            )}
          </View>
        }
      />

      <BottomSheet
        visible={showPinSheet}
        onClose={() => setShowPinSheet(false)}
      >
        <Text style={styles.sheetTitle}>Change PIN</Text>
        <Text style={styles.sheetBody}>
          This feature will be available soon.
        </Text>
        <Pressable
          style={styles.sheetCloseBtn}
          onPress={() => setShowPinSheet(false)}
        >
          <Text style={styles.sheetCloseBtnText}>Close</Text>
        </Pressable>
      </BottomSheet>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtonsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalLogoutBtn}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Text style={styles.modalLogoutText}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  parentCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  parentTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  parentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  parentAvatarText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.surface,
  },
  parentInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  parentName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  parentPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  parentDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  schoolLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  schoolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  studentTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.principal,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  studentInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  studentMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  studentDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  queryPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  queryPillEnabled: {
    backgroundColor: "#E1F5EE",
  },
  queryPillDisabled: {
    backgroundColor: "#FEE2E2",
  },
  queryPillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  queryPillTextEnabled: {
    color: "#0F6E56",
  },
  queryPillTextDisabled: {
    color: "#991B1B",
  },
  accountSection: {
    marginTop: spacing.lg,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  accountRow: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  accountRowText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  appVersion: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  accountDivider: {
    height: 0.5,
    backgroundColor: colors.border,
  },
  logoutBtn: {
    marginTop: spacing.lg,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.danger,
  },
  logoutMessage: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  sheetTitle: {
    ...(typography.h2 as object),
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sheetBody: {
    ...(typography.body as object),
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sheetCloseBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseBtnText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.lg,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalBody: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  modalLogoutBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLogoutText: {
    fontSize: 14,
    color: colors.surface,
    fontWeight: "500",
  },
});
