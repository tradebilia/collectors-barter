export type MessageTimestampValue = string | number | Date;

export function parseDatabaseTimestamp(value: MessageTimestampValue) {
  if (value instanceof Date || typeof value === "number") return new Date(value);
  const normalized = value.trim();
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)) return new Date(normalized);
  return new Date(`${normalized.replace(" ", "T")}Z`);
}

export function formatMessageTimestamp(
  value: MessageTimestampValue,
  timeZone?: string | null,
  locale?: string,
) {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(parseDatabaseTimestamp(value));
  } catch {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parseDatabaseTimestamp(value));
  }
}
