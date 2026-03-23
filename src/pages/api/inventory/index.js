import {
  appendInventoryEntry,
  getInventoryCsvPath,
  listInventoryEntries,
} from "../../../lib/inventory/store.js";

export async function GET({ request }) {
  const url = new URL(request.url);
  const limitValue = Number.parseInt(url.searchParams.get("limit") || "25", 10);
  const limit = Number.isNaN(limitValue)
    ? 25
    : Math.min(Math.max(limitValue, 1), 200);
  const items = await listInventoryEntries(limit);

  return Response.json({
    items,
    count: items.length,
    csvPath: getInventoryCsvPath(),
    exportedAt: new Date().toISOString(),
  });
}

export async function POST({ request }) {
  try {
    const payload = await request.json();
    const item = await appendInventoryEntry(payload);

    return Response.json(
      {
        item,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to store item.",
      },
      { status: 400 },
    );
  }
}
