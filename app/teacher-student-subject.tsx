import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchStudentSubjectDrilldown,
  type StudentSubjectDrilldown,
} from "../services/teacher-results";
import type { PerformanceLabel, QuestionStatus, RiskLabel } from "../types/analytics";

// ── Design tokens (shared with other teacher screens) ─────────────────────────
const ACCENT = "#185FA5";
const GREEN  = "#16825D";
const AMBER  = "#C76A00";
const RED    = "#D92D20";
const INK    = "#101828";
const MUTED  = "#667085";
const LINE   = "#EAECF0";
const BG     = "#F6F8FB";
const SURFACE = "#FFFFFF";

// ── Lookup tables ─────────────────────────────────────────────────────────────
const RISK_META: Record<RiskLabel, { color: string; bg: string; icon: string }> = {
  SAFE:  { color: GREEN, bg: "#EAF7F1", icon: "checkmark-circle-outline" },
  WATCH: { color: AMBER, bg: "#FFF5E6", icon: "eye-outline" },
  ALERT: { color: RED,   bg: "#FEEDEB", icon: "alert-circle-outline" },
};

const PERF_META: Record<PerformanceLabel, { label: string; color: string }> = {
  EXCEPTIONAL:    { label: "Exceptional",    color: "#6941C6" },
  ABOVE_AVERAGE:  { label: "Above Average",  color: GREEN    },
  AVERAGE:        { label: "Average",        color: AMBER    },
  BELOW_AVERAGE:  { label: "Below Average",  color: "#C05621" },
  NEEDS_ATTENTION:{ label: "Needs Attention",color: RED      },
};

