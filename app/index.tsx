import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const ROLES: {
  label: string;
  route: string;
  color: string;
}[] = [
  { label: "Parent", route: "/(tabs)/parent/", color: "#1D9E75" },
  { label: "Teacher", route: "/(tabs)/teacher/", color: "#185FA5" },
  { label: "Principal", route: "/(tabs)/principal/", color: "#534AB7" },
];

export default function RoleSelectorScreen() {
  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Select Role</Text>
      <View style={styles.optionList}>
        {ROLES.map(({ label, route, color }) => (
          <Pressable
            key={label}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
            onPress={() => router.push(route as any)}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.optionLabel}>{label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorContainer: {
    flex: 1,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  optionList: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDDDDD",
  },
  optionPressed: {
    backgroundColor: "#F5F5F5",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: "#111111",
  },
  chevron: {
    fontSize: 20,
    color: "#BBBBBB",
    lineHeight: 22,
  },
});
