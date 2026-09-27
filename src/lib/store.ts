/**
 * AEGIS Phase 1 data layer: a typed, on-device store (localStorage).
 * UI talks only to the actions exported here, so Phase 2 can swap the
 * persistence to Lovable Cloud without touching screens.
 */
import { useSyncExternalStore } from "react";
import type { Lang } from "./i18n";

export type Loc = { lat: number; lng: number; acc: number; at: number };
export type DeliveryStatus = "simulated" | "failed" | "acknowledged";
export type Contact = {
  id: string; name: string; phone: string; email: string; relationship: string;
  verified: boolean; sos: boolean; missed: boolean; journey: boolean; location: boolean;
};
export type AlertKind = "sos" | "sos_location" | "missed_checkin" | "manual";
export type Recipient = { contactId: string; name: string; channel: "sms"; status: DeliveryStatus };
export type Alert = {
  id: string; kind: AlertKind; createdAt: number; sessionId?: string; sosId?: string;
  recipients: Recipient[]; location: Loc | null; locationStale: boolean;
};
export type SessionType = "walk" | "journey";
export type Session = {
  id: string; type: SessionType; status: "active" | "completed" | "cancelled";
  startedAt: number; endedAt?: number; intervalMin: number | null; nextCheckInAt: number | null;
  graceMin: number; destination?: string; eta?: string; shareLocation: boolean;
  escalatedFor: number | null;
};
export type LocStatus = "pending" | "acquired" | "unavailable" | "consent_off";
export type SosEvent = {
  id: string; startedAt: number; active: boolean; dialerOpened: boolean;
  locStatus: LocStatus; loc: Loc | null; alertId: string; updateAlertId: string | null;
};
export type EventType =
  | "sos" | "alert" | "missed" | "session_start" | "session_end" | "session_cancel" | "checkin" | "loc_update";
export type LogEvent = { id: string; type: EventType; at: number; alertId?: string; sessionType?: SessionType };
export type Settings = {
  lang: Lang; locationConsent: boolean; defaultInterval: number; graceMin: number;
  vibration: boolean; sound: boolean; highContrast: boolean; largeText: boolean; reducedMotion: boolean;
  simulateFailure: boolean;
};
export type State = {
  settings: Settings; contacts: Contact[]; sessions: Session[]; alerts: Alert[];
  sos: SosEvent[]; log: LogEvent[]; lastKnown: Loc | null;
};

const KEY = "aegis.v1";
const defaults = (): State => ({
  settings: {
    lang: "en", locationConsent: false, defaultInterval: 30, graceMin: 5,
    vibration: false, sound: false, highContrast: false, largeText: false, reducedMotion: false,
    simulateFailure: false,
  },
  contacts: [], sessions: [], alerts: [], sos: [], log: [], lastKnown: null,
});

let state: State | null = null;
const serverState = defaults();
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    const d = defaults();
    state = raw ? { ...d, ...JSON.parse(raw), settings: { ...d.settings, ...JSON.parse(raw).settings } } : d;
  } catch {
    state = defaults();
  }
  return state!;
}
function set(fn: (s: State) => State) {
  state = fn(load());
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
  listeners.forEach((l) => l());
}
export function getState() { return load(); }

export function useAegis<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => sel(load()),
    () => sel(serverState),
  );
}

const uid = () => crypto.randomUUID();
const log = (s: State, e: Omit<LogEvent, "id">): State => ({ ...s, log: [{ id: uid(), ...e }, ...s.log] });

// ---------- settings ----------
export function updateSettings(p: Partial<Settings>) { set((s) => ({ ...s, settings: { ...s.settings, ...p } })); }

// ---------- contacts ----------
export function saveContact(c: Omit<Contact, "id" | "verified"> & { id?: string }) {
  set((s) => {
    if (c.id) return { ...s, contacts: s.contacts.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) };
    return { ...s, contacts: [...s.contacts, { ...c, id: uid(), verified: false }] };
  });
}
export function removeContact(id: string) { set((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) })); }

// ---------- alerts (simulated delivery) ----------
function eligible(s: State, kind: AlertKind): Contact[] {
  return s.contacts.filter((c) =>
    kind === "sos" || kind === "manual" ? c.sos : kind === "missed_checkin" ? c.missed : c.location && s.settings.locationConsent,
  );
}
function makeAlert(s: State, kind: AlertKind, extra: Partial<Alert>): Alert {
  const withLoc = s.settings.locationConsent;
  const recips = eligible(s, kind).map<Recipient>((c) => ({
    contactId: c.id, name: c.name, channel: "sms",
    status: s.settings.simulateFailure && Math.random() < 0.5 ? "failed" : "simulated",
  }));
  const location = extra.location !== undefined ? extra.location : withLoc ? s.lastKnown : null;
  return {
    id: uid(), kind, createdAt: Date.now(), recipients: recips,
    locationStale: extra.locationStale ?? (location != null && extra.location === undefined),
    ...extra, location: withLoc ? location : null,
  };
}
function pushAlert(s: State, a: Alert): State {
  return log({ ...s, alerts: [a, ...s.alerts] }, { type: a.kind === "missed_checkin" ? "missed" : a.kind === "sos_location" ? "loc_update" : "alert", at: a.createdAt, alertId: a.id });
}
export function retryAlert(alertId: string) {
  set((s) => ({
    ...s,
    alerts: s.alerts.map((a) => a.id !== alertId ? a : {
      ...a, recipients: a.recipients.map((r) => r.status === "failed" ? { ...r, status: "simulated" } : r),
    }),
  }));
}
export function sendManualAlert(sessionId?: string) {
  set((s) => pushAlert(s, makeAlert(s, "manual", { sessionId })));
}

