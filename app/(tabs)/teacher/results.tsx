import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchTeacherExamOverview,
  fetchTeacherExams,
  type Exam,
  type ExamOverview,
  type SectionAvg,
  type SubjectAvg,
} from "../../../services/teacher-results";

const ACCENT = "#185FA5";
const GREEN = "#16825D";
const AMBER = "#C76A00";
const RED = "#D92D20";
const INK = "#101828";
const MUTED = "#667085";
const LINE = "#EAECF0";
const BG = "#F6F8FB";
const SURFACE = "#FFFFFF";
const PROGRESS_COLORS = [ACCENT, GREEN, "#7A5AF8", AMBER, "#0E9384"];

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getOverallAverage(subjects: SubjectAvg[]) {
  if (!subjects.length) return 0;
  const ratioSum = subjects.reduce((sum, subject) => sum + subject.avg / subject.max_marks, 0);
  return (ratioSum / subjects.length) * 100;
}

function getExamStatusMeta(status: Exam["analytics_status"]) {
  switch (status) {
    case "DONE":
      return { label: "Ready", color: GREEN, bg: "#EAF7F1", icon: "checkmark-circle" };
    case "PROCESSING":
      return { label: "Processing", color: AMBER, bg: "#FFF5E6", icon: "time-outline" };
    case "PENDING":
      return { label: "Pending", color: AMBER, bg: "#FFF5E6", icon: "hourglass-outline" };
    case "CREATED":
      return { label: "Waiting for upload", color: "#475467", bg: "#F2F4F7", icon: "cloud-upload-outline" };
    case "FAILED":
      return { label: "Failed", color: RED, bg: "#FEEDEB", icon: "alert-circle-outline" };
  }
}

function safeParam(value: string) {
  return encodeURIComponent(value);
}

function SkeletonBlock({ style }: { style?: object }) {
  return <View style={[styles.skeletonBlock, style]} />;
}

function LoadingState() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <SkeletonBlock style={styles.skeletonTitle} />
            <SkeletonBlock style={styles.skeletonSubtitle} />
          </View>
          <SkeletonBlock style={styles.skeletonIcon} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examRail}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.examCardSkeleton}>
              <SkeletonBlock style={{ width: 118, height: 16 }} />
              <SkeletonBlock style={{ width: 86, height: 12 }} />
              <SkeletonBlock style={{ width: 92, height: 24, borderRadius: 12 }} />
            </View>
          ))}
        </ScrollView>
        <View style={styles.heroCard}>
          <View style={styles.loadingHero}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.loadingText}>Preparing analytics preview</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FailureState({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.failureWrap}>
        <View style={styles.failureIcon}>
          <Ionicons name="cloud-offline-outline" size={34} color={RED} />
        </View>
        <Text style={styles.failureTitle}>Analytics could not load</Text>
        <Text style={styles.failureText}>Try again to reload the exam dashboard.</Text>
        <Pressable style={styles.primaryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: Exam["analytics_status"] }) {
  const meta = getExamStatusMeta(status);
  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon as any} size={13} color={meta.color} />
      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function ExamCard({ exam, selected, onPress }: { exam: Exam; selected: boolean; onPress: () => void }) {
  const ready = exam.analytics_status === "DONE";

  return (
    <Pressable
      onPress={ready ? onPress : undefined}
      style={({ pressed }) => [
        styles.examCard,
        selected && styles.examCardSelected,
        !ready && styles.examCardDisabled,
        pressed && ready && styles.pressed,
      ]}
    >
      <View style={styles.examCardTop}>
        <View style={styles.examTypeIcon}>
          <Ionicons name={exam.type === "CLASS" ? "school-outline" : "people-outline"} size={18} color={ACCENT} />
        </View>
        <Text style={styles.examTypeText}>{exam.type}</Text>
      </View>
      <Text style={styles.examName} numberOfLines={2}>{exam.exam_name}</Text>
      <Text style={styles.examDate}>{formatDate(exam.exam_date)}</Text>
      <StatusPill status={exam.analytics_status} />
    </Pressable>
  );
}

function HeroOverview({ overview }: { overview: ExamOverview }) {
  const overallAvg = getOverallAverage(overview.class_avgs);
  const weakestSubject = [...overview.class_avgs].sort(
    (a, b) => a.avg / a.max_marks - b.avg / b.max_marks
  )[0];

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}>
          <Ionicons name="analytics-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.heroTitleWrap}>
          <Text style={styles.heroEyebrow}>Exam overview</Text>
          <Text style={styles.heroTitle}>{overview.exam.exam_name}</Text>
          <Text style={styles.heroMeta}>{formatDate(overview.exam.exam_date)} - {overview.exam.type}</Text>
        </View>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{overallAvg.toFixed(0)}%</Text>
          <Text style={styles.heroStatLabel}>Class avg</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{overview.sections.length}</Text>
          <Text style={styles.heroStatLabel}>Sections</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{weakestSubject?.subject_name ?? "NA"}</Text>
          <Text style={styles.heroStatLabel}>Needs focus</Text>
        </View>
      </View>
    </View>
  );
}

