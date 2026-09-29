/**
 * Stage 2–5 cloud layer. Local store stays the source for the UI; when signed in,
 * session events are mirrored to the account with idempotent ids and a persisted retry queue.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { onSessionEvent, getState, activeSession, requestLocation, type Session, type SyncEvent } from "./store";

export type SyncStatus = "local" | "saving" | "saved" | "failed" | "offline";
type Job = { kind: "upsert"; session: Session; loc: { lat: number; lng: number; acc: number; at: number } | null } | { kind: "checkin"; walkId: string; id: string; at: number };

const QKEY = "aegis.syncq.v1";
let queue: Job[] = [];
let status: Record<string, SyncStatus> = {};
let signedIn = false;
let running = false;
const ls = new Set<() => void>();
const notify = () => ls.forEach((l) => l());

function persist() { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch { /* ignore */ } }
function setStatus(id: string, s: SyncStatus) { status = { ...status, [id]: s }; notify(); }

export function useSyncStatus(sessionId: string | undefined): SyncStatus {
  return useSyncExternalStore(
    (cb) => { ls.add(cb); return () => ls.delete(cb); },
    () => (!sessionId || !signedIn ? "local" : status[sessionId] ?? "local"),
    () => "local",
  );
}

const iso = (n: number | null | undefined) => (n ? new Date(n).toISOString() : null);

async function runJob(j: Job) {
  if (j.kind === "upsert") {
    const s = j.session;
    const { error } = await supabase.from("walks").upsert({
      id: s.id, type: s.type, status: s.status, started_at: iso(s.startedAt)!, ended_at: iso(s.endedAt),
      interval_min: s.intervalMin, grace_min: s.graceMin, next_checkin_at: iso(s.nextCheckInAt),
      destination: s.destination ?? null, eta: s.eta ?? null, share_location: s.shareLocation,
      ...(j.loc && s.shareLocation ? { loc_lat: j.loc.lat, loc_lng: j.loc.lng, loc_acc: j.loc.acc, loc_at: iso(j.loc.at) } : {}),
    });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("check_ins").upsert({ id: j.id, walk_id: j.walkId, at: iso(j.at)! }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    const { error: e2 } = await supabase.from("walks").update({ last_checkin_at: iso(j.at) }).eq("id", j.walkId);
    if (e2) throw e2;
  }
}
const jobSession = (j: Job) => (j.kind === "upsert" ? j.session.id : j.walkId);

export async function flush() {
  if (running || !signedIn) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) { queue.forEach((j) => setStatus(jobSession(j), "offline")); return; }
  running = true;
  try {
    while (queue.length) {
      const j = queue[0]!;
      setStatus(jobSession(j), "saving");
      try { await runJob(j); } catch {
        setStatus(jobSession(j), navigator.onLine ? "failed" : "offline");
        return;
      }
      queue.shift(); persist();
      if (!queue.some((x) => jobSession(x) === jobSession(j))) setStatus(jobSession(j), "saved");
    }
  } finally { running = false; }
}

function enqueue(e: SyncEvent) {
  if (!signedIn) return;
  if (e.kind === "upsert") {
    // Collapse repeated upserts for the same walk: only the newest state matters.
    queue = queue.filter((j) => !(j.kind === "upsert" && j.session.id === e.session.id));
    const loc = e.session.shareLocation && getState().settings.locationConsent ? getState().lastKnown : null;
    queue.push({ kind: "upsert", session: e.session, loc });
  } else {
    queue.push({ kind: "checkin", walkId: e.session.id, id: e.id, at: Date.now() });
    queue.push({ kind: "upsert", session: e.session, loc: null });
  }
  persist();
  setStatus(e.session.id, "saving");
  void flush();
}

