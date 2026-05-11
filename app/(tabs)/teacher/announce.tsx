import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  teacherAnnouncementsApi,
  type Announcement,
} from "../../../services/teacher-announcements";
import { useTeacherStore } from "../../../store/teacher-store";

const ACCENT = "#185FA5";

const AUDIENCE_COLORS: Record<string, string> = {
  SCHOOL: "#534AB7",
  CLASS: "#1D9E75",
  SECTION: "#185FA5",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnounceScreen() {
  const { selectedSection } = useTeacherStore();
  const isClassTeacher = selectedSection?.is_class_teacher ?? false;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function fetchAnnouncements(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setFetchError("");
    try {
      const data = await teacherAnnouncementsApi.getAll();
      setAnnouncements(data.results);
    } catch (err: any) {
      setFetchError(err.details ?? "Failed to load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, []),
  );

  function openModal() {
    setTitle("");
    setBody("");
    setFormError("");
    setModalVisible(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalVisible(false);
  }

  async function handlePost() {
    if (!selectedSection) return;
    const t = title.trim();
    const b = body.trim();
    if (!t) {
      setFormError("Title is required.");
      return;
    }
    if (!b) {
      setFormError("Message is required.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      const created = await teacherAnnouncementsApi.create({
        section_id: selectedSection.id,
        title: t,
        body: b,
        publish_now: true,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setModalVisible(false);
    } catch (err: any) {
      setFormError(
        err.details ?? "Failed to post announcement. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Announcements</Text>
          {selectedSection && (
            <Text style={styles.headerSub}>
              {selectedSection.class_name} – {selectedSection.section_name}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {!loading && (
            <Text style={styles.headerCount}>{announcements.length} total</Text>
          )}
          {isClassTeacher && (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.addBtnPressed,
              ]}
              onPress={openModal}
              hitSlop={6}
            >
              <Ionicons name="add" size={20} color={ACCENT} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Not a class teacher banner */}
      {!isClassTeacher && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={15} color="#D97706" />
          <Text style={styles.lockedText}>
            Only the class teacher can post announcements for this section.
          </Text>
        </View>
      )}

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAnnouncements(true);
            }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading announcements…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!fetchError && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => fetchAnnouncements()}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty */}
        {!loading && !fetchError && announcements.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="megaphone-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            {isClassTeacher && (
              <Text style={styles.emptyHint}>
                Tap the + icon above to post your first announcement.
              </Text>
            )}
          </View>
        )}

        {/* Cards */}
        {!loading &&
          !fetchError &&
          announcements.map((item) => {
            const accentColor = AUDIENCE_COLORS[item.audience] ?? ACCENT;
            return (
              <View key={item.id} style={styles.card}>
                <View
                  style={[styles.cardStripe, { backgroundColor: accentColor }]}
                />
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.audienceBadge,
                        { backgroundColor: accentColor + "18" },
                      ]}
                    >
                      <Text
                        style={[styles.audienceText, { color: accentColor }]}
                      >
                        {item.audience}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: item.published_at
                            ? "#1D9E75"
                            : "#D97706",
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={3}>
                    {item.body}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Ionicons name="person-outline" size={11} color="#AAAAAA" />
                    <Text style={styles.cardMeta}>
                      {item.author_role
                        ? item.author_role.charAt(0) +
                          item.author_role.slice(1).toLowerCase()
                        : "Teacher"}
                      {item.published_at
                        ? ` · ${formatDate(item.published_at)}`
                        : " · Draft"}
                    </Text>
                  </View>

                  {item.attachments.length > 0 && (
                    <View style={styles.attachRow}>
                      <Ionicons
                        name="attach-outline"
                        size={13}
                        color="#888888"
                      />
                      <Text style={styles.attachText}>
                        {item.attachments.length} attachment
                        {item.attachments.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
      </ScrollView>

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Announcement</Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Ionicons name="close" size={22} color="#666666" />
              </Pressable>
            </View>
            <Text style={styles.sheetSub}>
              {selectedSection?.class_name} – {selectedSection?.section_name}
            </Text>

            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setFormError("");
                }}
                placeholder="e.g. Parent-Teacher Meeting"
                placeholderTextColor="#AAAAAA"
                returnKeyType="next"
                maxLength={255}
              />

              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={body}
                onChangeText={(v) => {
                  setBody(v);
                  setFormError("");
                }}
                placeholder="Write your announcement here…"
                placeholderTextColor="#AAAAAA"
                multiline
                textAlignVertical="top"
              />

              {!!formError && (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color="#DC2626"
                  />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  submitting && styles.submitBtnDisabled,
                ]}
                onPress={handlePost}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="megaphone-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitBtnText}>Post Announcement</Text>
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
  safe: { flex: 1, backgroundColor: "#F4F4F8" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
  headerSub: { fontSize: 12, color: "#AAAAAA", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCount: { fontSize: 12, color: "#AAAAAA" },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EBF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: { opacity: 0.7 },

  lockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lockedText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  centered: { alignItems: "center", paddingVertical: 60, gap: 10 },
  loadingText: { fontSize: 14, color: "#888888" },

  errorCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: { fontSize: 13, color: "#888888", textAlign: "center" },
  retryBtn: {
    marginTop: 4,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#444444" },
  emptyHint: {
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 20,
  },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardStripe: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  audienceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  audienceText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 5,
  },
  cardBody: {
    fontSize: 13,
    color: "#555555",
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMeta: { fontSize: 11, color: "#AAAAAA" },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  attachText: { fontSize: 11, color: "#888888" },

  // Modal
  modalWrap: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#DDDDDD",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
  sheetSub: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "500",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetScroll: { paddingHorizontal: 20 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111111",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputMulti: { minHeight: 110, paddingTop: 12 },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 32,
  },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
