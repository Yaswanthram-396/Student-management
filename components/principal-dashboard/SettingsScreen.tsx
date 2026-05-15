import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { authApi } from "../../services/auth";
import { principalApi } from "../../services/principal";
import { appendAssetToFormData } from "../../services/upload";
import { useAuthStore } from "../../store/auth-store";
import type {
  AcademicClassResponse,
  SectionResponse,
  SubjectResponse,
  TeacherResponse,
} from "../../types/principal";
import {
  BottomSheet,
  HeaderBar,
  LoadingScreen,
  SegmentedControl,
  ToggleSwitch,
} from "../shared";

// ─── Local sub-components ─────────────────────────────────────────────────────

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{label}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  right,
  noBorder,
}: {
  label: string;
  right: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.row, !noBorder && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );
}

type ManageMode = "create" | "edit";

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const { currentUser } = useAuthStore();
  const authSchoolName = currentUser?.school.name?.trim() || "School";
  const [attFreq, setAttFreq] = useState<"once" | "twice">("twice");
  const [whatsapp, setWhatsapp] = useState(true);
  const [parentQuery, setParentQuery] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [schoolName, setSchoolName] = useState(authSchoolName);
  const [schoolUrl, setSchoolUrl] = useState("dps.schoolapp.in");

  // Student onboarding
  const [showStudentSheet, setShowStudentSheet] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentSection, setStudentSection] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentSuccess, setStudentSuccess] = useState(false);
  const [uploadingStudentsCsv, setUploadingStudentsCsv] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Teacher onboarding
  const [showTeacherSheet, setShowTeacherSheet] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherMobile, setTeacherMobile] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [teacherSuccess, setTeacherSuccess] = useState(false);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] =
    useState<SubjectResponse | null>(null);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [uploadingTeachersCsv, setUploadingTeachersCsv] = useState(false);
  const [teacherUploadStatusText, setTeacherUploadStatusText] = useState("");
  const [teacherErrorReportUrl, setTeacherErrorReportUrl] = useState<
    string | null
  >(null);

  // Management data
  const [classes, setClasses] = useState<AcademicClassResponse[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [loadingManageData, setLoadingManageData] = useState(false);

  // Class management
  const [showClassSheet, setShowClassSheet] = useState(false);
  const [classMode, setClassMode] = useState<ManageMode>("create");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classOrderInput, setClassOrderInput] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  // Subject management
  const [showSubjectSheet, setShowSubjectSheet] = useState(false);
  const [subjectMode, setSubjectMode] = useState<ManageMode>("create");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectNameInput, setSubjectNameInput] = useState("");
  const [subjectCodeInput, setSubjectCodeInput] = useState("");
  const [subjectActiveInput, setSubjectActiveInput] = useState(true);
  const [savingSubject, setSavingSubject] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(
    null,
  );

  // Section management
  const [showSectionSheet, setShowSectionSheet] = useState(false);
  const [sectionMode, setSectionMode] = useState<ManageMode>("create");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [selectedManageClassId, setSelectedManageClassId] = useState("");
  const [selectedSectionFilterClassId, setSelectedSectionFilterClassId] =
    useState("");
  const [sectionNameInput, setSectionNameInput] = useState("");
  const [selectedClassTeacherId, setSelectedClassTeacherId] = useState<
    string | null
  >(null);
  const [sectionParentQueryInput, setSectionParentQueryInput] = useState(true);
  const [savingSection, setSavingSection] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(
    null,
  );

  // ── Load config on mount ──────────────────────────────────────────────────
  useEffect(() => {
    principalApi
      .getConfig()
      .then((cfg) => {
        setAttFreq(cfg.attendance_frequency === "ONCE" ? "once" : "twice");
        setWhatsapp(cfg.whatsapp_absent_automation_enabled);
        setParentQuery(cfg.parent_query_enabled);
        setSchoolUrl(cfg.subdomain + ".schoolapp.in");
      })
      .catch(() => {}) // keep defaults on network error
      .finally(() => setLoadingConfig(false));
  }, []);

  useEffect(() => {
    setSchoolName(authSchoolName);
  }, [authSchoolName]);

  async function loadManagementData() {
    setLoadingManageData(true);
    try {
      const [classesResult, subjectsResult, sectionsResult, teachersResult] =
        await Promise.allSettled([
          principalApi.getClasses(),
          principalApi.getSubjects(),
          principalApi.getSections(),
          principalApi.getTeachers(),
        ]);

      const sectionResults =
        sectionsResult.status === "fulfilled"
          ? sectionsResult.value.results
          : [];
      const classResults =
        classesResult.status === "fulfilled"
          ? classesResult.value.results
          : Array.from(
              new Map(
                sectionResults.map((section) => [
                  section.academic_class.id,
                  {
                    id: section.academic_class.id,
                    name: section.academic_class.name,
                    display_order: 0,
                  },
                ]),
              ).values(),
            );
      const subjectResults =
        subjectsResult.status === "fulfilled"
          ? subjectsResult.value.results
          : [];
      const teacherResults =
        teachersResult.status === "fulfilled" ? teachersResult.value.results : [];

      setClasses(
        classResults
          .slice()
          .sort(
            (a, b) =>
              a.display_order - b.display_order || a.name.localeCompare(b.name),
          ),
      );
      setSubjects(
        subjectResults.slice().sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSections(
        sectionResults.slice().sort((a, b) => {
          const classCompare = a.academic_class.name.localeCompare(
            b.academic_class.name,
          );
          return classCompare !== 0
            ? classCompare
            : a.name.localeCompare(b.name);
        }),
      );
      setTeachers(
        teacherResults.slice().sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedManageClassId((prev) => prev || classResults[0]?.id || "");
      setSelectedSectionFilterClassId((prev) => prev);
    } finally {
      setLoadingManageData(false);
    }
  }

  useEffect(() => {
    if (!showClassSheet && !showSubjectSheet && !showSectionSheet) return;
    loadManagementData().catch(() => {});
  }, [showClassSheet, showSectionSheet, showSubjectSheet]);

  // ── Load sections when teacher sheet opens ────────────────────────────────
  useEffect(() => {
    if (!showTeacherSheet) return;
    setLoadingSections(true);
    setLoadingSubjects(true);
    setTeacherUploadStatusText("");
    setTeacherErrorReportUrl(null);
    Promise.allSettled([principalApi.getSections(), principalApi.getSubjects()])
      .then(([sectionsResult, subjectsResult]) => {
        if (sectionsResult.status === "fulfilled") {
          setSections(sectionsResult.value.results);
        }
        if (subjectsResult.status === "fulfilled") {
          setSubjects(
            subjectsResult.value.results
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      })
      .finally(() => {
        setLoadingSections(false);
        setLoadingSubjects(false);
      });
  }, [showTeacherSheet]);

  if (loadingConfig) {
    return <LoadingScreen label="Loading school settings..." />;
  }

  function resetTeacherForm() {
    setTeacherName("");
    setTeacherMobile("");
    setSelectedSubject(null);
    setSelectedSectionIds([]);
    setTeacherSuccess(false);
    setTeacherUploadStatusText("");
    setTeacherErrorReportUrl(null);
  }

  function closeTeacherSheet() {
    if (addingTeacher || uploadingTeachersCsv) return;
    resetTeacherForm();
    setShowTeacherSheet(false);
  }

  function resetClassForm() {
    setClassMode("create");
    setEditingClassId(null);
    setClassNameInput("");
    setClassOrderInput("");
  }

  function openCreateClassSheet() {
    resetClassForm();
    setShowClassSheet(true);
  }

  function openEditClassSheet(item: AcademicClassResponse) {
    setClassMode("edit");
    setEditingClassId(item.id);
    setClassNameInput(item.name);
    setClassOrderInput(String(item.display_order));
    setShowClassSheet(true);
  }

  function resetSubjectForm() {
    setSubjectMode("create");
    setEditingSubjectId(null);
    setSubjectNameInput("");
    setSubjectCodeInput("");
    setSubjectActiveInput(true);
  }

  function openCreateSubjectSheet() {
    resetSubjectForm();
    setShowSubjectSheet(true);
  }

  function openEditSubjectSheet(item: SubjectResponse) {
    setSubjectMode("edit");
    setEditingSubjectId(item.id);
    setSubjectNameInput(item.name);
    setSubjectCodeInput(item.code);
    setSubjectActiveInput(item.is_active);
    setShowSubjectSheet(true);
  }

  function resetSectionForm() {
    setSectionMode("create");
    setEditingSectionId(null);
    setSectionNameInput("");
    setSelectedClassTeacherId(null);
    setSectionParentQueryInput(true);
    setSelectedManageClassId((prev) => prev || classes[0]?.id || "");
  }

  function openCreateSectionSheet() {
    resetSectionForm();
    setShowSectionSheet(true);
  }

  function openEditSectionSheet(item: SectionResponse) {
    setSectionMode("edit");
    setEditingSectionId(item.id);
    setSelectedManageClassId(item.academic_class.id);
    setSectionNameInput(item.name);
    setSelectedClassTeacherId(item.class_teacher?.id ?? null);
    setSectionParentQueryInput(item.parent_query_enabled);
    setShowSectionSheet(true);
  }

  // ── Toggle handlers (fire PATCH immediately) ──────────────────────────────
  function handleAttFreqChange(i: number) {
    const val = i === 0 ? "once" : "twice";
    setAttFreq(val);
    principalApi
      .updateConfig({ attendance_frequency: val === "once" ? "ONCE" : "TWICE" })
      .catch(() => {});
  }

  function handleWhatsappToggle() {
    const next = !whatsapp;
    setWhatsapp(next);
    principalApi
      .updateConfig({ whatsapp_absent_automation_enabled: next })
      .catch(() => {});
  }

  function handleParentQueryToggle() {
    const next = !parentQuery;
    setParentQuery(next);
    principalApi.updateConfig({ parent_query_enabled: next }).catch(() => {});
  }

  // ── Teacher onboarding ────────────────────────────────────────────────────
  async function handleAddTeacher() {
    if (!teacherName || !teacherMobile || !selectedSubject) {
      Alert.alert(
        "Missing fields",
        "Teacher name, mobile number, and subject are required.",
      );
      return;
    }
    setAddingTeacher(true);
    setTeacherUploadStatusText("");
    setTeacherErrorReportUrl(null);
    try {
      const username =
        teacherName.toLowerCase().replace(/\s+/g, ".") + ".teacher";
      await principalApi.createTeacher({
        name: teacherName,
        phone_number: teacherMobile,
        username,
        password: "Welcome@123",
        primary_subject_id: selectedSubject.id,
        assigned_section_ids: selectedSectionIds,
      });
      setTeacherSuccess(true);
      setTimeout(() => {
        resetTeacherForm();
        setShowTeacherSheet(false);
      }, 1500);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.details ?? "Failed to add teacher. Please try again.",
      );
    } finally {
      setAddingTeacher(false);
    }
  }

  async function handleUploadTeacherCsv() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv"],
        multiple: false,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const formData = new FormData();
      await appendAssetToFormData(formData, "csv_file", asset, "teachers.csv");

      setUploadingTeachersCsv(true);
      setTeacherSuccess(false);
      setTeacherUploadStatusText("Uploading CSV...");
      setTeacherErrorReportUrl(null);
      const batch = await principalApi.bulkUploadTeachers(formData);
      setTeacherUploadStatusText("Processing CSV...");
      pollBatchStatus(batch.batch_id, "teacher", "csv");
    } catch (err: any) {
      Alert.alert("Error", err.details ?? "Upload failed. Please try again.");
      setTeacherUploadStatusText("");
      setTeacherErrorReportUrl(null);
      setUploadingTeachersCsv(false);
    }
  }

  // ── Student onboarding ────────────────────────────────────────────────────
  async function handleAddStudent() {
    if (
      !studentName ||
      !studentClass ||
      !studentSection ||
      !parentName ||
      !parentMobile
    ) {
      Alert.alert("Missing fields", "All student fields are required.");
      return;
    }
    setAddingStudent(true);
    try {
      // Build single-row CSV and POST as multipart
      const csvContent =
        `student_name,class,section,parent_name,parent_mobile_number\n` +
        `${studentName},${studentClass},${studentSection},${parentName},${parentMobile}`;
      const blob = new Blob([csvContent], { type: "text/csv" });
      const formData = new FormData();
      formData.append("csv_file", blob as any, "student.csv");

      const batch = await principalApi.bulkUploadStudents(formData);
      pollBatchStatus(batch.batch_id, "student", "single");
    } catch (err: any) {
      Alert.alert("Error", err.details ?? "Upload failed. Please try again.");
      setAddingStudent(false);
    }
  }

  async function handleUploadStudentCsv() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv"],
        multiple: false,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const formData = new FormData();
      await appendAssetToFormData(formData, "csv_file", asset, "students.csv");

      setUploadingStudentsCsv(true);
      setUploadStatusText("Uploading CSV...");
      const batch = await principalApi.bulkUploadStudents(formData);
      setUploadStatusText("Processing CSV...");
      pollBatchStatus(batch.batch_id, "student", "csv");
    } catch (err: any) {
      Alert.alert("Error", err.details ?? "Upload failed. Please try again.");
      setUploadStatusText("");
      setUploadingStudentsCsv(false);
    }
  }

  function pollBatchStatus(
    batchId: string,
    entity: "student" | "teacher",
    source: "single" | "csv",
  ) {
    const getStatus =
      entity === "student"
        ? principalApi.getBulkUploadStatus
        : principalApi.getTeacherBulkUploadStatus;
    const interval = setInterval(async () => {
      try {
        const status = await getStatus(batchId);
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          clearInterval(interval);
          if (entity === "student") {
            if (source === "single") setAddingStudent(false);
            if (source === "csv") {
              setUploadingStudentsCsv(false);
              setUploadStatusText("");
            }
          } else {
            if (source === "single") setAddingTeacher(false);
            if (source === "csv") {
              setUploadingTeachersCsv(false);
            }
          }

          if (status.status === "COMPLETED") {
            if (entity === "student") {
              setStudentSuccess(true);
              if (status.error_count > 0) {
                Alert.alert(
                  "Upload completed with errors",
                  `${status.success_count} rows saved. ${status.error_count} rows had errors.`,
                );
              }
              setTimeout(() => {
                setStudentSuccess(false);
                setStudentName("");
                setStudentClass("");
                setStudentSection("");
                setParentName("");
                setParentMobile("");
                setShowStudentSheet(false);
              }, 1500);
            } else {
              setTeacherErrorReportUrl(status.error_report_url ?? null);
              setTeacherUploadStatusText(
                status.error_count > 0
                  ? `${status.success_count} teachers uploaded. ${status.error_count} rows need review.`
                  : `${status.success_count} teachers uploaded successfully.`,
              );
              if (source === "single") {
                setTeacherSuccess(true);
                setTimeout(() => {
                  resetTeacherForm();
                  setShowTeacherSheet(false);
                }, 1500);
              } else if (status.error_count > 0) {
                Alert.alert(
                  "Upload completed with errors",
                  `${status.success_count} teachers uploaded. ${status.error_count} rows had errors.`,
                );
              }
            }
          } else {
            Alert.alert(
              "Upload failed",
              `${status.error_count} rows had errors.`,
            );
            if (entity === "teacher") {
              setTeacherUploadStatusText(
                "Upload failed. Review the CSV and try again.",
              );
              setTeacherErrorReportUrl(status.error_report_url ?? null);
            }
          }
        }
      } catch {
        clearInterval(interval);
        if (entity === "student") {
          if (source === "single") setAddingStudent(false);
          if (source === "csv") {
            setUploadingStudentsCsv(false);
            setUploadStatusText("");
          }
        } else {
          if (source === "single") setAddingTeacher(false);
          if (source === "csv") {
            setUploadingTeachersCsv(false);
            setTeacherUploadStatusText("");
          }
        }
      }
    }, 2000);
  }

  async function handleSaveClass() {
    const parsedOrder = Number(classOrderInput);
    if (!classNameInput.trim() || !Number.isFinite(parsedOrder)) {
      Alert.alert(
        "Missing fields",
        "Class name and display order are required.",
      );
      return;
    }

    setSavingClass(true);
    try {
      if (classMode === "create") {
        await principalApi.createClass({
          name: classNameInput.trim(),
          display_order: parsedOrder,
        });
      } else if (editingClassId) {
        await principalApi.updateClass(editingClassId, {
          name: classNameInput.trim(),
          display_order: parsedOrder,
        });
      }
      await loadManagementData();
      resetClassForm();
      setShowClassSheet(false);
    } catch (err: any) {
      Alert.alert("Error", err.details ?? "Failed to save class.");
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClass(classId: string) {
    setDeletingClassId(classId);
    try {
      await principalApi.deleteClass(classId);
      await loadManagementData();
    } catch (err: any) {
      Alert.alert("Delete blocked", err.details ?? "Failed to delete class.");
    } finally {
      setDeletingClassId(null);
    }
  }

  async function handleSaveSubject() {
    if (!subjectNameInput.trim() || !subjectCodeInput.trim()) {
      Alert.alert("Missing fields", "Subject name and code are required.");
      return;
    }

    setSavingSubject(true);
    try {
      if (subjectMode === "create") {
        await principalApi.createSubject({
          name: subjectNameInput.trim(),
          code: subjectCodeInput.trim().toUpperCase(),
          is_active: subjectActiveInput,
        });
      } else if (editingSubjectId) {
        await principalApi.updateSubject(editingSubjectId, {
          name: subjectNameInput.trim(),
          code: subjectCodeInput.trim().toUpperCase(),
          is_active: subjectActiveInput,
        });
      }
      await loadManagementData();
      resetSubjectForm();
      setShowSubjectSheet(false);
    } catch (err: any) {
      Alert.alert("Error", err.details ?? "Failed to save subject.");
    } finally {
      setSavingSubject(false);
    }
  }

  async function handleDeleteSubject(subjectId: string) {
    setDeletingSubjectId(subjectId);
    try {
      await principalApi.deleteSubject(subjectId);
      await loadManagementData();
    } catch (err: any) {
      Alert.alert("Delete blocked", err.details ?? "Failed to delete subject.");
    } finally {
      setDeletingSubjectId(null);
    }
  }

  async function handleSaveSection() {
    if (!selectedManageClassId || !sectionNameInput.trim()) {
      Alert.alert("Missing fields", "Class and section name are required.");
      return;
    }

    setSavingSection(true);
    try {
      if (sectionMode === "create") {
        await principalApi.createSection({
          class_id: selectedManageClassId,
          name: sectionNameInput.trim(),
          class_teacher_id: selectedClassTeacherId,
          parent_query_enabled: sectionParentQueryInput,
        });
      } else if (editingSectionId) {
        await principalApi.updateSection(editingSectionId, {
          name: sectionNameInput.trim(),
          class_teacher_id: selectedClassTeacherId,
          parent_query_enabled: sectionParentQueryInput,
        });
      }
      await loadManagementData();
      resetSectionForm();
      setShowSectionSheet(false);
    } catch (err: any) {
      Alert.alert("Error", err.details ?? "Failed to save section.");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleDeleteSection(sectionId: string) {
    setDeletingSectionId(sectionId);
    try {
      await principalApi.deleteSection(sectionId);
      await loadManagementData();
    } catch (err: any) {
      Alert.alert("Delete blocked", err.details ?? "Failed to delete section.");
    } finally {
      setDeletingSectionId(null);
    }
  }

  function confirmDeleteClass(item: AcademicClassResponse) {
    Alert.alert("Delete class", `Delete ${item.name}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteClass(item.id),
      },
    ]);
  }

  function confirmDeleteSubject(item: SubjectResponse) {
    Alert.alert(
      "Delete subject",
      `Delete ${item.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteSubject(item.id),
        },
      ],
    );
  }

  function confirmDeleteSection(item: SectionResponse) {
    Alert.alert(
      "Delete section",
      `Delete Section ${item.name} from ${item.academic_class.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteSection(item.id),
        },
      ],
    );
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await authApi.logout();
    setShowLogout(false);
    router.replace("/");
  }

  const filteredManagedSections = selectedSectionFilterClassId
    ? sections.filter(
        (item) => item.academic_class.id === selectedSectionFilterClassId,
      )
    : sections;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>School Settings</Text>}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* School info card */}
        <View style={styles.schoolCard}>
          <View style={styles.schoolInfo}>
            <Text style={styles.schoolName}>{schoolName}</Text>
            <Text style={styles.schoolUrl}>{schoolUrl}</Text>
          </View>
        </View>

        {/* Attendance */}
        <SettingsSection label="Attendance">
          <View
            style={[
              styles.row,
              styles.rowBorder,
              { flexDirection: "column", alignItems: "flex-start" },
            ]}
          >
            <Text style={[styles.rowLabel, { marginBottom: spacing.sm }]}>
              Attendance Frequency
            </Text>
            <SegmentedControl
              options={["Once a day", "Twice a day"]}
              activeIndex={attFreq === "once" ? 0 : 1}
              onChange={handleAttFreqChange}
              accentColor={colors.principal}
            />
          </View>
          <SettingsRow
            label="Absent WhatsApp Alert"
            noBorder
            right={
              <ToggleSwitch
                value={whatsapp}
                onChange={handleWhatsappToggle}
                accentColor={colors.principal}
              />
            }
          />
        </SettingsSection>

        {/* Communication */}
        <SettingsSection label="Communication">
          <SettingsRow
            label="Parent Query to Teacher"
            noBorder
            right={
              <ToggleSwitch
                value={parentQuery}
                onChange={handleParentQueryToggle}
                accentColor={colors.principal}
              />
            }
          />
        </SettingsSection>

        {/* Manage School */}
        <SettingsSection label="Manage School">
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={() => setShowStudentSheet(true)}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons
                name="person-add-outline"
                size={16}
                color={colors.principal}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.rowLabel}>Student Onboarding</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={() => setShowTeacherSheet(true)}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.principal}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.rowLabel}>Add Teacher</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={openCreateClassSheet}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons
                name="albums-outline"
                size={16}
                color={colors.principal}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.rowLabel}>Manage Classes</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={openCreateSubjectSheet}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons
                name="flask-outline"
                size={16}
                color={colors.principal}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.rowLabel}>Manage Subjects</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={() => router.push("/(tabs)/principal/assign-subject")}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons
                name="school-outline"
                size={16}
                color={colors.principal}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.rowLabel}>Assign Subject</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          <Pressable style={styles.row} onPress={openCreateSectionSheet}>
            <View style={styles.rowIconLabel}>
              <Ionicons
                name="git-branch-outline"
                size={16}
                color={colors.principal}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.rowLabel}>Manage Sections</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
        </SettingsSection>

        {/* Academic */}
        <SettingsSection label="Academic">
          <SettingsRow
            label="Current Academic Year"
            right={<Text style={styles.rowValue}>2025 – 2026</Text>}
          />
          <SettingsRow
            label="Term Structure"
            noBorder
            right={<Text style={styles.rowValue}>2 Terms</Text>}
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection label="Account">
          <View
            style={[
              styles.row,
              styles.rowBorder,
              { flexDirection: "column", alignItems: "flex-start" },
            ]}
          >
            <Text style={styles.rowLabel}>App Coordinator</Text>
            <Text style={[styles.rowValue, { marginTop: spacing.xs }]}>
              rekha@dps.in
            </Text>
          </View>
          <View style={[styles.row, { paddingBottom: spacing.md }]}>
            <Text style={[styles.rowLabel, { fontWeight: "500" }]}>
              Mrs. Rekha Nair
            </Text>
          </View>
        </SettingsSection>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={() => setShowLogout(true)}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* Student Onboarding BottomSheet */}
      <BottomSheet
        visible={showStudentSheet}
        onClose={() => setShowStudentSheet(false)}
      >
        <Text style={styles.sheetTitle}>Bulk Upload Students</Text>
        <Text style={styles.sheetSubtext}>
          Upload a CSV with columns: Name, Class, Section, Parent Name, Parent
          Mobile
        </Text>

        <Pressable>
          <Text style={styles.downloadLink}>Download Sample CSV</Text>
        </Pressable>

        <Pressable
          style={[
            styles.uploadBtn,
            (uploadingStudentsCsv || addingStudent) && styles.uploadBtnDisabled,
          ]}
          onPress={handleUploadStudentCsv}
          disabled={uploadingStudentsCsv || addingStudent}
        >
          {uploadingStudentsCsv ? (
            <ActivityIndicator
              size="small"
              color={colors.surface}
              style={{ marginRight: spacing.sm }}
            />
          ) : (
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={colors.surface}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text style={styles.uploadBtnText}>
            {uploadingStudentsCsv ? "Uploading..." : "Upload CSV File"}
          </Text>
        </Pressable>
        {uploadStatusText ? (
          <Text style={styles.uploadStatusText}>{uploadStatusText}</Text>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sheetSubheading}>Add Single Student</Text>

        <Text style={styles.sheetFieldLabel}>Student Name</Text>
        <TextInput
          style={styles.textInput}
          value={studentName}
          onChangeText={setStudentName}
          placeholder="e.g. Riya Sharma"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>Class</Text>
        <TextInput
          style={styles.textInput}
          value={studentClass}
          onChangeText={setStudentClass}
          placeholder="e.g. Class 7"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>Section</Text>
        <TextInput
          style={styles.textInput}
          value={studentSection}
          onChangeText={setStudentSection}
          placeholder="e.g. B"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>Parent Name</Text>
        <TextInput
          style={styles.textInput}
          value={parentName}
          onChangeText={setParentName}
          placeholder="e.g. Mr. Suresh Sharma"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>Parent Mobile</Text>
        <TextInput
          style={styles.textInput}
          value={parentMobile}
          onChangeText={setParentMobile}
          placeholder="e.g. 9876543210"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />

        {studentSuccess ? (
          <View style={styles.successRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.success}
            />
            <Text style={styles.successText}>Student added successfully</Text>
          </View>
        ) : (
          <Pressable
            style={[
              styles.saveBtn,
              addingStudent && { backgroundColor: colors.success },
            ]}
            onPress={handleAddStudent}
          >
            <Text style={styles.saveBtnText}>
              {addingStudent ? "Adding..." : "Add Student"}
            </Text>
          </Pressable>
        )}
      </BottomSheet>

      {/* Teacher Onboarding BottomSheet */}
      <BottomSheet visible={showTeacherSheet} onClose={closeTeacherSheet}>
        <Text style={styles.sheetTitle}>Add Teacher</Text>
        <Text style={styles.sheetSubtext}>
          Bulk upload CSV columns: name, phone_number, username, password,
          primary_subject_id, assigned_section_ids.
        </Text>

        <Pressable
          style={[
            styles.uploadBtn,
            (uploadingTeachersCsv || addingTeacher) && styles.uploadBtnDisabled,
          ]}
          onPress={handleUploadTeacherCsv}
          disabled={uploadingTeachersCsv || addingTeacher}
        >
          {uploadingTeachersCsv ? (
            <ActivityIndicator
              size="small"
              color={colors.surface}
              style={{ marginRight: spacing.sm }}
            />
          ) : (
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={colors.surface}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text style={styles.uploadBtnText}>
            {uploadingTeachersCsv ? "Uploading..." : "Upload Teacher CSV"}
          </Text>
        </Pressable>
        {teacherUploadStatusText ? (
          <Text style={styles.uploadStatusText}>{teacherUploadStatusText}</Text>
        ) : null}
        {teacherErrorReportUrl ? (
          <Pressable onPress={() => Linking.openURL(teacherErrorReportUrl)}>
            <Text style={styles.downloadLink}>Open Error Report</Text>
          </Pressable>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sheetSubheading}>Add Single Teacher</Text>

        <Text style={styles.sheetFieldLabel}>Teacher Name</Text>
        <TextInput
          style={styles.textInput}
          value={teacherName}
          onChangeText={setTeacherName}
          placeholder="e.g. Mrs. Sunita Rao"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>Mobile Number</Text>
        <TextInput
          style={styles.textInput}
          value={teacherMobile}
          onChangeText={setTeacherMobile}
          placeholder="e.g. 9876543210"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={styles.sheetFieldLabel}>Subject</Text>
        {loadingSubjects ? (
          <ActivityIndicator
            color={colors.principal}
            style={{ marginBottom: spacing.md }}
          />
        ) : subjects.length === 0 ? (
          <Text style={[styles.sheetFieldLabel, { marginBottom: spacing.md }]}>
            No subjects available
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectChips}
            style={{ marginBottom: spacing.md }}
          >
            {subjects.map((subject) => {
              const active = selectedSubject?.id === subject.id;
              return (
                <Pressable
                  key={subject.id}
                  style={[
                    styles.subjectChip,
                    active && styles.subjectChipActive,
                  ]}
                  onPress={() => setSelectedSubject(subject)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      active && styles.subjectChipTextActive,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.sheetFieldLabel}>Sections</Text>
        {loadingSections ? (
          <ActivityIndicator
            color={colors.principal}
            style={{ marginBottom: spacing.md }}
          />
        ) : sections.length === 0 ? (
          <Text style={[styles.sheetFieldLabel, { marginBottom: spacing.md }]}>
            No sections available
          </Text>
        ) : (
          <View style={styles.sectionChips}>
            {sections.map((sec) => {
              const active = selectedSectionIds.includes(sec.id);
              return (
                <Pressable
                  key={sec.id}
                  style={[
                    styles.sectionChip,
                    active && styles.sectionChipActive,
                  ]}
                  onPress={() =>
                    setSelectedSectionIds((prev) =>
                      active
                        ? prev.filter((id) => id !== sec.id)
                        : [...prev, sec.id],
                    )
                  }
                >
                  <Text
                    style={[
                      styles.sectionChipText,
                      active && styles.sectionChipTextActive,
                    ]}
                  >
                    {sec.academic_class.name} – {sec.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {teacherSuccess ? (
          <View style={styles.successRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.success}
            />
            <Text style={styles.successText}>Teacher added successfully</Text>
          </View>
        ) : (
          <Pressable
            style={[
              styles.saveBtn,
              (addingTeacher || uploadingTeachersCsv) && {
                backgroundColor: colors.success,
              },
            ]}
            onPress={handleAddTeacher}
            disabled={addingTeacher || uploadingTeachersCsv}
          >
            <Text style={styles.saveBtnText}>
              {addingTeacher ? "Adding..." : "Add Teacher"}
            </Text>
          </Pressable>
        )}
      </BottomSheet>

      <BottomSheet
        visible={showClassSheet}
        onClose={() => {
          if (savingClass || deletingClassId) return;
          resetClassForm();
          setShowClassSheet(false);
        }}
        height="88%"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>
            {classMode === "create" ? "Manage Classes" : "Edit Class"}
          </Text>
          <Text style={styles.sheetSubtext}>
            Create classes, adjust display order, and remove classes that have
            no sections or students.
          </Text>

          <Text style={styles.sheetFieldLabel}>Class Name</Text>
          <TextInput
            style={styles.textInput}
            value={classNameInput}
            onChangeText={setClassNameInput}
            placeholder="e.g. Class 10"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.sheetFieldLabel}>Display Order</Text>
          <TextInput
            style={styles.textInput}
            value={classOrderInput}
            onChangeText={setClassOrderInput}
            placeholder="e.g. 10"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />

          <Pressable
            style={[styles.saveBtn, savingClass && styles.saveBtnDisabled]}
            onPress={handleSaveClass}
            disabled={savingClass}
          >
            <Text style={styles.saveBtnText}>
              {savingClass
                ? "Saving..."
                : classMode === "create"
                  ? "Create Class"
                  : "Update Class"}
            </Text>
          </Pressable>

          <View style={styles.managementHeaderRow}>
            <Text style={styles.sheetSubheading}>Existing Classes</Text>
            {loadingManageData ? (
              <ActivityIndicator color={colors.principal} size="small" />
            ) : null}
          </View>

          {classes.length === 0 ? (
            <Text style={styles.emptyManagementText}>
              No classes available yet.
            </Text>
          ) : (
            classes.map((item) => (
              <View key={item.id} style={styles.managementCard}>
                <View style={styles.managementCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.managementTitle}>{item.name}</Text>
                    <Text style={styles.managementMeta}>
                      Display order: {item.display_order}
                    </Text>
                  </View>
                  <View style={styles.managementActions}>
                    <Pressable onPress={() => openEditClassSheet(item)}>
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colors.principal}
                      />
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteClass(item)}>
                      {deletingClassId === item.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.danger}
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={showSubjectSheet}
        onClose={() => {
          if (savingSubject || deletingSubjectId) return;
          resetSubjectForm();
          setShowSubjectSheet(false);
        }}
        height="90%"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>
            {subjectMode === "create" ? "Manage Subjects" : "Edit Subject"}
          </Text>
          <Text style={styles.sheetSubtext}>
            Create, update, and retire subjects. Inactive subjects remain
            visible for history but should not be assigned further.
          </Text>

          <Text style={styles.sheetFieldLabel}>Subject Name</Text>
          <TextInput
            style={styles.textInput}
            value={subjectNameInput}
            onChangeText={setSubjectNameInput}
            placeholder="e.g. Physics"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.sheetFieldLabel}>Subject Code</Text>
          <TextInput
            style={styles.textInput}
            value={subjectCodeInput}
            onChangeText={setSubjectCodeInput}
            placeholder="e.g. PHY"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />

          <View style={styles.inlineToggleRow}>
            <Text style={styles.sheetFieldLabel}>
              Active for new assignments
            </Text>
            <ToggleSwitch
              value={subjectActiveInput}
              onChange={() => setSubjectActiveInput((prev) => !prev)}
              accentColor={colors.principal}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, savingSubject && styles.saveBtnDisabled]}
            onPress={handleSaveSubject}
            disabled={savingSubject}
          >
            <Text style={styles.saveBtnText}>
              {savingSubject
                ? "Saving..."
                : subjectMode === "create"
                  ? "Create Subject"
                  : "Update Subject"}
            </Text>
          </Pressable>

          <View style={styles.managementHeaderRow}>
            <Text style={styles.sheetSubheading}>Existing Subjects</Text>
            {loadingManageData ? (
              <ActivityIndicator color={colors.principal} size="small" />
            ) : null}
          </View>

          {subjects.length === 0 ? (
            <Text style={styles.emptyManagementText}>
              No subjects available yet.
            </Text>
          ) : (
            subjects.map((item) => (
              <View key={item.id} style={styles.managementCard}>
                <View style={styles.managementCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.managementTitle}>{item.name}</Text>
                    <Text style={styles.managementMeta}>
                      {item.code} · {item.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                  <View style={styles.managementActions}>
                    <Pressable onPress={() => openEditSubjectSheet(item)}>
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colors.principal}
                      />
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteSubject(item)}>
                      {deletingSubjectId === item.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.danger}
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={showSectionSheet}
        onClose={() => {
          if (savingSection || deletingSectionId) return;
          resetSectionForm();
          setShowSectionSheet(false);
        }}
        height="92%"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>
            {sectionMode === "create" ? "Manage Sections" : "Edit Section"}
          </Text>
          <Text style={styles.sheetSubtext}>
            Parent queries are allowed only when both the school-level toggle
            and the section-level toggle are enabled.
          </Text>

          <Text style={styles.sheetFieldLabel}>Class</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectChips}
            style={{ marginBottom: spacing.md }}
          >
            {classes.map((item) => {
              const active = selectedManageClassId === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.subjectChip,
                    active && styles.subjectChipActive,
                  ]}
                  onPress={() => setSelectedManageClassId(item.id)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      active && styles.subjectChipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sheetFieldLabel}>Section Name</Text>
          <TextInput
            style={styles.textInput}
            value={sectionNameInput}
            onChangeText={setSectionNameInput}
            placeholder="e.g. A"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.sheetFieldLabel}>Class Teacher</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectChips}
            style={{ marginBottom: spacing.md }}
          >
            <Pressable
              style={[
                styles.subjectChip,
                selectedClassTeacherId === null && styles.subjectChipActive,
              ]}
              onPress={() => setSelectedClassTeacherId(null)}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  selectedClassTeacherId === null &&
                    styles.subjectChipTextActive,
                ]}
              >
                No Class Teacher
              </Text>
            </Pressable>
            {teachers.map((item) => {
              const active = selectedClassTeacherId === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.subjectChip,
                    active && styles.subjectChipActive,
                  ]}
                  onPress={() => setSelectedClassTeacherId(item.id)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      active && styles.subjectChipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.inlineToggleRow}>
            <Text style={styles.sheetFieldLabel}>
              Enable parent queries in this section
            </Text>
            <ToggleSwitch
              value={sectionParentQueryInput}
              onChange={() => setSectionParentQueryInput((prev) => !prev)}
              accentColor={colors.principal}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, savingSection && styles.saveBtnDisabled]}
            onPress={handleSaveSection}
            disabled={savingSection}
          >
            <Text style={styles.saveBtnText}>
              {savingSection
                ? "Saving..."
                : sectionMode === "create"
                  ? "Create Section"
                  : "Update Section"}
            </Text>
          </Pressable>

          <View style={styles.managementHeaderRow}>
            <Text style={styles.sheetSubheading}>Existing Sections</Text>
            {loadingManageData ? (
              <ActivityIndicator color={colors.principal} size="small" />
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectChips}
            style={{ marginBottom: spacing.md }}
          >
            <Pressable
              style={[
                styles.subjectChip,
                !selectedSectionFilterClassId && styles.subjectChipActive,
              ]}
              onPress={() => setSelectedSectionFilterClassId("")}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  !selectedSectionFilterClassId && styles.subjectChipTextActive,
                ]}
              >
                All Classes
              </Text>
            </Pressable>
            {classes.map((item) => {
              const active = selectedSectionFilterClassId === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.subjectChip,
                    active && styles.subjectChipActive,
                  ]}
                  onPress={() => setSelectedSectionFilterClassId(item.id)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      active && styles.subjectChipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredManagedSections.length === 0 ? (
            <Text style={styles.emptyManagementText}>
              No sections found for the selected filter.
            </Text>
          ) : (
            filteredManagedSections.map((item) => (
              <View key={item.id} style={styles.managementCard}>
                <View style={styles.managementCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.managementTitle}>
                      {item.academic_class.name} · Section {item.name}
                    </Text>
                    <Text style={styles.managementMeta}>
                      {item.class_teacher?.name ?? "No class teacher"} · Parent
                      queries {item.parent_query_enabled ? "on" : "off"}
                    </Text>
                  </View>
                  <View style={styles.managementActions}>
                    <Pressable onPress={() => openEditSectionSheet(item)}>
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colors.principal}
                      />
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteSection(item)}>
                      {deletingSectionId === item.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.danger}
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* Logout confirm dialog */}
      <Modal
        visible={showLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogout(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Logout</Text>
            <Text style={styles.dialogBody}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.dialogBtns}>
              <Pressable
                style={styles.dialogCancelBtn}
                onPress={() => setShowLogout(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dialogLogoutBtn} onPress={handleLogout}>
                <Text style={styles.dialogLogoutText}>Logout</Text>
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
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  // School card
  schoolCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  schoolInfo: { flex: 1 },
  schoolName: {
    ...(typography.h2 as object),
    fontWeight: "600",
    color: colors.textPrimary,
  },
  schoolUrl: {
    ...(typography.caption as object),
    color: colors.textMuted,
    fontFamily: "monospace",
    marginTop: spacing.xs,
  },
  // Settings section
  section: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    ...(typography.label as object),
    color: colors.textMuted,
  },
  sectionBody: { paddingHorizontal: spacing.lg },
  // Settings row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  rowLabel: {
    ...(typography.body as object),
    color: colors.textPrimary,
    flex: 1,
  },
  rowValue: { ...(typography.body as object), color: colors.textMuted },
  rowIconLabel: { flexDirection: "row", alignItems: "center", flex: 1 },
  // Logout
  logoutBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  logoutBtnText: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.danger,
  },
  // Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xxl,
    width: "100%",
  },
  dialogTitle: {
    ...(typography.h2 as object),
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  dialogBody: {
    ...(typography.body as object),
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  dialogBtns: { flexDirection: "row", gap: spacing.md },
  dialogCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCancelText: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.textSecondary,
  },
  dialogLogoutBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogLogoutText: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.surface,
  },
  // Shared sheet styles
  sheetTitle: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sheetSubtext: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  sheetSubheading: {
    ...(typography.body as object),
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sheetFieldLabel: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  downloadLink: {
    ...(typography.body as object),
    color: colors.principal,
    fontWeight: "500",
    textDecorationLine: "underline",
    marginBottom: spacing.md,
  },
  uploadBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.principal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  uploadBtnDisabled: {
    opacity: 0.7,
  },
  uploadBtnText: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.surface,
  },
  uploadStatusText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    textAlign: "center",
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  subjectChips: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  subjectChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  subjectChipActive: {
    borderColor: colors.principal,
    backgroundColor: colors.principal,
  },
  subjectChipText: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    fontWeight: "500",
  },
  subjectChipTextActive: {
    color: colors.surface,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    fontWeight: "500",
  },
  sheetBtns: { flexDirection: "row", gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.textSecondary,
  },
  saveBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.principal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  saveBtnText: {
    ...(typography.h3 as object),
    fontWeight: "500",
    color: colors.surface,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: {
    ...(typography.body as object),
    color: colors.success,
    fontWeight: "500",
  },
  sectionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionChipActive: {
    backgroundColor: colors.principal,
    borderColor: colors.principal,
  },
  sectionChipText: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textSecondary,
  },
  sectionChipTextActive: { color: colors.surface },
  inlineToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  managementHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  managementCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  managementCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  managementActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  managementTitle: {
    ...(typography.body as object),
    fontWeight: "600",
    color: colors.textPrimary,
  },
  managementMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  managementHintText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  emptyManagementText: {
    ...(typography.body as object),
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
