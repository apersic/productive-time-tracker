export type CalendarDay = string & { readonly __brand: "CalendarDay" };

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

function formatLocalYmd(date: Date): CalendarDay {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as CalendarDay;
}

function localDateFromCalendarDay(day: CalendarDay): Date {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  return new Date(year, month - 1, date);
}

export function parseCalendarDay(value: string): CalendarDay | undefined {
  if (!CALENDAR_DAY.test(value)) {
    return undefined;
  }
  const candidate = value as CalendarDay;
  if (formatLocalYmd(localDateFromCalendarDay(candidate)) !== value) {
    return undefined;
  }
  return candidate;
}

export function todayLocal(now = new Date()): CalendarDay {
  return formatLocalYmd(now);
}

export function previousCalendarDay(day: CalendarDay): CalendarDay {
  const date = localDateFromCalendarDay(day);
  date.setDate(date.getDate() - 1);
  return formatLocalYmd(date);
}

export function formatCalendarDayLabel(day: CalendarDay): string {
  return localDateFromCalendarDay(day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
