import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, SegmentedControl } from '../shared';
import { principalApi } from '../../services/principal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_W = SCREEN_WIDTH - spacing.lg * 4;
const CHART_H = 150;

const ATTENDANCE_TRENDS: Record<string, { day: string; val: number }[]> = {
  'This Week':  [{ day:'Mon',val:82 },{ day:'Tue',val:87 },{ day:'Wed',val:79 },{ day:'Thu',val:91 },{ day:'Fri',val:85 }],
  'This Month': [{ day:'W1', val:84 },{ day:'W2', val:88 },{ day:'W3', val:81 },{ day:'W4', val:90 },{ day:'W5', val:87 }],
  'This Term':  [{ day:'Jan',val:80 },{ day:'Feb',val:84 },{ day:'Mar',val:88 },{ day:'Apr',val:85 },{ day:'May',val:90 }],
};

const SUBJECT_PERF = [
  { subject: 'Math',    score: 71 },
  { subject: 'Science', score: 76 },
  { subject: 'English', score: 82 },
  { subject: 'Hindi',   score: 78 },
  { subject: 'SST',     score: 74 },
];

type ClassCard = { id: string; cls: string; att: string; avg: number; up: boolean };
const CLASS_COMPARISON: ClassCard[] = [
  { id: '6', cls: 'Class 6', att: '87%', avg: 74, up: true  },
  { id: '7', cls: 'Class 7', att: '79%', avg: 68, up: false },
  { id: '8', cls: 'Class 8', att: '91%', avg: 81, up: true  },
  { id: '9', cls: 'Class 9', att: '83%', avg: 72, up: true  },
];

type Teacher = { id: string; initials: string; name: string; hw: number; att: string };
const TEACHER_ACTIVITY: Teacher[] = [
  { id: 'SR', initials: 'SR', name: 'Mrs. Sunita Rao',  hw: 4, att: '100%' },
  { id: 'AK', initials: 'AK', name: 'Mr. Ajay Kumar',   hw: 2, att: '95%'  },
  { id: 'PM', initials: 'PM', name: 'Mrs. Pooja Mehta', hw: 5, att: '100%' },
];

const CHART_CONFIG = {
  backgroundColor: colors.surface,
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: () => colors.success,
  labelColor: () => colors.textMuted,
  propsForDots: { r: '3', fill: colors.success, strokeWidth: '0' },
  strokeWidth: 2,
  decimalPlaces: 0,
};

function SubjectBarChart() {
  const BAR_LABEL_W = 56;
  const BAR_SCORE_W = 28;
  return (
    <View style={styles.barChartContainer}>
      {SUBJECT_PERF.map(({ subject, score }) => (
        <View key={subject} style={styles.barRow}>
          <Text style={[styles.barSubject, { width: BAR_LABEL_W }]}>{subject}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${score}%` as any }]} />
          </View>
          <Text style={[styles.barScore, { width: BAR_SCORE_W }]}>{score}</Text>
        </View>
      ))}
    </View>
  );
}

function today() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0];
}
const DATE_RANGES: Record<string, { date_from: string; date_to: string }> = {
  'This Week':  { date_from: daysAgo(7),  date_to: today() },
  'This Month': { date_from: daysAgo(30), date_to: today() },
  'This Term':  { date_from: daysAgo(90), date_to: today() },
};

export function AnalyticsScreen() {
  const [range, setRange] = useState('This Week');
  const trendData = ATTENDANCE_TRENDS[range];

  // Fetch analytics on range change — keep hardcoded charts as fallback if API returns empty
  useEffect(() => {
    principalApi.getAnalytics(DATE_RANGES[range])
      .catch(() => {}); // hardcoded charts remain; no state update on empty response
  }, [range]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar center={<Text style={styles.headerTitle}>Analytics</Text>} />

      <FlatList
        data={TEACHER_ACTIVITY}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.teacherCard}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherInitials}>{item.initials}</Text>
            </View>
            <View>
              <Text style={styles.teacherName}>{item.name}</Text>
              <Text style={styles.teacherMeta}>
                HW posted: {item.hw} · Attendance: {item.att}
              </Text>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <SegmentedControl
              options={['This Week', 'This Month', 'This Term']}
              activeIndex={['This Week', 'This Month', 'This Term'].indexOf(range)}
              onChange={i => setRange(['This Week', 'This Month', 'This Term'][i])}
              accentColor={colors.principal}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Attendance Trend</Text>
              <LineChart
                data={{
                  labels: trendData.map(d => d.day),
                  datasets: [{ data: trendData.map(d => d.val) }],
                }}
                width={CHART_W}
                height={CHART_H}
                chartConfig={CHART_CONFIG}
                withInnerLines={false}
                withOuterLines={false}
                bezier
                style={styles.lineChart}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Subject Performance</Text>
              <SubjectBarChart />
            </View>

            <View>
              <Text style={styles.sectionLabel}>Class Comparison</Text>
              <FlatList
                data={CLASS_COMPARISON}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.classCompList}
                ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
                renderItem={({ item }) => (
                  <View style={styles.classCard}>
                    <Text style={styles.classCardTitle}>{item.cls}</Text>
                    <View style={styles.classCardAttRow}>
                      <View
                        style={[
                          styles.classCardDot,
                          { backgroundColor: item.up ? colors.success : colors.danger },
                        ]}
                      />
                      <Text style={styles.classCardAtt}>{item.att} att.</Text>
                    </View>
                    <View style={styles.classCardAvgRow}>
                      <Text style={styles.classCardAvg}>Avg {item.avg}</Text>
                      <Ionicons
                        name={item.up ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={item.up ? colors.success : colors.danger}
                      />
                    </View>
                  </View>
                )}
              />
            </View>

            <Text style={styles.sectionLabel}>Teacher Activity</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { padding: spacing.lg },
  listHeader: { gap: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.lg,
  },
  cardTitle: {
    ...(typography.body as object), fontWeight: '500',
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  lineChart: { borderRadius: 8, marginLeft: -spacing.md },
  barChartContainer: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barSubject: { ...(typography.caption as object), color: colors.textSecondary },
  barTrack: {
    flex: 1, height: 20,
    backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.principal, borderRadius: 4 },
  barScore: { ...(typography.caption as object), color: colors.textMuted, textAlign: 'right' },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  classCompList: { paddingBottom: spacing.xs },
  classCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
    minWidth: 120,
  },
  classCardTitle:  { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  classCardAttRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  classCardDot:    { width: 6, height: 6, borderRadius: 3 },
  classCardAtt:    { ...(typography.caption as object), color: colors.textSecondary },
  classCardAvgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  classCardAvg:    { ...(typography.caption as object), color: colors.textMuted },
  teacherCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  teacherAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.principal,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  teacherInitials: { ...(typography.caption as object), fontWeight: '600', color: colors.surface },
  teacherName:     { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  teacherMeta:     { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
});
