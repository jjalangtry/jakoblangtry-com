export const COMMAND_LIST = [
  "alias",
  "banner",
  "blog",
  "calc",
  "clear",
  "contact",
  "converter",
  "countdown",
  "curl",
  "qr",
  "date",
  "echo",
  "email",
  "experience",
  "flip",
  "fortune",
  "github",
  "grep",
  "help",
  "history",
  "hostname",
  "ls",
  "man",
  "matrix",
  "neofetch",
  "projects",
  "pwd",
  "repo",
  "repos",
  "resume",
  "skills",
  "snake",
  "stats",
  "theme",
  "uptime",
  "weather",
  "which",
  "whoami",
  "write",
  "edit",
  "export",
  "rss",
  "login",
  "logout",
  "sudo",
  "cd",
  "close",
  "exit",
];

export function buildProjectsListOutput(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return "No projects are configured yet.";
  }

  return (
    "Available projects:\n" +
    projects
      .map((project, index) => {
        const description = project.description
          ? ` (${project.description})`
          : "";
        return `${index + 1}. ${project.name} - ${project.url}${description}`;
      })
      .join("\n")
  );
}

export function findProjectByCommand(command, projects) {
  const normalized = String(command || "")
    .trim()
    .toLowerCase();
  if (!normalized || !Array.isArray(projects)) return null;

  return (
    projects.find((project) => {
      if (!project || !project.name) return false;
      return project.name.toLowerCase() === normalized;
    }) || null
  );
}

export function celsiusToFahrenheit(celsius) {
  return Math.round((Number(celsius) * 9) / 5 + 32);
}

export function getOutputA11yAttrs(className) {
  if (className === "error-text") {
    return { role: "alert", "aria-live": "assertive" };
  }
  return {};
}

export function normalizeThemeCommand(input) {
  const text = String(input || "")
    .toLowerCase()
    .trim();
  if (text === "theme") return { type: "toggle" };
  if (text.startsWith("theme ")) {
    const arg = text.slice(6).trim();
    if (arg === "dark" || arg === "light") {
      return { type: "set", value: arg };
    }
  }
  return null;
}

export function autocompleteCommand(input, commandList) {
  if (!input) return [];
  const normalized = input.toLowerCase();
  return commandList.filter((cmd) => cmd.startsWith(normalized));
}

export function handleHistoryNavigation(
  key,
  history,
  currentIndex,
  currentBuffer,
) {
  if (key === "ArrowUp") {
    if (currentIndex > 0) {
      return { index: currentIndex - 1, value: history[currentIndex - 1] };
    }
    return null;
  }
  if (key === "ArrowDown") {
    if (currentIndex < history.length - 1) {
      return { index: currentIndex + 1, value: history[currentIndex + 1] };
    } else if (currentIndex === history.length - 1) {
      return { index: history.length, value: currentBuffer };
    }
    return null;
  }
  return null;
}

export function shouldUseCompactWeatherLayout(isMobile, windowWidth) {
  return isMobile || windowWidth <= 900;
}

export function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? "s" : ""}`);
  parts.push(`${seconds} sec${seconds !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

export function formatHistoryOutput(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No commands in history.";
  }
  return history
    .map((cmd, i) => `  ${String(i + 1).padStart(4)}  ${cmd}`)
    .join("\n");
}

export function globToRegex(pattern) {
  let regex = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") regex += ".*";
    else if (ch === "?") regex += ".";
    else if ("[\\^$.|+(){}".includes(ch)) regex += "\\" + ch;
    else regex += ch;
  }
  regex += "$";
  return new RegExp(regex, "i");
}

export function expandGlob(pattern, items) {
  if (!pattern || !Array.isArray(items)) return [];
  if (!pattern.includes("*") && !pattern.includes("?")) {
    return items.filter((item) => item.toLowerCase() === pattern.toLowerCase());
  }
  const regex = globToRegex(pattern);
  return items.filter((item) => regex.test(item));
}