// ---------- location ----------
export function requestLocation(timeoutMs = 15000): Promise<Loc | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), at: p.timestamp || Date.now() };
        set((s) => ({ ...s, lastKnown: loc }));
        resolve(loc);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

// ---------- SOS ----------
export function activeSos(s: State) { return s.sos.find((x) => x.active) ?? null; }

function openDialer() {
  try {
    const a = document.createElement("a");
    a.href = "tel:112";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch { return false; }
}

/** Parallel: create event + simulated alert, open 112 dialer, acquire GPS. Never waits for GPS. */
export function activateSOS(): string {
  const cur = activeSos(load());
  if (cur && Date.now() - cur.startedAt < 8000) return cur.id; // duplicate guard
  const id = uid();
  set((s) => {
    const alert = makeAlert(s, "sos", { sosId: id });
    const ev: SosEvent = {
      id, startedAt: Date.now(), active: true, dialerOpened: false,
      locStatus: s.settings.locationConsent ? "pending" : "consent_off", loc: null, alertId: alert.id, updateAlertId: null,
    };
    const s2 = log({ ...s, sos: [ev, ...s.sos.map((x) => ({ ...x, active: false }))] }, { type: "sos", at: ev.startedAt });
    return pushAlert(s2, alert);
  });
  const opened = openDialer();
  set((s) => ({ ...s, sos: s.sos.map((x) => (x.id === id ? { ...x, dialerOpened: opened } : x)) }));
  if (load().settings.locationConsent) {
    void requestLocation().then((loc) => {
      set((s) => {
        let s2: State = { ...s, sos: s.sos.map((x) => (x.id === id ? { ...x, locStatus: loc ? "acquired" : "unavailable", loc } : x)) };
        if (loc) {
          const upd = makeAlert(s2, "sos_location", { sosId: id, location: loc, locationStale: false });
          s2 = pushAlert(s2, upd);
          s2 = { ...s2, sos: s2.sos.map((x) => (x.id === id ? { ...x, updateAlertId: upd.id } : x)) };
        }
        return s2;
      });
    });
  }
  return id;
}
export function endSOS() { set((s) => ({ ...s, sos: s.sos.map((x) => ({ ...x, active: false })) })); }

// ---------- sessions ----------
export function activeSession(s: State) { return s.sessions.find((x) => x.status === "active") ?? null; }

export function startSession(p: {
  type: SessionType; intervalMin: number | null; graceMin: number; destination?: string; eta?: string; shareLocation: boolean;
}): boolean {
  if (activeSession(load())) return false;
  const now = Date.now();
  set((s) => log({
    ...s,
    sessions: [{
      id: uid(), status: "active", startedAt: now, escalatedFor: null,
      nextCheckInAt: p.intervalMin ? now + p.intervalMin * 60000 : null, ...p,
    }, ...s.sessions],
  }, { type: "session_start", at: now, sessionType: p.type }));
  if (p.shareLocation && load().settings.locationConsent) void requestLocation();
  return true;
}
function patchActive(fn: (x: Session) => Session) {
  set((s) => ({ ...s, sessions: s.sessions.map((x) => (x.status === "active" ? fn(x) : x)) }));
}
export function checkInSafe() {
  const s = activeSession(load());
  if (!s) return;
  patchActive((x) => ({ ...x, nextCheckInAt: x.intervalMin ? Date.now() + x.intervalMin * 60000 : null, escalatedFor: null }));
  set((st) => log(st, { type: "checkin", at: Date.now(), sessionType: s.type }));
}
export function extendTimer(min = 15) {
  patchActive((x) => ({ ...x, nextCheckInAt: Math.max(x.nextCheckInAt ?? Date.now(), Date.now()) + min * 60000, escalatedFor: null }));
}
export function endSession(status: "completed" | "cancelled") {
  const s = activeSession(load());
  if (!s) return;
  patchActive((x) => ({ ...x, status, endedAt: Date.now(), nextCheckInAt: null }));
  set((st) => log(st, { type: status === "completed" ? "session_end" : "session_cancel", at: Date.now(), sessionType: s.type }));
}
/** Called by the in-app monitor. Escalates once per missed check-in. */
export function escalateIfOverdue(now: number): boolean {
  const s = activeSession(load());
  if (!s || !s.nextCheckInAt || s.escalatedFor === s.nextCheckInAt) return false;
  if (now < s.nextCheckInAt + s.graceMin * 60000) return false;
  const due = s.nextCheckInAt;
  set((st) => {
    const a = makeAlert(st, "missed_checkin", { sessionId: s.id, location: s.shareLocation && st.settings.locationConsent ? st.lastKnown : null, locationStale: true });
    return pushAlert({ ...st, sessions: st.sessions.map((x) => (x.id === s.id ? { ...x, escalatedFor: due } : x)) }, a);
  });
  return true;
}

// ---------- privacy ----------
export function deleteHistory() { set((s) => ({ ...s, alerts: [], log: [], sos: [], sessions: s.sessions.filter((x) => x.status === "active"), lastKnown: null })); }
export function deleteAll() { set(() => defaults()); }
