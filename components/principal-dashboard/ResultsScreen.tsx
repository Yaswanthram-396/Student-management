import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { principalApi } from '../../services/principal';
import { HeaderBar } from '../shared';

export function ResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMessage('');
    setNotImplemented(false);

    principalApi.getExams()
      .then(() => {
        setMessage('Principal exam and result models are available.');
      })
      .catch((err: any) => {
        if (err.code === 'EXAM_MODEL_NOT_IMPLEMENTED') {
          setNotImplemented(true);
          setMessage(err.details ?? 'Principal exams and results are not implemented on the backend yet.');
        } else {
          setMessage(err.details ?? 'Failed to load results.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar center={<Text style={styles.headerTitle}>Results</Text>} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
          <Text style={styles.helperText}>Checking principal exam availability...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Ionicons
              name={notImplemented ? 'construct-outline' : 'document-text-outline'}
              size={24}
              color={notImplemented ? colors.warning : colors.principal}
            />
            <Text style={styles.infoTitle}>
              {notImplemented ? 'Exam Models Not Implemented' : 'Results Ready'}
            </Text>
            <Text style={styles.infoBody}>{message}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionLabel}>Backend Spec Status</Text>
            <Text style={styles.infoBody}>
              `GET /api/v1/principal/exams/` and `GET /api/v1/principal/results/` are expected to return
              `501 EXAM_MODEL_NOT_IMPLEMENTED` until the exam models are created.
            </Text>
          </View>

          <Pressable style={styles.retryBtn} onPress={() => {
            setLoading(true);
            setMessage('');
            setNotImplemented(false);
            principalApi.getExams()
              .then(() => setMessage('Principal exam and result models are available.'))
              .catch((err: any) => {
                if (err.code === 'EXAM_MODEL_NOT_IMPLEMENTED') {
                  setNotImplemented(true);
                  setMessage(err.details ?? 'Principal exams and results are not implemented on the backend yet.');
                } else {
                  setMessage(err.details ?? 'Failed to load results.');
                }
              })
              .finally(() => setLoading(false));
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  helperText: { ...(typography.caption as object), color: colors.textMuted, textAlign: 'center' },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoTitle: { ...(typography.h3 as object), color: colors.textPrimary, fontWeight: '600' },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  infoBody: { ...(typography.body as object), color: colors.textSecondary, lineHeight: 22 },
  retryBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { ...(typography.h3 as object), color: colors.surface, fontWeight: '500' },
});
