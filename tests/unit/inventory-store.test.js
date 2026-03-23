import { describe, expect, it } from "vitest";
import { inventoryTestUtils } from "../../src/lib/inventory/store.js";

describe("inventory store helpers", () => {
  it("escapes commas and quotes for csv output", () => {
    expect(inventoryTestUtils.escapeCsvField('Widget, 12"')).toBe(
      '"Widget, 12"""',
    );
  });

  it("parses quoted csv lines", () => {
    expect(
      inventoryTestUtils.parseCsvLine(
        '2026-03-23T10:00:00.000Z,12345,"Large, Blue Widget","Front Desk"',
      ),
    ).toEqual([
      "2026-03-23T10:00:00.000Z",
      "12345",
      "Large, Blue Widget",
      "Front Desk",
    ]);
  });

  it("requires barcode and description", () => {
    expect(() =>
      inventoryTestUtils.normalizeEntry({ barcode: "", description: "Widget" }),
    ).toThrow("Barcode is required.");
    expect(() =>
      inventoryTestUtils.normalizeEntry({ barcode: "123", description: "" }),
    ).toThrow("Description is required.");
  });

  it("defaults operator when omitted", () => {
    const item = inventoryTestUtils.normalizeEntry({
      barcode: "12345",
      description: "Widget",
    });

    expect(item.operator).toBe("Unknown station");
    expect(item.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
