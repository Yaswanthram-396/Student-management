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
import type { DifficultyTag, QuestionStat } from '../../../types/analytics';
import { HeaderBar } from '../../shared';

// ── Difficulty colour map ─────────────────────────────────────────────────────

const DIFF_COLOR: Record<DifficultyTag, { bg: string; text: string }> = {
  EASY:   { bg: colors.successBg, text: colors.success },
  MEDIUM: { bg: colors.warningBg, text: colors.warning },
  HARD:   { bg: colors.dangerBg,  text: colors.danger  },
};

// ── Question cell ─────────────────────────────────────────────────────────────

function QuestionCell({
  q,
  onPress,
}: {
  q: QuestionStat;
  onPress: () => void;
}) {
  const cfg = DIFF_COLOR[q.difficulty_tag] ?? DIFF_COLOR.MEDIUM;
  return (
    <Pressable
      style={[
        styles.cell,
        { backgroundColor: cfg.bg },
        q.has_key_error && styles.cellKeyError,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.cellQNo, { color: cfg.text }]}>Q{q.q_no}</Text>
      <Text style={[styles.cellPct, { color: cfg.text }]}>
        {q.difficulty_index.toFixed(0)}%
      </Text>
      {q.has_key_error && (
        <Ionicons name="warning" size={10} color={colors.danger} style={styles.errorIcon} />
      )}
    </Pressable>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <View style={styles.legend}>
      {(['EASY', 'MEDIUM', 'HARD'] as DifficultyTag[]).map(tag => {
        const cfg = DIFF_COLOR[tag];
        return (
          <View key={tag} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cfg.text }]} />
            <Text style={styles.legendLabel}>{tag}</Text>
          </View>
        );
      })}
      <View style={styles.legendItem}>
        <View style={styles.legendKeyErrorBox} />
        <Text style={styles.legendLabel}>Key Error</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const COLS = 5;

export function QuestionHeatmapScreen() {
  const { exam_id, section_id, subject_id } =
    useLocalSearchParams<{ exam_id: string; section_id: string; subject_id: string }>();

  const [questions, setQuestions] = useState<QuestionStat[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!exam_id || !subject_id) return;
    setLoading(true);
    setError(false);

    const fetch = section_id
      ? analyticsApi.getSectionHeatmap(section_id, subject_id, exam_id)
      : analyticsApi.getClassQuestionStats(exam_id, subject_id);

    fetch
      .then(res => {
        setQuestions(res.questions);
        setSubjectName('subject' in res ? res.subject.name : res.subject_name);
        setTotalQuestions(res.total_questions);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id, section_id, subject_id]);

  // Build rows for the grid
  const rows: QuestionStat[][] = [];
  for (let i = 0; i < questions.length; i += COLS) {
    rows.push(questions.slice(i, i + COLS));
  }

  const easyCount  = questions.filter(q => q.difficulty_tag === 'EASY').length;
  const medCount   = questions.filter(q => q.difficulty_tag === 'MEDIUM').length;
  const hardCount  = questions.filter(q => q.difficulty_tag === 'HARD').length;
  const errorCount = questions.filter(q => q.has_key_error).length;

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
            {subjectName || 'Question Heatmap'}
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
          <Text style={styles.errorText}>Failed to load question data.</Text>
        </View>
      )}

      {!loading && !error && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats summary */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{totalQuestions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{easyCount}</Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>Easy</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.warningBg }]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{medCount}</Text>
              <Text style={[styles.statLabel, { color: colors.warning }]}>Medium</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.dangerBg }]}>
              <Text style={[styles.statValue, { color: colors.danger }]}>{hardCount}</Text>
              <Text style={[styles.statLabel, { color: colors.danger }]}>Hard</Text>
            </View>
            {errorCount > 0 && (
              <View style={[styles.statChip, { backgroundColor: colors.dangerBg }]}>
                <Text style={[styles.statValue, { color: colors.danger }]}>{errorCount}</Text>
                <Text style={[styles.statLabel, { color: colors.danger }]}>Key Err</Text>
              </View>
            )}
          </View>

          <Legend />

          {/* Grid */}
          <View style={styles.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map(q => (
                  <QuestionCell
                    key={q.q_no}
                    q={q}
                    onPress={() => {
                      const sectionParam = section_id ? `&section_id=${section_id}` : '';
                      router.push(
                        `/(tabs)/principal/question-detail?exam_id=${exam_id}${sectionParam}&subject_id=${subject_id}&q_no=${q.q_no}` as any,
                      );
                    }}
                  />
                ))}
                {/* Padding cells to fill last row */}
                {Array.from({ length: COLS - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={styles.cellPad} />
                ))}
              </View>
            ))}
          </View>

          <Text style={styles.hintText}>
            Tap any question to see student breakdown and discrimination index.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const CELL_SIZE = 58;

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  backBtn:     { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { ...(typography.body as object), color: colors.textMuted },
  content:     { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  statsRow: {
    flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap',
  },
  statChip: {
    flex: 1, minWidth: 56,
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 12, padding: spacing.sm,
    alignItems: 'center', gap: 2,
  },
  statValue: { ...(typography.h3 as object), fontWeight: '700', color: colors.textPrimary },
  statLabel: { ...(typography.caption as object), color: colors.textMuted },

  legend:         { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot:      { width: 10, height: 10, borderRadius: 5 },
  legendLabel:    { ...(typography.caption as object), color: colors.textSecondary },
  legendKeyErrorBox: {
    width: 10, height: 10, borderRadius: 2,
    borderWidth: 1.5, borderColor: colors.danger,
  },

  grid:    { gap: spacing.xs },
  gridRow: { flexDirection: 'row', gap: spacing.xs },

  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 2,
    flex: 1,
  },
  cellKeyError: { borderWidth: 1.5, borderColor: colors.danger },
  cellQNo:   { ...(typography.caption as object), fontWeight: '700', fontSize: 11 },
  cellPct:   { fontSize: 10, fontWeight: '500' },
  errorIcon: { position: 'absolute', top: 4, right: 4 },
  cellPad:   { flex: 1, height: CELL_SIZE },

  hintText: { ...(typography.caption as object), color: colors.textMuted, textAlign: 'center' },
});
