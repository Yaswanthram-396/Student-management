import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchTeacherExams,
  fetchTeacherExamOverview,
  type Exam,
  type ExamOverview,
} from '../../../services/teacher-results';

const ACCENT = '#185FA5';
const GREEN = '#1D9E75';
const AMBER = '#D97706';
const PURPLE = '#8B5CF6';
const RED = '#EF4444';

const PROGRESS_COLORS = [ACCENT, GREEN, PURPLE, AMBER, RED];

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getRankIconColor(rank: number) {
  if (rank === 1) return '#F59E0B'; // Gold
  if (rank === 2) return '#94A3B8'; // Silver
  if (rank === 3) return '#D97706'; // Bronze
  return '#E2E8F0'; // Default gray
}

export default function ResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const loadExams = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const data = await fetchTeacherExams();
      // Sort exams by date descending
      const sorted = data.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
      setExams(sorted);
      if (sorted.length > 0 && !isRefresh) {
        setSelectedExamId(sorted[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadOverview = useCallback(async (id: string) => {
    setOverviewLoading(true);
    try {
      const data = await fetchTeacherExamOverview(id);
      setOverview(data);
    } catch (err) {
      console.error(err);
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExams();
    }, [loadExams])
  );

  React.useEffect(() => {
    if (selectedExamId) {
      loadOverview(selectedExamId);
    }
  }, [selectedExamId, loadOverview]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading exams…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#CCCCCC" />
          <Text style={styles.errorTitle}>Couldn't load results</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadExams()}>
            <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate overall class avg from subject avgs for the overview card
  const overallAvg = overview?.class_avgs?.length
    ? overview.class_avgs.reduce((acc, curr) => acc + (curr.avg / curr.max_marks), 0) / overview.class_avgs.length * 100
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadExams(true);
            }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Exam Results</Text>
            <Text style={styles.pageSubtitle}>Analytics for your classes</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Ionicons name="bar-chart" size={24} color={ACCENT} />
          </View>
        </View>

        {/* ── Exams Horizontal List ── */}
        {exams.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examListContainer}
            >
              {exams.map((exam) => {
                const isSelected = exam.id === selectedExamId;
                const isPending = exam.analytics_status === 'PENDING' || exam.analytics_status === 'PROCESSING';
                return (
                  <Pressable
                    key={exam.id}
                    style={[
                      styles.examTabCard,
                      isSelected && styles.examTabCardSelected,
                    ]}
                    onPress={() => setSelectedExamId(exam.id)}
                  >
                    <Text style={[styles.examTabTitle, isSelected && styles.examTabTitleSelected]}>
                      {exam.exam_name}
                    </Text>
                    <Text style={[styles.examTabDate, isSelected && styles.examTabDateSelected]}>
                      {formatDate(exam.exam_date)}
                    </Text>
                    {isPending && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Exams Found</Text>
            <Text style={styles.emptyBody}>There are no exam results available for your classes yet.</Text>
          </View>
        )}

        {/* ── Selected Exam Overview ── */}
        {selectedExamId && overviewLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={ACCENT} />
          </View>
        ) : overview ? (
          <View style={styles.overviewContainer}>
            {/* Main Stats Card */}
            <View style={styles.card}>
              <View style={styles.examMainInfoRow}>
                <View style={styles.examIconWrap}>
                  <Ionicons name="school-outline" size={24} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.examMainTitle}>{overview.exam.exam_name}</Text>
                  <Text style={styles.examMainDate}>{formatDate(overview.exam.exam_date)}</Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{overview.exam.type}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{overallAvg.toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Class Avg</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{overview.sections?.length || 0}</Text>
                  <Text style={styles.statLabel}>Sections</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{overview.top_students?.length || 0}</Text>
                  <Text style={styles.statLabel}>Top Ranked</Text>
                </View>
              </View>
            </View>

            {/* Section Performance */}
            {overview.sections && overview.sections.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="grid-outline" size={20} color={ACCENT} />
                  <Text style={styles.cardTitle}>Section Performance</Text>
                </View>
                <View style={styles.sectionGrid}>
                  {overview.sections.map((sec) => (
                    <View key={sec.section_id} style={styles.sectionBox}>
                      <Text style={styles.sectionBoxName}>Section {sec.section_name}</Text>
                      <Text style={styles.sectionBoxAvg}>{sec.avg.toFixed(1)}%</Text>
                      <Text style={styles.sectionBoxLabel}>class avg</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Subject Averages */}
            {overview.class_avgs && overview.class_avgs.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="bar-chart-outline" size={20} color={ACCENT} />
                  <Text style={styles.cardTitle}>Subject Averages</Text>
                </View>
                <View style={styles.subjectList}>
                  {overview.class_avgs.map((subj, idx) => {
                    const percentage = (subj.avg / subj.max_marks) * 100;
                    const color = PROGRESS_COLORS[idx % PROGRESS_COLORS.length];
                    return (
                      <View key={subj.subject_id} style={styles.subjectItem}>
                        <View style={styles.subjectHeader}>
                          <View style={styles.subjectNameRow}>
                            <View style={[styles.subjectDot, { backgroundColor: color }]} />
                            <Text style={styles.subjectName}>{subj.subject_name}</Text>
                          </View>
                          <Text style={styles.subjectMarks}>
                            <Text style={styles.subjectMarksBold}>{subj.avg.toFixed(1)}</Text> / {subj.max_marks}
                          </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${percentage}%`, backgroundColor: color },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressPercent}>{percentage.toFixed(0)}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Top Students */}
            {overview.top_students && overview.top_students.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="trophy-outline" size={20} color={ACCENT} />
                  <Text style={styles.cardTitle}>Top Students</Text>
                </View>
                <View style={styles.studentList}>
                  {overview.top_students.map((student, idx) => {
                    const isTop3 = student.rank <= 3;
                    const iconColor = getRankIconColor(student.rank);
                    return (
                      <View key={student.student_id} style={[styles.studentItem, idx < overview.top_students.length - 1 && styles.studentItemBorder]}>
                        <View style={[styles.rankIcon, { backgroundColor: isTop3 ? iconColor : '#F1F5F9' }]}>
                          {isTop3 ? (
                            <Ionicons name="trophy" size={16} color="#FFFFFF" />
                          ) : (
                            <Text style={styles.rankTextNum}>{student.rank}</Text>
                          )}
                        </View>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentRefId}>{student.student_ref_id}</Text>
                        </View>
                        <View style={styles.studentMarksCol}>
                          <Text style={styles.studentTotalMarks}>{student.total_marks}</Text>
                          <Text style={styles.studentMarksLabel}>marks</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : null}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' }, // A slightly cooler gray/blue background
  scrollContent: { padding: 16, gap: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, marginTop: 40 },
  loadingText: { fontSize: 14, color: '#888888' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },

  examListContainer: {
    paddingRight: 16,
    gap: 12,
  },
  examTabCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 140,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  examTabCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: ACCENT,
  },
  examTabTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 4 },
  examTabTitleSelected: { color: ACCENT },
  examTabDate: { fontSize: 12, color: '#94A3B8' },
  examTabDateSelected: { color: '#60A5FA' },
  pendingBadge: {
    position: 'absolute',
    bottom: -8,
    right: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '600', color: '#D97706' },

  overviewContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  examMainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  examIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  examMainTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  examMainDate: { fontSize: 13, color: '#64748B', marginTop: 2 },
  typeBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#7E22CE', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: ACCENT },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9' },

  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionBoxName: { fontSize: 13, fontWeight: '500', color: '#64748B', marginBottom: 8 },
  sectionBoxAvg: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  sectionBoxLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  subjectList: { gap: 16 },
  subjectItem: {},
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectName: { fontSize: 13, fontWeight: '600', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 },
  subjectMarks: { fontSize: 12, color: '#94A3B8' },
  subjectMarksBold: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    textAlign: 'right',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },

  studentList: { gap: 0 },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  studentItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rankIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rankTextNum: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  studentRefId: { fontSize: 12, color: '#94A3B8' },
  studentMarksCol: { alignItems: 'flex-end' },
  studentTotalMarks: { fontSize: 16, fontWeight: '700', color: ACCENT },
  studentMarksLabel: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
});
