import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
  DifficultyTag,
  QuestionStat,
  QuestionStudentsResponse,
  StudentInQuestion,
} from '../../../types/analytics';
import { HeaderBar } from '../../shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<DifficultyTag, string> = {
  EASY:   colors.success,
  MEDIUM: colors.warning,
  HARD:   colors.danger,
};

type QuestionDetail = QuestionStat & { discrimination_index?: number };

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

// ── Student mini-row ──────────────────────────────────────────────────────────

function StudentMiniRow({ student, examId }: { student: StudentInQuestion; examId: string }) {
  return (
    <Pressable
      style={styles.studentRow}
      onPress={() =>
        router.push(
          `/(tabs)/principal/student-summary?exam_id=${examId}&student_id=${student.student_id}` as any,
        )
      }
    >
      <Text style={styles.studentName}>{student.name}</Text>
      <Text style={styles.studentRef}>{student.student_ref_id}</Text>
      <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function QuestionDetailScreen() {
  const { exam_id, section_id, subject_id, q_no } =
    useLocalSearchParams<{
      exam_id: string;
      section_id: string;
      subject_id: string;
      q_no: string;
    }>();

  const [data, setData]         = useState<QuestionStudentsResponse | null>(null);
  const [detail, setDetail]     = useState<QuestionDetail | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!exam_id || !subject_id || !q_no) return;
    setLoading(true);
    setError(false);
    setDetail(null);
    setData(null);

    const qNum = parseInt(q_no, 10);

    const fetch = section_id
      ? Promise.all([
          analyticsApi.getSectionQuestionDetail(section_id, subject_id, qNum, exam_id),
          analyticsApi.getSectionQuestionStudents(exam_id, section_id, subject_id, qNum),
        ]).then(([questionDetail, students]) => {
          setDetail(questionDetail.question);
          setSubjectName(questionDetail.subject_name);
          setData(students);
        })
      : Promise.all([
          analyticsApi.getClassQuestionStats(exam_id, subject_id),
          analyticsApi.getClassQuestionStudents(exam_id, subject_id, qNum),
        ]).then(([stats, students]) => {
          setDetail(stats.questions.find(q => q.q_no === qNum) ?? null);
          setSubjectName(stats.subject.name);
          setData(students);
        });

    fetch
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id, section_id, subject_id, q_no]);

  const correct     = data?.students.correct     ?? [];
  const wrong       = data?.students.wrong       ?? [];
  const unattempted = data?.students.unattempted ?? [];
  const correctCount = detail?.correct_count ?? correct.length;
  const wrongCount = detail?.wrong_count ?? wrong.length;
  const skipCount = detail?.skip_count ?? detail?.unattempted_count ?? unattempted.length;
  const total = correctCount + wrongCount + skipCount;
  const diffColor = detail ? DIFF_COLOR[detail.difficulty_tag] : colors.textMuted;

  const sections = [
    { key: 'correct',     label: 'Correct',      color: colors.success, students: correct     },
    { key: 'wrong',       label: 'Wrong',        color: colors.danger,  students: wrong       },
    { key: 'unattempted', label: 'Unattempted',  color: colors.warning, students: unattempted },
  ];

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
            {subjectName || data?.subject.name || 'Question'} — Q{q_no}
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
          <Text style={styles.errorText}>Failed to load question detail.</Text>
        </View>
      )}

      {data && !loading && (
        <FlatList
          data={sections}
          keyExtractor={s => s.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {detail && (
                <View style={styles.detailCard}>
                  <View style={styles.detailTopRow}>
                    <View>
                      <Text style={styles.detailTitle}>Question {detail.q_no}</Text>
                      <Text style={[styles.detailTag, { color: diffColor }]}>
                        {detail.difficulty_tag} · {detail.difficulty_index.toFixed(1)}%
                      </Text>
                    </View>
                    {detail.has_key_error && (
                      <View style={styles.keyErrorBadge}>
                        <Ionicons name="warning" size={13} color={colors.danger} />
                        <Text style={styles.keyErrorText}>Key Error</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailMetricsRow}>
                    <View style={styles.detailMetric}>
                      <Text style={[styles.detailMetricValue, { color: colors.success }]}>{correctCount}</Text>
                      <Text style={styles.detailMetricLabel}>Correct</Text>
                    </View>
                    <View style={styles.detailMetric}>
                      <Text style={[styles.detailMetricValue, { color: colors.danger }]}>{wrongCount}</Text>
                      <Text style={styles.detailMetricLabel}>Wrong</Text>
                    </View>
                    <View style={styles.detailMetric}>
                      <Text style={[styles.detailMetricValue, { color: colors.warning }]}>{skipCount}</Text>
                      <Text style={styles.detailMetricLabel}>Skipped</Text>
                    </View>
                  </View>

                  <View style={styles.discriminationRow}>
                    <Text style={styles.discriminationLabel}>Discrimination Index</Text>
                    <Text style={styles.discriminationValue}>
                      {typeof detail.discrimination_index === 'number'
                        ? detail.discrimination_index.toFixed(2)
                        : 'Not available'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Stats bar */}
              <View style={styles.statsCard}>
                <View style={styles.statCell}>
                  <Text style={[styles.statCount, { color: colors.success }]}>{correct.length}</Text>
                  <Text style={styles.statPct}>{pct(correct.length, correct.length + wrong.length + unattempted.length)}</Text>
                  <Text style={styles.statLabel}>Correct List</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statCount, { color: colors.danger }]}>{wrong.length}</Text>
                  <Text style={styles.statPct}>{pct(wrong.length, correct.length + wrong.length + unattempted.length)}</Text>
                  <Text style={styles.statLabel}>Wrong List</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statCount, { color: colors.warning }]}>{unattempted.length}</Text>
                  <Text style={styles.statPct}>{pct(unattempted.length, correct.length + wrong.length + unattempted.length)}</Text>
                  <Text style={styles.statLabel}>Skipped List</Text>
                </View>
              </View>

              {/* Stacked bar */}
              <View style={styles.stackedBar}>
                {sections.map(s => {
                  const width = total > 0 ? (s.students.length / total) * 100 : 0;
                  return width > 0 ? (
                    <View
                      key={s.key}
                      style={[styles.stackedSegment, { flex: s.students.length, backgroundColor: s.color }]}
                    />
                  ) : null;
                })}
              </View>
            </View>
          }
          renderItem={({ item: section }) =>
            section.students.length > 0 ? (
              <View style={styles.groupBlock}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupDot, { backgroundColor: section.color }]} />
                  <Text style={styles.groupLabel}>{section.label} ({section.students.length})</Text>
                </View>
                {section.students.map(s => (
                  <StudentMiniRow key={s.student_id} student={s} examId={exam_id!} />
                ))}
              </View>
            ) : null
          }
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
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  listHeader:  { gap: spacing.sm, marginBottom: spacing.sm },

  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, gap: spacing.md,
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  detailTitle: { ...(typography.h3 as object), fontWeight: '700', color: colors.textPrimary },
  detailTag: { ...(typography.caption as object), fontWeight: '700', marginTop: 2 },
  keyErrorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    borderRadius: 999, backgroundColor: colors.dangerBg,
  },
  keyErrorText: { ...(typography.caption as object), fontWeight: '700', color: colors.danger },
  detailMetricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  detailMetric: { flex: 1, alignItems: 'center', gap: 2 },
  detailMetricValue: { ...(typography.h3 as object), fontWeight: '700' },
  detailMetricLabel: { ...(typography.caption as object), color: colors.textMuted },
  discriminationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discriminationLabel: { ...(typography.caption as object), color: colors.textMuted },
  discriminationValue: { ...(typography.body as object), fontWeight: '700', color: colors.textPrimary },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
  },
  statCell:    { flex: 1, alignItems: 'center', gap: 2 },
  statCount:   { ...(typography.h3 as object), fontWeight: '700' },
  statPct:     { ...(typography.label as object), fontWeight: '500', color: colors.textSecondary },
  statLabel:   { ...(typography.caption as object), color: colors.textMuted },

  stackedBar:    { height: 10, flexDirection: 'row', borderRadius: 5, overflow: 'hidden' },
  stackedSegment:{ height: 10 },

  groupBlock: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  groupDot:   { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { ...(typography.label as object), fontWeight: '600', color: colors.textSecondary },

  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    gap: spacing.xs,
  },
  studentName: { flex: 1, ...(typography.body as object), color: colors.textPrimary },
  studentRef:  { ...(typography.caption as object), color: colors.textMuted },
});
