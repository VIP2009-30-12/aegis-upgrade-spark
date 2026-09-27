import type { TKey } from "@/lib/i18n";

/**
 * Help directory. Kept as data (not UI) so it can be moved to Cloud and
 * edited without rebuilding (Phase 2). Sources: ERSS/MHA (112), MWCD (181),
 * Childline (1098), MoHFW Tele-MANAS (14416), NDMA (1078), I4C (1930),
 * NCW, Telangana Police SHE Teams. Last reviewed: Sep 2026.
 */
export type HelpItem = { name: string; number: string; emergency: boolean; note?: string };
export type HelpSection = { key: TKey; items: HelpItem[] };

export const HELP: HelpSection[] = [
  { key: "help_emergency", items: [
    { name: "Emergency Response (ERSS) — Police, Fire, Ambulance", number: "112", emergency: true },
    { name: "Police", number: "100", emergency: true },
    { name: "Fire", number: "101", emergency: true },
    { name: "Ambulance", number: "108", emergency: true },
  ] },
  { key: "help_women", items: [
    { name: "Women Helpline (Ministry of WCD)", number: "181", emergency: false, note: "24×7" },
    { name: "Women in Distress (Police)", number: "1091", emergency: true },
    { name: "National Commission for Women — WhatsApp", number: "7827170170", emergency: false },
  ] },
  { key: "help_child", items: [
    { name: "Childline", number: "1098", emergency: true, note: "24×7" },
  ] },
  { key: "help_health", items: [
    { name: "Tele-MANAS — Mental health (Govt. of India)", number: "14416", emergency: false, note: "24×7, multilingual" },
    { name: "Ambulance", number: "108", emergency: true },
  ] },
  { key: "help_disaster", items: [
    { name: "Disaster Management (NDMA)", number: "1078", emergency: false },
  ] },
  { key: "help_local", items: [
    { name: "Hyderabad SHE Teams — WhatsApp", number: "9490616555", emergency: false },
    { name: "Cyber Crime Helpline (I4C)", number: "1930", emergency: false },
  ] },
];
