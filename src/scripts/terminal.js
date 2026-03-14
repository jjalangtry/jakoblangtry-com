import {
  formatUptime,
  formatHistoryOutput,
  grepFilter,
  parseGrepArgs,
  expandGlob,
  parsePipeline,
  buildNeofetchOutput,
  formatManPage,
  buildSkillsOutput,
  buildExperienceOutput,
  buildBlogListOutput,
  buildBlogPostOutput,
  buildContactOutput,
  buildStatsOutput,
  buildReposOutput,
  buildContributionChartAscii,
  getRandomFortune,
  flipText,
  safeCalc,
  renderBigTime,
} from "../lib/terminal/index.js";

// Global variables for managing input and command history
const sessionStartTime = Date.now();
let sessionCommandCount = 0;
let currentInput;
let cliOutput;
let inputLine;
let commandHistory = [];
let captureMode = false;
let capturedLines = [];
let snakeActive = false;
let snakeInterval = null;
let matrixActive = false;
let matrixInterval = null;
let countdownActive = false;
let countdownInterval = null;
let editorState = null; // null | { phase: "title" } | { phase: "body", title, lines } | { phase: "login" }
let isAdmin = false;

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function requiresAuth() {
  const hash = (window.ENV?.ADMIN_PASSWORD_HASH || "").trim();
  return hash.length > 0;
}

function isAuthenticated() {
  return isAdmin || !requiresAuth();
}

function checkAuth(commandName) {
  if (isAuthenticated()) return true;
  appendOutput(
    `Permission denied: '${commandName}' requires admin access. Use 'login' to authenticate.`,
    "error-text",
  );
  return false;
}

