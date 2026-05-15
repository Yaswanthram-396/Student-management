import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  teacherSectionsApi,
  type SectionStudentDetail,
} from '../services/teacher-sections';

const ACCENT  = '#185FA5';
const GREEN   = '#16825D';
const INK     = '#101828';
const MUTED   = '#667085';
const LINE    = '#EAECF0';
const BG      = '#F6F8FB';
const SURFACE = '#FFFFFF';

function getParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? '';
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/teacher' as any);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';
}

// ── Avatar colours cycle ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#185FA5', '#16825D', '#C76A00', '#6941C6', '#0E9384', '#C01048',
];
function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonSub} />
      </View>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.listCard}>
      {[...Array(8)].map((_, i) => (
        <React.Fragment key={i}>
          <SkeletonRow />
          {i < 7 && <View style={styles.rowDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function FailureState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.stateBox}>
      <View style={styles.stateIconWrap}>
        <Ionicons name="cloud-offline-outline" size={30} color="#DC2626" />
      </View>
      <Text style={styles.stateTitle}>Could not load students</Text>
      <Text style={styles.stateBody}>Check your connection and try again.</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh-outline" size={15} color={SURFACE} />
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

// ── Single student row ────────────────────────────────────────────────────────
function StudentRow({ student, index }: { student: SectionStudentDetail; index: number }) {
  const color = avatarColor(index);
  const initials = getInitials(student.name);

  return (
    <View style={styles.studentRow}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name}</Text>
        <View style={styles.studentMeta}>
          {!!student.roll_number && (
            <View style={styles.metaChip}>
              <Ionicons name="id-card-outline" size={11} color={MUTED} />
              <Text style={styles.metaText}>Roll {student.roll_number}</Text>
            </View>
          )}
          {!!student.admission_number && (
            <View style={styles.metaChip}>
              <Ionicons name="document-text-outline" size={11} color={MUTED} />
              <Text style={styles.metaText}>{student.admission_number}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.indexNum}>{index + 1}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TeacherStudentsScreen() {
  const params      = useLocalSearchParams();
  const sectionId   = getParam(params.sectionId);
  const sectionName = getParam(params.sectionName);
  const className   = getParam(params.className);

  const [students, setStudents] = useState<SectionStudentDetail[]>([]);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState(false);
  const [search,   setSearch  ] = useState('');

  const load = useCallback(async () => {
    if (!sectionId) { setError(true); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const res = await teacherSectionsApi.getSectionStudentDetails(sectionId);
      // Sort by roll number numerically, fallback to name
      const sorted = [...res.results].sort((a, b) => {
        const ra = parseInt(a.roll_number, 10);
        const rb = parseInt(b.roll_number, 10);
        if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
        return a.name.localeCompare(b.name);
      });
      setStudents(sorted);
    } catch (err) {
      console.error('TeacherStudents:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? students.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.roll_number.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q),
      )
    : students;

  const title    = className && sectionName ? `${className} – ${sectionName}` : sectionName || 'Students';
  const subtitle = loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSub}>{subtitle}</Text>
          </View>
        </View>

        {/* ── Search + list (keyboard-aware) ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={!loading && !error && students.length > 0 ? [0] : undefined}
        >
          {/* Sticky search bar */}
          {!loading && !error && students.length > 0 && (
            <View style={styles.searchStickyWrap}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color="#AAAAAA" />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by name, roll or admission no."
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
            </View>
          )}

          {/* States */}
          {loading && <LoadingState />}
          {!loading && error && <FailureState onRetry={load} />}

          {!loading && !error && students.length === 0 && (
            <View style={styles.stateBox}>
              <Ionicons name="people-outline" size={48} color="#CCCCCC" />
              <Text style={styles.stateTitle}>No students found</Text>
              <Text style={styles.stateBody}>No active students in this section.</Text>
            </View>
          )}

          {!loading && !error && students.length > 0 && filtered.length === 0 && (
            <View style={styles.stateBox}>
              <Ionicons name="search-outline" size={40} color="#CCCCCC" />
              <Text style={styles.stateTitle}>No results for "{search}"</Text>
              <Text style={styles.stateBody}>Try a different name, roll or admission number.</Text>
            </View>
          )}

          {/* Student list */}
          {!loading && !error && filtered.length > 0 && (
            <View style={styles.listCard}>
              {filtered.map((student, idx) => (
                <React.Fragment key={student.id}>
                  <StudentRow student={student} index={idx} />
                  {idx < filtered.length - 1 && <View style={styles.rowDivider} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: INK },
  headerSub:   { fontSize: 13, color: MUTED, marginTop: 2 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 0, paddingBottom: 24 },

  // Sticky search
  searchStickyWrap: {
    backgroundColor: BG,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: LINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: INK, paddingVertical: 0 },

  // Student list card
  listCard: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: LINE, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 72 },

  // Student row
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: SURFACE },
  studentInfo: { flex: 1, gap: 4 },
  studentName: { fontSize: 15, fontWeight: '700', color: INK, lineHeight: 20 },
  studentMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: MUTED, fontWeight: '500' },
  indexNum: { fontSize: 12, color: '#C8CDD6', fontWeight: '700', flexShrink: 0 },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAECF0' },
  skeletonInfo: { flex: 1, gap: 8 },
  skeletonName: { height: 14, width: '60%', borderRadius: 7, backgroundColor: '#EAECF0' },
  skeletonSub:  { height: 11, width: '40%', borderRadius: 6, backgroundColor: '#F2F4F7' },

  // States
  stateBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, gap: 10,
  },
  stateIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#FEEDEB', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: { fontSize: 16, fontWeight: '700', color: INK },
  stateBody:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 4,
  },
  retryText: { color: SURFACE, fontWeight: '700', fontSize: 13 },

  // Green accent used in empty states
  _green: { color: GREEN },
});
