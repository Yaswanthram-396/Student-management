import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  fetchTeacherExamOverview,
  fetchTeacherSectionDetail,
  fetchTeacherSectionStudents,
  type ExamOverview,
  type SectionSubjectDetail,
  type SubjectAvg,
  type TeacherSectionStudent,
} from "../services/teacher-results";
import type { RiskLabel } from "../types/analytics";

const ACCENT = "#185FA5";
const GREEN = "#16825D";
const AMBER = "#C76A00";
const RED = "#D92D20";
const INK = "#101828";
const MUTED = "#667085";
const LINE = "#EAECF0";
const BG = "#F6F8FB";
const SURFACE = "#FFFFFF";
const PROGRESS_COLORS = [ACCENT, GREEN, "#7A5AF8", "#C76A00", "#0E9384"];
const RISK_META: Record<RiskLabel, { color: string; bg: string; icon: string }> = {
  SAFE: { color: GREEN, bg: "#EAF7F1", icon: "checkmark-circle-outline" },
  WATCH: { color: AMBER, bg: "#FFF5E6", icon: "eye-outline" },
  ALERT: { color: RED, bg: "#FEEDEB", icon: "alert-circle-outline" },
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/teacher/results" as any);
}

function safeParam(value: string) {
  return encodeURIComponent(value);
}

function LoadingState() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.centered}>
        <ActivityIndicator color={ACCENT} />
        <Text style={styles.centeredText}>Loading section analytics</Text>
      </View>
    </SafeAreaView>
  );
}

