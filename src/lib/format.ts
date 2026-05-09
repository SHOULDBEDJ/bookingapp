export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
export const fmtTime = (d: string | Date) => new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
export const fmtDateTime = (d: string | Date) => `${fmtDate(d)} · ${fmtTime(d)}`;
export const toLocalInput = (d: string | Date = new Date()) => {
  const dt = new Date(d);
  const tz = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - tz).toISOString().slice(0, 16);
};
