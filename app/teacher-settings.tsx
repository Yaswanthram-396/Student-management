import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TeacherSettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Nav */}
      <View style={styles.navbar}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <View style={styles.body}>
        <Image
          source={require("../assets/images/shock.gif")}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.caption}>Shock Ayyara</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000000" },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: { backgroundColor: "#222222" },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 24,
  },
  image: {
    width: "100%",
    height: 420,
    borderRadius: 16,
  },
  caption: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1,
  },
});
