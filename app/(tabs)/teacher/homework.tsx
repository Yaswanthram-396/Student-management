import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { teacherHomeworkApi, type Homework } from '../../../services/teacher-homework';
import { subjectsApi, type Subject } from '../../../services/subjects';
import { useTeacherStore } from '../../../store/teacher-store';

const ACCENT = '#185FA5';

const SUBJECT_COLORS = [
  { bg: '#EBF2FB', text: '#185FA5' },
  { bg: '#E1F5EE', text: '#1D9E75' },
  { bg: '#F3F0FF', text: '#534AB7' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FFE4E6', text: '#E11D48' },
  { bg: '#E0F2FE', text: '#0369A1' },
];

function subjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

type FilterTab = 'ALL' | 'UPCOMING' | 'TODAY' | 'OVERDUE';

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All', icon: 'list-outline' },
  { key: 'UPCOMING', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'TODAY', label: 'Due Today', icon: 'today-outline' },
  { key: 'OVERDUE', label: 'Overdue', icon: 'alert-circle-outline' },
];

function getDeadlineStatus(deadline: string): 'overdue' | 'today' | 'upcoming' {
  const now = new Date();
  const due = new Date(deadline);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  if (due < todayStart) return 'overdue';
  if (due < todayEnd) return 'today';
  return 'upcoming';
}