export function parseGrepArgs(argsString) {
  const result = {
    pattern: "",
    ignoreCase: true,
    invert: false,
    lineNumbers: false,
    count: false,
  };
  if (!argsString) return result;

  const tokens = [];
  let current = "";
  let inQuote = null;
  for (let i = 0; i < argsString.length; i++) {
    const ch = argsString[i];
    if ((ch === '"' || ch === "'") && !inQuote) {
      inQuote = ch;
    } else if (ch === inQuote) {
      inQuote = null;
    } else if (ch === " " && !inQuote && current) {
      tokens.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("-") && t.length > 1 && !t.startsWith("--")) {
      for (let j = 1; j < t.length; j++) {
        const flag = t[j];
        if (flag === "i") result.ignoreCase = true;
        else if (flag === "v") result.invert = true;
        else if (flag === "n") result.lineNumbers = true;
        else if (flag === "c") result.count = true;
        else if (flag === "E") {
          /* extended regex, default behavior */
        }
      }
    } else if (!result.pattern) {
      result.pattern = t;
    }
  }
  return result;
}

export function grepFilter(text, pattern, options = {}) {
  if (!text || !pattern) return [];
  const lines = typeof text === "string" ? text.split("\n") : text;

  let regex;
  try {
    const flags = options.ignoreCase !== false ? "i" : "";
    regex = new RegExp(pattern, flags);
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = options.ignoreCase !== false ? "i" : "";
    regex = new RegExp(escaped, flags);
  }

  const results = [];
  lines.forEach((line, i) => {
    const matches = regex.test(line);
    const include = options.invert ? !matches : matches;
    if (include) {
      if (options.lineNumbers) {
        results.push(`${String(i + 1).padStart(4)}:${line}`);
      } else {
        results.push(line);
      }
    }
  });

  if (options.count) {
    return [`${results.length}`];
  }
  return results;
}

export function parsePipeline(input) {
  if (!input || typeof input !== "string") return [input || ""];
  const segments = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
    } else if (ch === "|" && !inSingle && !inDouble) {
      segments.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) segments.push(current.trim());
  return segments.filter(Boolean);
}

export function buildNeofetchOutput(version, theme, commandCount, uptimeStr) {
  const info = [
    "guest@jjalangtry.com",
    "─────────────────────",
    `Site:     jakoblangtry.com v${version}`,
    "Engine:   Astro",
    "Shell:    terminal.js",
    `Theme:    ${theme}`,
    `Uptime:   ${uptimeStr}`,
    `Commands: ${commandCount} available`,
    "Font:     JetBrains Mono",
  ];

  const art = [
    "  ┌─────────┐",
    "  │ >_      │",
    "  │         │",
    "  │         │",
    "  └─────────┘",
  ];

  const lines = [];
  const maxLines = Math.max(art.length, info.length);
  for (let i = 0; i < maxLines; i++) {
    const artLine = (i < art.length ? art[i] : "").padEnd(17);
    const infoLine = i < info.length ? info[i] : "";
    lines.push(`${artLine}${infoLine}`);
  }
  return lines.join("\n");
}

