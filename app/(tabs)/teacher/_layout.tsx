import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router, Tabs, useSegments } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SectionPickerBar } from "../../../components/teacher-dashboard/SectionPickerBar";
import { useTeacherStore } from "../../../store/teacher-store";
import { useSchoolStore, DEFAULT_SCHOOL_CONFIG } from "../../../store/school-store";

// Routes that require the teacher to be a class teacher of the selected section
const CLASS_TEACHER_ROUTES = ["attendance", "results"];

const ACCENT = "#185FA5";

const TAB_ICONS: Record<string, { name: string; label: string }> = {
  index:      { name: "home-outline",           label: "Home"      },
  results:    { name: "bar-chart-outline",      label: "Results"   },
  attendance: { name: "checkmark-circle-outline",label: "Attendance"},
  homework:   { name: "book-outline",            label: "Homework"  },
  content:    { name: "document-outline",        label: "Materials" },
  announce:   { name: "megaphone-outline",        label: "Announce"  },
  queries:    { name: "chatbubbles-outline",      label: "Queries"   },
};

function TeacherTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { selectedSection } = useTeacherStore();
  const { configuration } = useSchoolStore();
  const config = configuration ?? DEFAULT_SCHOOL_CONFIG;
  const isClassTeacher = selectedSection?.is_class_teacher ?? false;
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter(route => {
    if (route.name === "attendance") return isClassTeacher;
    if (route.name === "results")    return isClassTeacher;
    if (route.name === "queries")    return config.parent_query_enabled;
    return true;
  });

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
        {visibleRoutes.map(route => {
          const isFocused = state.routes[state.index]?.key === route.key;
          const cfg = TAB_ICONS[route.name] ?? { name: "ellipse-outline", label: route.name };
          const color = isFocused ? ACCENT : "#AAAAAA";

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable
              key={route.key}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
              onPress={onPress}
              android_ripple={{ color: "#EBF2FB", borderless: true, radius: 28 }}
            >
              <Ionicons name={cfg.name as any} size={22} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TeacherLayout() {
  const { selectedSection } = useTeacherStore();
  const isClassTeacher = selectedSection?.is_class_teacher ?? false;
  const segments = useSegments();

  // When the teacher switches to a section where they are NOT a class teacher,
  // redirect away from any gated tab (attendance / results) to the home tab.
  useEffect(() => {
    if (!isClassTeacher) {
      const currentTab = segments[segments.length - 1] as string;
      if (CLASS_TEACHER_ROUTES.includes(currentTab)) {
        router.replace("/(tabs)/teacher" as any);
      }
    }
  }, [isClassTeacher, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F4F8" }}>
      <SectionPickerBar />
      <Tabs
        tabBar={props => <TeacherTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="results" />
        <Tabs.Screen name="attendance" />
        <Tabs.Screen name="homework" />
        <Tabs.Screen name="content" />
        <Tabs.Screen name="announce" />
        <Tabs.Screen name="queries" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#EEEEEE",
    paddingTop: 6,
  },
  tabScrollContainer: {
    flexGrow: 1,
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabItem: {
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 2,
  },
  tabItemPressed: { opacity: 0.7 },
  tabLabel: { fontSize: 10, fontWeight: "500" },
});
