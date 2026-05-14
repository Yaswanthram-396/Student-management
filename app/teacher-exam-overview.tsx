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
import { analyticsApi, type ExamOverview, type RiskLabel } from '../services/analytics';
import { useTeacherStore } from '../store/teacher-store';

const ACCENT = '#185FA5';

const RISK_CONFIG: Record<RiskLabel, { color: string; bg: string }> = {
  SAFE:  { color: '#1D9E75', bg: '#E1F5EE' },
  WATCH: { color: '#D97706', bg: '#FEF3C7' },
  ALERT: { color: '#DC2626', bg: '#FEE2E2' },
};

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 3 },
});

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExamOverviewScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { selectedSection } = useTeacherStore();

  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { if (examId) fetchOverview(); }, [examId]);

  async function fetchOverview() {
    setLoading(true);
    setError('');
    try {
      const data = await analyticsApi.getExamOverview(examId!);
      setOverview(data);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load exam overview.');
    } finally {
      setLoading(false);
    }
  }

  const exam = overview?.exam;
  const subjectAvgs = overview?.subject_avgs ?? [];
  const topStudents = overview?.top_students ?? [];
  const sections = overview?.sections ?? [];

  // Determine which section to use for drill-down
  const drillSection = overview?.section?.id ?? selectedSection?.id;

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
        <Text style={styles.navTitle} numberOfLines={1}>
          {exam?.exam_name ?? 'Exam Overview'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.stateText}>Loading overview…</Text>
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Couldn't load overview</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchOverview}>
            <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && overview && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Exam header card */}
          <View style={styles.examCard}>
            <Text style={styles.examName}>{exam?.exam_name}</Text>
            {exam?.exam_date && (
              <View style={styles.examMeta}>
                <Ionicons name="calendar-outline" size={13} color="#AAAAAA" />
                <Text style={styles.examMetaText}>{formatDate(exam.exam_date)}</Text>
              </View>
            )}
            <View style={[styles.typeBadge, { backgroundColor: '#EBF2FB' }]}>
              <Text style={[styles.typeText, { color: ACCENT }]}>{exam?.type} EXAM</Text>
            </View>
          </View>

          {/* Subject averages */}
          {subjectAvgs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Subject Averages</Text>
              <View style={styles.card}>
                {subjectAvgs.map((sub, idx) => {
                  const pct = sub.avg_pct ?? 0;
                  const color = pct >= 60 ? '#1D9E75' : pct >= 40 ? '#D97706' : '#DC2626';
                  return (
                    <View key={idx} style={[styles.subjectRow, idx < subjectAvgs.length - 1 && styles.subjectRowBorder]}>
                      <Text style={styles.subjectName}>{sub.subject_name}</Text>
                      <View style={styles.subjectRight}>
                        <Text style={[styles.subjectPct, { color }]}>{pct.toFixed(1)}%</Text>
                        <PctBar pct={pct} color={color} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Sections (CLASS exam) */}
          {sections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Sections</Text>
              {sections.map(sec => (
                <Pressable
                  key={sec.id}
                  style={({ pressed }) => [styles.sectionCard, pressed && styles.sectionCardPressed]}
                  onPress={() => router.push({
                    pathname: '/teacher-section-results',
                    params: { examId: examId!, sectionId: sec.id, sectionName: sec.name },
                  })}
                >
                  <View style={styles.sectionCardLeft}>
                    <Text style={styles.sectionCardName}>{sec.name}</Text>
                    <Text style={styles.sectionCardMeta}>{sec.student_count} students</Text>
                  </View>
                  <View style={styles.sectionCardRight}>
                    <Text style={styles.sectionCardPct}>{(sec.avg_pct ?? 0).toFixed(1)}%</Text>
                    <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* View Section Results button (SECTION exam) */}
          {overview.exam.type === 'SECTION' && drillSection && (
            <View style={styles.section}>
              <Pressable
                style={({ pressed }) => [styles.viewSectionBtn, pressed && styles.viewSectionBtnPressed]}
                onPress={() => router.push({
                  pathname: '/teacher-section-results',
                  params: {
                    examId: examId!,
                    sectionId: drillSection,
                    sectionName: overview.section?.name ?? '',
                  },
                })}
              >
                <Ionicons name="people-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewSectionBtnText}>View Student Results</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* Top students */}
          {topStudents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Top Students</Text>
              <View style={styles.card}>
                {topStudents.map((st, idx) => {
                  const riskCfg = RISK_CONFIG[st.overall_risk];
                  return (
                    <Pressable
                      key={st.student_id}
                      style={[styles.topStudentRow, idx < topStudents.length - 1 && styles.topStudentBorder]}
                      onPress={() => router.push({
                        pathname: '/teacher-student-result',
                        params: { studentId: st.student_id, examId: examId!, studentName: st.name },
                      })}
                    >
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{idx + 1}</Text>
                      </View>
                      <Text style={styles.topStudentName} numberOfLines={1}>{st.name}</Text>
                      <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg }]}>
                        <Text style={[styles.riskText, { color: riskCfg.color }]}>{st.overall_risk}</Text>
                      </View>
                      <Text style={styles.topStudentPct}>{(st.total_pct ?? 0).toFixed(1)}%</Text>
                      <Ionicons name="chevron-forward" size={14} color="#CCCCCC" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111111', textAlign: 'center', marginHorizontal: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backBtnPressed: { backgroundColor: '#F0F0F0' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  stateText: { fontSize: 14, color: '#888888' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  errorBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  scroll: { padding: 16 },

  examCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 6,
    borderWidth: 0.5, borderColor: '#EEEEEE', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  examName: { fontSize: 18, fontWeight: '700', color: '#111111' },
  examMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  examMetaText: { fontSize: 13, color: '#AAAAAA' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  section: { marginTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  subjectRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  subjectRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111111' },
  subjectRight: { width: 80, alignItems: 'flex-end' },
  subjectPct: { fontSize: 15, fontWeight: '700' },

  sectionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionCardPressed: { opacity: 0.85 },
  sectionCardLeft: { flex: 1 },
  sectionCardName: { fontSize: 14, fontWeight: '600', color: '#111111' },
  sectionCardMeta: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  sectionCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCardPct: { fontSize: 15, fontWeight: '700', color: ACCENT },

  viewSectionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  viewSectionBtnPressed: { opacity: 0.85 },
  viewSectionBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  topStudentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  topStudentBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EBF2FB', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  topStudentName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#111111' },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  riskText: { fontSize: 10, fontWeight: '700' },
  topStudentPct: { fontSize: 13, fontWeight: '700', color: '#111111' },
});
