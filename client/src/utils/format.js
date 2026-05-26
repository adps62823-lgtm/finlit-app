export function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDateOnly(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
}

export function isOverdue(value) {
  if (!value) return false;
  return new Date(value) < new Date();
}
