import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, StatusPill } from '../shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// bar sits inside card (horizontal margin lg*2) + card inner padding (lg*2)
const BAR_TOTAL_WIDTH = SCREEN_WIDTH - spacing.lg * 4 - spacing.lg * 2;

type SubjectResult = {
  subject: string;
  color: string;
  scored: number;
  total: number;
};

type ExamResult = {
  exam: string;
  scored: number;
  total: number;
  rank: string;
  grade: string;
  subjects: SubjectResult[];
  remark: string;
};

type ChildResults = {
  name: string;
  cls: string;
  results: ExamResult[];
};

const EXAMS = ['Mid-Term 2026', 'Unit Test 1', 'Annual Exam 2025'];

const DATA: ChildResults[] = [
  {
    name: 'Arjun',
    cls: 'Class 6 – Section B',
    results: [
      {
        exam: 'Mid-Term 2026',
        scored: 437,
        total: 500,
        rank: '2nd in Class',
        grade: 'A',
        remark:
          'Excellent performance this term. Strong in English and Math. Needs focus on SST.',
        subjects: [
          { subject: 'Math', color: '#185FA5', scored: 91, total: 100 },
          { subject: 'Science', color: '#1D9E75', scored: 88, total: 100 },
          { subject: 'English', color: '#7C3AED', scored: 95, total: 100 },
          { subject: 'Hindi', color: '#F59E0B', scored: 89, total: 100 },
          { subject: 'SST', color: '#F97316', scored: 74, total: 100 },
        ],
      },
      {
        exam: 'Unit Test 1',
        scored: 403,
        total: 500,
        rank: '3rd in Class',
        grade: 'A',
        remark:
          'Excellent performance this term. Strong in English and Math. Needs focus on SST.',
        subjects: [
          { subject: 'Math', color: '#185FA5', scored: 82, total: 100 },
          { subject: 'Science', color: '#1D9E75', scored: 79, total: 100 },
          { subject: 'English', color: '#7C3AED', scored: 88, total: 100 },
          { subject: 'Hindi', color: '#F59E0B', scored: 84, total: 100 },
          { subject: 'SST', color: '#F97316', scored: 70, total: 100 },
        ],
      },
      {
        exam: 'Annual Exam 2025',
        scored: 455,
        total: 500,
        rank: '1st in Class',
        grade: 'A+',
        remark:
          'Outstanding academic performance throughout the year. Keep it up!',
        subjects: [
          { subject: 'Math', color: '#185FA5', scored: 95, total: 100 },
          { subject: 'Science', color: '#1D9E75', scored: 92, total: 100 },
          { subject: 'English', color: '#7C3AED', scored: 96, total: 100 },
          { subject: 'Hindi', color: '#F59E0B', scored: 88, total: 100 },
          { subject: 'SST', color: '#F97316', scored: 84, total: 100 },
        ],
      },
    ],
  },
  {
    name: 'Sneha',
    cls: 'Class 3 – Section A',
    results: [
      {
        exam: 'Mid-Term 2026',
        scored: 384,
        total: 500,
        rank: '5th in Class',
        grade: 'B+',
        remark:
          'Good improvement in Science. Should work on Math and Hindi for better results.',
        subjects: [
          { subject: 'Math', color: '#185FA5', scored: 78, total: 100 },
          { subject: 'Science', color: '#1D9E75', scored: 82, total: 100 },
          { subject: 'English', color: '#7C3AED', scored: 88, total: 100 },
          { subject: 'Hindi', color: '#F59E0B', scored: 71, total: 100 },
          { subject: 'SST', color: '#F97316', scored: 65, total: 100 },
        ],
      },
      {
        exam: 'Unit Test 1',
        scored: 348,
        total: 500,
        rank: '6th in Class',
        grade: 'B',
        remark:
          'Good improvement in Science. Should work on Math and Hindi for better results.',
        subjects: [
          { subject: 'Math', color: '#185FA5', scored: 68, total: 100 },
          { subject: 'Science', color: '#1D9E75', scored: 74, total: 100 },
          { subject: 'English', color: '#7C3AED', scored: 80, total: 100 },
          { subject: 'Hindi', color: '#F59E0B', scored: 66, total: 100 },
          { subject: 'SST', color: '#F97316', scored: 60, total: 100 },
        ],
      },
      {
        exam: 'Annual Exam 2025',
        scored: 400,
        total: 500,
        rank: '4th in Class',
        grade: 'B+',
        remark:
          'Good improvement in Science. Should work on Math and Hindi for better results.',
        subjects: [
          { subject: 'Math', color: '#185FA5', scored: 82, total: 100 },
          { subject: 'Science', color: '#1D9E75', scored: 85, total: 100 },
          { subject: 'English', color: '#7C3AED', scored: 90, total: 100 },
          { subject: 'Hindi', color: '#F59E0B', scored: 75, total: 100 },
          { subject: 'SST', color: '#F97316', scored: 68, total: 100 },
        ],
      },
    ],
  },
];

