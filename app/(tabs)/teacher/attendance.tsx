import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  teacherAttendanceApi,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceSlot,
  type AttendanceStatus,
} from '../../../services/teacher-attendance';
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

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slot, setSlot] = useState<AttendanceSlot>('MORNING');

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Track last fetched key to avoid redundant fetches
  const fetchedKey = useRef('');

  const fetchSession = useCallback(async (d: Date, s: AttendanceSlot) => {
    if (!selectedSection) return;
    const key = `${selectedSection.id}_${toDateString(d)}_${s}`;
    if (fetchedKey.current === key) return;
    fetchedKey.current = key;

    setLoading(true);
    setFetchError('');
    setSession(null);
    setStatuses({});
    try {
      const sess = await teacherAttendanceApi.getOrCreateSession(
        selectedSection.id,
        toDateString(d),
        s,
      );
      setSession(sess);
      // Build local status map — null → default PRESENT
      const map: Record<string, AttendanceStatus> = {};
      for (const r of sess.records) {
        map[r.student_id] = r.status ?? 'PRESENT';
      }
      setStatuses(map);
    } catch (err: any) {
      setFetchError(err.details ?? 'Failed to load attendance. Please try again.');
      fetchedKey.current = ''; // allow retry
    } finally {
      setLoading(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    fetchedKey.current = '';
    fetchSession(date, slot);
  }, [date, slot, selectedSection?.id]);

  function toggleStatus(studentId: string) {
    if (session?.confirmed_at) return;
    setStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }));
  }

  function markAll(status: AttendanceStatus) {
    if (session?.confirmed_at) return;
    const map: Record<string, AttendanceStatus> = {};
    for (const r of session?.records ?? []) {
      map[r.student_id] = status;
    }
    setStatuses(map);
  }

  async function handleSave() {
    if (!session) return;
    const records = Object.entries(statuses).map(([student_id, status]) => ({
      student_id,
      status,
    }));
    setSaving(true);
    try {
      const res = await teacherAttendanceApi.markAttendance(session.id, records);
      // Update local session records with saved data
      setSession((prev) =>
        prev ? { ...prev, records: res.records } : prev,
      );
      Alert.alert('Saved', 'Attendance saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  function handleConfirm() {
    if (!session) return;
    Alert.alert(
      'Confirm Attendance',
      `This will lock the ${slot.toLowerCase()} attendance for ${formatDisplayDate(date)}. You cannot edit it after confirming.\n\nPresent: ${presentCount}  Absent: ${absentCount}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: doConfirm,
        },
      ],
    );
  }

  async function doConfirm() {
    if (!session) return;
    setConfirming(true);
    try {
      const res = await teacherAttendanceApi.confirmSession(session.id);
      setSession((prev) =>
        prev ? { ...prev, confirmed_at: res.confirmed_at } : prev,
      );
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

  const records: AttendanceRecord[] = session?.records ?? [];
  const presentCount = Object.values(statuses).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(statuses).filter((s) => s === 'ABSENT').length;
  const isConfirmed = !!session?.confirmed_at;
  const isToday = toDateString(date) === toDateString(new Date());

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Date navigator */}
      <View style={styles.dateNav}>
        <Pressable
          style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
          onPress={() => setDate((d) => shiftDate(d, -1))}
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
          onPress={() => setDate((d) => shiftDate(d, 1))}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={20} color="#444444" />
        </Pressable>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}

      {/* Slot tabs */}
      <View style={styles.slotRow}>
        {SLOTS.map((s) => (
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
          <Ionicons name="lock-closed" size={14} color={GREEN} />
          <Text style={styles.confirmedText}>
            Confirmed ·{' '}
            {new Date(session!.confirmed_at!).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}Taken by {session?.taken_by.name}
          </Text>
        </View>
      )}

      {/* Stats bar */}
      {!loading && !fetchError && records.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: GREEN }]} />
            <Text style={styles.statText}>{presentCount} Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: RED }]} />
            <Text style={styles.statText}>{absentCount} Absent</Text>
          </View>
          <View style={styles.statDivider} />
          <Text style={styles.statText}>{records.length} Total</Text>

          {!isConfirmed && (
            <View style={styles.quickBtns}>
              <Pressable
                style={[styles.quickBtn, { borderColor: GREEN }]}
                onPress={() => markAll('PRESENT')}
              >
                <Text style={[styles.quickBtnText, { color: GREEN }]}>All Present</Text>
              </Pressable>
              <Pressable
                style={[styles.quickBtn, { borderColor: RED }]}
                onPress={() => markAll('ABSENT')}
              >
                <Text style={[styles.quickBtnText, { color: RED }]}>All Absent</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading attendance…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!fetchError && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={30} color={RED} />
            </View>
            <Text style={styles.errorTitle}>Couldn't load attendance</Text>
            <Text style={styles.errorBody}>{fetchError}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => { fetchedKey.current = ''; fetchSession(date, slot); }}
            >
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* No section selected */}
        {!loading && !fetchError && !selectedSection && (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No class selected</Text>
            <Text style={styles.emptyBody}>Select a class from the top bar.</Text>
          </View>
        )}

        {/* Empty students */}
        {!loading && !fetchError && !!selectedSection && records.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyBody}>No active students in this section.</Text>
          </View>
        )}

        {/* Student list */}
        {!loading && !fetchError && records.map((record, idx) => {
          const status = statuses[record.student_id] ?? 'PRESENT';
          const isPresent = status === 'PRESENT';

          return (
            <Pressable
              key={record.student_id}
              style={({ pressed }) => [
                styles.studentRow,
                idx === records.length - 1 && styles.studentRowLast,
                pressed && !isConfirmed && styles.studentRowPressed,
              ]}
              onPress={() => toggleStatus(record.student_id)}
              disabled={isConfirmed}
            >
              {/* Index */}
              <Text style={styles.studentIndex}>{idx + 1}</Text>

              {/* Name */}
              <Text style={styles.studentName} numberOfLines={1}>
                {record.student_name}
              </Text>

              {/* Status toggle */}
              <View
                style={[
                  styles.statusToggle,
                  { backgroundColor: isPresent ? '#E1F5EE' : '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name={isPresent ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={isPresent ? GREEN : RED}
                />
                <Text style={[styles.statusLabel, { color: isPresent ? GREEN : RED }]}>
                  {isPresent ? 'Present' : 'Absent'}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom actions */}
      {!loading && !fetchError && records.length > 0 && !isConfirmed && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
              saving && styles.btnDisabled,
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
              confirming && styles.btnDisabled,
            ]}
            onPress={handleConfirm}
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

  // Date navigator
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
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginLeft: 2,
  },

  // Slot tabs
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

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 8,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { fontSize: 12, color: '#555555', fontWeight: '500' },
  statDivider: { width: 1, height: 14, backgroundColor: '#DDDDDD' },
  quickBtns: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  quickBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickBtnText: { fontSize: 11, fontWeight: '600' },

  // List
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // States
  centered: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: 8,
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
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },

  // Student rows (flat list inside card)
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    borderRadius: 0,
  },
  studentRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  studentRowPressed: { backgroundColor: '#F8F8F8' },
  studentIndex: {
    width: 28,
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  studentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
    marginRight: 10,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusLabel: { fontSize: 12, fontWeight: '600' },

  // Bottom actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
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