const DEADLINE_CONFIG = {
  overdue: { color: '#DC2626', bg: '#FEE2E2', label: 'Overdue' },
  today: { color: '#D97706', bg: '#FEF3C7', label: 'Due Today' },
  upcoming: { color: '#1D9E75', bg: '#E1F5EE', label: 'Upcoming' },
};

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPickerDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPickerTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Default deadline = tomorrow at 6pm
function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export default function HomeworkScreen() {
  const { selectedSection } = useTeacherStore();

  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Create sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date>(defaultDeadline);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function fetchHomework(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setFetchError('');
    try {
      const data = await teacherHomeworkApi.getAll(
        selectedSection?.id ? { section_id: selectedSection.id } : undefined,
      );
      setHomework(data.results);
    } catch (err: any) {
      setFetchError(err.details ?? 'Failed to load homework.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchHomework();
    }, [selectedSection?.id]),
  );

  async function openSheet() {
    setDescription('');
    setDeadline(defaultDeadline());
    setSelectedSubject(null);
    setFormError('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSheetVisible(true);
    if (subjects.length === 0) {
      setSubjectsLoading(true);
      try {
        const data = await subjectsApi.getAll();
        setSubjects(data.results);
      } catch {
        // non-fatal
      } finally {
        setSubjectsLoading(false);
      }
    }
  }

  function closeSheet() {
    if (submitting) return;
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSheetVisible(false);
  }

  function onDateChange(_: any, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      setDeadline((prev) => {
        const next = new Date(selected);
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  function onTimeChange(_: any, selected?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      setDeadline((prev) => {
        const next = new Date(prev);
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  async function handleCreate() {
    if (!selectedSection) return;
    if (!selectedSubject) { setFormError('Please select a subject.'); return; }
    if (!description.trim()) { setFormError('Description is required.'); return; }
    if (deadline <= new Date()) { setFormError('Deadline must be in the future.'); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const created = await teacherHomeworkApi.create({
        section_id: selectedSection.id,
        subject_id: selectedSubject.id,
        description: description.trim(),
        deadline: deadline.toISOString(),
      });
      setHomework((prev) => [created, ...prev]);
      setSheetVisible(false);
    } catch (err: any) {
      setFormError(err.details ?? 'Failed to create homework. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = homework.filter((hw) => {
    if (activeFilter === 'ALL') return true;
    const status = getDeadlineStatus(hw.deadline);
    if (activeFilter === 'OVERDUE') return status === 'overdue';
    if (activeFilter === 'TODAY') return status === 'today';
    if (activeFilter === 'UPCOMING') return status === 'upcoming';
    return true;
  });

  const counts: Record<FilterTab, number> = {
    ALL: homework.length,
    UPCOMING: homework.filter((h) => getDeadlineStatus(h.deadline) === 'upcoming').length,
    TODAY: homework.filter((h) => getDeadlineStatus(h.deadline) === 'today').length,
    OVERDUE: homework.filter((h) => getDeadlineStatus(h.deadline) === 'overdue').length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Homework</Text>
          {selectedSection && (
            <Text style={styles.headerSub}>
              {selectedSection.class_name} – {selectedSection.section_name}
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={openSheet}
        >
          <Ionicons name="add" size={22} color={ACCENT} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeFilter === tab.key && styles.tabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={13}
              color={activeFilter === tab.key ? ACCENT : '#AAAAAA'}
            />
            <Text style={[styles.tabText, activeFilter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, activeFilter === tab.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeFilter === tab.key && styles.tabBadgeTextActive]}>
                {counts[tab.key]}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchHomework(true); }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading homework…</Text>
          </View>
        )}

        {!loading && !!fetchError && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="wifi-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Could not load homework</Text>
            <Text style={styles.errorBody}>{fetchError}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchHomework()}>
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !fetchError && filtered.length === 0 && (
          <View style={styles.centered}>
            <View style={styles.emptyIcon}>
              <Ionicons name="book-outline" size={38} color="#CCCCCC" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'ALL'
                ? 'No homework assigned'
                : `No ${FILTER_TABS.find((t) => t.key === activeFilter)?.label.toLowerCase()} homework`}
            </Text>
            <Text style={styles.emptyHint}>
              {activeFilter === 'ALL'
                ? 'Tap + to assign homework to this section.'
                : 'Switch to All to see everything.'}
            </Text>
          </View>
        )}

        {!loading && !fetchError && filtered.map((hw) => {
          const status = getDeadlineStatus(hw.deadline);
          const dlCfg = DEADLINE_CONFIG[status];
          const subColor = subjectColor(hw.subject?.name ?? '');
          return (
            <View key={hw.id} style={styles.card}>
              <View style={[styles.cardStripe, { backgroundColor: subColor.text }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.subjectBadge, { backgroundColor: subColor.bg }]}>
                    <Text style={[styles.subjectText, { color: subColor.text }]}>
                      {hw.subject?.name ?? 'Unknown'}
                    </Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: dlCfg.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: dlCfg.color }]} />
                    <Text style={[styles.statusChipText, { color: dlCfg.color }]}>
                      {dlCfg.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardDescription} numberOfLines={3}>{hw.description}</Text>
                <View style={styles.cardDeadlineRow}>
                  <Ionicons name="time-outline" size={13} color={dlCfg.color} />
                  <Text style={[styles.cardDeadlineText, { color: dlCfg.color }]}>
                    {formatDeadline(hw.deadline)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Create sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeSheet} />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Assign Homework</Text>
                {selectedSection && (
                  <Text style={styles.sheetSub}>
                    {selectedSection.class_name} – {selectedSection.section_name}
                  </Text>
                )}
              </View>
              <Pressable onPress={closeSheet} hitSlop={8}>
                <Ionicons name="close" size={22} color="#666666" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Subject picker */}
              <Text style={styles.fieldLabel}>Subject</Text>
              {subjectsLoading ? (
                <View style={styles.subjectsLoading}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.subjectsLoadingText}>Loading subjects…</Text>
                </View>
              ) : subjects.length === 0 ? (
                <View style={styles.subjectsEmpty}>
                  <Text style={styles.subjectsEmptyText}>No subjects available.</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.subjectScroll}
                  contentContainerStyle={styles.subjectScrollContent}
                >
                  {subjects.map((sub) => {
                    const isSelected = selectedSubject?.id === sub.id;
                    const sc = subjectColor(sub.name);
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.subjectChip,
                          { backgroundColor: isSelected ? sc.text : sc.bg },
                        ]}
                        onPress={() => { setSelectedSubject(sub); setFormError(''); }}
                      >
                        <Text style={[styles.subjectChipText, { color: isSelected ? '#FFFFFF' : sc.text }]}>
                          {sub.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Description */}
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={(v) => { setDescription(v); setFormError(''); }}
                placeholder="Describe the homework task…"
                placeholderTextColor="#AAAAAA"
                multiline
                textAlignVertical="top"
              />

              {/* Deadline pickers */}
              <Text style={styles.fieldLabel}>Deadline</Text>
              <View style={styles.deadlineRow}>
                {/* Date button */}
                <Pressable
                  style={({ pressed }) => [styles.pickerBtn, pressed && styles.pickerBtnPressed]}
                  onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={16} color={ACCENT} />
                  <Text style={styles.pickerBtnText}>{formatPickerDate(deadline)}</Text>
                </Pressable>

                {/* Time button */}
                <Pressable
                  style={({ pressed }) => [styles.pickerBtn, pressed && styles.pickerBtnPressed]}
                  onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                >
                  <Ionicons name="time-outline" size={16} color={ACCENT} />
                  <Text style={styles.pickerBtnText}>{formatPickerTime(deadline)}</Text>
                </Pressable>
              </View>

              {/* Android: pickers shown inline on tap */}
              {showDatePicker && (
                <DateTimePicker
                  value={deadline}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={onDateChange}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={deadline}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

              {/* iOS: Done button to dismiss picker */}
              {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
                <Pressable
                  style={styles.iosDoneBtn}
                  onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
                >
                  <Text style={styles.iosDoneBtnText}>Done</Text>
                </Pressable>
              )}

              {/* Error */}
              {!!formError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={styles.errorRowText}>{formError}</Text>
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  submitting && styles.submitBtnDisabled,
                ]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Assign Homework</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: { opacity: 0.7 },

  tabScroll: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', flexGrow: 0 },
  tabContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  tabActive: { backgroundColor: '#EBF2FB' },
  tabText: { fontSize: 12, fontWeight: '500', color: '#888888' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  tabBadge: { backgroundColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#185FA520' },
  tabBadgeText: { fontSize: 10, fontWeight: '600', color: '#888888' },
  tabBadgeTextActive: { color: ACCENT },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  centered: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: 8,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#111111' },
  errorBody: { fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyHint: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subjectBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subjectText: { fontSize: 12, fontWeight: '600' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  cardDescription: { fontSize: 14, color: '#333333', lineHeight: 20, marginBottom: 12 },
  cardDeadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDeadlineText: { fontSize: 12, fontWeight: '500' },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  sheetSub: { fontSize: 12, color: ACCENT, fontWeight: '500', marginTop: 2 },
  sheetScroll: { paddingHorizontal: 20 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  subjectsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  subjectsLoadingText: { fontSize: 13, color: '#888888' },
  subjectsEmpty: { paddingVertical: 10 },
  subjectsEmptyText: { fontSize: 13, color: '#AAAAAA' },
  subjectScroll: { marginHorizontal: -20 },
  subjectScrollContent: { paddingHorizontal: 20, gap: 8 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  subjectChipText: { fontSize: 13, fontWeight: '600' },

  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
    marginBottom: 16,
  },
  inputMulti: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },

  // Date/time picker buttons
  deadlineRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF2FB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerBtnPressed: { opacity: 0.7 },
  pickerBtnText: { fontSize: 13, fontWeight: '600', color: ACCENT, flexShrink: 1 },

  iosDoneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 12,
  },
  iosDoneBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  errorRowText: { fontSize: 13, color: '#DC2626', flex: 1 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 32,
  },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
