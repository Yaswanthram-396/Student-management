import { Stack } from 'expo-router';

export default function PrincipalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="class-attendance" />
      <Stack.Screen name="class-people" />
      <Stack.Screen name="class-teachers" />
      <Stack.Screen name="class-students" />
      <Stack.Screen name="class-detail" />
      <Stack.Screen name="exam-overview" />
      <Stack.Screen name="section-detail" />
      <Stack.Screen name="section-students" />
      <Stack.Screen name="question-heatmap" />
      <Stack.Screen name="question-detail" />
      <Stack.Screen name="student-detail" />
      <Stack.Screen name="student-exams" />
      <Stack.Screen name="student-summary" />
      <Stack.Screen name="student-subject" />
    </Stack>
  );
}
