import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { signOut } from "../../store/auth-store";
import {
  loadTeacherSections,
  setSelectedTeacherSection,
  useTeacherStore,
} from "../../store/teacher-store";
import type { TeacherSection } from "../../types/teacher";
import { LoadingScreen } from "../shared";

function SectionCard({
  section,
  onPress,
}: {
  section: TeacherSection;
  onPress: (section: TeacherSection) => void;
}) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(section)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{section.class_name}</Text>
          <Text style={styles.cardSubtitle}>
            Section {section.section_name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Ionicons name="people-outline" size={14} color={colors.teacher} />
          <Text style={styles.metaBadgeText}>
            {section.student_count} students
          </Text>
        </View>

        <View
          style={[
            styles.metaBadge,
            section.is_class_teacher
              ? styles.badgeClassTeacher
              : styles.badgeAssignedTeacher,
          ]}
        >
          <Ionicons
            name={
              section.is_class_teacher ? "ribbon-outline" : "school-outline"
            }
            size={14}
            color={
              section.is_class_teacher ? colors.success : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.metaBadgeText,
              section.is_class_teacher
                ? styles.badgeClassTeacherText
                : styles.badgeAssignedTeacherText,
            ]}
          >
            {section.is_class_teacher ? "Class Teacher" : "Assigned Section"}
          </Text>
        </View>
      </View>
      {/* 
      <View style={styles.apiDetails}>
        <Text style={styles.apiLabel}>Section UUID</Text>
        <Text style={styles.apiValue}>{section.id}</Text>
      </View> */}
    </Pressable>
  );
}

export function TeacherSectionsScreen() {
  const { sections, sectionsLoading, sectionsError } = useTeacherStore();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadSections = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    await loadTeacherSections();
    if (isRefresh) setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const handleCardPress = useCallback((section: TeacherSection) => {
    setSelectedTeacherSection(section);
    router.replace("/(tabs)/teacher");
  }, []);

  const handleLogout = useCallback(() => {
    if (signingOut) return;

    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace("/");
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [signingOut]);

  if (sectionsLoading && !sections.length) {
    return <LoadingScreen label="Loading your assigned sections..." />;
  }

  if (sectionsError && !sections.length) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.stateWrap}>
          <View style={styles.stateIconDanger}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={colors.danger}
            />
          </View>
          <Text style={styles.stateTitle}>Unable to load sections</Text>
          <Text style={styles.stateBody}>{sectionsError}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => void loadSections()}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!sections.length) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.stateWrap}>
          <View style={styles.stateIconWarn}>
            <Ionicons name="school-outline" size={30} color={colors.warning} />
          </View>
          <Text style={styles.stateTitle}>No assigned sections yet</Text>
          <Text style={styles.stateBody}>
            You do not have any active section assignments. Please contact your
            school admin.
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => void loadSections()}
          >
            <Text style={styles.retryBtnText}>Refresh</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSections(true)}
            tintColor={colors.teacher}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>Your Teaching Sections</Text>
              <Pressable
                style={[
                  styles.logoutBtn,
                  signingOut && styles.logoutBtnDisabled,
                ]}
                onPress={handleLogout}
                disabled={signingOut}
              >
                <Ionicons
                  name="log-out-outline"
                  size={15}
                  color={colors.danger}
                />
                <Text style={styles.logoutText}>
                  {signingOut ? "Logging out..." : "Logout"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.headerBody}>
              Choose a section to continue. Access is restricted to sections
              assigned to your profile or where you are class teacher.
            </Text>
            {/* <View style={styles.infoList}>
              {endpointInfo.map((line) => (
                <View key={line} style={styles.infoRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color={colors.teacher}
                  />
                  <Text style={styles.infoText}>{line}</Text>
                </View>
              ))}
            </View> */}
            <Text style={styles.countLabel}>
              {sections.length} section{sections.length === 1 ? "" : "s"} found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SectionCard section={item} onPress={handleCardPress} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerTitle: {
    ...(typography.h2 as object),
    color: colors.textPrimary,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 0.5,
    borderColor: "#F4C9C9",
    backgroundColor: colors.dangerBg,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  logoutBtnDisabled: {
    opacity: 0.65,
  },
  logoutText: {
    ...(typography.caption as object),
    color: colors.danger,
    fontWeight: "600",
  },
  headerBody: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    flex: 1,
  },
  countLabel: {
    ...(typography.label as object),
    color: colors.teacher,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },
  cardSubtitle: {
    ...(typography.body as object),
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#F3F6FA",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  metaBadgeText: {
    ...(typography.caption as object),
    color: colors.teacher,
    fontWeight: "500",
  },
  badgeClassTeacher: {
    backgroundColor: colors.successBg,
    borderColor: "#CBEBD9",
  },
  badgeAssignedTeacher: {
    backgroundColor: "#F3F6FA",
  },
  badgeClassTeacherText: {
    color: "#0F6E56",
  },
  badgeAssignedTeacherText: {
    color: colors.textSecondary,
  },
  apiDetails: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: 2,
  },
  apiLabel: {
    ...(typography.caption as object),
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  apiValue: {
    ...(typography.caption as object),
    color: colors.textSecondary,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  stateIconDanger: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerBg,
  },
  stateIconWarn: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warningBg,
  },
  stateTitle: {
    ...(typography.h2 as object),
    color: colors.textPrimary,
    textAlign: "center",
  },
  stateBody: {
    ...(typography.body as object),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  retryBtn: {
    marginTop: spacing.sm,
    height: 46,
    minWidth: 150,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.teacher,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: {
    ...(typography.h3 as object),
    color: colors.surface,
    fontWeight: "600",
  },
});