export function buildSkillsOutput(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return "No skills data available.";
  }
  const barWidth = 20;
  const lines = [];
  categories.forEach((cat) => {
    lines.push(
      `── ${cat.name} ${"─".repeat(Math.max(0, 50 - cat.name.length))}`,
    );
    (cat.skills || []).forEach((s) => {
      const level = Math.max(0, Math.min(100, Number(s.level) || 0));
      const filled = Math.round((level / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      const name = (s.name || "").padEnd(16);
      lines.push(`  ${name} ${bar} ${level}%`);
      if (s.note) {
        lines.push(`  ${"".padEnd(16)} └ ${s.note}`);
      }
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

export function buildExperienceOutput(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "No experience data available.";
  }
  const lines = [];
  entries.forEach((e, i) => {
    const prefix = i === entries.length - 1 ? "└" : "├";
    const cont = i === entries.length - 1 ? " " : "│";
    lines.push(`${prefix}─ ${e.title}`);
    lines.push(`${cont}  ${e.org}  ·  ${e.period}`);
    if (e.description) {
      lines.push(`${cont}  ${e.description}`);
    }
    if (e.tags && e.tags.length > 0) {
      lines.push(`${cont}  [${e.tags.join("] [")}]`);
    }
    if (i < entries.length - 1) lines.push("│");
  });
  return lines.join("\n");
}

export function estimateReadingTime(content) {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function buildBlogListOutput(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return "No blog posts yet.";
  }
  const lines = ["Available posts:\n"];
  posts.forEach((p) => {
    const mins = estimateReadingTime(p.content);
    lines.push(
      `  ${p.date || ""}  ${p.title || "Untitled"}  (${mins} min read)`,
    );
    lines.push(`  ${"".padEnd(12)}${p.summary || ""}`);
    lines.push(`  ${"".padEnd(12)}→ blog ${p.slug || ""}\n`);
  });
  lines.push("Read a post with: blog [slug]");
  return lines.join("\n");
}

export function buildBlogPostOutput(post) {
  if (!post) return null;
  const width = 60;
  const border = "─".repeat(width);
  const title = (post.title || "Untitled")
    .slice(0, width - 2)
    .padEnd(width - 1);
  const mins = estimateReadingTime(post.content);
  const dateLine = `${post.date || ""}  ·  ${mins} min read`;
  let output = `┌${border}┐\n`;
  output += `│ ${title}│\n`;
  output += `│ ${dateLine.padEnd(width - 1)}│\n`;
  output += `└${border}┘\n\n`;
  output += post.content || "";
  return output;
}

export function buildContactOutput() {
  return [
    "┌────────────────────────────────────────┐",
    "│          CONTACT INFORMATION           │",
    "├────────────────────────────────────────┤",
    "│  Email     jjalangtry@gmail.com        │",
    "│  GitHub    github.com/JJALANGTRY       │",
    "│  LinkedIn  linkedin.com/in/jjalangtry  │",
    "│  Website   jakoblangtry.com            │",
    "└────────────────────────────────────────┘",
  ].join("\n");
}

export function buildStatsOutput(stats) {
  const lines = [];
  lines.push("── Session Stats ─────────────────────────");
  lines.push(`  Commands this session:  ${stats.sessionCommands || 0}`);
  lines.push(`  Session uptime:        ${stats.uptime || "0s"}`);
  lines.push("");
  lines.push("── All-Time Stats ────────────────────────");
  lines.push(`  Total commands:        ${stats.totalCommands || 0}`);
  lines.push(`  Sessions:              ${stats.sessions || 1}`);
  lines.push(`  First visit:           ${stats.firstVisit || "today"}`);
  if (stats.topCommands && stats.topCommands.length > 0) {
    lines.push("");
    lines.push("── Top Commands ──────────────────────────");
    stats.topCommands.forEach((c) => {
      lines.push(`  ${c.name.padEnd(16)} ${c.count} times`);
    });
  }
  return lines.join("\n");
}

export function buildReposOutput(projectGroups) {
  const groups = projectGroups || {
    featured: [],
    contributions: [],
    github: [],
  };
  const featured = groups.featured || [];
  const contributions = groups.contributions || [];
  const github = groups.github || [];
  const total = featured.length + contributions.length + github.length;

  if (total === 0) {
    return "No repositories configured. Run 'projects' to see the projects pane.";
  }

  const W = 58;
  const pad = (s, n) =>
    String(s || "")
      .padEnd(n)
      .slice(0, n);
  const row = (content) => `│${pad(content, W)}│`;

  const formatProject = (p, isLast) => {
    const prefix = isLast ? "└─" : "├─";
    const name = p.name || "Untitled";
    const sub = p.url
      ? p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : "";
    const meta = [p.language, p.description].filter(Boolean).join(" · ") || sub;
    return [row(` ${prefix} ${name}`), row(`    ${meta}`)];
  };

  const lines = [];
  lines.push("┌" + "─".repeat(W) + "┐");
  lines.push(row("   GitHub Repositories & Contributions"));
  lines.push("├" + "─".repeat(W) + "┤");

  if (featured.length > 0) {
    lines.push(row(" ▓ DEPLOYED "));
    featured.forEach((p, i) => {
      const isLast =
        i === featured.length - 1 &&
        contributions.length === 0 &&
        github.length === 0;
      formatProject(p, isLast).forEach((l) => lines.push(l));
    });
    if (contributions.length > 0 || github.length > 0) {
      lines.push(row(""));
    }
  }

  if (contributions.length > 0) {
    lines.push(row(" ▓ CONTRIBUTIONS "));
    contributions.forEach((p, i) => {
      const lastInSection =
        i === contributions.length - 1 && github.length === 0;
      formatProject(p, lastInSection).forEach((l) => lines.push(l));
    });
    if (github.length > 0) {
      lines.push(row(""));
    }
  }

  if (github.length > 0) {
    lines.push(row(" ▓ MORE REPOS "));
    github.forEach((p, i) => {
      formatProject(p, i === github.length - 1).forEach((l) => lines.push(l));
    });
  }

  lines.push("├" + "─".repeat(W) + "┤");
  lines.push(row(" Tip: 'projects' for full pane  ·  github.com/JJALANGTRY"));
  lines.push("└" + "─".repeat(W) + "┘");
  return lines.join("\n");
}

/**
 * Builds a terminal-style ASCII contribution chart from GitHub contributions API data.
 * @param {Array<{date: string, count: number, level: number}>} contributions - Array of {date, count, level}
 * @returns {string} ASCII grid (7 rows × 53 weeks, GitHub-style layout)
 */
export function buildContributionChartAscii(contributions) {
  const LEVEL_CHARS = [" ", "░", "▒", "▓", "█"];
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dateToLevel = new Map();
  if (Array.isArray(contributions)) {
    for (const c of contributions) {
      if (c && c.date != null) {
        dateToLevel.set(c.date, Math.min(4, Math.max(0, Number(c.level) || 0)));
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;

  // 53 weeks × 7 days, oldest week on left
  const totalDays = 53 * 7;
  const startDate = new Date(today.getTime() - (totalDays - 1) * dayMs);

  const grid = [];
  for (let row = 0; row < 7; row++) {
    grid[row] = [];
    for (let col = 0; col < 53; col++) {
      const dayOffset = col * 7 + row;
      const d = new Date(startDate.getTime() + dayOffset * dayMs);
      const dateStr = d.toISOString().slice(0, 10);
      const level = dateToLevel.get(dateStr) ?? 0;
      grid[row][col] = LEVEL_CHARS[level];
    }
  }

  const lines = [];
  const W = 60;
  const pad = (s, n) =>
    String(s || "")
      .padEnd(n)
      .slice(0, n);
  const row = (content) => `│${pad(content, W)}│`;

  lines.push("┌" + "─".repeat(W) + "┐");
  lines.push(row("   Contribution chart  Less  ░ ▒ ▓ █  More"));
  lines.push("├" + "─".repeat(W) + "┤");

  for (let r = 0; r < 7; r++) {
    const label = DAY_LABELS[r] + " ";
    const cells = grid[r].join("");
    lines.push(row(` ${label} ${cells}`));
  }

  lines.push("├" + "─".repeat(W) + "┤");
  lines.push(row("   github.com/JJALANGTRY  ·  past 53 weeks"));
  lines.push("└" + "─".repeat(W) + "┘");
  return lines.join("\n");
}

export function formatManPage(command, helpEntry) {
  if (!helpEntry) return null;
  const header = `${command.toUpperCase()}(1)`;
  const center = "jakoblangtry.com";
  const pad = Math.max(1, 30 - header.length);
  const topLine = `${header}${" ".repeat(pad)}${center}${" ".repeat(pad)}${header}`;

  let page = `${topLine}\n\n`;
  page += `NAME\n       ${command} - ${helpEntry.desc}\n\n`;
  page += `SYNOPSIS\n       ${helpEntry.usage}\n\n`;
  page += `DESCRIPTION\n       ${helpEntry.desc}\n\n`;

  if (helpEntry.examples && helpEntry.examples.length > 0) {
    page += "EXAMPLES\n";
    helpEntry.examples.forEach((ex) => {
      page += `       ${ex}\n`;
    });
    page += "\n";
  }

  if (helpEntry.notes) {
    page += `NOTES\n       ${helpEntry.notes}\n\n`;
  }

  page += "SEE ALSO\n       help(1), man(1)";
  return page;
}

// ── Fortune quotes ────────────────────────────────────────────

export const FORTUNE_QUOTES = [
  '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Experience is the name everyone gives to their mistakes." — Oscar Wilde',
  '"In order to be irreplaceable, one must always be different." — Coco Chanel',
  '"Java is to JavaScript what car is to carpet." — Chris Heilmann',
  '"Knowledge is power." — Francis Bacon',
  '"Fix the cause, not the symptom." — Steve Maguire',
  '"Simplicity is the soul of efficiency." — Austin Freeman',
  '"Make it work, make it right, make it fast." — Kent Beck',
  '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
  '"Before software can be reusable it first has to be usable." — Ralph Johnson',
  '"The best error message is the one that never shows up." — Thomas Fuchs',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"Programs must be written for people to read, and only incidentally for machines to execute." — Harold Abelson',
  '"Truth can only be found in one place: the code." — Robert C. Martin',
  '"The most disastrous thing that you can ever learn is your first programming language." — Alan Kay',
  '"Software is a great combination between artistry and engineering." — Bill Gates',
  '"Measuring programming progress by lines of code is like measuring aircraft building progress by weight." — Bill Gates',
  '"Every great developer you know got there by solving problems they were unqualified to solve until they actually did it." — Patrick McKenzie',
  '"The computer was born to solve problems that did not exist before." — Bill Gates',
  '"It works on my machine." — Every developer, at some point',
  '"There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton',
  '"The best thing about a boolean is even if you are wrong, you are only off by a bit." — Anonymous',
  '"A language that doesn\'t affect the way you think about programming is not worth knowing." — Alan Perlis',
  '"Debugging is twice as hard as writing the code in the first place." — Brian Kernighan',
  '"Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." — Antoine de Saint-Exupéry',
  '"The function of good software is to make the complex appear to be simple." — Grady Booch',
  '"If debugging is the process of removing bugs, then programming must be the process of putting them in." — Edsger Dijkstra',
  '"One of my most productive days was throwing away 1000 lines of code." — Ken Thompson',
  '"Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live." — John Woods',
];

export function getRandomFortune() {
  return FORTUNE_QUOTES[Math.floor(Math.random() * FORTUNE_QUOTES.length)];
}

// ── Flip text ─────────────────────────────────────────────────

const FLIP_MAP = {
  a: "\u0250",
  b: "q",
  c: "\u0254",
  d: "p",
  e: "\u01DD",
  f: "\u025F",
  g: "\u0183",
  h: "\u0265",
  i: "\u0131",
  j: "\u027E",
  k: "\u029E",
  l: "l",
  m: "\u026F",
  n: "u",
  o: "o",
  p: "d",
  q: "b",
  r: "\u0279",
  s: "s",
  t: "\u0287",
  u: "n",
  v: "\u028C",
  w: "\u028D",
  x: "x",
  y: "\u028E",
  z: "z",
  A: "\u2200",
  B: "q",
  C: "\u0186",
  D: "p",
  E: "\u018E",
  F: "\u2132",
  G: "\u2141",
  H: "H",
  I: "I",
  J: "\u017F",
  K: "\u029E",
  L: "\u02E5",
  M: "W",
  N: "N",
  O: "O",
  P: "\u0500",
  Q: "\u038C",
  R: "\u1D1A",
  S: "S",
  T: "\u22A5",
  U: "\u2229",
  V: "\u039B",
  W: "M",
  X: "X",
  Y: "\u2144",
  Z: "Z",
  0: "0",
  1: "\u21C2",
  2: "\u1105",
  3: "\u0190",
  4: "\u3123",
  5: "\u03DB",
  6: "9",
  7: "\u3125",
  8: "8",
  9: "6",
  ".": "\u02D9",
  ",": "'",
  "'": ",",
  '"': "\u201E",
  "`": ",",
  "!": "\u00A1",
  "?": "\u00BF",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  _: "\u203E",
  "&": "\u214B",
  " ": " ",
};

export function flipText(text) {
  if (!text) return "";
  return text
    .split("")
    .map((ch) => FLIP_MAP[ch] || ch)
    .reverse()
    .join("");
}

// ── Calc ──────────────────────────────────────────────────────

export function safeCalc(expression) {
  if (!expression || typeof expression !== "string") {
    return { error: "No expression provided." };
  }

  let expr = expression
    .replace(/\s+/g, "")
    .replace(/\*\*/g, "^")
    .replace(/pi/gi, String(Math.PI))
    .replace(/e(?![0-9a-z])/gi, String(Math.E));

  const allowed = /^[0-9+\-*/().^%,sincotaqrlgb ]+$/i;
  if (!allowed.test(expr)) {
    return { error: "Invalid characters in expression." };
  }

  expr = expr
    .replace(/sqrt\(/gi, "Math.sqrt(")
    .replace(/abs\(/gi, "Math.abs(")
    .replace(/sin\(/gi, "Math.sin(")
    .replace(/cos\(/gi, "Math.cos(")
    .replace(/tan\(/gi, "Math.tan(")
    .replace(/log\(/gi, "Math.log10(")
    .replace(/ln\(/gi, "Math.log(")
    .replace(/\^/g, "**");

  try {
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) {
      return { error: "Result is not a finite number." };
    }
    const display =
      Number.isInteger(result) || String(result).length <= 15
        ? result
        : Number(result.toPrecision(12));
    return { value: display };
  } catch {
    return { error: "Could not evaluate expression." };
  }
}

// ── Countdown ASCII digits ────────────────────────────────────

const BIG_DIGITS = {
  0: ["┌───┐", "│   │", "│   │", "│   │", "└───┘"],
  1: ["    ╷", "    │", "    │", "    │", "    ╵"],
  2: ["┌───┐", "    │", "├───┘", "│    ", "└───┘"],
  3: ["┌───┐", "    │", " ───┤", "    │", "└───┘"],
  4: ["╷   ╷", "│   │", "└───┤", "    │", "    ╵"],
  5: ["┌───┐", "│    ", "└───┐", "    │", "└───┘"],
  6: ["┌───┐", "│    ", "├───┐", "│   │", "└───┘"],
  7: ["┌───┐", "    │", "    │", "    │", "    ╵"],
  8: ["┌───┐", "│   │", "├───┤", "│   │", "└───┘"],
  9: ["┌───┐", "│   │", "└───┤", "    │", "└───┘"],
  ":": ["     ", "  ●  ", "     ", "  ●  ", "     "],
};

export function renderBigTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  const chars = `${m}:${s}`.split("");
  const lines = [];
  for (let row = 0; row < 5; row++) {
    lines.push(chars.map((ch) => BIG_DIGITS[ch][row]).join(" "));
  }
  return lines.join("\n");
}