/** Mount once (AppShell). Mirrors session events while signed in, retries on reconnect, refreshes shared location every 60s. */
export function useCloudSync(isSignedIn: boolean) {
  useEffect(() => {
    signedIn = isSignedIn;
    notify();
    if (!isSignedIn) return;
    try { queue = JSON.parse(localStorage.getItem(QKEY) ?? "[]") as Job[]; } catch { queue = []; }
    const off = onSessionEvent(enqueue);
    const on = () => void flush();
    window.addEventListener("online", on);
    // Make sure a walk started before sign-in is represented once.
    const a = activeSession(getState());
    if (a && !queue.length) enqueue({ kind: "upsert", session: a });
    void flush();
    const locTimer = setInterval(() => {
      const s = activeSession(getState());
      if (s?.shareLocation && getState().settings.locationConsent) void requestLocation(10000);
    }, 60000);
    return () => { off(); window.removeEventListener("online", on); clearInterval(locTimer); };
  }, [isSignedIn]);
}

// ---------- Safety Circle ----------
export type CircleRow = {
  id: string; name: string; relationship: string; status: "pending" | "accepted" | "revoked"; expires_at: string;
  perm_walk: boolean; perm_checkins: boolean; perm_alerts: boolean; perm_location: boolean; accepted_at: string | null;
};
export type Perm = "perm_walk" | "perm_checkins" | "perm_alerts" | "perm_location";

export function circleState(r: CircleRow): "pending" | "accepted" | "expired" | "revoked" {
  if (r.status === "pending" && new Date(r.expires_at).getTime() < Date.now()) return "expired";
  return r.status;
}

async function sha256Hex(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function listCircle(): Promise<CircleRow[]> {
  const { data, error } = await supabase.from("circle_members")
    .select("id,name,relationship,status,expires_at,perm_walk,perm_checkins,perm_alerts,perm_location,accepted_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CircleRow[];
}

/** Token lives only in the link; the database stores its SHA-256 hash. */
export async function createInvite(p: { name: string; relationship: string; perms: Record<Perm, boolean> }) {
  const raw = new Uint8Array(24); crypto.getRandomValues(raw);
  const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const { error } = await supabase.from("circle_members").insert({
    name: p.name, relationship: p.relationship, token_hash: await sha256Hex(token), ...p.perms,
  });
  if (error) throw error;
  return `${window.location.origin}/invite/${token}`;
}
export async function setPerm(id: string, perm: Perm, value: boolean) {
  const { error } = await supabase.from("circle_members").update({ [perm]: value }).eq("id", id);
  if (error) throw error;
}
export async function revokeMember(id: string) {
  const { error } = await supabase.from("circle_members").update({ status: "revoked" }).eq("id", id);
  if (error) throw error;
}
export async function deleteMember(id: string) {
  const { error } = await supabase.from("circle_members").delete().eq("id", id);
  if (error) throw error;
}
export type AcceptResult = "accepted" | "expired" | "revoked" | "invalid" | "used" | "own" | "already" | "signin";
export async function acceptInvite(token: string): Promise<{ result: AcceptResult; owner: string | null }> {
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) throw error;
  const d = data as { result: AcceptResult; owner?: string | null };
  return { result: d.result, owner: d.owner ?? null };
}

// ---------- Guardian ----------
export type GuardianEntry = {
  circle_id: string; owner_name: string | null;
  perms: { walk: boolean; checkins: boolean; alerts: boolean; location: boolean };
  walk: null | {
    type: "walk" | "journey"; started_at: string; destination: string | null; eta: string | null; grace_min: number;
    next_checkin_at: string | null; last_checkin_at: string | null; overdue: boolean;
    location: null | { lat: number; lng: number; acc: number | null; at: string };
  };
  alerts: null | { id: string; due_at: string; status: string; created_at: string; acknowledged_at: string | null }[];
};
export async function guardianOverview(): Promise<GuardianEntry[]> {
  const { data, error } = await supabase.rpc("guardian_overview");
  if (error) throw error;
  return (data ?? []) as unknown as GuardianEntry[];
}
export async function ackAlert(id: string) {
  const { error } = await supabase.rpc("ack_alert", { p_id: id });
  if (error) throw error;
}
export async function leaveCircle(id: string) {
  const { error } = await supabase.rpc("leave_circle", { p_id: id });
  if (error) throw error;
}

// ---------- privacy ----------
export async function deleteCloudHistory() {
  const { error } = await supabase.from("walks").delete().neq("status", "active");
  if (error) throw error;
}
