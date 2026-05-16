import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { principalApi } from "../../services/principal";
import type {
  AcademicClassResponse,
  SectionResponse,
  SubjectResponse,
  TeacherResponse,
} from "../../types/principal";
import { HeaderBar, LoadingScreen } from "../shared";

type AssignmentStep = "teachers" | "subjects" | "sections";

type SectionGroup = {
  title: string;
  classId: string;
  data: SectionResponse[];
};

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS: { key: AssignmentStep; label: string }[] = [
  { key: "teachers", label: "Teacher"  },
  { key: "subjects", label: "Subject"  },
  { key: "sections", label: "Sections" },
];

function StepIndicator({ current }: { current: AssignmentStep }) {
  const activeIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <View style={siStyles.row}>
      {STEPS.map((s, i) => {
        const done    = i < activeIdx;
        const active  = i === activeIdx;
        return (
          <React.Fragment key={s.key}>
            <View style={siStyles.item}>
              <View style={[siStyles.circle, done && siStyles.circleDone, active && siStyles.circleActive]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={[siStyles.num, active && siStyles.numActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[siStyles.label, active && siStyles.labelActive, done && siStyles.labelDone]}>
                {s.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[siStyles.line, done && siStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const siStyles = StyleSheet.create({
  row:         { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  item:        { alignItems: "center", gap: 4 },
  line:        { flex: 1, height: 1.5, backgroundColor: colors.border, marginBottom: 18 },
  lineDone:    { backgroundColor: colors.principal },
  circle:      { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  circleActive:{ borderColor: colors.principal },
  circleDone:  { borderColor: colors.principal, backgroundColor: colors.principal },
  num:         { ...(typography.caption as object), fontWeight: "700", color: colors.textMuted },
  numActive:   { color: colors.principal },
  label:       { ...(typography.caption as object), color: colors.textMuted, fontWeight: "500" },
  labelActive: { color: colors.principal, fontWeight: "700" },
  labelDone:   { color: colors.principal },
});

function formatTeacherSections(teacher: TeacherResponse) {
  if (teacher.assigned_sections.length === 0) {
    return "No sections assigned";
  }

  return teacher.assigned_sections
    .map((section) => `${section.class_name} ${section.section_name}`)
    .join(", ");
}

function TeacherCard({
  teacher,
  onPress,
}: {
  teacher: TeacherResponse;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardIcon}>
        <Ionicons name="person-outline" size={18} color={colors.principal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{teacher.name}</Text>
        <Text style={styles.cardMeta}>
          {teacher.primary_subject?.name ?? "No primary subject"}
        </Text>
        <Text style={styles.cardSubmeta}>{formatTeacherSections(teacher)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function SubjectCard({
  subject,
  active,
  onPress,
}: {
  subject: SubjectResponse;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectCard, active && styles.selectCardActive]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.selectTitle, active && styles.selectTitleActive]}>
          {subject.name}
        </Text>
        <Text style={[styles.selectMeta, active && styles.selectMetaActive]}>
          {subject.code}
          {subject.is_active ? "" : " · Inactive"}
        </Text>
      </View>
      {active ? (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={colors.principal}
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

function SectionRow({
  section,
  active,
  onPress,
}: {
  section: SectionResponse;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectCard, active && styles.selectCardActive]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.selectTitle, active && styles.selectTitleActive]}>
          Section {section.name}
        </Text>
        <Text style={[styles.selectMeta, active && styles.selectMetaActive]}>
          {section.class_teacher
            ? `Class teacher: ${section.class_teacher.name}`
            : "No class teacher assigned"}
        </Text>
      </View>
      <View
        style={[styles.checkbox, active && styles.checkboxActive]}
      >
        {active ? (
          <Ionicons name="checkmark" size={14} color={colors.surface} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function TeacherAssignmentScreen() {
  const [step, setStep] = useState<AssignmentStep>("teachers");
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [classes, setClasses] = useState<AcademicClassResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadData(showLoader = false) {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [teachersRes, subjectsRes, sectionsRes, classesRes] =
        await Promise.all([
          principalApi.getTeachers(),
          principalApi.getSubjects(),
          principalApi.getSections(),
          principalApi.getClasses(),
        ]);

      setTeachers(
        teachersRes.results.slice().sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSubjects(
        subjectsRes.results.slice().sort((a, b) => {
          if (a.is_active !== b.is_active) {
            return a.is_active ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        }),
      );
      setSections(
        sectionsRes.results.slice().sort((a, b) => {
          const classCompare = a.academic_class.name.localeCompare(
            b.academic_class.name,
          );
          return classCompare !== 0
            ? classCompare
            : a.name.localeCompare(b.name);
        }),
      );
      setClasses(
        classesRes.results
          .slice()
          .sort(
            (a, b) =>
              a.display_order - b.display_order || a.name.localeCompare(b.name),
          ),
      );
    } catch (err: any) {
      setError(err?.details ?? "Failed to load assignment data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData(true).catch(() => {});
  }, []);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId],
  );

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  );

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.phone_number?.toLowerCase().includes(q),
    );
  }, [teachers, teacherQuery]);

  const groupedSections = useMemo<SectionGroup[]>(() => {
    const classOrder = new Map(classes.map((item) => [item.id, item.display_order]));
    const classNameOrder = new Map(classes.map((item) => [item.id, item.name]));
    const grouped = new Map<string, SectionGroup>();

    for (const section of sections) {
      const classId = section.academic_class.id;
      if (!grouped.has(classId)) {
        grouped.set(classId, {
          title: classNameOrder.get(classId) ?? section.academic_class.name,
          classId,
          data: [],
        });
      }
      grouped.get(classId)?.data.push(section);
    }

    return Array.from(grouped.entries())
      .sort(([classA], [classB]) => {
        const orderA = classOrder.get(classA) ?? Number.MAX_SAFE_INTEGER;
        const orderB = classOrder.get(classB) ?? Number.MAX_SAFE_INTEGER;
        const nameA = classNameOrder.get(classA) ?? "";
        const nameB = classNameOrder.get(classB) ?? "";
        return orderA - orderB || nameA.localeCompare(nameB);
      })
      .map(([, group]) => group);
  }, [classes, sections]);

  function openTeacher(teacher: TeacherResponse) {
    setSelectedTeacherId(teacher.id);
    setSelectedSubjectId(teacher.primary_subject?.id ?? null);
    setSelectedSectionIds(teacher.assigned_sections.map((section) => section.id));
    setStep("subjects");
  }

  function goBack() {
    if (saving) return;
    if (step === "sections") {
      setStep("subjects");
      return;
    }
    if (step === "subjects") {
      setStep("teachers");
      return;
    }
    router.back();
  }

  function toggleSection(sectionId: string) {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  }

  async function handleSave() {
    if (!selectedTeacher) {
      Alert.alert("Missing teacher", "Please choose a teacher first.");
      setStep("teachers");
      return;
    }
    if (!selectedSubjectId) {
      Alert.alert("Missing subject", "Please select a subject to continue.");
      setStep("subjects");
      return;
    }
    if (selectedSectionIds.length === 0) {
      Alert.alert(
        "Missing sections",
        "Please choose at least one section to assign.",
      );
      return;
    }

    setSaving(true);
    try {
      const response = await principalApi.assignTeacherSections(
        selectedTeacher.id,
        {
          subject_id: selectedSubjectId,
          section_ids: selectedSectionIds,
        },
      );
      await loadData(false);
      setStep("teachers");
      setSelectedTeacherId(null);
      setSelectedSubjectId(null);
      setSelectedSectionIds([]);
      setSuccessMsg(response.message || "Assignment saved successfully.");
    } catch (err: any) {
      Alert.alert("Error", err?.details ?? "Failed to assign subject and sections.");
    } finally {
      setSaving(false);
    }
  }

  const headerTitle =
    step === "teachers"
      ? "Assign Subject"
      : step === "subjects"
        ? "Choose Subject"
        : "Assign Sections";

  if (loading) {
    return <LoadingScreen label="Loading assignment flow..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        left={
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle}>{headerTitle}</Text>}
      />

      {/* Step progress indicator */}
      <StepIndicator current={step} />

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadData(true)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && step === "teachers" ? (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              value={teacherQuery}
              onChangeText={setTeacherQuery}
              placeholder="Search by name or mobile…"
              placeholderTextColor={colors.textMuted}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          {/* Success banner */}
          {!!successMsg && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.successBannerText}>{successMsg}</Text>
              <Pressable onPress={() => setSuccessMsg("")} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.success} />
              </Pressable>
            </View>
          )}

          <SectionList
            sections={[{ title: "Teachers", data: filteredTeachers }]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.sectionIntro}>
                <Text style={styles.sectionLabel}>Select Teacher</Text>
                <Text style={styles.sectionText}>
                  Choose a teacher to update their primary subject and assigned sections.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {teacherQuery ? "No teachers match your search." : "No teachers available."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TeacherCard teacher={item} onPress={() => openTeacher(item)} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderSectionHeader={() => null}
          />
        </View>
      ) : null}

      {!error && step === "subjects" ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionIntro}>
            <Text style={styles.sectionLabel}>Teacher</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{selectedTeacher?.name}</Text>
              <Text style={styles.summaryMeta}>
                Current subject:{" "}
                {selectedTeacher?.primary_subject?.name ?? "Not assigned"}
              </Text>
              <Text style={styles.summaryMeta}>
                Current sections:{" "}
                {selectedTeacher ? formatTeacherSections(selectedTeacher) : "None"}
              </Text>
            </View>
          </View>

          <View style={styles.sectionIntro}>
            <Text style={styles.sectionLabel}>Select Subject</Text>
            <Text style={styles.sectionText}>
              Tap a subject to continue to class and section assignment.
            </Text>
          </View>

          {subjects.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No subjects available.</Text>
            </View>
          ) : (
            subjects.map((subject) => (
              <View key={subject.id} style={styles.subjectSpacing}>
                <SubjectCard
                  subject={subject}
                  active={selectedSubjectId === subject.id}
                  onPress={() => {
                    setSelectedSubjectId(subject.id);
                    setStep("sections");
                  }}
                />
              </View>
            ))
          )}
        </ScrollView>
      ) : null}

      {!error && step === "sections" ? (
        <View style={{ flex: 1 }}>
          <SectionList
            sections={groupedSections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.sectionIntro}>
                <Text style={styles.sectionLabel}>Assignment Summary</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>{selectedTeacher?.name}</Text>
                  <Text style={styles.summaryMeta}>
                    Subject: {selectedSubject?.name ?? "Not selected"}
                  </Text>
                  <Text style={styles.summaryMeta}>
                    Sections selected: {selectedSectionIds.length}
                  </Text>
                </View>
                <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
                  Select Sections
                </Text>
                <Text style={styles.sectionText}>
                  Choose one or more sections across any classes.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No sections available.</Text>
              </View>
            }
            renderSectionHeader={({ section }) => {
              const sectionIds = section.data.map((s) => s.id);
              const allSelected = sectionIds.every((id) => selectedSectionIds.includes(id));
              return (
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{section.title}</Text>
                  <Pressable
                    onPress={() => {
                      if (allSelected) {
                        setSelectedSectionIds((prev) => prev.filter((id) => !sectionIds.includes(id)));
                      } else {
                        setSelectedSectionIds((prev) => [...new Set([...prev, ...sectionIds])]);
                      }
                    }}
                  >
                    <Text style={styles.groupToggleText}>
                      {allSelected ? "Deselect all" : "Select all"}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
            renderItem={({ item }) => (
              <View style={styles.subjectSpacing}>
                <SectionRow
                  section={item}
                  active={selectedSectionIds.includes(item.id)}
                  onPress={() => toggleSection(item.id)}
                />
              </View>
            )}
          />

          <View style={styles.footer}>
            {refreshing ? (
              <View style={styles.refreshRow}>
                <ActivityIndicator size="small" color={colors.principal} />
                <Text style={styles.refreshText}>Refreshing assignments...</Text>
              </View>
            ) : null}
            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={colors.surface}
                  style={{ marginRight: spacing.sm }}
                />
              ) : null}
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "Assign Subject & Sections"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  errorText: {
    ...(typography.body as object),
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.principal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryBtnText: {
    ...(typography.body as object),
    color: colors.surface,
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionIntro: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionText: {
    ...(typography.body as object),
    color: colors.textSecondary,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.principal + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...(typography.body as object),
    color: colors.textPrimary,
    fontWeight: "700",
  },
  cardMeta: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardSubmeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: "center",
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryTitle: {
    ...(typography.body as object),
    color: colors.textPrimary,
    fontWeight: "700",
  },
  summaryMeta: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: 4,
  },
  selectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  selectCardActive: {
    borderColor: colors.principal,
    backgroundColor: colors.principal + "10",
  },
  selectTitle: {
    ...(typography.body as object),
    color: colors.textPrimary,
    fontWeight: "600",
  },
  selectTitleActive: {
    color: colors.principal,
  },
  selectMeta: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: 3,
  },
  selectMetaActive: {
    color: colors.principal,
  },
  subjectSpacing: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  groupTitle: {
    ...(typography.label as object),
    color: colors.textSecondary,
  },
  groupToggleText: {
    ...(typography.caption as object),
    color: colors.principal,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...(typography.body as object),
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#EAF7F1",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: "#A7F3D0",
  },
  successBannerText: {
    ...(typography.body as object),
    color: colors.success,
    fontWeight: "500",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    borderColor: colors.principal,
    backgroundColor: colors.principal,
  },
  footer: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  refreshText: {
    ...(typography.caption as object),
    color: colors.textMuted,
  },
  saveBtn: {
    borderRadius: 14,
    backgroundColor: colors.principal,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    ...(typography.body as object),
    color: colors.surface,
    fontWeight: "700",
  },
});
