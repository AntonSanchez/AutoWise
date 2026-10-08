import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';

export const PAGE_SIZE = 10;

// Splits a list into pages of at most 10. Pass a resetKey (a filter, tab or search term) to jump back
// to page 1 whenever it changes.
export function usePagination<T>(items: T[], resetKey: string = '') {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  return {
    page: current,
    pageCount,
    total: items.length,
    pageItems: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    setPage,
  };
}

type Props = { page: number; pageCount: number; total: number; onChange: (page: number) => void };

// "Previous  Page 2 of 5  Next". Renders nothing when everything fits on one page.
export function Pager({ page, pageCount, total, onChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (pageCount <= 1) {
    return null;
  }

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
        style={({ pressed }) => [styles.button, page <= 1 && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </Pressable>
      <View style={styles.label}>
        <Text style={styles.pageText}>
          Page {page} of {pageCount}
        </Text>
        <Text style={styles.rangeText}>
          {first}-{last} of {total}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next page"
        disabled={page >= pageCount}
        onPress={() => onChange(page + 1)}
        style={({ pressed }) => [styles.button, page >= pageCount && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 },
    button: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.12), borderColor: withAlpha(colors.gold, 0.3), borderRadius: 12, borderWidth: 1, height: 42, justifyContent: 'center', width: 52 },
    disabled: { opacity: 0.35 },
    pressed: { opacity: 0.75 },
    label: { alignItems: 'center' },
    pageText: { color: colors.text, fontSize: 13, fontWeight: '800' },
    rangeText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  });
}
