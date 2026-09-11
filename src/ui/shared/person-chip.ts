export type PersonChip = { initials: string; label: string };

export function personChip(displayName: string): PersonChip {
  return {
    initials: initialsFromDisplayName(displayName),
    label: displayName,
  };
}

function initialsFromDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  const at = trimmed.indexOf("@");
  if (at >= 0) {
    return trimmed.slice(0, at).slice(0, 2).toUpperCase();
  }
  const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return "";
  }
  if (words.length === 1) {
    const word = words[0] ?? "";
    return word.slice(0, 2).toUpperCase();
  }
  const first = words[0] ?? "";
  const last = words[words.length - 1] ?? "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
