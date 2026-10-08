import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import type { PhotoSource } from '@/lib/photo';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  busy?: boolean;
  onPick: (source: PhotoSource) => void;
  onRemove?: () => void;
  onClose: () => void;
};

// "Take Photo / Choose from Library / Remove" sheet used for profile and car pictures.
export function PhotoSourceModal({ visible, title, message, busy, onPick, onRemove, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => (busy ? null : onClose())}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="camera-outline" size={25} color={colors.gold} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message ?? 'Take a new photo or choose one from your library.'}</Text>

          {busy ? (
            <ActivityIndicator color={colors.gold} style={styles.spinner} />
          ) : (
            <>
              <Pressable accessibilityRole="button" onPress={() => onPick('camera')} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <Ionicons name="camera-outline" size={18} color={colors.text} />
                <Text style={styles.optionText}>Take Photo</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onPick('library')} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <Ionicons name="images-outline" size={18} color={colors.text} />
                <Text style={styles.optionText}>Choose from Library</Text>
              </Pressable>
              {onRemove && (
                <Pressable accessibilityRole="button" onPress={onRemove} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <Ionicons name="trash-outline" size={18} color={colors.text} />
                  <Text style={styles.optionText}>Remove Photo</Text>
                </Pressable>
              )}
            </>
          )}

          <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.card, borderColor: withAlpha(colors.gold, 0.26), borderRadius: 22, borderWidth: 1, maxWidth: 420, padding: 24, width: '100%' },
    icon: { alignItems: 'center', alignSelf: 'center', backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 16, width: 56 },
    title: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    message: { color: colors.softText, fontSize: 13, lineHeight: 20, marginBottom: 14, marginTop: 10, textAlign: 'center' },
    spinner: { marginVertical: 18 },
    option: { alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 8, minHeight: 48, paddingHorizontal: 14 },
    optionText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    cancel: { alignItems: 'center', justifyContent: 'center', marginTop: 12, minHeight: 44 },
    cancelText: { color: colors.softText, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.75 },
  });
}
