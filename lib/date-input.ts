// Shared helpers for the MM/DD/YYYY date and hh:mm AM/PM time inputs.

export type Meridiem = 'AM' | 'PM';

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Returns a Date at local midnight for a valid MM/DD/YYYY string, otherwise null.
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Auto-inserts the colon while typing: "1030" -> "10:30", "930" -> "9:30".
export function formatTimeInput(value: string): string {
  if (value.includes(':')) {
    const [rawHour, ...rest] = value.split(':');
    const hour = rawHour.replace(/\D/g, '').slice(0, 2);
    const minute = rest.join('').replace(/\D/g, '').slice(0, 2);
    return `${hour}:${minute}`;
  }

  const digits = value.replace(/\D/g, '').slice(0, 4);
  const twoDigitHour = Number(digits.slice(0, 2));
  const hourIsTwoDigits = digits.length >= 2 && twoDigitHour >= 1 && twoDigitHour <= 12 && (digits[0] === '0' || digits[0] === '1');

  if (hourIsTwoDigits) {
    return digits.length === 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  return digits.length <= 1 ? digits : `${digits[0]}:${digits.slice(1)}`;
}

// Returns { hours, minutes } in 24-hour form for a valid "h:mm"/"hh:mm" + AM/PM, otherwise null.
export function parseTimeInput(value: string, meridiem: Meridiem): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hour12 = Number(match[1]);
  const minutes = Number(match[2]);

  if (hour12 < 1 || hour12 > 12 || minutes > 59) {
    return null;
  }

  const hours = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  return { hours, minutes };
}

export function formatTimeDisplay(value: string, meridiem: Meridiem): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  return match ? `${Number(match[1])}:${match[2]} ${meridiem}` : `${value.trim()} ${meridiem}`;
}
