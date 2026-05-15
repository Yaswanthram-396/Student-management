import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
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
const INK     = '#101828';
const MUTED   = '#667085';
const LINE    = '#EAECF0';
const BG      = '#F6F8FB';
const SURFACE = '#FFFFFF';

const AVATAR_COLORS = [
  '#185FA5', '#16825D', '#C76A00', '#6941C6', '#0E9384', '#C01048',
];

function getParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? '';
}
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/teacher' as any);
}
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}
function avatarColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function SkeletonRow({ last }: { last?: boolean }) {
  return (
    <>
      <View style={styles.studentRow}>
        <View style={[styles.avatar, { backgroundColor: '#EAECF0' }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 14, width: '55%', borderRadius: 7, backgroundColor: '#EAECF0' }} />
          <View style={{ height: 11, width: '38%', borderRadius: 6, backgroundColor: '#F2F4F7' }} />
        </View>
        <View style={{ width: 20, height: 14, borderRadius: 6, backgroundColor: '#F2F4F7' }} />
      </View>
      {!last && <View style={styles.divider} />}
    </>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────
function StudentRow({ student, index, last }: { student: SectionStudentDetail; index: number; last: boolean }) {
  const color    = avatarColor(index);
  const initials = getInitials(student.name);

  function onPress() {
    router.push(
      `/teacher-student-detail?studentId=${encodeURIComponent(student.id)}&studentName=${encodeURIComponent(student.name)}` as any,
    );
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.studentRow, pressed && styles.studentRowPressed]}
        onPress={onPress}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <View style={styles.badgeRow}>
            {!!student.roll_number && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Roll {student.roll_number}</Text>
              </View>
            )}
            {!!student.admission_number && (
              <View style={[styles.badge, styles.badgeGray]}>
                <Text style={[styles.badgeText, styles.badgeTextGray]}>{student.admission_number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* chevron */}
        <Ionicons name="chevron-forward" size={18} color="#C8CDD6" />
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
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

  const q        = search.trim().toLowerCase();
  const filtered = q
    ? students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q),
      )
    : students;

  const heading  = [className, sectionName].filter(Boolean).join(' – ') || 'Students';
  const countStr = loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`;

  return (
    // edges top+bottom: header sits below status bar (truly fixed) and bottom inset is respected
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Fixed header ── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={goBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{heading}</Text>
            <Text style={styles.headerSub}>{countStr}</Text>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={!loading && !error && students.length > 0 ? [0] : undefined}
        >
          {/* Sticky search (index 0) */}
          {!loading && !error && students.length > 0 && (
            <View style={styles.searchWrap}>
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

          {/* Loading */}
          {loading && (
            <View style={styles.listCard}>
              {[...Array(8)].map((_, i) => <SkeletonRow key={i} last={i === 7} />)}
            </View>
          )}

          {/* Error */}
          {!loading && error && (
            <View style={styles.stateBox}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="cloud-offline-outline" size={30} color="#DC2626" />
              </View>
              <Text style={styles.stateTitle}>Could not load students</Text>
              <Text style={styles.stateBody}>Check your connection and try again.</Text>
              <Pressable style={styles.retryBtn} onPress={load}>
                <Ionicons name="refresh-outline" size={15} color={SURFACE} />
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Empty section */}
          {!loading && !error && students.length === 0 && (
            <View style={styles.stateBox}>
              <Ionicons name="people-outline" size={52} color="#CCCCCC" />
              <Text style={styles.stateTitle}>No students found</Text>
              <Text style={styles.stateBody}>No active students in this section.</Text>
            </View>
          )}

          {/* No search match */}
          {!loading && !error && students.length > 0 && filtered.length === 0 && (
            <View style={styles.stateBox}>
              <Ionicons name="search-outline" size={44} color="#CCCCCC" />
              <Text style={styles.stateTitle}>No results for "{search}"</Text>
              <Text style={styles.stateBody}>Try a different name, roll or admission number.</Text>
            </View>
          )}

          {/* Student list */}
          {!loading && !error && filtered.length > 0 && (
            <View style={styles.listCard}>
              {filtered.map((student, idx) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  index={idx}
                  last={idx === filtered.length - 1}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  // Fixed header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    // Shadow so it looks raised above scrolling content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F4F8',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: INK },
  headerSub:   { fontSize: 13, color: MUTED, marginTop: 3 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28 },

  // Sticky search wrapper
  searchWrap: {
    backgroundColor: BG,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1, borderColor: LINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: INK, paddingVertical: 0 },

  // List card
  listCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#F4F5F7', marginLeft: 72 },

  // Student row — generous vertical padding so nothing feels crammed
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: SURFACE },

  studentInfo: { flex: 1, gap: 6 },
  studentName: { fontSize: 15, fontWeight: '700', color: INK, lineHeight: 20 },

  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  badgeGray: { backgroundColor: '#F2F4F7' },
  badgeText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  badgeTextGray: { color: MUTED },

  studentRowPressed: { backgroundColor: '#F3F8FE' },
  rank: { fontSize: 13, color: '#C8CDD6', fontWeight: '700', flexShrink: 0 },

  // States
  stateBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 64, gap: 10,
  },
  errorIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#FEEDEB', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stateTitle: { fontSize: 16, fontWeight: '700', color: INK },
  stateBody:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 6,
  },
  retryText: { color: SURFACE, fontWeight: '700', fontSize: 13 },
});
