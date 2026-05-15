import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  teacherAttendanceApi,
  type StudentAttendanceRecord,
  type StudentDetailResponse,
  type StudentAttendanceHistoryResponse,
  type DayAttendanceStatus,
} from '../services/teacher-attendance';

// ── Tokens ────────────────────────────────────────────────────────────────────
const ACCENT  = '#185FA5';
const GREEN   = '#16825D';
const RED     = '#D92D20';
const AMBER   = '#C76A00';
const INK     = '#101828';
const MUTED   = '#667085';
const LINE    = '#EAECF0';
const BG      = '#F6F8FB';
const SURFACE = '#FFFFFF';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? '';
}
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function formatShortDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function formatTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}
function defaultFromDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d;
}

// ── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PRESENT:    { label: 'Present',    color: GREEN,  bg: '#EAF7F1', icon: 'checkmark-circle'    },
  ABSENT:     { label: 'Absent',     color: RED,    bg: '#FEEDEB', icon: 'close-circle'         },
  PARTIAL:    { label: 'Partial',    color: AMBER,  bg: '#FFF5E6', icon: 'remove-circle-outline'},
  NOT_MARKED: { label: 'Not Marked', color: MUTED,  bg: '#F2F4F7', icon: 'time-outline'         },
};
function getStatusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.NOT_MARKED;
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const m = getStatusMeta(status);
  return (
    <View style={[styles.statusPill, { backgroundColor: m.bg }]}>
      <Ionicons name={m.icon as any} size={13} color={m.color} />
      <Text style={[styles.statusPillText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={styles.stateText}>Loading student details…</Text>
    </View>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centeredState}>
      <View style={styles.errorIconWrap}>
        <Ionicons name="cloud-offline-outline" size={32} color={RED} />
      </View>
      <Text style={styles.errorTitle}>Could not load data</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh-outline" size={15} color={SURFACE} />
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

// ── Date range picker row ─────────────────────────────────────────────────────
function DateRangeRow({
  from, to,
  onFromChange, onToChange,
}: {
  from: Date; to: Date;
  onFromChange: (d: Date) => void;
  onToChange:   (d: Date) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);

  return (
    <>
      <View style={styles.dateRangeRow}>
        <Pressable
          style={({ pressed }) => [styles.datePicker, pressed && styles.datePickerPressed]}
          onPress={() => setPickerOpen('from')}
        >
          <Ionicons name="calendar-outline" size={14} color={ACCENT} />
          <View>
            <Text style={styles.datePickerLabel}>From</Text>
            <Text style={styles.datePickerValue}>{formatShortDate(toDateStr(from))}</Text>
          </View>
        </Pressable>

        <View style={styles.dateRangeSep}>
          <Ionicons name="arrow-forward" size={16} color={MUTED} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.datePicker, pressed && styles.datePickerPressed]}
          onPress={() => setPickerOpen('to')}
        >
          <Ionicons name="calendar-outline" size={14} color={ACCENT} />
          <View>
            <Text style={styles.datePickerLabel}>To</Text>
            <Text style={styles.datePickerValue}>{formatShortDate(toDateStr(to))}</Text>
          </View>
        </Pressable>
      </View>

      {pickerOpen !== null && (
        <DateTimePicker
          value={pickerOpen === 'from' ? from : to}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (selected) {
              if (pickerOpen === 'from') {
                onFromChange(selected > to ? to : selected);
              } else {
                onToChange(selected < from ? from : selected);
              }
            }
            setPickerOpen(null);
          }}
        />
      )}
    </>
  );
}

// ── Summary strip ─────────────────────────────────────────────────────────────
function SummaryStrip({ summary }: { summary: StudentAttendanceHistoryResponse['summary'] }) {
  const pct = summary.attendance_percentage;
  const pctColor = pct >= 75 ? GREEN : pct >= 50 ? AMBER : RED;

  return (
    <View style={styles.summaryStrip}>
      <View style={[styles.summaryChip, { backgroundColor: '#EAF7F1' }]}>
        <Text style={[styles.summaryNum, { color: GREEN }]}>{summary.present_count}</Text>
        <Text style={[styles.summaryLabel, { color: GREEN }]}>Present</Text>
      </View>
      <View style={[styles.summaryChip, { backgroundColor: '#FEEDEB' }]}>
        <Text style={[styles.summaryNum, { color: RED }]}>{summary.absent_count}</Text>
        <Text style={[styles.summaryLabel, { color: RED }]}>Absent</Text>
      </View>
      <View style={[styles.summaryChip, { backgroundColor: pctColor + '18' }]}>
        <Text style={[styles.summaryNum, { color: pctColor }]}>{pct.toFixed(1)}%</Text>
        <Text style={[styles.summaryLabel, { color: pctColor }]}>Attendance</Text>
      </View>
    </View>
  );
}

