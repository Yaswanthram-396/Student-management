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
  fetchTeacherExamOverview,
  fetchTeacherSectionDetail,
  type ExamOverview,
  type SectionSubjectDetail,
  type SubjectAvg,
} from "../services/teacher-results";

const ACCENT = "#185FA5";
const GREEN = "#16825D";
const RED = "#D92D20";
const INK = "#101828";
const MUTED = "#667085";
const LINE = "#EAECF0";
const BG = "#F6F8FB";
const SURFACE = "#FFFFFF";
const PROGRESS_COLORS = [ACCENT, GREEN, "#7A5AF8", "#C76A00", "#0E9384"];

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openSubject(subjectId: string, subjectName: string) {
    router.push(
      `/teacher-question-analysis?examId=${safeParam(examId)}&examName=${safeParam(examName)}&sectionId=${safeParam(sectionId)}&sectionName=${safeParam(sectionName)}&subjectId=${safeParam(subjectId)}&subjectName=${safeParam(subjectName)}` as any
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
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Header title={`Section ${sectionName}`} subtitle={examName} />

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 16, paddingTop: 34, gap: 18, paddingBottom: 28 },
  pressed: { opacity: 0.76 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  centeredText: { color: MUTED, fontSize: 13, fontWeight: "700" },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  pageTitle: { fontSize: 24, fontWeight: "900", color: INK },
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