function loadLocalPosts() {
  try {
    const raw = localStorage.getItem("terminal-posts");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveLocalPosts(posts) {
  try {
    localStorage.setItem("terminal-posts", JSON.stringify(posts));
  } catch {
    // ignore
  }
}
function loadCustomWhoami() {
  try {
    return localStorage.getItem("terminal-whoami");
  } catch {
    return null;
  }
}
function saveCustomWhoami(text) {
  try {
    localStorage.setItem("terminal-whoami", text);
  } catch {
    // ignore
  }
}
function getAllPosts() {
  const staticPosts = terminalData.posts || [];
  const localPosts = loadLocalPosts();
  return [...staticPosts, ...localPosts];
}
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

// Stats persistence
function loadStats() {
  try {
    const raw = localStorage.getItem("terminal-stats");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveStats(stats) {
  try {
    localStorage.setItem("terminal-stats", JSON.stringify(stats));
  } catch {
    // ignore
  }
}
function trackCommand(cmd) {
  sessionCommandCount++;
  const stats = loadStats() || {
    totalCommands: 0,
    sessions: 0,
    firstVisit: new Date().toISOString().split("T")[0],
    commandCounts: {},
  };
  stats.totalCommands++;
  const base = cmd.split(" ")[0].toLowerCase();
  stats.commandCounts[base] = (stats.commandCounts[base] || 0) + 1;
  saveStats(stats);
}
function bumpSession() {
  const stats = loadStats() || {
    totalCommands: 0,
    sessions: 0,
    firstVisit: new Date().toISOString().split("T")[0],
    commandCounts: {},
  };
  stats.sessions++;
  saveStats(stats);
}
try {
  const savedHistory = localStorage.getItem("terminal-history");
  if (savedHistory) {
    commandHistory = JSON.parse(savedHistory);
  }
} catch (e) {
  // ignore
}
let historyIndex = commandHistory.length;
let currentInputBuffer = "";
let cursor; // Global cursor element
let isMobileDevice = false; // Flag to track if we're on a mobile device

const DEFAULT_SITE_CONFIG = {
  resumeUrl: "https://resume.jjalangtry.com",
};

const DEFAULT_PROJECTS = [
  { name: "Converter", url: "https://convert.jjalangtry.com" },
];

// Data is embedded at build time by TerminalPanel.astro via a JSON script tag.
// Falls back to defaults if the tag is missing (shouldn't happen in normal use).
function loadTerminalDataFromDOM() {
  const el = document.getElementById("terminal-data");
  const defaults = {
    siteConfig: { ...DEFAULT_SITE_CONFIG },
    projects: [...DEFAULT_PROJECTS],
    projectGroups: { featured: [], contributions: [], github: [] },
    skills: [],
    experience: [],
    posts: [],
    version: "2.4.6",
  };
  if (!el) return defaults;
  try {
    const raw = JSON.parse(el.textContent || "{}");
    return {
      siteConfig: { ...DEFAULT_SITE_CONFIG, ...(raw.siteConfig || {}) },
      projects:
        Array.isArray(raw.projects) && raw.projects.length > 0
          ? raw.projects
          : [...DEFAULT_PROJECTS],
      projectGroups: raw.projectGroups || defaults.projectGroups,
      skills: raw.skills || [],
      experience: raw.experience || [],
      posts: raw.posts || [],
      version: raw.version || defaults.version,
    };
  } catch {
    return defaults;
  }
}

const terminalData = loadTerminalDataFromDOM();

// Load terminal logic functions. In a real module setup we would import, but
// for a vanilla script we need to ensure the logic exists here if not bundled.
// To keep things simple, we keep the COMMAND_LIST local but synced.
const commandList = [
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
  "repos",
  "repo",
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

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      theme === "light" ? "#f5f5f0" : "#000000",
    );
  }
  localStorage.setItem("terminal-theme", theme);
}

function getCurrentTheme() {
  return document.body.classList.contains("light-theme") ? "light" : "dark";
}

function toggleTheme() {
  const next = getCurrentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

// Data is loaded from the DOM at module init — no runtime fetch needed.

/**
 * Detects the operating system of the client.
 * @returns {string} The name of the operating system.
 */
function detectOS() {
  const platform = navigator.platform.toLowerCase();
  if (platform.indexOf("win") !== -1) return "windows";
  if (platform.indexOf("mac") !== -1) return "mac";
  if (platform.indexOf("linux") !== -1) return "linux";
  if (platform.indexOf("android") !== -1) return "android";
  if (platform.indexOf("ios") !== -1) return "ios";
  return "unknown";
}

/**
 * Checks if the current device is likely a mobile device based on user agent.
 * @returns {boolean} True if the device is likely mobile, false otherwise.
 */
function isMobile() {
  // Check user agent for common mobile identifiers
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent,
  );
}

/**
 * Focuses the terminal input element and positions the cursor at the end.
 * Ensures the custom cursor position is updated if available.
 */
function focusTerminalInput() {
  if (currentInput) {
    currentInput.focus();
    // Position cursor at the end
    const length = currentInput.value.length;
    currentInput.setSelectionRange(length, length);
    // Trigger any cursor update function if defined
    if (typeof updateCursorPosition === "function") {
      updateCursorPosition();
    }
  }
}

function shouldAutoFocusTerminal() {
  // Avoid forcing focus on touch-first devices where virtual keyboard popup is disruptive.
  return window.matchMedia("(pointer: fine)").matches;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Initialize the terminal interface once the DOM is fully loaded.
// Theme, bio typing, and mobile detection are handled by BaseLayout and ProfilePanel.
document.addEventListener("DOMContentLoaded", function () {
  isMobileDevice = isMobile();
  bumpSession();

  enableTextSelection();

  initCLI();

  if (shouldAutoFocusTerminal()) {
    setTimeout(focusTerminalInput, 100);
  }

  // Auto-open projects pane if navigated to /#projects
  if (window.location.hash === "#projects") {
    setTimeout(openProjectsPane, 300);
  }

  document.addEventListener("click", function (e) {
    const terminal = document.querySelector(".terminal");
    if (!terminal || !currentInput) return;

    if (terminal.contains(e.target)) {
      if (e.target.closest("a, button, input, textarea, select")) return;
      if (window.getSelection().toString().length > 0) return;
      if (currentInput) {
        setTimeout(focusTerminalInput, 10);
      }
    }
  });
});

// Bio typing animation is handled by ProfilePanel.astro.

/**
 * Enables text selection within the terminal output area using CSS properties.
 */
function enableTextSelection() {
  const cliOutput = document.getElementById("cli-output");
  if (cliOutput) {
    cliOutput.style.userSelect = "text";
    cliOutput.style.webkitUserSelect = "text";
    cliOutput.style.mozUserSelect = "text";
    cliOutput.style.msUserSelect = "text";
  }
}

/**
 * Creates a new input line for the terminal interface.
 * @returns {Object} An object containing the input line and input element.
 */
function createInputLine() {
  const inputLine = document.createElement("div");
  inputLine.className = "terminal-input-line";
  const prompt = document.createElement("span");
  prompt.className = "prompt";
  const user = isAdmin ? "admin" : "guest";
  prompt.textContent = `${user}@jjalangtry.com:~$ `;

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "input-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "cli-input";
  input.setAttribute("aria-label", "Terminal command input");
  input.setAttribute("aria-describedby", "terminal-help-hint");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("autocomplete", "off");

  const cursor = document.createElement("span");
  cursor.className = "terminal-cursor";

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(cursor);

  inputLine.appendChild(prompt);
  inputLine.appendChild(inputWrapper);

  if (shouldAutoFocusTerminal()) {
    input.focus();
  }
  currentInput = input;
  return { inputLine, input };
}

// ── Tmux split pane ───────────────────────────────────────────

let tmuxActive = false;

function renderProjectGroup(container, title, projects) {
  if (!projects || projects.length === 0) return;
  const section = document.createElement("div");
  section.className = "proj-section";

  const header = document.createElement("div");
  header.className = "proj-section-header";
  header.textContent = `── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`;
  section.appendChild(header);

  projects.forEach((p) => {
    const row = document.createElement("a");
    row.className = "proj-item";
    row.href = p.url;
    row.target = "_blank";
    row.rel = "noopener noreferrer";

    const name = document.createElement("span");
    name.className = "proj-item-name";
    name.textContent = p.name;
    row.appendChild(name);

    if (p.language) {
      const lang = document.createElement("span");
      lang.className = "proj-item-lang";
      lang.textContent = p.language;
      row.appendChild(lang);
    }

    if (p.description) {
      const desc = document.createElement("span");
      desc.className = "proj-item-desc";
      desc.textContent = p.description;
      row.appendChild(desc);
    }

    const url = document.createElement("span");
    url.className = "proj-item-url";
    url.textContent = p.url.replace("https://", "").replace("http://", "");
    row.appendChild(url);

    section.appendChild(row);
  });

  container.appendChild(section);
}

function openProjectsPane() {
  if (tmuxActive) return;
  tmuxActive = true;

  const terminal = document.getElementById("main-terminal");
  if (!terminal) return;

  terminal.classList.add("tmux-active");

  const layout = document.createElement("div");
  layout.className = "tmux-layout";
  layout.id = "tmux-layout";

  // Move existing terminal content into the top pane
  const topPane = document.createElement("div");
  topPane.className = "tmux-pane tmux-pane-terminal";
  while (terminal.firstChild) {
    topPane.appendChild(terminal.firstChild);
  }
  layout.appendChild(topPane);

  // Bottom pane: projects
  const bottomPane = document.createElement("div");
  bottomPane.className = "tmux-pane tmux-pane-projects";

  const groups = terminalData.projectGroups;
  renderProjectGroup(bottomPane, "Deployed", groups.featured);
  renderProjectGroup(bottomPane, "Contributions", groups.contributions);
  renderProjectGroup(bottomPane, "GitHub Repos", groups.github);

  const hint = document.createElement("div");
  hint.className = "proj-hint";
  hint.textContent = "Type 'close' or press Ctrl+B then q to close this pane";
  bottomPane.appendChild(hint);

  layout.appendChild(bottomPane);

  // Status bar
  const statusBar = document.createElement("div");
  statusBar.className = "tmux-status-bar";
  statusBar.innerHTML =
    `<span class="tmux-win">0:terminal</span>` +
    `<span class="tmux-win tmux-win-active">1:projects</span>` +
    `<span class="tmux-spacer"></span>` +
    `<span class="tmux-right">"jjalangtry.com" v${terminalData.version}</span>`;
  layout.appendChild(statusBar);

  terminal.appendChild(layout);

  // Scroll terminal pane to bottom
  topPane.scrollTop = topPane.scrollHeight;

  // Refocus input
  if (currentInput) currentInput.focus();
}

function closeProjectsPane() {
  if (!tmuxActive) return;
  tmuxActive = false;

  const terminal = document.getElementById("main-terminal");
  const layout = document.getElementById("tmux-layout");
  if (!terminal || !layout) return;

  terminal.classList.remove("tmux-active");

  // Move terminal content back out of the top pane
  const topPane = layout.querySelector(".tmux-pane-terminal");
  if (topPane) {
    while (topPane.firstChild) {
      terminal.appendChild(topPane.firstChild);
    }
  }
  layout.remove();

  // Scroll to bottom and refocus
  const output = document.getElementById("cli-output");
  if (output) output.scrollTop = output.scrollHeight;
  if (currentInput) currentInput.focus();
}

// Expose for use by ProfilePanel's "View Projects" button
window.openProjectsPane = openProjectsPane;

// ── Banner ────────────────────────────────────────────────────

function displayBanner() {
  const v = terminalData.version;
  const vTag = `v${v}`;
  const desktopBanner = `
     ██╗ █████╗ ██╗  ██╗ ██████╗ ██████╗     ██╗      █████╗ ███╗   ██╗ ██████╗████████╗██████╗ ██╗   ██╗
     ██║██╔══██╗██║ ██╔╝██╔═══██╗██╔══██╗    ██║     ██╔══██╗████╗  ██║██╔════╝╚══██╔══╝██╔══██╗╚██╗ ██╔╝
     ██║███████║█████╔╝ ██║   ██║██████╔╝    ██║     ███████║██╔██╗ ██║██║  ███╗  ██║   ██████╔╝ ╚████╔╝ 
██   ██║██╔══██║██╔═██╗ ██║   ██║██╔══██╗    ██║     ██╔══██║██║╚██╗██║██║   ██║  ██║   ██╔══██╗  ╚██╔╝  
╚█████╔╝██║  ██║██║  ██╗╚██████╔╝██████╔╝    ███████╗██║  ██║██║ ╚████║╚██████╔╝  ██║   ██║  ██║   ██║   
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   
${vTag.padStart(100)}
`;

  const mobileBanner = `
 ╔═══════════════════╗
 ║  JAKOB LANGTRY    ║
 ║  Terminal ${vTag.padEnd(8)}║
 ╚═══════════════════╝
`;

  appendOutput(isMobileDevice ? mobileBanner : desktopBanner, "ascii-art");
}

/**
 * Displays a welcome message in the terminal interface.
 */
function displayWelcomeMessage() {
  appendOutput(
    "Hey! I'm Jakob. I'm going to try to keep all my stuff here. My own little corner. \nClick a command below to get started, or just start typing.",
    "info-text",
  );
}

const ONBOARDING_COMMANDS = [
  { cmd: "help", desc: "list all commands" },
  { cmd: "skills", desc: "what I know" },
  { cmd: "projects", desc: "view my work" },
  { cmd: "blog", desc: "read my posts" },
  { cmd: "contact", desc: "get in touch" },
  { cmd: "fortune", desc: "random wisdom" },
  { cmd: "matrix", desc: "digital rain" },
  { cmd: "theme light", desc: "switch theme" },
];

function displayOnboardingCommands() {
  // Section header
  const header = document.createElement("div");
  header.className = "onboarding-header info-text";
  header.textContent = "Quick start:";

  const row = document.createElement("div");
  row.className = "command-output command-chip-row";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Suggested commands");

  ONBOARDING_COMMANDS.forEach(({ cmd, desc }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "command-chip";
    chip.setAttribute("aria-label", `Run command: ${cmd} — ${desc}`);
    chip.title = desc;

    const cmdSpan = document.createElement("span");
    cmdSpan.className = "chip-cmd";
    cmdSpan.textContent = cmd;

    const descSpan = document.createElement("span");
    descSpan.className = "chip-desc";
    descSpan.textContent = desc;

    chip.appendChild(cmdSpan);
    chip.appendChild(descSpan);

    chip.addEventListener("click", () => {
      if (!currentInput) return;
      currentInput.value = cmd;
      currentInput.focus();
      currentInput.setSelectionRange(cmd.length, cmd.length);
      currentInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    row.appendChild(chip);
  });

  // Keyboard hints line
  const hints = document.createElement("div");
  hints.className = "keyboard-hints log-text";
  hints.textContent =
    "Tip: Tab to autocomplete  ↑↓ history  Ctrl+L clear  Ctrl+C cancel";

  const container = document.createElement("div");
  container.className = "onboarding-block";
  container.appendChild(header);
  container.appendChild(row);
  container.appendChild(hints);

  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(container, inputLine);
  } else {
    cliOutput.appendChild(container);
  }
}

/**
 * Appends output to the CLI output area, preserving text selection.
 * @param {string} text - The text to append.
 * @param {string} [className=''] - The class name to apply to the output element.
 */
function appendOutput(text, className = "") {
  if (captureMode) {
    capturedLines.push({ text, className });
    return;
  }

  // Save the current selection state
  const selection = window.getSelection();
  const selectedText = selection.toString();
  let selectionRange = null;

  if (selection.rangeCount > 0) {
    selectionRange = selection.getRangeAt(0).cloneRange();
  }

  // Create and append the new output
  const output = document.createElement("div");
  output.className = className;
  if (className === "error-text") {
    output.setAttribute("role", "alert");
    output.setAttribute("aria-live", "assertive");
  }

  // For help text with multiple lines, preserve exact formatting
  if (className === "info-text" && text.includes("\n")) {
    // Use textContent to preserve newlines
    output.textContent = text;
  } else {
    // For normal text, consider replacing newlines with breaks if needed
    output.textContent = text;
  }

  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(output, inputLine);
  } else {
    cliOutput.appendChild(output);
  }

  // Adjust scrolling without disturbing selection
  cliOutput.scrollTop = cliOutput.scrollHeight;

  // If there was a selection, try to restore it
  if (selectedText && selectionRange) {
    // Wait for DOM to update
    setTimeout(() => {
      selection.removeAllRanges();
      selection.addRange(selectionRange);
    }, 0);
  }
}

function buildCommandsListOutput() {
  return `Available commands:\n${commandList.join("\n")}`;
}

function buildProjectsListOutput() {
  const projects = terminalData.projects || [];
  if (!projects.length) {
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

function findProjectByCommand(command) {
  const normalized = command.trim().toLowerCase();
  return (terminalData.projects || []).find((project) => {
    if (!project || !project.name) return false;
    return project.name.toLowerCase() === normalized;
  });
}

function openResume() {
  const resumeUrl =
    terminalData.siteConfig?.resumeUrl || DEFAULT_SITE_CONFIG.resumeUrl;
  appendOutput("Opening resume...");
  window.open(resumeUrl, "_blank");
}

/**
 * Executes a command entered in the terminal interface.
 * @param {string} command - The command to execute.
 * @param {Object} [options] - Execution options.
 * @param {boolean} [options.skipEcho] - Skip echoing the command line.
 */
function executeCommand(command, options = {}) {
  if (!options.skipEcho) {
    const commandLine = document.createElement("div");
    commandLine.textContent = `${getPromptPrefix()}${command}`;
    cliOutput.insertBefore(commandLine, inputLine);
  }

  const normalizedCommand = command.toLowerCase();
  switch (normalizedCommand) {
    case "help":
      const helpText = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                      JAKOB LANGTRY TERMINAL - HELP                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

AVAILABLE COMMANDS:

  banner     Display the terminal banner
             Usage: banner

  blog       Read blog posts
             Usage: blog [slug]

  calc       Evaluate a math expression
             Usage: calc [expression]

  clear      Clear the terminal screen
             Usage: clear

  contact    Display contact information
             Usage: contact

  countdown  Start a visual countdown timer
             Usage: countdown [seconds]

  converter  Open Link Converter tool
             Usage: converter

  curl       Simulate HTTP requests (educational purposes only)
             Usage: curl [URL]

  qr         Generate a QR code for a URL
             Usage: qr [URL]

  date       Display the current date and time
             Usage: date

  echo       Display a line of text
             Usage: echo [text]

  email      Open email client to contact Jakob
             Usage: email

  experience Display work and education timeline
             Usage: experience

  flip       Flip text upside down
             Usage: flip [text]

  fortune    Display a random programming quote
             Usage: fortune

  github     Open Jakob's GitHub profile
             (alias: repo)
             Usage: github

  grep       Search with regex, wildcards, and flags
             Usage: grep [-ivnc] [pattern]
             Regex: grep 'foo.*bar'  grep '^C'  grep '(js|ts)'
             Flags: -v invert  -n line numbers  -c count
             Pipe:  help | grep -n weather

  help       Display this help information
             Usage: help

  history    Show command history
             Usage: history [clear|N]

  ls         List available commands
             Usage: ls

  man        Display manual page for a command
             Usage: man [command]

  matrix     Display Matrix-style digital rain
             Usage: matrix

  neofetch   Display system information
             Usage: neofetch

  projects   Open projects in a tmux-style split pane
             Usage: projects

  repos      Display GitHub repos and contributions (ASCII view)
             Usage: repos

  close      Close the projects split pane
             Usage: close (alias: exit, Ctrl+B q)

  resume     View Jakob's resume
             Usage: resume

  skills     Display skills with proficiency bars
             Usage: skills [--category name]

  snake      Play Snake in the terminal
             Usage: snake

  stats      Show visitor and session statistics
             Usage: stats

  theme      Toggle between dark and light mode
             Usage: theme [dark|light]

  uptime     Show session uptime
             Usage: uptime

  weather    Display weather forecast for a location
             Usage: weather [city or location]
             Examples: weather New York
                      weather Syracuse NY
                      weather London, UK

  whoami     Display information about Jakob
             Usage: whoami

  write      Create a new blog post
             Usage: write

  edit       Edit site content (e.g. bio)
             Usage: edit whoami

  export     Export user-created posts as JSON
             Usage: export posts

  rss        Show RSS feed URL
             Usage: rss

AUTHENTICATION:
  login               Authenticate as admin (required for content management)
  logout              End admin session

CONTENT MANAGEMENT (requires login):
  write              Create a new blog post (saved in browser)
  edit whoami         Edit your bio text
  post delete [slug]  Delete a user-created post
  export posts        Export user posts as JSON for permanent publishing

PIPES:
  Use | to pipe output through grep:  help | grep weather

For more information about a specific command, type: [command] --help
                                                  or: man [command]`;

      // Create a div with pre-formatted text for help output
      appendOutput(helpText, "info-text");
      break;
    case "ls":
      appendOutput(buildCommandsListOutput(), "info-text");
      break;
    case "clear":
      // Save the command history
      const savedHistory = commandHistory;
      const savedHistoryIndex = historyIndex;
      const savedCurrentInputBuffer = currentInputBuffer;

      // Clear the output container but maintain the input line
      while (cliOutput.firstChild !== inputLine) {
        cliOutput.removeChild(cliOutput.firstChild);
      }

      // Display the banner
      displayBanner();

      // Restore the command history
      commandHistory = savedHistory;
      historyIndex = savedHistoryIndex;
      currentInputBuffer = savedCurrentInputBuffer;

      // Keep focus on the current input
      currentInput.focus();
      break;
    case "whoami":
      {
        const customBio = loadCustomWhoami();
        appendOutput(
          customBio ||
            `Jakob Langtry - Software Engineering Student at Rochester Institute of Technology.
Passionate about web development, backend systems, and creating useful applications.
Currently seeking opportunities in software engineering.`,
          "info-text",
        );
      }
      break;
    case "date":
      appendOutput(new Date().toLocaleString());
      break;
    case "history":
      displayHistory();
      break;
    case "uptime":
      displayUptime();
      break;
    case "neofetch":
      displayNeofetch();
      break;
    case "contact":
      displayContact();
      break;
    case "pwd":
      appendOutput("/home/guest", "info-text");
      break;
    case "hostname":
      appendOutput("jjalangtry.com", "info-text");
      break;
    case "alias":
      appendOutput("alias repo='github'\nalias exit='close'", "info-text");
      break;
    case "skills":
      displaySkills();
      break;
    case "experience":
      displayExperience();
      break;
    case "blog":
      displayBlogList();
      break;
    case "stats":
      displayStats();
      break;
    case "snake":
      startSnakeGame();
      break;
    case "matrix":
      startMatrixRain();
      break;
    case "fortune":
      appendOutput(getRandomFortune(), "info-text");
      break;
    case "calc":
      appendOutput(
        "Usage: calc [expression]\nExamples: calc 2+2, calc sqrt(144), calc sin(3.14/2)",
        "info-text",
      );
      break;
    case "flip":
      appendOutput(
        "Usage: flip [text]\nFlips text upside down. Example: flip hello world",
        "info-text",
      );
      break;
    case "countdown":
      appendOutput(
        "Usage: countdown [seconds]\nStarts a visual countdown timer. Example: countdown 60",
        "info-text",
      );
      break;
    case "write":
      if (!checkAuth("write")) break;
      startWrite();
      break;
    case "rss":
      displayRssInfo();
      break;
    case "login":
      if (isAuthenticated()) {
        appendOutput(
          requiresAuth()
            ? "Already authenticated as admin."
            : "No password configured. Admin commands are unrestricted.",
          "info-text",
        );
      } else {
        editorState = { phase: "login" };
        setPromptText("Password: ");
        if (currentInput) {
          currentInput.type = "password";
        }
      }
      break;
    case "logout":
      if (isAdmin) {
        isAdmin = false;
        updatePromptUser();
        appendOutput("Logged out.", "info-text");
      } else {
        appendOutput("Not logged in.", "info-text");
      }
      break;
    case "grep":
      appendOutput(
        "Usage: grep [pattern]\nSearches across projects and commands.\nCan also be used as a pipe filter: help | grep weather",
        "info-text",
      );
      break;
    case "man":
      appendOutput(
        "Usage: man [command]\nDisplays the manual page for a command.",
        "info-text",
      );
      break;
    case "banner":
      displayBanner();
      break;
    case "email":
      appendOutput("Opening email client...");
      window.location.href = "mailto:jjalangtry@gmail.com";
      break;
    case "github":
      appendOutput("Opening GitHub profile...");
      window.open("https://github.com/JJALANGTRY", "_blank");
      break;
    case "echo":
      appendOutput(
        "Usage: echo [text to display]\nDisplays the text provided as an argument.",
        "info-text",
      );
      break;
    case "weather":
      appendOutput(
        "Usage: weather [city or location]. Examples:\n  weather New York\n  weather Syracuse NY\n  weather London, UK\n  weather Paris France",
        "info-text",
      );
      break;
    case "theme":
      {
        const next = toggleTheme();
        appendOutput(`Switched to ${next} mode.`, "success-text");
      }
      break;
    case "resume":
      openResume();
      break;
    case "projects":
      if (tmuxActive) {
        appendOutput(
          "Projects pane is already open. Type 'close' to dismiss.",
          "info-text",
        );
      } else {
        appendOutput("Opening projects pane...", "info-text");
        setTimeout(openProjectsPane, 150);
      }
      break;
    case "repos":
      appendOutput(buildReposOutput(terminalData.projectGroups), "info-text");
      fetchContributionChart();
      break;
    case "close":
    case "exit":
      if (tmuxActive) {
        closeProjectsPane();
        appendOutput("Closed projects pane.", "info-text");
      } else {
        appendOutput("No pane to close.", "info-text");
      }
      break;
    case "repo":
      // Alias for github command
      appendOutput("Opening GitHub profile...");
      window.open("https://github.com/JJALANGTRY", "_blank");
      break;
    case "converter":
      appendOutput("Opening Link Converter...");
      window.open("https://convert.jjalangtry.com", "_blank");
      break;
    case "curl":
      appendOutput("Usage: curl [URL]", "info-text");
      break;
    case "qr":
      appendOutput(
        "Usage: qr [URL]\nGenerates a QR code for the provided URL and shows a download button.",
        "info-text",
      );
      break;
    default:
      if (normalizedCommand === "converter") {
        appendOutput("Opening Link Converter...");
        window.open("https://convert.jjalangtry.com", "_blank");
        break;
      } else if (normalizedCommand.startsWith("theme ")) {
        const arg = normalizedCommand.substring(6).trim();
        if (arg === "dark" || arg === "light") {
          applyTheme(arg);
          appendOutput(`Switched to ${arg} mode.`, "success-text");
        } else {
          appendOutput("Usage: theme [dark|light]", "info-text");
        }
        break;
      } else if (
        normalizedCommand.startsWith("sudo ") ||
        normalizedCommand === "sudo"
      ) {
        appendOutput(
          "guest is not in the sudoers file. This incident will be reported.",
          "error-text",
        );
        break;
      } else if (
        normalizedCommand.startsWith("cd ") ||
        normalizedCommand === "cd"
      ) {
        const dir = command.substring(3).trim();
        if (!dir || dir === "~") {
          appendOutput("You are already in your home directory.", "info-text");
        } else {
          appendOutput(`cd: no such file or directory: ${dir}`, "error-text");
        }
        break;
      } else if (normalizedCommand.startsWith("curl ")) {
        const args = parseCurlCommand(command.substring(5).trim());

        if (!args.url) {
          appendOutput("Error: Please provide a URL", "error-text");
          break;
        }

        executeCurlCommand(args);
        break;
      } else if (normalizedCommand.startsWith("qr ")) {
        const target = command.substring(3).trim();
        if (!target) {
          appendOutput("Usage: qr [URL]", "info-text");
          break;
        }
        const selection = window.getSelection();
        const selectedText = selection.toString();
        let selectionRange = null;
        if (selection.rangeCount > 0) {
          selectionRange = selection.getRangeAt(0).cloneRange();
        }
        const container = document.createElement("div");
        container.className = "command-output qr-container";
        const title = document.createElement("div");
        title.className = "qr-title";
        title.textContent = `QR code for: ${target}`;
        const img = document.createElement("img");
        img.className = "qr-img";
        const encoded = encodeURIComponent(target);
        const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encoded}`;
        img.src = imgUrl;
        img.alt = `QR code for ${target}`;
        const actions = document.createElement("div");
        actions.className = "qr-actions";
        const download = document.createElement("a");
        download.className = "qr-download-btn";
        download.href = imgUrl;
        download.download = "qr.png";
        download.textContent = "Download QR";
        download.setAttribute(
          "aria-label",
          `Download QR code image for ${target}`,
        );
        actions.appendChild(download);
        container.appendChild(title);
        container.appendChild(img);
        container.appendChild(actions);
        if (inputLine && inputLine.parentNode === cliOutput) {
          cliOutput.insertBefore(container, inputLine);
        } else {
          cliOutput.appendChild(container);
        }
        cliOutput.scrollTop = cliOutput.scrollHeight;
        if (selectedText && selectionRange) {
          setTimeout(() => {
            selection.removeAllRanges();
            selection.addRange(selectionRange);
          }, 0);
        }
        break;
      } else if (normalizedCommand.startsWith("history ")) {
        const arg = command.substring(8).trim();
        if (arg.toLowerCase() === "clear") {
          commandHistory = [];
          historyIndex = 0;
          try {
            localStorage.removeItem("terminal-history");
          } catch (err) {
            // ignore
          }
          appendOutput("History cleared.", "success-text");
        } else {
          const n = parseInt(arg, 10);
          if (!isNaN(n) && n > 0) {
            displayHistory(n);
          } else {
            appendOutput("Usage: history [clear|N]", "info-text");
          }
        }
        break;
      } else if (normalizedCommand.startsWith("blog ")) {
        const slug = command.substring(5).trim();
        if (!slug) {
          displayBlogList();
          break;
        }
        displayBlogPost(slug);
        break;
      } else if (
        normalizedCommand.startsWith("skills ") &&
        normalizedCommand.substring(7).trim() === "--category"
      ) {
        appendOutput(
          "Usage: skills [--category name]\nAvailable categories: " +
            (terminalData.skills || []).map((c) => c.name).join(", "),
          "info-text",
        );
        break;
      } else if (normalizedCommand.startsWith("skills --category ")) {
        const catName = command.substring(18).trim();
        displaySkills(catName);
        break;
      } else if (normalizedCommand.startsWith("grep ")) {
        const argsStr = command.substring(5).trim();
        if (!argsStr) {
          appendOutput(
            "Usage: grep [-ivnc] [pattern]\n\nSupports regex: grep 'foo.*bar', grep '^start', grep '(a|b)'\nFlags: -i case-insensitive (default)  -v invert  -n line numbers  -c count",
            "info-text",
          );
          break;
        }
        executeStandaloneGrep(argsStr);
        break;
      } else if (normalizedCommand.startsWith("man ")) {
        const pattern = normalizedCommand.substring(4).trim();
        const matches = expandGlob(pattern, commandList);
        if (matches.length === 0) {
          appendOutput(`No manual entry matching '${pattern}'.`, "error-text");
        } else {
          matches.forEach((cmd) => displayManPage(cmd));
        }
        break;
      } else if (normalizedCommand.startsWith("weather ")) {
        const city = command.substring(8).trim();

        // We're now handling the formatting in fetchWeather function
        fetchWeather(city);
      } else if (normalizedCommand === "edit whoami") {
        if (!checkAuth("edit")) break;
        startEditWhoami();
        break;
      } else if (normalizedCommand.startsWith("edit ")) {
        appendOutput(
          "Editable fields: whoami\nUsage: edit whoami",
          "info-text",
        );
        break;
      } else if (normalizedCommand === "edit") {
        appendOutput(
          "Editable fields: whoami\nUsage: edit whoami",
          "info-text",
        );
        break;
      } else if (normalizedCommand.startsWith("post delete ")) {
        if (!checkAuth("post delete")) break;
        const slug = normalizedCommand.substring(12).trim();
        deleteLocalPost(slug);
        break;
      } else if (normalizedCommand.startsWith("delete ")) {
        if (!checkAuth("delete")) break;
        const slug = normalizedCommand.substring(7).trim();
        deleteLocalPost(slug);
        break;
      } else if (normalizedCommand === "export posts") {
        if (!checkAuth("export")) break;
        exportLocalPosts();
        break;
      } else if (normalizedCommand.startsWith("which ")) {
        const target = normalizedCommand.substring(6).trim();
        const matches = expandGlob(target, commandList);
        if (matches.length > 0) {
          appendOutput(
            matches.map((m) => `${m}: shell built-in`).join("\n"),
            "info-text",
          );
        } else {
          appendOutput(`${target}: not found`, "error-text");
        }
        break;
      } else if (normalizedCommand.startsWith("echo ")) {
        const echoText = command.substring(5).trim();
        if (echoText) {
          appendOutput(echoText);
        } else {
          appendOutput("Usage: echo [text to display]", "info-text");
        }
      } else if (normalizedCommand.startsWith("calc ")) {
        const expr = command.substring(5).trim();
        if (!expr) {
          appendOutput(
            "Usage: calc [expression]\nExamples: calc 2+2, calc sqrt(144), calc sin(3.14/2)",
            "info-text",
          );
        } else {
          const result = safeCalc(expr);
          if (result.error) {
            appendOutput(result.error, "error-text");
          } else {
            appendOutput(`${expr} = ${result.value}`, "success-text");
          }
        }
        break;
      } else if (normalizedCommand.startsWith("flip ")) {
        const text = command.substring(5).trim();
        if (!text) {
          appendOutput("Usage: flip [text]", "info-text");
        } else {
          appendOutput(flipText(text), "info-text");
        }
        break;
      } else if (normalizedCommand.startsWith("countdown ")) {
        const arg = command.substring(10).trim();
        const secs = parseInt(arg, 10);
        if (isNaN(secs) || secs <= 0 || secs > 5999) {
          appendOutput(
            "Usage: countdown [1-5999]\nExample: countdown 60",
            "info-text",
          );
        } else {
          startCountdown(secs);
        }
        break;
      } else if (normalizedCommand.endsWith(" --help")) {
        // Handle command-specific help
        const cmd = normalizedCommand
          .substring(0, normalizedCommand.length - 7)
          .trim();
        displayCommandHelp(cmd);
      } else {
        const project = findProjectByCommand(command);
        if (project) {
          appendOutput(`Opening ${project.name}...`);
          window.open(project.url, "_blank");
        } else {
          appendOutput(
            `Command not found: ${command}. Type 'help' for available commands.`,
            "error-text",
          );
        }
      }
  }
}

/**
 * Displays detailed help for a specific command
 * @param {string} command - The command to display help for
 */
function displayCommandHelp(command) {
  const helpDetails = getHelpDetails();

  if (helpDetails[command]) {
    const help = helpDetails[command];
    let helpText = `
╔══════════════════════════════════════════════════════════════════╗
║ COMMAND: ${command.padEnd(52)}║
╚══════════════════════════════════════════════════════════════════╝

DESCRIPTION:
  ${help.desc}

USAGE:
  ${help.usage}

EXAMPLES:
  ${help.examples.join("\n  ")}

NOTES:
  ${help.notes}
`;
    // Ensure the helpText preserves newlines
    appendOutput(helpText, "info-text");
  } else {
    appendOutput(
      `No detailed help available for '${command}'. Type 'help' to see all available commands.`,
      "error-text",
    );
  }
}

/**
 * Fetches GitHub contribution chart data and appends a terminal-style ASCII grid.
 */
async function fetchContributionChart() {
  const API_URL = "https://github-contributions-api.jogruber.de/v4/jjalangtry";
  try {
    appendOutput("Fetching contribution chart...", "info-text");
    const res = await fetch(API_URL);
    if (!res.ok) {
      appendOutput(
        `Contribution chart unavailable (${res.status}). Try 'github' to open profile.`,
        "info-text",
      );
      return;
    }
    const data = await res.json();
    const contributions = data?.contributions ?? [];
    const chart = buildContributionChartAscii(contributions);
    appendOutput(chart, "info-text");
  } catch (err) {
    appendOutput(
      `Could not fetch contribution chart: ${err.message}. Try 'github' to open profile.`,
      "info-text",
    );
  }
}

/**
 * Fetches weather data for a specified city.
 * @param {string} city - The city for which to fetch weather data.
 */
async function fetchWeather(city) {
  try {
    appendOutput(`Fetching weather data for ${city}...`);

    // Format city name for best API results
    let formattedCity = city;
    let isUsLocation = false;

    // Add logic to better handle queries with region names
    if (!city.includes(",")) {
      // Check for US state abbreviations first as they're most problematic
      const stateAbbrs = [
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
        "DC",
      ];

      // If the city has multiple words, check if the last word is a state abbreviation
      if (city.includes(" ")) {
        const parts = city.split(" ");
        const lastPart = parts[parts.length - 1].toUpperCase();
        if (stateAbbrs.includes(lastPart)) {
          const cityPart = parts.slice(0, parts.length - 1).join(" ");
          formattedCity = `${cityPart}, ${lastPart}`;
          isUsLocation = true;
        }
      }

      // Check for common formats like "City State" where State is a full name
      const stateNames = [
        "Alabama",
        "Alaska",
        "Arizona",
        "Arkansas",
        "California",
        "Colorado",
        "Connecticut",
        "Delaware",
        "Florida",
        "Georgia",
        "Hawaii",
        "Idaho",
        "Illinois",
        "Indiana",
        "Iowa",
        "Kansas",
        "Kentucky",
        "Louisiana",
        "Maine",
        "Maryland",
        "Massachusetts",
        "Michigan",
        "Minnesota",
        "Mississippi",
        "Missouri",
        "Montana",
        "Nebraska",
        "Nevada",
        "New Hampshire",
        "New Jersey",
        "New Mexico",
        "New York",
        "North Carolina",
        "North Dakota",
        "Ohio",
        "Oklahoma",
        "Oregon",
        "Pennsylvania",
        "Rhode Island",
        "South Carolina",
        "South Dakota",
        "Tennessee",
        "Texas",
        "Utah",
        "Vermont",
        "Virginia",
        "Washington",
        "West Virginia",
        "Wisconsin",
        "Wyoming",
      ];

      // Improved case-insensitive state name matching
      for (const state of stateNames) {
        const statePattern = new RegExp(`\\s${state}$`, "i");
        if (statePattern.test(city)) {
          const cityPart = city.substring(0, city.length - state.length - 1);
          formattedCity = `${cityPart}, ${state}`;
          isUsLocation = true;
          break;
        }
      }

      // Check for common patterns of city followed by country name without comma
      if (!isUsLocation) {
        const commonCountries = [
          "USA",
          "US",
          "UK",
          "France",
          "Germany",
          "Canada",
          "Italy",
          "Spain",
          "Japan",
          "China",
          "Russia",
          "Brazil",
          "Australia",
        ];

        for (const country of commonCountries) {
          const countryPattern = new RegExp(`\\s${country}$`, "i");
          if (countryPattern.test(city)) {
            const cityPart = city.substring(
              0,
              city.length - country.length - 1,
            );
            formattedCity = `${cityPart}, ${country}`;
            break;
          }
        }
      }
    }

    // For US locations, specifically help the API by adding USA if not present
    if (
      isUsLocation &&
      !formattedCity.toLowerCase().includes("usa") &&
      !formattedCity.toLowerCase().includes("us")
    ) {
      formattedCity = `${formattedCity}, USA`;
    }

    const apiKey = (window.ENV?.OPENWEATHERMAP_API_KEY || "").trim();
    if (
      !apiKey ||
      apiKey === "your_api_key_here" ||
      apiKey === "REPLACE_WITH_YOUR_API_KEY"
    ) {
      appendOutput(
        "Weather is unavailable: OpenWeatherMap API key is missing. Configure OPENWEATHERMAP_API_KEY and rebuild.",
        "error-text",
      );
      return;
    }

    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(formattedCity)}&limit=1&appid=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoResponse.ok) {
      if (geoResponse.status === 401) {
        appendOutput(
          "Weather is unavailable: OpenWeatherMap API key is invalid or expired.",
          "error-text",
        );
      } else {
        appendOutput(
          `Error fetching weather location: ${geoData?.message || geoResponse.statusText}`,
          "error-text",
        );
      }
      return;
    }

    if (!geoData || !geoData.length) {
      appendOutput(
        `City "${city}" not found. Try "City, State" or "City, Country".`,
        "error-text",
      );
      return;
    }

    const { lat, lon, name, state, country } = geoData[0];

    // Keep metric response and convert to Fahrenheit for display consistently.
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const weatherResponse = await fetch(forecastUrl);
    const weatherData = await weatherResponse.json();

    if (!weatherResponse.ok) {
      if (weatherResponse.status === 401) {
        appendOutput(
          "Weather is unavailable: OpenWeatherMap API key is invalid or expired.",
          "error-text",
        );
      } else {
        appendOutput(
          `Error fetching weather forecast: ${weatherData?.message || weatherResponse.statusText}`,
          "error-text",
        );
      }
      return;
    }

    displayWeatherReport(weatherData, name, state, country, lat, lon);
    return;
  } catch (error) {
    appendOutput(`Error fetching weather data: ${error.message}`, "error-text");
  }
}

/**
 * Appends weather output to the CLI output area.
 * @param {string} text - The weather text to append.
 */
function appendWeatherOutput(text) {
  // Save the current selection state
  const selection = window.getSelection();
  const selectedText = selection.toString();
  let selectionRange = null;

  if (selection.rangeCount > 0) {
    selectionRange = selection.getRangeAt(0).cloneRange();
  }

  const output = document.createElement("div");
  output.className = "command-output";

  // Create a container to control width and prevent responsive issues
  const container = document.createElement("div");
  container.className = "weather-container";

  // Use pre element to ensure exact formatting
  const pre = document.createElement("pre");
  pre.textContent = text;

  container.appendChild(pre);
  output.appendChild(container);

  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(output, inputLine);
  } else {
    cliOutput.appendChild(output);
  }

  // Adjust scrolling without disturbing selection
  cliOutput.scrollTop = cliOutput.scrollHeight;

  // If there was a selection, try to restore it
  if (selectedText && selectionRange) {
    // Wait for DOM to update
    setTimeout(() => {
      selection.removeAllRanges();
      selection.addRange(selectionRange);
    }, 0);
  }
}

/**
 * Displays simulated weather data.
 * @param {Object} data - The simulated weather data.
 * @param {string} city - The city for which the data is displayed.
 */
function displaySimulatedWeatherReport(data, city) {
  displayWeatherReport(data, city, null, "Simulation", data.lat, data.lon);
}

/**
 * Displays a detailed weather report.
 * @param {Object} data - The weather data.
 * @param {string} city - The city name.
 * @param {string} state - The state name.
 * @param {string} country - The country name.
 * @param {number} lat - Latitude of the location.
 * @param {number} lon - Longitude of the location.
 */
function displayWeatherReport(data, city, state, country, lat, lon) {
  // Group forecast data by day
  const forecasts = data.list;
  const days = {};

  forecasts.forEach((forecast) => {
    const date = new Date(forecast.dt * 1000);
    const day = date.toDateString();
    const hour = date.getHours();

    if (!days[day]) {
      days[day] = {
        morning: null,
        noon: null,
        evening: null,
        night: null,
      };
    }

    // Assign to time of day (rough approximation)
    if (hour >= 5 && hour < 12) {
      if (!days[day].morning) days[day].morning = forecast;
    } else if (hour >= 12 && hour < 17) {
      if (!days[day].noon) days[day].noon = forecast;
    } else if (hour >= 17 && hour < 22) {
      if (!days[day].evening) days[day].evening = forecast;
    } else {
      if (!days[day].night) days[day].night = forecast;
    }
  });

  // Location string construction
  let locationStr = city;
  if (state) locationStr += `, ${state}`;
  if (country && country !== "Simulation") locationStr += `, ${country}`;

  // Display header
  appendWeatherOutput(`Weather Forecast for ${locationStr}`);
  const latSuffix = lat >= 0 ? "N" : "S";
  const lonSuffix = lon >= 0 ? "E" : "W";
  appendWeatherOutput(
    `Location: ${Math.abs(lat).toFixed(2)}°${latSuffix}, ${Math.abs(lon).toFixed(2)}°${lonSuffix}`,
  );
  appendWeatherOutput("");

  // Use compact weather layout on mobile and narrow viewports.
  const useCompactWeatherLayout =
    isMobileDevice || window.matchMedia("(max-width: 900px)").matches;
  if (useCompactWeatherLayout) {
    // Simplified mobile-friendly weather display
    displayMobileWeatherReport(days);
  } else {
    // Full fancy ASCII art weather display for desktop
    displayDesktopWeatherReport(days);
  }
}

/**
 * Simplified weather display format for mobile devices
 * @param {Object} days - Weather data grouped by days
 */
function displayMobileWeatherReport(days) {
  // Iterate through each day
  Object.keys(days).forEach((dayStr) => {
    const day = days[dayStr];

    // Display day header
    appendWeatherOutput(`\n[${dayStr}]`, "weather-day-header");

    // Display each time period with simplified formatting
    ["morning", "noon", "evening", "night"].forEach((period) => {
      if (day[period]) {
        const forecast = day[period];
        const time = new Date(forecast.dt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const temp = celsiusToFahrenheit(Math.round(forecast.main.temp));
        const condition = forecast.weather[0].main;
        const description = forecast.weather[0].description;

        // Simple symbols for weather conditions
        let symbol = "☁️"; // default cloudy
        if (condition === "Clear") symbol = "☀️";
        if (condition === "Rain") symbol = "🌧️";
        if (condition === "Snow") symbol = "❄️";
        if (condition === "Thunderstorm") symbol = "⚡";
        if (condition === "Drizzle") symbol = "🌦️";
        if (condition === "Mist" || condition === "Fog") symbol = "🌫️";

        appendWeatherOutput(
          `${symbol} ${period.charAt(0).toUpperCase() + period.slice(1)} (${time}): ${temp}°F, ${description}`,
        );
      }
    });
  });
}

/**
 * Full featured weather display for desktop devices
 * @param {Object} days - Weather data grouped by days
 */
function displayDesktopWeatherReport(days) {
  // Get current weather (first item in the list is assumed to be current)
  const forecasts = [];
  Object.values(days).forEach((dayPeriods) => {
    ["morning", "noon", "evening", "night"].forEach((period) => {
      if (dayPeriods[period]) forecasts.push(dayPeriods[period]);
    });
  });

  const currentWeather = forecasts[0]; // Use first available forecast as current

  // Build the report
  let report = ``;

  // Define standard table width and ensure it's an even number for perfect symmetry
  const tableWidth = 105; // Adjusted to ensure perfect division by 4
  const cellWidth = Math.floor(tableWidth / 4); // 4 columns exactly

  // Create a more prominent centered current weather display with a box that aligns with the main table
  const boxWidth = 46; // Fixed width for current weather box, must be even
  const currentWeatherBox = getWeatherAscii(currentWeather, true, boxWidth);

  // Center the current weather box
  const boxLines = currentWeatherBox.split("\n");
  const paddedBox = boxLines
    .map((line) => {
      const padding = Math.floor((tableWidth - boxWidth) / 2);
      return (
        " ".repeat(padding) + line + " ".repeat(tableWidth - padding - boxWidth)
      );
    })
    .join("\n");

  report += paddedBox + "\n\n";

  // Build the 3-day forecast table
  const dayEntries = Object.entries(days).slice(0, 3);

  dayEntries.forEach(([dayString, periods], index) => {
    const date = new Date(dayString);

    // Format date with full day name and month, and ordinal suffix
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const dayOfWeek = dayNames[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = monthNames[date.getMonth()];

    // Add ordinal suffix (st, nd, rd, th)
    let ordinalSuffix = "th";
    if (dayOfMonth % 10 === 1 && dayOfMonth !== 11) {
      ordinalSuffix = "st";
    } else if (dayOfMonth % 10 === 2 && dayOfMonth !== 12) {
      ordinalSuffix = "nd";
    } else if (dayOfMonth % 10 === 3 && dayOfMonth !== 13) {
      ordinalSuffix = "rd";
    }

    // Create full date string
    const dateHeader = `${dayOfWeek}, ${month} ${dayOfMonth}${ordinalSuffix}`;

    // Add separator between days
    if (index > 0) {
      report += "\n";
    }

    // Add horizontal separator for the top of the table - ensure exact width
    report += "\n";
    report += "╔";
    for (let i = 0; i < tableWidth - 2; i++) report += "═";
    report += "╗\n";

    // Calculate date box dimensions and position
    const dateBoxPadding = 2; // Space on each side of the text
    const innerBoxWidth = dateHeader.length + dateBoxPadding * 2; // Width of the content inside the inner box

    // Calculate exact positions to ensure perfect centering
    // The inner box has 2 border characters (left and right)
    const leftBorderPos = Math.floor((tableWidth - innerBoxWidth - 2) / 2);
    const rightBorderPos = leftBorderPos + innerBoxWidth + 1; // +1 because the right border takes a position

    // First line of date box
    let line = "║";
    for (let i = 1; i < tableWidth - 1; i++) {
      if (i === leftBorderPos) line += "╔";
      else if (i > leftBorderPos && i < rightBorderPos) line += "═";
      else if (i === rightBorderPos) line += "╗";
      else line += " ";
    }
    line += "║";
    report += line + "\n";

    // Date content line
    line = "║";
    for (let i = 1; i < tableWidth - 1; i++) {
      if (i === leftBorderPos) line += "║";
      else if (i === rightBorderPos) line += "║";
      else if (i > leftBorderPos && i < rightBorderPos) {
        // Center the text within the inner box
        const textStartPos =
          leftBorderPos +
          1 +
          Math.floor((innerBoxWidth - dateHeader.length) / 2);
        const textEndPos = textStartPos + dateHeader.length - 1;
        if (i >= textStartPos && i <= textEndPos) {
          line += dateHeader.charAt(i - textStartPos);
        } else {
          line += " ";
        }
      } else {
        line += " ";
      }
    }
    line += "║";
    report += line + "\n";

    // Bottom line of date box
    line = "║";
    for (let i = 1; i < tableWidth - 1; i++) {
      if (i === leftBorderPos) line += "╚";
      else if (i > leftBorderPos && i < rightBorderPos) line += "═";
      else if (i === rightBorderPos) line += "╝";
      else line += " ";
    }
    line += "║";
    report += line + "\n";

    // Add the header row with precisely calculated widths
    report += "╠";
    report += "═".repeat(cellWidth - 1) + "╦";
    report += "═".repeat(cellWidth - 1) + "╦";
    report += "═".repeat(cellWidth - 1) + "╦";
    report += "═".repeat(cellWidth - 1) + "╣\n";

    report += "║" + centerText("Morning", cellWidth - 1) + "║";
    report += centerText("Noon", cellWidth - 1) + "║";
    report += centerText("Evening", cellWidth - 1) + "║";
    report += centerText("Night", cellWidth - 1) + "║\n";

    // Add separator after headers - exact tableWidth
    report += "╠";
    report += "═".repeat(cellWidth - 1) + "╬";
    report += "═".repeat(cellWidth - 1) + "╬";
    report += "═".repeat(cellWidth - 1) + "╬";
    report += "═".repeat(cellWidth - 1) + "╣\n";

    // Weather condition row
    report += buildBoxCompactRow(periods, "condition", cellWidth);

    // Create the ASCII art for each period and condition
    const asciiArts = [];
    ["morning", "noon", "evening", "night"].forEach((timeOfDay) => {
      if (periods[timeOfDay]) {
        const forecast = periods[timeOfDay];
        const weather = forecast.weather[0].main.toLowerCase();
        const description = forecast.weather[0].description.toLowerCase();

        let art = "";

        if (weather.includes("clear")) {
          art =
            "    \\   /    \n" +
            "      .-.    \n" +
            "  ── (   ) ──\n" +
            "      `-'    \n" +
            "    /   \\    ";
        } else if (weather.includes("cloud")) {
          if (
            description.includes("few") ||
            description.includes("scattered") ||
            description.includes("partly")
          ) {
            art =
              "    \\  /     \n" +
              '  _ /"" .-.   \n' +
              "    \\_`(   ). \n" +
              "    /(___(__))\n" +
              "              ";
          } else if (
            description.includes("broken") ||
            description.includes("overcast")
          ) {
            art =
              "     .--.    \n" +
              "  .-(    ).  \n" +
              " (___.__)__) \n" +
              "              \n" +
              "              ";
          } else {
            art =
              "     .--.    \n" +
              "  .-(    ).  \n" +
              " (___.__)__) \n" +
              "              \n" +
              "              ";
          }
        } else if (weather.includes("rain")) {
          if (
            description.includes("light") ||
            description.includes("drizzle")
          ) {
            art =
              "     .-.     \n" +
              "    (   ).   \n" +
              "   (___(__)  \n" +
              "    ' ' ' '  \n" +
              "   ' ' ' '   ";
          } else if (description.includes("heavy")) {
            art =
              "     .-.     \n" +
              "    (   ).   \n" +
              "   (___(__)  \n" +
              "  ,',',','   \n" +
              "  ,',',','   ";
          } else {
            art =
              "     .-.     \n" +
              "    (   ).   \n" +
              "   (___(__)  \n" +
              "    ' ' ' '  \n" +
              "   ' ' ' '   ";
          }
        } else if (weather.includes("snow")) {
          if (
            description.includes("blowing") ||
            description.includes("heavy")
          ) {
            art =
              "     .-.     \n" +
              "    (   ).   \n" +
              "   (___(__)  \n" +
              "   * * * *   \n" +
              "  * * * *    ";
          } else {
            art =
              "     .-.     \n" +
              "    (   ).   \n" +
              "   (___(__)  \n" +
              "    *  *  *  \n" +
              "   *  *  *   ";
          }
        } else if (weather.includes("thunder") || weather.includes("storm")) {
          art =
            "     .-.     \n" +
            "    (   ).   \n" +
            "   (___(__)  \n" +
            "    ⚡⚡⚡    \n" +
            "   ⚡⚡⚡     ";
        } else if (weather.includes("fog") || weather.includes("mist")) {
          art =
            " _ _ _ _ _  \n" +
            "  _ _ _ _ _  \n" +
            " _ _ _ _ _   \n" +
            "  _ _ _ _ _  \n" +
            " _ _ _ _ _   ";
        } else if (weather.includes("haze") || description.includes("hazy")) {
          art =
            "     \\   /   \n" +
            "      .-.     \n" +
            "   –– (   ) ––\n" +
            "      `-'     \n" +
            "     /   \\    ";
        } else if (weather.includes("sun") || description.includes("sunny")) {
          art =
            "    \\   /    \n" +
            "     .-.     \n" +
            "  -- (   ) --\n" +
            "     `-'     \n" +
            "    /   \\    ";
        } else if (description.includes("patchy")) {
          art =
            "     .-.     \n" +
            "  .-(    ).  \n" +
            " (___.__)__) \n" +
            "  * * * *    \n" +
            " * * * *     ";
        } else {
          // Default fallback
          art =
            "    \\   /    \n" +
            "     .-.     \n" +
            "  -- (   ) --\n" +
            "     `-'     \n" +
            "    /   \\    ";
        }

        asciiArts.push(art);
      } else {
        asciiArts.push(
          "             \n             \n             \n             \n             ",
        );
      }
    });

    // ASCII art rows
    const artLines = [];
    for (let i = 0; i < 5; i++) {
      let artLine = "║";
      for (let j = 0; j < 4; j++) {
        if (asciiArts[j]) {
          const artParts = asciiArts[j].split("\n");
          const content = artParts[i] || "";
          artLine += formatBoxCompactCell(content, cellWidth - 1, true);
        } else {
          artLine += formatBoxCompactCell("", cellWidth - 1, true);
        }
      }
      artLines.push(artLine);
    }

    report += artLines.join("\n") + "\n";

    // Add divider after ASCII art - exact table width
    report += "╠";
    report += "═".repeat(cellWidth - 1) + "╬";
    report += "═".repeat(cellWidth - 1) + "╬";
    report += "═".repeat(cellWidth - 1) + "╬";
    report += "═".repeat(cellWidth - 1) + "╣\n";

    // Temperature row
    report += buildBoxCompactRow(periods, "temp", cellWidth);

    // Wind row
    report += buildBoxCompactRow(periods, "wind", cellWidth);

    // Visibility row
    report += buildBoxCompactRow(periods, "visibility", cellWidth);

    // Precipitation row
    report += buildBoxCompactRow(periods, "precip", cellWidth);

    // Add bottom border - exact table width
    report += "╚";
    report += "═".repeat(cellWidth - 1) + "╩";
    report += "═".repeat(cellWidth - 1) + "╩";
    report += "═".repeat(cellWidth - 1) + "╩";
    report += "═".repeat(cellWidth - 1) + "╝\n";
  });

  // Use the specialized weather output function
  appendWeatherOutput(report);
}

/**
 * Centers text within a given width.
 * @param {string} text - The text to center.
 * @param {number} width - The width to center within.
 * @returns {string} The centered text.
 */
function centerText(text, width) {
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text + " ".repeat(width - text.length - padding);
}

/**
 * Converts Celsius to Fahrenheit.
 * @param {number} celsius - The temperature in Celsius.
 * @returns {number} The temperature in Fahrenheit.
 */
function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

/**
 * Builds a compact row for a weather report.
 * @param {Object} periods - The weather periods.
 * @param {string} rowType - The type of row to build.
 * @param {number} [cellWidth=25] - The width of each cell.
 * @returns {string} The formatted row.
 */
function buildBoxCompactRow(periods, rowType, cellWidth = 25) {
  let row = "║";

  // Helper function to get the appropriate content based on row type
  function getContent(period, type) {
    if (!period) return "   --      ";

    switch (type) {
      case "condition":
        const condition = period.weather[0].main;
        // Add ASCII art below for conditions
        let conditionArt = "";
        const conditionLower = condition.toLowerCase();

        if (conditionLower.includes("clear")) {
          conditionArt = " Clear";
        } else if (conditionLower.includes("cloud")) {
          if (
            period.weather[0].description.toLowerCase().includes("few") ||
            period.weather[0].description.toLowerCase().includes("scattered") ||
            period.weather[0].description.toLowerCase().includes("partly")
          ) {
            conditionArt = " Partly Cloudy";
          } else if (
            period.weather[0].description.toLowerCase().includes("broken")
          ) {
            conditionArt = " Cloudy";
          } else {
            conditionArt = " Clouds";
          }
        } else if (conditionLower.includes("rain")) {
          if (period.weather[0].description.toLowerCase().includes("light")) {
            conditionArt = " Light Rain";
          } else if (
            period.weather[0].description.toLowerCase().includes("heavy")
          ) {
            conditionArt = " Heavy Rain";
          } else {
            conditionArt = " Rain";
          }
        } else if (conditionLower.includes("snow")) {
          if (period.weather[0].description.toLowerCase().includes("light")) {
            conditionArt = " Light Snow";
          } else if (
            period.weather[0].description.toLowerCase().includes("heavy") ||
            period.weather[0].description.toLowerCase().includes("blowing")
          ) {
            conditionArt = " Blowing snow";
          } else {
            conditionArt = " Snow";
          }
        } else if (
          conditionLower.includes("fog") ||
          conditionLower.includes("mist")
        ) {
          conditionArt = " Fog";
        } else if (
          conditionLower.includes("thunder") ||
          conditionLower.includes("storm")
        ) {
          conditionArt = " Thunderstorm";
        } else if (conditionLower.includes("overcast")) {
          conditionArt = " Overcast";
        } else if (
          conditionLower.includes("sunny") ||
          conditionLower.includes("sun")
        ) {
          conditionArt = " Sunny";
        } else {
          conditionArt = " " + condition;
        }

        return conditionArt;

      case "temp":
        const tempC = Math.round(period.main.temp);
        const feelsC = Math.round(period.main.feels_like);

        // Convert to Fahrenheit
        const tempF = celsiusToFahrenheit(tempC);
        const feelsF = celsiusToFahrenheit(feelsC);

        // Format like "34(30) °F" in the template
        return `${tempF}(${feelsF}) °F`;

      case "wind":
        // Get direction arrow
        const deg = period.wind.deg;
        const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
        const index = Math.round(deg / 45) % 8;
        const arrow = directions[index];

        // Format wind speed range like "26-31 km/h"
        const kmh = Math.round(period.wind.speed * 3.6);
        const upperKmh = kmh + 5;
        return `${arrow} ${kmh}-${upperKmh} km/h`;

      case "visibility":
        return `${Math.round(period.visibility / 1000)} km`;

      case "precip":
        const rain = period.rain ? period.rain["3h"] || 0 : 0;
        const snow = period.snow ? period.snow["3h"] || 0 : 0;
        const total = parseFloat((rain + snow).toFixed(1));
        const pop = period.pop ? Math.round(period.pop * 100) : 0;
        return `${total} mm | ${pop}%`;

      default:
        return "   --      ";
    }
  }

  // Create compact cells for each time period
  row += formatBoxCompactCell(
    getContent(periods.morning, rowType),
    cellWidth - 1,
    true,
  );
  row += formatBoxCompactCell(
    getContent(periods.noon, rowType),
    cellWidth - 1,
    true,
  );
  row += formatBoxCompactCell(
    getContent(periods.evening, rowType),
    cellWidth - 1,
    true,
  );
  row += formatBoxCompactCell(
    getContent(periods.night, rowType),
    cellWidth - 1,
    true,
  );

  return row + "\n";
}

/**
 * Formats a cell for a compact weather report.
 * @param {string} content - The content of the cell.
 * @param {number} [cellWidth=25] - The width of the cell.
 * @param {boolean} [useDoubleBox=false] - Whether to use double box characters.
 * @returns {string} The formatted cell.
 */
function formatBoxCompactCell(content, cellWidth = 25, useDoubleBox = false) {
  const paddedContent = " " + content; // Add a space for better readability

  // Ensure content doesn't exceed cell width by truncating if necessary
  const truncatedContent =
    paddedContent.length > cellWidth - 1
      ? paddedContent.substring(0, cellWidth - 1)
      : paddedContent;

  // Calculate remaining space precisely
  const remainingSpace = cellWidth - truncatedContent.length;

  // Use double box character (║) for borders if specified
  const rightBorder = useDoubleBox ? "║" : "│";

  // Return the formatted cell with exact width
  return (
    truncatedContent + " ".repeat(Math.max(0, remainingSpace)) + rightBorder
  );
}

/**
 * Generates ASCII art for weather conditions.
 * @param {Object} forecast - The weather forecast data.
 * @param {boolean} [isCurrent=false] - Whether this is the current weather.
 * @param {number} [boxWidth=46] - The width of the ASCII art box.
 * @returns {string} The ASCII art representation.
 */
function getWeatherAscii(forecast, isCurrent = false, boxWidth = 46) {
  const weather = forecast.weather[0].main.toLowerCase();
  const description = forecast.weather[0].description.toLowerCase();
  const tempC = Math.round(forecast.main.temp);
  const feelsLikeC = Math.round(forecast.main.feels_like);

  // Convert to Fahrenheit
  const tempF = celsiusToFahrenheit(tempC);
  const feelsLikeF = celsiusToFahrenheit(feelsLikeC);

  const windSpeed = Math.round(forecast.wind.speed * 3.6); // Convert m/s to km/h
  const visibility = Math.round(forecast.visibility / 1000); // Convert m to km

  // Detect OS to provide appropriate ASCII art
  const os = detectOS();

  // Enhanced ASCII art to match the template
  let ascii = "";

  if (os === "windows") {
    // Windows-friendly ASCII art for weather conditions
    if (weather.includes("clear")) {
      ascii =
        "    \\   /    \n" +
        "     .-.     \n" +
        "  -- (   ) --\n" +
        "     `-'     \n" +
        "    /   \\    ";
    } else if (weather.includes("cloud")) {
      if (
        description.includes("few") ||
        description.includes("scattered") ||
        description.includes("partly")
      ) {
        ascii =
          "    \\  /     \n" +
          '  _ /"" .-.   \n' +
          "    \\_`(   ). \n" +
          "    /(___(__))\n" +
          "              ";
      } else if (
        description.includes("broken") ||
        description.includes("overcast")
      ) {
        ascii =
          "     .--.    \n" +
          "  .-(    ).  \n" +
          " (___.__)__) \n" +
          "              \n" +
          "              ";
      } else {
        ascii =
          "     .--.    \n" +
          "  .-(    ).  \n" +
          " (___.__)__) \n" +
          "              \n" +
          "              ";
      }
    } else if (weather.includes("rain")) {
      if (description.includes("light") || description.includes("drizzle")) {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "    ' ' ' '  \n" +
          "   ' ' ' '   ";
      } else if (description.includes("heavy")) {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "  ,',',','   \n" +
          "  ,',',','   ";
      } else {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "    ' ' ' '  \n" +
          "   ' ' ' '   ";
      }
    } else if (weather.includes("snow")) {
      if (description.includes("blowing") || description.includes("heavy")) {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "   * * * *   \n" +
          "  * * * *    ";
      } else {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "    *  *  *  \n" +
          "   *  *  *   ";
      }
    } else if (weather.includes("thunder") || weather.includes("storm")) {
      ascii =
        "     .-.     \n" +
        "    (   ).   \n" +
        "   (___(__)  \n" +
        "    / / /    \n" +
        "   / / /     ";
    } else if (weather.includes("fog") || weather.includes("mist")) {
      ascii =
        " _ _ _ _ _  \n" +
        "  _ _ _ _ _  \n" +
        " _ _ _ _ _   \n" +
        "  _ _ _ _ _  \n" +
        " _ _ _ _ _   ";
    } else if (weather.includes("haze") || description.includes("hazy")) {
      ascii =
        "     \\   /   \n" +
        "      .-.     \n" +
        "   –– (   ) ––\n" +
        "      `-'     \n" +
        "     /   \\    ";
    } else if (weather.includes("sun") || description.includes("sunny")) {
      ascii =
        "    \\   /    \n" +
        "     .-.     \n" +
        "  ── (   ) ──\n" +
        "     `-'     \n" +
        "    /   \\    ";
    } else if (description.includes("patchy")) {
      ascii =
        "     .-.     \n" +
        "  .-(    ).  \n" +
        " (___.__)__) \n" +
        "  * * * *    \n" +
        " * * * *     ";
    } else {
      // Default fallback
      ascii =
        "    \\   /    \n" +
        "     .-.     \n" +
        "  -- (   ) --\n" +
        "     `-'     \n" +
        "    /   \\    ";
    }
  } else {
    // Original ASCII art for Mac and other platforms
    if (weather.includes("clear")) {
      ascii =
        "    \\   /    \n" +
        "      .-.    \n" +
        "  ── (   ) ──\n" +
        "      `-'    \n" +
        "    /   \\    ";
    } else if (weather.includes("cloud")) {
      if (
        description.includes("few") ||
        description.includes("scattered") ||
        description.includes("partly")
      ) {
        ascii =
          "    \\  /     \n" +
          '  _ /"" .-.   \n' +
          "    \\_`(   ). \n" +
          "    /(___(__))\n" +
          "              ";
      } else if (
        description.includes("broken") ||
        description.includes("overcast")
      ) {
        ascii =
          "     .--.    \n" +
          "  .-(    ).  \n" +
          " (___.__)__) \n" +
          "              \n" +
          "              ";
      } else {
        ascii =
          "     .--.    \n" +
          "  .-(    ).  \n" +
          " (___.__)__) \n" +
          "              \n" +
          "              ";
      }
    } else if (weather.includes("rain")) {
      if (description.includes("light") || description.includes("drizzle")) {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "    ' ' ' '  \n" +
          "   ' ' ' '   ";
      } else if (description.includes("heavy")) {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "  ,',',','   \n" +
          "  ,',',','   ";
      } else {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "    ' ' ' '  \n" +
          "   ' ' ' '   ";
      }
    } else if (weather.includes("snow")) {
      if (description.includes("blowing") || description.includes("heavy")) {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "   * * * *   \n" +
          "  * * * *    ";
      } else {
        ascii =
          "     .-.     \n" +
          "    (   ).   \n" +
          "   (___(__)  \n" +
          "    *  *  *  \n" +
          "   *  *  *   ";
      }
    } else if (weather.includes("thunder") || weather.includes("storm")) {
      ascii =
        "     .-.     \n" +
        "    (   ).   \n" +
        "   (___(__)  \n" +
        "    ⚡⚡⚡    \n" +
        "   ⚡⚡⚡     ";
    } else if (weather.includes("fog") || weather.includes("mist")) {
      ascii =
        " _ _ _ _ _  \n" +
        "  _ _ _ _ _  \n" +
        " _ _ _ _ _   \n" +
        "  _ _ _ _ _  \n" +
        " _ _ _ _ _   ";
    } else if (weather.includes("haze") || description.includes("hazy")) {
      ascii =
        "     \\   /   \n" +
        "      .-.     \n" +
        "   –– (   ) ––\n" +
        "      `-'     \n" +
        "     /   \\    ";
    } else if (weather.includes("sun") || description.includes("sunny")) {
      ascii =
        "    \\   /    \n" +
        "     .-.     \n" +
        "  ── (   ) ──\n" +
        "     `-'     \n" +
        "    /   \\    ";
    } else if (description.includes("patchy")) {
      ascii =
        "     .-.     \n" +
        "  .-(    ).  \n" +
        " (___.__)__) \n" +
        "  * * * *    \n" +
        " * * * *     ";
    } else {
      // Default fallback
      ascii =
        "    \\   /    \n" +
        "     .-.     \n" +
        "  -- (   ) --\n" +
        "     `-'     \n" +
        "    /   \\    ";
    }
  }

  // Format temperature with range as in the image
  const tempRange = `${tempF}(${feelsLikeF}) °F`;

  // Precipitation field
  let precipitation = "0.0 mm";
  if (forecast.rain) {
    precipitation = `${(forecast.rain["3h"] || 0).toFixed(1)} mm`;
  } else if (forecast.snow) {
    precipitation = `${(forecast.snow["3h"] || 0).toFixed(1)} mm`;
  }

  // Get direction arrow for wind
  const deg = forecast.wind.deg;
  const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const index = Math.round(deg / 45) % 8;
  const arrow = directions[index];

  // If this is the current weather, make it more prominent with a box that aligns with the main table
  if (isCurrent) {
    const weatherCondition = weather.charAt(0).toUpperCase() + weather.slice(1);

    // Create fixed-width box lines for perfect alignment
    const headerLine = `╔${"═".repeat(boxWidth - 2)}╗`;
    const titleLine = `║${centerText("Current: " + weatherCondition, boxWidth - 2)}║`;
    const dividerLine = `╠${"═".repeat(boxWidth - 2)}╣`;
    const footerLine = `╚${"═".repeat(boxWidth - 2)}╝`;

    // Format the ASCII art to fit the box width
    const asciiLines = ascii.split("\n");
    const paddedAsciiLines = asciiLines.map((line) => {
      // Center the ASCII art exactly
      const artPadding = Math.floor((boxWidth - 2 - line.length) / 2);
      return `║${" ".repeat(artPadding)}${line}${" ".repeat(boxWidth - 2 - line.length - artPadding)}║`;
    });

    // Create data lines with consistent padding and width
    const tempLine = `║${centerText(tempRange, boxWidth - 2)}║`;
    const windLine = `║${" ".repeat(2)}${arrow} ${windSpeed} km/h${" ".repeat(boxWidth - 2 - 2 - arrow.length - String(windSpeed).length - 6)}║`;
    const visLine = `║${" ".repeat(2)}${visibility} km${" ".repeat(boxWidth - 2 - 2 - String(visibility).length - 3)}║`;
    const precipLine = `║${" ".repeat(2)}${precipitation}${" ".repeat(boxWidth - 2 - 2 - precipitation.length)}║`;

    const result = [
      headerLine,
      titleLine,
      dividerLine,
      ...paddedAsciiLines,
      dividerLine,
      tempLine,
      windLine,
      visLine,
      precipLine,
      footerLine,
    ].join("\n");

    return result;
  }

  // Format with consistent indentation to match the template
  return (
    `${ascii}\n` +
    ` ${tempRange}\n` +
    ` ${arrow} ${windSpeed} km/h\n` +
    ` ${visibility} km\n` +
    ` ${precipitation}`
  );
}

// ── New terminal emulation commands ───────────────────────────

function displayHistory(limit) {
  const history = limit ? commandHistory.slice(-limit) : commandHistory;
  if (history.length === 0) {
    appendOutput("No commands in history.", "info-text");
    return;
  }
  const offset = limit ? Math.max(0, commandHistory.length - limit) : 0;
  const output = history
    .map((cmd, i) => `  ${String(i + 1 + offset).padStart(4)}  ${cmd}`)
    .join("\n");
  appendOutput(output, "info-text");
}

function displayUptime() {
  appendOutput(
    `up ${formatUptime(Date.now() - sessionStartTime)}`,
    "info-text",
  );
}

function displayNeofetch() {
  const theme = getCurrentTheme() === "light" ? "Light" : "Dark";
  const ms = Date.now() - sessionStartTime;
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const uptimeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
  appendOutput(
    buildNeofetchOutput(
      terminalData.version,
      theme,
      commandList.length,
      uptimeStr,
    ),
    "info-text",
  );
}

function executeStandaloneGrep(argsString) {
  const args = parseGrepArgs(argsString);
  if (!args.pattern) {
    appendOutput("Usage: grep [-ivnc] [pattern]", "info-text");
    return;
  }
  const opts = {
    ignoreCase: args.ignoreCase,
    invert: args.invert,
  };

  let regex;
  try {
    const flags = args.ignoreCase ? "i" : "";
    regex = new RegExp(args.pattern, flags);
  } catch {
    const escaped = args.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = args.ignoreCase ? "i" : "";
    regex = new RegExp(escaped, flags);
  }

  const results = [];

  // Search projects
  const groups = terminalData.projectGroups || {};
  const allProjects = [
    ...(groups.featured || []),
    ...(groups.contributions || []),
    ...(groups.github || []),
  ];
  const matchedProjects = allProjects.filter((p) => {
    const searchable = [
      p.name || "",
      p.description || "",
      p.language || "",
      p.url || "",
    ].join(" ");
    const matches = regex.test(searchable);
    return args.invert ? !matches : matches;
  });

  if (matchedProjects.length > 0) {
    results.push("\u2500\u2500 Projects " + "\u2500".repeat(40));
    matchedProjects.forEach((p) => {
      const lang = p.language ? ` [${p.language}]` : "";
      const desc = p.description ? `  ${p.description}` : "";
      results.push(`  ${p.name}${lang}${desc}`);
    });
  }

  // Search commands
  const matchedCmds = commandList.filter((cmd) => {
    const matches = regex.test(cmd);
    return args.invert ? !matches : matches;
  });
  if (matchedCmds.length > 0) {
    results.push("\u2500\u2500 Commands " + "\u2500".repeat(40));
    matchedCmds.forEach((cmd) => {
      results.push(`  ${cmd}`);
    });
  }

  // Search blog posts
  const allPosts = getAllPosts();
  const matchedPosts = allPosts.filter((p) => {
    const searchable = [
      p.title || "",
      p.summary || "",
      p.content || "",
      p.slug || "",
    ].join(" ");
    const matches = regex.test(searchable);
    return args.invert ? !matches : matches;
  });
  if (matchedPosts.length > 0) {
    results.push("\u2500\u2500 Blog Posts " + "\u2500".repeat(38));
    matchedPosts.forEach((p) => {
      results.push(`  ${p.title}  (${p.date})`);
      results.push(`    \u2192 blog ${p.slug}`);
    });
  }

  if (args.count) {
    const total =
      matchedProjects.length + matchedCmds.length + matchedPosts.length;
    appendOutput(`${total} match${total !== 1 ? "es" : ""}`, "info-text");
  } else if (results.length === 0) {
    appendOutput(`No matches for /${args.pattern}/.`, "info-text");
  } else {
    appendOutput(results.join("\n"), "info-text");
  }
}

function displayManPage(cmd) {
  const helpDetails = getHelpDetails();
  const entry = helpDetails[cmd];
  if (!entry) {
    appendOutput(
      `No manual entry for '${cmd}'. Type 'help' to see all available commands.`,
      "error-text",
    );
    return;
  }
  appendOutput(formatManPage(cmd, entry), "info-text");
}

function getHelpDetails() {
  return {
    banner: {
      desc: "Display the ASCII art banner for the terminal.",
      usage: "banner",
      examples: ["banner"],
      notes:
        "The banner is automatically displayed when the terminal starts or when the screen is cleared.",
    },
    blog: {
      desc: "Read blog posts about projects and engineering.",
      usage: "blog [slug]",
      examples: ["blog", "blog terminal-portfolio", "blog nes-pong"],
      notes:
        "Without arguments, lists all available posts. With a slug, displays the full post.",
    },
    calc: {
      desc: "Evaluate a math expression with support for common functions.",
      usage: "calc [expression]",
      examples: [
        "calc 2 + 2",
        "calc sqrt(144)",
        "calc sin(3.14 / 2)",
        "calc (10 + 5) * 3",
        "calc 2 ^ 10",
        "calc log(100)",
      ],
      notes:
        "Supports +, -, *, /, ^ (power), % (modulo), sqrt, abs, sin, cos, tan, log (base 10), ln (natural). Constants: pi, e.",
    },
    countdown: {
      desc: "Start a visual countdown timer with large ASCII digits.",
      usage: "countdown [seconds]",
      examples: ["countdown 10", "countdown 60", "countdown 300"],
      notes:
        "Displays a progress bar and large digit display. Press q or Esc to cancel. Max 5999 seconds (99:59).",
    },
    clear: {
      desc: "Clear the terminal screen, preserving command history.",
      usage: "clear",
      examples: ["clear"],
      notes:
        "This command preserves your command history, so you can still use up/down arrows to access previous commands.",
    },
    contact: {
      desc: "Display all contact information in one place.",
      usage: "contact",
      examples: ["contact"],
      notes: "Shows email, GitHub, LinkedIn, and website links.",
    },
    converter: {
      desc: "Open the Link Converter tool in a new browser tab.",
      usage: "converter",
      examples: ["converter"],
      notes:
        "This project was created by Jakob to help convert links between different formats.",
    },
    curl: {
      desc: "Make HTTP requests to web servers, APIs, and other web resources.",
      usage: "curl [options] [URL]",
      examples: [
        "curl https://example.com",
        "curl -I https://api.example.org/data",
        'curl -X POST -H "Content-Type: application/json" -d \'{"key":"value"}\' https://api.example.org/data',
      ],
      notes:
        "Supports common options like -X, -H, -d, -I, -o, -v. Browser CORS policy still applies.",
    },
    qr: {
      desc: "Generate a QR code image for a given URL and provide a download button.",
      usage: "qr [URL]",
      examples: ["qr https://jjalangtry.com", "qr github.com/JJALANGTRY"],
      notes: "Uses a public QR API. Ensure the URL is correct before sharing.",
    },
    date: {
      desc: "Display the current date and time based on your local timezone.",
      usage: "date",
      examples: ["date"],
      notes: "The date format follows your browser's locale settings.",
    },
    echo: {
      desc: "Display a line of text in the terminal.",
      usage: "echo [text]",
      examples: ["echo Hello, World!", "echo This is a test"],
      notes: "If no text is provided, usage information will be displayed.",
    },
    email: {
      desc: "Open your default email client to contact Jakob.",
      usage: "email",
      examples: ["email"],
      notes:
        "This will open your system's default email client with jjalangtry@gmail.com as the recipient.",
    },
    experience: {
      desc: "Display work experience and education timeline.",
      usage: "experience",
      examples: ["experience"],
      notes: "Shows a timeline of education, roles, and notable contributions.",
    },
    flip: {
      desc: "Flip text upside down using Unicode characters.",
      usage: "flip [text]",
      examples: ["flip hello world", "flip Jakob Langtry"],
      notes:
        "Reverses and maps each character to its upside-down Unicode equivalent. Great for fun messages.",
    },
    fortune: {
      desc: "Display a random programming quote or piece of wisdom.",
      usage: "fortune",
      examples: ["fortune"],
      notes:
        "Curated collection of quotes from famous programmers and computer scientists. Run multiple times for different quotes.",
    },
    github: {
      desc: "Open Jakob's GitHub profile in a new browser tab.",
      usage: "github",
      examples: ["github", "repo"],
      notes:
        'The command "repo" is an alias for "github" and performs the same action.',
    },
    grep: {
      desc: "Search with regex patterns, wildcards, and flags.",
      usage: "grep [-ivnc] [pattern]",
      examples: [
        "grep python",
        "grep 'foo.*bar'",
        "grep '^C'",
        "grep '(swift|java)'",
        "grep -v test",
        "grep -n TypeScript",
        "grep -c python",
        "help | grep -n weather",
        "ls | grep -v sudo",
      ],
      notes:
        "Supports full regex: . * + ? ^ $ [ ] ( ) | \\. Flags: -i case-insensitive (default), -v invert match, -n line numbers, -c count only. Standalone searches projects, commands, and blog posts. In a pipe, filters output line-by-line.",
    },
    help: {
      desc: "Display a list of available commands with brief descriptions.",
      usage: "help",
      examples: ["help", "command --help"],
      notes:
        "For detailed help on a specific command, type the command name followed by --help.",
    },
    history: {
      desc: "Show command history for the current and previous sessions.",
      usage: "history [clear|N]",
      examples: ["history", "history 10", "history clear"],
      notes:
        "History is persisted in localStorage (up to 50 commands). Use 'history clear' to reset.",
    },
    ls: {
      desc: "List available terminal commands.",
      usage: "ls",
      examples: ["ls"],
      notes:
        "This terminal-style ls command lists supported commands rather than filesystem entries.",
    },
    man: {
      desc: "Display the manual page for a command.",
      usage: "man [command]",
      examples: ["man curl", "man weather", "man grep"],
      notes:
        "Man pages provide detailed usage, examples, and notes for each command.",
    },
    matrix: {
      desc: "Display Matrix-style digital rain animation in the terminal.",
      usage: "matrix",
      examples: ["matrix"],
      notes:
        "Watch cascading Katakana characters fall like rain. Press q or Esc to exit.",
    },
    neofetch: {
      desc: "Display system information in a neofetch-style layout.",
      usage: "neofetch",
      examples: ["neofetch"],
      notes:
        "Shows site version, engine, theme, uptime, and other terminal metadata.",
    },
    projects: {
      desc: "Open projects in a tmux-style split pane showing deployed apps, contributions, and repos.",
      usage: "projects",
      examples: ["projects"],
      notes:
        "Click any project to open it. Type 'close' or press Ctrl+B then q to dismiss the pane.",
    },
    repos: {
      desc: "Display GitHub repositories and contributions in a terminal-style ASCII view.",
      usage: "repos",
      examples: ["repos"],
      notes:
        "Shows deployed projects, contributions to other repos, and more. Run 'projects' for the interactive pane.",
    },
    close: {
      desc: "Close the tmux-style projects split pane.",
      usage: "close",
      examples: ["close", "exit"],
      notes:
        "Also available via 'exit' or the keyboard shortcut Ctrl+B then q.",
    },
    repo: {
      desc: 'Alias for the "github" command. Opens Jakob\'s GitHub profile.',
      usage: "repo",
      examples: ["repo", "github"],
      notes: "This is just an alternative way to access the github command.",
    },
    resume: {
      desc: "View Jakob's resume in a new browser tab.",
      usage: "resume",
      examples: ["resume"],
      notes: "Opens resume.jjalangtry.com in a new tab.",
    },
    skills: {
      desc: "Display skills with proficiency bar charts.",
      usage: "skills [--category name]",
      examples: ["skills", "skills --category Languages"],
      notes: "Shows all skill categories by default. Use --category to filter.",
    },
    snake: {
      desc: "Play a Snake game in the terminal.",
      usage: "snake",
      examples: ["snake"],
      notes:
        "Use arrow keys or WASD to move. Press q or Esc to quit. Score increases with each food item.",
    },
    stats: {
      desc: "Show visitor and session statistics.",
      usage: "stats",
      examples: ["stats"],
      notes: "Tracks commands, sessions, and visit history in localStorage.",
    },
    theme: {
      desc: "Toggle between dark and light terminal themes.",
      usage: "theme [dark|light]",
      examples: ["theme", "theme dark", "theme light"],
      notes:
        "Without arguments, toggles to the opposite theme. Preference is saved in your browser.",
    },
    uptime: {
      desc: "Display how long the current terminal session has been active.",
      usage: "uptime",
      examples: ["uptime"],
      notes: "Tracks time since the page was loaded.",
    },
    weather: {
      desc: "Display weather forecast for a specified location.",
      usage: "weather [city or location]",
      examples: [
        "weather New York",
        "weather Syracuse NY",
        "weather London, UK",
        "weather Paris France",
      ],
      notes:
        "Weather data is retrieved in real-time. The display format will adapt based on your device type.",
    },
    whoami: {
      desc: "Display information about Jakob Langtry.",
      usage: "whoami",
      examples: ["whoami"],
      notes:
        "Shows custom bio if set via 'edit whoami', otherwise shows the default bio.",
    },
    write: {
      desc: "Create a new blog post in a vi-like editor.",
      usage: "write",
      examples: ["write"],
      notes:
        "Enter a title, then type the post body line by line. :wq saves, :q cancels. Posts are saved in your browser's localStorage.",
    },
    edit: {
      desc: "Edit site content stored in your browser.",
      usage: "edit whoami",
      examples: ["edit whoami"],
      notes:
        "Currently supports editing the whoami bio text. Changes are stored in localStorage.",
    },
    export: {
      desc: "Export user-created posts as JSON.",
      usage: "export posts",
      examples: ["export posts"],
      notes:
        "Outputs JSON for all posts you created with 'write'. Copy this into public/data/posts.json to make them permanent.",
    },
    rss: {
      desc: "Show the RSS feed URL for blog subscriptions.",
      usage: "rss",
      examples: ["rss"],
      notes: "The RSS feed at /rss.xml includes all built-in blog posts.",
    },
    login: {
      desc: "Authenticate as admin to unlock content management commands.",
      usage: "login",
      examples: ["login"],
      notes:
        "Prompts for a password. The hash is configured via ADMIN_PASSWORD_HASH env var at build time. If no hash is set, admin commands are unrestricted.",
    },
    logout: {
      desc: "End the admin session.",
      usage: "logout",
      examples: ["logout"],
      notes: "Revokes admin access and switches the prompt back to guest.",
    },
  };
}

// ── Content commands ──────────────────────────────────────────

function displayRssInfo() {
  const feedUrl = `${window.location.origin}/rss.xml`;
  const container = document.createElement("div");
  container.className = "info-text";
  container.style.whiteSpace = "pre-wrap";

  container.appendChild(document.createTextNode("RSS Feed\n────────\n\n"));

  const feedLink = document.createElement("a");
  feedLink.href = feedUrl;
  feedLink.target = "_blank";
  feedLink.rel = "noopener noreferrer";
  feedLink.textContent = feedUrl;
  feedLink.style.color = "inherit";
  feedLink.style.textDecoration = "underline";
  container.appendChild(feedLink);
  container.appendChild(document.createTextNode("\n\n"));

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "command-chip";
  copyBtn.style.display = "inline-block";
  copyBtn.textContent = "Copy Feed URL";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(feedUrl).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Feed URL";
      }, 2000);
    });
  });
  container.appendChild(copyBtn);

  container.appendChild(document.createTextNode("  "));

  const feedlyBtn = document.createElement("a");
  feedlyBtn.href = `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}`;
  feedlyBtn.target = "_blank";
  feedlyBtn.rel = "noopener noreferrer";
  feedlyBtn.className = "command-chip";
  feedlyBtn.style.textDecoration = "none";
  feedlyBtn.style.display = "inline-block";
  feedlyBtn.textContent = "Open in Feedly";
  container.appendChild(feedlyBtn);

  container.appendChild(
    document.createTextNode(
      "\n\nPaste the URL into any RSS reader to subscribe.",
    ),
  );

  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(container, inputLine);
  } else {
    cliOutput.appendChild(container);
  }
  cliOutput.scrollTop = cliOutput.scrollHeight;
}

