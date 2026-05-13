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
import type { RiskLabel, SectionStudent, SectionStudentsResponse } from '../../../types/analytics';
import { HeaderBar } from '../../shared';

// ── Risk badge ────────────────────────────────────────────────────────────────

const RISK_CFG: Record<RiskLabel, { bg: string; color: string }> = {
  SAFE:  { bg: colors.successBg, color: colors.success },
  WATCH: { bg: colors.warningBg, color: colors.warning },
  ALERT: { bg: colors.dangerBg,  color: colors.danger  },
};

function RiskBadge({ risk }: { risk: RiskLabel }) {
  const cfg = RISK_CFG[risk];
  return (
    <View style={[styles.riskBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.riskText, { color: cfg.color }]}>{risk}</Text>
    </View>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({ student, examId }: { student: SectionStudent; examId: string }) {
  return (
    <Pressable
      style={styles.studentRow}
      onPress={() =>
        router.push(
          `/(tabs)/principal/student-summary?exam_id=${examId}&student_id=${student.student_id}` as any,
        )
      }
    >
      <View style={{ flex: 1 }}>
        <View style={styles.studentTop}>
          <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
          <RiskBadge risk={student.overall_risk} />
        </View>
        <Text style={styles.studentRef}>{student.student_ref_id}</Text>
        <View style={styles.subjectRiskRow}>
          {Object.entries(student.subject_risk).map(([subj, risk]) => (
            <View key={subj} style={styles.subjectRiskChip}>
              <Text style={styles.subjectRiskLabel}>{subj.slice(0, 4)}</Text>
              <View style={[styles.subjectRiskDot, { backgroundColor: RISK_CFG[risk as RiskLabel].color }]} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.pctContainer}>
        <Text style={styles.pctValue}>{student.total_pct.toFixed(1)}%</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function SectionStudentsScreen() {
  const { exam_id, section_id } = useLocalSearchParams<{ exam_id: string; section_id: string }>();
  const [data, setData]         = useState<SectionStudentsResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!exam_id || !section_id) return;
    setLoading(true);
    setError(false);
    analyticsApi.getSectionStudents(section_id, exam_id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id, section_id]);

  const title = data
    ? `${data.class_name} — Section ${data.section_name}`
    : 'Students';

  // Summary counts
  const alertCount = data?.students.filter(s => s.overall_risk === 'ALERT').length ?? 0;
  const watchCount = data?.students.filter(s => s.overall_risk === 'WATCH').length ?? 0;
  const safeCount  = data?.students.filter(s => s.overall_risk === 'SAFE').length  ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>}
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
          data={data.students}
          keyExtractor={s => s.student_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Risk summary row */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryChip, { backgroundColor: colors.dangerBg }]}>
                  <Text style={[styles.summaryCount, { color: colors.danger }]}>{alertCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.danger }]}>Alert</Text>
                </View>
                <View style={[styles.summaryChip, { backgroundColor: colors.warningBg }]}>
                  <Text style={[styles.summaryCount, { color: colors.warning }]}>{watchCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.warning }]}>Watch</Text>
                </View>
                <View style={[styles.summaryChip, { backgroundColor: colors.successBg }]}>
                  <Text style={[styles.summaryCount, { color: colors.success }]}>{safeCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.success }]}>Safe</Text>
                </View>
              </View>
              <Text style={styles.sortLabel}>Sorted by total % (highest first)</Text>
            </View>
          }
          renderItem={({ item }) => (
            <StudentRow student={item} examId={exam_id!} />
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
  listHeader:  { marginBottom: spacing.md, gap: spacing.sm },
  sortLabel:   { ...(typography.caption as object), color: colors.textMuted },

  summaryRow:  { flexDirection: 'row', gap: spacing.sm },
  summaryChip: { flex: 1, borderRadius: 12, padding: spacing.md, alignItems: 'center', gap: 2 },
  summaryCount:{ ...(typography.h3 as object), fontWeight: '700' },
  summaryLabel:{ ...(typography.caption as object), fontWeight: '600' },

  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
  },
  studentTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  studentName:  { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  studentRef:   { ...(typography.caption as object), color: colors.textMuted, marginBottom: spacing.xs },
  riskBadge:    { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: 999 },
  riskText:     { ...(typography.caption as object), fontWeight: '700', fontSize: 10 },
  subjectRiskRow:  { flexDirection: 'row', gap: spacing.xs },
  subjectRiskChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  subjectRiskLabel:{ ...(typography.caption as object), color: colors.textMuted, fontSize: 10 },
  subjectRiskDot:  { width: 6, height: 6, borderRadius: 3 },
  pctContainer:    { alignItems: 'flex-end', gap: 4, marginLeft: spacing.sm },
  pctValue:        { ...(typography.h3 as object), fontWeight: '700', color: colors.principal },
});
