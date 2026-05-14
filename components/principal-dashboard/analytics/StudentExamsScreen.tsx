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
import type { RiskLabel, StudentExamTimelineItem, StudentExamsResponse } from '../../../types/analytics';
import { HeaderBar } from '../../shared';

const RISK_CFG: Record<RiskLabel, { bg: string; color: string }> = {
  SAFE: { bg: colors.successBg, color: colors.success },
  WATCH: { bg: colors.warningBg, color: colors.warning },
  ALERT: { bg: colors.dangerBg, color: colors.danger },
};

function ExamTimelineCard({
  exam,
  studentId,
}: {
  exam: StudentExamTimelineItem;
  studentId: string;
}) {
  const riskCfg = RISK_CFG[exam.overall_risk];

  return (
    <Pressable
      style={styles.examCard}
      onPress={() =>
        router.push(
          `/(tabs)/principal/student-summary?student_id=${studentId}&exam_id=${exam.id}` as any,
        )
      }
    >
      <View style={styles.examCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.examName}>{exam.exam_name}</Text>
          <Text style={styles.examDate}>
            {new Date(exam.exam_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg }]}>
          <Text style={[styles.riskText, { color: riskCfg.color }]}>
            {exam.overall_risk}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>
            {exam.total_marks}/{exam.max_marks}
          </Text>
          <Text style={styles.metricLabel}>Marks</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>{exam.percentage.toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>Score</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>#{exam.class_rank}</Text>
          <Text style={styles.metricLabel}>Class Rank</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>#{exam.section_rank}</Text>
          <Text style={styles.metricLabel}>Section Rank</Text>
        </View>
      </View>

      <View style={styles.subjectRow}>
        {exam.subjects.map((subject) => (
          <View key={subject.subject_id} style={styles.subjectChip}>
            <Text style={styles.subjectChipText}>{subject.subject_name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.viewRow}>
        <Text style={styles.viewText}>Open Exam Analytics</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.principal} />
      </View>
    </Pressable>
  );
}

export function StudentExamsScreen() {
  const { student_id } = useLocalSearchParams<{ student_id: string }>();
  const [data, setData] = useState<StudentExamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!student_id) return;
    setLoading(true);
    setError(false);
    analyticsApi
      .getStudentExams(student_id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [student_id]);

  const title = data?.student.name ?? 'Student Exams';
  const emptyMessage = data?.message ?? 'Student has not written any exam yet.';

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
            {title}
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
          <Text style={styles.errorText}>Failed to load exam timeline.</Text>
        </View>
      )}

      {data && !loading && (
        <FlatList
          data={data.exams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.studentCard}>
                <Text style={styles.studentName}>{data.student.name}</Text>
                <Text style={styles.studentMeta}>
                  {data.student.class_name} · Section {data.student.section_name} · {data.student.student_ref_id}
                </Text>
              </View>
              <Text style={styles.sectionLabel}>Exam Timeline</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ExamTimelineCard exam={item} studentId={student_id!} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...(typography.body as object), color: colors.textMuted },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  studentCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  studentName: {
    ...(typography.h3 as object),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  studentMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: 'center',
  },
  examCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  examCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  examName: {
    ...(typography.body as object),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  examDate: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  riskBadge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
  },
  riskText: {
    ...(typography.caption as object),
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCell: {
    flex: 1,
    minWidth: 68,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  metricValue: {
    ...(typography.body as object),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  subjectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  subjectChip: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  subjectChipText: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  viewText: {
    ...(typography.caption as object),
    color: colors.principal,
    fontWeight: '600',
  },
});
