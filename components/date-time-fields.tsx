import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { formatTimeDisplay, parseDateInput, type Meridiem } from '@/lib/date-input';

// Tap-to-pick date and time fields, so nobody has to type "MM/DD/YYYY" or "hh:mm" by hand.
// DateField reads and writes the same MM/DD/YYYY string the rest of the app already stores;
// TimeField reads and writes the "h:mm" string plus an AM/PM value.

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (value: number) => String(value).padStart(2, '0');
const toDateString = (date: Date) => `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  // Days outside this range can't be picked.
  minDate?: Date;
  maxDate?: Date;
  accessibilityLabel?: string;
};

export function DateField({ value, onChange, placeholder = 'Select a date', title = 'Select a date', minDate, maxDate, accessibilityLabel }: DateFieldProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const selected = parseDateInput(value);
  const [view, setView] = useState(() => selected ?? new Date());
  const [pickingYear, setPickingYear] = useState(false);

  useEffect(() => {
    if (open) {
      setView(parseDateInput(value) ?? clampToRange(new Date(), minDate, maxDate));
      setPickingYear(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const todayMs = dayStart(new Date());
  const minYear = minDate ? minDate.getFullYear() : new Date().getFullYear() - 60;
  const maxYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear() + 10;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);

  const isDisabled = (day: number) => {
    const ms = dayStart(new Date(year, month, day));
    return (minDate !== undefined && ms < dayStart(minDate)) || (maxDate !== undefined && ms > dayStart(maxDate));
  };

  const canGoPrev = minDate === undefined || new Date(year, month, 0).getTime() >= dayStart(minDate);
  const canGoNext = maxDate === undefined || new Date(year, month + 1, 1).getTime() <= dayStart(maxDate);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={[styles.fieldText, !value && { color: colors.muted }]}>{value || placeholder}</Text>
        <Ionicons name="calendar-outline" size={19} color={colors.gold} />
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title}</Text>

            <View style={styles.monthRow}>
              <Pressable
                accessibilityLabel="Previous month"
                disabled={!canGoPrev || pickingYear}
                hitSlop={8}
                onPress={() => setView(new Date(year, month - 1, 1))}
                style={[styles.navButton, (!canGoPrev || pickingYear) && styles.disabled]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Pressable accessibilityLabel="Choose year" onPress={() => setPickingYear((current) => !current)} style={styles.monthTitleButton}>
                <Text style={styles.monthTitle}>
                  {monthNames[month]} {year}
                </Text>
                <Ionicons name={pickingYear ? 'chevron-up' : 'chevron-down'} size={15} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityLabel="Next month"
                disabled={!canGoNext || pickingYear}
                hitSlop={8}
                onPress={() => setView(new Date(year, month + 1, 1))}
                style={[styles.navButton, (!canGoNext || pickingYear) && styles.disabled]}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>

            {pickingYear ? (
              <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
                <View style={styles.yearGrid}>
                  {years.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setView(new Date(item, month, 1));
                        setPickingYear(false);
                      }}
                      style={[styles.yearCell, item === year && styles.cellSelected]}
                    >
                      <Text style={[styles.yearText, item === year && styles.cellSelectedText]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <>
                <View style={styles.weekRow}>
                  {weekdayLabels.map((label, index) => (
                    <Text key={`${label}-${index}`} style={styles.weekLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((day, index) => {
                    if (day === null) {
                      return <View key={`blank-${index}`} style={styles.dayCell} />;
                    }

                    const disabled = isDisabled(day);
                    const ms = dayStart(new Date(year, month, day));
                    const isSelected = selected !== null && ms === dayStart(selected);

                    return (
                      <Pressable
                        key={day}
                        accessibilityRole="button"
                        accessibilityLabel={`${monthNames[month]} ${day}, ${year}`}
                        accessibilityState={{ disabled, selected: isSelected }}
                        disabled={disabled}
                        onPress={() => {
                          onChange(toDateString(new Date(year, month, day)));
                          setOpen(false);
                        }}
                        style={[styles.dayCell, styles.dayButton, isSelected && styles.cellSelected, !isSelected && ms === todayMs && styles.todayCell]}
                      >
                        <Text style={[styles.dayText, disabled && styles.dayDisabled, isSelected && styles.cellSelectedText]}>{day}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.actions}>
              {minDate === undefined || dayStart(new Date()) >= dayStart(minDate) ? (
                (maxDate === undefined || dayStart(new Date()) <= dayStart(maxDate)) && (
                  <Pressable
                    onPress={() => {
                      onChange(toDateString(new Date()));
                      setOpen(false);
                    }}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Today</Text>
                  </Pressable>
                )
              ) : null}
              <View style={styles.spacer} />
              <Pressable onPress={() => setOpen(false)} style={styles.linkButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function clampToRange(date: Date, min?: Date, max?: Date) {
  if (min && date.getTime() < min.getTime()) return min;
  if (max && date.getTime() > max.getTime()) return max;
  return date;
}

type TimeFieldProps = {
  time: string; // "10:30" or ''
  meridiem: Meridiem;
  onChange: (time: string, meridiem: Meridiem) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

export function TimeField({ time, meridiem, onChange, placeholder = 'Select a time', accessibilityLabel }: TimeFieldProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<Meridiem>('AM');

  const openPicker = () => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    setHour(match ? Number(match[1]) : 9);
    setMinute(match ? Number(match[2]) : 0);
    setPeriod(match ? meridiem : 'AM');
    setOpen(true);
  };

  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Select a time'}
        onPress={openPicker}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={[styles.fieldText, !time && { color: colors.muted }]}>{time ? formatTimeDisplay(time, meridiem) : placeholder}</Text>
        <Ionicons name="time-outline" size={19} color={colors.gold} />
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select a time</Text>
            <Text style={styles.timePreview}>
              {hour}:{pad(minute)} {period}
            </Text>

            <Text style={styles.groupLabel}>HOUR</Text>
            <View style={styles.timeGrid}>
              {hours.map((item) => (
                <Pressable key={item} onPress={() => setHour(item)} style={[styles.timeCell, item === hour && styles.cellSelected]}>
                  <Text style={[styles.dayText, item === hour && styles.cellSelectedText]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.groupLabel}>MINUTE</Text>
            <View style={styles.timeGrid}>
              {minutes.map((item) => (
                <Pressable key={item} onPress={() => setMinute(item)} style={[styles.timeCell, item === minute && styles.cellSelected]}>
                  <Text style={[styles.dayText, item === minute && styles.cellSelectedText]}>{pad(item)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.periodRow}>
              {(['AM', 'PM'] as const).map((item) => (
                <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.periodButton, item === period && styles.cellSelected]}>
                  <Text style={[styles.dayText, item === period && styles.cellSelectedText]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={styles.linkButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <View style={styles.spacer} />
              <Pressable
                onPress={() => {
                  onChange(`${hour}:${pad(minute)}`, period);
                  setOpen(false);
                }}
                style={styles.okButton}
              >
                <Text style={styles.okText}>Set time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: { alignItems: 'center', backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 13 },
    fieldText: { color: colors.text, flex: 1, fontSize: 14 },
    pressed: { opacity: 0.75 },
    backdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: colors.card, borderColor: withAlpha(colors.gold, 0.26), borderRadius: 20, borderWidth: 1, maxWidth: 380, padding: 18, width: '100%' },
    sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    monthRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    navButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
    disabled: { opacity: 0.3 },
    monthTitleButton: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    monthTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
    weekRow: { flexDirection: 'row' },
    weekLabel: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: '800', paddingVertical: 6, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { alignItems: 'center', height: 42, justifyContent: 'center', width: `${100 / 7}%` },
    dayButton: { borderRadius: 21 },
    dayText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    dayDisabled: { color: colors.muted, opacity: 0.35 },
    todayCell: { borderColor: colors.gold, borderWidth: 1 },
    cellSelected: { backgroundColor: colors.gold },
    cellSelectedText: { color: colors.dark },
    yearList: { maxHeight: 250 },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    yearCell: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, height: 40, justifyContent: 'center', width: '30%' },
    yearText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    actions: { alignItems: 'center', flexDirection: 'row', marginTop: 12 },
    spacer: { flex: 1 },
    linkButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
    linkText: { color: colors.gold, fontSize: 13, fontWeight: '800' },
    cancelText: { color: colors.softText, fontSize: 13, fontWeight: '700' },
    okButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 11, justifyContent: 'center', minHeight: 40, paddingHorizontal: 18 },
    okText: { color: colors.dark, fontSize: 13, fontWeight: '800' },
    timePreview: { color: colors.gold, fontSize: 28, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
    groupLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6, marginTop: 8 },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    timeCell: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, height: 40, justifyContent: 'center', width: '22%' },
    periodRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    periodButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, height: 42, justifyContent: 'center' },
  });
}
