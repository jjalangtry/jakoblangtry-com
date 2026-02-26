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
  formatUptime,
  formatHistoryOutput,
  grepFilter,
  parsePipeline,
  buildNeofetchOutput,
  formatManPage,
  buildSkillsOutput,
  buildExperienceOutput,
  buildBlogListOutput,
  buildBlogPostOutput,
  buildContactOutput,
  buildStatsOutput,
} from "../../src/lib/terminal/index.js";

describe("terminal helpers", () => {
  it("includes core command surface", () => {
    expect(COMMAND_LIST).toContain("help");
    expect(COMMAND_LIST).toContain("projects");
    expect(COMMAND_LIST).toContain("weather");
    expect(COMMAND_LIST).toContain("sudo");
    expect(COMMAND_LIST).toContain("cd");
    expect(COMMAND_LIST).toContain("grep");
    expect(COMMAND_LIST).toContain("history");
    expect(COMMAND_LIST).toContain("man");
    expect(COMMAND_LIST).toContain("neofetch");
    expect(COMMAND_LIST).toContain("uptime");
    expect(COMMAND_LIST).toContain("blog");
    expect(COMMAND_LIST).toContain("contact");
    expect(COMMAND_LIST).toContain("experience");
    expect(COMMAND_LIST).toContain("skills");
    expect(COMMAND_LIST).toContain("snake");
    expect(COMMAND_LIST).toContain("stats");
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

  it("formats uptime from milliseconds", () => {
    expect(formatUptime(0)).toBe("0 secs");
    expect(formatUptime(1000)).toBe("1 sec");
    expect(formatUptime(5000)).toBe("5 secs");
    expect(formatUptime(65000)).toBe("1 min, 5 secs");
    expect(formatUptime(3661000)).toBe("1 hour, 1 min, 1 sec");
    expect(formatUptime(90061000)).toBe("1 day, 1 hour, 1 min, 1 sec");
  });

  it("formats uptime boundary values correctly", () => {
    // exactly 60 seconds = 1 min, 0 secs
    expect(formatUptime(60000)).toBe("1 min, 0 secs");
    // exactly 1 hour
    expect(formatUptime(3600000)).toBe("1 hour, 0 secs");
    // exactly 1 day
    expect(formatUptime(86400000)).toBe("1 day, 0 secs");
    // plural boundaries: 2 of everything
    expect(formatUptime(2 * 86400000 + 2 * 3600000 + 2 * 60000 + 2000)).toBe(
      "2 days, 2 hours, 2 mins, 2 secs",
    );
    // sub-second is floored to 0
    expect(formatUptime(500)).toBe("0 secs");
  });

  it("formats command history output", () => {
    expect(formatHistoryOutput([])).toBe("No commands in history.");
    expect(formatHistoryOutput(null)).toBe("No commands in history.");
    const output = formatHistoryOutput(["ls", "help", "whoami"]);
    expect(output).toContain("1  ls");
    expect(output).toContain("2  help");
    expect(output).toContain("3  whoami");
  });

  it("formats single-item history and pads indices", () => {
    expect(formatHistoryOutput(["solo"])).toBe("     1  solo");

    // double-digit indices stay right-aligned
    const items = Array.from({ length: 12 }, (_, i) => `cmd${i}`);
    const output = formatHistoryOutput(items);
    expect(output).toContain("   1  cmd0");
    expect(output).toContain("  12  cmd11");
  });

  it("filters text with grepFilter", () => {
    expect(grepFilter("", "foo")).toEqual([]);
    expect(grepFilter("hello\nworld", "")).toEqual([]);
    expect(grepFilter("hello\nworld\nhello world", "hello")).toEqual([
      "hello",
      "hello world",
    ]);
    // case insensitive
    expect(grepFilter("Hello\nWORLD", "hello")).toEqual(["Hello"]);
    // array input
    expect(grepFilter(["abc", "def", "abcdef"], "abc")).toEqual([
      "abc",
      "abcdef",
    ]);
  });

  it("grepFilter handles no-match and single-line input", () => {
    expect(grepFilter("hello\nworld", "xyz")).toEqual([]);
    expect(grepFilter("single line", "single")).toEqual(["single line"]);
    // null text
    expect(grepFilter(null, "pattern")).toEqual([]);
  });

  it("parses pipeline segments", () => {
    expect(parsePipeline("help")).toEqual(["help"]);
    expect(parsePipeline("help | grep weather")).toEqual([
      "help",
      "grep weather",
    ]);
    expect(parsePipeline("ls | grep pro | grep ject")).toEqual([
      "ls",
      "grep pro",
      "grep ject",
    ]);
    // respects quotes
    expect(parsePipeline('echo "a | b"')).toEqual(['echo "a | b"']);
    expect(parsePipeline("echo 'a | b'")).toEqual(["echo 'a | b'"]);
    // empty/null input
    expect(parsePipeline("")).toEqual([""]);
    expect(parsePipeline(null)).toEqual([""]);
  });

  it("parsePipeline handles trailing pipes and empty segments", () => {
    // trailing pipe produces only the non-empty segment
    expect(parsePipeline("help |")).toEqual(["help"]);
    expect(parsePipeline("help |  ")).toEqual(["help"]);
    // leading pipe
    expect(parsePipeline("| grep foo")).toEqual(["grep foo"]);
    // double pipe (empty segment between)
    expect(parsePipeline("a || b")).toEqual(["a", "b"]);
    // whitespace-only input
    expect(parsePipeline("   ")).toEqual([]);
  });

  it("builds neofetch output with site info", () => {
    const output = buildNeofetchOutput("2.4.7", "Dark", 26, "3m 22s");
    expect(output).toContain("guest@jjalangtry.com");
    expect(output).toContain("jakoblangtry.com v2.4.7");
    expect(output).toContain("Astro");
    expect(output).toContain("terminal.js");
    expect(output).toContain("Dark");
    expect(output).toContain("3m 22s");
    expect(output).toContain("26 available");
    expect(output).toContain("JetBrains Mono");
    // Contains ASCII art
    expect(output).toContain(">_");
  });

  it("neofetch output has correct line count and alignment", () => {
    const output = buildNeofetchOutput("1.0.0", "Light", 10, "0s");
    const lines = output.split("\n");
    // 9 info lines > 5 art lines, so 9 lines total
    expect(lines.length).toBe(9);
    // Every line should have the art column padded to 17 chars
    lines.forEach((line) => {
      expect(line.length).toBeGreaterThanOrEqual(17);
    });
    // Light theme shows up
    expect(output).toContain("Theme:    Light");
  });

  it("formats man pages for commands", () => {
    const entry = {
      desc: "Display a line of text in the terminal.",
      usage: "echo [text]",
      examples: ["echo Hello, World!"],
      notes: "If no text is provided, usage information will be displayed.",
    };
    const page = formatManPage("echo", entry);
    expect(page).toContain("ECHO(1)");
    expect(page).toContain("jakoblangtry.com");
    expect(page).toContain("NAME");
    expect(page).toContain("echo - Display a line of text");
    expect(page).toContain("SYNOPSIS");
    expect(page).toContain("echo [text]");
    expect(page).toContain("EXAMPLES");
    expect(page).toContain("echo Hello, World!");
    expect(page).toContain("NOTES");
    expect(page).toContain("SEE ALSO");

    // null entry
    expect(formatManPage("unknown", null)).toBeNull();
  });

  it("formats man page with missing optional fields", () => {
    // no examples, no notes
    const minimal = { desc: "A command.", usage: "cmd" };
    const page = formatManPage("cmd", minimal);
    expect(page).toContain("CMD(1)");
    expect(page).toContain("NAME");
    expect(page).toContain("cmd - A command.");
    expect(page).toContain("SYNOPSIS");
    expect(page).not.toContain("EXAMPLES");
    expect(page).not.toContain("NOTES");
    expect(page).toContain("SEE ALSO");

    // empty examples array
    const emptyEx = { desc: "X.", usage: "x", examples: [], notes: "N." };
    const page2 = formatManPage("x", emptyEx);
    expect(page2).not.toContain("EXAMPLES");
    expect(page2).toContain("NOTES");
  });

  it("autocompletes new commands from real COMMAND_LIST", () => {
    expect(autocompleteCommand("gr", COMMAND_LIST)).toEqual(["grep"]);
    expect(autocompleteCommand("hi", COMMAND_LIST)).toEqual(["history"]);
    expect(autocompleteCommand("ne", COMMAND_LIST)).toEqual(["neofetch"]);
    expect(autocompleteCommand("up", COMMAND_LIST)).toEqual(["uptime"]);
    expect(autocompleteCommand("ma", COMMAND_LIST)).toEqual(["man"]);
    expect(autocompleteCommand("bl", COMMAND_LIST)).toEqual(["blog"]);
    expect(autocompleteCommand("sk", COMMAND_LIST)).toEqual(["skills"]);
    expect(autocompleteCommand("sn", COMMAND_LIST)).toEqual(["snake"]);
    expect(autocompleteCommand("con", COMMAND_LIST)).toEqual([
      "contact",
      "converter",
    ]);
    const hMatches = autocompleteCommand("h", COMMAND_LIST);
    expect(hMatches).toContain("help");
    expect(hMatches).toContain("history");
    expect(hMatches.length).toBe(2);
  });

  it("builds skills output with ASCII bar charts", () => {
    const cats = [
      {
        name: "Languages",
        skills: [
          { name: "JavaScript", level: 90 },
          { name: "Python", level: 50 },
        ],
      },
    ];
    const output = buildSkillsOutput(cats);
    expect(output).toContain("Languages");
    expect(output).toContain("JavaScript");
    expect(output).toContain("90%");
    expect(output).toContain("Python");
    expect(output).toContain("50%");
    expect(output).toContain("█");
    expect(output).toContain("░");

    expect(buildSkillsOutput([])).toBe("No skills data available.");
    expect(buildSkillsOutput(null)).toBe("No skills data available.");
  });

  it("builds experience timeline output", () => {
    const entries = [
      {
        title: "Engineer",
        org: "Acme",
        period: "2023-2024",
        description: "Built things.",
        tags: ["TypeScript"],
      },
      {
        title: "Student",
        org: "University",
        period: "2020-2023",
        description: "Studied.",
        tags: ["Education"],
      },
    ];
    const output = buildExperienceOutput(entries);
    expect(output).toContain("├─ Engineer");
    expect(output).toContain("Acme");
    expect(output).toContain("└─ Student");
    expect(output).toContain("[TypeScript]");
    expect(output).toContain("[Education]");

    expect(buildExperienceOutput([])).toBe("No experience data available.");
  });

  it("builds blog list output", () => {
    const posts = [
      {
        slug: "hello",
        title: "Hello World",
        date: "2025-01-01",
        summary: "First post.",
      },
    ];
    const output = buildBlogListOutput(posts);
    expect(output).toContain("Hello World");
    expect(output).toContain("2025-01-01");
    expect(output).toContain("First post.");
    expect(output).toContain("blog hello");

    expect(buildBlogListOutput([])).toBe("No blog posts yet.");
  });

  it("builds blog post output", () => {
    const post = {
      title: "My Post",
      date: "2025-01-01",
      content: "Body text here.",
    };
    const output = buildBlogPostOutput(post);
    expect(output).toContain("My Post");
    expect(output).toContain("2025-01-01");
    expect(output).toContain("Body text here.");
    expect(output).toContain("┌");
    expect(output).toContain("└");

    expect(buildBlogPostOutput(null)).toBeNull();
  });

  it("builds contact output", () => {
    const output = buildContactOutput();
    expect(output).toContain("jjalangtry@gmail.com");
    expect(output).toContain("JJALANGTRY");
    expect(output).toContain("linkedin.com/in/jjalangtry");
    expect(output).toContain("jakoblangtry.com");
  });

  it("builds stats output", () => {
    const stats = {
      sessionCommands: 5,
      uptime: "2m 30s",
      totalCommands: 42,
      sessions: 3,
      firstVisit: "2025-01-01",
      topCommands: [
        { name: "help", count: 10 },
        { name: "ls", count: 8 },
      ],
    };
    const output = buildStatsOutput(stats);
    expect(output).toContain("5");
    expect(output).toContain("2m 30s");
    expect(output).toContain("42");
    expect(output).toContain("3");
    expect(output).toContain("2025-01-01");
    expect(output).toContain("help");
    expect(output).toContain("10 times");
  });
});
