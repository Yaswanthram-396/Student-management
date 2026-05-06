import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar, SegmentedControl } from '../../shared';

type AttStatus = 'P' | 'A' | null;
type Session = 'Morning' | 'Afternoon';
type StudentRow = { name: string; idx: number };

const STUDENTS = [
  'Aarav Sharma',   'Ananya Singh',  'Arjun Mehta',   'Diya Patel',
  'Ishaan Verma',   'Kavya Nair',    'Mohit Gupta',    'Neha Joshi',
  'Priya Reddy',    'Rahul Tiwari',  'Riya Desai',     'Siddharth Rao',
];

const DEFAULT_MORNING: AttStatus[]   = ['P','P','P','P','P','P','P','P','P','A','A',null];
const DEFAULT_AFTERNOON: AttStatus[] = Array(12).fill(null) as AttStatus[];

export function AttendanceScreen() {
  const [session, setSession]     = useState<Session>('Morning');
  const [morning, setMorning]     = useState<AttStatus[]>([...DEFAULT_MORNING]);
  const [afternoon, setAfternoon] = useState<AttStatus[]>([...DEFAULT_AFTERNOON]);
  const [search, setSearch]       = useState('');
  const [confirmed, setConfirmed] = useState({ morning: false, afternoon: false });

  const marks      = session === 'Morning' ? morning : afternoon;
  const setMarks   = session === 'Morning' ? setMorning : setAfternoon;
  const isConfirmed = session === 'Morning' ? confirmed.morning : confirmed.afternoon;

  const present  = marks.filter(m => m === 'P').length;
  const absent   = marks.filter(m => m === 'A').length;
  const unmarked = marks.filter(m => m === null).length;
  const canConfirm = unmarked === 0;

  const filtered: StudentRow[] = STUDENTS
    .map((name, idx) => ({ name, idx }))
    .filter(({ name }) => name.toLowerCase().includes(search.toLowerCase()));

  function handleMark(idx: number, val: AttStatus) {
    setMarks(prev => prev.map((v, i) => i === idx ? (v === val ? null : val) : v));
  }

  function handleConfirm() {
    if (!canConfirm) return;
    setConfirmed(prev => ({
      ...prev,
      [session === 'Morning' ? 'morning' : 'afternoon']: true,
    }));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Custom two-line header */}
      <HeaderBar
        center={
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>Class 6 – Section B · 5 May 2026</Text>
          </View>
        }
      />

      {/* Session picker */}
      <View style={styles.sessionBar}>
        <SegmentedControl
          options={['Morning', 'Afternoon']}
          activeIndex={session === 'Morning' ? 0 : 1}
          onChange={i => setSession(i === 0 ? 'Morning' : 'Afternoon')}
          accentColor={colors.teacher}
        />
      </View>

      {/* Success state */}
      {isConfirmed ? (
        <View style={styles.successView}>
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
          <Text style={styles.successTitle}>Attendance confirmed for {session}</Text>
          <Text style={styles.successSub}>{present} Present · {absent} Absent · 5 May 2026</Text>
          <Pressable style={styles.summaryBtn}>
            <Text style={styles.summaryBtnText}>View Summary</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <View style={styles.searchInner}>
              <Ionicons name="search-outline" size={15} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search student..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Student list */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.idx.toString()}
            renderItem={({ item }) => {
              const status = marks[item.idx];
              return (
                <View style={styles.studentRow}>
                  <Text style={styles.studentNum}>
                    {String(item.idx + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <View style={styles.markBtns}>
                    {(['P', 'A'] as const).map(v => (
                      <Pressable
                        key={v}
                        style={[
                          styles.markBtn,
                          status === v && (v === 'P' ? styles.markBtnP : styles.markBtnA),
                        ]}
                        onPress={() => handleMark(item.idx, v)}
                      >
                        <Text style={[
                          styles.markBtnText,
                          status === v && styles.markBtnTextActive,
                        ]}>
                          {v}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />

          {/* Summary + confirm bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItem}>
                Present: <Text style={styles.presentNum}>{present}</Text>
              </Text>
              <Text style={styles.summaryItem}>
                Absent: <Text style={styles.absentNum}>{absent}</Text>
              </Text>
              <Text style={styles.summaryItem}>
                Unmarked: <Text style={styles.unmarkedNum}>{unmarked}</Text>
              </Text>
            </View>
            <Pressable
              style={[styles.confirmBtn, canConfirm ? styles.confirmBtnActive : styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
            >
              <Text style={[
                styles.confirmBtnText,
                canConfirm ? styles.confirmBtnTextActive : styles.confirmBtnTextDisabled,
              ]}>
                Confirm Attendance
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Header
  headerCenter: { alignItems: 'center' },
  headerTitle:  { ...(typography.h3 as object), color: colors.textPrimary },
  headerSub:    { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  // Session picker
  sessionBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  // Success
  successView: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xxl, gap: spacing.md,
  },
  successTitle: {
    ...(typography.h2 as object),
    fontWeight: '600', color: colors.textPrimary,
    textAlign: 'center',
  },
  successSub: {
    ...(typography.caption as object), color: colors.textMuted, textAlign: 'center',
  },
  summaryBtn: {
    marginTop: spacing.sm, height: 48, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.teacher,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.teacher },
  // Search
  searchBar: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  searchInner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1, ...(typography.body as object), color: colors.textPrimary,
  },
  // Student rows
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  studentNum: {
    ...(typography.caption as object), color: colors.textMuted,
    minWidth: 28, marginRight: spacing.md,
  },
  studentName: { flex: 1, ...(typography.body as object), color: colors.textPrimary },
  markBtns: { flexDirection: 'row', gap: spacing.xs },
  markBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 0.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  markBtnP:      { backgroundColor: colors.success, borderColor: 'transparent' },
  markBtnA:      { backgroundColor: colors.danger,  borderColor: 'transparent' },
  markBtnText:       { ...(typography.caption as object), fontWeight: '600', color: colors.textMuted },
  markBtnTextActive: { color: colors.surface },
  separator: { height: 0.5, backgroundColor: colors.border },
  // Summary bar
  summaryBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    padding: spacing.lg,
  },
  summaryRow: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  summaryItem: { ...(typography.caption as object), color: colors.textMuted },
  presentNum:  { fontWeight: '600', color: colors.success },
  absentNum:   { fontWeight: '600', color: colors.danger  },
  unmarkedNum: { fontWeight: '600', color: colors.textSecondary },
  confirmBtn: {
    height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnActive:   { backgroundColor: colors.teacher  },
  confirmBtnDisabled: { backgroundColor: colors.border   },
  confirmBtnText:         { ...(typography.h3 as object), fontWeight: '500' },
  confirmBtnTextActive:   { color: colors.surface       },
  confirmBtnTextDisabled: { color: colors.textMuted     },
});
