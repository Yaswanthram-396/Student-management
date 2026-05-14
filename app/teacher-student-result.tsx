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
import { analyticsApi, type StudentResult, type RiskLabel } from '../services/analytics';

const ACCENT = '#185FA5';

const RISK_CONFIG: Record<RiskLabel, { color: string; bg: string; label: string }> = {
  SAFE:  { color: '#1D9E75', bg: '#E1F5EE', label: 'Safe'  },
  WATCH: { color: '#D97706', bg: '#FEF3C7', label: 'Watch' },
  ALERT: { color: '#DC2626', bg: '#FEE2E2', label: 'Alert' },
};

function BarStat({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={bs.row}>
      <Text style={bs.label}>{label}</Text>
      <View style={bs.track}>
        <View style={[bs.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[bs.val, { color }]}>{value}</Text>
    </View>
  );
}
const bs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { width: 80, fontSize: 12, color: '#666666' },
  track: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  val: { width: 30, textAlign: 'right', fontSize: 13, fontWeight: '700' },
});

export default function StudentResultScreen() {
  const { studentId, examId, studentName } = useLocalSearchParams<{
    studentId: string; examId: string; studentName: string;
  }>();

  const [result, setResult] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { if (studentId && examId) fetchResult(); }, [studentId, examId]);

  async function fetchResult() {
    setLoading(true);
    setError('');
    try {
      const data = await analyticsApi.getStudentSummary(studentId!, examId!);
      // Handle both flat and nested response shapes
      const sr = data.student_results ?? {
        total_marks: data.total_marks ?? 0,
        overall_risk: data.overall_risk ?? 'SAFE',
        subjects: data.subjects ?? [],
      } as StudentResult;
      setResult(sr);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load student result.');
    } finally {
      setLoading(false);
    }
  }

  const overallCfg = result ? RISK_CONFIG[result.overall_risk] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle} numberOfLines={1}>{studentName ?? 'Student Result'}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.stateText}>Loading result…</Text>
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Couldn't load result</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchResult}>
            <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && result && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Overall summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>Total Marks</Text>
              <Text style={styles.summaryMarks}>{result.total_marks}</Text>
            </View>
            <View style={[styles.overallRiskCard, { backgroundColor: overallCfg?.bg }]}>
              <Text style={[styles.overallRiskLabel, { color: overallCfg?.color }]}>Overall</Text>
              <Text style={[styles.overallRiskValue, { color: overallCfg?.color }]}>
                {overallCfg?.label}
              </Text>
            </View>
          </View>

          {/* Subject breakdown */}
          {result.subjects.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="document-outline" size={40} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No subject data available</Text>
            </View>
          )}

          {result.subjects.map(sub => {
            const riskCfg = RISK_CONFIG[sub.risk_label];
            const pct = sub.max_marks > 0 ? (sub.total_marks / sub.max_marks) * 100 : 0;
            const total = sub.correct + sub.wrong + sub.unattempted;

            return (
              <View key={sub.subject_id} style={styles.subjectCard}>
                {/* Subject header */}
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectHeaderLeft}>
                    <Text style={styles.subjectName}>{sub.subject_name}</Text>
                    <Text style={styles.subjectMarks}>
                      {sub.total_marks} / {sub.max_marks} marks
                    </Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg }]}>
                    <Text style={[styles.riskText, { color: riskCfg.color }]}>{sub.risk_label}</Text>
                  </View>
                </View>

                {/* Percentage bar */}
                <View style={styles.pctRow}>
                  <View style={styles.pctTrack}>
                    <View style={[
                      styles.pctFill,
                      { width: `${pct}%` as any, backgroundColor: riskCfg.color },
                    ]} />
                  </View>
                  <Text style={[styles.pctValue, { color: riskCfg.color }]}>{pct.toFixed(1)}%</Text>
                </View>

                {/* Correct / Wrong / Unattempted bars */}
                <View style={styles.statsBox}>
                  <BarStat label="Correct" value={sub.correct} max={total} color="#1D9E75" />
                  <BarStat label="Wrong" value={sub.wrong} max={total} color="#DC2626" />
                  <BarStat label="Skipped" value={sub.unattempted} max={total} color="#AAAAAA" />
                </View>

                {/* Mini stat pills */}
                <View style={styles.statPills}>
                  <View style={[styles.statPill, { backgroundColor: '#E1F5EE' }]}>
                    <Ionicons name="checkmark" size={11} color="#1D9E75" />
                    <Text style={[styles.statPillText, { color: '#1D9E75' }]}>{sub.correct}</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="close" size={11} color="#DC2626" />
                    <Text style={[styles.statPillText, { color: '#DC2626' }]}>{sub.wrong}</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: '#F5F5F5' }]}>
                    <Ionicons name="remove" size={11} color="#888888" />
                    <Text style={[styles.statPillText, { color: '#888888' }]}>{sub.unattempted}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE', gap: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backBtnPressed: { backgroundColor: '#F0F0F0' },
  navCenter: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '700', color: '#111111' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  stateText: { fontSize: 14, color: '#888888' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  errorBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#444444' },

  scroll: { padding: 16 },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  summaryLeft: { flex: 1 },
  summaryLabel: { fontSize: 12, color: '#AAAAAA', marginBottom: 4 },
  summaryMarks: { fontSize: 32, fontWeight: '800', color: '#111111' },
  overallRiskCard: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  overallRiskLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  overallRiskValue: { fontSize: 18, fontWeight: '800' },

  subjectCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  subjectHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  subjectHeaderLeft: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 2 },
  subjectMarks: { fontSize: 13, color: '#888888' },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 11, fontWeight: '700' },

  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  pctTrack: { flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
  pctFill: { height: '100%', borderRadius: 5 },
  pctValue: { width: 44, textAlign: 'right', fontSize: 14, fontWeight: '700' },

  statsBox: { backgroundColor: '#F8F8F8', borderRadius: 10, padding: 12, marginBottom: 12 },

  statPills: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 8 },
  statPillText: { fontSize: 13, fontWeight: '700' },
});
