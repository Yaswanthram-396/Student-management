import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<string, { name: string; label: string }> = {
  index: { name: "home-outline", label: "Home" },
  homework: { name: "book-outline", label: "Homework" },
  queries: { name: "chatbubbles-outline", label: "Queries" },
  results: { name: "trophy-outline", label: "Results" },
  profile: { name: "person-outline", label: "Profile" },
};

function ParentTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.pillWrap} pointerEvents="box-none">
      <View
        style={[styles.pillBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      >
        {state.routes.map((route) => {
          const isFocused = state.routes[state.index]?.key === route.key;
          const cfg = TAB_ICONS[route.name] ?? {
            name: "ellipse-outline",
            label: route.name,
          };

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented)
              navigation.navigate(route.name);
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              android_ripple={{ color: "#0000", radius: 28 }}
            >
              <View style={styles.tabCenter}>
                <View
                  style={
                    isFocused
                      ? styles.tabIconBgActive
                      : { width: 32, height: 32 }
                  }
                >
                  <Ionicons
                    name={cfg.name as any}
                    size={22}
                    color={isFocused ? "#1D9E75" : "#9CA3AF"}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? "#1D9E75" : "#9CA3AF" },
                  ]}
                >
                  {cfg.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ParentTabsLayout() {
  return (
    <Tabs tabBar={(props) => <ParentTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="homework" options={{ headerShown: false }} />
      <Tabs.Screen name="queries" options={{ headerShown: false }} />
      <Tabs.Screen name="results" options={{ headerShown: false }} />
      <Tabs.Screen name="profile" options={{ headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pillWrap: { width: "100%", backgroundColor: "#FFFFFF" },
  pillBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    flexDirection: "row",
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabCenter: { alignItems: "center" },
  tabIconBgActive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(29,158,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 10, fontWeight: "500", marginTop: 2 },
});
