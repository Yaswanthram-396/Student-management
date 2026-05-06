import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, StatusPill, BottomSheet } from '../shared';

const EXAM_SCORES: Record<string, { avg: number; high: number; low: number }[]> = {
  'Mid-Term 2026':    [{ avg: 71, high: 98, low: 34 }, { avg: 76, high: 95, low: 41 }, { avg: 82, high: 99, low: 52 }, { avg: 78, high: 97, low: 45 }],
  'Unit Test 1':      [{ avg: 68, high: 92, low: 30 }, { avg: 74, high: 90, low: 38 }, { avg: 79, high: 96, low: 48 }, { avg: 75, high: 94, low: 42 }],
  'Annual Exam 2025': [{ avg: 74, high: 99, low: 38 }, { avg: 79, high: 97, low: 44 }, { avg: 85, high: 100, low: 55 }, { avg: 81, high: 98, low: 48 }],
};

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

const STUDENTS: Student[] = [
  { rank: 1, name: 'Ananya Singh', total: '363/400', pct: '91%', class: 'Class 6', breakdown: { Math: 91, Science: 88, English: 95, Hindi: 89 } },
  { rank: 2, name: 'Aarav Sharma', total: '351/400', pct: '88%', class: 'Class 7', breakdown: { Math: 87, Science: 85, English: 91, Hindi: 88 } },
  { rank: 3, name: 'Kavya Nair',   total: '340/400', pct: '85%', class: 'Class 8', breakdown: { Math: 84, Science: 83, English: 88, Hindi: 85 } },
  { rank: 4, name: 'Ishaan Verma', total: '318/400', pct: '80%', class: 'Class 6', breakdown: { Math: 78, Science: 80, English: 82, Hindi: 78 } },
  { rank: 5, name: 'Priya Reddy',  total: '302/400', pct: '76%', class: 'Class 7', breakdown: { Math: 74, Science: 75, English: 79, Hindi: 74 } },
];

function RankBadge({ rank }: { rank: number }) {
  const bg = RANK_CFG[rank]?.bg ?? colors.border;
  return (
    <View style={[styles.rankBadge, { backgroundColor: bg }]}>
      <Text style={styles.rankBadgeText}>{rank}</Text>
    </View>
  );
}

export function ResultsScreen() {
  const [exams, setExams]             = useState<string[]>(Object.keys(EXAM_SCORES));
  const [exam, setExam]               = useState('Mid-Term 2026');
  const [classFilter, setClassFilter] = useState('All');
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [published, setPublished]     = useState(false);

  // Exam creation state
  const [showExamSheet, setShowExamSheet]       = useState(false);
  const [newExamName, setNewExamName]           = useState('');
  const [newExamSubjects, setNewExamSubjects]   = useState<string[]>([]);
  const [newExamDate, setNewExamDate]           = useState('');
  const [creatingExam, setCreatingExam]         = useState(false);

  const scores           = EXAM_SCORES[exam] ?? EXAM_SCORES['Mid-Term 2026'];
  const filteredStudents = classFilter === 'All' ? STUDENTS : STUDENTS.filter(s => s.class === classFilter);

  function handleToggleExpand(rank: number) {
    setExpanded(prev => (prev === rank ? null : rank));
  }

  function toggleSubject(sub: string) {
    setNewExamSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  }

  function handleCreateExam() {
    if (!newExamName.trim()) return;
    setCreatingExam(true);
    setTimeout(() => {
      const name = newExamName.trim();
      setExams(prev => [...prev, name]);
      setExam(name);
      setCreatingExam(false);
      setShowExamSheet(false);
      setNewExamName('');
      setNewExamSubjects([]);
      setNewExamDate('');
    }, 600);
  }

  const ScoreTable = (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        {['Subject', 'Avg', 'Highest', 'Lowest'].map(h => (
          <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
        ))}
      </View>
      {SUBJECTS.map((s, i) => (
        <View
          key={s}
          style={[
            styles.tableRow,
            { backgroundColor: i % 2 === 0 ? colors.surface : colors.background },
          ]}
        >
          <Text style={[styles.tableCell, styles.tableCellSubject]}>{s}</Text>
          <Text style={[styles.tableCell, styles.tableCellCenter]}>{scores[i].avg}%</Text>
          <Text style={[styles.tableCell, styles.tableCellCenter, { color: '#0F6E56' }]}>
            {scores[i].high}%
          </Text>
          <Text style={[styles.tableCell, styles.tableCellCenter, { color: '#991B1B' }]}>
            {scores[i].low}%
          </Text>
        </View>
      ))}
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
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { padding: spacing.lg },
  listHeader: { gap: spacing.lg, marginBottom: spacing.sm },
  fieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  // Exam selector
  examList: { paddingVertical: spacing.xs },
  examOption: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  examOptionActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  examOptionText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  examOptionTextActive: { color: colors.surface },
  // Class filter
  classFilters: { paddingVertical: spacing.xs },
  classFilter: {
    paddingVertical: 5, paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  classFilterActive:     { backgroundColor: colors.principal, borderColor: 'transparent' },
  classFilterText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  classFilterTextActive: { color: colors.surface },
  // Score table
  tableCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.principal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tableHeaderCell: {
    flex: 1, ...(typography.label as object),
    fontWeight: '600', color: colors.surface, textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  tableCell:         { flex: 1, ...(typography.caption as object) },
  tableCellSubject:  { fontWeight: '500', color: colors.textPrimary },
  tableCellCenter:   { color: colors.textSecondary, textAlign: 'center' },
  sectionLabel:      { ...(typography.label as object), color: colors.textMuted },
  // Student cards
  studentCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border, borderRadius: 14,
  },
  studentHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rankBadgeText: { ...(typography.caption as object), fontWeight: '700', color: colors.surface },
  studentName:   { flex: 1, ...(typography.body as object), color: colors.textPrimary },
  studentScore:  { ...(typography.body as object), fontWeight: '600', color: colors.principal },
  breakdown: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    gap: spacing.md,
  },
  breakdownItem:  { flex: 1, alignItems: 'center', gap: spacing.xs },
  breakdownSub:   { ...(typography.caption as object), color: colors.textMuted },
  breakdownScore: { ...(typography.body as object), fontWeight: '600', color: colors.principal },
  // Publish bar
  publishBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  publishBtn: {
    height: 48, borderRadius: 10,
    backgroundColor: colors.principal,
    alignItems: 'center', justifyContent: 'center',
  },
  publishBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
  publishedRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  unpublishText: {
    ...(typography.caption as object), color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  // Exam creation sheet
  sheetTitle:      { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  sheetFieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  subjectChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  subjectChip: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 0.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  subjectChipActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  subjectChipText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  subjectChipTextActive: { color: colors.surface },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText:         { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  createExamBtn:         { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  createExamBtnCreating: { backgroundColor: colors.success },
  createExamBtnText:     { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
