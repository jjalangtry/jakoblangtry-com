import { describe, it, expect } from "vitest";
import {
  COMMAND_LIST,
  buildProjectsListOutput,
  findProjectByCommand,
  celsiusToFahrenheit,
  getOutputA11yAttrs,
  normalizeThemeCommand,
  autocompleteCommand,
  handleHistoryNavigation,
  shouldUseCompactWeatherLayout,
} from "../../src/lib/terminal/index.js";

describe("terminal helpers", () => {
  it("includes core command surface", () => {
    expect(COMMAND_LIST).toContain("help");
    expect(COMMAND_LIST).toContain("projects");
    expect(COMMAND_LIST).toContain("weather");
    expect(COMMAND_LIST).toContain("sudo");
    expect(COMMAND_LIST).toContain("cd");
  });

  it("builds projects output with numbered entries", () => {
    const output = buildProjectsListOutput([
      { name: "Website", url: "https://jjalangtry.com" },
      {
        name: "Converter",
        url: "https://convert.jjalangtry.com",
        description: "Music links",
      },
    ]);

    expect(output).toContain("1. Website - https://jjalangtry.com");
    expect(output).toContain(
      "2. Converter - https://convert.jjalangtry.com (Music links)",
    );
  });

  it("handles empty projects gracefully", () => {
    expect(buildProjectsListOutput([])).toBe("No projects are configured yet.");
  });

  it("finds projects by command name case-insensitively", () => {
    const project = findProjectByCommand("converter", [
      { name: "Website", url: "https://jjalangtry.com" },
      { name: "Converter", url: "https://convert.jjalangtry.com" },
    ]);
    expect(project && project.url).toBe("https://convert.jjalangtry.com");
  });

  it("returns null for invalid project lookups", () => {
    expect(
      findProjectByCommand("", [
        { name: "Website", url: "https://jjalangtry.com" },
      ]),
    ).toBeNull();
    expect(findProjectByCommand("website", null)).toBeNull();
    expect(
      findProjectByCommand("converter", [
        null,
        { name: "" },
        { name: "Website", url: "https://jjalangtry.com" },
      ]),
    ).toBeNull();
  });

  it("converts celsius to fahrenheit", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(20)).toBe(68);
  });

  it("adds assertive alert semantics for error output", () => {
    expect(getOutputA11yAttrs("error-text")).toEqual({
      role: "alert",
      "aria-live": "assertive",
    });
    expect(getOutputA11yAttrs("info-text")).toEqual({});
  });

  it("normalizes theme command parsing", () => {
    expect(normalizeThemeCommand("theme")).toEqual({ type: "toggle" });
    expect(normalizeThemeCommand("theme dark")).toEqual({
      type: "set",
      value: "dark",
    });
    expect(normalizeThemeCommand("theme light")).toEqual({
      type: "set",
      value: "light",
    });
    expect(normalizeThemeCommand("theme ")).toEqual({ type: "toggle" });
    expect(normalizeThemeCommand("theme invalid")).toBeNull();
  });

  it("autocompletes commands correctly", () => {
    const cmds = ["help", "hello", "projects", "resume"];

    // empty input returns empty
    expect(autocompleteCommand("", cmds)).toEqual([]);

    // single match
    expect(autocompleteCommand("p", cmds)).toEqual(["projects"]);
    expect(autocompleteCommand("projects", cmds)).toEqual(["projects"]);

    // multiple matches
    expect(autocompleteCommand("he", cmds)).toEqual(["help", "hello"]);

    // case insensitive
    expect(autocompleteCommand("P", cmds)).toEqual(["projects"]);

    // no matches
    expect(autocompleteCommand("z", cmds)).toEqual([]);
  });

  it("handles history navigation state correctly", () => {
    const history = ["ls", "clear", "help"];
    const buffer = "curr";

    // Up from empty index (bottom of history, index 3)
    let res = handleHistoryNavigation("ArrowUp", history, 3, buffer);
    expect(res).toEqual({ index: 2, value: "help" });

    // Up from middle index
    res = handleHistoryNavigation("ArrowUp", history, 2, buffer);
    expect(res).toEqual({ index: 1, value: "clear" });

    // Up from top index (0) should do nothing
    res = handleHistoryNavigation("ArrowUp", history, 0, buffer);
    expect(res).toBeNull();

    // Down from middle
    res = handleHistoryNavigation("ArrowDown", history, 1, buffer);
    expect(res).toEqual({ index: 2, value: "help" });

    // Down from last history item should restore buffer
    res = handleHistoryNavigation("ArrowDown", history, 2, buffer);
    expect(res).toEqual({ index: 3, value: "curr" });

    // Down from bottom should do nothing
    res = handleHistoryNavigation("ArrowDown", history, 3, buffer);
    expect(res).toBeNull();

    // Invalid key
    res = handleHistoryNavigation("Enter", history, 2, buffer);
    expect(res).toBeNull();
  });

  it("determines compact weather layout based on mobile flag or width", () => {
    expect(shouldUseCompactWeatherLayout(true, 1200)).toBe(true); // Is mobile device
    expect(shouldUseCompactWeatherLayout(false, 800)).toBe(true); // < 900
    expect(shouldUseCompactWeatherLayout(false, 900)).toBe(true); // <= 900
    expect(shouldUseCompactWeatherLayout(false, 901)).toBe(false); // > 900
  });
});
