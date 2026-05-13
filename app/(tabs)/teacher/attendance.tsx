import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
const GREEN = '#1D9E75';
const RED = '#DC2626';

const SLOTS: AttendanceSlot[] = ['MORNING', 'AFTERNOON'];

// null = not yet marked by teacher
type StatusValue = AttendanceStatus | null;

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function shiftDate(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export default function AttendanceScreen() {
  const { selectedSection } = useTeacherStore();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slot, setSlot] = useState<AttendanceSlot>('MORNING');

  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [takenBy, setTakenBy] = useState('');
  const [statuses, setStatuses] = useState<Record<string, StatusValue>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState('');

  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const isToday = toDateString(date) === toDateString(new Date());
  const isConfirmed = !!confirmedAt;

  // Fetch students + session together to avoid any section mismatch
  useEffect(() => {
    if (!selectedSection) {
      setStudents([]);
      setSessionId(null);
      setStatuses({});
      return;
    }

    const guard = { cancelled: false };
    abortRef.current = guard;

    const sectionId = selectedSection.id;
    const dateStr = toDateString(date);

    async function load() {
      setLoading(true);
      setError('');
      setStudents([]);
      setSessionId(null);
      setConfirmedAt(null);
      setStatuses({});

      try {
        const studentData = await teacherSectionsApi.getStudents(sectionId);
        if (guard.cancelled) return;

        const fetchedStudents = studentData.results;

        const sess = await teacherAttendanceApi.getOrCreateSession(sectionId, dateStr, slot);
        if (guard.cancelled) return;

        // Default: all null (no selection). Override with existing records.
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
        if (guard.cancelled) return;
        setError(err.details ?? 'Failed to load attendance. Please try again.');
      } finally {
        if (!guard.cancelled) setLoading(false);
      }
    }

    load();
    return () => { guard.cancelled = true; };
  }, [selectedSection?.id, toDateString(date), slot]);

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    if (isConfirmed) return;
    // Tap same status again → deselect (back to null)
    setStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  }

  function markAll(status: AttendanceStatus) {
    if (isConfirmed) return;
    const map: Record<string, StatusValue> = {};
    for (const s of students) map[s.id] = status;
    setStatuses(map);
  }

  // Unmarked students default to PRESENT when confirming
  function buildRecords() {
    return students.map(s => ({
      student_id: s.id,
      status: (statuses[s.id] ?? 'PRESENT') as AttendanceStatus,
    }));
  }

  function handleConfirmPress() {
    const unmarked = students.filter(s => statuses[s.id] === null).length;
    const present = students.filter(s => (statuses[s.id] ?? 'PRESENT') === 'PRESENT').length;
    const absent = students.filter(s => statuses[s.id] === 'ABSENT').length;

    const unmarkedNote = unmarked > 0
      ? `\n\n${unmarked} unmarked student${unmarked > 1 ? 's' : ''} will be counted as Present.`
      : '';

    Alert.alert(
      'Confirm Attendance',
      `Lock ${slot === 'MORNING' ? 'morning' : 'afternoon'} attendance for ${formatDisplayDate(date)}?\n\nPresent: ${present}  ·  Absent: ${absent}${unmarkedNote}\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: doConfirm },
      ],
    );
  }

  async function doConfirm() {
    if (!sessionId || !students.length) return;
    setConfirming(true);
    try {
      // Save all statuses first
      await teacherAttendanceApi.markAttendance(sessionId, buildRecords());
      // Then confirm
      const res = await teacherAttendanceApi.confirmSession(sessionId);
      setConfirmedAt(res.confirmed_at);
      Alert.alert(
        'Confirmed ✓',
        `Attendance confirmed.\n${res.absent_count} student${res.absent_count !== 1 ? 's' : ''} marked absent.`,
      );
    } catch (err: any) {
      Alert.alert('Failed', err.details ?? 'Failed to confirm attendance.');
    } finally {
      setConfirming(false);
    }
  }

  const markedPresent = students.filter(s => statuses[s.id] === 'PRESENT').length;
  const markedAbsent = students.filter(s => statuses[s.id] === 'ABSENT').length;
  const unmarked = students.filter(s => statuses[s.id] === null).length;

  const q = search.trim().toLowerCase();
  const filteredStudents = q
    ? students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q),
      )
    : students;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      {/* Date navigator */}
      <View style={styles.dateNav}>
        <Pressable
          style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
          onPress={() => setDate(d => shiftDate(d, -1))}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#444444" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.dateBtn, pressed && styles.dateBtnPressed]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={15} color={ACCENT} />
          <Text style={styles.dateBtnText}>{formatDisplayDate(date)}</Text>
          {isToday && <View style={styles.todayDot} />}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
          onPress={() => setDate(d => shiftDate(d, 1))}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={20} color="#444444" />
        </Pressable>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}

      {/* Slot tabs — extra top padding for breathing room */}
      <View style={styles.slotRow}>
        {SLOTS.map(s => (
          <Pressable
            key={s}
            style={[styles.slotTab, slot === s && styles.slotTabActive]}
            onPress={() => setSlot(s)}
          >
            <Ionicons
              name={s === 'MORNING' ? 'sunny-outline' : 'moon-outline'}
              size={14}
              color={slot === s ? ACCENT : '#AAAAAA'}
            />
            <Text style={[styles.slotTabText, slot === s && styles.slotTabTextActive]}>
              {s === 'MORNING' ? 'Morning' : 'Afternoon'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Confirmed banner */}
      {isConfirmed && (
        <View style={styles.confirmedBanner}>
          <Ionicons name="lock-closed" size={13} color={GREEN} />
          <Text style={styles.confirmedText}>
            Confirmed ·{' '}
            {new Date(confirmedAt!).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {takenBy ? ` · ${takenBy}` : ''}
          </Text>
        </View>
      )}

      {/* Stats + quick mark buttons */}
      {!loading && !error && students.length > 0 && (
        <View style={styles.statsBar}>
          {/* Row 1: counts */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: GREEN }]} />
              <Text style={styles.statNum}>{markedPresent}</Text>
              <Text style={styles.statLabel}>P</Text>
            </View>
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: RED }]} />
              <Text style={styles.statNum}>{markedAbsent}</Text>
              <Text style={styles.statLabel}>A</Text>
            </View>
            {unmarked > 0 && (
              <View style={styles.statChip}>
                <View style={[styles.statDot, { backgroundColor: '#CCCCCC' }]} />
                <Text style={styles.statNum}>{unmarked}</Text>
                <Text style={styles.statLabel}>–</Text>
              </View>
            )}
          </View>

          {/* Row 2: mark all buttons — full width, never clipped */}
          {!isConfirmed && (
            <View style={styles.markAllRow}>
              <Pressable
                style={({ pressed }) => [styles.markAllBtn, styles.markAllPresent, pressed && styles.markAllBtnPressed]}
                onPress={() => markAll('PRESENT')}
              >
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={styles.markAllText}>All Present</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.markAllBtn, styles.markAllAbsent, pressed && styles.markAllBtnPressed]}
                onPress={() => markAll('ABSENT')}
              >
                <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                <Text style={styles.markAllText}>All Absent</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Search bar */}
      {!loading && !error && students.length > 0 && (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#AAAAAA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or roll number…"
            placeholderTextColor="#AAAAAA"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color="#CCCCCC" />
            </Pressable>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading attendance…</Text>
          </View>
        )}

        {!loading && !!error && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={RED} />
            </View>
            <Text style={styles.errorTitle}>{"Couldn't load attendance"}</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => setDate(d => new Date(d))}
            >
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && !selectedSection && (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No class selected</Text>
            <Text style={styles.emptyBody}>Select a class from the top bar.</Text>
          </View>
        )}

        {!loading && !error && !!selectedSection && students.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyBody}>No active students in this section.</Text>
          </View>
        )}

        {/* No search results */}
        {!loading && !error && students.length > 0 && filteredStudents.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={40} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No results for {search}</Text>
            <Text style={styles.emptyBody}>Try a different name or roll number.</Text>
          </View>
        )}

        {/* Student list */}
        {!loading && !error && filteredStudents.length > 0 && (
          <View style={styles.listCard}>
            {filteredStudents.map((student, idx) => {
              const status = statuses[student.id] ?? null;
              const isLast = idx === filteredStudents.length - 1;

              return (
                <React.Fragment key={student.id}>
                  <View style={styles.studentRow}>
                    <Text style={styles.studentIndex}>{idx + 1}</Text>

                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {student.name}
                      </Text>
                      {!!student.roll_number && (
                        <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
                      )}
                    </View>

                    {/* P / A buttons */}
                    <View style={styles.paButtons}>
                      <Pressable
                        style={[
                          styles.paBtn,
                          status === 'PRESENT' ? styles.paBtnPresentActive : styles.paBtnPresentInactive,
                        ]}
                        onPress={() => !isConfirmed && setStudentStatus(student.id, 'PRESENT')}
                        disabled={isConfirmed}
                      >
                        <Text style={[
                          styles.paBtnText,
                          status === 'PRESENT' ? styles.paBtnTextActive : styles.paBtnTextPresentInactive,
                        ]}>
                          P
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.paBtn,
                          status === 'ABSENT' ? styles.paBtnAbsentActive : styles.paBtnAbsentInactive,
                        ]}
                        onPress={() => !isConfirmed && setStudentStatus(student.id, 'ABSENT')}
                        disabled={isConfirmed}
                      >
                        <Text style={[
                          styles.paBtnText,
                          status === 'ABSENT' ? styles.paBtnTextActive : styles.paBtnTextAbsentInactive,
                        ]}>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm button only */}
      {!loading && !error && students.length > 0 && !isConfirmed && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && styles.confirmBtnPressed,
              confirming && styles.btnDisabled,
            ]}
            onPress={handleConfirmPress}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Confirm Attendance</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  // Date nav
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  navArrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  navArrowPressed: { backgroundColor: '#F0F0F0' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#EBF2FB',
  },
  dateBtnPressed: { opacity: 0.75 },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: ACCENT },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },

  // Slot tabs — extra vertical padding for breathing room
  slotRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  slotTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  slotTabActive: { backgroundColor: '#EBF2FB' },
  slotTabText: { fontSize: 13, fontWeight: '500', color: '#AAAAAA' },
  slotTabTextActive: { color: ACCENT, fontWeight: '600' },

  // Confirmed banner
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  confirmedText: { fontSize: 12, color: '#065F46', fontWeight: '500', flex: 1 },

  // Stats bar
  statsBar: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statsRow: { flexDirection: 'row', gap: 6 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statNum: { fontSize: 13, fontWeight: '700', color: '#111111' },
  statLabel: { fontSize: 12, color: '#888888' },

  // Mark all buttons
  markAllRow: { flexDirection: 'row', gap: 8 },
  markAllBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  markAllBtnPressed: { opacity: 0.75 },
  markAllPresent: { backgroundColor: GREEN },
  markAllAbsent: { backgroundColor: RED },
  markAllText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    paddingVertical: 0,
  },

  // List
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 20 },

  centered: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '600', color: '#111111' },
  errorBody: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: RED, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 46 },
  studentIndex: { width: 22, fontSize: 12, color: '#AAAAAA', fontWeight: '500' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '500', color: '#111111' },
  studentRoll: { fontSize: 11, color: '#AAAAAA', marginTop: 1 },

  // P / A buttons
  paButtons: { flexDirection: 'row', gap: 6 },
  paBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  paBtnPresentActive: { backgroundColor: GREEN, borderColor: GREEN },
  paBtnPresentInactive: { backgroundColor: 'transparent', borderColor: '#CCCCCC' },
  paBtnAbsentActive: { backgroundColor: RED, borderColor: RED },
  paBtnAbsentInactive: { backgroundColor: 'transparent', borderColor: '#CCCCCC' },
  paBtnText: { fontSize: 13, fontWeight: '700' },
  paBtnTextActive: { color: '#FFFFFF' },
  paBtnTextPresentInactive: { color: '#AAAAAA' },
  paBtnTextAbsentInactive: { color: '#AAAAAA' },

  // Bottom action
  actions: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnPressed: { opacity: 0.85 },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  btnDisabled: { opacity: 0.55 },
});
