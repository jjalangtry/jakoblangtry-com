import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.INVENTORY_DATA_DIR
  ? path.resolve(process.env.INVENTORY_DATA_DIR)
  : path.join(process.cwd(), ".data", "inventory");

const CSV_FILE = path.join(DATA_DIR, "inventory.csv");
const HEADERS = ["createdAt", "barcode", "description", "operator"];
let writeQueue = Promise.resolve();

function escapeCsvField(value) {
  const normalized = String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeEntry(entry) {
  const barcode = String(entry?.barcode ?? "").trim();
  const description = String(entry?.description ?? "").trim();
  const operator = String(entry?.operator ?? "").trim();

  if (!barcode) {
    throw new Error("Barcode is required.");
  }

  if (!description) {
    throw new Error("Description is required.");
  }

  return {
    createdAt: new Date().toISOString(),
    barcode,
    description,
    operator: operator || "Unknown station",
  };
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await stat(CSV_FILE);
  } catch {
    await writeFile(CSV_FILE, `${HEADERS.join(",")}\n`, "utf8");
  }
}

async function readCsvRows() {
  await ensureStore();
  const content = await readFile(CSV_FILE, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const [createdAt = "", barcode = "", description = "", operator = ""] =
      parseCsvLine(line);

    return {
      createdAt,
      barcode,
      description,
      operator,
    };
  });
}

export async function appendInventoryEntry(entry) {
  const normalized = normalizeEntry(entry);

  writeQueue = writeQueue.then(async () => {
    await ensureStore();
    const line = HEADERS.map((key) => escapeCsvField(normalized[key])).join(
      ",",
    );
    await appendFile(CSV_FILE, `${line}\n`, "utf8");
  });

  await writeQueue;
  return normalized;
}

export async function listInventoryEntries(limit = 50) {
  const rows = await readCsvRows();
  return rows.slice(-limit).reverse();
}

export async function getInventoryCsv() {
  await ensureStore();
  return readFile(CSV_FILE, "utf8");
}

export function getInventoryCsvPath() {
  return CSV_FILE;
}

export const inventoryTestUtils = {
  escapeCsvField,
  parseCsvLine,
  normalizeEntry,
};
