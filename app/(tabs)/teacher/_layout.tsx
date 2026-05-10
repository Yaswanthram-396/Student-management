import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { SectionPickerBar } from "../../../components/teacher-dashboard/SectionPickerBar";
import { useTeacherStore } from "../../../store/teacher-store";

const ACCENT = "#185FA5";

export default function TeacherLayout() {
  const { selectedSection } = useTeacherStore();
  const showAttendance = !selectedSection || selectedSection.is_class_teacher;

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F4F8" }}>
      <SectionPickerBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: "#AAAAAA",
          tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
          tabBarStyle: {
            height: 56,
            borderTopWidth: 0.5,
            borderTopColor: "#EEEEEE",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="checkmark-circle-outline"
                size={size}
                color={color}
              />
            ),
            // Only class teachers can mark attendance
            tabBarButton: showAttendance ? undefined : () => null,
          }}
        />
        <Tabs.Screen
          name="homework"
          options={{
            title: "Homework",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="content"
          options={{
            title: "Materials",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="announce"
          options={{
            title: "Announce",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="megaphone-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="queries"
          options={{
            title: "Queries",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
