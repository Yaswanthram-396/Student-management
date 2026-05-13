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
  PerformanceLabel,
  QuestionStatus,
  RiskLabel,
  StudentSubjectResponse,
} from '../../../types/analytics';
import { HeaderBar } from '../../shared';

// ── Config maps ───────────────────────────────────────────────────────────────

const RISK_CFG: Record<RiskLabel, { bg: string; color: string }> = {
  SAFE:  { bg: colors.successBg, color: colors.success },
  WATCH: { bg: colors.warningBg, color: colors.warning },
  ALERT: { bg: colors.dangerBg,  color: colors.danger  },
};

const PERF_CFG: Record<PerformanceLabel, { label: string; color: string }> = {
  EXCEPTIONAL:    { label: 'Exceptional',    color: colors.success },
  ABOVE_AVERAGE:  { label: 'Above Average',  color: colors.success },
  AVERAGE:        { label: 'Average',        color: colors.warning },
  BELOW_AVERAGE:  { label: 'Below Average',  color: colors.danger  },
  NEEDS_ATTENTION:{ label: 'Needs Attention', color: colors.danger },
};

const STATUS_CFG: Record<QuestionStatus, { bg: string; color: string; label: string }> = {
  C: { bg: colors.successBg, color: colors.success, label: 'C' },
  W: { bg: colors.dangerBg,  color: colors.danger,  label: 'W' },
  U: { bg: colors.border,    color: colors.textMuted,label: 'U' },
};

// ── Question strip cell ───────────────────────────────────────────────────────

