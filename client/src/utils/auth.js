export function normalizeLoginToEmail(loginId) {
  const value = (loginId || "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("@")) return value;
  return `${value}@finlit.local`;
}
