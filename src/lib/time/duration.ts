export type Minutes = number & { readonly __brand: "Minutes" };

export type DurationDraft =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "tooLong" }
  | { kind: "ready"; minutes: Minutes };

const MINUTES_IN_DAY = 24 * 60;

function draftFromMinutes(minutes: Minutes): DurationDraft {
  if (minutes >= MINUTES_IN_DAY) {
    return { kind: "tooLong" };
  }
  return { kind: "ready", minutes };
}

export function parseMinutes(value: unknown): Minutes | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.trunc(value) as Minutes;
}

export function formatHhMm(minutes: Minutes): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export const emptySpokenDuration = "= --:--";

export function formatSpokenDuration(minutes: Minutes): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) {
    return `= ${remainder}min`;
  }
  if (remainder === 0) {
    return `= ${hours}h`;
  }
  return `= ${hours}h ${remainder}min`;
}

const HH_MM = /^(\d{1,4}):([0-5]\d)$/;
const DURATION_CHARS = /^\d*:?\d*$/;

export function parseHhMm(value: string): Minutes | undefined {
  const match = HH_MM.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return parseMinutes(hours * 60 + minutes);
}

export function parseDurationDraft(raw: string): DurationDraft {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: "empty" };
  }
  if (!DURATION_CHARS.test(trimmed)) {
    return { kind: "invalid" };
  }
  if (!trimmed.includes(":")) {
    const asNumber = Number(trimmed);
    if (!Number.isInteger(asNumber)) {
      return { kind: "invalid" };
    }
    const minutes = parseMinutes(asNumber);
    if (minutes === undefined) {
      return { kind: "invalid" };
    }
    return draftFromMinutes(minutes);
  }
  const minutes = parseHhMm(trimmed);
  if (minutes === undefined) {
    return { kind: "invalid" };
  }
  return draftFromMinutes(minutes);
}
