import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { analyticsApi } from '../../../services/analyticsApi';
import type {
  ExamOverviewResponse,
  ExamOverviewStaffClass,
  ExamOverviewStaffSection,
  ExamOverviewStudent,
  RiskLabel,
  SubjectAvg,
  TopStudent,
} from '../../../types/analytics';
import { HeaderBar } from '../../shared';

const RISK_CFG: Record<RiskLabel, { bg: string; color: string }> = {
  SAFE:  { bg: colors.successBg, color: colors.success },
  WATCH: { bg: colors.warningBg, color: colors.warning },
  ALERT: { bg: colors.dangerBg, color: colors.danger },
};

// ── Subject average row ───────────────────────────────────────────────────────

function SubjectAvgCard({
  item,
  maxMarks,
  onPress,
}: {
  item: SubjectAvg;
  maxMarks?: number;
  onPress?: () => void;
}) {
  const pct = maxMarks ? (item.avg / maxMarks) * 100 : (item.avg / item.max_marks) * 100;
  const barColor = pct >= 70 ? colors.success : pct >= 40 ? colors.warning : colors.danger;
  const content = (
    <>
      <View style={styles.subjectAvgRow}>
        <Text style={styles.subjectName}>{item.subject_name}</Text>
        <View style={styles.subjectValueRow}>
          <Text style={styles.subjectAvgValue}>
            {item.avg.toFixed(1)}/{item.max_marks}
          </Text>
          {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: barColor }]} />
      </View>
    </>
  );

  if (onPress) return <Pressable style={styles.subjectAvgCard} onPress={onPress}>{content}</Pressable>;
  return <View style={styles.subjectAvgCard}>{content}</View>;
}

// ── Section card (CLASS exam) ─────────────────────────────────────────────────

