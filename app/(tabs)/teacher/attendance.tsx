import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  teacherAttendanceApi,
  type AttendanceSlot,
  type AttendanceStatus,
} from '../../../services/teacher-attendance';
import {
  teacherSectionsApi,
  type SectionStudent,
} from '../../../services/teacher-sections';
import { useTeacherStore } from '../../../store/teacher-store';

const ACCENT = '#185FA5';
const GREEN  = '#1D9E75';
const RED    = '#DC2626';
const INK    = '#101828';
const MUTED  = '#667085';
const LINE   = '#EAECF0';
const BG     = '#F6F8FB';

const SLOTS: AttendanceSlot[] = ['MORNING', 'AFTERNOON'];
type StatusValue = AttendanceStatus | null;

function toDateString(d: Date) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function shiftDate(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export default function AttendanceScreen() {
  const { selectedSection } = useTeacherStore();

  const [date, setDate]                   = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slot, setSlot]                   = useState<AttendanceSlot>('MORNING');
  const [students, setStudents]           = useState<SectionStudent[]>([]);
  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt]     = useState<string | null>(null);
  const [takenBy, setTakenBy]             = useState('');
  const [statuses, setStatuses]           = useState<Record<string, StatusValue>>({});
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [confirming, setConfirming]       = useState(false);
  const [search, setSearch]               = useState('');

  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const isToday     = toDateString(date) === toDateString(new Date());
  const isConfirmed = !!confirmedAt;

  useEffect(() => {
    if (!selectedSection) {
      setStudents([]); setSessionId(null); setStatuses({}); return;
    }
    const guard = { cancelled: false };
    abortRef.current = guard;
    const sectionId = selectedSection.id;
    const dateStr   = toDateString(date);

    async function load() {
      setLoading(true); setError('');
      setStudents([]); setSessionId(null); setConfirmedAt(null); setStatuses({});
      try {
        const studentData = await teacherSectionsApi.getStudents(sectionId);
        if (guard.cancelled) return;
        const fetchedStudents = studentData.results;
        const sess = await teacherAttendanceApi.getOrCreateSession(sectionId, dateStr, slot);
        if (guard.cancelled) return;
        const map: Record<string, StatusValue> = {};
        for (const s of fetchedStudents) map[s.id] = null;
        for (const r of sess.records) {
          if (r.status && r.student_id in map) map[r.student_id] = r.status;
        }
        setStudents(fetchedStudents);
        setSessionId(sess.id);
        setConfirmedAt(sess.confirmed_at);
        setTakenBy(sess.taken_by?.name ?? '');
        setStatuses(map);
      } catch (err: any) {
        if (!guard.cancelled) setError(err.details ?? 'Failed to load attendance. Please try again.');
      } finally {
        if (!guard.cancelled) setLoading(false);
      }
    }
    load();
    return () => { guard.cancelled = true; };
  }, [selectedSection?.id, toDateString(date), slot]);

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    if (isConfirmed) return;
    setStatuses(prev => ({ ...prev, [studentId]: prev[studentId] === status ? null : status }));
  }

  function markAll(status: AttendanceStatus) {
    if (isConfirmed) return;
    const map: Record<string, StatusValue> = {};
    for (const s of students) map[s.id] = status;
    setStatuses(map);
  }

  function buildRecords() {
    return students.map(s => ({
      student_id: s.id,
      status: (statuses[s.id] ?? 'PRESENT') as AttendanceStatus,
    }));
  }

  function handleConfirmPress() {
    const unmarked = students.filter(s => statuses[s.id] === null).length;
    const present  = students.filter(s => (statuses[s.id] ?? 'PRESENT') === 'PRESENT').length;
    const absent   = students.filter(s => statuses[s.id] === 'ABSENT').length;
    const note     = unmarked > 0 ? `\n\n${unmarked} unmarked student${unmarked > 1 ? 's' : ''} will be counted as Present.` : '';
    Alert.alert(
      'Confirm Attendance',
      `Lock ${slot === 'MORNING' ? 'morning' : 'afternoon'} attendance for ${formatDisplayDate(date)}?\n\nPresent: ${present}  ·  Absent: ${absent}${note}\n\nThis cannot be undone.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: doConfirm }],
    );
  }

  async function doConfirm() {
    if (!sessionId || !students.length) return;
    setConfirming(true);
    try {
      await teacherAttendanceApi.markAttendance(sessionId, buildRecords());
      const res = await teacherAttendanceApi.confirmSession(sessionId);
      setConfirmedAt(res.confirmed_at);
      Alert.alert('Confirmed ✓', `Attendance confirmed.\n${res.absent_count} student${res.absent_count !== 1 ? 's' : ''} marked absent.`);
    } catch (err: any) {
      Alert.alert('Failed', err.details ?? 'Failed to confirm attendance.');
    } finally {
      setConfirming(false);
    }
  }

  const markedPresent = students.filter(s => statuses[s.id] === 'PRESENT').length;
  const markedAbsent  = students.filter(s => statuses[s.id] === 'ABSENT').length;
  const unmarked      = students.filter(s => statuses[s.id] === null).length;

  const q = search.trim().toLowerCase();
  const filteredStudents = q
    ? students.filter(s => s.name.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q))
    : students;

  const hasStudents = !loading && !error && students.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

        {/* ── Date navigator ── */}
        <View style={styles.dateNav}>
          <Pressable style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
            onPress={() => setDate(d => shiftDate(d, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.dateBtn, pressed && styles.dateBtnPressed]}
            onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={15} color={ACCENT} />
            <Text style={styles.dateBtnText}>{formatDisplayDate(date)}</Text>
            {isToday && <View style={styles.todayDot} />}
          </Pressable>
          <Pressable style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
            onPress={() => setDate(d => shiftDate(d, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={INK} />
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => { setShowDatePicker(false); if (selected) setDate(selected); }} />
        )}

        {/* ── Slot tabs ── */}
        <View style={styles.slotRow}>
          {SLOTS.map(s => (
            <Pressable key={s} style={[styles.slotTab, slot === s && styles.slotTabActive]} onPress={() => setSlot(s)}>
              <Ionicons name={s === 'MORNING' ? 'sunny-outline' : 'moon-outline'} size={15}
                color={slot === s ? ACCENT : '#AAAAAA'} />
              <Text style={[styles.slotTabText, slot === s && styles.slotTabTextActive]}>
                {s === 'MORNING' ? 'Morning' : 'Afternoon'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Confirmed banner ── */}
        {isConfirmed && (
          <View style={styles.confirmedBanner}>
            <Ionicons name="lock-closed" size={13} color={GREEN} />
            <Text style={styles.confirmedText}>
              Confirmed · {new Date(confirmedAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {takenBy ? ` · ${takenBy}` : ''}
            </Text>
          </View>
        )}

        {/* ── Stats row + Mark All row ── */}
        {hasStudents && (
          <View style={styles.controlBlock}>
            {/* Row 1: counts */}
            <View style={styles.countsGroup}>
              <View style={styles.countChip}>
                <View style={[styles.countDot, { backgroundColor: GREEN }]} />
                <Text style={styles.countNum}>{markedPresent}</Text>
                <Text style={styles.countLabel}>P</Text>
              </View>
              <View style={styles.countChip}>
                <View style={[styles.countDot, { backgroundColor: RED }]} />
                <Text style={styles.countNum}>{markedAbsent}</Text>
                <Text style={styles.countLabel}>A</Text>
              </View>
              {unmarked > 0 && (
                <View style={styles.countChip}>
                  <View style={[styles.countDot, { backgroundColor: '#CCCCCC' }]} />
                  <Text style={styles.countNum}>{unmarked}</Text>
                  <Text style={styles.countLabel}>–</Text>
                </View>
              )}
            </View>

            {/* Row 2: mark-all buttons — full width, never overflow */}
            {!isConfirmed && (
              <View style={styles.markAllGroup}>
                <Pressable style={({ pressed }) => [styles.markAllBtn, styles.markAllPresent, pressed && { opacity: 0.8 }]}
                  onPress={() => markAll('PRESENT')}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                  <Text style={styles.markAllText}>All Present</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.markAllBtn, styles.markAllAbsent, pressed && { opacity: 0.8 }]}
                  onPress={() => markAll('ABSENT')}>
                  <Ionicons name="close-circle" size={14} color="#FFF" />
                  <Text style={styles.markAllText}>All Absent</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── ScrollView + footer wrapped in KAV so keyboard pushes them up ── */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Search is index 0 inside ScrollView → sticky via stickyHeaderIndices */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickyHeaderIndices={hasStudents ? [0] : undefined}
          >
          {/* ── Sticky search bar (index 0) ── */}
          {hasStudents && (
            <View style={styles.searchStickyWrap}>
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color="#AAAAAA" />
                <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
                  placeholder="Search by name or roll number…" placeholderTextColor="#AAAAAA"
                  returnKeyType="search" clearButtonMode="while-editing" />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color="#CCCCCC" />
                  </Pressable>
                )}
              </View>
            </View>
          )}
          {/* Loading */}
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.stateText}>Loading attendance…</Text>
            </View>
          )}

          {/* Error */}
          {!loading && !!error && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle-outline" size={28} color={RED} />
              </View>
              <Text style={styles.errorTitle}>Couldn't load attendance</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => setDate(d => new Date(d))}>
                <Ionicons name="refresh-outline" size={15} color="#FFF" />
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* No section */}
          {!loading && !error && !selectedSection && (
            <View style={styles.centered}>
              <Ionicons name="school-outline" size={52} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No class selected</Text>
              <Text style={styles.emptyBody}>Select a class from the top bar.</Text>
            </View>
          )}

          {/* No students */}
          {!loading && !error && !!selectedSection && students.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={52} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptyBody}>No active students in this section.</Text>
            </View>
          )}

          {/* No search results */}
          {!loading && !error && students.length > 0 && filteredStudents.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={44} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No results for "{search}"</Text>
              <Text style={styles.emptyBody}>Try a different name or roll number.</Text>
            </View>
          )}

          {/* Student rows */}
          {!loading && !error && filteredStudents.length > 0 && (
            <View style={styles.listCard}>
              {filteredStudents.map((student, idx) => {
                const status = statuses[student.id] ?? null;
                const isLast = idx === filteredStudents.length - 1;

                return (
                  <React.Fragment key={student.id}>
                    <View style={styles.studentRow}>

                      {/* Index circle */}
                      <View style={styles.indexCircle}>
                        <Text style={styles.indexText}>{idx + 1}</Text>
                      </View>

                      {/* Name + roll */}
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        {!!student.roll_number && (
                          <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
                        )}
                      </View>

                      {/* P / A buttons */}
                      <View style={styles.paButtons}>
                        <Pressable
                          style={[styles.paBtn,
                            status === 'PRESENT' ? styles.paBtnPresentActive : styles.paBtnInactive]}
                          onPress={() => !isConfirmed && setStudentStatus(student.id, 'PRESENT')}
                          disabled={isConfirmed}
                        >
                          <Text style={[styles.paBtnText,
                            status === 'PRESENT' ? styles.paBtnTextActive : styles.paBtnTextPresent]}>
                            P
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[styles.paBtn,
                            status === 'ABSENT' ? styles.paBtnAbsentActive : styles.paBtnInactive]}
                          onPress={() => !isConfirmed && setStudentStatus(student.id, 'ABSENT')}
                          disabled={isConfirmed}
                        >
                          <Text style={[styles.paBtnText,
                            status === 'ABSENT' ? styles.paBtnTextActive : styles.paBtnTextAbsent]}>
                            A
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {!isLast && <View style={styles.rowDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          )}
          </ScrollView>

          {/* ── Confirm button (inside KAV, moves up with keyboard) ── */}
          {hasStudents && !isConfirmed && (
            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.88 }, confirming && styles.btnDisabled]}
                onPress={handleConfirmPress}
                disabled={confirming}
              >
                {confirming
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : (<>
                      <Ionicons name="checkmark-done" size={18} color="#FFF" />
                      <Text style={styles.confirmBtnText}>Confirm Attendance</Text>
                    </>)
                }
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>

      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  // Sticky search wrapper — white bg so it covers rows underneath when pinned
  searchStickyWrap: {
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },

  // ── Date navigator
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  navArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navArrowPressed: { backgroundColor: '#F0F4F8' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#EBF2FB',
  },
  dateBtnPressed: { opacity: 0.75 },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: ACCENT },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },

  // ── Slot tabs
  slotRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  slotTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F5F5F5',
  },
  slotTabActive: { backgroundColor: '#EBF2FB' },
  slotTabText: { fontSize: 13, fontWeight: '500', color: '#AAAAAA' },
  slotTabTextActive: { color: ACCENT, fontWeight: '700' },

  // ── Confirmed banner
  confirmedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E1F5EE', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#A7F3D0',
  },
  confirmedText: { fontSize: 12, color: '#065F46', fontWeight: '600', flex: 1 },

  // ── Stats + mark-all (two stacked rows, never overflow)
  controlBlock: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: LINE,
    gap: 8,
  },
  countsGroup: { flexDirection: 'row', gap: 6 },
  countChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  countDot: { width: 7, height: 7, borderRadius: 4 },
  countNum: { fontSize: 13, fontWeight: '700', color: INK },
  countLabel: { fontSize: 12, color: MUTED },
  markAllGroup: { flexDirection: 'row', gap: 8 },
  markAllBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 11,
  },
  markAllPresent: { backgroundColor: GREEN },
  markAllAbsent:  { backgroundColor: RED  },
  markAllText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // ── Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: LINE,
    gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: INK, paddingVertical: 0 },

  // ── Student list
  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 16 },

  centered: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  stateText: { fontSize: 14, color: MUTED },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#444444' },
  emptyBody:  { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 19 },

  errorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FFCDD2',
  },
  errorIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '700', color: INK },
  errorBody:  { fontSize: 13, color: MUTED, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: RED, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, marginTop: 4,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // ── List card
  listCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: LINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 56 },

  // Index circle
  indexCircle: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F0F4F8',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  indexText: { fontSize: 12, fontWeight: '700', color: MUTED },

  // Student info
  studentInfo: { flex: 1, gap: 3 },
  studentName: { fontSize: 15, fontWeight: '700', color: INK, lineHeight: 20 },
  studentRoll: { fontSize: 12, color: MUTED, fontWeight: '500' },

  // P / A buttons
  paButtons: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  paBtn: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  paBtnPresentActive: { backgroundColor: GREEN, borderColor: GREEN },
  paBtnAbsentActive:  { backgroundColor: RED,   borderColor: RED   },
  paBtnInactive: { backgroundColor: 'transparent', borderColor: '#D0D5DD' },
  paBtnText: { fontSize: 14, fontWeight: '800' },
  paBtnTextActive:  { color: '#FFFFFF' },
  paBtnTextPresent: { color: '#AAAAAA' },
  paBtnTextAbsent:  { color: '#AAAAAA' },

  // ── Footer
  footer: {
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: LINE,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: ACCENT,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  btnDisabled: { opacity: 0.55 },
});
