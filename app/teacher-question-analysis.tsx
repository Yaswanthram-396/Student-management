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
  fetchTeacherQuestionStudents,
  fetchTeacherSubjectQuestions,
  type AnswerGroup,
  type QuestionStat,
  type QuestionStudents,
  type SubjectQuestionSet,
} from "../services/teacher-results";

const ACCENT = "#185FA5";
const GREEN = "#16825D";
const AMBER = "#C76A00";
const RED = "#D92D20";
const INK = "#101828";
const MUTED = "#667085";
const LINE = "#EAECF0";
const BG = "#F6F8FB";
const SURFACE = "#FFFFFF";

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

function getDifficultyMeta(tag: QuestionStat["difficulty_tag"]) {
  if (tag === "HARD") return { color: RED, bg: "#FEEDEB" };
  if (tag === "MEDIUM") return { color: AMBER, bg: "#FFF5E6" };
  return { color: GREEN, bg: "#EAF7F1" };
}

function LoadingState() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.centered}>
        <ActivityIndicator color={ACCENT} />
        <Text style={styles.centeredText}>Loading question analysis</Text>
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
        <Text style={styles.failureTitle}>Question analysis could not load</Text>
        <Pressable style={styles.primaryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
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

function StudentDropdown({
  students,
  activeGroup,
  onChangeGroup,
}: {
  students: QuestionStudents;
  activeGroup: AnswerGroup;
  onChangeGroup: (group: AnswerGroup) => void;
}) {
  const groups: AnswerGroup[] = ["correct", "wrong", "unattempted"];
  const activeStudents = students[activeGroup];

  return (
    <View style={styles.dropdown}>
      <View style={styles.segmented}>
        {groups.map((group) => {
          const selected = activeGroup === group;
          const label = group === "unattempted" ? "Skipped" : group.charAt(0).toUpperCase() + group.slice(1);

          return (
            <Pressable
              key={group}
              onPress={() => onChangeGroup(group)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
              <Text style={[styles.segmentCount, selected && styles.segmentTextSelected]}>{students[group].length}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeStudents.map((student, index) => (
        <View key={student.student_id} style={[styles.studentRow, index < activeStudents.length - 1 && styles.rowBorder]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{student.name.slice(0, 1)}</Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentId}>{student.student_ref_id}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function QuestionCard({
  question,
  expanded,
  students,
  activeGroup,
  onToggle,
  onChangeGroup,
}: {
  question: QuestionStat;
  expanded: boolean;
  students: QuestionStudents | null;
  activeGroup: AnswerGroup;
  onToggle: () => void;
  onChangeGroup: (group: AnswerGroup) => void;
}) {
  const difficulty = getDifficultyMeta(question.difficulty_tag);
  const total = question.correct_count + question.wrong_count + question.unattempted_count;
  const correctWidth = total ? (question.correct_count / total) * 100 : 0;
  const wrongWidth = total ? (question.wrong_count / total) * 100 : 0;

  return (
    <View style={[styles.questionCard, expanded && styles.questionCardExpanded]}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.questionPress, pressed && styles.pressed]}>
        <View style={styles.questionTop}>
          <View style={styles.questionNoWrap}>
            <Text style={styles.questionNo}>Q{question.q_no}</Text>
          </View>
          <View style={styles.questionMeta}>
            <View style={[styles.difficultyPill, { backgroundColor: difficulty.bg }]}>
              <Text style={[styles.difficultyText, { color: difficulty.color }]}>{question.difficulty_tag}</Text>
            </View>
            {question.has_key_error && (
              <View style={styles.keyErrorPill}>
                <Ionicons name="warning-outline" size={12} color={AMBER} />
                <Text style={styles.keyErrorText}>Review key</Text>
              </View>
            )}
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={19} color="#98A2B3" />
          </View>
        </View>

        <View style={styles.stackedTrack}>
          <View style={[styles.stackedCorrect, { width: `${correctWidth}%` }]} />
          <View style={[styles.stackedWrong, { width: `${wrongWidth}%` }]} />
        </View>

        <View style={styles.questionCounts}>
          <Text style={styles.countText}>{question.correct_count} correct</Text>
          <Text style={styles.countText}>{question.wrong_count} wrong</Text>
          <Text style={styles.countText}>{question.unattempted_count} skipped</Text>
        </View>
      </Pressable>

      {expanded && students && (
        <StudentDropdown students={students} activeGroup={activeGroup} onChangeGroup={onChangeGroup} />
      )}
    </View>
  );
}

export default function QuestionAnalysisScreen() {
  const params = useLocalSearchParams();
  const examId = getParam(params.examId);
  const examName = getParam(params.examName);
  const sectionId = getParam(params.sectionId);
  const sectionName = getParam(params.sectionName);
  const subjectId = getParam(params.subjectId);
  const subjectName = getParam(params.subjectName);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [questionSet, setQuestionSet] = useState<SubjectQuestionSet | null>(null);
  const [expandedQuestionNo, setExpandedQuestionNo] = useState<number | null>(null);
  const [questionStudents, setQuestionStudents] = useState<QuestionStudents | null>(null);
  const [activeGroup, setActiveGroup] = useState<AnswerGroup>("wrong");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchTeacherSubjectQuestions(examId, subjectId, sectionId || undefined);
      setQuestionSet(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [examId, subjectId, sectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleQuestion(question: QuestionStat) {
    if (expandedQuestionNo === question.q_no) {
      setExpandedQuestionNo(null);
      setQuestionStudents(null);
      return;
    }

    setExpandedQuestionNo(question.q_no);
    setActiveGroup("wrong");
    const data = await fetchTeacherQuestionStudents(examId, subjectId, question.q_no, sectionId || undefined);
    setQuestionStudents(data);
  }

  if (loading) return <LoadingState />;
  if (error || !questionSet) return <FailureState onRetry={loadData} />;

  const contextLabel = sectionId ? `${examName} - Section ${sectionName}` : `${examName} - Class view`;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Header title={subjectName || questionSet.subject.name} subtitle={contextLabel} />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>Question analysis</Text>
              <Text style={styles.heroTitle}>{questionSet.total_questions} questions</Text>
              <Text style={styles.heroMeta}>Tap a question to see student breakdown</Text>
            </View>
          </View>
        </View>

        <View style={styles.questionList}>
          {questionSet.questions.map((question) => (
            <QuestionCard
              key={question.q_no}
              question={question}
              expanded={expandedQuestionNo === question.q_no}
              students={expandedQuestionNo === question.q_no ? questionStudents : null}
              activeGroup={activeGroup}
              onToggle={() => toggleQuestion(question)}
              onChangeGroup={setActiveGroup}
            />
          ))}
        </View>
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
  pageSubtitle: { marginTop: 2, fontSize: 13, color: MUTED, lineHeight: 18 },

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
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginTop: 2 },
  heroMeta: { color: "#D5E7F8", fontSize: 13, marginTop: 3 },

  questionList: { gap: 12 },
  questionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    overflow: "hidden",
  },
  questionCardExpanded: { borderColor: ACCENT },
  questionPress: { padding: 14, gap: 12 },
  questionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  questionNoWrap: {
    width: 42,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EAF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  questionNo: { color: ACCENT, fontSize: 14, fontWeight: "900" },
  questionMeta: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 },
  difficultyPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  difficultyText: { fontSize: 11, fontWeight: "900" },
  keyErrorPill: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF5E6",
  },
  keyErrorText: { color: AMBER, fontSize: 11, fontWeight: "900" },
  stackedTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    overflow: "hidden",
    flexDirection: "row",
  },
  stackedCorrect: { height: "100%", backgroundColor: GREEN },
  stackedWrong: { height: "100%", backgroundColor: RED },
  questionCounts: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  countText: { color: MUTED, fontSize: 12, fontWeight: "700" },

  dropdown: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    padding: 12,
    gap: 8,
    backgroundColor: "#F8FAFC",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#EAF0F7",
    padding: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
    gap: 2,
  },
  segmentSelected: { backgroundColor: SURFACE },
  segmentText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  segmentCount: { color: MUTED, fontSize: 11, fontWeight: "800" },
  segmentTextSelected: { color: ACCENT },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: LINE },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: ACCENT, fontSize: 14, fontWeight: "900" },
  studentInfo: { flex: 1 },
  studentName: { color: INK, fontSize: 14, fontWeight: "800" },
  studentId: { color: MUTED, fontSize: 12, marginTop: 2 },

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
