import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';

type SelectFieldProps = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
};

export function SelectField({ value, options, onChange, title, placeholder }: SelectFieldProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.input, pressed && styles.pressed]}
      >
        <Text style={[styles.inputText, !value && { color: colors.muted }]}>{value || placeholder || 'Select'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{title}</Text>
            {options.map((option) => {
              const selected = option === value;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.optionText, selected && { color: colors.gold }]}>{option}</Text>
                  {selected && <Ionicons name="checkmark" size={18} color={colors.gold} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    input: {
      alignItems: 'center',
      backgroundColor: colors.cardAlt,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 46,
      paddingHorizontal: 12,
    },
    inputText: { color: colors.text, fontSize: 14 },
    pressed: { opacity: 0.75 },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'center', padding: 24 },
    sheet: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
    option: {
      alignItems: 'center',
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingHorizontal: 12,
    },
    optionSelected: { backgroundColor: withAlpha(colors.gold, 0.14) },
    optionText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  });
}
