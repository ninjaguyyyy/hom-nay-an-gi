export function normalizePhone(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const normalized = `+${raw.slice(1).replace(/\D/g, "")}`;
    if (!/^\+\d{9,15}$/.test(normalized)) return null;
    return normalized;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // VN local format: 0xxxxxxxxx -> +84xxxxxxxxx
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) {
    const converted = `+84${digits.slice(1)}`;
    if (!/^\+\d{9,15}$/.test(converted)) return null;
    return converted;
  }

  // International digits without plus.
  if (digits.length >= 9 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function validatePassword(value: unknown) {
  const password = String(value ?? "");
  return password.length >= 6;
}
