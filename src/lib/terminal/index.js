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
  "help",
  "ls",
  "projects",
  "repo",
  "resume",
  "theme",
  "weather",
  "whoami",
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
