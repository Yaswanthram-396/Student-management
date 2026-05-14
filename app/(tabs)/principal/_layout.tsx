import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#534AB7';

export default function PrincipalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarStyle: {
          height: 56,
          borderTopWidth: 0.5,
          borderTopColor: '#EEEEEE',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="announce"
        options={{
          title: 'Announce',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="class-attendance"
        options={{ href: null }}
      />
      <Tabs.Screen name="class-detail" options={{ href: null }} />
      <Tabs.Screen name="exam-overview"    options={{ href: null }} />
      <Tabs.Screen name="section-detail"   options={{ href: null }} />
      <Tabs.Screen name="section-students" options={{ href: null }} />
      <Tabs.Screen name="question-heatmap" options={{ href: null }} />
      <Tabs.Screen name="question-detail"  options={{ href: null }} />
      <Tabs.Screen name="student-summary"  options={{ href: null }} />
      <Tabs.Screen name="student-subject"  options={{ href: null }} />
    </Tabs>
  );
}
