import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { bootstrapAuthSession } from "../store/auth-store";

export default function RootLayout() {
  useEffect(() => {
    void bootstrapAuthSession();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