function SectionAvgCard({
  sectionId,
  sectionName,
  avg,
  examId,
}: {
  sectionId: string;
  sectionName: string;
  avg: number;
  examId: string;
}) {
  const color = avg >= 70 ? colors.success : avg >= 40 ? colors.warning : colors.danger;

  return (
    <Pressable
      style={styles.sectionCard}
      onPress={() =>
        router.push(
          `/(tabs)/principal/section-detail?exam_id=${examId}&section_id=${sectionId}` as any,
        )
      }
    >
      <Text style={styles.sectionCardLabel}>Section {sectionName}</Text>
      <Text style={[styles.sectionCardAvg, { color }]}>{avg.toFixed(1)}%</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

// ── Top student row ───────────────────────────────────────────────────────────

function TopStudentRow({ student, examId }: { student: TopStudent; examId: string }) {
  return (
    <Pressable
      style={styles.topStudentRow}
      onPress={() =>
        router.push(
          `/(tabs)/principal/student-summary?exam_id=${examId}&student_id=${student.student_id}` as any,
        )
      }
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{student.rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentRef}>{student.student_ref_id}</Text>
      </View>
      <Text style={styles.totalMarks}>{student.total_marks} marks</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

// ── CLASS exam layout ─────────────────────────────────────────────────────────

function ClassExamView({ data, examId }: { data: ExamOverviewStaffClass; examId: string }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Class averages */}
      <Text style={styles.sectionLabel}>Class Averages</Text>
      <View style={styles.card}>
        {data.class_avgs.map(item => (
          <SubjectAvgCard
            key={item.subject_id}
            item={item}
            onPress={() =>
              router.push(
                `/(tabs)/principal/question-heatmap?exam_id=${examId}&subject_id=${item.subject_id}` as any,
              )
            }
          />
        ))}
      </View>

      {/* Section breakdown */}
      <Text style={styles.sectionLabel}>Sections</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.sectionRow}>
          {data.sections.map(s => (
            <SectionAvgCard
              key={s.section_id}
              sectionId={s.section_id}
              sectionName={s.section_name}
              avg={s.avg}
              examId={examId}
            />
          ))}
        </View>
      </ScrollView>

      {/* Top students */}
      {data.top_students.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Top Students</Text>
          <View style={styles.card}>
            {data.top_students.map(s => (
              <TopStudentRow key={s.student_id} student={s} examId={examId} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── SECTION exam layout ───────────────────────────────────────────────────────

function SectionExamView({ data, examId }: { data: ExamOverviewStaffSection; examId: string }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionBadgeContainer}>
        <Text style={styles.sectionBadgeText}>Section {data.section.name}</Text>
      </View>

      {/* Subject averages */}
      <Text style={styles.sectionLabel}>Subject Averages</Text>
      <View style={styles.card}>
        {data.subject_avgs.map(item => (
          <SubjectAvgCard
            key={item.subject_id}
            item={item}
            onPress={() =>
              router.push(
                `/(tabs)/principal/question-heatmap?exam_id=${examId}&section_id=${data.section.id}&subject_id=${item.subject_id}` as any,
              )
            }
          />
        ))}
      </View>

      {/* Top students */}
      {data.top_students.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Top Students</Text>
          <View style={styles.card}>
            {data.top_students.map(s => (
              <TopStudentRow key={s.student_id} student={s} examId={examId} />
            ))}
          </View>
        </>
      )}

      {/* View all students button */}
      <Pressable
        style={styles.viewStudentsBtn}
        onPress={() =>
          router.push(
            `/(tabs)/principal/section-students?exam_id=${examId}&section_id=${data.section.id}` as any,
          )
        }
      >
        <Ionicons name="people-outline" size={16} color={colors.principal} />
        <Text style={styles.viewStudentsBtnText}>View All Students</Text>
      </Pressable>
    </ScrollView>
  );
}

function StudentExamView({ data }: { data: ExamOverviewStudent }) {
  const riskCfg = RISK_CFG[data.student_results.overall_risk];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.studentInfoCard}>
        <View style={styles.studentInfoTop}>
          <Text style={styles.studentInfoTitle}>Student Overview</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg }]}>
            <Text style={[styles.riskText, { color: riskCfg.color }]}>
              {data.student_results.overall_risk}
            </Text>
          </View>
        </View>
        <Text style={styles.studentInfoBody}>
          This exam overview was returned in student mode. The principal flow can display it safely, but staff drill-down navigation is not available from this response.
        </Text>
        <Text style={styles.studentInfoScore}>
          Total Marks: {data.student_results.total_marks}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Subject Results</Text>
      <View style={styles.card}>
        {data.student_results.subjects.map((subject) => (
          <View key={subject.subject_id} style={styles.studentSubjectCard}>
            <View style={styles.subjectAvgRow}>
              <Text style={styles.subjectName}>{subject.subject_name}</Text>
              <Text style={styles.subjectAvgValue}>
                {subject.total_marks}/{subject.max_marks}
              </Text>
            </View>
            <View style={styles.studentSubjectMetaRow}>
              <Text style={styles.studentSubjectMeta}>
                {subject.correct} correct · {subject.wrong} wrong · {subject.unattempted} skipped
              </Text>
              <Text style={[styles.studentSubjectMeta, { color: RISK_CFG[subject.risk_label].color }]}>
                {subject.risk_label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ExamOverviewScreen() {
  const { exam_id } = useLocalSearchParams<{ exam_id: string }>();
  const [data, setData]       = useState<ExamOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!exam_id) return;
    setLoading(true);
    setError(false);
    analyticsApi.getExamOverview(exam_id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id]);

  const examName = data?.exam.exam_name ?? 'Exam Overview';
  const examDate = data?.exam.exam_date
    ? new Date(data.exam.exam_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle} numberOfLines={1}>{examName}</Text>}
      />

      {examDate ? <Text style={styles.dateLabel}>{examDate}</Text> : null}

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load exam overview.</Text>
        </View>
      )}

      {data && !loading && (
        data.role_view === 'STUDENT'
          ? <StudentExamView data={data} />
          : 'section' in data && 'subject_avgs' in data
            ? <SectionExamView data={data} examId={exam_id!} />
            : <ClassExamView data={data} examId={exam_id!} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  backBtn:     { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  dateLabel:   { ...(typography.caption as object), color: colors.textMuted, textAlign: 'center', marginTop: -4, marginBottom: spacing.xs },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { ...(typography.body as object), color: colors.textMuted },
  content:     { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
  },
  // Subject avg
  subjectAvgCard: { padding: spacing.md, borderTopWidth: 0.5, borderTopColor: colors.border },
  subjectAvgRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  subjectValueRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subjectName:    { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  subjectAvgValue:{ ...(typography.body as object), fontWeight: '600', color: colors.textSecondary },
  progressTrack:  { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: 6, borderRadius: 3 },
  // Section cards
  sectionRow:     { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
    alignItems: 'center', minWidth: 100, gap: 4,
    flexDirection: 'row',
  },
  sectionCardLabel: { ...(typography.label as object), color: colors.textSecondary, flex: 1 },
  sectionCardAvg:   { ...(typography.h3 as object), fontWeight: '700' },
  // Top students
  topStudentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.principal + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  rankText:    { ...(typography.label as object), fontWeight: '700', color: colors.principal },
  studentName: { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  studentRef:  { ...(typography.caption as object), color: colors.textMuted },
  totalMarks:  { ...(typography.label as object), fontWeight: '600', color: colors.textSecondary },
  // Section badge (SECTION exam)
  sectionBadgeContainer: {
    alignSelf: 'flex-start',
    paddingVertical: 4, paddingHorizontal: spacing.md,
    backgroundColor: colors.principal + '18', borderRadius: 999,
  },
  sectionBadgeText: { ...(typography.label as object), fontWeight: '600', color: colors.principal },
  studentInfoCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  studentInfoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  studentInfoTitle: { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary },
  studentInfoBody: { ...(typography.caption as object), color: colors.textMuted, lineHeight: 18 },
  studentInfoScore: { ...(typography.body as object), color: colors.textSecondary, fontWeight: '500' },
  riskBadge: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: 999 },
  riskText: { ...(typography.caption as object), fontWeight: '700' },
  studentSubjectCard: { padding: spacing.md, borderTopWidth: 0.5, borderTopColor: colors.border, gap: spacing.xs },
  studentSubjectMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  studentSubjectMeta: { ...(typography.caption as object), color: colors.textMuted },
  // View students btn
  viewStudentsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'center', marginTop: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: 10, borderWidth: 1, borderColor: colors.principal,
  },
  viewStudentsBtnText: { ...(typography.body as object), fontWeight: '600', color: colors.principal },
});
