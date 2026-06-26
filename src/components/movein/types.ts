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
  status: string; // see STATUSES
  got?: boolean; // deprecated, derived from status server-side
  order: number;
};

// Untyped function references into the deployed Convex "movein" backend.
export const api = {
  list: anyApi.items.list,
  toggleGot: anyApi.items.toggleGot,
  setStatus: anyApi.items.setStatus,
  update: anyApi.items.update,
  add: anyApi.items.add,
  remove: anyApi.items.remove,
};

// Acquisition / ownership state.
export const STATUSES = [
  "need",
  "bought",
  "own-tristen",
  "own-jakob",
  "own-both",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  string,
  { label: string; short: string; style: string }
> = {
  need: {
    label: "Need to buy",
    short: "Need",
    style: "bg-secondary text-muted-foreground border-border",
  },
  bought: {
    label: "Bought",
    short: "Bought",
    style:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  },
  "own-tristen": {
    label: "Tristen owns",
    short: "Tristen owns",
    style: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
  },
  "own-jakob": {
    label: "Jakob owns",
    short: "Jakob owns",
    style:
      "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40",
  },
  "own-both": {
    label: "Both own",
    short: "Both own",
    style: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40",
  },
};

export const isOwned = (s: string) => s.startsWith("own-");
export const isHandled = (s: string) => s === "bought" || isOwned(s);
export const ownerOf = (s: string): "Tristen" | "Jakob" | "Both" | null =>
  s === "own-tristen"
    ? "Tristen"
    : s === "own-jakob"
      ? "Jakob"
      : s === "own-both"
        ? "Both"
        : null;

export const WHO = ["Shared", "Tristen", "Jakob", "Either"] as const;
export const PRIORITIES = ["Day 1", "Week 1", "Month 1"] as const;
export const PRIO_RANK: Record<string, number> = {
  "Day 1": 0,
  "Week 1": 1,
  "Month 1": 2,
};

export const TEAL_STYLE =
  "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40";

export const WHO_STYLES: Record<string, string> = {
  Shared:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  Tristen: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
  Jakob:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40",
  Either:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
};

export const PRIO_STYLES: Record<string, string> = {
  "Day 1": "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  "Week 1":
    "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
  "Month 1":
    "bg-yellow-500/20 text-yellow-700 dark:text-yellow-200 border-yellow-500/40",
};

export const money = (n: number) =>
  n > 0 ? "$" + n.toLocaleString() : "incl.";