const Q_COLORS: Record<QuestionStatus, { bg: string; text: string }> = {
  C: { bg: GREEN,     text: "#FFFFFF" },
  W: { bg: RED,       text: "#FFFFFF" },
  U: { bg: "#D0D5DD", text: "#667085" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? "";
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/teacher/results" as any);
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Loading state ─────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.centeredText}>Loading subject analysis…</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function FailureState({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.centered}>
        <View style={styles.failureIconWrap}>
          <Ionicons name="cloud-offline-outline" size={34} color={RED} />
        </View>
        <Text style={styles.failureTitle}>Could not load subject data</Text>
        <Text style={styles.failureBody}>Check your connection and try again.</Text>
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color="#FFF" />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Back header ───────────────────────────────────────────────────────────────
function Header({ name, exam }: { name: string; exam: string }) {
  return (
    <View style={styles.headerRow}>
      <Pressable style={styles.backBtn} onPress={goBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={INK} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.headerSub}   numberOfLines={1}>{exam}</Text>
      </View>
    </View>
  );
}

// ── Hero card (blue) ──────────────────────────────────────────────────────────
function HeroCard({ data }: { data: StudentSubjectDrilldown }) {
  const { result, student, subject_name, exam } = data;
  const risk = RISK_META[result.risk_label] ?? RISK_META.WATCH;
  const pct  = result.percentage;

  return (
    <View style={styles.heroCard}>
      {/* top row */}
      <View style={styles.heroTop}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="book-outline" size={24} color="#FFF" />
        </View>
        <View style={styles.heroTitleWrap}>
          <Text style={styles.heroEyebrow}>Subject Analysis</Text>
          <Text style={styles.heroSubject}>{subject_name}</Text>
          <Text style={styles.heroMeta}>
            {student.class_name} · Section {student.section_name} · {formatDate(exam.exam_date)}
          </Text>
        </View>
        {/* risk badge */}
        <View style={[styles.heroRiskChip, { backgroundColor: risk.bg }]}>
          <Ionicons name={risk.icon as any} size={13} color={risk.color} />
          <Text style={[styles.heroRiskText, { color: risk.color }]}>
            {result.risk_label}
          </Text>
        </View>
      </View>

      {/* stats row */}
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatVal}>
            {result.total_marks}
            <Text style={styles.heroStatMax}>/{result.max_marks}</Text>
          </Text>
          <Text style={styles.heroStatLabel}>Marks</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatVal}>{pct.toFixed(1)}%</Text>
          <Text style={styles.heroStatLabel}>Score</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatVal}>#{result.exam_rank}</Text>
          <Text style={styles.heroStatLabel}>Rank</Text>
        </View>
      </View>

      {/* progress bar */}
      <View style={styles.heroProgressTrack}>
        <View style={[styles.heroProgressFill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>
    </View>
  );
}

// ── Score breakdown card ───────────────────────────────────────────────────────
function ScoreBreakdown({ result }: { result: StudentSubjectDrilldown["result"] }) {
  const total = result.correct + result.wrong + result.unattempted;

  const CHIPS = [
    { count: result.correct,     label: "Correct",  icon: "checkmark-circle",      bg: "#EAF7F1", color: GREEN },
    { count: result.wrong,       label: "Wrong",    icon: "close-circle",           bg: "#FEEDEB", color: RED   },
    { count: result.unattempted, label: "Skipped",  icon: "remove-circle-outline",  bg: "#F2F4F7", color: MUTED },
  ] as const;

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="pie-chart-outline" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          <Text style={styles.cardSub}>{total} questions answered</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        {CHIPS.map(({ count, label, icon, bg, color }) => (
          <View key={label} style={[styles.statChip, { backgroundColor: bg }]}>
            <Ionicons name={icon as any} size={20} color={color} />
            <Text style={[styles.statChipCount, { color }]}>{count}</Text>
            <Text style={[styles.statChipLabel, { color }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Performance card ──────────────────────────────────────────────────────────
function PerformanceCard({ result }: { result: StudentSubjectDrilldown["result"] }) {
  const perf   = PERF_META[result.performance_label] ?? { label: result.performance_label, color: MUTED };
  const z      = result.z_score;
  const zPlus  = z >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="trending-up-outline" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.cardTitle}>Performance</Text>
          <Text style={styles.cardSub}>Relative to class average</Text>
        </View>
      </View>

      <View style={styles.perfRow}>
        <View style={[styles.perfLabelChip, { backgroundColor: perf.color + "20" }]}>
          <Text style={[styles.perfLabelText, { color: perf.color }]}>{perf.label}</Text>
        </View>
        <View style={styles.zWrap}>
          <Text style={styles.zLabel}>z-score</Text>
          <Text style={[styles.zValue, { color: zPlus ? GREEN : RED }]}>
            {zPlus ? "+" : ""}{z.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Question response grid ────────────────────────────────────────────────────
function QuestionGrid({ questions }: { questions: StudentSubjectDrilldown["questions"] }) {
  if (!questions.length) return null;

  const correctCount    = questions.filter(q => q.status === "C").length;
  const wrongCount      = questions.filter(q => q.status === "W").length;
  const skippedCount    = questions.filter(q => q.status === "U").length;

  const LEGEND = [
    { status: "C", label: "Correct", color: GREEN },
    { status: "W", label: "Wrong",   color: RED   },
    { status: "U", label: "Skipped", color: MUTED },
  ] as const;

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="grid-outline" size={18} color={ACCENT} />
        </View>
        <View style={styles.cardTitleText}>
          <Text style={styles.cardTitle}>Question Responses</Text>
          <Text style={styles.cardSub}>
            {questions.length} questions · {correctCount}✓  {wrongCount}✗  {skippedCount}–
          </Text>
        </View>
      </View>

      {/* legend */}
      <View style={styles.legendRow}>
        {LEGEND.map(({ status, label, color }) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Q_COLORS[status].bg }]} />
            <Text style={[styles.legendText, { color }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* grid */}
      <View style={styles.qGrid}>
        {questions.map(q => {
          const { bg, text } = Q_COLORS[q.status];
          return (
            <View key={q.q_no} style={[styles.qBubble, { backgroundColor: bg }]}>
              <Text style={[styles.qBubbleNum, { color: text }]}>{q.q_no}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TeacherStudentSubjectScreen() {
  const params      = useLocalSearchParams();
  const studentId   = getParam(params.studentId);
  const studentName = getParam(params.studentName);
  const subjectId   = getParam(params.subjectId);
  const examId      = getParam(params.examId);
  const examName    = getParam(params.examName);

  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState(false);
  const [data,    setData   ] = useState<StudentSubjectDrilldown | null>(null);

  const load = useCallback(async () => {
    if (!studentId || !subjectId || !examId) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const result = await fetchStudentSubjectDrilldown(studentId, subjectId, examId);
      setData(result);
    } catch (err) {
      console.error("TeacherStudentSubject:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [studentId, subjectId, examId]);

  useEffect(() => { load(); }, [load]);

  if (loading)         return <LoadingState />;
  if (error || !data)  return <FailureState onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Header name={studentName || data.student.name} exam={examName || data.exam.exam_name} />
        <HeroCard       data={data} />
        <ScoreBreakdown result={data.result} />
        <PerformanceCard result={data.result} />
        <QuestionGrid   questions={data.questions} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingTop: 34, paddingBottom: 32, gap: 18 },

  // ── states
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  centeredText: { color: MUTED, fontSize: 13, fontWeight: "700" },
  failureIconWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: "#FEEDEB", alignItems: "center", justifyContent: "center",
  },
  failureTitle: { color: INK,  fontSize: 20, fontWeight: "900", textAlign: "center" },
  failureBody:  { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: "center" },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
  },
  retryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "900" },

  // ── header
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: INK },
  headerSub:   { fontSize: 13, color: MUTED, marginTop: 2 },

  // ── hero card
  heroCard: { backgroundColor: ACCENT, borderRadius: 18, padding: 18, gap: 16 },
  heroTop:  { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  heroTitleWrap: { flex: 1 },
  heroEyebrow: { color: "#D5E7F8", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  heroSubject: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: 2 },
  heroMeta:    { color: "#D5E7F8", fontSize: 12, marginTop: 3 },
  heroRiskChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
  },
  heroRiskText: { fontSize: 11, fontWeight: "900" },

  heroStats: {
    flexDirection: "row", alignItems: "stretch",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14, paddingVertical: 14,
  },
  heroStat:      { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  heroStatVal:   { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  heroStatMax:   { color: "#D5E7F8", fontSize: 13, fontWeight: "700" },
  heroStatLabel: { color: "#D5E7F8", fontSize: 11, marginTop: 4, fontWeight: "700" },
  heroDivider:   { width: 1, backgroundColor: "rgba(255,255,255,0.18)" },

  heroProgressTrack: { height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  heroProgressFill:  { height: "100%", borderRadius: 999, backgroundColor: "#FFFFFF" },

  // ── shared card
  card: {
    backgroundColor: SURFACE, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: LINE, gap: 14,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitleText: { flex: 1 },
  cardIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "#EAF2FB", alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: INK },
  cardSub:   { fontSize: 12, color: MUTED, marginTop: 2 },

  // ── score breakdown
  chipRow: { flexDirection: "row", gap: 10 },
  statChip: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", gap: 5,
  },
  statChipCount: { fontSize: 22, fontWeight: "900" },
  statChipLabel: { fontSize: 11, fontWeight: "900" },

  // ── performance
  perfRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perfLabelChip: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flex: 1, alignItems: "center" },
  perfLabelText: { fontSize: 14, fontWeight: "900" },
  zWrap:  { alignItems: "center", gap: 2 },
  zLabel: { color: MUTED, fontSize: 11, fontWeight: "700" },
  zValue: { fontSize: 22, fontWeight: "900" },

  // ── question grid
  legendRow: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: "700" },

  qGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  qBubble: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  qBubbleNum: { fontSize: 10, fontWeight: "900" },
});