function SectionPerformance({
  exam,
  sections,
}: {
  exam: Exam;
  sections: SectionAvg[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleSections = showAll ? sections : sections.slice(0, 4);
  const hasMore = sections.length > visibleSections.length;

  function openSection(section: SectionAvg) {
    router.push(
      `/teacher-section-analytics?examId=${safeParam(exam.id)}&examName=${safeParam(exam.exam_name)}&sectionId=${safeParam(section.section_id)}&sectionName=${safeParam(section.section_name)}&sectionAvg=${section.avg}` as any
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons name="grid-outline" size={18} color={ACCENT} />
        </View>
        <View style={styles.cardTitleText}>
          <Text style={styles.cardTitle}>Section Performance</Text>
          <Text style={styles.cardSubtitle}>Open a section for subject comparison</Text>
        </View>
        {sections.length > 4 && (
          <Pressable style={styles.textButton} onPress={() => setShowAll((value) => !value)}>
            <Text style={styles.textButtonText}>{showAll ? "Show less" : "View all"}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.sectionGrid}>
        {visibleSections.map((section) => (
          <Pressable
            key={section.section_id}
            onPress={() => openSection(section)}
            style={({ pressed }) => [styles.sectionBox, pressed && styles.pressed]}
          >
            <View style={styles.sectionBoxTop}>
              <Text style={styles.sectionName}>Section {section.section_name}</Text>
              <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
            </View>
            <Text style={styles.sectionAvg}>{section.avg.toFixed(1)}%</Text>
            <Text style={styles.sectionHint}>average score</Text>
          </Pressable>
        ))}
      </View>

      {hasMore && (
        <Pressable style={styles.viewMoreButton} onPress={() => setShowAll(true)}>
          <Text style={styles.viewMoreText}>View {sections.length - visibleSections.length} more sections</Text>
          <Ionicons name="chevron-down" size={16} color={ACCENT} />
        </Pressable>
      )}
    </View>
  );
}

function SubjectAverages({ exam, subjects }: { exam: Exam; subjects: SubjectAvg[] }) {
  function openSubject(subject: SubjectAvg) {
    router.push(
      `/teacher-question-analysis?examId=${safeParam(exam.id)}&examName=${safeParam(exam.exam_name)}&subjectId=${safeParam(subject.subject_id)}&subjectName=${safeParam(subject.subject_name)}` as any
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons name="bar-chart-outline" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.cardTitle}>Subject Averages</Text>
          <Text style={styles.cardSubtitle}>Open class-level question analysis</Text>
        </View>
      </View>
      <View style={styles.subjectList}>
        {subjects.map((subject, index) => {
          const percent = (subject.avg / subject.max_marks) * 100;
          const color = PROGRESS_COLORS[index % PROGRESS_COLORS.length];

          return (
            <Pressable
              key={subject.subject_id}
              onPress={() => openSubject(subject)}
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

function TopStudents({ students }: { students: ExamOverview["top_students"] }) {
  function getRankColor(rank: number) {
    if (rank === 1) return "#EAAA08";
    if (rank === 2) return "#98A2B3";
    if (rank === 3) return "#B54708";
    return "#D0D5DD";
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons name="trophy-outline" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.cardTitle}>Top Students</Text>
          <Text style={styles.cardSubtitle}>Ranked by total marks</Text>
        </View>
      </View>
      {students.map((student, index) => (
        <View key={student.student_id} style={[styles.studentRow, index < students.length - 1 && styles.rowBorder]}>
          <View style={[styles.rankBadge, { backgroundColor: student.rank <= 3 ? getRankColor(student.rank) : "#F2F4F7" }]}>
            {student.rank <= 3 ? (
              <Ionicons name="trophy" size={15} color="#FFFFFF" />
            ) : (
              <Text style={styles.rankNumber}>{student.rank}</Text>
            )}
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentId}>{student.student_ref_id}</Text>
          </View>
          <View style={styles.studentMarks}>
            <Text style={styles.studentMarksValue}>{student.total_marks}</Text>
            <Text style={styles.studentMarksLabel}>marks</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [overview, setOverview] = useState<ExamOverview | null>(null);

  const readyExams = useMemo(() => exams.filter((exam) => exam.analytics_status === "DONE"), [exams]);

  const loadOverview = useCallback(async (examId: string) => {
    try {
      const data = await fetchTeacherExamOverview(examId);
      setOverview(data);
    } catch (err) {
      console.error(err);
      setOverview(null);
      setError(true);
    }
  }, []);

  const loadExams = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setRefreshing(isRefresh);
    setError(false);

    try {
      const data = await fetchTeacherExams();
      const sorted = [...data].sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
      setExams(sorted);
      const nextExamId = selectedExamId ?? sorted.find((exam) => exam.analytics_status === "DONE")?.id ?? null;
      setSelectedExamId(nextExamId);
      if (nextExamId) await loadOverview(nextExamId);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadOverview, selectedExamId]);

  useFocusEffect(
    useCallback(() => {
      loadExams();
    }, [loadExams])
  );

  async function selectExam(examId: string) {
    setSelectedExamId(examId);
    await loadOverview(examId);
  }

  if (loading) return <LoadingState />;
  if (error) return <FailureState onRetry={() => loadExams()} />;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadExams(true)}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>Exam Results</Text>
            <Text style={styles.pageSubtitle}>Analytics for assigned classes and sections</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="bar-chart" size={24} color={ACCENT} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examRail}>
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              selected={exam.id === selectedExamId}
              onPress={() => selectExam(exam.id)}
            />
          ))}
        </ScrollView>

        {!readyExams.length ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={42} color="#98A2B3" />
            <Text style={styles.emptyTitle}>No completed analytics yet</Text>
            <Text style={styles.emptyText}>Completed exams will appear here when processing is finished.</Text>
          </View>
        ) : overview ? (
          <>
            <HeroOverview overview={overview} />
            <SectionPerformance exam={overview.exam} sections={overview.sections} />
            <SubjectAverages exam={overview.exam} subjects={overview.class_avgs} />
            <TopStudents students={overview.top_students} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 28 },
  pressed: { opacity: 0.76 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  headerText: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: INK },
  pageSubtitle: { marginTop: 3, fontSize: 14, color: MUTED, lineHeight: 20 },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EAF2FB",
    alignItems: "center",
    justifyContent: "center",
  },

  skeletonBlock: { backgroundColor: "#EAECF0", borderRadius: 8 },
  skeletonTitle: { width: 160, height: 24, marginBottom: 10 },
  skeletonSubtitle: { width: 230, height: 14 },
  skeletonIcon: { width: 46, height: 46, borderRadius: 14 },
  examCardSkeleton: {
    width: 180,
    minHeight: 142,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  loadingHero: { minHeight: 118, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  examRail: { gap: 12, paddingRight: 10 },
  examCard: {
    width: 180,
    minHeight: 146,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
    gap: 9,
  },
  examCardSelected: { borderColor: ACCENT, backgroundColor: "#F3F8FE" },
  examCardDisabled: { opacity: 0.72 },
  examCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  examTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FB",
  },
  examTypeText: { fontSize: 11, fontWeight: "800", color: MUTED },
  examName: { fontSize: 16, fontWeight: "800", color: INK, lineHeight: 21 },
  examDate: { fontSize: 12, color: MUTED },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: "800" },

  heroCard: {
    backgroundColor: ACCENT,
    borderRadius: 18,
    padding: 18,
    gap: 18,
  },
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
  heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900", marginTop: 2 },
  heroMeta: { color: "#D5E7F8", fontSize: 13, marginTop: 3 },
  heroStats: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
  },
  heroStat: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  heroStatValue: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  heroStatLabel: { color: "#D5E7F8", fontSize: 11, marginTop: 4, fontWeight: "700" },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.18)" },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
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
  textButton: { paddingHorizontal: 8, paddingVertical: 6 },
  textButtonText: { color: ACCENT, fontSize: 12, fontWeight: "900" },

  sectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sectionBox: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  sectionBoxTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionName: { fontSize: 13, color: MUTED, fontWeight: "700" },
  sectionAvg: { fontSize: 24, color: INK, fontWeight: "900", marginTop: 8 },
  sectionHint: { fontSize: 11, color: "#98A2B3", marginTop: 4 },
  viewMoreButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5E7F8",
    backgroundColor: "#F3F8FE",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  viewMoreText: { color: ACCENT, fontSize: 13, fontWeight: "900" },

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

  studentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: LINE },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rankNumber: { color: MUTED, fontWeight: "900" },
  studentInfo: { flex: 1 },
  studentName: { color: INK, fontSize: 14, fontWeight: "800" },
  studentId: { color: MUTED, fontSize: 12, marginTop: 2 },
  studentMarks: { alignItems: "flex-end" },
  studentMarksValue: { color: ACCENT, fontSize: 16, fontWeight: "900" },
  studentMarksLabel: { color: MUTED, fontSize: 11 },

  failureWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 14,
  },
  failureIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#FEEDEB",
    alignItems: "center",
    justifyContent: "center",
  },
  failureTitle: { color: INK, fontSize: 20, fontWeight: "900", textAlign: "center" },
  failureText: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: "center" },
  primaryButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 28,
    gap: 8,
  },
  emptyTitle: { color: INK, fontSize: 16, fontWeight: "900" },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