function QCell({ q_no, status }: { q_no: number; status: QuestionStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <View style={[styles.qCell, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.qCellNo, { color: cfg.color }]}>{q_no}</Text>
      <Text style={[styles.qCellStatus, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const COLS = 8;

export function StudentSubjectScreen() {
  const { exam_id, student_id, subject_id } =
    useLocalSearchParams<{ exam_id: string; student_id: string; subject_id: string }>();

  const [data, setData]       = useState<StudentSubjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!exam_id || !student_id || !subject_id) return;
    setLoading(true);
    setError(false);
    analyticsApi.getStudentSubject(student_id, subject_id, exam_id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id, student_id, subject_id]);

  const result = data?.result;

  // Build grid rows from questions
  const questions = data?.questions ?? [];
  const gridRows: (typeof questions)[] = [];
  for (let i = 0; i < questions.length; i += COLS) {
    gridRows.push(questions.slice(i, i + COLS));
  }

  const correctCount     = questions.filter(q => q.status === 'C').length;
  const wrongCount       = questions.filter(q => q.status === 'W').length;
  const unattemptedCount = questions.filter(q => q.status === 'U').length;

  const riskCfg = result ? RISK_CFG[result.risk_label]   : null;
  const perfCfg = result ? PERF_CFG[result.performance_label] : null;

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
            {data?.subject_name ?? 'Subject Detail'}
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
          <Text style={styles.errorText}>Failed to load subject data.</Text>
        </View>
      )}

      {data && result && !loading && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Student + exam info */}
          <Text style={styles.studentInfo}>
            {data.student.name} · {data.student.class_name} {data.student.section_name}
          </Text>
          <Text style={styles.examInfo}>{data.exam.exam_name}</Text>

          {/* Score summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.marksLarge}>
                  {result.total_marks}/{result.max_marks}
                </Text>
                <Text style={styles.marksPct}>{result.percentage.toFixed(1)}% · Rank #{result.exam_rank}</Text>
              </View>
              <View style={styles.badgeCol}>
                {riskCfg && (
                  <View style={[styles.badge, { backgroundColor: riskCfg.bg }]}>
                    <Text style={[styles.badgeText, { color: riskCfg.color }]}>{result.risk_label}</Text>
                  </View>
                )}
                {perfCfg && (
                  <Text style={[styles.perfLabel, { color: perfCfg.color }]}>{perfCfg.label}</Text>
                )}
              </View>
            </View>

            {/* C / W / U bar */}
            <View style={styles.cwuRow}>
              <View style={styles.cwuCell}>
                <Text style={[styles.cwuCount, { color: colors.success }]}>{result.correct}</Text>
                <Text style={styles.cwuLabel}>Correct</Text>
              </View>
              <View style={styles.cwuDivider} />
              <View style={styles.cwuCell}>
                <Text style={[styles.cwuCount, { color: colors.danger }]}>{result.wrong}</Text>
                <Text style={styles.cwuLabel}>Wrong</Text>
              </View>
              <View style={styles.cwuDivider} />
              <View style={styles.cwuCell}>
                <Text style={[styles.cwuCount, { color: colors.textMuted }]}>{result.unattempted}</Text>
                <Text style={styles.cwuLabel}>Skipped</Text>
              </View>
            </View>

            {/* Stacked bar */}
            <View style={styles.stackedBar}>
              {correctCount > 0 && (
                <View style={[styles.stackSeg, { flex: correctCount, backgroundColor: colors.success }]} />
              )}
              {wrongCount > 0 && (
                <View style={[styles.stackSeg, { flex: wrongCount, backgroundColor: colors.danger }]} />
              )}
              {unattemptedCount > 0 && (
                <View style={[styles.stackSeg, { flex: unattemptedCount, backgroundColor: colors.border }]} />
              )}
            </View>

            {/* z-score */}
            <Text style={styles.zScore}>
              z-score: {result.z_score.toFixed(2)}
            </Text>
          </View>

          {/* Question grid */}
          <Text style={styles.sectionLabel}>Question-by-Question</Text>
          <View style={styles.legendRow}>
            {(['C', 'W', 'U'] as QuestionStatus[]).map(s => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_CFG[s].color }]} />
                <Text style={styles.legendText}>
                  {s === 'C' ? 'Correct' : s === 'W' ? 'Wrong' : 'Unattempted'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {gridRows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map(q => (
                  <QCell key={q.q_no} q_no={q.q_no} status={q.status} />
                ))}
                {Array.from({ length: COLS - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={styles.qCellPad} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const CELL = 38;

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  backBtn:     { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { ...(typography.body as object), color: colors.textMuted },
  content:     { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  studentInfo: { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary },
  examInfo:    { ...(typography.caption as object), color: colors.textMuted, marginTop: -spacing.xs },

  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, gap: spacing.sm,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  marksLarge: { ...(typography.h3 as object), fontWeight: '700', color: colors.textPrimary, fontSize: 24 },
  marksPct:   { ...(typography.caption as object), color: colors.textSecondary, marginTop: 2 },
  badgeCol:   { alignItems: 'flex-end', gap: spacing.xs },
  badge:      { paddingVertical: 3, paddingHorizontal: spacing.sm, borderRadius: 999 },
  badgeText:  { ...(typography.caption as object), fontWeight: '700' },
  perfLabel:  { ...(typography.caption as object), fontWeight: '600' },

  cwuRow:     { flexDirection: 'row', alignItems: 'center' },
  cwuCell:    { flex: 1, alignItems: 'center', gap: 2 },
  cwuDivider: { width: 0.5, height: 32, backgroundColor: colors.border },
  cwuCount:   { ...(typography.h3 as object), fontWeight: '700' },
  cwuLabel:   { ...(typography.caption as object), color: colors.textMuted },

  stackedBar:  { height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  stackSeg:    { height: 8 },

  zScore: { ...(typography.caption as object), color: colors.textMuted, textAlign: 'right' },

  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  legendRow:    { flexDirection: 'row', gap: spacing.md },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { ...(typography.caption as object), color: colors.textSecondary },

  grid:    { gap: spacing.xs },
  gridRow: { flexDirection: 'row', gap: spacing.xs },
  qCell: {
    width: CELL, height: CELL, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flex: 1,
  },
  qCellNo:     { fontSize: 9, fontWeight: '500', opacity: 0.7 },
  qCellStatus: { fontSize: 13, fontWeight: '700' },
  qCellPad:    { flex: 1, height: CELL },
});
