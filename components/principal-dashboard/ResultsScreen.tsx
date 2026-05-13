import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, StatusPill, BottomSheet } from '../shared';
import { principalApi } from '../../services/principal';
import type { StudentResult, ResultSummary } from '../../types/principal';

const SUBJECTS      = ['Math', 'Science', 'English', 'Hindi'];
const ALL_SUBJECTS  = ['Math', 'Science', 'English', 'Hindi', 'SST'];
const CLASS_FILTERS = ['All', 'Class 6', 'Class 7', 'Class 8'];

const RANK_CFG: Record<number, { bg: string }> = {
  1: { bg: '#F59E0B' },
  2: { bg: '#9CA3AF' },
  3: { bg: '#CD7C2A' },
};

type Student = {
  rank: number; name: string; total: string; pct: string;
  breakdown: Record<string, number>;
  class: string;
};

function mapApiStudent(r: StudentResult): Student {
  return {
    rank: r.rank,
    name: r.student_name,
    total: `${r.total_marks}/${r.max_marks}`,
    pct: `${r.percentage.toFixed(0)}%`,
    class: 'Class 6', // API result doesn't include class — kept as default
    breakdown: Object.fromEntries(r.subjects.map(s => [s.subject_name, s.marks_obtained])),
  };
}

function RankBadge({ rank }: { rank: number }) {
  const bg = RANK_CFG[rank]?.bg ?? colors.border;
  return (
    <View style={[styles.rankBadge, { backgroundColor: bg }]}>
      <Text style={styles.rankBadgeText}>{rank}</Text>
    </View>
  );
}

