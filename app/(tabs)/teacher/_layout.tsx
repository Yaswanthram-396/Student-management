import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SectionPickerBar } from "../../../components/teacher-dashboard/SectionPickerBar";
import { useTeacherStore } from "../../../store/teacher-store";

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
  const isClassTeacher = selectedSection?.is_class_teacher ?? false;
  const insets = useSafeAreaInsets();

  // Filter out attendance for non-class-teachers — no slot reserved
  const visibleRoutes = state.routes.filter(route => {
    if (route.name === "attendance") return isClassTeacher;
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
