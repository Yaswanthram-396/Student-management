import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, SegmentedControl } from '../shared';
import {
  teacherApi,
  type Section,
  type Student,
  type AttendanceSession,
} from '../../services/teacher';

type AttStatus = 'PRESENT' | 'ABSENT' | null;
type Slot = 'MORNING' | 'AFTERNOON';
type Phase =
  | 'loading'
  | 'setup'
  | 'creating'
  | 'marking'
  | 'saving'
  | 'confirming'
  | 'confirmed'
  | 'error';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function AttendanceScreen() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [slot, setSlot] = useState<Slot>('MORNING');
  const date = todayISO();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});
  const [search, setSearch] = useState('');

  const loadSections = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await teacherApi.getSections();
      setSections(res.results);
      if (res.results.length > 0) setSelectedSection(res.results[0]);
      setPhase('setup');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load sections. Check your connection.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  async function handleBegin() {
    if (!selectedSection) return;
    setPhase('creating');
    try {
      const [sessionRes, studentsRes] = await Promise.all([
        teacherApi.createAttendanceSession({
          section_id: selectedSection.id,
          date,
          slot,
        }),
        teacherApi.getSectionStudents(selectedSection.id),
      ]);
      setSession(sessionRes);
      setStudents(studentsRes.results);
      const initial: Record<string, AttStatus> = {};
      studentsRes.results.forEach((s) => {
        initial[s.id] = null;
      });
      sessionRes.records.forEach((r) => {
        initial[r.student_id] = r.status;
      });
      setMarks(initial);
      setSearch('');
      setPhase('marking');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not start attendance session.');
      setPhase('setup');
    }
  }

  function toggleMark(studentId: string, val: 'PRESENT' | 'ABSENT') {
    setMarks((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === val ? null : val,
    }));
  }

  async function handleSave() {
    if (!session) return;
    setPhase('saving');
    try {
      const records = Object.entries(marks)
        .filter(([, s]) => s !== null)
        .map(([student_id, status]) => ({
          student_id,
          status: status as 'PRESENT' | 'ABSENT',
        }));
      await teacherApi.updateAttendanceRecords(session.id, records);
      Alert.alert('Saved', 'Attendance progress saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save progress.');
    } finally {
      setPhase('marking');
    }
  }

  async function handleConfirm() {
    if (!session) return;
    setPhase('confirming');
    try {
      const records = Object.entries(marks)
        .filter(([, s]) => s !== null)
        .map(([student_id, status]) => ({
          student_id,
          status: status as 'PRESENT' | 'ABSENT',
        }));
      await teacherApi.updateAttendanceRecords(session.id, records);
      await teacherApi.confirmAttendanceSession(session.id);
      setPhase('confirmed');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to confirm attendance.');
      setPhase('marking');
    }
  }

  function handleMarkAnother() {
    setSession(null);
    setStudents([]);
    setMarks({});
    setSearch('');
    setPhase('setup');
  }

  const present = Object.values(marks).filter((m) => m === 'PRESENT').length;
  const absent = Object.values(marks).filter((m) => m === 'ABSENT').length;
  const unmarked = Object.values(marks).filter((m) => m === null).length;
  const canConfirm = students.length > 0 && unmarked === 0;

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.roll_number ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <HeaderBar center={<Text style={s.headerTitle}>Attendance</Text>} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.teacher} />
          <Text style={s.muted}>Loading your sections…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <HeaderBar center={<Text style={s.headerTitle}>Attendance</Text>} />
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={52} color={colors.danger} />
          <Text style={s.errorTitle}>Could not load sections</Text>
          <Text style={s.muted}>{errorMsg}</Text>
          <Pressable style={s.retryBtn} onPress={loadSections}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Confirmed ────────────────────────────────────────────────────────────────
  if (phase === 'confirmed') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <HeaderBar center={<Text style={s.headerTitle}>Attendance</Text>} />
        <View style={s.centered}>
          <View style={s.successRing}>
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          </View>
          <Text style={s.successTitle}>Attendance Confirmed!</Text>
          <Text style={s.muted}>
            {slot === 'MORNING' ? 'Morning' : 'Afternoon'} · {formatDate(date)}
          </Text>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: colors.success }]}>{present}</Text>
              <Text style={s.statLabel}>Present</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: colors.danger }]}>{absent}</Text>
              <Text style={s.statLabel}>Absent</Text>
            </View>
            <View style={s.statDiv} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: colors.textSecondary }]}>
                {students.length}
              </Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
          </View>
          <Pressable style={s.outlineBtn} onPress={handleMarkAnother}>
            <Text style={s.outlineBtnText}>Mark Another Session</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Setup ────────────────────────────────────────────────────────────────────
  if (phase === 'setup' || phase === 'creating') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <HeaderBar
          center={
            <View style={s.hdrCenter}>
              <Text style={s.headerTitle}>Mark Attendance</Text>
              <Text style={s.headerSub}>{formatDate(date)}</Text>
            </View>
          }
        />
        <ScrollView
          contentContainerStyle={s.setupContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section picker — only if teacher has multiple sections */}
          {sections.length > 1 && (
            <View style={s.card}>
              <Text style={s.cardLabel}>Select Section</Text>
              <View style={s.chipGrid}>
                {sections.map((sec) => (
                  <Pressable
                    key={sec.id}
                    style={[
                      s.sectionChip,
                      selectedSection?.id === sec.id && s.sectionChipOn,
                    ]}
                    onPress={() => setSelectedSection(sec)}
                  >
                    {sec.is_class_teacher && (
                      <View style={s.ctBadge}>
                        <Text style={s.ctBadgeText}>CT</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        s.chipClass,
                        selectedSection?.id === sec.id && s.chipClassOn,
                      ]}
                    >
                      {sec.class_name}
                    </Text>
                    <Text
                      style={[
                        s.chipSec,
                        selectedSection?.id === sec.id && s.chipSecOn,
                      ]}
                    >
                      Sec {sec.section_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Single section display */}
          {sections.length === 1 && selectedSection && (
            <View style={s.card}>
              <Text style={s.cardLabel}>Section</Text>
              <View style={s.singleSection}>
                <View>
                  <Text style={s.singleClass}>{selectedSection.class_name}</Text>
                  <Text style={s.singleSec}>
                    Section {selectedSection.section_name}
                  </Text>
                </View>
                <Text style={s.studentCount}>
                  {selectedSection.student_count} students
                </Text>
              </View>
            </View>
          )}

          {/* Slot selector */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Session Slot</Text>
            <SegmentedControl
              options={['Morning', 'Afternoon']}
              activeIndex={slot === 'MORNING' ? 0 : 1}
              onChange={(i) => setSlot(i === 0 ? 'MORNING' : 'AFTERNOON')}
              accentColor={colors.teacher}
            />
          </View>

          {/* Date */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Date</Text>
            <View style={s.dateRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.teacher} />
              <Text style={s.dateText}>{formatDate(date)}</Text>
              <View style={s.todayBadge}>
                <Text style={s.todayText}>Today</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[
              s.beginBtn,
              (!selectedSection || phase === 'creating') && s.beginBtnDim,
            ]}
            onPress={handleBegin}
            disabled={!selectedSection || phase === 'creating'}
          >
            {phase === 'creating' ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons name="people-outline" size={20} color={colors.surface} />
                <Text style={s.beginBtnText}>Begin Attendance</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Marking ──────────────────────────────────────────────────────────────────
  const isBusy = phase === 'saving' || phase === 'confirming';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar
        center={
          <View style={s.hdrCenter}>
            <Text style={s.headerTitle}>
              {selectedSection?.class_name} – Sec {selectedSection?.section_name}
            </Text>
            <Text style={s.headerSub}>
              {slot === 'MORNING' ? 'Morning' : 'Afternoon'} · {formatDate(date)}
            </Text>
          </View>
        }
      />

      {/* Live summary counters */}
      <View style={s.summaryBar}>
        {(
          [
            { label: 'Present', val: present, color: colors.success },
            { label: 'Absent', val: absent, color: colors.danger },
            { label: 'Unmarked', val: unmarked, color: colors.warning },
          ] as const
        ).map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View style={s.sumDiv} />}
            <View style={s.sumItem}>
              <Text style={[s.sumNum, { color: item.color }]}>{item.val}</Text>
              <Text style={s.sumLabel}>{item.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={15} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or roll number…"
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Student list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const status = marks[item.id];
          return (
            <View style={s.studentRow}>
              <Text style={s.rollNo}>
                {item.roll_number || String(index + 1).padStart(2, '0')}
              </Text>
              <Text style={s.studentName}>{item.name}</Text>
              <View style={s.btnPair}>
                <Pressable
                  style={[s.markBtn, status === 'PRESENT' && s.markBtnP]}
                  onPress={() => !isBusy && toggleMark(item.id, 'PRESENT')}
                >
                  <Text
                    style={[
                      s.markBtnTxt,
                      status === 'PRESENT' && s.markBtnTxtOn,
                    ]}
                  >
                    P
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.markBtn, status === 'ABSENT' && s.markBtnA]}
                  onPress={() => !isBusy && toggleMark(item.id, 'ABSENT')}
                >
                  <Text
                    style={[
                      s.markBtnTxt,
                      status === 'ABSENT' && s.markBtnTxtOn,
                    ]}
                  >
                    A
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 0.5, backgroundColor: colors.border }} />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Action bar */}
      <View style={s.actionBar}>
        <Pressable
          style={[s.saveBtn, isBusy && s.dimBtn]}
          onPress={handleSave}
          disabled={isBusy}
        >
          {phase === 'saving' ? (
            <ActivityIndicator size="small" color={colors.teacher} />
          ) : (
            <Text style={s.saveTxt}>Save Progress</Text>
          )}
        </Pressable>
        <Pressable
          style={[
            s.confirmBtn,
            canConfirm && !isBusy ? s.confirmOn : s.confirmOff,
          ]}
          onPress={handleConfirm}
          disabled={!canConfirm || isBusy}
        >
          {phase === 'confirming' ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text
              style={[
                s.confirmTxt,
                canConfirm && !isBusy ? s.confirmTxtOn : s.confirmTxtOff,
              ]}
            >
              Confirm Attendance
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  muted: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: 'center',
  },
  hdrCenter: { alignItems: 'center' },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  headerSub: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },

  // Error
  errorTitle: {
    ...(typography.h2 as object),
    color: colors.textPrimary,
    textAlign: 'center',
  },
  retryBtn: {
    height: 44,
    paddingHorizontal: spacing.xxl,
    borderRadius: 10,
    backgroundColor: colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: { ...(typography.h3 as object), color: colors.surface },

  // Confirmed
  successRing: { marginBottom: spacing.sm },
  successTitle: {
    ...(typography.h1 as object),
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statNum: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  statLabel: { ...(typography.label as object), color: colors.textMuted },
  statDiv: {
    width: 0.5,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  outlineBtn: {
    marginTop: spacing.md,
    height: 48,
    paddingHorizontal: spacing.xxl,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.teacher,
  },

  // Setup
  setupContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardLabel: { ...(typography.label as object), color: colors.textMuted },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionChip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    minWidth: 90,
    position: 'relative',
  },
  sectionChipOn: {
    borderColor: colors.teacher,
    backgroundColor: '#EFF6FF',
  },
  ctBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.teacher,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  ctBadgeText: { fontSize: 8, fontWeight: '700', color: colors.surface },
  chipClass: {
    ...(typography.h3 as object),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipClassOn: { color: colors.teacher },
  chipSec: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  chipSecOn: { color: colors.teacher },

  singleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: spacing.md,
  },
  singleClass: {
    ...(typography.h3 as object),
    fontWeight: '600',
    color: colors.teacher,
  },
  singleSec: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  studentCount: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.teacher,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    flex: 1,
    ...(typography.body as object),
    color: colors.textPrimary,
  },
  todayBadge: {
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  todayText: { ...(typography.label as object), color: colors.success },

  beginBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.teacher,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  beginBtnDim: { opacity: 0.7 },
  beginBtnText: {
    ...(typography.h3 as object),
    fontWeight: '600',
    color: colors.surface,
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  sumItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  sumNum: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  sumLabel: { ...(typography.label as object), color: colors.textMuted },
  sumDiv: {
    width: 0.5,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...(typography.body as object),
    color: colors.textPrimary,
  },

  // Student rows
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  rollNo: {
    ...(typography.label as object),
    color: colors.textMuted,
    minWidth: 34,
    marginRight: spacing.md,
  },
  studentName: {
    flex: 1,
    ...(typography.body as object),
    color: colors.textPrimary,
  },
  btnPair: { flexDirection: 'row', gap: spacing.xs },
  markBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  markBtnP: { backgroundColor: colors.success, borderColor: 'transparent' },
  markBtnA: { backgroundColor: colors.danger, borderColor: 'transparent' },
  markBtnTxt: {
    ...(typography.caption as object),
    fontWeight: '700',
    color: colors.textMuted,
  },
  markBtnTxtOn: { color: colors.surface },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTxt: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.teacher,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOn: { backgroundColor: colors.teacher },
  confirmOff: { backgroundColor: colors.border },
  confirmTxt: { ...(typography.h3 as object), fontWeight: '500' },
  confirmTxtOn: { color: colors.surface },
  confirmTxtOff: { color: colors.textMuted },
  dimBtn: { opacity: 0.6 },
});