function displayContact() {
  const container = document.createElement("div");
  container.className = "info-text";
  container.style.whiteSpace = "pre-wrap";

  const contacts = [
    {
      label: "Email",
      value: "jjalangtry@gmail.com",
      href: "mailto:jjalangtry@gmail.com",
    },
    {
      label: "GitHub",
      value: "github.com/JJALANGTRY",
      href: "https://github.com/JJALANGTRY",
    },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/jjalangtry",
      href: "https://linkedin.com/in/jjalangtry",
    },
    {
      label: "Website",
      value: "jakoblangtry.com",
      href: "https://jakoblangtry.com",
    },
  ];

  const top =
    "┌────────────────────────────────────────┐\n│          CONTACT INFORMATION           │\n├────────────────────────────────────────┤\n";
  const bottom = "└────────────────────────────────────────┘";

  container.appendChild(document.createTextNode(top));
  contacts.forEach((c) => {
    container.appendChild(document.createTextNode(`│  ${c.label.padEnd(9)} `));
    const a = document.createElement("a");
    a.href = c.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = c.value;
    a.style.color = "inherit";
    a.style.textDecoration = "underline";
    container.appendChild(a);
    const pad = 28 - c.value.length;
    container.appendChild(
      document.createTextNode(`${" ".repeat(Math.max(0, pad))}│\n`),
    );
  });
  container.appendChild(document.createTextNode(bottom));

  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(container, inputLine);
  } else {
    cliOutput.appendChild(container);
  }
  cliOutput.scrollTop = cliOutput.scrollHeight;
}

