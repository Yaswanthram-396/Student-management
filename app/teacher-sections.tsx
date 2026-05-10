import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth-store';
import { setSelectedSection } from '../store/teacher-store';
import { teacherSectionsApi, type TeacherSection } from '../services/teacher-sections';
import type { TeacherMeResponse } from '../types/auth';

const ACCENT = '#185FA5';

export default function SectionsScreen() {
  const { currentUser } = useAuthStore();
  const teacher = currentUser as TeacherMeResponse | null;

  const [sections, setSections] = useState<TeacherSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function fetchSections(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const data = await teacherSectionsApi.getSections();
      setSections(data.results);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSections();
  }, []);

  function handleSelectSection(section: TeacherSection) {
    setSelectedSection(section);
    router.replace('/(tabs)/teacher/');
  }

  const initials =
    teacher?.profile.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() ?? 'T';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.schoolName} numberOfLines={1}>
              {teacher?.school.name ?? 'School'}
            </Text>
            <Text style={styles.headerTitle}>My Classes</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <Text style={styles.teacherName}>{teacher?.profile.name ?? ''}</Text>

        {teacher?.profile.primary_subject && (
          <View style={styles.subjectBadge}>
            <Ionicons name="book-outline" size={12} color={ACCENT} />
            <Text style={styles.subjectText}>
              {teacher.profile.primary_subject.name}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSections(true);
            }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {!loading && !error && sections.length > 0 && (
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {sections.length} class{sections.length > 1 ? 'es' : ''} assigned
            </Text>
            <Text style={styles.listHint}>Tap a class to continue</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading your classes…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchSections()}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty */}
        {!loading && !error && sections.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No classes assigned</Text>
            <Text style={styles.emptyText}>
              Contact your school administrator to get assigned to a class.
            </Text>
          </View>
        )}

        {/* Section cards */}
        {!loading &&
          !error &&
          sections.map((section) => (
            <Pressable
              key={section.id}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelectSection(section)}
            >
              <View style={styles.cardAccent} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.classCode}>
                      {section.class_name} – {section.section_name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="people-outline" size={13} color="#888888" />
                      <Text style={styles.metaText}>
                        {section.student_count} students
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    {section.is_class_teacher && (
                      <View style={styles.ctBadge}>
                        <Ionicons name="star" size={10} color={ACCENT} />
                        <Text style={styles.ctBadgeText}>Class Teacher</Text>
                      </View>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#CCCCCC"
                      style={styles.chevron}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerText: { flex: 1, marginRight: 12 },
  schoolName: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  teacherName: { fontSize: 14, color: '#666666', marginBottom: 8 },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF2FB',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  subjectText: { fontSize: 12, color: ACCENT, fontWeight: '500' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 36 },

  listHeader: { marginBottom: 16 },
  listTitle: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 2 },
  listHint: { fontSize: 12, color: '#AAAAAA' },

  centered: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: { fontSize: 14, color: '#888888' },
  errorCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#DC2626' },
  errorText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyText: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.82 },
  cardAccent: { width: 4, backgroundColor: ACCENT },
  cardBody: { flex: 1, padding: 16 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flex: 1 },
  classCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#888888' },
  cardRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  ctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  ctBadgeText: { fontSize: 11, color: ACCENT, fontWeight: '600' },
  chevron: { marginTop: 2 },
});
