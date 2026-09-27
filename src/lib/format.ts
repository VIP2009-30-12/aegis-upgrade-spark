import type { Loc } from "./store";

export function fmtDuration(ms: number) {
  const neg = ms < 0;
  const t = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const body = h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  return neg ? `-${body}` : body;
}
export function fmtTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}
export const mapLink = (l: Loc) => `https://www.google.com/maps?q=${l.lat},${l.lng}`;
export const osmEmbed = (l: Loc) => {
  const d = 0.005;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - d},${l.lat - d},${l.lng + d},${l.lat + d}&layer=mapnik&marker=${l.lat},${l.lng}`;
};
