import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { HeaderBar } from '../shared';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso: string) {
  try {
    const [y, m, d] = iso.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SlotTab({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[st.slotTab, active && st.slotTabActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={active ? colors.teacher : colors.textMuted}
      />
      <Text style={[st.slotTabText, active && st.slotTabTextActive]}>
        {label}
      </Text>
      {active && <View style={st.slotTabDot} />}
    </Pressable>
  );
}

function StatBadge({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <View style={st.statBadge}>
      <Text style={[st.statBadgeNum, { color }]}>{count}</Text>
      <Text style={st.statBadgeLabel}>{label}</Text>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AttendanceScreen() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Setup
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [slot, setSlot] = useState<Slot>('MORNING');
  const date = todayISO();

  // Marking
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});
  const [search, setSearch] = useState('');

  // Load sections on mount
  const loadSections = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await teacherApi.getSections();
      setSections(res.results);
      if (res.results.length > 0) setSelectedSection(res.results[0]);
      setPhase('setup');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Could not load sections.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // Start session: create + fetch students in parallel
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
        initial[String(s.id)] = null;
      });
      // Pre-fill any marks already saved on the session
      sessionRes.records.forEach((r) => {
        initial[String(r.student_id)] = r.status;
      });
      setMarks(initial);
      setSearch('');
      setPhase('marking');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not start attendance.');
      setPhase('setup');
    }
  }

  // Cycle status: null → PRESENT → ABSENT → null
  function cycleStatus(studentId: string) {
    setMarks((prev) => {
      const cur = prev[studentId];
      const next: AttStatus =
        cur === null ? 'PRESENT' : cur === 'PRESENT' ? 'ABSENT' : null;
      return { ...prev, [studentId]: next };
    });
  }

  function setStatus(studentId: string, val: AttStatus) {
    setMarks((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === val ? null : val,
    }));
  }

  function markAll(val: 'PRESENT' | 'ABSENT') {
    setMarks((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[String(s.id)] = val;
      });
      return next;
    });
  }

  // Build records array using original student.id values (avoids UUID/string type mismatch)
  function buildRecords(onlyMarked = true) {
    return students
      .filter((s) =>
        onlyMarked
          ? marks[String(s.id)] !== null
          : marks[String(s.id)] !== null,
      )
      .map((s) => ({
        student_id: s.id, // preserve original type from API response
        status: marks[String(s.id)] as 'PRESENT' | 'ABSENT',
      }));
  }

  async function handleSave() {
    if (!session) return;
    setPhase('saving');
    try {
      const records = buildRecords();
      await teacherApi.updateAttendanceRecords(session.id, records);
      Alert.alert('Saved', 'Progress saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save.');
    } finally {
      setPhase('marking');
    }
  }

  async function handleConfirm() {
    if (!session) return;
    setPhase('confirming');
    try {
      const records = buildRecords();
      await teacherApi.updateAttendanceRecords(session.id, records);
      await teacherApi.confirmAttendanceSession(session.id);
      setPhase('confirmed');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to confirm attendance.');
      setPhase('marking');
    }
  }

  // Derived stats
  const totalStudents = students.length;
  const present = Object.values(marks).filter((m) => m === 'PRESENT').length;
  const absent = Object.values(marks).filter((m) => m === 'ABSENT').length;
  const unmarked = Object.values(marks).filter((m) => m === null).length;
  const canConfirm = totalStudents > 0 && unmarked === 0;
  const progress = totalStudents > 0 ? ((present + absent) / totalStudents) * 100 : 0;

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.roll_number ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [students, search],
  );

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <HeaderBar center={<Text style={st.hTitle}>Attendance</Text>} />
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.teacher} />
          <Text style={st.dimText}>Loading sections…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <HeaderBar center={<Text style={st.hTitle}>Attendance</Text>} />
        <View style={st.centered}>
          <View style={st.errorCircle}>
            <Ionicons name="alert" size={32} color="#fff" />
          </View>
          <Text style={st.errorTitle}>Could not load sections</Text>
          <Text style={st.dimText}>{errorMsg}</Text>
          <Pressable style={st.retryBtn} onPress={loadSections}>
            <Ionicons name="refresh" size={16} color={colors.surface} />
            <Text style={st.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── CONFIRMED ──────────────────────────────────────────────────────────────
  if (phase === 'confirmed') {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <HeaderBar center={<Text style={st.hTitle}>Attendance</Text>} />
        <View style={st.centered}>
          <View style={st.successCircle}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={st.successTitle}>All Done!</Text>
          <Text style={st.dimText}>
            {slot === 'MORNING' ? 'Morning' : 'Afternoon'} · {formatDate(date)}
          </Text>

          {/* Result cards */}
          <View style={st.resultRow}>
            <View style={[st.resultCard, st.resultCardP]}>
              <Text style={[st.resultNum, { color: colors.success }]}>
                {present}
              </Text>
              <Text style={st.resultLabel}>Present</Text>
            </View>
            <View style={[st.resultCard, st.resultCardA]}>
              <Text style={[st.resultNum, { color: colors.danger }]}>
                {absent}
              </Text>
              <Text style={st.resultLabel}>Absent</Text>
            </View>
            <View style={[st.resultCard, { borderColor: colors.border }]}>
              <Text style={[st.resultNum, { color: colors.textSecondary }]}>
                {totalStudents}
              </Text>
              <Text style={st.resultLabel}>Total</Text>
            </View>
          </View>

          <Pressable
            style={st.anotherBtn}
            onPress={() => {
              setSession(null);
              setStudents([]);
              setMarks({});
              setSearch('');
              setPhase('setup');
            }}
          >
            <Ionicons
              name="arrow-back-outline"
              size={16}
              color={colors.teacher}
            />
            <Text style={st.anotherBtnText}>Mark Another Session</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === 'setup' || phase === 'creating') {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <HeaderBar
          center={
            <View style={st.hCenter}>
              <Text style={st.hTitle}>Mark Attendance</Text>
              <Text style={st.hSub}>{formatDate(date)}</Text>
            </View>
          }
        />

        <ScrollView
          contentContainerStyle={st.setupScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Section ── */}
          <Text style={st.groupLabel}>Section</Text>
          {sections.length > 1 ? (
            <View style={st.sectionGrid}>
              {sections.map((sec) => {
                const active = selectedSection?.id === sec.id;
                return (
                  <Pressable
                    key={sec.id}
                    style={[st.sectionTile, active && st.sectionTileActive]}
                    onPress={() => setSelectedSection(sec)}
                  >
                    {sec.is_class_teacher && (
                      <View style={st.ctChip}>
                        <Text style={st.ctChipText}>Class Teacher</Text>
                      </View>
                    )}
                    <Text
                      style={[st.sectionTileClass, active && st.sectionTileClassActive]}
                    >
                      {sec.class_name}
                    </Text>
                    <Text
                      style={[st.sectionTileSec, active && st.sectionTileSecActive]}
                    >
                      Section {sec.section_name}
                    </Text>
                    <Text
                      style={[st.sectionTileCount, active && st.sectionTileCountActive]}
                    >
                      {sec.student_count} students
                    </Text>
                    {active && (
                      <View style={st.sectionCheckmark}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.teacher}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            selectedSection && (
              <View style={st.singleSectionCard}>
                <View style={st.singleSectionLeft}>
                  <Text style={st.singleSectionClass}>
                    {selectedSection.class_name} – Section{' '}
                    {selectedSection.section_name}
                  </Text>
                  <Text style={st.singleSectionCount}>
                    {selectedSection.student_count} students
                  </Text>
                </View>
                <View style={st.singleSectionIcon}>
                  <Ionicons name="people" size={22} color={colors.teacher} />
                </View>
              </View>
            )
          )}

          {/* ── Slot ── */}
          <Text style={[st.groupLabel, { marginTop: spacing.xl }]}>
            Session
          </Text>
          <View style={st.slotRow}>
            <SlotTab
              label="Morning"
              icon="sunny-outline"
              active={slot === 'MORNING'}
              onPress={() => setSlot('MORNING')}
            />
            <SlotTab
              label="Afternoon"
              icon="partly-sunny-outline"
              active={slot === 'AFTERNOON'}
              onPress={() => setSlot('AFTERNOON')}
            />
          </View>

          {/* ── Date ── */}
          <View style={st.datePill}>
            <Ionicons name="calendar-outline" size={15} color={colors.teacher} />
            <Text style={st.datePillText}>{formatDate(date)}</Text>
            <View style={st.todayChip}>
              <Text style={st.todayChipText}>Today</Text>
            </View>
          </View>

          {/* ── Begin button ── */}
          <Pressable
            style={[
              st.beginBtn,
              (!selectedSection || phase === 'creating') && st.beginBtnDisabled,
            ]}
            onPress={handleBegin}
            disabled={!selectedSection || phase === 'creating'}
          >
            {phase === 'creating' ? (
              <>
                <ActivityIndicator color={colors.surface} size="small" />
                <Text style={st.beginBtnText}>Starting…</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkbox-outline"
                  size={20}
                  color={colors.surface}
                />
                <Text style={st.beginBtnText}>Start Marking Attendance</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── MARKING ────────────────────────────────────────────────────────────────
  const isBusy = phase === 'saving' || phase === 'confirming';

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      {/* Header */}
      <HeaderBar
        center={
          <View style={st.hCenter}>
            <Text style={st.hTitle}>
              {selectedSection?.class_name} – Sec{' '}
              {selectedSection?.section_name}
            </Text>
            <Text style={st.hSub}>
              {slot === 'MORNING' ? 'Morning' : 'Afternoon'} · {formatDate(date)}
            </Text>
          </View>
        }
      />

      {/* Progress bar */}
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${progress}%` as any }]} />
      </View>

      {/* Stats + Quick action */}
      <View style={st.statsPanel}>
        <StatBadge count={present} label="Present" color={colors.success} />
        <View style={st.statsDivider} />
        <StatBadge count={absent} label="Absent" color={colors.danger} />
        <View style={st.statsDivider} />
        <StatBadge count={unmarked} label="Unmarked" color={colors.warning} />
        <View style={st.statsDivider} />
        <Pressable
          style={st.quickBtn}
          onPress={() => markAll('PRESENT')}
          disabled={isBusy}
        >
          <Ionicons name="checkmark-done" size={14} color={colors.teacher} />
          <Text style={st.quickBtnText}>All P</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={st.searchBar}>
        <Ionicons name="search-outline" size={15} color={colors.textMuted} />
        <TextInput
          style={st.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or roll no…"
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Student list */}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => {
          const status = marks[String(item.id)];
          return (
            <View
              style={[
                st.studentRow,
                status === 'PRESENT' && st.studentRowP,
                status === 'ABSENT' && st.studentRowA,
              ]}
            >
              {/* Status indicator bar */}
              <View
                style={[
                  st.statusBar,
                  status === 'PRESENT' && { backgroundColor: colors.success },
                  status === 'ABSENT' && { backgroundColor: colors.danger },
                  status === null && { backgroundColor: colors.border },
                ]}
              />

              {/* Roll number */}
              <Text style={st.rollNo}>
                {item.roll_number || String(index + 1).padStart(2, '0')}
              </Text>

              {/* Name */}
              <Text style={st.studentName} numberOfLines={1}>
                {item.name}
              </Text>

              {/* P / A buttons */}
              <View style={st.markPair}>
                <Pressable
                  style={[st.markBtn, status === 'PRESENT' && st.markBtnP]}
                  onPress={() => !isBusy && setStatus(String(item.id), 'PRESENT')}
                  hitSlop={4}
                >
                  <Text
                    style={[
                      st.markBtnLabel,
                      status === 'PRESENT' && st.markBtnLabelActive,
                    ]}
                  >
                    P
                  </Text>
                </Pressable>
                <Pressable
                  style={[st.markBtn, status === 'ABSENT' && st.markBtnA]}
                  onPress={() => !isBusy && setStatus(String(item.id), 'ABSENT')}
                  hitSlop={4}
                >
                  <Text
                    style={[
                      st.markBtnLabel,
                      status === 'ABSENT' && st.markBtnLabelActive,
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
          <View style={{ height: 1, backgroundColor: colors.border }} />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Action bar */}
      <View style={st.actionBar}>
        <View style={st.progressLabel}>
          <Text style={st.progressLabelText}>
            {present + absent}/{totalStudents} marked
          </Text>
          {canConfirm && (
            <View style={st.readyBadge}>
              <Text style={st.readyBadgeText}>Ready to confirm</Text>
            </View>
          )}
        </View>
        <View style={st.actionBtns}>
          <Pressable
            style={[st.saveBtn, isBusy && st.btnDim]}
            onPress={handleSave}
            disabled={isBusy}
          >
            {phase === 'saving' ? (
              <ActivityIndicator size="small" color={colors.teacher} />
            ) : (
              <Text style={st.saveBtnText}>Save</Text>
            )}
          </Pressable>
          <Pressable
            style={[
              st.confirmBtn,
              canConfirm && !isBusy ? st.confirmBtnReady : st.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!canConfirm || isBusy}
          >
            {phase === 'confirming' ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={18}
                  color={canConfirm ? colors.surface : colors.textMuted}
                />
                <Text
                  style={[
                    st.confirmBtnText,
                    canConfirm && !isBusy
                      ? st.confirmBtnTextReady
                      : st.confirmBtnTextDisabled,
                  ]}
                >
                  Confirm
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hCenter: { alignItems: 'center' },
  hTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  hSub: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  dimText: { ...(typography.body as object), color: colors.textMuted, textAlign: 'center' },

  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xxl, gap: spacing.lg,
  },

  // Error
  errorCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { ...(typography.h2 as object), color: colors.textPrimary, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    height: 44, paddingHorizontal: spacing.xl, borderRadius: 10,
    backgroundColor: colors.teacher,
  },
  retryBtnText: { ...(typography.h3 as object), color: colors.surface },

  // Confirmed
  successCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { ...(typography.h1 as object), fontWeight: '700', color: colors.textPrimary },
  resultRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  resultCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, gap: spacing.xs,
  },
  resultCardP: { borderColor: colors.success },
  resultCardA: { borderColor: colors.danger },
  resultNum: { fontSize: 30, fontWeight: '700' },
  resultLabel: { ...(typography.label as object), color: colors.textMuted },
  anotherBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    height: 48, paddingHorizontal: spacing.xl, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.teacher,
  },
  anotherBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.teacher },

  // Setup
  setupScroll: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  groupLabel: { ...(typography.label as object), color: colors.textMuted, marginBottom: spacing.xs },

  // Section grid
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTile: {
    minWidth: 140, flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, gap: spacing.xs, position: 'relative',
  },
  sectionTileActive: { borderColor: colors.teacher, backgroundColor: '#EFF6FF' },
  ctChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE', borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  ctChipText: { fontSize: 10, fontWeight: '600', color: colors.teacher },
  sectionTileClass: { ...(typography.h3 as object), fontWeight: '700', color: colors.textPrimary },
  sectionTileClassActive: { color: colors.teacher },
  sectionTileSec: { ...(typography.caption as object), color: colors.textSecondary },
  sectionTileSecActive: { color: colors.teacher },
  sectionTileCount: { ...(typography.label as object), color: colors.textMuted },
  sectionTileCountActive: { color: colors.teacher },
  sectionCheckmark: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  singleSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: '#DBEAFE',
    padding: spacing.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  singleSectionLeft: { gap: spacing.xs },
  singleSectionClass: { ...(typography.h3 as object), fontWeight: '600', color: colors.teacher },
  singleSectionCount: { ...(typography.caption as object), color: colors.textMuted },
  singleSectionIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },

  // Slot
  slotRow: { flexDirection: 'row', gap: spacing.sm },
  slotTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, position: 'relative',
  },
  slotTabActive: { borderColor: colors.teacher, backgroundColor: '#EFF6FF' },
  slotTabText: { ...(typography.body as object), fontWeight: '500', color: colors.textMuted },
  slotTabTextActive: { color: colors.teacher, fontWeight: '600' },
  slotTabDot: {
    position: 'absolute', top: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.teacher, borderWidth: 2, borderColor: colors.surface,
  },

  // Date pill
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: 10,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderWidth: 0.5, borderColor: colors.border,
    marginTop: spacing.xl,
  },
  datePillText: { flex: 1, ...(typography.body as object), color: colors.textPrimary },
  todayChip: {
    backgroundColor: colors.successBg, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: spacing.sm,
  },
  todayChipText: { ...(typography.label as object), color: colors.success },

  // Begin button
  beginBtn: {
    marginTop: spacing.lg, height: 54, borderRadius: 14,
    backgroundColor: colors.teacher,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
  },
  beginBtnDisabled: { opacity: 0.65 },
  beginBtnText: { ...(typography.h3 as object), fontWeight: '600', color: colors.surface },

  // Progress bar
  progressTrack: { height: 3, backgroundColor: colors.border },
  progressFill: { height: 3, backgroundColor: colors.teacher },

  // Stats panel
  statsPanel: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  statBadge: { flex: 1, alignItems: 'center', gap: 2 },
  statBadgeNum: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  statBadgeLabel: { ...(typography.label as object), color: colors.textMuted },
  statsDivider: { width: 0.5, height: 32, backgroundColor: colors.border },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#EFF6FF', borderRadius: 8,
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
  },
  quickBtnText: { ...(typography.label as object), color: colors.teacher },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  searchInput: { flex: 1, ...(typography.body as object), color: colors.textPrimary },

  // Student rows
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingRight: spacing.lg,
    backgroundColor: colors.surface,
  },
  studentRowP: { backgroundColor: '#F0FDF4' },
  studentRowA: { backgroundColor: '#FFF5F5' },
  statusBar: { width: 3, alignSelf: 'stretch', marginRight: spacing.md },
  rollNo: {
    ...(typography.label as object), color: colors.textMuted,
    minWidth: 36, textAlign: 'center', marginRight: spacing.sm,
  },
  studentName: { flex: 1, ...(typography.body as object), color: colors.textPrimary },
  markPair: { flexDirection: 'row', gap: spacing.xs },
  markBtn: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  markBtnP: { backgroundColor: colors.success, borderColor: colors.success },
  markBtnA: { backgroundColor: colors.danger, borderColor: colors.danger },
  markBtnLabel: { ...(typography.caption as object), fontWeight: '700', color: colors.textMuted },
  markBtnLabelActive: { color: '#fff' },

  // Action bar
  actionBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  progressLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressLabelText: { ...(typography.caption as object), color: colors.textMuted },
  readyBadge: {
    backgroundColor: colors.successBg, borderRadius: 999,
    paddingVertical: 2, paddingHorizontal: spacing.sm,
  },
  readyBadgeText: { ...(typography.label as object), color: colors.success },
  actionBtns: { flexDirection: 'row', gap: spacing.sm },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.teacher,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.teacher },
  confirmBtn: {
    flex: 2, height: 48, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
  },
  confirmBtnReady: { backgroundColor: colors.teacher },
  confirmBtnDisabled: { backgroundColor: colors.border },
  confirmBtnText: { ...(typography.h3 as object), fontWeight: '600' },
  confirmBtnTextReady: { color: colors.surface },
  confirmBtnTextDisabled: { color: colors.textMuted },
  btnDim: { opacity: 0.6 },
});
