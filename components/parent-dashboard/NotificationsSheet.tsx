import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    notificationsApi,
    type AppNotification,
    type NotificationType,
} from "../../services/notifications";

const ACCENT = "#1D9E75";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; color: string; bg: string; label: string; route: string }
> = {
  ANNOUNCEMENT_PUBLISHED: {
    icon: "megaphone",
    color: "#534AB7",
    bg: "#F3F0FF",
    label: "Announcement",
    route: "/(tabs)/parent/(tabs)/index",
  },
  HOMEWORK_ASSIGNED: {
    icon: "book",
    color: "#185FA5",
    bg: "#EBF2FB",
    label: "Homework",
    route: "/(tabs)/parent/(tabs)/homework",
  },
  STUDY_MATERIAL_UPLOADED: {
    icon: "document-text",
    color: "#0369A1",
    bg: "#E0F2FE",
    label: "Study Material",
    route: "/(tabs)/parent/(tabs)/homework",
  },
  ATTENDANCE_ABSENT: {
    icon: "person-remove",
    color: "#DC2626",
    bg: "#FEE2E2",
    label: "Attendance",
    route: "/(tabs)/parent/(tabs)/index",
  },
  PARENT_QUERY_RECEIVED: {
    icon: "chatbubbles",
    color: "#D97706",
    bg: "#FEF3C7",
    label: "New Query",
    route: "/(tabs)/parent/(tabs)/queries",
  },
  QUERY_REPLY_RECEIVED: {
    icon: "chatbubble-ellipses",
    color: "#1D9E75",
    bg: "#E1F5EE",
    label: "Query Reply",
    route: "/(tabs)/parent/(tabs)/queries",
  },
  CALENDAR_EVENT_CREATED: {
    icon: "calendar",
    color: "#4F46E5",
    bg: "#EEF2FF",
    label: "Calendar",
    route: "/(tabs)/parent/calendar",
  },
  BULK_UPLOAD_COMPLETE: {
    icon: "checkmark-circle",
    color: "#1D9E75",
    bg: "#E1F5EE",
    label: "Upload Done",
    route: "/(tabs)/parent/(tabs)/index",
  },
};

function formatTime(iso: string) {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationsSheet({
  visible,
  onClose,
  onUnreadCountChange,
}: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError("");
    try {
      const data = await notificationsApi.getAll(true);
      setNotifications(data.results);
      onUnreadCountChange(data.unread_count);
    } catch (err: any) {
      setError(err.details ?? "Failed to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleOpen = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await notificationsApi.markRead();
      setNotifications([]);
      onUnreadCountChange(0);
    } catch {
      // silent fail
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleNotificationPress(notif: AppNotification) {
    setMarkingId(notif.id);
    try {
      await notificationsApi.markRead([notif.id]);
      const updated = notifications.filter((n) => n.id !== notif.id);
      setNotifications(updated);
      onUnreadCountChange(updated.length);
    } catch {
      // continue anyway
    } finally {
      setMarkingId(null);
    }

    onClose();
    const cfg = TYPE_CONFIG[notif.type];
    if (cfg?.route) {
      router.replace(cfg.route as any);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
            ]}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color="#111111" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {notifications.length > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {notifications.length} unread
                </Text>
              </View>
            )}
          </View>

          {notifications.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.markAllBtn,
                pressed && styles.markAllBtnPressed,
              ]}
              onPress={handleMarkAll}
              disabled={markingAll}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Ionicons name="checkmark-done" size={20} color={ACCENT} />
              )}
            </Pressable>
          )}
          {notifications.length === 0 && <View style={{ width: 36 }} />}
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
                fetchNotifications(true);
              }}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
        >
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.stateText}>Loading notifications...</Text>
            </View>
          )}

          {!loading && !!error && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={28}
                  color="#DC2626"
                />
              </View>
              <Text style={styles.errorTitle}>Couldn't load notifications</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => fetchNotifications()}
              >
                <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && notifications.length === 0 && (
            <View style={styles.centered}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="notifications-off-outline"
                  size={36}
                  color="#CCCCCC"
                />
              </View>
              <Text style={styles.stateText}>You're all caught up</Text>
              <Text style={styles.stateSubtext}>No unread notifications</Text>
            </View>
          )}

          {!loading &&
            !error &&
            notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type];
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => handleNotificationPress(notif)}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                    <Ionicons
                      name={cfg.icon as any}
                      size={18}
                      color={cfg.color}
                    />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.rowTop}>
                      <Text style={styles.title} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      <View
                        style={[styles.typePill, { backgroundColor: cfg.bg }]}
                      >
                        <Text style={[styles.typeText, { color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <View style={styles.rowBottom}>
                      <Text style={styles.time}>
                        {formatTime(notif.created_at)}
                      </Text>
                      {markingId === notif.id && (
                        <ActivityIndicator size="small" color={ACCENT} />
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: { backgroundColor: "#F3F4F6" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111111" },
  unreadBadge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#E1F5EE",
  },
  unreadBadgeText: { fontSize: 11, color: ACCENT, fontWeight: "600" },
  markAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllBtnPressed: { backgroundColor: "#F3F4F6" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { alignItems: "center", paddingVertical: 24 },
  stateText: { fontSize: 15, color: "#6B7280", marginTop: 8 },
  stateSubtext: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
    alignItems: "center",
  },
  errorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },
  errorBody: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  cardPressed: { transform: [{ scale: 0.995 }], backgroundColor: "#FAFAFA" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  body: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111111" },
  typePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 10, fontWeight: "600" },
  message: { fontSize: 12, color: "#6B7280", marginTop: 6 },
  rowBottom: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: { fontSize: 11, color: "#9CA3AF" },
});
