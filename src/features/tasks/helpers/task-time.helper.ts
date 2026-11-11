const formatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTaskTime(value: string): string {
  return formatter.format(new Date(value)) + " UTC";
}
