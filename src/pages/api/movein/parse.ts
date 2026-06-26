import type { APIRoute } from "astro";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

// Server-only route: parses a plain-English request into structured move-in
// checklist items using an LLM via OpenRouter. The API key never reaches the
// client — it is read from the server runtime env only.
export const prerender = false;

const ItemSchema = z.object({
  name: z.string().describe("Short item name, e.g. 'Shower curtain'"),
  room: z
    .string()
    .describe("Best-matching room name; reuse a known room when possible"),
  section: z
    .string()
    .describe("Short group within the room, e.g. 'Furniture', 'Bedding'"),
  whoBuys: z.enum(["Shared", "Tristen", "Jakob", "Either"]),
  cost: z.number().describe("Estimated USD cost as an integer; 0 if unknown"),
  priority: z.enum(["Day 1", "Week 1", "Month 1"]),
  status: z.enum(["need", "bought", "own-tristen", "own-jakob", "own-both"]),
  notes: z.string().describe("Optional short note; empty string if none"),
});

const ResultSchema = z.object({
  items: z.array(ItemSchema).min(1).max(20),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "AI is not configured on the server." }, 503);
  }

  let body: { text?: string; rooms?: string[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const text = String(body.text ?? "").trim();
  if (!text) return json({ error: "Describe what you want to add." }, 400);
  if (text.length > 1000) {
    return json(
      { error: "That's too long — keep it under 1000 characters." },
      400,
    );
  }
  const rooms = Array.isArray(body.rooms)
    ? body.rooms.filter((r) => typeof r === "string").slice(0, 40)
    : [];

  const openrouter = createOpenRouter({ apiKey });

  try {
    const { object } = await generateObject({
      model: openrouter("openai/gpt-4o-mini"),
      schema: ResultSchema,
      system: [
        "You turn a roommate's plain-English request into structured move-in checklist items for a shared apartment (Jakob and Tristen).",
        "Return one item per distinct thing requested. Split lists into separate items.",
        rooms.length
          ? `Known rooms (reuse the closest match exactly when appropriate): ${rooms.join(", ")}.`
          : "",
        "Rules for fields:",
        '- room: map phrases like "jakob\'s bathroom" to the matching known room; otherwise pick a sensible Title Case room.',
        "- section: a short grouping such as Furniture, Bedding, Window Coverings, Storage, Cleaning, Tech, Bath Linens, etc.",
        "- whoBuys: default 'Shared'. Use 'Tristen' or 'Jakob' only if the text says that person is buying/paying. 'for Jakob's room' affects room, NOT whoBuys.",
        "- cost: a realistic integer USD estimate for a budget/midrange version; 0 only if truly unknowable.",
        "- priority: default 'Week 1'. Use 'Day 1' for urgent/first-night items, 'Month 1' for nice-to-haves.",
        "- status: default 'need'. Use 'bought' if already purchased; 'own-tristen'/'own-jakob'/'own-both' if someone already owns it.",
        "- notes: brief and only if it adds info; otherwise empty string.",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: text,
    });

    // Snap each item's room to an existing room when it's clearly the same,
    // so the AI never spawns a near-duplicate (e.g. "Pets" vs "Pets (3 Cats)").
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const snapRoom = (room: string) => {
      const r = norm(room);
      if (!r) return room;
      const exact = rooms.find((k) => norm(k) === r);
      if (exact) return exact;
      const partial = rooms.find((k) => {
        const n = norm(k);
        return n.includes(r) || r.includes(n);
      });
      return partial ?? room;
    };
    const items = object.items.map((it) => ({
      ...it,
      room: snapRoom(it.room),
    }));

    return json({ items });
  } catch (err) {
    console.error("movein parse error", err);
    return json({ error: "Couldn't parse that — try rephrasing." }, 502);
  }
};