// ── Attendance record row ─────────────────────────────────────────────────────
function RecordRow({ record, last }: { record: StudentAttendanceRecord; last: boolean }) {
  const m = getStatusMeta(record.status);
  return (
    <>
      <View style={styles.recordRow}>
        <View style={[styles.recordStatusBar, { backgroundColor: m.color }]} />
        <View style={styles.recordMain}>
          <View style={styles.recordTopRow}>
            <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
            <StatusPill status={record.status} />
          </View>
          <View style={styles.recordMeta}>
            <View style={styles.recordMetaChip}>
              <Ionicons
                name={record.slot === 'MORNING' ? 'sunny-outline' : 'moon-outline'}
                size={12} color={MUTED}
              />
              <Text style={styles.recordMetaText}>
                {record.slot === 'MORNING' ? 'Morning' : 'Afternoon'}
              </Text>
            </View>
            <Text style={styles.recordTime}>✓ {formatTime(record.confirmed_at)}</Text>
          </View>
        </View>
      </View>
      {!last && <View style={styles.recordDivider} />}
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TeacherStudentDetailScreen() {
  const params    = useLocalSearchParams();
  const studentId = getParam(params.studentId);
  const initName  = getParam(params.studentName);   // pre-fill while loading

  // Date range — default: last 30 days
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate,   setToDate  ] = useState(new Date());

  // Student detail (today's snapshot)
  const [detail,        setDetail       ] = useState<StudentDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError,   setDetailError  ] = useState('');

  // History
  const [history,        setHistory       ] = useState<StudentAttendanceHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError,   setHistoryError  ] = useState('');
  const [refreshing,     setRefreshing    ] = useState(false);

  // Load student details once
  const loadDetail = useCallback(async () => {
    if (!studentId) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const res = await teacherAttendanceApi.getStudentDetail(studentId);
      setDetail(res);
    } catch (e: any) {
      setDetailError(e?.details ?? 'Failed to load student details.');
    } finally {
      setDetailLoading(false);
    }
  }, [studentId]);

  // Load attendance history whenever date range changes
  const loadHistory = useCallback(async (isRefresh = false) => {
    if (!studentId) return;
    if (!isRefresh) setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await teacherAttendanceApi.getStudentAttendanceHistory(studentId, {
        date_from: toDateStr(fromDate),
        date_to:   toDateStr(toDate),
      });
      setHistory(res);
    } catch (e: any) {
      setHistoryError(e?.details ?? 'Failed to load attendance history.');
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, [studentId, fromDate, toDate]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const student = detail?.student;
  const name    = student?.name ?? initName ?? 'Student';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* ── Fixed header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/teacher' as any)} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
          {student && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {student.academic_class.name} · Section {student.section.name}
            </Text>
          )}
        </View>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadHistory(true); }}
            tintColor={ACCENT} colors={[ACCENT]}
          />
        }
      >
        {/* ─ Student info card ─ */}
        {detailLoading ? (
          <View style={styles.infoCardSkeleton}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : detailError ? (
          <View style={[styles.card, styles.errorInline]}>
            <Ionicons name="alert-circle-outline" size={18} color={RED} />
            <Text style={styles.errorInlineText}>{detailError}</Text>
            <Pressable onPress={loadDetail}>
              <Text style={styles.errorInlineRetry}>Retry</Text>
            </Pressable>
          </View>
        ) : student ? (
          <View style={styles.infoCard}>
            {/* Avatar + name */}
            <View style={styles.infoTop}>
              <View style={styles.infoAvatar}>
                <Text style={styles.infoAvatarText}>
                  {student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoTitleWrap}>
                <Text style={styles.infoName}>{student.name}</Text>
                <Text style={styles.infoClass}>
                  {student.academic_class.name} · Section {student.section.name}
                </Text>
              </View>
              {/* Today's status */}
              <StatusPill status={detail!.attendance.status} />
            </View>

            {/* Badges row */}
            <View style={styles.infoBadges}>
              {!!student.roll_number && (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeLabel}>Roll</Text>
                  <Text style={styles.infoBadgeValue}>{student.roll_number}</Text>
                </View>
              )}
              {!!student.admission_number && (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeLabel}>Admission</Text>
                  <Text style={styles.infoBadgeValue}>{student.admission_number}</Text>
                </View>
              )}
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeLabel}>Today</Text>
                <Text style={[styles.infoBadgeValue, { color: getStatusMeta(detail!.attendance.status).color }]}>
                  {getStatusMeta(detail!.attendance.status).label}
                </Text>
              </View>
            </View>

            {/* Today's slot records */}
            {detail!.attendance.records.length > 0 && (
              <View style={styles.todaySlots}>
                {detail!.attendance.records.map((r, i) => (
                  <View key={i} style={styles.todaySlot}>
                    <Ionicons
                      name={r.slot === 'MORNING' ? 'sunny-outline' : 'moon-outline'}
                      size={13} color={MUTED}
                    />
                    <Text style={styles.todaySlotText}>
                      {r.slot === 'MORNING' ? 'Morning' : 'Afternoon'}
                    </Text>
                    <StatusPill status={r.status} />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* ─ Attendance history ─ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
        </View>

        {/* Date range filter */}
        <View style={styles.card}>
          <DateRangeRow
            from={fromDate} to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
        </View>

        {/* Summary */}
        {!historyLoading && !historyError && history && (
          <SummaryStrip summary={history.summary} />
        )}

        {/* Records */}
        {historyLoading && (
          <View style={[styles.card, styles.centeredCard]}>
            <ActivityIndicator color={ACCENT} />
            <Text style={styles.stateText}>Loading attendance records…</Text>
          </View>
        )}

        {!historyLoading && !!historyError && (
          <View style={[styles.card, styles.centeredCard]}>
            <Ionicons name="alert-circle-outline" size={28} color={RED} />
            <Text style={styles.errorTitle}>Could not load history</Text>
            <Text style={styles.errorBody}>{historyError}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadHistory()}>
              <Ionicons name="refresh-outline" size={14} color={SURFACE} />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!historyLoading && !historyError && history?.results.length === 0 && (
          <View style={[styles.card, styles.centeredCard]}>
            <Ionicons name="calendar-outline" size={40} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptyBody}>
              No confirmed attendance between {formatShortDate(toDateStr(fromDate))} – {formatShortDate(toDateStr(toDate))}.
            </Text>
          </View>
        )}

        {!historyLoading && !historyError && history && history.results.length > 0 && (
          <View style={styles.recordsCard}>
            {history.results.map((r, i) => (
              <RecordRow key={`${r.date}-${r.slot}`} record={r} last={i === history.results.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE,
    paddingHorizontal: 14, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: LINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8',
  },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: INK },
  headerSub:   { fontSize: 13, color: MUTED, marginTop: 3 },

  // Status pill
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
  },
  statusPillText: { fontSize: 11, fontWeight: '800' },

  // Info card (blue gradient feel)
  infoCard: {
    backgroundColor: ACCENT, borderRadius: 18, padding: 18, gap: 16,
  },
  infoCardSkeleton: {
    backgroundColor: '#DDEAF8', borderRadius: 18, height: 140,
    alignItems: 'center', justifyContent: 'center',
  },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoAvatar: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  infoAvatarText:  { fontSize: 17, fontWeight: '900', color: SURFACE },
  infoTitleWrap:   { flex: 1 },
  infoName:  { fontSize: 18, fontWeight: '900', color: SURFACE },
  infoClass: { fontSize: 13, color: '#D5E7F8', marginTop: 3 },

  infoBadges: {
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12,
  },
  infoBadge: { flex: 1, alignItems: 'center', gap: 3 },
  infoBadgeLabel: { fontSize: 10, fontWeight: '700', color: '#D5E7F8', textTransform: 'uppercase' },
  infoBadgeValue: { fontSize: 14, fontWeight: '900', color: SURFACE },

  todaySlots: { gap: 8 },
  todaySlot: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10,
  },
  todaySlotText: { flex: 1, fontSize: 13, color: '#D5E7F8', fontWeight: '600' },

  // Section heading
  sectionHeader: { paddingTop: 4 },
  sectionTitle:  { fontSize: 13, fontWeight: '900', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Card
  card: {
    backgroundColor: SURFACE, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: LINE,
  },
  centeredCard: { alignItems: 'center', gap: 10, paddingVertical: 32 },

  // Date range
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F6F8FB', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: LINE,
  },
  datePickerPressed: { opacity: 0.75 },
  datePickerLabel:   { fontSize: 10, color: MUTED, fontWeight: '700', textTransform: 'uppercase' },
  datePickerValue:   { fontSize: 13, color: INK, fontWeight: '800', marginTop: 2 },
  dateRangeSep: { alignItems: 'center', justifyContent: 'center' },

  // Summary strip
  summaryStrip: { flexDirection: 'row', gap: 10 },
  summaryChip: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 4,
  },
  summaryNum:   { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '700' },

  // Records card
  recordsCard: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: LINE, overflow: 'hidden',
  },
  recordRow: {
    flexDirection: 'row', alignItems: 'stretch',
    paddingVertical: 14,
  },
  recordStatusBar: { width: 4, borderRadius: 2, marginLeft: 12, marginRight: 14, flexShrink: 0 },
  recordMain: { flex: 1, paddingRight: 14, gap: 6 },
  recordTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  recordDate: { fontSize: 14, fontWeight: '700', color: INK, flex: 1 },
  recordMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordMetaText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  recordTime:     { fontSize: 11, color: MUTED },
  recordDivider:  { height: 1, backgroundColor: '#F4F5F7', marginLeft: 30 },

  // States
  centeredState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12, minHeight: 300,
  },
  stateText: { fontSize: 14, color: MUTED },
  errorIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#FEEDEB', alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { fontSize: 16, fontWeight: '700', color: INK, textAlign: 'center' },
  errorBody:  { fontSize: 13, color: MUTED,  textAlign: 'center', lineHeight: 19 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: INK },
  emptyBody:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 4,
  },
  retryText: { color: SURFACE, fontWeight: '700', fontSize: 13 },
  errorInline: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  errorInlineText:  { flex: 1, fontSize: 13, color: RED },
  errorInlineRetry: { fontSize: 13, color: ACCENT, fontWeight: '700' },
});