function FailureState({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.centered}>
        <View style={styles.failureIcon}>
          <Ionicons name="alert-circle-outline" size={30} color={RED} />
        </View>
        <Text style={styles.failureTitle}>Section analytics could not load</Text>
        <Pressable style={styles.primaryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.headerRow}>
      <Pressable style={styles.backButton} onPress={goBack}>
        <Ionicons name="chevron-back" size={22} color={INK} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function SubjectComparison({
  subjects,
  onSubjectPress,
}: {
  subjects: SectionSubjectDetail[];
  onSubjectPress: (subject: SectionSubjectDetail) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons name="git-compare-outline" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.cardTitle}>Section Details</Text>
          <Text style={styles.cardSubtitle}>Subject average compared with class average</Text>
        </View>
      </View>

      {subjects.map((subject) => {
        const positive = subject.delta >= 0;
        return (
          <Pressable
            key={subject.subject_id}
            onPress={() => onSubjectPress(subject)}
            style={({ pressed }) => [styles.deltaRow, pressed && styles.pressed]}
          >
            <View style={styles.deltaMain}>
              <Text style={styles.deltaSubject}>{subject.subject_name}</Text>
              <Text style={styles.deltaSubtext}>
                Section {subject.section_avg.toFixed(1)} - Class {subject.class_avg.toFixed(1)}
              </Text>
            </View>
            <View style={[styles.deltaPill, { backgroundColor: positive ? "#EAF7F1" : "#FEEDEB" }]}>
              <Ionicons
                name={positive ? "trending-up-outline" : "trending-down-outline"}
                size={14}
                color={positive ? GREEN : RED}
              />
              <Text style={[styles.deltaText, { color: positive ? GREEN : RED }]}>
                {positive ? "+" : ""}{subject.delta.toFixed(1)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function SubjectAverages({
  subjects,
  onSubjectPress,
}: {
  subjects: SubjectAvg[];
  onSubjectPress: (subject: SubjectAvg) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons name="bar-chart-outline" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.cardTitle}>Subject Averages</Text>
          <Text style={styles.cardSubtitle}>Open section question analysis</Text>
        </View>
      </View>

      <View style={styles.subjectList}>
        {subjects.map((subject, index) => {
          const percent = (subject.avg / subject.max_marks) * 100;
          const color = PROGRESS_COLORS[index % PROGRESS_COLORS.length];

          return (
            <Pressable
              key={subject.subject_id}
              onPress={() => onSubjectPress(subject)}
              style={({ pressed }) => [styles.subjectRow, pressed && styles.pressed]}
            >
              <View style={styles.subjectHeader}>
                <View style={styles.subjectNameRow}>
                  <View style={[styles.subjectDot, { backgroundColor: color }]} />
                  <Text style={styles.subjectName}>{subject.subject_name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
              </View>
              <View style={styles.subjectMetricRow}>
                <Text style={styles.subjectMarks}>
                  <Text style={styles.subjectMarksStrong}>{subject.avg.toFixed(1)}</Text> / {subject.max_marks}
                </Text>
                <Text style={styles.subjectPercent}>{percent.toFixed(0)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getClassAverage(subject: TeacherSectionStudent["subject_details"][number], details: SectionSubjectDetail[]) {
  const match = details.find((item) =>
    (subject.subject_id && item.subject_id === subject.subject_id) ||
    item.subject_name.toLowerCase() === subject.subject_name.toLowerCase()
  );
  return match?.class_avg;
}

function RiskBadge({ risk }: { risk: RiskLabel }) {
  const meta = RISK_META[risk] ?? RISK_META.SAFE;
  return (
    <View style={[styles.riskBadge, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon as any} size={12} color={meta.color} />
      <Text style={[styles.riskText, { color: meta.color }]}>{risk}</Text>
    </View>
  );
}

function StudentPerformanceRow({
  student,
  expanded,
  onPress,
  classDetails,
  onSubjectPress,
}: {
  student: TeacherSectionStudent;
  expanded: boolean;
  onPress: () => void;
  classDetails: SectionSubjectDetail[];
  onSubjectPress?: (subjectId: string, subjectName: string) => void;
}) {
  const initials = student.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "ST";

  return (
    <View style={[styles.studentCard, expanded && styles.studentCardExpanded]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.studentPress, pressed && styles.pressed]}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>{initials}</Text>
        </View>
        <View style={styles.studentMain}>
          <Text style={styles.studentName}>{student.name}</Text>
          <View style={styles.studentMetaRow}>
            <Text style={styles.studentRef}>{student.student_ref_id}</Text>
            <RiskBadge risk={student.overall_risk} />
          </View>
        </View>
        <View style={styles.studentScoreWrap}>
          <Text style={styles.studentTotal}>{student.total_pct.toFixed(1)}%</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#98A2B3" />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.studentDropdown}>
          <Text style={styles.dropdownHeader}>Subject Breakdown</Text>
          {student.subject_details.length === 0 ? (
            <Text style={styles.emptyInlineText}>No subject scores available for this student.</Text>
          ) : (
            student.subject_details.map((subject) => {
              const classAvg = getClassAverage(subject, classDetails);
              const delta = classAvg === undefined ? undefined : subject.subject_percentage - classAvg;
              const positive = (delta ?? 0) >= 0;
              const risk = student.subject_risk[subject.subject_name] as RiskLabel | undefined;
              const canDrill = !!subject.subject_id && !!onSubjectPress;

              return (
                <Pressable
                  key={`${student.student_id}-${subject.subject_id ?? subject.subject_name}`}
                  onPress={canDrill ? () => onSubjectPress!(subject.subject_id!, subject.subject_name) : undefined}
                  style={({ pressed }) => [styles.subjectScoreRow, canDrill && pressed && styles.pressed]}
                >
                  <View style={styles.subjectScoreTop}>
                    <Text style={styles.subjectScoreName}>{subject.subject_name}</Text>
                    <View style={styles.subjectScoreTopRight}>
                      {risk && <RiskBadge risk={risk} />}
                      {canDrill && <Ionicons name="chevron-forward" size={14} color="#98A2B3" />}
                    </View>
                  </View>
                  <View style={styles.subjectScoreMetric}>
                    <Text style={styles.subjectScoreValue}>{subject.subject_percentage.toFixed(1)}%</Text>
                    <Text style={styles.subjectScoreClass}>
                      Class avg {classAvg === undefined ? "NA" : `${classAvg.toFixed(1)}%`}
                    </Text>
                    {delta !== undefined && (
                      <Text style={[styles.subjectScoreDelta, { color: positive ? GREEN : RED }]}>
                        {positive ? "+" : ""}{delta.toFixed(1)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(Math.max(subject.subject_percentage, 0), 100)}%`,
                          backgroundColor: risk ? RISK_META[risk].color : ACCENT,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

function StudentPerformancePanel({
  loading,
  error,
  students,
  query,
  expandedStudentId,
  classDetails,
  onChangeQuery,
  onToggleStudent,
  onRetry,
  onSubjectPress,
}: {
  loading: boolean;
  error: boolean;
  students: TeacherSectionStudent[];
  query: string;
  expandedStudentId: string | null;
  classDetails: SectionSubjectDetail[];
  onChangeQuery: (value: string) => void;
  onToggleStudent: (studentId: string) => void;
  onRetry: () => void;
  onSubjectPress?: (studentId: string, subjectId: string, subjectName: string) => void;
}) {
  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(needle) ||
      student.student_ref_id.toLowerCase().includes(needle) ||
      student.subject_details.some((subject) => subject.subject_name.toLowerCase().includes(needle))
    );
  }, [query, students]);

  const alertCount = students.filter((student) => student.overall_risk === "ALERT").length;
  const watchCount = students.filter((student) => student.overall_risk === "WATCH").length;
  const safeCount = students.filter((student) => student.overall_risk === "SAFE").length;

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons name="people-circle-outline" size={18} color={ACCENT} />
        </View>
        <View style={styles.cardTitleText}>
          <Text style={styles.cardTitle}>Student Performance</Text>
          <Text style={styles.cardSubtitle}>Tap a student to compare subject scores with class averages</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={17} color="#98A2B3" />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search students, IDs, or subjects"
          placeholderTextColor="#98A2B3"
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {!!query && (
          <Pressable onPress={() => onChangeQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#98A2B3" />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.bottomState}>
          <ActivityIndicator color={ACCENT} />
          <Text style={styles.bottomStateText}>Loading students</Text>
        </View>
      ) : error ? (
        <View style={styles.bottomState}>
          <Ionicons name="cloud-offline-outline" size={28} color={RED} />
          <Text style={styles.bottomStateTitle}>Student scores could not load</Text>
          <Pressable style={styles.retrySmallButton} onPress={onRetry}>
            <Text style={styles.retrySmallText}>Try Again</Text>
          </Pressable>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.bottomState}>
          <Ionicons name="person-outline" size={30} color="#98A2B3" />
          <Text style={styles.bottomStateTitle}>No student scores available</Text>
          <Text style={styles.bottomStateText}>Scores will appear here after analytics are processed.</Text>
        </View>
      ) : (
        <>
          <View style={styles.riskSummaryRow}>
            <View style={[styles.riskSummaryChip, { backgroundColor: RISK_META.ALERT.bg }]}>
              <Text style={[styles.riskSummaryCount, { color: RISK_META.ALERT.color }]}>{alertCount}</Text>
              <Text style={[styles.riskSummaryLabel, { color: RISK_META.ALERT.color }]}>Alert</Text>
            </View>
            <View style={[styles.riskSummaryChip, { backgroundColor: RISK_META.WATCH.bg }]}>
              <Text style={[styles.riskSummaryCount, { color: RISK_META.WATCH.color }]}>{watchCount}</Text>
              <Text style={[styles.riskSummaryLabel, { color: RISK_META.WATCH.color }]}>Watch</Text>
            </View>
            <View style={[styles.riskSummaryChip, { backgroundColor: RISK_META.SAFE.bg }]}>
              <Text style={[styles.riskSummaryCount, { color: RISK_META.SAFE.color }]}>{safeCount}</Text>
              <Text style={[styles.riskSummaryLabel, { color: RISK_META.SAFE.color }]}>Safe</Text>
            </View>
          </View>

          {filteredStudents.length === 0 ? (
            <View style={styles.bottomState}>
              <Ionicons name="search-outline" size={28} color="#98A2B3" />
              <Text style={styles.bottomStateTitle}>No matching students</Text>
            </View>
          ) : (
            <View style={styles.studentList}>
              {filteredStudents.map((student) => (
                <StudentPerformanceRow
                  key={student.student_id}
                  student={student}
                  expanded={expandedStudentId === student.student_id}
                  onPress={() => onToggleStudent(student.student_id)}
                  classDetails={classDetails}
                  onSubjectPress={onSubjectPress
                    ? (subjectId, subjectName) => onSubjectPress(student.student_id, subjectId, subjectName)
                    : undefined}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function SectionAnalyticsScreen() {
  const params = useLocalSearchParams();
  const examId = getParam(params.examId);
  const examName = getParam(params.examName);
  const sectionId = getParam(params.sectionId);
  const sectionName = getParam(params.sectionName);
  const sectionAvg = Number(getParam(params.sectionAvg) || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [details, setDetails] = useState<SectionSubjectDetail[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState(false);
  const [students, setStudents] = useState<TeacherSectionStudent[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [overviewData, detailData] = await Promise.all([
        fetchTeacherExamOverview(examId),
        fetchTeacherSectionDetail(examId, sectionId),
      ]);
      setOverview(overviewData);
      setDetails(detailData);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [examId, sectionId]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(false);
    try {
      const data = await fetchTeacherSectionStudents(examId, sectionId);
      setStudents(data);
    } catch (err) {
      console.error(err);
      setStudentsError(true);
    } finally {
      setStudentsLoading(false);
    }
  }, [examId, sectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function openSubject(subjectId: string, subjectName: string) {
    router.push(
      `/teacher-question-analysis?examId=${safeParam(examId)}&examName=${safeParam(examName)}&sectionId=${safeParam(sectionId)}&sectionName=${safeParam(sectionName)}&subjectId=${safeParam(subjectId)}&subjectName=${safeParam(subjectName)}` as any
    );
  }

  function openStudentSubject(studentId: string, subjectId: string, subjectName: string) {
    const student = students.find(s => s.student_id === studentId);
    router.push(
      `/teacher-student-subject?studentId=${safeParam(studentId)}&studentName=${safeParam(student?.name ?? '')}&studentRefId=${safeParam(student?.student_ref_id ?? '')}&subjectId=${safeParam(subjectId)}&subjectName=${safeParam(subjectName)}&examId=${safeParam(examId)}&examName=${safeParam(examName)}` as any
    );
  }

  if (loading) return <LoadingState />;
  if (error || !overview) return <FailureState onRetry={loadData} />;

  const sectionSubjects: SubjectAvg[] = details.map((subject) => ({
    subject_id: subject.subject_id,
    subject_name: subject.subject_name,
    avg: subject.section_avg,
    max_marks: 100,
  }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title={`Section ${sectionName}`} subtitle={examName} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="people-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>Section average</Text>
              <Text style={styles.heroTitle}>{sectionAvg.toFixed(1)}%</Text>
              <Text style={styles.heroMeta}>{overview.exam.type} exam</Text>
            </View>
          </View>
        </View>

        <SubjectComparison
          subjects={details}
          onSubjectPress={(subject) => openSubject(subject.subject_id, subject.subject_name)}
        />
        <SubjectAverages
          subjects={sectionSubjects}
          onSubjectPress={(subject) => openSubject(subject.subject_id, subject.subject_name)}
        />
        <StudentPerformancePanel
          loading={studentsLoading}
          error={studentsError}
          students={students}
          query={studentQuery}
          expandedStudentId={expandedStudentId}
          classDetails={details}
          onChangeQuery={setStudentQuery}
          onToggleStudent={(studentId) => setExpandedStudentId((current) => current === studentId ? null : studentId)}
          onRetry={loadStudents}
          onSubjectPress={openStudentSubject}
        />
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 18, paddingBottom: 28 },
  pressed: { opacity: 0.76 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  centeredText: { color: MUTED, fontSize: 13, fontWeight: "700" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  pageTitle: { fontSize: 20, fontWeight: "900", color: INK },
  pageSubtitle: { marginTop: 2, fontSize: 13, color: MUTED },

  heroCard: { backgroundColor: ACCENT, borderRadius: 18, padding: 18 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleWrap: { flex: 1 },
  heroEyebrow: { color: "#D5E7F8", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  heroTitle: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", marginTop: 2 },
  heroMeta: { color: "#D5E7F8", fontSize: 13, marginTop: 3 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
    gap: 12,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  cardTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EAF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: INK },
  cardSubtitle: { fontSize: 12, color: MUTED, marginTop: 2 },

  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
  },
  deltaMain: { flex: 1 },
  deltaSubject: { color: INK, fontSize: 15, fontWeight: "900" },
  deltaSubtext: { color: MUTED, fontSize: 12, marginTop: 3 },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  deltaText: { fontSize: 12, fontWeight: "900" },

  subjectList: { gap: 12 },
  subjectRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
    gap: 10,
  },
  subjectHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subjectNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectDot: { width: 9, height: 9, borderRadius: 5 },
  subjectName: { fontSize: 15, color: INK, fontWeight: "800" },
  subjectMetricRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subjectMarks: { color: MUTED, fontSize: 12 },
  subjectMarksStrong: { color: INK, fontSize: 14, fontWeight: "900" },
  subjectPercent: { color: ACCENT, fontSize: 12, fontWeight: "900" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "#EAECF0", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },

  searchBox: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: INK, fontSize: 14, fontWeight: "700", paddingVertical: 10 },
  riskSummaryRow: { flexDirection: "row", gap: 8 },
  riskSummaryChip: { flex: 1, borderRadius: 13, paddingVertical: 12, alignItems: "center", gap: 2 },
  riskSummaryCount: { fontSize: 18, fontWeight: "900" },
  riskSummaryLabel: { fontSize: 11, fontWeight: "900" },
  studentList: { gap: 12 },
  studentCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    overflow: "hidden",
  },
  studentCardExpanded: { borderColor: ACCENT, backgroundColor: "#F3F8FE" },
  studentPress: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#EAF2FB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  studentAvatarText: { color: ACCENT, fontSize: 15, fontWeight: "900" },
  studentMain: { flex: 1, minWidth: 0, gap: 4 },
  studentMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  studentName: { color: INK, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  studentRef: { color: MUTED, fontSize: 12, fontWeight: "700" },
  studentScoreWrap: { alignItems: "flex-end", gap: 5, flexShrink: 0 },
  studentTotal: { color: ACCENT, fontSize: 18, fontWeight: "900" },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  riskText: { fontSize: 10, fontWeight: "900" },
  dropdownHeader: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  studentDropdown: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: "#F8FAFC",
    padding: 16,
    gap: 12,
  },
  subjectScoreRow: { gap: 10, backgroundColor: SURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: LINE },
  subjectScoreTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  subjectScoreTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  subjectScoreName: { color: INK, fontSize: 14, fontWeight: "900", flex: 1 },
  subjectScoreMetric: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  subjectScoreValue: { color: INK, fontSize: 18, fontWeight: "900" },
  subjectScoreClass: { color: MUTED, fontSize: 12, fontWeight: "700" },
  subjectScoreDelta: { fontSize: 13, fontWeight: "900" },
  bottomState: {
    minHeight: 118,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  bottomStateTitle: { color: INK, fontSize: 15, fontWeight: "900", textAlign: "center" },
  bottomStateText: { color: MUTED, fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  emptyInlineText: { color: MUTED, fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 6 },
  retrySmallButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retrySmallText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },

  failureIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FEEDEB",
    alignItems: "center",
    justifyContent: "center",
  },
  failureTitle: { color: INK, fontSize: 18, fontWeight: "900", textAlign: "center" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
