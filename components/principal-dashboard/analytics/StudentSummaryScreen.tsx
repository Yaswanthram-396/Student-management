import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  AnalyticsExam,
  PerformanceLabel,
  RiskLabel,
  StudentSubjectSummary,
  StudentSummaryResponse,
} from '../../../types/analytics';
import { HeaderBar } from '../../shared';

// ── Risk / Performance configs ────────────────────────────────────────────────

const RISK_CFG: Record<RiskLabel, { bg: string; color: string }> = {
  SAFE:  { bg: colors.successBg, color: colors.success },
  WATCH: { bg: colors.warningBg, color: colors.warning },
  ALERT: { bg: colors.dangerBg,  color: colors.danger  },
};

const PERF_CFG: Record<PerformanceLabel, { label: string; color: string }> = {
  EXCEPTIONAL:   { label: 'Exceptional',    color: colors.success },
  ABOVE_AVERAGE: { label: 'Above Average',  color: colors.success },
  AVERAGE:       { label: 'Average',        color: colors.warning },
  BELOW_AVERAGE: { label: 'Below Average',  color: colors.danger  },
  NEEDS_ATTENTION:{ label: 'Needs Attention', color: colors.danger },
};

// ── Exam picker ───────────────────────────────────────────────────────────────

function ExamPicker({
  exams,
  currentExamId,
  studentId,
}: {
  exams: AnalyticsExam[];
  currentExamId: string;
  studentId: string;
}) {
  if (exams.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examPicker}>
      <View style={styles.examPickerRow}>
        {exams.filter(e => e.analytics_status === 'DONE').map(e => (
          <Pressable
            key={e.id}
            style={[styles.examChip, e.id === currentExamId && styles.examChipActive]}
            onPress={() => {
              if (e.id !== currentExamId) {
                router.replace(
                  `/(tabs)/principal/student-summary?exam_id=${e.id}&student_id=${studentId}` as any,
                );
              }
            }}
          >
            <Text style={[styles.examChipText, e.id === currentExamId && styles.examChipTextActive]}>
              {e.exam_name}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Subject card ──────────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  studentId,
  examId,
}: {
  subject: StudentSubjectSummary;
  studentId: string;
  examId: string;
}) {
  const riskCfg  = RISK_CFG[subject.risk_label];
  const perfCfg  = PERF_CFG[subject.performance_label];
  const zAbs     = Math.abs(subject.z_score);
  const zBarFill = Math.min((zAbs / 2) * 100, 100); // -2 to +2 range capped at 100%
  const zBarColor = subject.z_score >= 0 ? colors.success : colors.danger;

  return (
    <Pressable
      style={styles.subjectCard}
      onPress={() => {
        if (subject.subject_id) {
          router.push(
            `/(tabs)/principal/student-subject?exam_id=${examId}&student_id=${studentId}&subject_id=${subject.subject_id}` as any,
          );
        }
      }}
    >
      {/* Header row */}
      <View style={styles.subjectCardHeader}>
        <Text style={styles.subjectCardName}>{subject.subject_name}</Text>
        <View style={styles.subjectBadgeRow}>
          <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg }]}>
            <Text style={[styles.riskText, { color: riskCfg.color }]}>{subject.risk_label}</Text>
          </View>
          {subject.subject_id && (
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          )}
        </View>
      </View>

      {/* Marks & rank */}
      <View style={styles.marksRow}>
        <Text style={styles.marksValue}>
          {subject.total_marks}/{subject.max_marks}
        </Text>
        <Text style={styles.marksPct}>({subject.percentage.toFixed(1)}%)</Text>
        <Text style={styles.rankLabel}>Rank #{subject.exam_rank}</Text>
      </View>

      {/* Correct / Wrong / Unattempted */}
      <View style={styles.cwuRow}>
        <View style={styles.cwuItem}>
          <View style={[styles.cwuDot, { backgroundColor: colors.success }]} />
          <Text style={styles.cwuText}>{subject.correct} correct</Text>
        </View>
        <View style={styles.cwuItem}>
          <View style={[styles.cwuDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.cwuText}>{subject.wrong} wrong</Text>
        </View>
        <View style={styles.cwuItem}>
          <View style={[styles.cwuDot, { backgroundColor: colors.textMuted }]} />
          <Text style={styles.cwuText}>{subject.unattempted} skip</Text>
        </View>
      </View>

      {/* Performance label + z-score bar */}
      <View style={styles.perfRow}>
        <Text style={[styles.perfLabel, { color: perfCfg.color }]}>
          {perfCfg.label}
        </Text>
        <View style={styles.zBarTrack}>
          <View
            style={[
              styles.zBarFill,
              { width: `${zBarFill}%` as any, backgroundColor: zBarColor },
            ]}
          />
        </View>
        <Text style={styles.zScore}>z={subject.z_score.toFixed(2)}</Text>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function StudentSummaryScreen() {
  const { exam_id, student_id } =
    useLocalSearchParams<{ exam_id: string; student_id: string }>();

  const [data, setData]       = useState<StudentSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!exam_id || !student_id) return;
    setLoading(true);
    setError(false);
    analyticsApi.getStudentSummary(student_id, exam_id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id, student_id]);

  const riskCfg = data ? RISK_CFG[data.overall_risk] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data?.student.name ?? 'Student Profile'}
          </Text>
        }
      />

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load student data.</Text>
        </View>
      )}

      {data && !loading && (
        <FlatList
          data={data.subjects}
          keyExtractor={s => s.subject_name}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Student info card */}
              <View style={styles.studentCard}>
                <View style={styles.studentCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentCardName}>{data.student.name}</Text>
                    <Text style={styles.studentCardMeta}>
                      {data.student.class_name} · Section {data.student.section_name} · {data.student.student_ref_id}
                    </Text>
                    <Text style={styles.examLabel}>{data.exam.exam_name}</Text>
                  </View>
                  {riskCfg && (
                    <View style={[styles.overallRiskBadge, { backgroundColor: riskCfg.bg }]}>
                      <Text style={[styles.overallRiskText, { color: riskCfg.color }]}>
                        {data.overall_risk}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Exam picker */}
              <ExamPicker
                exams={data.exams}
                currentExamId={exam_id!}
                studentId={student_id!}
              />

              <Text style={styles.sectionLabel}>Subject Breakdown</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SubjectCard subject={item} studentId={student_id!} examId={exam_id!} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  backBtn:     { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { ...(typography.body as object), color: colors.textMuted },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader:  { gap: spacing.md, marginBottom: spacing.sm },
  sectionLabel:{ ...(typography.label as object), color: colors.textMuted },

  studentCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
  },
  studentCardTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  studentCardName: { ...(typography.h3 as object), fontWeight: '600', color: colors.textPrimary },
  studentCardMeta: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  examLabel:       { ...(typography.caption as object), color: colors.principal, marginTop: 4, fontWeight: '500' },
  overallRiskBadge:{ paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: 999 },
  overallRiskText: { ...(typography.label as object), fontWeight: '700' },

  examPicker:    { marginBottom: -spacing.sm },
  examPickerRow: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs },
  examChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  examChipActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  examChipText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  examChipTextActive: { color: colors.surface },

  subjectCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, gap: spacing.xs,
  },
  subjectCardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectCardName:    { ...(typography.body as object), fontWeight: '700', color: colors.textPrimary },
  subjectBadgeRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  riskBadge:          { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: 999 },
  riskText:           { ...(typography.caption as object), fontWeight: '700', fontSize: 10 },

  marksRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  marksValue:  { ...(typography.h3 as object), fontWeight: '700', color: colors.textPrimary },
  marksPct:    { ...(typography.body as object), color: colors.textSecondary },
  rankLabel:   { ...(typography.caption as object), color: colors.textMuted, marginLeft: 'auto' as any },

  cwuRow:   { flexDirection: 'row', gap: spacing.md },
  cwuItem:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cwuDot:   { width: 8, height: 8, borderRadius: 4 },
  cwuText:  { ...(typography.caption as object), color: colors.textSecondary },

  perfRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  perfLabel: { ...(typography.caption as object), fontWeight: '600', minWidth: 90 },
  zBarTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  zBarFill:  { height: 6, borderRadius: 3 },
  zScore:    { ...(typography.caption as object), color: colors.textMuted, minWidth: 52, textAlign: 'right' },
});
