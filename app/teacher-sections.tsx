import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut, useAuthStore } from '../store/auth-store';
import { setSelectedSection, setSections as storeSetSections } from '../store/teacher-store';
import { teacherSectionsApi, type TeacherSection } from '../services/teacher-sections';
import type { TeacherMeResponse } from '../types/auth';

const ACCENT = '#185FA5';

function getInitials(name?: string) {
  if (!name) return 'T';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function SectionsScreen() {
  const { currentUser } = useAuthStore();
  const teacher = currentUser as TeacherMeResponse | null;

  const [sections, setSections] = useState<TeacherSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [panelVisible, setPanelVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  async function fetchSections(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const data = await teacherSectionsApi.getSections();
      setSections(data.results);
      storeSetSections(data.results);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchSections(); }, []);

  function openPanel() {
    setPanelVisible(true);
    slideAnim.setValue(SCREEN_WIDTH);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }

  function closePanel(cb?: () => void) {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      setPanelVisible(false);
      cb?.();
    });
  }

  function handleSelectSection(section: TeacherSection) {
    setSelectedSection(section);
    router.replace('/(tabs)/teacher/');
  }

  async function handleLogout() {
    closePanel(async () => {
      await signOut();
      router.replace('/');
    });
  }

  function handleProfile() {
    closePanel(() => router.push('/teacher-profile'));
  }

  const initials = getInitials(teacher?.profile.name);
  const picUrl = teacher?.profile_pic_url;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.schoolName} numberOfLines={1}>
              {teacher?.school.name || 'School'}
            </Text>
            <Text style={styles.headerTitle}>My Classes</Text>
          </View>

          {/* Hamburger button */}
          <Pressable
            style={({ pressed }) => [styles.hamburger, pressed && styles.hamburgerPressed]}
            onPress={openPanel}
            hitSlop={8}
          >
            <Ionicons name="menu" size={26} color="#111111" />
          </Pressable>
        </View>

        <Text style={styles.teacherName}>{teacher?.profile.name ?? ''}</Text>
        {teacher?.profile.primary_subject && (
          <View style={styles.subjectBadge}>
            <Ionicons name="book-outline" size={12} color={ACCENT} />
            <Text style={styles.subjectText}>{teacher.profile.primary_subject.name}</Text>
          </View>
        )}
      </View>

      {/* Section list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSections(true); }}
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

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading your classes…</Text>
          </View>
        )}

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

        {!loading && !error && sections.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No classes assigned</Text>
            <Text style={styles.emptyText}>
              Contact your school administrator to get assigned to a class.
            </Text>
          </View>
        )}

        {!loading && !error && sections.map((section) => (
          <Pressable
            key={section.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
                    <Text style={styles.metaText}>{section.student_count} students</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  {section.is_class_teacher && (
                    <View style={styles.ctBadge}>
                      <Ionicons name="star" size={10} color={ACCENT} />
                      <Text style={styles.ctBadgeText}>Class Teacher</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" style={styles.chevron} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Full-screen panel — slides in from right */}
      <Modal visible={panelVisible} animationType="none" transparent onRequestClose={() => closePanel()}>
        <Animated.View style={[styles.panelOverlay, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.panelSafe} edges={['top', 'bottom']}>
          {/* Panel header */}
          <View style={styles.panelHeader}>
            <Pressable
              style={({ pressed }) => [styles.panelBackBtn, pressed && styles.panelBackBtnPressed]}
              onPress={() => closePanel()}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={22} color="#111111" />
            </Pressable>
            <Text style={styles.panelHeaderTitle}>Menu</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelScroll}>
            {/* User card */}
            <View style={styles.panelUserCard}>
              <Pressable
                style={({ pressed }) => [styles.panelAvatar, pressed && picUrl && { opacity: 0.85 }]}
                onPress={() => picUrl && setImageVisible(true)}
                disabled={!picUrl}
              >
                {picUrl ? (
                  <Image source={{ uri: picUrl }} style={styles.panelAvatarImage} />
                ) : (
                  <Text style={styles.panelAvatarText}>{initials}</Text>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelName} numberOfLines={1}>
                  {teacher?.profile.name ?? 'Teacher'}
                </Text>
                <Text style={styles.panelRole}>{teacher?.school.name || 'Teacher'}</Text>
              </View>
              <View style={styles.panelRoleBadge}>
                <Text style={styles.panelRoleBadgeText}>Teacher</Text>
              </View>
            </View>

            {/* Menu items */}
            <View style={styles.panelSection}>
              <Pressable
                style={({ pressed }) => [styles.panelItem, pressed && styles.panelItemPressed]}
                onPress={handleProfile}
              >
                <View style={[styles.panelIcon, { backgroundColor: '#EBF2FB' }]}>
                  <Ionicons name="person-outline" size={18} color={ACCENT} />
                </View>
                <Text style={styles.panelItemText}>My Profile</Text>
                <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
              </Pressable>

              <View style={styles.panelDivider} />

              <Pressable
                style={({ pressed }) => [styles.panelItem, pressed && styles.panelItemPressed]}
                onPress={() => closePanel(() => router.push('/teacher-settings'))}
              >
                <View style={[styles.panelIcon, { backgroundColor: '#F3F0FF' }]}>
                  <Ionicons name="settings-outline" size={18} color="#534AB7" />
                </View>
                <Text style={styles.panelItemText}>Settings</Text>
                <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
              </Pressable>
            </View>

            <View style={styles.panelSection}>
              <Pressable
                style={({ pressed }) => [styles.panelItem, pressed && styles.panelItemPressed]}
                onPress={handleLogout}
              >
                <View style={[styles.panelIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                </View>
                <Text style={[styles.panelItemText, { color: '#DC2626' }]}>Logout</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
        </Animated.View>
      </Modal>

      {/* Profile picture lightbox */}
      {picUrl && (
        <Modal
          visible={imageVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageVisible(false)}
          statusBarTranslucent
        >
          <Pressable style={styles.lightboxBackdrop} onPress={() => setImageVisible(false)}>
            <Image
              source={{ uri: picUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
            <Pressable
              style={styles.lightboxClose}
              onPress={() => setImageVisible(false)}
              hitSlop={12}
            >
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111111', letterSpacing: -0.5 },
  hamburger: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerPressed: { backgroundColor: '#F0F0F0' },
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

  centered: { alignItems: 'center', paddingVertical: 56, gap: 10, paddingHorizontal: 24 },
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
  errorText: { fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyText: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20 },

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
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  classCode: { fontSize: 18, fontWeight: '700', color: '#111111', marginBottom: 6 },
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

  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: 0,
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 20,
  },

  // Full-screen panel
  panelOverlay: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },
  panelSafe: { flex: 1 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  panelHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111111' },
  panelBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelBackBtnPressed: { backgroundColor: '#F0F0F0' },
  panelScroll: { padding: 16, gap: 12 },
  panelUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  panelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  panelAvatarImage: { width: 48, height: 48, borderRadius: 24 },
  panelAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  panelName: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 2 },
  panelRole: { fontSize: 12, color: '#888888' },
  panelRoleBadge: {
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  panelRoleBadgeText: { fontSize: 11, fontWeight: '600', color: ACCENT },
  panelSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  panelDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 60 },
  panelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  panelItemPressed: { backgroundColor: '#F8F8F8' },
  panelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#222222' },
});
