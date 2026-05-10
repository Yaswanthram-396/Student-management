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

  // Date & slot
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slot, setSlot] = useState<AttendanceSlot>('MORNING');

  // Students (fetched once per section)
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');

  // Session & statuses
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [takenBy, setTakenBy] = useState<string>('');
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Actions
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const lastSectionId = useRef('');
  const lastSessionKey = useRef('');

  // Fetch students whenever section changes
  useEffect(() => {
    if (!selectedSection || selectedSection.id === lastSectionId.current) return;
    lastSectionId.current = selectedSection.id;
    lastSessionKey.current = '';

    setStudents([]);
    setStudentsError('');
    setSessionId(null);
    setStatuses({});

    async function loadStudents() {
      setStudentsLoading(true);
      try {
        const data = await teacherSectionsApi.getStudents(selectedSection!.id);
        setStudents(data.results);
      } catch (err: any) {
        setStudentsError(err.details ?? 'Failed to load students.');
      } finally {
        setStudentsLoading(false);
      }
    }
    loadStudents();
  }, [selectedSection?.id]);

  // Fetch session whenever date or slot changes (students already loaded)
  useEffect(() => {
    if (!selectedSection || students.length === 0) return;
    const key = `${selectedSection.id}_${toDateString(date)}_${slot}`;
    if (lastSessionKey.current === key) return;
    lastSessionKey.current = key;

    async function loadSession() {
      setSessionLoading(true);
      setSessionError('');
      setSessionId(null);
      setConfirmedAt(null);
      setStatuses({});
      try {
        const sess = await teacherAttendanceApi.getOrCreateSession(
          selectedSection!.id,
          toDateString(date),
          slot,
        );
        setSessionId(sess.id);
        setConfirmedAt(sess.confirmed_at);
        setTakenBy(sess.taken_by?.name ?? '');

        // Build status map: start with all students as PRESENT,
        // then override with any existing session records
        const map: Record<string, AttendanceStatus> = {};
        for (const s of students) {
          map[s.id] = 'PRESENT'; // default
        }
        for (const r of sess.records) {
          if (r.status) map[r.student_id] = r.status;
        }
        setStatuses(map);
      } catch (err: any) {
        setSessionError(err.details ?? 'Failed to load session.');
        lastSessionKey.current = ''; // allow retry
      } finally {
        setSessionLoading(false);
      }
    }
    loadSession();
  }, [date, slot, students]);

  function toggleStatus(studentId: string) {
    if (confirmedAt) return;
    setStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }));
  }

  function markAll(status: AttendanceStatus) {
    if (confirmedAt) return;
    const map: Record<string, AttendanceStatus> = {};
    for (const s of students) map[s.id] = status;
    setStatuses(map);
  }

  async function handleSave() {
    if (!sessionId) return;
    const records = students.map(s => ({
      student_id: s.id,
      status: statuses[s.id] ?? 'PRESENT',
    }));
    setSaving(true);
    try {
      await teacherAttendanceApi.markAttendance(sessionId, records);
      Alert.alert('Saved', 'Attendance saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  function handleConfirmPress() {
    Alert.alert(
      'Confirm Attendance',
      `Lock ${slot === 'MORNING' ? 'morning' : 'afternoon'} attendance for ${formatDisplayDate(date)}?\n\nPresent: ${presentCount}  ·  Absent: ${absentCount}\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: doConfirm },
      ],
    );
  }

  async function doConfirm() {
    if (!sessionId) return;
    // Save first, then confirm
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        status: statuses[s.id] ?? 'PRESENT',
      }));
      await teacherAttendanceApi.markAttendance(sessionId, records);
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err.details ?? 'Failed to save attendance before confirming.');
      return;
    }
    setSaving(false);

    setConfirming(true);
    try {
      const res = await teacherAttendanceApi.confirmSession(sessionId);
      setConfirmedAt(res.confirmed_at);
      Alert.alert(
        '✓ Confirmed',
        `Attendance confirmed.\n${res.absent_count} student${res.absent_count !== 1 ? 's' : ''} marked absent.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to confirm attendance.');
    } finally {
      setConfirming(false);
    }
  }

  const presentCount = students.filter(s => (statuses[s.id] ?? 'PRESENT') === 'PRESENT').length;
  const absentCount = students.filter(s => (statuses[s.id] ?? 'PRESENT') === 'ABSENT').length;
  const isConfirmed = !!confirmedAt;
  const isLoading = studentsLoading || sessionLoading;
  const error = studentsError || sessionError;
  const isToday = toDateString(date) === toDateString(new Date());

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      {/* ── Date navigator ── */}
      <View style={styles.dateNav}>
        <Pressable
          style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
          onPress={() => { setDate(d => shiftDate(d, -1)); lastSessionKey.current = ''; }}
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
          onPress={() => { setDate(d => shiftDate(d, 1)); lastSessionKey.current = ''; }}
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
            if (selected) { lastSessionKey.current = ''; setDate(selected); }
          }}
        />
      )}

      {/* ── Slot tabs ── */}
      <View style={styles.slotRow}>
        {SLOTS.map(s => (
          <Pressable
            key={s}
            style={[styles.slotTab, slot === s && styles.slotTabActive]}
            onPress={() => { setSlot(s); lastSessionKey.current = ''; }}
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

      {/* ── Confirmed banner ── */}
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

      {/* ── Stats + quick actions ── */}
      {!isLoading && !error && students.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: GREEN }]} />
            <Text style={styles.statText}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: RED }]} />
            <Text style={styles.statText}>{absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: '#AAAAAA' }]} />
            <Text style={styles.statText}>{students.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          {!isConfirmed && (
            <View style={styles.quickBtns}>
              <Pressable
                style={[styles.quickBtn, { borderColor: GREEN }]}
                onPress={() => markAll('PRESENT')}
              >
                <Text style={[styles.quickBtnText, { color: GREEN }]}>All ✓</Text>
              </Pressable>
              <Pressable
                style={[styles.quickBtn, { borderColor: RED }]}
                onPress={() => markAll('ABSENT')}
              >
                <Text style={[styles.quickBtnText, { color: RED }]}>All ✗</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* ── Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>
              {studentsLoading ? 'Loading students…' : 'Loading session…'}
            </Text>
          </View>
        )}

        {/* Error */}
        {!isLoading && !!error && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={RED} />
            </View>
            <Text style={styles.errorTitle}>Could not load attendance</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setStudentsError('');
                setSessionError('');
                lastSectionId.current = '';
                lastSessionKey.current = '';
              }}
            >
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* No section */}
        {!isLoading && !error && !selectedSection && (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No class selected</Text>
            <Text style={styles.emptyBody}>Select a class from the top bar.</Text>
          </View>
        )}

        {/* Empty students */}
        {!isLoading && !error && !!selectedSection && students.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyBody}>No active students in this section.</Text>
          </View>
        )}

        {/* Student list */}
        {!isLoading && !error && students.length > 0 && (
          <View style={styles.listCard}>
            {students.map((student, idx) => {
              const status = statuses[student.id] ?? 'PRESENT';
              const isPresent = status === 'PRESENT';
              const isLast = idx === students.length - 1;

              return (
                <React.Fragment key={student.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.studentRow,
                      pressed && !isConfirmed && styles.studentRowPressed,
                    ]}
                    onPress={() => toggleStatus(student.id)}
                    disabled={isConfirmed}
                  >
                    <Text style={styles.studentIndex}>{idx + 1}</Text>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {student.name}
                      </Text>
                      {student.roll_number ? (
                        <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
                      ) : null}
                    </View>
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: isPresent ? '#E1F5EE' : '#FEE2E2' },
                    ]}>
                      <Ionicons
                        name={isPresent ? 'checkmark-circle' : 'close-circle'}
                        size={15}
                        color={isPresent ? GREEN : RED}
                      />
                      <Text style={[styles.statusText, { color: isPresent ? GREEN : RED }]}>
                        {isPresent ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  </Pressable>
                  {!isLast && <View style={styles.rowDivider} />}
                </React.Fragment>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom actions ── */}
      {!isLoading && !error && students.length > 0 && !isConfirmed && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
              (saving || confirming) && styles.btnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || confirming}
          >
            {saving ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <>
                <Ionicons name="save-outline" size={17} color={ACCENT} />
                <Text style={styles.saveBtnText}>Save Draft</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && styles.confirmBtnPressed,
              (saving || confirming) && styles.btnDisabled,
            ]}
            onPress={handleConfirmPress}
            disabled={saving || confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={17} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Confirm & Lock</Text>
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowPressed: { backgroundColor: '#F0F0F0' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EBF2FB',
  },
  dateBtnPressed: { opacity: 0.75 },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: ACCENT },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },

  // Slots
  slotRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
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
    paddingVertical: 9,
    borderRadius: 10,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  confirmedText: { fontSize: 12, color: '#065F46', fontWeight: '500', flex: 1 },

  // Stats
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statText: { fontSize: 13, fontWeight: '700', color: '#111111' },
  statLabel: { fontSize: 11, color: '#888888' },
  quickBtns: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  quickBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickBtnText: { fontSize: 12, fontWeight: '700' },

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
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontSize: 15, fontWeight: '600', color: '#111111' },
  errorBody: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: RED,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },

  // List card
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
  studentRowPressed: { backgroundColor: '#F8F8F8' },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 48 },
  studentIndex: { width: 24, fontSize: 12, color: '#AAAAAA', fontWeight: '500' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '500', color: '#111111' },
  studentRoll: { fontSize: 11, color: '#AAAAAA', marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Bottom actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: '#FFFFFF',
  },
  saveBtnPressed: { backgroundColor: '#EBF2FB' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: ACCENT },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnPressed: { opacity: 0.85 },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  btnDisabled: { opacity: 0.55 },
});