function progressColor(scored: number, total: number) {
  const pct = (scored / total) * 100;
  if (pct >= 80) return '#1D9E75';
  if (pct >= 60) return '#F59E0B';
  return '#EF4444';
}

function SubjectCard({ item }: { item: SubjectResult }) {
  const fillWidth = (item.scored / item.total) * BAR_TOTAL_WIDTH;
  return (
    <View style={styles.subjectCard}>
      <View style={styles.subjectRow}>
        <View style={styles.subjectLeft}>
          <View style={[styles.subjectDot, { backgroundColor: item.color }]} />
          <Text style={styles.subjectName}>{item.subject}</Text>
        </View>
        <Text style={styles.subjectScore}>
          {item.scored}
          <Text style={styles.subjectTotal}>/{item.total}</Text>
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: fillWidth,
              backgroundColor: progressColor(item.scored, item.total),
            },
          ]}
        />
      </View>
    </View>
  );
}

export function ResultsScreen() {
  const [selectedExam, setSelectedExam] = useState(EXAMS[0]);
  const [selectedChild, setSelectedChild] = useState(0);

  const childData = DATA[selectedChild];
  const result = childData.results.find(r => r.exam === selectedExam) ?? childData.results[0];
  const percentage = Math.round((result.scored / result.total) * 100);

  const ListHeader = (
    <>
      {/* Exam selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.examRow}
      >
        {EXAMS.map(exam => (
          <Pressable
            key={exam}
            style={[styles.examPill, selectedExam === exam && styles.examPillActive]}
            onPress={() => setSelectedExam(exam)}
          >
            <Text style={[styles.examPillText, selectedExam === exam && styles.examPillTextActive]}>
              {exam}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Child switcher */}
      <View style={styles.childSwitcher}>
        {DATA.map((child, i) => (
          <Pressable
            key={child.name}
            style={[styles.childPill, selectedChild === i && styles.childPillActive]}
            onPress={() => setSelectedChild(i)}
          >
            <Text style={[styles.childPillText, selectedChild === i && styles.childPillTextActive]}>
              {child.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Score card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCardTop}>
          <Text style={styles.scoreChildName}>{childData.name}</Text>
          <Text style={styles.scoreChildCls}>{childData.cls}</Text>
        </View>
        <Text style={styles.scorePct}>{percentage}%</Text>
        <Text style={styles.scoreRaw}>
          {result.scored} out of {result.total}
        </Text>
        <View style={styles.scoreCardBottom}>
          <Text style={styles.scoreMeta}>{result.rank}</Text>
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{result.grade}</Text>
          </View>
          <StatusPill variant="success" label="Pass" />
        </View>
      </View>

      {/* Section label */}
      <Text style={styles.sectionLabel}>SUBJECT BREAKDOWN</Text>
    </>
  );

  const RemarkCard = (
    <View style={styles.remarkCard}>
      <Text style={styles.remarkLabel}>CLASS TEACHER'S REMARK</Text>
      <View style={styles.remarkTeacherRow}>
        <View style={styles.remarkAvatar}>
          <Text style={styles.remarkInitials}>SR</Text>
        </View>
        <Text style={styles.remarkTeacherName}>Mrs. Sunita Rao</Text>
      </View>
      <Text style={styles.remarkText}>{result.remark}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar center={<Text style={styles.headerTitle}>Results</Text>} />
      <FlatList
        data={result.subjects}
        keyExtractor={(item) => item.subject}
        renderItem={({ item }) => <SubjectCard item={item} />}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={RemarkCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  listContent: { paddingBottom: spacing.xxl },

  // Exam selector
  examRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  examPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  examPillActive: { backgroundColor: colors.parent },
  examPillText: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  examPillTextActive: { color: colors.surface },

  // Child switcher
  childSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  childPill: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  childPillActive: {
    backgroundColor: colors.parent,
    borderColor: colors.parent,
  },
  childPillText: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  childPillTextActive: { color: colors.surface },

  // Score card
  scoreCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#E1F5EE',
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreCardTop: { alignItems: 'center', marginBottom: spacing.sm },
  scoreChildName: {
    ...(typography.h2 as object),
    color: colors.textPrimary,
    fontWeight: '600',
  },
  scoreChildCls: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: 2,
  },
  scorePct: {
    fontSize: 40,
    fontWeight: '600',
    color: colors.parent,
    lineHeight: 48,
  },
  scoreRaw: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  scoreCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  scoreMeta: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  gradeBadge: {
    backgroundColor: colors.parent,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  gradeText: {
    ...(typography.label as object),
    color: colors.surface,
    fontWeight: '700',
  },

  // Section label
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Subject cards
  subjectCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subjectName: {
    ...(typography.body as object),
    color: colors.textPrimary,
  },
  subjectScore: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.parent,
  },
  subjectTotal: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
  },
  barTrack: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },

  // Remark card
  remarkCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  remarkLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  remarkTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  remarkAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.parent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remarkInitials: {
    ...(typography.label as object),
    color: colors.surface,
    fontWeight: '600',
  },
  remarkTeacherName: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  remarkText: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
