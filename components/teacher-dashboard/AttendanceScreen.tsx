import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TeacherTopBar } from './TeacherTopBar';

export function AttendanceScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TeacherTopBar />
      <View style={styles.content}>
        <Text>Attendance Screen</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
