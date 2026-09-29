/**
 * Verified public facility datasets. Only add entries imported from official
 * government / police / municipal open-data with source, licence and check date.
 * Empty on purpose: no verified dataset has been imported yet — never add sample points.
 */
export type FacilityKind = "police" | "hospital" | "assist" | "cctv";
export type Facility = { id: string; kind: FacilityKind; name: string; lat: number; lng: number; info?: string };
export type Dataset = { kind: FacilityKind; source: string; licence: string; checkedOn: string; url: string; items: Facility[] };

export const DATASETS: Dataset[] = [];
