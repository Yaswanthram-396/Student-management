import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, Alert, StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, BottomSheet } from '../shared';
import { principalApi } from '../../services/principal';
import type { CalendarEventResponse } from '../../types/principal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - spacing.lg * 2) / 7;
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalEvent {
  id: string;
  bar: string;
  title: string;
  date: string;
  description: string;
  audience: string;
  audienceBg: string;
  audienceText: string;
  eventType: 'HOLIDAY' | 'EXAM' | 'EVENT';
  startDate: string;
  endDate: string;
  visibleTo: ('TEACHER' | 'STUDENT' | 'PARENT')[];
}

type VisibleRole = 'TEACHER' | 'STUDENT' | 'PARENT';

const PRINCIPAL_ACCENT = colors.principal;

const NOW = new Date();
const TODAY_DATE  = NOW.getDate();
const TODAY_MONTH = NOW.getMonth();
const TODAY_YEAR  = NOW.getFullYear();

function getMonthInfo(offsetFromToday: number) {
  const d = new Date(TODAY_YEAR, TODAY_MONTH + offsetFromToday, 1);
  return {
    year:     d.getFullYear(),
    month:    d.getMonth(),
    days:     new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    firstDay: d.getDay(),
    name:     d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

const COLOR_OPTIONS = [
  { label: 'Purple', value: PRINCIPAL_ACCENT },
  { label: 'Amber', value: colors.warning },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Red', value: colors.danger },
];

const AUDIENCE_CFG: Record<'ALL' | 'PARTIAL' | 'EMPTY', { bg: string; text: string }> = {
  ALL: { bg: '#EDEDFA', text: PRINCIPAL_ACCENT },
  PARTIAL: { bg: '#DBEAFE', text: colors.teacher },
  EMPTY: { bg: colors.dangerBg, text: colors.danger },
};

const EVENT_TYPE_OPTIONS: ('HOLIDAY' | 'EXAM' | 'EVENT')[] = ['HOLIDAY', 'EXAM', 'EVENT'];
const VISIBLE_TO_OPTIONS: VisibleRole[] = ['TEACHER', 'STUDENT', 'PARENT'];

function getAudienceFromVisibleTo(visibleTo: VisibleRole[]) {
  if (visibleTo.length === 3) return 'All';
  if (visibleTo.length === 0) return 'No audience';
  return visibleTo
    .map((role) => role.charAt(0) + role.slice(1).toLowerCase())
    .join(' + ');
}

function mapApiEvent(e: CalendarEventResponse): CalEvent {
  const audience = getAudienceFromVisibleTo(e.visible_to);
  const ac = e.visible_to.length === 3
    ? AUDIENCE_CFG.ALL
    : e.visible_to.length === 0
      ? AUDIENCE_CFG.EMPTY
      : AUDIENCE_CFG.PARTIAL;
  const d = new Date(e.start_date);
  return {
    id: String(e.id),
    bar: PRINCIPAL_ACCENT,
    title: e.title,
    date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    description: e.description ?? '',
    audience,
    audienceBg: ac.bg,
    audienceText: ac.text,
    eventType: e.event_type,
    startDate: e.start_date,
    endDate: e.end_date,
    visibleTo: e.visible_to,
  };
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarScreen() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [evtName, setEvtName] = useState('');
  const [evtDescription, setEvtDescription] = useState('');
  const [evtType, setEvtType] = useState<'HOLIDAY' | 'EXAM' | 'EVENT'>('EVENT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibleTo, setVisibleTo] = useState<VisibleRole[]>(['TEACHER', 'STUDENT', 'PARENT']);
  const [barColor, setBarColor] = useState<string>(PRINCIPAL_ACCENT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(NOW);
  const selectedDateRef = useRef<Date>(NOW);

  const mon = getMonthInfo(monthIdx);
  const selectedDateLabel = selectedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const calDays: (number | null)[] = Array(mon.firstDay).fill(null);
  for (let d = 1; d <= mon.days; d++) calDays.push(d);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  function resetForm() {
    const today = new Date().toISOString().split('T')[0];
    setSelectedEvent(null);
    setEvtName('');
    setEvtDescription('');
    setEvtType('EVENT');
    setStartDate(today);
    setEndDate(today);
    setVisibleTo(['TEACHER', 'STUDENT', 'PARENT']);
    setBarColor(PRINCIPAL_ACCENT);
  }

  function openCreateSheet() {
    resetForm();
    setShowSheet(true);
  }

  function openEditSheet(event: CalEvent) {
    setSelectedEvent(event);
    setEvtName(event.title);
    setEvtDescription(event.description);
    setEvtType(event.eventType);
    setStartDate(event.startDate);
    setEndDate(event.endDate);
    setVisibleTo(event.visibleTo);
    setBarColor(event.bar);
    setShowSheet(true);
  }

  function toggleVisibleRole(role: VisibleRole) {
    setVisibleTo((current) => (
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    ));
  }

  // ── Load events for the selected date ─────────────────────────────────────
  const loadEvents = useCallback(async (
    targetDate: Date,
    preferBackendToday = false,
  ) => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const targetIso = toIsoDate(targetDate);
      const data = await principalApi.getCalendarEvents({
        start_date: targetIso,
        end_date: targetIso,
      });
      setEvents(data.results.map(mapApiEvent));
      if (preferBackendToday && data.today) {
        const backendToday = new Date(`${data.today}T00:00:00`);
        if (!isSameDate(backendToday, targetDate)) {
          setSelectedDate(backendToday);
          setMonthIdx(
            (backendToday.getFullYear() - TODAY_YEAR) * 12 +
            (backendToday.getMonth() - TODAY_MONTH),
          );
          void loadEvents(backendToday, false);
        }
      }
    } catch (err: any) {
      setEventsError(err.details ?? 'Failed to load calendar events.');
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEvents(selectedDateRef.current, true);
    }, [loadEvents]),
  );

  function selectDate(nextDate: Date) {
    setSelectedDate(nextDate);
    void loadEvents(nextDate);
  }

  function handleMonthChange(direction: -1 | 1) {
    setMonthIdx((currentIdx) => {
      const nextIdx = Math.max(0, Math.min(11, currentIdx + direction));
      const nextMonth = getMonthInfo(nextIdx);
      const nextDay = Math.min(selectedDate.getDate(), nextMonth.days);
      const nextDate = new Date(nextMonth.year, nextMonth.month, nextDay);
      setSelectedDate(nextDate);
      void loadEvents(nextDate);
      return nextIdx;
    });
  }

  async function handleSaveEvent() {
    if (!evtName.trim()) {
      Alert.alert('Missing title', 'Event name is required.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Missing dates', 'Start date and end date are required.');
      return;
    }
    if (new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime()) {
      Alert.alert('Invalid dates', 'End date must be on or after the start date.');
      return;
    }
    if (visibleTo.length === 0) {
      Alert.alert('Missing audience', 'Choose at least one role who can see this event.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: evtName.trim(),
        event_type: evtType,
        start_date: startDate,
        end_date: endDate,
        description: evtDescription.trim() || undefined,
        visible_to: visibleTo,
      };
      if (selectedEvent) {
        await principalApi.updateCalendarEvent(selectedEvent.id, payload);
      } else {
        await principalApi.createCalendarEvent(payload);
      }
      await loadEvents(selectedDate);
      setShowSheet(false);
      resetForm();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.details ?? `Failed to ${selectedEvent ? 'update' : 'add'} event.`,
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteEvent() {
    if (!selectedEvent) return;
    Alert.alert(
      'Delete Event',
      `Delete "${selectedEvent.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await principalApi.deleteCalendarEvent(selectedEvent.id);
              await loadEvents(selectedDate);
              setShowSheet(false);
              resetForm();
            } catch (err: any) {
              Alert.alert('Error', err.details ?? 'Failed to delete event.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  const CalHeader = (
    <View style={styles.calHeader}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <Pressable
          style={[styles.navBtn, monthIdx === 0 && styles.navBtnDisabled]}
          onPress={() => handleMonthChange(-1)}
        >
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{mon.name}</Text>
        <Pressable
          style={[styles.navBtn, monthIdx === 11 && styles.navBtnDisabled]}
          onPress={() => handleMonthChange(1)}
        >
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* Week day labels */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <View key={i} style={[styles.dayCell, { width: CELL_SIZE }]}>
            <Text style={styles.weekDayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {calDays.map((d, i) => {
          const cellDate = d !== null ? new Date(mon.year, mon.month, d) : null;
          const isToday =
            cellDate !== null &&
            cellDate.getDate() === TODAY_DATE &&
            cellDate.getMonth() === TODAY_MONTH &&
            cellDate.getFullYear() === TODAY_YEAR;
          const isSelected = cellDate !== null && isSameDate(cellDate, selectedDate);
          return (
            <Pressable
              key={i}
              style={[styles.dayCell, { width: CELL_SIZE }]}
              disabled={!cellDate}
              onPress={() => cellDate && selectDate(cellDate)}
            >
              {d !== null && (
                <View
                  style={[
                    styles.dayCircle,
                    isToday && styles.todayCircle,
                    isSelected && styles.selectedDayCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      isToday && styles.todayNum,
                      isSelected && styles.selectedDayNum,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Events On {selectedDateLabel}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Academic Calendar</Text>}
        right={
          <Pressable onPress={openCreateSheet}>
            <Ionicons name="add-circle-outline" size={24} color={colors.principal} />
          </Pressable>
        }
      />

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <>
            {CalHeader}
            {loadingEvents && (
              <View style={styles.stateCard}>
                <ActivityIndicator size="small" color={colors.principal} />
                <Text style={styles.stateText}>Loading events...</Text>
              </View>
            )}
            {!!eventsError && !loadingEvents && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{eventsError}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => void loadEvents(selectedDate)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {!loadingEvents && !eventsError && events.length === 0 && (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>
                  No events found for {selectedDateLabel}.
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.eventCard} onPress={() => openEditSheet(item)}>
            <View style={[styles.eventAccent, { backgroundColor: item.bar }]} />
            <View style={styles.eventBody}>
              <View>
                <Text style={styles.eventName}>{item.title}</Text>
                <Text style={styles.eventDate}>{item.date}</Text>
              </View>
              <View style={[styles.audiencePill, { backgroundColor: item.audienceBg }]}>
                <Text style={[styles.audienceText, { color: item.audienceText }]}>
                  {item.audience}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <BottomSheet
        visible={showSheet}
        onClose={() => {
          if (saving || deleting) return;
          setShowSheet(false);
          resetForm();
        }}
      >
        <Text style={styles.sheetTitle}>
          {selectedEvent ? 'Edit Event' : 'Add Event'}
        </Text>

        <Text style={styles.fieldLabel}>Event Name</Text>
        <TextInput
          style={styles.textInput}
          value={evtName}
          onChangeText={setEvtName}
          placeholder="Enter event name..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Event Type</Text>
        <View style={styles.optionRow}>
          {EVENT_TYPE_OPTIONS.map(opt => (
            <Pressable
              key={opt}
              style={[styles.optionPill, evtType === opt && styles.optionPillActive]}
              onPress={() => setEvtType(opt)}
            >
              <Text style={[styles.optionText, evtType === opt && styles.optionTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Start Date</Text>
        <TextInput
          style={styles.textInput}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>End Date</Text>
        <TextInput
          style={styles.textInput}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          value={evtDescription}
          onChangeText={setEvtDescription}
          placeholder="Add a description..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Visible To</Text>
        <View style={styles.optionRow}>
          {VISIBLE_TO_OPTIONS.map(opt => (
            <Pressable
              key={opt}
              style={[styles.optionPill, visibleTo.includes(opt) && styles.optionPillActive]}
              onPress={() => toggleVisibleRole(opt)}
            >
              <Text style={[styles.optionText, visibleTo.includes(opt) && styles.optionTextActive]}>
                {opt.charAt(0) + opt.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helperText}>
          Select one or more roles. The backend accepts Teacher, Student, and Parent in any combination.
        </Text>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map(c => (
            <Pressable
              key={c.value}
              style={[
                styles.colorOption,
                { borderColor: barColor === c.value ? c.value : colors.border },
              ]}
              onPress={() => setBarColor(c.value)}
            >
              <View style={[styles.colorDot, { backgroundColor: c.value }]} />
              <Text style={[
                styles.colorLabel,
                { color: barColor === c.value ? c.value : colors.textSecondary },
              ]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sheetBtns}>
          {selectedEvent ? (
            <Pressable
              style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
              onPress={handleDeleteEvent}
              disabled={saving || deleting}
            >
              <Text style={styles.deleteBtnText}>
                {deleting ? 'Deleting...' : 'Delete Event'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setShowSheet(false);
                resetForm();
              }}
              disabled={saving || deleting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.addBtn, saving && styles.addBtnAdding]}
            onPress={handleSaveEvent}
            disabled={saving || deleting}
          >
            <Text style={styles.addBtnText}>
              {saving
                ? selectedEvent
                  ? 'Saving...'
                  : 'Adding...'
                : selectedEvent
                  ? 'Save Changes'
                  : 'Add Event'}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { paddingBottom: spacing.lg },
  // Calendar header
  calHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.lg,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 0.5, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  navArrow: { fontSize: 20, color: colors.textMuted, lineHeight: 24 },
  monthLabel: { ...(typography.h3 as object), fontWeight: '600', color: colors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDayLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textMuted, textAlign: 'center',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  dayCell: { alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: colors.principal },
  selectedDayCircle: {
    backgroundColor: colors.principal,
    borderWidth: 2,
    borderColor: colors.principal,
  },
  dayNum: { ...(typography.caption as object), color: colors.textPrimary },
  todayNum: { color: colors.surface, fontWeight: '600' },
  selectedDayNum: { color: colors.surface, fontWeight: '600' },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted, marginBottom: spacing.sm },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  stateText: { ...(typography.caption as object), color: colors.textMuted },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
  },
  errorText: { flex: 1, ...(typography.caption as object), color: colors.danger },
  retryBtn: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  retryText: { ...(typography.caption as object), fontWeight: '700', color: colors.danger },
  // Event card
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  eventAccent: { width: 3 },
  eventBody: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  eventName: { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  eventDate: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
  audiencePill: { borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  audienceText: { ...(typography.label as object) },
  // Sheet
  sheetTitle: { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  textInputMultiline: { minHeight: 88 },
  optionRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  optionPill: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: 999, backgroundColor: colors.background,
    borderWidth: 0.5, borderColor: colors.border,
  },
  optionPillActive: { backgroundColor: colors.principal, borderColor: colors.principal },
  optionText: { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  optionTextActive: { color: colors.surface },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  colorOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  colorLabel: { ...(typography.caption as object) },
  helperText: { ...(typography.caption as object), color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: { opacity: 0.7 },
  deleteBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.danger },
  addBtn: { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  addBtnAdding: { backgroundColor: colors.success },
  addBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