export function ResultsScreen() {
  const [exams, setExams]                     = useState<string[]>([]);
  const [exam, setExam]                       = useState('');
  const [examIdMap, setExamIdMap]             = useState<Record<string, string>>({});
  const [classFilter, setClassFilter]         = useState('All');
  const [students, setStudents]               = useState<Student[]>([]);
  const [summary, setSummary]                 = useState<ResultSummary | null>(null);
  const [expanded, setExpanded]               = useState<number | null>(null);
  const [published, setPublished]             = useState(false);
  const [loadingExams, setLoadingExams]       = useState(true);
  const [loadingResults, setLoadingResults]   = useState(false);

  // Exam creation state
  const [showExamSheet, setShowExamSheet]     = useState(false);
  const [newExamName, setNewExamName]         = useState('');
  const [newExamSubjects, setNewExamSubjects] = useState<string[]>([]);
  const [newExamDate, setNewExamDate]         = useState('');
  const [creatingExam, setCreatingExam]       = useState(false);

  const filteredStudents = classFilter === 'All'
    ? students
    : students.filter(s => s.class === classFilter);

  // ── Load exam list on mount ───────────────────────────────────────────────
  useEffect(() => {
    setLoadingExams(true);
    principalApi.getExams()
      .then(data => {
        if (data.length > 0) {
          const names = data.map(e => e.name);
          const idMap = Object.fromEntries(data.map(e => [e.name, e.id]));
          setExams(names);
          setExamIdMap(idMap);
          setExam(names[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExams(false));
  }, []);

  // ── Load results when selected exam changes ───────────────────────────────
  useEffect(() => {
    const examId = examIdMap[exam];
    if (!examId) return;
    setLoadingResults(true);
    principalApi.getResults({ exam_id: examId })
      .then(data => {
        setStudents(data.results.map(mapApiStudent));
        setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [exam, examIdMap]);

  function handleToggleExpand(rank: number) {
    setExpanded(prev => (prev === rank ? null : rank));
  }

  function toggleSubject(sub: string) {
    setNewExamSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  }

  async function handleCreateExam() {
    if (!newExamName.trim()) return;
    setCreatingExam(true);
    try {
      const date = newExamDate || new Date().toISOString().split('T')[0];
      const created = await principalApi.createExam({
        name: newExamName.trim(),
        start_date: date,
        end_date: date,
        class_ids: ["1"],    // ⚠ placeholder — needs class picker API
        section_ids: ["1"],  // ⚠ placeholder — needs section picker API
        subjects: newExamSubjects.length > 0
          ? newExamSubjects.map((_, i) => ({ subject_id: String(i + 1), max_marks: 100, pass_marks: 35 }))
          : [{ subject_id: "1", max_marks: 100, pass_marks: 35 }],
      });
      setExams(prev => [...prev, created.name]);
      setExamIdMap(prev => ({ ...prev, [created.name]: created.id }));
      setExam(created.name);
      setShowExamSheet(false);
      setNewExamName(''); setNewExamSubjects([]); setNewExamDate('');
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to create exam.');
    } finally {
      setCreatingExam(false);
    }
  }

  // ── Score table (uses summary from API or placeholder) ────────────────────
  const ScoreTable = (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        {['Subject', 'Avg', 'Highest', 'Lowest'].map(h => (
          <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
        ))}
      </View>
      {summary ? (
        // Show summary row when we have API data
        <View style={[styles.tableRow, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableCell, styles.tableCellSubject]}>All Subjects</Text>
          <Text style={[styles.tableCell, styles.tableCellCenter]}>{summary.average_percentage.toFixed(0)}%</Text>
          <Text style={[styles.tableCell, styles.tableCellCenter, { color: '#0F6E56' }]}>
            {summary.highest_percentage.toFixed(0)}%
          </Text>
          <Text style={[styles.tableCell, styles.tableCellCenter, { color: '#991B1B' }]}>
            {summary.lowest_percentage.toFixed(0)}%
          </Text>
        </View>
      ) : (
        SUBJECTS.map((s, i) => (
          <View key={s} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? colors.surface : colors.background }]}>
            <Text style={[styles.tableCell, styles.tableCellSubject]}>{s}</Text>
            <Text style={[styles.tableCell, styles.tableCellCenter]}>—</Text>
            <Text style={[styles.tableCell, styles.tableCellCenter, { color: '#0F6E56' }]}>—</Text>
            <Text style={[styles.tableCell, styles.tableCellCenter, { color: '#991B1B' }]}>—</Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Results</Text>}
        right={
          <Pressable onPress={() => setShowExamSheet(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.principal} />
          </Pressable>
        }
      />

      <FlatList
        data={filteredStudents}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          loadingResults
            ? <ActivityIndicator color={colors.principal} style={{ marginTop: spacing.xxl }} />
            : null
        }
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <Pressable
              style={styles.studentHeader}
              onPress={() => handleToggleExpand(item.rank)}
            >
              <RankBadge rank={item.rank} />
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentScore}>{item.total} · {item.pct}</Text>
              <Ionicons
                name={expanded === item.rank ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textMuted}
              />
            </Pressable>
            {expanded === item.rank && (
              <View style={styles.breakdown}>
                {Object.entries(item.breakdown).map(([sub, sc]) => (
                  <View key={sub} style={styles.breakdownItem}>
                    <Text style={styles.breakdownSub}>{sub}</Text>
                    <Text style={styles.breakdownScore}>{sc}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Exam selector */}
            <View>
              <Text style={styles.fieldLabel}>Select Exam</Text>
              {loadingExams ? (
                <ActivityIndicator color={colors.principal} style={{ marginVertical: spacing.sm }} />
              ) : (
                <FlatList
                  data={exams}
                  keyExtractor={e => e}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.examList}
                  ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.examOption, exam === item && styles.examOptionActive]}
                      onPress={() => setExam(item)}
                    >
                      <Text style={[styles.examOptionText, exam === item && styles.examOptionTextActive]}>
                        {item}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>

            {/* Class filter */}
            <FlatList
              data={CLASS_FILTERS}
              keyExtractor={c => c}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.classFilters}
              ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.classFilter, classFilter === item && styles.classFilterActive]}
                  onPress={() => setClassFilter(item)}
                >
                  <Text style={[styles.classFilterText, classFilter === item && styles.classFilterTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />

            {/* Score table */}
            {ScoreTable}

            <Text style={styles.sectionLabel}>Student Results</Text>
          </View>
        }
      />

      {/* Publish bar */}
      <View style={styles.publishBar}>
        {!published ? (
          <Pressable style={styles.publishBtn} onPress={() => setPublished(true)}>
            <Text style={styles.publishBtnText}>Publish Results to Students</Text>
          </Pressable>
        ) : (
          <View style={styles.publishedRow}>
            <StatusPill variant="success" label="Results Published" />
            <Pressable onPress={() => setPublished(false)}>
              <Text style={styles.unpublishText}>Unpublish</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Exam creation sheet */}
      <BottomSheet visible={showExamSheet} onClose={() => setShowExamSheet(false)}>
        <Text style={styles.sheetTitle}>New Exam</Text>

        <Text style={styles.sheetFieldLabel}>Exam Name</Text>
        <TextInput
          style={styles.textInput}
          value={newExamName}
          onChangeText={setNewExamName}
          placeholder="e.g. Unit Test 2"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>Subjects</Text>
        <View style={styles.subjectChips}>
          {ALL_SUBJECTS.map(sub => (
            <Pressable
              key={sub}
              style={[styles.subjectChip, newExamSubjects.includes(sub) && styles.subjectChipActive]}
              onPress={() => toggleSubject(sub)}
            >
              <Text style={[styles.subjectChipText, newExamSubjects.includes(sub) && styles.subjectChipTextActive]}>
                {sub}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sheetFieldLabel}>Exam Date</Text>
        <TextInput
          style={styles.textInput}
          value={newExamDate}
          onChangeText={setNewExamDate}
          placeholder="e.g. 15 May 2026"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowExamSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.createExamBtn, creatingExam && styles.createExamBtnCreating]}
            onPress={handleCreateExam}
          >
            <Text style={styles.createExamBtnText}>
              {creatingExam ? 'Creating...' : 'Create Exam'}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { padding: spacing.lg },
  listHeader:  { gap: spacing.lg, marginBottom: spacing.sm },
  fieldLabel:  { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  // Exam selector
  examList: { paddingVertical: spacing.xs },
  examOption: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  examOptionActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  examOptionText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  examOptionTextActive: { color: colors.surface },
  // Class filter
  classFilters: { paddingVertical: spacing.xs },
  classFilter: {
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  classFilterActive:     { backgroundColor: colors.principal, borderColor: 'transparent' },
  classFilterText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  classFilterTextActive: { color: colors.surface },
  // Score table
  tableCard: {
    backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: colors.principal,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  tableHeaderCell: {
    flex: 1, ...(typography.label as object), fontWeight: '600', color: colors.surface, textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  tableCell:        { flex: 1, ...(typography.caption as object) },
  tableCellSubject: { fontWeight: '500', color: colors.textPrimary },
  tableCellCenter:  { color: colors.textSecondary, textAlign: 'center' },
  sectionLabel:     { ...(typography.label as object), color: colors.textMuted },
  // Student cards
  studentCard: {
    backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, borderRadius: 14,
  },
  studentHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rankBadgeText:  { ...(typography.caption as object), fontWeight: '700', color: colors.surface },
  studentName:    { flex: 1, ...(typography.body as object), color: colors.textPrimary },
  studentScore:   { ...(typography.body as object), fontWeight: '600', color: colors.principal },
  breakdown: {
    flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md, borderTopWidth: 0.5, borderTopColor: colors.border, gap: spacing.md,
  },
  breakdownItem:  { flex: 1, alignItems: 'center', gap: spacing.xs },
  breakdownSub:   { ...(typography.caption as object), color: colors.textMuted },
  breakdownScore: { ...(typography.body as object), fontWeight: '600', color: colors.principal },
  // Publish bar
  publishBar: {
    backgroundColor: colors.surface, borderTopWidth: 0.5, borderTopColor: colors.border,
    padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  publishBtn:     { height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  publishBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
  publishedRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unpublishText:  { ...(typography.caption as object), color: colors.textMuted, textDecorationLine: 'underline' },
  // Exam creation sheet
  sheetTitle:      { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  sheetFieldLabel: { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  subjectChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  subjectChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  subjectChipActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  subjectChipText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  subjectChipTextActive: { color: colors.surface },
  sheetBtns:             { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText:         { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  createExamBtn:         { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  createExamBtnCreating: { backgroundColor: colors.success },
  createExamBtnText:     { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