function displaySkills(categoryFilter) {
  const categories = terminalData.skills || [];
  if (categories.length === 0) {
    appendOutput("No skills data available.", "info-text");
    return;
  }
  const filtered = categoryFilter
    ? categories.filter(
        (c) => c.name.toLowerCase() === categoryFilter.toLowerCase(),
      )
    : categories;
  if (filtered.length === 0) {
    appendOutput(
      `Category "${categoryFilter}" not found. Available: ${categories.map((c) => c.name).join(", ")}`,
      "error-text",
    );
    return;
  }
  appendOutput(buildSkillsOutput(filtered), "info-text");
}

function displayExperience() {
  const entries = terminalData.experience || [];
  appendOutput(buildExperienceOutput(entries), "info-text");
}

function displayBlogList() {
  const allPosts = getAllPosts();
  const localSlugs = new Set(loadLocalPosts().map((p) => p.slug));
  appendOutput(buildBlogListOutput(allPosts), "info-text");
  if (localSlugs.size > 0) {
    const slugList = [...localSlugs].map((s) => `delete ${s}`).join(", ");
    appendOutput(`Your posts: ${slugList}`, "log-text");
  }
}

function displayBlogPost(pattern) {
  const posts = getAllPosts();
  const slugs = posts.map((p) => p.slug);
  const matches = expandGlob(pattern.toLowerCase(), slugs);

  if (matches.length === 0) {
    appendOutput(
      `No posts matching "${pattern}". Type 'blog' to see available posts.`,
      "error-text",
    );
    return;
  }

  matches.forEach((slug) => {
    const post = posts.find((p) => p.slug === slug);
    if (post) appendOutput(buildBlogPostOutput(post), "info-text");
  });
}

