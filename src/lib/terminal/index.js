export const COMMAND_LIST = [
  "banner",
  "blog",
  "clear",
  "contact",
  "converter",
  "curl",
  "qr",
  "date",
  "echo",
  "email",
  "experience",
  "github",
  "grep",
  "help",
  "history",
  "ls",
  "man",
  "neofetch",
  "projects",
  "repo",
  "resume",
  "skills",
  "snake",
  "stats",
  "theme",
  "uptime",
  "weather",
  "whoami",
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

export function grepFilter(text, pattern) {
  if (!text || !pattern) return [];
  const lines = typeof text === "string" ? text.split("\n") : text;
  const lower = pattern.toLowerCase();
  return lines.filter((line) => line.toLowerCase().includes(lower));
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
      `── ${cat.name} ${"─".repeat(Math.max(0, 40 - cat.name.length))}`,
    );
    (cat.skills || []).forEach((s) => {
      const filled = Math.round((s.level / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      const name = s.name.padEnd(16);
      lines.push(`  ${name} ${bar} ${s.level}%`);
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

export function buildBlogListOutput(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return "No blog posts yet.";
  }
  const lines = ["Available posts:\n"];
  posts.forEach((p) => {
    lines.push(`  ${p.date}  ${p.title}`);
    lines.push(`  ${"".padEnd(12)}${p.summary}`);
    lines.push(`  ${"".padEnd(12)}→ blog ${p.slug}\n`);
  });
  lines.push("Read a post with: blog [slug]");
  return lines.join("\n");
}

export function buildBlogPostOutput(post) {
  if (!post) return null;
  const width = 60;
  const border = "─".repeat(width);
  let output = `┌${border}┐\n`;
  output += `│ ${post.title.padEnd(width - 1)}│\n`;
  output += `│ ${post.date.padEnd(width - 1)}│\n`;
  output += `└${border}┘\n\n`;
  output += post.content;
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

export function formatManPage(command, helpEntry) {
  if (!helpEntry) return null;
  const header = `${command.toUpperCase()}(1)`;
  const center = "jakoblangtry.com";
  const topLine = `${header}${" ".repeat(Math.max(1, 60 - header.length * 2 - center.length))}${center}${" ".repeat(Math.max(1, 60 - header.length * 2 - center.length))}${header}`;

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
