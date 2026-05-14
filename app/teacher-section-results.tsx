import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyticsApi, type SectionDetail, type SectionStudent, type RiskLabel } from '../services/analytics';

const ACCENT = '#185FA5';

const RISK_CONFIG: Record<RiskLabel, { color: string; bg: string; icon: string }> = {
  SAFE:  { color: '#1D9E75', bg: '#E1F5EE', icon: 'checkmark-circle' },
  WATCH: { color: '#D97706', bg: '#FEF3C7', icon: 'alert-circle'     },
  ALERT: { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle'     },
};

type SortKey = 'rank' | 'risk';

const RISK_ORDER: Record<RiskLabel, number> = { ALERT: 0, WATCH: 1, SAFE: 2 };

export default function SectionResultsScreen() {
  const { examId, sectionId, sectionName } = useLocalSearchParams<{
    examId: string; sectionId: string; sectionName: string;
  }>();

  const [detail, setDetail] = useState<SectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('rank');

  useEffect(() => { if (examId && sectionId) fetchDetail(); }, [examId, sectionId]);

  async function fetchDetail() {
    setLoading(true);
    setError('');
    try {
      const data = await analyticsApi.getSectionDetail(examId!, sectionId!);
      setDetail(data);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load student results.');
    } finally {
      setLoading(false);
    }
  }

  const students = detail?.students ?? [];

  const filtered = students
    .filter(s => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === 'rank'
      ? b.total_pct - a.total_pct
      : RISK_ORDER[a.overall_risk] - RISK_ORDER[b.overall_risk],
    );

  const riskCounts = {
    SAFE: students.filter(s => s.overall_risk === 'SAFE').length,
    WATCH: students.filter(s => s.overall_risk === 'WATCH').length,
    ALERT: students.filter(s => s.overall_risk === 'ALERT').length,
  };

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
          <Text style={styles.navTitle} numberOfLines={1}>
            {sectionName || detail?.section_name || 'Section Results'}
          </Text>
          {detail?.exam.exam_name && (
            <Text style={styles.navSub}>{detail.exam.exam_name}</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.stateText}>Loading results…</Text>
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Couldn't load results</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchDetail}>
            <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && detail && (
        <>
          {/* Risk summary strip */}
          <View style={styles.riskStrip}>
            {(['ALERT', 'WATCH', 'SAFE'] as RiskLabel[]).map(risk => {
              const cfg = RISK_CONFIG[risk];
              return (
                <View key={risk} style={[styles.riskChip, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={[styles.riskChipNum, { color: cfg.color }]}>{riskCounts[risk]}</Text>
                  <Text style={[styles.riskChipLabel, { color: cfg.color }]}>{risk}</Text>
                </View>
              );
            })}
          </View>

          {/* Search + sort */}
          <View style={styles.controls}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={15} color="#AAAAAA" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search students…"
                placeholderTextColor="#AAAAAA"
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={15} color="#CCCCCC" />
                </Pressable>
              )}
            </View>
            <View style={styles.sortRow}>
              {(['rank', 'risk'] as SortKey[]).map(s => (
                <Pressable
                  key={s}
                  style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
                  onPress={() => setSort(s)}
                >
                  <Text style={[styles.sortBtnText, sort === s && styles.sortBtnTextActive]}>
                    {s === 'rank' ? 'By Rank' : 'By Risk'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {filtered.length === 0 && (
              <View style={styles.centered}>
                <Ionicons name="search-outline" size={40} color="#CCCCCC" />
                <Text style={styles.emptyTitle}>No students found</Text>
              </View>
            )}
            {filtered.map((student, idx) => (
              <StudentRow
                key={student.student_id}
                student={student}
                rank={sort === 'rank' ? idx + 1 : null}
                examId={examId!}
              />
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function StudentRow({ student, rank, examId }: { student: SectionStudent; rank: number | null; examId: string }) {
  const riskCfg = RISK_CONFIG[student.overall_risk];

  return (
    <Pressable
      style={({ pressed }) => [styles.studentCard, pressed && styles.studentCardPressed]}
      onPress={() => router.push({
        pathname: '/teacher-student-result',
        params: { studentId: student.student_id, examId, studentName: student.name },
      })}
    >
      <View style={styles.studentLeft}>
        {rank !== null && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rank}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
          {/* Subject % pills */}
          <View style={styles.subjectPills}>
            {student.maths_pct !== null && (
              <SubjectPill label="M" pct={student.maths_pct} risk={student.subject_risk?.MATHS} />
            )}
            {student.physics_pct !== null && (
              <SubjectPill label="P" pct={student.physics_pct} risk={student.subject_risk?.PHYSICS} />
            )}
            {student.chem_pct !== null && (
              <SubjectPill label="C" pct={student.chem_pct} risk={student.subject_risk?.CHEMISTRY} />
            )}
          </View>
        </View>
      </View>
      <View style={styles.studentRight}>
        <Text style={styles.totalPct}>{student.total_pct.toFixed(1)}%</Text>
        <View style={[styles.overallRisk, { backgroundColor: riskCfg.bg }]}>
          <Text style={[styles.overallRiskText, { color: riskCfg.color }]}>{student.overall_risk}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#CCCCCC" />
      </View>
    </Pressable>
  );
}

function SubjectPill({ label, pct, risk }: { label: string; pct: number; risk?: RiskLabel }) {
  const color = risk ? RISK_CONFIG[risk].color : '#888888';
  return (
    <View style={[subPill.wrap, { borderColor: color + '40' }]}>
      <Text style={[subPill.label, { color }]}>{label}</Text>
      <Text style={[subPill.pct, { color }]}>{pct.toFixed(0)}%</Text>
    </View>
  );
}
const subPill = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  label: { fontSize: 9, fontWeight: '700' },
  pct: { fontSize: 10, fontWeight: '600' },
});

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
  navSub: { fontSize: 11, color: '#AAAAAA', marginTop: 1 },

  riskStrip: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  riskChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 10 },
  riskChipNum: { fontSize: 15, fontWeight: '800' },
  riskChipLabel: { fontSize: 11, fontWeight: '600' },

  controls: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111111', paddingVertical: 0 },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sortBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#DDDDDD', alignItems: 'center' },
  sortBtnActive: { borderColor: ACCENT, backgroundColor: '#EBF2FB' },
  sortBtnText: { fontSize: 12, fontWeight: '500', color: '#888888' },
  sortBtnTextActive: { color: ACCENT, fontWeight: '600' },

  scrollContent: { padding: 12 },
  centered: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  errorBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#444444' },

  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  studentCardPressed: { opacity: 0.85 },
  studentLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EBF2FB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  studentName: { fontSize: 13, fontWeight: '600', color: '#111111', marginBottom: 4 },
  subjectPills: { flexDirection: 'row', gap: 5 },
  studentRight: { alignItems: 'flex-end', gap: 4 },
  totalPct: { fontSize: 15, fontWeight: '800', color: '#111111' },
  overallRisk: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  overallRiskText: { fontSize: 10, fontWeight: '700' },
});