function displayStats() {
  const raw = loadStats() || {
    totalCommands: 0,
    sessions: 1,
    firstVisit: new Date().toISOString().split("T")[0],
    commandCounts: {},
  };
  const ms = Date.now() - sessionStartTime;
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const uptimeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

  const sorted = Object.entries(raw.commandCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  appendOutput(
    buildStatsOutput({
      sessionCommands: sessionCommandCount,
      uptime: uptimeStr,
      totalCommands: raw.totalCommands,
      sessions: raw.sessions,
      firstVisit: raw.firstVisit,
      topCommands: sorted.map(([name, count]) => ({ name, count })),
    }),
    "info-text",
  );
}

// ── Snake game ────────────────────────────────────────────────

function startSnakeGame() {
  if (snakeActive) {
    appendOutput(
      "Snake is already running! Press q or Esc to quit.",
      "info-text",
    );
    return;
  }
  snakeActive = true;
  if (inputLine) inputLine.style.display = "none";

  const W = 30;
  const H = 15;
  let snake = [{ x: Math.floor(W / 2), y: Math.floor(H / 2) }];
  let dir = { x: 0, y: 0 };
  let nextDir = { x: 0, y: 0 };
  let started = false;
  let food = placeFood();
  let score = 0;
  let gameOver = false;
  let speed = 150;

  function placeFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * W),
        y: Math.floor(Math.random() * H),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  const gameEl = document.createElement("div");
  gameEl.className = "info-text";
  gameEl.style.whiteSpace = "pre";
  gameEl.style.lineHeight = "1.15";
  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(gameEl, inputLine);
  } else {
    cliOutput.appendChild(gameEl);
  }

  function render() {
    let frame = `┌${"─".repeat(W)}┐  Score: ${score}\n`;
    for (let y = 0; y < H; y++) {
      let row = "│";
      for (let x = 0; x < W; x++) {
        if (snake[0].x === x && snake[0].y === y) row += "█";
        else if (snake.some((s) => s.x === x && s.y === y)) row += "▓";
        else if (food.x === x && food.y === y) row += "●";
        else row += " ";
      }
      row += "│";
      frame += row + "\n";
    }
    frame += `└${"─".repeat(W)}┘`;
    if (gameOver)
      frame +=
        "\n\n  GAME OVER! Score: " +
        score +
        "\n  Press any key to return to terminal.";
    else if (!started)
      frame += "\n  Press an arrow key or WASD to start · q / Esc to quit";
    else frame += "\n  Arrow keys / WASD to move · q / Esc to quit";
    gameEl.textContent = frame;
    cliOutput.scrollTop = cliOutput.scrollHeight;
  }

  function tick() {
    if (gameOver || !snakeActive || !started) return;
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (
      head.x < 0 ||
      head.x >= W ||
      head.y < 0 ||
      head.y >= H ||
      snake.some((s) => s.x === head.x && s.y === head.y)
    ) {
      gameOver = true;
      render();
      clearInterval(snakeInterval);
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      food = placeFood();
      if (speed > 60) speed -= 5;
      clearInterval(snakeInterval);
      snakeInterval = setInterval(tick, speed);
    } else {
      snake.pop();
    }
    render();
  }

  function handleKey(e) {
    if (gameOver) {
      cleanUp();
      e.preventDefault();
      return;
    }
    const key = e.key.toLowerCase();
    if (key === "escape" || key === "q") {
      e.preventDefault();
      cleanUp();
      return;
    }
    let newDir = null;
    if (key === "arrowup" || key === "w") newDir = { x: 0, y: -1 };
    else if (key === "arrowdown" || key === "s") newDir = { x: 0, y: 1 };
    else if (key === "arrowleft" || key === "a") newDir = { x: -1, y: 0 };
    else if (key === "arrowright" || key === "d") newDir = { x: 1, y: 0 };
    if (newDir) {
      if (started) {
        if (
          (newDir.x !== 0 && newDir.x !== -dir.x) ||
          (newDir.y !== 0 && newDir.y !== -dir.y)
        ) {
          nextDir = newDir;
        }
      } else {
        nextDir = newDir;
        started = true;
        dir = { ...nextDir };
        snakeInterval = setInterval(tick, speed);
      }
    }
    e.preventDefault();
  }

  function cleanUp() {
    snakeActive = false;
    clearInterval(snakeInterval);
    document.removeEventListener("keydown", handleKey, true);
    if (inputLine) inputLine.style.display = "";
    if (!gameOver) {
      gameEl.textContent += `\n\n  Quit. Score: ${score}`;
    }
    appendOutput("", "");
    if (currentInput) currentInput.focus();
  }

  document.addEventListener("keydown", handleKey, true);
  render();
}

