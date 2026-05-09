import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { useAuthStore } from "../../store/auth-store";
import {
  loadTeacherSections,
  setSelectedTeacherSection,
  useTeacherStore,
} from "../../store/teacher-store";
import type { TeacherSection } from "../../types/teacher";
import { HeaderBar } from "../shared";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

interface TeacherTopBarProps {
  onSectionChange?: (sectionId: string) => void;
}

export function TeacherTopBar({ onSectionChange }: TeacherTopBarProps) {
  const { currentUser } = useAuthStore();
  const { selectedSection, sections, sectionsLoading, sectionsError } =
    useTeacherStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const teacherName =
    currentUser?.role === "TEACHER" ? currentUser.profile.name : "Teacher";
  const initials = useMemo(() => getInitials(teacherName), [teacherName]);

  const sectionLabel = selectedSection
    ? `${selectedSection.class_name} - Section ${selectedSection.section_name}`
    : "Select your section";

  useEffect(() => {
    if (!sections.length && !sectionsLoading) {
      void loadTeacherSections();
    }
  }, [sections.length, sectionsLoading]);

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuMounted(false);
      }
    });
  }, [menuOpen, dropdownAnim]);

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleSelectSection = useCallback(
    (section: TeacherSection) => {
      setSelectedTeacherSection(section);
      setMenuOpen(false);
      onSectionChange?.(section.id);
    },
    [onSectionChange],
  );

  return (
    <View style={styles.wrap}>
      <HeaderBar
        left={
          <Pressable
            style={styles.avatar}
            onPress={() => Alert.alert("Profile", "Profile screen coming soon.")}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        }
        center={
          <Pressable style={styles.centerBtn} onPress={handleToggleMenu}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sectionLabel}
            </Text>
            <Ionicons
              name={menuOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.textSecondary}
            />
          </Pressable>
        }
        right={
          <Pressable
            style={styles.notificationWrap}
            onPress={() => router.push("/teacher/sections")}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.textMuted}
            />
            <View style={styles.notifDot} />
          </Pressable>
        }
      />

      {menuMounted && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <Animated.View
            style={[
              styles.dropdown,
              {
                opacity: dropdownAnim,
                transform: [
                  {
                    translateY: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                  {
                    scale: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.dropdownTitle}>Switch Class/Section</Text>

            {sectionsLoading ? (
              <Text style={styles.dropdownState}>Loading sections...</Text>
            ) : sectionsError ? (
              <View style={styles.dropdownStateWrap}>
                <Text style={styles.dropdownError}>{sectionsError}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => void loadTeacherSections()}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : !sections.length ? (
              <Text style={styles.dropdownState}>No assigned sections.</Text>
            ) : (
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {sections.map((item) => {
                  const selected = selectedSection?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.item, selected && styles.itemSelected]}
                      onPress={() => handleSelectSection(item)}
                    >
                      <View style={styles.itemTextWrap}>
                        <Text style={styles.itemTitle}>
                          {item.class_name} - Section {item.section_name}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.itemMeta}>
                            {item.student_count} students
                          </Text>
                          {item.is_class_teacher && (
                            <View style={styles.classTeacherPill}>
                              <Text style={styles.classTeacherText}>
                                Class Teacher
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.teacher}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 20,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.teacher,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...(typography.label as object),
    color: colors.surface,
    fontWeight: "700",
  },
  headerTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
  },
  centerBtn: {
    maxWidth: 230,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 1,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  backdrop: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    bottom: -1000,
    zIndex: 29,
  },
  dropdown: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    zIndex: 30,
  },
  dropdownTitle: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownStateWrap: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  dropdownState: {
    ...(typography.body as object),
    color: colors.textSecondary,
    padding: spacing.md,
  },
  dropdownError: {
    ...(typography.body as object),
    color: colors.danger,
  },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.teacher,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryText: {
    ...(typography.caption as object),
    color: colors.surface,
    fontWeight: "600",
  },
  list: {
    maxHeight: 250,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  itemSelected: {
    backgroundColor: "#EFF6FF",
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    ...(typography.body as object),
    color: colors.textPrimary,
    fontWeight: "600",
  },
  itemMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  classTeacherPill: {
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  classTeacherText: {
    ...(typography.caption as object),
    color: colors.success,
    fontWeight: "600",
  },
});
