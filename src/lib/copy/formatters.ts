import {
  formatCalendarDayLabel,
  type CalendarDay,
} from "../time/calendar-day.ts";

export type Formatters<C extends Intl.LDMLPluralRule> = {
  dayLabel: (day: CalendarDay) => string;
  count: (value: number) => string;
  plural: (value: number, forms: Record<C | "other", string>) => string;
};

export function createFormatters<C extends Intl.LDMLPluralRule>(
  locale: string,
  categories: readonly C[],
): Formatters<C> {
  const rules = new Intl.PluralRules(locale);
  const allowed = new Set<string>(categories);
  return {
    dayLabel: (day) => formatCalendarDayLabel(day, locale),
    count: (value) => new Intl.NumberFormat(locale).format(value),
    plural: (value, forms) => {
      const selected = rules.select(value);
      if (allowed.has(selected) && selected in forms) {
        return forms[selected as C | "other"];
      }
      return forms.other;
    },
  };
}