// ── Matrix rain ───────────────────────────────────────────────

function startMatrixRain() {
  if (matrixActive) {
    appendOutput(
      "Matrix is already running! Press q or Esc to quit.",
      "info-text",
    );
    return;
  }
  matrixActive = true;
  if (inputLine) inputLine.style.display = "none";

  const W = 60;
  const H = 20;
  const CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
  const columns = [];

  for (let i = 0; i < W; i++) {
    columns.push({
      y: Math.floor(Math.random() * H),
      speed: 1 + Math.floor(Math.random() * 2),
      length: 4 + Math.floor(Math.random() * 12),
      tick: 0,
    });
  }

  const grid = [];
  for (let y = 0; y < H; y++) {
    grid[y] = [];
    for (let x = 0; x < W; x++) {
      grid[y][x] = " ";
    }
  }

  const gameEl = document.createElement("div");
  gameEl.className = "info-text";
  gameEl.style.whiteSpace = "pre";
  gameEl.style.lineHeight = "1.15";
  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(gameEl, inputLine);
  } else {
    cliOutput.appendChild(gameEl);
  }

  function render() {
    let frame = "";
    for (let y = 0; y < H; y++) {
      frame += grid[y].join("") + "\n";
    }
    frame += "\n  Press q or Esc to exit";
    gameEl.textContent = frame;
    cliOutput.scrollTop = cliOutput.scrollHeight;
  }

  function tick() {
    if (!matrixActive) return;
    for (let x = 0; x < W; x++) {
      const col = columns[x];
      col.tick++;
      if (col.tick < col.speed) continue;
      col.tick = 0;

      grid[col.y][x] = CHARS[Math.floor(Math.random() * CHARS.length)];

      const tailY = col.y - col.length;
      if (tailY >= 0 && tailY < H) {
        grid[tailY][x] = " ";
      }
      if (tailY >= H) {
        for (let clearY = 0; clearY < H; clearY++) {
          grid[clearY][x] = " ";
        }
        col.y = -Math.floor(Math.random() * H);
        col.speed = 1 + Math.floor(Math.random() * 2);
        col.length = 4 + Math.floor(Math.random() * 12);
      }
      col.y++;
    }
    render();
  }

  function handleKey(e) {
    const key = e.key.toLowerCase();
    if (key === "escape" || key === "q") {
      e.preventDefault();
      cleanUp();
    }
  }

  function cleanUp() {
    matrixActive = false;
    clearInterval(matrixInterval);
    document.removeEventListener("keydown", handleKey, true);
    if (inputLine) inputLine.style.display = "";
    appendOutput("", "");
    if (currentInput) currentInput.focus();
  }

  document.addEventListener("keydown", handleKey, true);
  matrixInterval = setInterval(tick, 60);
  render();
}

