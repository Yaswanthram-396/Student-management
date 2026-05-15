import { Stack } from "expo-router";

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="attendance-history" />
    </Stack>
  );
}
