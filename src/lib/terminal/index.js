export const COMMAND_LIST = [
  "banner",
  "clear",
  "converter",
  "curl",
  "qr",
  "date",
  "echo",
  "email",
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