// ── Countdown timer ───────────────────────────────────────────

function startCountdown(totalSeconds) {
  if (countdownActive) {
    appendOutput(
      "A countdown is already running! Wait for it to finish or press q/Esc.",
      "info-text",
    );
    return;
  }
  countdownActive = true;
  if (inputLine) inputLine.style.display = "none";

  let remaining = totalSeconds;

  const el = document.createElement("div");
  el.className = "info-text";
  el.style.whiteSpace = "pre";
  el.style.lineHeight = "1.3";
  if (inputLine && inputLine.parentNode === cliOutput) {
    cliOutput.insertBefore(el, inputLine);
  } else {
    cliOutput.appendChild(el);
  }

  function render() {
    let frame = `\n${renderBigTime(remaining)}\n`;
    const pct = remaining / totalSeconds;
    const barW = 30;
    const filled = Math.round(pct * barW);
    frame += `\n  [${"█".repeat(filled)}${"░".repeat(barW - filled)}] ${remaining}s remaining\n`;
    if (remaining > 0) {
      frame += "\n  Press q or Esc to cancel";
    } else {
      frame +=
        "\n  ╔═══════════════════════╗\n  ║     ⏰ TIME'S UP!     ║\n  ╚═══════════════════════╝\n\n  Press any key to continue";
    }
    el.textContent = frame;
    cliOutput.scrollTop = cliOutput.scrollHeight;
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      clearInterval(countdownInterval);
      render();
      return;
    }
    render();
  }

  function handleKey(e) {
    e.preventDefault();
    if (remaining > 0) {
      const key = e.key.toLowerCase();
      if (key === "escape" || key === "q") {
        cleanUp(true);
      }
    } else {
      cleanUp(false);
    }
  }

  function cleanUp(cancelled) {
    countdownActive = false;
    clearInterval(countdownInterval);
    document.removeEventListener("keydown", handleKey, true);
    if (inputLine) inputLine.style.display = "";
    if (cancelled) {
      el.textContent += "\n\n  Countdown cancelled.";
    }
    appendOutput("", "");
    if (currentInput) currentInput.focus();
  }

  document.addEventListener("keydown", handleKey, true);
  render();
  countdownInterval = setInterval(tick, 1000);
}

// ── Editor mode ───────────────────────────────────────────────

function setPromptText(text) {
  const prompt = inputLine ? inputLine.querySelector(".prompt") : null;
  if (prompt) prompt.textContent = text;
}

function getPromptPrefix() {
  const user = isAdmin ? "admin" : "guest";
  return `${user}@jjalangtry.com:~$ `;
}

function updatePromptUser() {
  setPromptText(getPromptPrefix());
}

function handleEditorInput(command, raw) {
  if (editorState.phase === "login") {
    editorState = null;
    if (currentInput) currentInput.type = "text";
    const echoLine = document.createElement("div");
    echoLine.textContent = "Password: ********";
    if (inputLine && inputLine.parentNode === cliOutput)
      cliOutput.insertBefore(echoLine, inputLine);
    const expected = (window.ENV?.ADMIN_PASSWORD_HASH || "").trim();
    if (!expected) {
      isAdmin = true;
      updatePromptUser();
      appendOutput("No password configured. Authenticated.", "success-text");
      return;
    }
    hashPassword(command).then((hash) => {
      if (hash === expected) {
        isAdmin = true;
        updatePromptUser();
        appendOutput("Authenticated. Admin commands unlocked.", "success-text");
      } else {
        updatePromptUser();
        appendOutput("Authentication failed.", "error-text");
      }
    });
    return;
  }

  if (editorState.phase === "title") {
    if (!command) {
      appendOutput("Title cannot be empty. Type :q to cancel.", "error-text");
      return;
    }
    if (command === ":q") {
      appendOutput("Write cancelled.", "info-text");
      editorState = null;
      updatePromptUser();
      return;
    }
    const echoLine = document.createElement("div");
    echoLine.textContent = `Title: ${command}`;
    if (inputLine && inputLine.parentNode === cliOutput)
      cliOutput.insertBefore(echoLine, inputLine);
    editorState = { phase: "body", title: command, lines: [] };
    setPromptText("> ");
    showEditorHint();
    return;
  }

  if (editorState.phase === "body") {
    if (command === ":wq") {
      const title = editorState.title;
      const content = editorState.lines.join("\n");
      const slug = slugify(title);
      const post = {
        slug,
        title,
        date: new Date().toISOString().split("T")[0],
        summary:
          content.substring(0, 80).replace(/\n/g, " ") +
          (content.length > 80 ? "..." : ""),
        content,
      };
      const posts = loadLocalPosts();
      posts.unshift(post);
      saveLocalPosts(posts);
      editorState = null;
      updatePromptUser();
      appendOutput(`Post saved! Read it with: blog ${slug}`, "success-text");
      return;
    }
    if (command === ":q") {
      editorState = null;
      updatePromptUser();
      appendOutput("Write cancelled. Draft discarded.", "info-text");
      return;
    }
    if (command === ":help") {
      appendOutput(
        "Editor commands:\n" +
          "  :wq        Save and exit\n" +
          "  :q         Cancel and discard\n" +
          "  :preview   Preview the post so far\n" +
          "  :lines     Show numbered lines\n" +
          "  :undo      Remove the last line\n" +
          "  :clear     Clear all body text\n" +
          "  :title     Change title (e.g. :title My New Title)\n" +
          "  :help      Show this help",
        "info-text",
      );
      return;
    }
    if (command === ":preview") {
      const width = 60;
      const border = "\u2500".repeat(width);
      let preview = `\u250C${border}\u2510\n`;
      preview += `\u2502 ${editorState.title.slice(0, width - 2).padEnd(width - 1)}\u2502\n`;
      preview += `\u2514${border}\u2518\n\n`;
      preview += editorState.lines.join("\n") || "(empty)";
      appendOutput(preview, "info-text");
      return;
    }
    if (command === ":lines") {
      if (editorState.lines.length === 0) {
        appendOutput("(no lines yet)", "info-text");
      } else {
        const numbered = editorState.lines
          .map((l, i) => `  ${String(i + 1).padStart(3)}  ${l}`)
          .join("\n");
        appendOutput(numbered, "info-text");
      }
      return;
    }
    if (command === ":undo") {
      if (editorState.lines.length === 0) {
        appendOutput("Nothing to undo.", "info-text");
      } else {
        const removed = editorState.lines.pop();
        appendOutput(`Removed: ${removed}`, "info-text");
      }
      return;
    }
    if (command === ":clear") {
      editorState.lines = [];
      appendOutput("Body cleared.", "info-text");
      return;
    }
    if (command.startsWith(":title ")) {
      const newTitle = command.substring(7).trim();
      if (newTitle) {
        editorState.title = newTitle;
        appendOutput(`Title changed to: ${newTitle}`, "success-text");
      } else {
        appendOutput("Usage: :title New Title Here", "info-text");
      }
      return;
    }
    const echoLine = document.createElement("div");
    echoLine.textContent = `> ${raw}`;
    if (inputLine && inputLine.parentNode === cliOutput)
      cliOutput.insertBefore(echoLine, inputLine);
    editorState.lines.push(raw);
    cliOutput.scrollTop = cliOutput.scrollHeight;
    return;
  }

  if (editorState.phase === "whoami") {
    if (command === ":q") {
      editorState = null;
      updatePromptUser();
      appendOutput("Edit cancelled.", "info-text");
      return;
    }
    if (command === ":wq") {
      const text = editorState.lines.join("\n");
      saveCustomWhoami(text);
      editorState = null;
      updatePromptUser();
      appendOutput("Bio updated! Type 'whoami' to see it.", "success-text");
      return;
    }
    const echoLine = document.createElement("div");
    echoLine.textContent = `> ${raw}`;
    if (inputLine && inputLine.parentNode === cliOutput)
      cliOutput.insertBefore(echoLine, inputLine);
    editorState.lines.push(raw);
    cliOutput.scrollTop = cliOutput.scrollHeight;
    return;
  }
}

function startWrite() {
  editorState = { phase: "title" };
  setPromptText("Title: ");
  appendOutput("New post \u2014 enter a title, or :q to cancel.", "info-text");
}

function showEditorHint() {
  appendOutput(
    "Type your post line by line. Editor commands:\n" +
      "  :wq  save    :q  cancel    :preview    :undo    :lines    :help",
    "info-text",
  );
}

function startEditWhoami() {
  const current =
    loadCustomWhoami() ||
    "Jakob Langtry - Software Engineering Student at Rochester Institute of Technology.\nPassionate about web development, backend systems, and creating useful applications.\nCurrently seeking opportunities in software engineering.";
  editorState = { phase: "whoami", lines: [] };
  setPromptText("> ");
  appendOutput(
    `Current bio:\n${current}\n\nType new bio lines. :wq to save, :q to cancel.`,
    "info-text",
  );
}

function deleteLocalPost(pattern) {
  const posts = loadLocalPosts();
  const slugs = posts.map((p) => p.slug);
  const matches = expandGlob(pattern, slugs);

  if (matches.length === 0) {
    const isStatic = (terminalData.posts || []).some((p) => p.slug === pattern);
    if (isStatic) {
      appendOutput(
        `Cannot delete "${pattern}" \u2014 it's a built-in post. Only user-created posts can be deleted.`,
        "error-text",
      );
    } else {
      appendOutput(`No posts matching "${pattern}".`, "error-text");
    }
    return;
  }

  const remaining = posts.filter((p) => !matches.includes(p.slug));
  saveLocalPosts(remaining);
  if (matches.length === 1) {
    appendOutput(`Deleted "${matches[0]}".`, "success-text");
  } else {
    appendOutput(
      `Deleted ${matches.length} posts: ${matches.join(", ")}`,
      "success-text",
    );
  }
}

function exportLocalPosts() {
  const posts = loadLocalPosts();
  if (posts.length === 0) {
    appendOutput(
      "No user-created posts to export. Use 'write' to create one.",
      "info-text",
    );
    return;
  }
  appendOutput(
    `${posts.length} user-created post(s):\n\n${JSON.stringify(posts, null, 2)}\n\nCopy the JSON above and add it to public/data/posts.json to make posts permanent.`,
    "info-text",
  );
}

