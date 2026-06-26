import { anyApi } from "convex/server";

export type Item = {
  _id: string;
  _creationTime: number;
  room: string;
  section: string;
  name: string;
  whoBuys: string;
  cost: number;
  priority: string;
  notes: string;
  got: boolean;
  order: number;
};

// Untyped function references into the deployed Convex "movein" backend.
export const api = {
  list: anyApi.items.list,
  toggleGot: anyApi.items.toggleGot,
  update: anyApi.items.update,
  add: anyApi.items.add,
  remove: anyApi.items.remove,
};

export const WHO = ["Shared", "Tristen", "Jakob", "Either"] as const;
export const PRIORITIES = ["Day 1", "Week 1", "Month 1"] as const;
export const PRIO_RANK: Record<string, number> = {
  "Day 1": 0,
  "Week 1": 1,
  "Month 1": 2,
};

export const WHO_STYLES: Record<string, string> = {
  Shared: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Tristen: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Jakob: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  Either: "bg-amber-500/15 text-amber-300 border-amber-500/40",
};

export const PRIO_STYLES: Record<string, string> = {
  "Day 1": "bg-red-500/15 text-red-300 border-red-500/40",
  "Week 1": "bg-orange-500/15 text-orange-300 border-orange-500/40",
  "Month 1": "bg-yellow-500/15 text-yellow-200 border-yellow-500/40",
};

export const PRIO_DOT: Record<string, string> = {
  "Day 1": "🔴",
  "Week 1": "🟠",
  "Month 1": "🟡",
};

export const money = (n: number) =>
  n > 0 ? "$" + n.toLocaleString() : "incl.";