// ── Pipe support ──────────────────────────────────────────────

function executePipeline(input) {
  const filtered = parsePipeline(input);

  if (filtered.length <= 1) {
    executeCommand(input);
    return;
  }

  // Echo the full pipeline
  const echoLine = document.createElement("div");
  echoLine.textContent = `guest@jjalangtry.com:~$ ${input}`;
  cliOutput.insertBefore(echoLine, inputLine);

  const firstCmd = filtered[0].trim().toLowerCase();
  if (
    firstCmd === "repos" ||
    firstCmd.startsWith("weather ") ||
    firstCmd.startsWith("curl ")
  ) {
    appendOutput(
      "Pipe is not supported for async commands (repos, weather, curl).",
      "error-text",
    );
    return;
  }

  // Capture output from first command
  captureMode = true;
  capturedLines = [];
  executeCommand(filtered[0], { skipEcho: true });
  captureMode = false;

  // Combine captured text
  let output = capturedLines.map((l) => l.text).join("\n");

  // Process pipe segments
  for (let i = 1; i < filtered.length; i++) {
    const pipeCmd = filtered[i].trim();
    const pipeCmdLower = pipeCmd.toLowerCase();

    if (pipeCmdLower.startsWith("grep ")) {
      const grepArgs = parseGrepArgs(pipeCmd.substring(5).trim());
      if (!grepArgs.pattern) {
        appendOutput("grep: missing pattern", "error-text");
        return;
      }
      output = grepFilter(output, grepArgs.pattern, {
        ignoreCase: grepArgs.ignoreCase,
        invert: grepArgs.invert,
        lineNumbers: grepArgs.lineNumbers,
        count: grepArgs.count,
      }).join("\n");
    } else if (pipeCmdLower === "grep") {
      appendOutput("grep: missing pattern", "error-text");
      return;
    } else {
      appendOutput(
        `Pipe error: unsupported pipe command '${pipeCmd}'. Only 'grep' is supported after |.`,
        "error-text",
      );
      return;
    }
  }

  if (output.trim()) {
    appendOutput(output, "info-text");
  } else {
    appendOutput("(no matches)", "info-text");
  }
}

/**
 * Initializes the command-line interface (CLI) functionality.
 * Sets up the output area, displays initial messages, creates the input line,
 * and attaches necessary event listeners for input, history, and focus management.
 */
function initCLI() {
  cliOutput = document.getElementById("cli-output");
  displayBanner();
  displayWelcomeMessage();
  displayOnboardingCommands();

  const { inputLine: newInputLine, input } = createInputLine();
  inputLine = newInputLine;
  if (!cliOutput.contains(inputLine)) {
    cliOutput.appendChild(inputLine);
  }

  // Auto-focus only on keyboard/mouse-first devices.
  if (shouldAutoFocusTerminal()) {
    input.focus();
  }

  // Get the custom cursor element and set it to the global variable
  cursor = inputLine.querySelector(".terminal-cursor");

  // Get the terminal element
  const terminal = document.querySelector(".terminal");

  // Better text selection handling
  let mouseDownTarget = null;
  let hasMovedMouse = false;

  // Track mousedown to determine if user is starting text selection
  terminal.addEventListener("mousedown", function (e) {
    mouseDownTarget = e.target;
    hasMovedMouse = false;
  });

  // Track mouse movement to detect selection
  terminal.addEventListener("mousemove", function (e) {
    if (e.buttons === 1) {
      // Left mouse button is pressed
      hasMovedMouse = true;
    }
  });

  // Handle click on terminal - focus input unless user was selecting text
  terminal.addEventListener("click", function (e) {
    // Don't handle clicks on links
    if (e.target.tagName === "A") {
      return;
    }

    // Check if user was selecting text (had mouse down and moved before releasing)
    if (hasMovedMouse && window.getSelection().toString().length > 0) {
      // User was selecting text, don't focus input
      return;
    }

    // Get the current selection
    const selection = window.getSelection();

    // Don't focus if user is selecting text
    if (selection.type === "Range" && selection.toString().length > 0) {
      return;
    }

    // Otherwise, focus the input field
    input.focus();

    // Position cursor at the end of input
    const length = input.value.length;
    input.setSelectionRange(length, length);
    updateCursorPosition();
  });

  /**
   * Updates the position of the custom terminal cursor based on the input field's content
   * and selection start. Uses a temporary span to measure text width.
   */
  function updateCursorPosition() {
    if (!currentInput || !cursor) return;

    // Create a temporary span to measure text width
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "pre";
    span.style.font = window.getComputedStyle(currentInput).font;
    span.textContent = currentInput.value.substring(
      0,
      currentInput.selectionStart,
    );
    document.body.appendChild(span);

    // Get the width and update the cursor position
    const width = span.getBoundingClientRect().width;
    cursor.style.left = `${width + 4}px`; // 4px is the left margin of the input

    // Clean up the span
    document.body.removeChild(span);
  }

  // Update cursor position initially and on input events
  updateCursorPosition();
  input.addEventListener("input", updateCursorPosition);
  input.addEventListener("keydown", () => setTimeout(updateCursorPosition, 0));
  input.addEventListener("click", updateCursorPosition);
  input.addEventListener("select", updateCursorPosition);

  // Add event listener for navigating command history
  input.addEventListener("keydown", (e) => {
    // Ctrl+L (Clear screen)
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      executeCommand("clear");
      return;
    }

    // Ctrl+C (Cancel current input)
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      const currentText = e.target.value;
      const commandLine = document.createElement("div");
      commandLine.textContent = `guest@jjalangtry.com:~$ ${currentText}^C`;
      cliOutput.insertBefore(commandLine, inputLine);

      e.target.value = "";
      currentInputBuffer = "";
      cliOutput.scrollTop = cliOutput.scrollHeight;
      return;
    }

    // Ctrl+B prefix for tmux-style shortcuts
    if (e.ctrlKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      const handler = (ev) => {
        input.removeEventListener("keydown", handler);
        if (ev.key === "q" || ev.key === "x") {
          ev.preventDefault();
          if (tmuxActive) {
            closeProjectsPane();
            appendOutput("Closed projects pane.", "info-text");
          }
        }
      };
      input.addEventListener("keydown", handler, { once: true });
      return;
    }

    // Tab completion
    if (e.key === "Tab") {
      e.preventDefault();
      const currentText = e.target.value;
      const currentLower = currentText.toLowerCase();
      if (!currentLower) return;

      // Argument completion for known commands
      const spaceIdx = currentLower.indexOf(" ");
      if (spaceIdx > 0) {
        const baseCmd = currentLower.substring(0, spaceIdx);
        const arg = currentLower.substring(spaceIdx + 1);
        let completions = [];
        if (baseCmd === "blog") {
          completions = getAllPosts()
            .map((p) => p.slug)
            .filter((s) => s.startsWith(arg));
        } else if (baseCmd === "delete") {
          completions = loadLocalPosts()
            .map((p) => p.slug)
            .filter((s) => s.startsWith(arg));
        } else if (baseCmd === "theme") {
          completions = ["dark", "light"].filter((s) => s.startsWith(arg));
        } else if (baseCmd === "man" || baseCmd === "help") {
          completions = commandList.filter((c) => c.startsWith(arg));
        } else if (currentLower.startsWith("skills --category ")) {
          const catArg = currentLower.substring(18);
          completions = (terminalData.skills || [])
            .map((c) => c.name.toLowerCase())
            .filter((n) => n.startsWith(catArg));
        }
        if (completions.length === 1) {
          e.target.value = `${baseCmd} ${completions[0]}`;
        } else if (completions.length > 1) {
          const commandLine = document.createElement("div");
          commandLine.textContent = `guest@jjalangtry.com:~$ ${currentText}`;
          cliOutput.insertBefore(commandLine, inputLine);
          appendOutput(completions.join("  "), "info-text");
          cliOutput.scrollTop = cliOutput.scrollHeight;
        }
        return;
      }

      // Command name completion
      const matches = commandList.filter((cmd) => cmd.startsWith(currentLower));

      if (matches.length === 1) {
        e.target.value = matches[0] + " ";
      } else if (matches.length > 1) {
        const commandLine = document.createElement("div");
        commandLine.textContent = `guest@jjalangtry.com:~$ ${currentText}`;
        cliOutput.insertBefore(commandLine, inputLine);
        appendOutput(matches.join("  "), "info-text");
        cliOutput.scrollTop = cliOutput.scrollHeight;
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const rawInput = e.target.value;
      const command = rawInput.trim();

      // Editor mode handling
      if (editorState) {
        e.target.value = "";
        handleEditorInput(command, rawInput);
        return;
      }

      if (command) {
        commandHistory.push(command);
        if (commandHistory.length > 50) commandHistory.shift();
        try {
          localStorage.setItem(
            "terminal-history",
            JSON.stringify(commandHistory),
          );
        } catch (err) {
          // ignore
        }
        historyIndex = commandHistory.length;
        currentInputBuffer = "";
        trackCommand(command);
        if (command.includes("|")) {
          executePipeline(command);
        } else {
          executeCommand(command);
        }
        e.target.value = "";
      }
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (historyIndex === commandHistory.length) {
          currentInputBuffer = e.target.value;
        }
        if (historyIndex > 0) {
          historyIndex--;
          e.target.value = commandHistory[historyIndex];
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          e.target.value = commandHistory[historyIndex];
        } else if (historyIndex === commandHistory.length - 1) {
          historyIndex = commandHistory.length;
          e.target.value = currentInputBuffer;
        }
        break;
    }
    // Move cursor to end of input
    setTimeout(() => {
      e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
    }, 0);
  });

  // Global typing listener
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (e.key.length !== 1 && e.key !== "Backspace") return;
    if (currentInput && document.activeElement !== currentInput) {
      currentInput.focus();
    }
  });
}

/**
 * Parses a curl command string into a structured object with options and URL.
 * @param {string} cmdString - The curl command string to parse (without the 'curl' part)
 * @returns {Object} - Parsed command with options and URL
 */
function parseCurlCommand(cmdString) {
  const result = {
    url: "",
    method: "GET",
    headers: {},
    data: null,
    headOnly: false,
    verbose: false,
    outputFile: null,
  };

  // Simple regex-based parser for curl arguments
  // This is a simplified version that handles the most common cases
  let inQuotes = false;
  let currentQuote = "";
  let tokens = [];
  let current = "";

  // Tokenize the command string
  for (let i = 0; i < cmdString.length; i++) {
    const char = cmdString[i];

    if (
      (char === '"' || char === "'") &&
      (i === 0 || cmdString[i - 1] !== "\\")
    ) {
      if (inQuotes && currentQuote === char) {
        // End of quoted string
        inQuotes = false;
        currentQuote = "";
        tokens.push(current);
        current = "";
      } else if (!inQuotes) {
        // Start of quoted string
        inQuotes = true;
        currentQuote = char;
        if (current) {
          tokens.push(current);
          current = "";
        }
      } else {
        // Different quote inside a quoted string
        current += char;
      }
    } else if (char === " " && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  // Parse tokens into options and URL
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.startsWith("-")) {
      // Handle options
      switch (token) {
        case "-X":
          if (i + 1 < tokens.length) {
            result.method = tokens[++i];
          }
          break;
        case "-H":
          if (i + 1 < tokens.length) {
            const header = tokens[++i];
            const separatorIndex = header.indexOf(":");
            if (separatorIndex > 0) {
              const name = header.substring(0, separatorIndex).trim();
              const value = header.substring(separatorIndex + 1).trim();
              result.headers[name] = value;
            }
          }
          break;
        case "-d":
          if (i + 1 < tokens.length) {
            result.data = tokens[++i];
            // If method is still GET, change it to POST
            if (result.method === "GET") {
              result.method = "POST";
            }
          }
          break;
        case "-I":
          result.headOnly = true;
          result.method = "HEAD";
          break;
        case "-v":
          result.verbose = true;
          break;
        case "-o":
          if (i + 1 < tokens.length) {
            result.outputFile = tokens[++i];
          }
          break;
        // Handle combined short options like -Iv
        default:
          if (
            token.startsWith("-") &&
            token.length > 1 &&
            !token.startsWith("--")
          ) {
            for (let j = 1; j < token.length; j++) {
              const option = token[j];
              if (option === "I") {
                result.headOnly = true;
                result.method = "HEAD";
              } else if (option === "v") {
                result.verbose = true;
              }
            }
          }
          break;
      }
    } else if (!result.url) {
      // First non-option is the URL
      result.url = token;
    }
  }

  return result;
}

/**
 * Executes a curl command with the specified arguments.
 * @param {Object} args - The parsed curl command arguments
 */
async function executeCurlCommand(args) {
  try {
    appendOutput(`curl ${args.url}`, "command-text");

    // If verbose mode is enabled, show request details
    if (args.verbose) {
      appendOutput("> Verbose mode enabled", "info-text");
      appendOutput(`> Request Method: ${args.method}`, "info-text");
      if (Object.keys(args.headers).length > 0) {
        appendOutput("> Request Headers:", "info-text");
        for (const [name, value] of Object.entries(args.headers)) {
          appendOutput(`>   ${name}: ${value}`, "info-text");
        }
      }
      if (args.data) {
        appendOutput("> Request Body:", "info-text");
        appendOutput(`>   ${args.data}`, "info-text");
      }
    }

    // Ensure URL has a protocol prefix
    let url = args.url;
    if (!url.match(/^https?:\/\//i)) {
      url = "https://" + url;
      appendOutput(`> Adding https:// prefix to URL: ${url}`, "info-text");
    }

    // Prepare fetch options
    const fetchOptions = {
      method: args.method,
      headers: { ...args.headers },
      credentials: "omit",
      mode: "cors",
    };

    // Add body for methods that support it
    if (
      args.data &&
      ["POST", "PUT", "PATCH"].includes(args.method.toUpperCase())
    ) {
      fetchOptions.body = args.data;
    }

    // Show a pending message
    appendOutput(`Making ${args.method} request to ${url}...`, "info-text");
    appendOutput(
      "Browser curl can only read CORS-enabled endpoints.",
      "info-text",
    );

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (error) {
      appendOutput(
        `curl: (1) Request blocked or failed: ${error.message}`,
        "error-text",
      );
      appendOutput(
        "Tip: if this endpoint does not allow CORS, test with real terminal curl instead.",
        "warning-text",
      );
      return;
    }

    appendOutput("Response received:", "info-text");

    // Display status line
    const statusLine = `HTTP/${response.status} ${response.statusText}`;
    appendOutput(statusLine, response.ok ? "success-text" : "error-text");

    // Display response headers if verbose or HEAD request
    if (args.verbose || args.headOnly) {
      appendOutput("Response Headers:", "info-text");
      for (const [name, value] of response.headers.entries()) {
        appendOutput(`${name}: ${value}`, "log-text");
      }
    }

    // Get and display response body if not a HEAD request
    if (!args.headOnly) {
      try {
        // Try to get response as text
        const text = await response.text();

        // If it looks like JSON, try to format it
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          try {
            const json = JSON.parse(text);
            appendOutput(JSON.stringify(json, null, 2), "log-text");
          } catch (e) {
            // If parsing fails, just show as text
            appendOutput(text, "log-text");
          }
        } else {
          // For non-JSON responses
          appendOutput(text, "log-text");
        }
      } catch (textError) {
        appendOutput(
          `Unable to read response body: ${textError.message}`,
          "error-text",
        );
      }
    }

    // Handle output to file if specified (simulated)
    if (args.outputFile) {
      appendOutput(
        `Note: In this web environment, data cannot be saved to '${args.outputFile}'. This would work in a real terminal.`,
        "warning-text",
      );
    }
  } catch (error) {
    appendOutput(`curl: (1) ${error.message}`, "error-text");
  }
}
