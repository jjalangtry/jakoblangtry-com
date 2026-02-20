// Global variables for managing input and command history
let currentInput;
let cliOutput;
let inputLine;
let commandHistory = [];
let historyIndex = -1;
let currentInputBuffer = '';
let cursor; // Global cursor element
let isMobileDevice = false; // Flag to track if we're on a mobile device

const DEFAULT_SITE_CONFIG = {
    resumePath: '/resume.pdf'
};

const DEFAULT_PROJECTS = [
    { name: 'Converter', url: 'https://convert.jakoblangtry.com' }
];

const terminalData = {
    siteConfig: { ...DEFAULT_SITE_CONFIG },
    projects: [...DEFAULT_PROJECTS]
};

function setStatusValue(id, value) {
    const target = document.getElementById(id);
    if (target) {
        target.textContent = value;
    }
}

function updateClockBadge() {
    const now = new Date();
    setStatusValue('status-clock', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
}

function initControlDeck() {
    document.querySelectorAll('[data-command]').forEach((button) => {
        button.addEventListener('click', () => {
            const cmd = button.getAttribute('data-command');
            if (!cmd) return;
            if (currentInput) {
                currentInput.value = cmd;
                currentInput.focus();
            }
            executeCommand(cmd);
        });
    });

    updateClockBadge();
    setInterval(updateClockBadge, 15000);
}

const commandList = [
    'banner', 'clear', 'converter', 'curl', 'qr', 'date', 'echo', 'email',
    'github', 'help', 'ls', 'projects', 'repo', 'resume', 'theme', 'weather', 'whoami'
];

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'light' ? '#f5f5f0' : '#000000');
    }
    localStorage.setItem('terminal-theme', theme);
}

function getCurrentTheme() {
    return document.body.classList.contains('light-theme') ? 'light' : 'dark';
}

function toggleTheme() {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
}

async function loadJsonConfig(path, fallback) {
    try {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
            return fallback;
        }
        return await response.json();
    } catch (error) {
        return fallback;
    }
}

async function loadTerminalData() {
    const [siteConfig, projects] = await Promise.all([
        loadJsonConfig('/data/site-config.json', DEFAULT_SITE_CONFIG),
        loadJsonConfig('/data/projects.json', DEFAULT_PROJECTS)
    ]);

    terminalData.siteConfig = { ...DEFAULT_SITE_CONFIG, ...(siteConfig || {}) };
    terminalData.projects = Array.isArray(projects) && projects.length
        ? projects.filter((project) => project && project.name && project.url)
        : [...DEFAULT_PROJECTS];
}

/**
 * Detects the operating system of the client.
 * @returns {string} The name of the operating system.
 */
function detectOS() {
    const platform = navigator.platform.toLowerCase();
    if (platform.indexOf('win') !== -1) return 'windows';
    if (platform.indexOf('mac') !== -1) return 'mac';
    if (platform.indexOf('linux') !== -1) return 'linux';
    if (platform.indexOf('android') !== -1) return 'android';
    if (platform.indexOf('ios') !== -1) return 'ios';
    return 'unknown';
}

/**
 * Checks if the current device is likely a mobile device based on user agent.
 * @returns {boolean} True if the device is likely mobile, false otherwise.
 */
function isMobile() {
    // Check user agent for common mobile identifiers
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
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
        if (typeof updateCursorPosition === 'function') {
            updateCursorPosition();
        }
    }
}

// Initialize the terminal interface once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Restore saved theme preference
    const savedTheme = localStorage.getItem('terminal-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }
    setStatusValue('status-theme', getCurrentTheme());

    // Check if we're on a mobile device
    isMobileDevice = isMobile();
    
    // Add a class to the body for mobile-specific styling
    if (isMobileDevice) {
        document.body.classList.add('mobile-device');
    }
    
    // Check if on Windows to apply monospace font
    const os = detectOS();
    if (os === 'windows') {
        document.body.classList.add('windows-device');
    }
    
    // Enable text selection in terminal
    enableTextSelection();
    
    // Bio typing animation
    setupBioTypingAnimation();
    initControlDeck();
    
    // Load editable command/config content before terminal initialization
    await loadTerminalData();

    // Initialize the CLI 
    initCLI();
    
    // Focus terminal on load with a small delay to ensure everything is rendered
    setTimeout(focusTerminalInput, 100);
    
    // Refocus the terminal when the window gets focus
    window.addEventListener('focus', focusTerminalInput);
    
    // Consolidated click handler for focusing terminal input
    document.addEventListener('click', function(e) {
        const terminal = document.querySelector('.terminal');
        
        // If click is inside the terminal area
        if (terminal && terminal.contains(e.target)) {
            // But not on a link
            if (e.target.tagName === 'A') return;
            
            // And not while selecting text
            if (window.getSelection().toString().length > 0) return;
            
            // Then focus the input (using the global focus function)
            if (currentInput) { 
                // Use a small timeout to ensure focus happens after potential selection clearing
                setTimeout(focusTerminalInput, 10);
            } 
        } 
        // Clicks outside the terminal are ignored regarding focus
    });
    
    // Add a document-level click handler to focus terminal input when clicking anywhere in the terminal
    document.addEventListener('click', function(e) {
        // Don't do anything if we're loading or don't have the elements ready
        if (!currentInput || !document.querySelector('.terminal')) return;
        
        const terminal = document.querySelector('.terminal');
        
        // Check if the click target is within the terminal
        if (terminal.contains(e.target)) {
            // Don't focus for clicks on links
            if (e.target.tagName === 'A') return;
            
            // Don't focus if user is selecting text
            if (window.getSelection().toString().length > 0) return;
            
            // Otherwise, focus the input field
            currentInput.focus();
            
            // Position cursor at the end of input
            const length = currentInput.value.length;
            currentInput.setSelectionRange(length, length);
            
            // Trigger any cursor update function
            if (typeof updateCursorPosition === 'function') {
                updateCursorPosition();
            }
        }
    });
});

/**
 * Sets up and starts the bio typing animation effect.
 */
function setupBioTypingAnimation() {
    // Bio content - customize this with your personal bio
    const bioText = "Hi, I'm Jakob Langtry. Im a software engineering student at Rochester Institute of Technology. I love to code, I love to learn, and I'd love if you'd check out my projects!";
    
    const typedBioElement = document.getElementById('typed-bio');
    if (!typedBioElement) return; // Guard clause: Ensure element exists
    
    let charIndex = 0;
    
    /**
     * Types the next character in the bio text.
     * Handles the recursive typing effect and hides the cursor when done.
     */
    function typeText() {
        if (charIndex < bioText.length) {
            typedBioElement.textContent += bioText.charAt(charIndex);
            charIndex++;
            setTimeout(typeText, Math.random() * 50 + 30); // Random typing speed for realistic effect
        } else {
            // Stop cursor blinking after text is complete
            const cursor = document.querySelector('.cursor');
            if (cursor) {
                cursor.style.animation = 'none';
                cursor.style.opacity = '0'; // Hide the cursor
            }
        }
    }
    
    // Start typing animation after a short delay
    setTimeout(typeText, 1000);
}

/**
 * Enables text selection within the terminal output area using CSS properties.
 */
function enableTextSelection() {
    const cliOutput = document.getElementById('cli-output');
    if (cliOutput) {
        cliOutput.style.userSelect = 'text';
        cliOutput.style.webkitUserSelect = 'text';
        cliOutput.style.mozUserSelect = 'text';
        cliOutput.style.msUserSelect = 'text';
    }
}

/**
 * Creates a new input line for the terminal interface.
 * @returns {Object} An object containing the input line and input element.
 */
function createInputLine() {
    const inputLine = document.createElement('div');
    inputLine.className = 'terminal-input-line';
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = 'guest@jakoblangtry.com:~$ ';
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'cli-input';
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('autocomplete', 'off');
    
    const cursor = document.createElement('span');
    cursor.className = 'terminal-cursor';
    
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(cursor);
    
    inputLine.appendChild(prompt);
    inputLine.appendChild(inputWrapper);
    
    input.focus();
    currentInput = input;
    return { inputLine, input };
}

/**
 * Displays the ASCII art banner based on the operating system.
 */
function displayBanner() {
    // Full ASCII art banner for desktop
    const desktopBanner = `
     ██╗ █████╗ ██╗  ██╗ ██████╗ ██████╗     ██╗      █████╗ ███╗   ██╗ ██████╗████████╗██████╗ ██╗   ██╗
     ██║██╔══██╗██║ ██╔╝██╔═══██╗██╔══██╗    ██║     ██╔══██╗████╗  ██║██╔════╝╚══██╔══╝██╔══██╗╚██╗ ██╔╝
     ██║███████║█████╔╝ ██║   ██║██████╔╝    ██║     ███████║██╔██╗ ██║██║  ███╗  ██║   ██████╔╝ ╚████╔╝ 
██   ██║██╔══██║██╔═██╗ ██║   ██║██╔══██╗    ██║     ██╔══██║██║╚██╗██║██║   ██║  ██║   ██╔══██╗  ╚██╔╝  
╚█████╔╝██║  ██║██║  ██╗╚██████╔╝██████╔╝    ███████╗██║  ██║██║ ╚████║╚██████╔╝  ██║   ██║  ██║   ██║   
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   
                                                                                                    v1.0.0
`;

    // Simplified banner for mobile devices
    const mobileBanner = `
 ╔═══════════════════╗
 ║  JAKOB LANGTRY    ║
 ║  Terminal v1.0.0  ║
 ╚═══════════════════╝
`;

    // Choose the appropriate banner based on device type
    const banner = isMobileDevice ? mobileBanner : desktopBanner;
    
    appendOutput(banner, 'ascii-art');
}

/**
 * Displays a welcome message in the terminal interface.
 */
function displayWelcomeMessage() {
    appendOutput('Welcome to Jakob Langtry\'s terminal interface.\nType \'help\' to see available commands.', 'info-text');
}

/**
 * Appends output to the CLI output area, preserving text selection.
 * @param {string} text - The text to append.
 * @param {string} [className=''] - The class name to apply to the output element.
 */
function appendOutput(text, className = '') {
    // Save the current selection state
    const selection = window.getSelection();
    const selectedText = selection.toString();
    let selectionRange = null;
    
    if (selection.rangeCount > 0) {
        selectionRange = selection.getRangeAt(0).cloneRange();
    }
    
    // Create and append the new output
    const output = document.createElement('div');
    output.className = className;
    
    // For help text with multiple lines, preserve exact formatting
    if (className === 'info-text' && text.includes('\n')) {
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
    return `Available commands:\n${commandList.join('\n')}`;
}

function buildProjectsListOutput() {
    const projects = terminalData.projects || [];
    if (!projects.length) {
        return 'No projects are configured yet.';
    }

    return 'Available projects:\n' + projects.map((project, index) => {
        const description = project.description ? ` (${project.description})` : '';
        return `${index + 1}. ${project.name} - ${project.url}${description}`;
    }).join('\n');
}

function findProjectByCommand(command) {
    const normalized = command.trim().toLowerCase();
    return (terminalData.projects || []).find((project) => {
        if (!project || !project.name) return false;
        return project.name.toLowerCase() === normalized;
    });
}

async function openResumeFromConfig() {
    const resumePath = terminalData.siteConfig?.resumePath || DEFAULT_SITE_CONFIG.resumePath;

    try {
        const response = await fetch(resumePath, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) {
            appendOutput(`Resume file not found at "${resumePath}". Update data/site-config.json or add that file.`, 'error-text');
            return;
        }

        appendOutput('Opening resume...');
        window.open(resumePath, '_blank');
    } catch (error) {
        appendOutput(`Unable to open resume from "${resumePath}": ${error.message}`, 'error-text');
    }
}

/**
 * Executes a command entered in the terminal interface.
 * @param {string} command - The command to execute.
 */
function executeCommand(command) {
    const commandLine = document.createElement('div');
    commandLine.textContent = `guest@jakoblangtry.com:~$ ${command}`;
    cliOutput.insertBefore(commandLine, inputLine);
    
    const normalizedCommand = command.toLowerCase();
    setStatusValue('status-last-command', command);
    switch (normalizedCommand) {
        case 'help':
            const helpText = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                      JAKOB LANGTRY TERMINAL - HELP                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

AVAILABLE COMMANDS:

  banner     Display the terminal banner
             Usage: banner

  clear      Clear the terminal screen
             Usage: clear

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

  github     Open Jakob's GitHub profile
             (alias: repo)
             Usage: github

  help       Display this help information
             Usage: help

  ls         List available commands
             Usage: ls

  projects   List available projects with URLs
             Usage: projects

  resume     View Jakob's resume
             Usage: resume

  theme      Toggle between dark and light mode
             Usage: theme [dark|light]

  weather    Display weather forecast for a location
             Usage: weather [city or location]
             Examples: weather New York
                      weather Syracuse NY
                      weather London, UK

  whoami     Display information about Jakob
             Usage: whoami

For more information about a specific command, type: [command] --help`;
            
            // Create a div with pre-formatted text for help output
            appendOutput(helpText, 'info-text');
            break;
        case 'ls':
            appendOutput(buildCommandsListOutput(), 'info-text');
            break;
        case 'clear':
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
        case 'whoami':
            appendOutput(`Jakob Langtry - Software Engineering Student at Rochester Institute of Technology.
Passionate about web development, backend systems, and creating useful applications.
Currently seeking opportunities in software engineering.
Type 'resume' to view my resume or 'projects' to see my work.`, 'info-text');
            break;
        case 'date':
            appendOutput(new Date().toLocaleString());
            break;
        case 'banner':
            displayBanner();
            break;
        case 'email':
            appendOutput('Opening email client...');
            window.location.href = 'mailto:jjalangtry@gmail.com';
            break;
        case 'github':
            appendOutput('Opening GitHub profile...');
            window.open('https://github.com/jjl4287', '_blank');
            break;
        case 'echo':
            appendOutput('Usage: echo [text to display]\nDisplays the text provided as an argument.', 'info-text');
            break;
        case 'weather':
            appendOutput('Usage: weather [city or location]. Examples:\n  weather New York\n  weather Syracuse NY\n  weather London, UK\n  weather Paris France', 'info-text');
            break;
        case 'theme':
            {
                const next = toggleTheme();
                appendOutput(`Switched to ${next} mode.`, 'success-text');
                setStatusValue('status-theme', next);
            }
            break;
        case 'resume':
            openResumeFromConfig();
            break;
        case 'projects':
            appendOutput(buildProjectsListOutput(), 'info-text');
            appendOutput('Click on a project URL or type its name to open it.', 'info-text');
            break;
        case 'repo':
            // Alias for github command
            appendOutput('Opening GitHub profile...');
            window.open('https://github.com/jjl4287', '_blank');
            break;
        case 'converter':
            appendOutput('Opening Link Converter...');
            window.open('https://convert.jakoblangtry.com', '_blank');
            break;
        case 'curl':
            appendOutput('Usage: curl [URL]', 'info-text');
            break;
        case 'qr':
            appendOutput('Usage: qr [URL]\nGenerates a QR code for the provided URL and shows a download button.', 'info-text');
            break;
        default:
            if (normalizedCommand === 'converter') {
                appendOutput('Opening Link Converter...');
                window.open('https://convert.jakoblangtry.com', '_blank');
                break;
            }
            else if (normalizedCommand.startsWith('theme ')) {
                const arg = normalizedCommand.substring(6).trim();
                if (arg === 'dark' || arg === 'light') {
                    applyTheme(arg);
                    appendOutput(`Switched to ${arg} mode.`, 'success-text');
                    setStatusValue('status-theme', arg);
                } else {
                    appendOutput('Usage: theme [dark|light]', 'info-text');
                }
                break;
            }
            else if (normalizedCommand.startsWith('curl ')) {
                const args = parseCurlCommand(command.substring(5).trim());
                
                if (!args.url) {
                    appendOutput('Error: Please provide a URL', 'error-text');
                    break;
                }
                
                executeCurlCommand(args);
                break;
            } else if (normalizedCommand.startsWith('qr ')) {
                const target = command.substring(3).trim();
                if (!target) {
                    appendOutput('Usage: qr [URL]', 'info-text');
                    break;
                }
                const selection = window.getSelection();
                const selectedText = selection.toString();
                let selectionRange = null;
                if (selection.rangeCount > 0) {
                    selectionRange = selection.getRangeAt(0).cloneRange();
                }
                const container = document.createElement('div');
                container.className = 'command-output qr-container';
                const title = document.createElement('div');
                title.className = 'qr-title';
                title.textContent = `QR code for: ${target}`;
                const img = document.createElement('img');
                img.className = 'qr-img';
                const encoded = encodeURIComponent(target);
                const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encoded}`;
                img.src = imgUrl;
                img.alt = `QR code for ${target}`;
                const actions = document.createElement('div');
                actions.className = 'qr-actions';
                const download = document.createElement('a');
                download.className = 'qr-download-btn';
                download.href = imgUrl;
                download.download = 'qr.png';
                download.textContent = 'Download QR';
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
            } else if (normalizedCommand.startsWith('weather ')) {
                const city = command.substring(8).trim(); // Get everything after "weather "
                
                // We're now handling the formatting in fetchWeather function
                fetchWeather(city);
            } else if (normalizedCommand.startsWith('echo ')) {
                const echoText = command.substring(5).trim();
                if (echoText) {
                    appendOutput(echoText);
                } else {
                    appendOutput('Usage: echo [text to display]', 'info-text');
                }
            } else if (normalizedCommand.endsWith(' --help')) {
                // Handle command-specific help
                const cmd = normalizedCommand.substring(0, normalizedCommand.length - 7).trim();
                displayCommandHelp(cmd);
            } else {
                const project = findProjectByCommand(command);
                if (project) {
                    appendOutput(`Opening ${project.name}...`);
                    window.open(project.url, '_blank');
                } else {
                    appendOutput(`Command not found: ${command}. Type 'help' for available commands.`, 'error-text');
                }
            }
    }
}

/**
 * Displays detailed help for a specific command
 * @param {string} command - The command to display help for
 */
function displayCommandHelp(command) {
    const helpDetails = {
        banner: {
            desc: 'Display the ASCII art banner for the terminal.',
            usage: 'banner',
            examples: ['banner'],
            notes: 'The banner is automatically displayed when the terminal starts or when the screen is cleared.'
        },
        clear: {
            desc: 'Clear the terminal screen, preserving command history.',
            usage: 'clear',
            examples: ['clear'],
            notes: 'This command preserves your command history, so you can still use up/down arrows to access previous commands.'
        },
        converter: {
            desc: 'Open the Link Converter tool in a new browser tab.',
            usage: 'converter',
            examples: ['converter'],
            notes: 'This project was created by Jakob to help convert links between different formats.'
        },
        curl: {
            desc: 'Make HTTP requests to web servers, APIs, and other web resources.',
            usage: 'curl [options] [URL]',
            examples: [
                'curl https://example.com', 
                'curl -I https://api.example.org/data',
                'curl -X POST -H "Content-Type: application/json" -d \'{"key":"value"}\' https://api.example.org/data'
            ],
            notes: 'Supports common options like -X, -H, -d, -I, -o, -v. Browser CORS policy still applies.'
        },
        qr: {
            desc: 'Generate a QR code image for a given URL and provide a download button.',
            usage: 'qr [URL]',
            examples: ['qr https://jakoblangtry.com', 'qr github.com/jjl4287'],
            notes: 'Uses a public QR API. Ensure the URL is correct before sharing.'
        },
        date: {
            desc: 'Display the current date and time based on your local timezone.',
            usage: 'date',
            examples: ['date'],
            notes: 'The date format follows your browser\'s locale settings.'
        },
        echo: {
            desc: 'Display a line of text in the terminal.',
            usage: 'echo [text]',
            examples: ['echo Hello, World!', 'echo This is a test'],
            notes: 'If no text is provided, usage information will be displayed.'
        },
        email: {
            desc: 'Open your default email client to contact Jakob.',
            usage: 'email',
            examples: ['email'],
            notes: 'This will open your system\'s default email client with jjalangtry@gmail.com as the recipient.'
        },
        github: {
            desc: 'Open Jakob\'s GitHub profile in a new browser tab.',
            usage: 'github',
            examples: ['github', 'repo'],
            notes: 'The command "repo" is an alias for "github" and performs the same action.'
        },
        help: {
            desc: 'Display a list of available commands with brief descriptions.',
            usage: 'help',
            examples: ['help', 'command --help'],
            notes: 'For detailed help on a specific command, type the command name followed by --help.'
        },
        ls: {
            desc: 'List available terminal commands.',
            usage: 'ls',
            examples: ['ls'],
            notes: 'This terminal-style ls command lists supported commands rather than filesystem entries.'
        },
        projects: {
            desc: 'List available projects with URLs.',
            usage: 'projects',
            examples: ['projects'],
            notes: 'Project entries are loaded from data/projects.json. Type a project name to open it.'
        },
        repo: {
            desc: 'Alias for the "github" command. Opens Jakob\'s GitHub profile.',
            usage: 'repo',
            examples: ['repo', 'github'],
            notes: 'This is just an alternative way to access the github command.'
        },
        resume: {
            desc: 'View Jakob\'s resume in a new browser tab.',
            usage: 'resume',
            examples: ['resume'],
            notes: 'Resume path is loaded from data/site-config.json and defaults to /resume.pdf.'
        },
        theme: {
            desc: 'Toggle between dark and light terminal themes.',
            usage: 'theme [dark|light]',
            examples: ['theme', 'theme dark', 'theme light'],
            notes: 'Without arguments, toggles to the opposite theme. Preference is saved in your browser.'
        },
        weather: {
            desc: 'Display weather forecast for a specified location.',
            usage: 'weather [city or location]',
            examples: ['weather New York', 'weather Syracuse NY', 'weather London, UK', 'weather Paris France'],
            notes: 'Weather data is retrieved in real-time. The display format will adapt based on your device type.'
        },
        whoami: {
            desc: 'Display information about Jakob Langtry.',
            usage: 'whoami',
            examples: ['whoami'],
            notes: 'This provides a brief biography and professional information about Jakob.'
        }
    };

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
  ${help.examples.join('\n  ')}

NOTES:
  ${help.notes}
`;
        // Ensure the helpText preserves newlines
        appendOutput(helpText, 'info-text');
    } else {
        appendOutput(`No detailed help available for '${command}'. Type 'help' to see all available commands.`, 'error-text');
    }
}

/**
 * Fetches weather data for a specified city.
 * @param {string} city - The city for which to fetch weather data.
 */
async function fetchWeather(city) {
    try {
        appendOutput(`Fetching weather data for ${city}...`);
        setStatusValue('status-weather', 'fetching...');
        
        // Format city name for best API results
        let formattedCity = city;
        let isUsLocation = false;
        
        // Add logic to better handle queries with region names
        if (!city.includes(',')) {
            // Check for US state abbreviations first as they're most problematic
            const stateAbbrs = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 
                               'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
                               'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 
                               'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
            
            // If the city has multiple words, check if the last word is a state abbreviation
            if (city.includes(' ')) {
                const parts = city.split(' ');
                const lastPart = parts[parts.length - 1].toUpperCase();
                if (stateAbbrs.includes(lastPart)) {
                    const cityPart = parts.slice(0, parts.length - 1).join(' ');
                    formattedCity = `${cityPart}, ${lastPart}`;
                    isUsLocation = true;
                }
            }
            
            // Check for common formats like "City State" where State is a full name
            const stateNames = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
                               'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
                               'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
                               'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
                               'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
                               'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
                               'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
                               'Wisconsin', 'Wyoming'];
            
            // Improved case-insensitive state name matching
            for (const state of stateNames) {
                const statePattern = new RegExp(`\\s${state}$`, 'i');
                if (statePattern.test(city)) {
                    const cityPart = city.substring(0, city.length - state.length - 1);
                    formattedCity = `${cityPart}, ${state}`;
                    isUsLocation = true;
                    break;
                }
            }
            
            // Check for common patterns of city followed by country name without comma
            if (!isUsLocation) {
                const commonCountries = ['USA', 'US', 'UK', 'France', 'Germany', 'Canada', 'Italy', 'Spain', 'Japan', 'China', 'Russia', 'Brazil', 'Australia'];
                
                for (const country of commonCountries) {
                    const countryPattern = new RegExp(`\\s${country}$`, 'i');
                    if (countryPattern.test(city)) {
                        const cityPart = city.substring(0, city.length - country.length - 1);
                        formattedCity = `${cityPart}, ${country}`;
                        break;
                    }
                }
            }
        }
        
        // For US locations, specifically help the API by adding USA if not present
        if (isUsLocation && !formattedCity.toLowerCase().includes('usa') && !formattedCity.toLowerCase().includes('us')) {
            formattedCity = `${formattedCity}, USA`;
        }
        
        const apiKey = (window.ENV?.OPENWEATHERMAP_API_KEY || '').trim();
        if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'REPLACE_WITH_YOUR_API_KEY') {
            appendOutput('Weather is unavailable: OpenWeatherMap API key is missing. Configure OPENWEATHERMAP_API_KEY and rebuild.', 'error-text');
            setStatusValue('status-weather', 'api key missing');
            return;
        }

        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(formattedCity)}&limit=1&appid=${apiKey}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoResponse.ok) {
            if (geoResponse.status === 401) {
                appendOutput('Weather is unavailable: OpenWeatherMap API key is invalid or expired.', 'error-text');
                setStatusValue('status-weather', 'auth failed');
            } else {
                appendOutput(`Error fetching weather location: ${geoData?.message || geoResponse.statusText}`, 'error-text');
                setStatusValue('status-weather', 'lookup failed');
            }
            return;
        }

        if (!geoData || !geoData.length) {
            appendOutput(`City "${city}" not found. Try "City, State" or "City, Country".`, 'error-text');
            setStatusValue('status-weather', 'city not found');
            return;
        }

        const { lat, lon, name, state, country } = geoData[0];

        // Keep metric response and convert to Fahrenheit for display consistently.
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const weatherResponse = await fetch(forecastUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherResponse.ok) {
            if (weatherResponse.status === 401) {
                appendOutput('Weather is unavailable: OpenWeatherMap API key is invalid or expired.', 'error-text');
                setStatusValue('status-weather', 'auth failed');
            } else {
                appendOutput(`Error fetching weather forecast: ${weatherData?.message || weatherResponse.statusText}`, 'error-text');
                setStatusValue('status-weather', 'forecast failed');
            }
            return;
        }

        displayWeatherReport(weatherData, name, state, country, lat, lon);
        setStatusValue('status-weather', `${name}, ${country}`);
        return;

    } catch (error) {
        appendOutput(`Error fetching weather data: ${error.message}`, 'error-text');
        setStatusValue('status-weather', 'network error');
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
    
    const output = document.createElement('div');
    output.className = 'command-output';
    
    // Create a container to control width and prevent responsive issues
    const container = document.createElement('div');
    container.className = 'weather-container';
    
    // Use pre element to ensure exact formatting
    const pre = document.createElement('pre');
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
    displayWeatherReport(data, city, null, 'Simulation', data.lat, data.lon);
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
    
    forecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toDateString();
        const hour = date.getHours();
        
        if (!days[day]) {
            days[day] = {
                morning: null,
                noon: null,
                evening: null,
                night: null
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
    if (country && country !== 'Simulation') locationStr += `, ${country}`;
    
    // Display header
    appendWeatherOutput(`Weather Forecast for ${locationStr}`);
    const latSuffix = lat >= 0 ? 'N' : 'S';
    const lonSuffix = lon >= 0 ? 'E' : 'W';
    appendWeatherOutput(`Location: ${Math.abs(lat).toFixed(2)}°${latSuffix}, ${Math.abs(lon).toFixed(2)}°${lonSuffix}`);
    appendWeatherOutput('');

    // Choose between mobile and desktop display formats
    if (isMobileDevice) {
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
    Object.keys(days).forEach(dayStr => {
        const day = days[dayStr];
        
        // Display day header
        appendWeatherOutput(`\n[${dayStr}]`, 'weather-day-header');
        
        // Display each time period with simplified formatting
        ['morning', 'noon', 'evening', 'night'].forEach(period => {
            if (day[period]) {
                const forecast = day[period];
                const time = new Date(forecast.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const temp = celsiusToFahrenheit(Math.round(forecast.main.temp));
                const condition = forecast.weather[0].main;
                const description = forecast.weather[0].description;
                
                // Simple symbols for weather conditions
                let symbol = '☁️'; // default cloudy
                if (condition === 'Clear') symbol = '☀️';
                if (condition === 'Rain') symbol = '🌧️';
                if (condition === 'Snow') symbol = '❄️';
                if (condition === 'Thunderstorm') symbol = '⚡';
                if (condition === 'Drizzle') symbol = '🌦️';
                if (condition === 'Mist' || condition === 'Fog') symbol = '🌫️';
                
                appendWeatherOutput(`${symbol} ${period.charAt(0).toUpperCase() + period.slice(1)} (${time}): ${temp}°F, ${description}`);
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
    Object.values(days).forEach(dayPeriods => {
        ['morning', 'noon', 'evening', 'night'].forEach(period => {
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
    const boxLines = currentWeatherBox.split('\n');
    const paddedBox = boxLines.map(line => {
        const padding = Math.floor((tableWidth - boxWidth) / 2);
        return ' '.repeat(padding) + line + ' '.repeat(tableWidth - padding - boxWidth);
    }).join('\n');
    
    report += paddedBox + '\n\n';
    
    // Build the 3-day forecast table
    const dayEntries = Object.entries(days).slice(0, 3);
    
    dayEntries.forEach(([dayString, periods], index) => {
        const date = new Date(dayString);
        
        // Format date with full day name and month, and ordinal suffix
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 
                           'August', 'September', 'October', 'November', 'December'];
        const dayOfWeek = dayNames[date.getDay()];
        const dayOfMonth = date.getDate();
        const month = monthNames[date.getMonth()];
        
        // Add ordinal suffix (st, nd, rd, th)
        let ordinalSuffix = 'th';
        if (dayOfMonth % 10 === 1 && dayOfMonth !== 11) {
            ordinalSuffix = 'st';
        } else if (dayOfMonth % 10 === 2 && dayOfMonth !== 12) {
            ordinalSuffix = 'nd';
        } else if (dayOfMonth % 10 === 3 && dayOfMonth !== 13) {
            ordinalSuffix = 'rd';
        }
        
        // Create full date string
        const dateHeader = `${dayOfWeek}, ${month} ${dayOfMonth}${ordinalSuffix}`;
        
        // Add separator between days
        if (index > 0) {
            report += '\n';
        }
        
        // Add horizontal separator for the top of the table - ensure exact width
        report += '\n';
        report += '╔';
        for (let i = 0; i < tableWidth - 2; i++) report += '═';
        report += '╗\n';
        
        // Calculate date box dimensions and position
        const dateBoxPadding = 2; // Space on each side of the text
        const innerBoxWidth = dateHeader.length + (dateBoxPadding * 2); // Width of the content inside the inner box
        
        // Calculate exact positions to ensure perfect centering
        // The inner box has 2 border characters (left and right)
        const leftBorderPos = Math.floor((tableWidth - innerBoxWidth - 2) / 2);
        const rightBorderPos = leftBorderPos + innerBoxWidth + 1; // +1 because the right border takes a position
        
        // First line of date box
        let line = '║';
        for (let i = 1; i < tableWidth - 1; i++) {
            if (i === leftBorderPos) line += '╔';
            else if (i > leftBorderPos && i < rightBorderPos) line += '═';
            else if (i === rightBorderPos) line += '╗';
            else line += ' ';
        }
        line += '║';
        report += line + '\n';
        
        // Date content line
        line = '║';
        for (let i = 1; i < tableWidth - 1; i++) {
            if (i === leftBorderPos) line += '║';
            else if (i === rightBorderPos) line += '║';
            else if (i > leftBorderPos && i < rightBorderPos) {
                // Center the text within the inner box
                const textStartPos = leftBorderPos + 1 + Math.floor((innerBoxWidth - dateHeader.length) / 2);
                const textEndPos = textStartPos + dateHeader.length - 1;
                if (i >= textStartPos && i <= textEndPos) {
                    line += dateHeader.charAt(i - textStartPos);
                } else {
                    line += ' ';
                }
            } else {
                line += ' ';
            }
        }
        line += '║';
        report += line + '\n';
        
        // Bottom line of date box
        line = '║';
        for (let i = 1; i < tableWidth - 1; i++) {
            if (i === leftBorderPos) line += '╚';
            else if (i > leftBorderPos && i < rightBorderPos) line += '═';
            else if (i === rightBorderPos) line += '╝';
            else line += ' ';
        }
        line += '║';
        report += line + '\n';
        
        // Add the header row with precisely calculated widths
        report += '╠';
        report += '═'.repeat(cellWidth - 1) + '╦';
        report += '═'.repeat(cellWidth - 1) + '╦';
        report += '═'.repeat(cellWidth - 1) + '╦';
        report += '═'.repeat(cellWidth - 1) + '╣\n';
        
        report += '║' + centerText('Morning', cellWidth - 1) + '║';
        report += centerText('Noon', cellWidth - 1) + '║';
        report += centerText('Evening', cellWidth - 1) + '║';
        report += centerText('Night', cellWidth - 1) + '║\n';
        
        // Add separator after headers - exact tableWidth
        report += '╠';
        report += '═'.repeat(cellWidth - 1) + '╬';
        report += '═'.repeat(cellWidth - 1) + '╬';
        report += '═'.repeat(cellWidth - 1) + '╬';
        report += '═'.repeat(cellWidth - 1) + '╣\n';
        
        // Weather condition row
        report += buildBoxCompactRow(periods, 'condition', cellWidth);
        
        // Create the ASCII art for each period and condition
        const asciiArts = [];
        ['morning', 'noon', 'evening', 'night'].forEach(timeOfDay => {
            if (periods[timeOfDay]) {
                const forecast = periods[timeOfDay];
                const weather = forecast.weather[0].main.toLowerCase();
                const description = forecast.weather[0].description.toLowerCase();
                
                let art = '';
                
                if (weather.includes('clear')) {
                    art = "    \\   /    \n" +
                         "      .-.    \n" +
                         "  ── (   ) ──\n" +
                         "      `-'    \n" +
                         "    /   \\    ";
                } else if (weather.includes('cloud')) {
                    if (description.includes('few') || description.includes('scattered') || description.includes('partly')) {
                        art = "    \\  /     \n" +
                             "  _ /\"\" .-.   \n" +
                             "    \\_`(   ). \n" +
                             "    /(___(__))\n" +
                             "              ";
                    } else if (description.includes('broken') || description.includes('overcast')) {
                        art = "     .--.    \n" +
                             "  .-(    ).  \n" +
                             " (___.__)__) \n" +
                             "              \n" +
                             "              ";
                    } else {
                        art = "     .--.    \n" +
                             "  .-(    ).  \n" +
                             " (___.__)__) \n" +
                             "              \n" +
                             "              ";
                    }
                } else if (weather.includes('rain')) {
                    if (description.includes('light') || description.includes('drizzle')) {
                        art = "     .-.     \n" +
                             "    (   ).   \n" +
                             "   (___(__)  \n" +
                             "    ' ' ' '  \n" +
                             "   ' ' ' '   ";
                    } else if (description.includes('heavy')) {
                        art = "     .-.     \n" +
                             "    (   ).   \n" +
                             "   (___(__)  \n" +
                             "  ,',',','   \n" +
                             "  ,',',','   ";
                    } else {
                        art = "     .-.     \n" +
                             "    (   ).   \n" +
                             "   (___(__)  \n" +
                             "    ' ' ' '  \n" +
                             "   ' ' ' '   ";
                    }
                } else if (weather.includes('snow')) {
                    if (description.includes('blowing') || description.includes('heavy')) {
                        art = "     .-.     \n" +
                             "    (   ).   \n" +
                             "   (___(__)  \n" +
                             "   * * * *   \n" +
                             "  * * * *    ";
                    } else {
                        art = "     .-.     \n" +
                             "    (   ).   \n" +
                             "   (___(__)  \n" +
                             "    *  *  *  \n" +
                             "   *  *  *   ";
                    }
                } else if (weather.includes('thunder') || weather.includes('storm')) {
                    art = "     .-.     \n" +
                         "    (   ).   \n" +
                         "   (___(__)  \n" +
                         "    ⚡⚡⚡    \n" +
                         "   ⚡⚡⚡     ";
                } else if (weather.includes('fog') || weather.includes('mist')) {
                    art = " _ _ _ _ _  \n" +
                         "  _ _ _ _ _  \n" +
                         " _ _ _ _ _   \n" +
                         "  _ _ _ _ _  \n" +
                         " _ _ _ _ _   ";
                } else if (weather.includes('haze') || description.includes('hazy')) {
                    art = "     \\   /   \n" +
                         "      .-.     \n" +
                         "   –– (   ) ––\n" +
                         "      `-'     \n" +
                         "     /   \\    ";
                } else if (weather.includes('sun') || description.includes('sunny')) {
                    art = "    \\   /    \n" +
                         "     .-.     \n" +
                         "  -- (   ) --\n" +
                         "     `-'     \n" +
                         "    /   \\    ";
                } else if (description.includes('patchy')) {
                    art = "     .-.     \n" +
                         "  .-(    ).  \n" +
                         " (___.__)__) \n" +
                         "  * * * *    \n" +
                         " * * * *     ";
                } else {
                    // Default fallback
                    art = "    \\   /    \n" +
                         "     .-.     \n" +
                         "  -- (   ) --\n" +
                         "     `-'     \n" +
                         "    /   \\    ";
                }
                
                asciiArts.push(art);
            } else {
                asciiArts.push("             \n             \n             \n             \n             ");
            }
        });
        
        // ASCII art rows
        const artLines = [];
        for (let i = 0; i < 5; i++) {
            let artLine = '║';
            for (let j = 0; j < 4; j++) {
                if (asciiArts[j]) {
                    const artParts = asciiArts[j].split('\n');
                    const content = artParts[i] || '';
                    artLine += formatBoxCompactCell(content, cellWidth - 1, true);
                } else {
                    artLine += formatBoxCompactCell('', cellWidth - 1, true);
                }
            }
            artLines.push(artLine);
        }
        
        report += artLines.join('\n') + '\n';
        
        // Add divider after ASCII art - exact table width
        report += '╠';
        report += '═'.repeat(cellWidth - 1) + '╬';
        report += '═'.repeat(cellWidth - 1) + '╬';
        report += '═'.repeat(cellWidth - 1) + '╬';
        report += '═'.repeat(cellWidth - 1) + '╣\n';
        
        // Temperature row
        report += buildBoxCompactRow(periods, 'temp', cellWidth);
        
        // Wind row
        report += buildBoxCompactRow(periods, 'wind', cellWidth);
        
        // Visibility row
        report += buildBoxCompactRow(periods, 'visibility', cellWidth);
        
        // Precipitation row
        report += buildBoxCompactRow(periods, 'precip', cellWidth);
        
        // Add bottom border - exact table width
        report += '╚';
        report += '═'.repeat(cellWidth - 1) + '╩';
        report += '═'.repeat(cellWidth - 1) + '╩';
        report += '═'.repeat(cellWidth - 1) + '╩';
        report += '═'.repeat(cellWidth - 1) + '╝\n';
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
    return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
}

/**
 * Converts Celsius to Fahrenheit.
 * @param {number} celsius - The temperature in Celsius.
 * @returns {number} The temperature in Fahrenheit.
 */
function celsiusToFahrenheit(celsius) {
    return Math.round(celsius * 9/5 + 32);
}

/**
 * Builds a compact row for a weather report.
 * @param {Object} periods - The weather periods.
 * @param {string} rowType - The type of row to build.
 * @param {number} [cellWidth=25] - The width of each cell.
 * @returns {string} The formatted row.
 */
function buildBoxCompactRow(periods, rowType, cellWidth = 25) {
    let row = '║';
    
    // Helper function to get the appropriate content based on row type
    function getContent(period, type) {
        if (!period) return '   --      ';
        
        switch (type) {
            case 'condition':
                const condition = period.weather[0].main;
                // Add ASCII art below for conditions
                let conditionArt = '';
                const conditionLower = condition.toLowerCase();
                
                if (conditionLower.includes('clear')) {
                    conditionArt = ' Clear';
                } else if (conditionLower.includes('cloud')) {
                    if (period.weather[0].description.toLowerCase().includes('few') || 
                        period.weather[0].description.toLowerCase().includes('scattered') || 
                        period.weather[0].description.toLowerCase().includes('partly')) {
                        conditionArt = ' Partly Cloudy';
                    } else if (period.weather[0].description.toLowerCase().includes('broken')) {
                        conditionArt = ' Cloudy';
                    } else {
                        conditionArt = ' Clouds';
                    }
                } else if (conditionLower.includes('rain')) {
                    if (period.weather[0].description.toLowerCase().includes('light')) {
                        conditionArt = ' Light Rain';
                    } else if (period.weather[0].description.toLowerCase().includes('heavy')) {
                        conditionArt = ' Heavy Rain';
                    } else {
                        conditionArt = ' Rain';
                    }
                } else if (conditionLower.includes('snow')) {
                    if (period.weather[0].description.toLowerCase().includes('light')) {
                        conditionArt = ' Light Snow';
                    } else if (period.weather[0].description.toLowerCase().includes('heavy') || 
                              period.weather[0].description.toLowerCase().includes('blowing')) {
                        conditionArt = ' Blowing snow';
                    } else {
                        conditionArt = ' Snow';
                    }
                } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
                    conditionArt = ' Fog';
                } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
                    conditionArt = ' Thunderstorm';
                } else if (conditionLower.includes('overcast')) {
                    conditionArt = ' Overcast';
                } else if (conditionLower.includes('sunny') || conditionLower.includes('sun')) {
                    conditionArt = ' Sunny';
                } else {
                    conditionArt = ' ' + condition;
                }
                
                return conditionArt;
                
            case 'temp':
                const tempC = Math.round(period.main.temp);
                const feelsC = Math.round(period.main.feels_like);
                
                // Convert to Fahrenheit
                const tempF = celsiusToFahrenheit(tempC);
                const feelsF = celsiusToFahrenheit(feelsC);
                
                // Format like "34(30) °F" in the template
                return `${tempF}(${feelsF}) °F`;
                
            case 'wind':
                // Get direction arrow
                const deg = period.wind.deg;
                const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
                const index = Math.round(deg / 45) % 8;
                const arrow = directions[index];
                
                // Format wind speed range like "26-31 km/h"
                const kmh = Math.round(period.wind.speed * 3.6);
                const upperKmh = kmh + 5;
                return `${arrow} ${kmh}-${upperKmh} km/h`;
                
            case 'visibility':
                return `${Math.round(period.visibility / 1000)} km`;
                
            case 'precip':
                const rain = period.rain ? period.rain['3h'] || 0 : 0;
                const snow = period.snow ? period.snow['3h'] || 0 : 0;
                const total = parseFloat((rain + snow).toFixed(1));
                const pop = period.pop ? Math.round(period.pop * 100) : 0;
                return `${total} mm | ${pop}%`;
                
            default:
                return '   --      ';
        }
    }
    
    // Create compact cells for each time period
    row += formatBoxCompactCell(getContent(periods.morning, rowType), cellWidth - 1, true);
    row += formatBoxCompactCell(getContent(periods.noon, rowType), cellWidth - 1, true);
    row += formatBoxCompactCell(getContent(periods.evening, rowType), cellWidth - 1, true);
    row += formatBoxCompactCell(getContent(periods.night, rowType), cellWidth - 1, true);
    
    return row + '\n';
}

/**
 * Formats a cell for a compact weather report.
 * @param {string} content - The content of the cell.
 * @param {number} [cellWidth=25] - The width of the cell.
 * @param {boolean} [useDoubleBox=false] - Whether to use double box characters.
 * @returns {string} The formatted cell.
 */
function formatBoxCompactCell(content, cellWidth = 25, useDoubleBox = false) {
    const paddedContent = ' ' + content; // Add a space for better readability
    
    // Ensure content doesn't exceed cell width by truncating if necessary
    const truncatedContent = paddedContent.length > cellWidth - 1 ? 
        paddedContent.substring(0, cellWidth - 1) : 
        paddedContent;
    
    // Calculate remaining space precisely
    const remainingSpace = cellWidth - truncatedContent.length;
    
    // Use double box character (║) for borders if specified
    const rightBorder = useDoubleBox ? '║' : '│';
    
    // Return the formatted cell with exact width
    return truncatedContent + ' '.repeat(Math.max(0, remainingSpace)) + rightBorder;
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
    let ascii = '';
    
    if (os === 'windows') {
        // Windows-friendly ASCII art for weather conditions
        if (weather.includes('clear')) {
            ascii = "    \\   /    \n" +
                   "     .-.     \n" +
                   "  -- (   ) --\n" +
                   "     `-'     \n" +
                   "    /   \\    ";
        } else if (weather.includes('cloud')) {
            if (description.includes('few') || description.includes('scattered') || description.includes('partly')) {
                ascii = "    \\  /     \n" +
                       "  _ /\"\" .-.   \n" +
                       "    \\_`(   ). \n" +
                       "    /(___(__))\n" +
                       "              ";
            } else if (description.includes('broken') || description.includes('overcast')) {
                ascii = "     .--.    \n" +
                       "  .-(    ).  \n" +
                       " (___.__)__) \n" +
                       "              \n" +
                       "              ";
            } else {
                ascii = "     .--.    \n" +
                       "  .-(    ).  \n" +
                       " (___.__)__) \n" +
                       "              \n" +
                       "              ";
            }
        } else if (weather.includes('rain')) {
            if (description.includes('light') || description.includes('drizzle')) {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "    ' ' ' '  \n" +
                       "   ' ' ' '   ";
            } else if (description.includes('heavy')) {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "  ,',',','   \n" +
                       "  ,',',','   ";
            } else {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "    ' ' ' '  \n" +
                       "   ' ' ' '   ";
            }
        } else if (weather.includes('snow')) {
            if (description.includes('blowing') || description.includes('heavy')) {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "   * * * *   \n" +
                       "  * * * *    ";
            } else {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "    *  *  *  \n" +
                       "   *  *  *   ";
            }
        } else if (weather.includes('thunder') || weather.includes('storm')) {
            ascii = "     .-.     \n" +
                   "    (   ).   \n" +
                   "   (___(__)  \n" +
                   "    / / /    \n" +
                   "   / / /     ";
        } else if (weather.includes('fog') || weather.includes('mist')) {
            ascii = " _ _ _ _ _  \n" +
                   "  _ _ _ _ _  \n" +
                   " _ _ _ _ _   \n" +
                   "  _ _ _ _ _  \n" +
                   " _ _ _ _ _   ";
        } else if (weather.includes('haze') || description.includes('hazy')) {
            ascii = "     \\   /   \n" +
                   "      .-.     \n" +
                   "   –– (   ) ––\n" +
                   "      `-'     \n" +
                   "     /   \\    ";
        } else if (weather.includes('sun') || description.includes('sunny')) {
            ascii = "    \\   /    \n" +
                   "     .-.     \n" +
                   "  ── (   ) ──\n" +
                   "     `-'     \n" +
                   "    /   \\    ";
        } else if (description.includes('patchy')) {
            ascii = "     .-.     \n" +
                   "  .-(    ).  \n" +
                   " (___.__)__) \n" +
                   "  * * * *    \n" +
                   " * * * *     ";
        } else {
            // Default fallback
            ascii = "    \\   /    \n" +
                   "     .-.     \n" +
                   "  -- (   ) --\n" +
                   "     `-'     \n" +
                   "    /   \\    ";
        }
    } else {
        // Original ASCII art for Mac and other platforms
        if (weather.includes('clear')) {
            ascii = "    \\   /    \n" +
                   "      .-.    \n" +
                   "  ── (   ) ──\n" +
                   "      `-'    \n" +
                   "    /   \\    ";
        } else if (weather.includes('cloud')) {
            if (description.includes('few') || description.includes('scattered') || description.includes('partly')) {
                ascii = "    \\  /     \n" +
                       "  _ /\"\" .-.   \n" +
                       "    \\_`(   ). \n" +
                       "    /(___(__))\n" +
                       "              ";
            } else if (description.includes('broken') || description.includes('overcast')) {
                ascii = "     .--.    \n" +
                       "  .-(    ).  \n" +
                       " (___.__)__) \n" +
                       "              \n" +
                       "              ";
            } else {
                ascii = "     .--.    \n" +
                       "  .-(    ).  \n" +
                       " (___.__)__) \n" +
                       "              \n" +
                       "              ";
            }
        } else if (weather.includes('rain')) {
            if (description.includes('light') || description.includes('drizzle')) {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "    ' ' ' '  \n" +
                       "   ' ' ' '   ";
            } else if (description.includes('heavy')) {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "  ,',',','   \n" +
                       "  ,',',','   ";
            } else {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "    ' ' ' '  \n" +
                       "   ' ' ' '   ";
            }
        } else if (weather.includes('snow')) {
            if (description.includes('blowing') || description.includes('heavy')) {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "   * * * *   \n" +
                       "  * * * *    ";
            } else {
                ascii = "     .-.     \n" +
                       "    (   ).   \n" +
                       "   (___(__)  \n" +
                       "    *  *  *  \n" +
                       "   *  *  *   ";
            }
        } else if (weather.includes('thunder') || weather.includes('storm')) {
            ascii = "     .-.     \n" +
                   "    (   ).   \n" +
                   "   (___(__)  \n" +
                   "    ⚡⚡⚡    \n" +
                   "   ⚡⚡⚡     ";
        } else if (weather.includes('fog') || weather.includes('mist')) {
            ascii = " _ _ _ _ _  \n" +
                   "  _ _ _ _ _  \n" +
                   " _ _ _ _ _   \n" +
                   "  _ _ _ _ _  \n" +
                   " _ _ _ _ _   ";
        } else if (weather.includes('haze') || description.includes('hazy')) {
            ascii = "     \\   /   \n" +
                   "      .-.     \n" +
                   "   –– (   ) ––\n" +
                   "      `-'     \n" +
                   "     /   \\    ";
        } else if (weather.includes('sun') || description.includes('sunny')) {
            ascii = "    \\   /    \n" +
                   "     .-.     \n" +
                   "  ── (   ) ──\n" +
                   "     `-'     \n" +
                   "    /   \\    ";
        } else if (description.includes('patchy')) {
            ascii = "     .-.     \n" +
                   "  .-(    ).  \n" +
                   " (___.__)__) \n" +
                   "  * * * *    \n" +
                   " * * * *     ";
        } else {
            // Default fallback
            ascii = "    \\   /    \n" +
                   "     .-.     \n" +
                   "  -- (   ) --\n" +
                   "     `-'     \n" +
                   "    /   \\    ";
        }
    }
    
    // Format temperature with range as in the image
    const tempRange = `${tempF}(${feelsLikeF}) °F`;
    
    // Precipitation field
    let precipitation = '0.0 mm';
    if (forecast.rain) {
        precipitation = `${(forecast.rain['3h'] || 0).toFixed(1)} mm`;
    } else if (forecast.snow) {
        precipitation = `${(forecast.snow['3h'] || 0).toFixed(1)} mm`;
    }
    
    // Get direction arrow for wind
    const deg = forecast.wind.deg;
    const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const index = Math.round(deg / 45) % 8;
    const arrow = directions[index];
    
    // If this is the current weather, make it more prominent with a box that aligns with the main table
    if (isCurrent) {
        const weatherCondition = weather.charAt(0).toUpperCase() + weather.slice(1);
        
        // Create fixed-width box lines for perfect alignment
        const headerLine = `╔${'═'.repeat(boxWidth - 2)}╗`;
        const titleLine = `║${centerText('Current: ' + weatherCondition, boxWidth - 2)}║`;
        const dividerLine = `╠${'═'.repeat(boxWidth - 2)}╣`;
        const footerLine = `╚${'═'.repeat(boxWidth - 2)}╝`;
        
        // Format the ASCII art to fit the box width
        const asciiLines = ascii.split('\n');
        const paddedAsciiLines = asciiLines.map(line => {
            // Center the ASCII art exactly
            const artPadding = Math.floor((boxWidth - 2 - line.length) / 2);
            return `║${' '.repeat(artPadding)}${line}${' '.repeat(boxWidth - 2 - line.length - artPadding)}║`;
        });
        
        // Create data lines with consistent padding and width
        const tempLine = `║${centerText(tempRange, boxWidth - 2)}║`;
        const windLine = `║${' '.repeat(2)}${arrow} ${windSpeed} km/h${' '.repeat(boxWidth - 2 - 2 - arrow.length - String(windSpeed).length - 6)}║`;
        const visLine = `║${' '.repeat(2)}${visibility} km${' '.repeat(boxWidth - 2 - 2 - String(visibility).length - 3)}║`;
        const precipLine = `║${' '.repeat(2)}${precipitation}${' '.repeat(boxWidth - 2 - 2 - precipitation.length)}║`;
        
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
            footerLine
        ].join('\n');
        
        return result;
    }
    
    // Format with consistent indentation to match the template
    return `${ascii}\n` +
           ` ${tempRange}\n` +
           ` ${arrow} ${windSpeed} km/h\n` +
           ` ${visibility} km\n` +
           ` ${precipitation}`;
}

/**
 * Initializes the command-line interface (CLI) functionality.
 * Sets up the output area, displays initial messages, creates the input line,
 * and attaches necessary event listeners for input, history, and focus management.
 */
function initCLI() {
    cliOutput = document.getElementById('cli-output');
    displayBanner();
    displayWelcomeMessage();
    
    const { inputLine: newInputLine, input } = createInputLine();
    inputLine = newInputLine;
    if (!cliOutput.contains(inputLine)) {
        cliOutput.appendChild(inputLine);
    }
    
    // Auto-focus the terminal input on page load
    input.focus();
    
    // Get the custom cursor element and set it to the global variable
    cursor = inputLine.querySelector('.terminal-cursor');
    
    // Get the terminal element
    const terminal = document.querySelector('.terminal');
    
    // Better text selection handling
    let mouseDownTarget = null;
    let hasMovedMouse = false;
    
    // Track mousedown to determine if user is starting text selection
    terminal.addEventListener('mousedown', function(e) {
        mouseDownTarget = e.target;
        hasMovedMouse = false;
    });
    
    // Track mouse movement to detect selection
    terminal.addEventListener('mousemove', function(e) {
        if (e.buttons === 1) { // Left mouse button is pressed
            hasMovedMouse = true;
        }
    });
    
    // Handle click on terminal - focus input unless user was selecting text
    terminal.addEventListener('click', function(e) {
        // Don't handle clicks on links
        if (e.target.tagName === 'A') {
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
        if (selection.type === 'Range' && selection.toString().length > 0) {
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
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';
        span.style.font = window.getComputedStyle(currentInput).font;
        span.textContent = currentInput.value.substring(0, currentInput.selectionStart);
        document.body.appendChild(span);
        
        // Get the width and update the cursor position
        const width = span.getBoundingClientRect().width;
        cursor.style.left = `${width + 4}px`; // 4px is the left margin of the input
        
        // Clean up the span
        document.body.removeChild(span);
    }
    
    // Update cursor position initially and on input events
    updateCursorPosition();
    input.addEventListener('input', updateCursorPosition);
    input.addEventListener('keydown', () => setTimeout(updateCursorPosition, 0));
    input.addEventListener('click', updateCursorPosition);
    input.addEventListener('select', updateCursorPosition);
    
    // Add event listener for navigating command history
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = e.target.value.trim();
            if (command) {
                commandHistory.push(command);
                historyIndex = commandHistory.length;
                currentInputBuffer = '';
                executeCommand(command);
                e.target.value = '';
            }
            return;
        }

        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (historyIndex === commandHistory.length) {
                    currentInputBuffer = e.target.value;
                }
                if (historyIndex > 0) {
                    historyIndex--;
                    e.target.value = commandHistory[historyIndex];
                }
                break;
            case 'ArrowDown':
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
}

/**
 * Parses a curl command string into a structured object with options and URL.
 * @param {string} cmdString - The curl command string to parse (without the 'curl' part)
 * @returns {Object} - Parsed command with options and URL
 */
function parseCurlCommand(cmdString) {
    const result = {
        url: '',
        method: 'GET',
        headers: {},
        data: null,
        headOnly: false,
        verbose: false,
        outputFile: null
    };
    
    // Simple regex-based parser for curl arguments
    // This is a simplified version that handles the most common cases
    let inQuotes = false;
    let currentQuote = '';
    let tokens = [];
    let current = '';
    
    // Tokenize the command string
    for (let i = 0; i < cmdString.length; i++) {
        const char = cmdString[i];
        
        if ((char === '"' || char === "'") && (i === 0 || cmdString[i-1] !== '\\')) {
            if (inQuotes && currentQuote === char) {
                // End of quoted string
                inQuotes = false;
                currentQuote = '';
                tokens.push(current);
                current = '';
            } else if (!inQuotes) {
                // Start of quoted string
                inQuotes = true;
                currentQuote = char;
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                // Different quote inside a quoted string
                current += char;
            }
        } else if (char === ' ' && !inQuotes) {
            if (current) {
                tokens.push(current);
                current = '';
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
        
        if (token.startsWith('-')) {
            // Handle options
            switch (token) {
                case '-X':
                    if (i + 1 < tokens.length) {
                        result.method = tokens[++i];
                    }
                    break;
                case '-H':
                    if (i + 1 < tokens.length) {
                        const header = tokens[++i];
                        const separatorIndex = header.indexOf(':');
                        if (separatorIndex > 0) {
                            const name = header.substring(0, separatorIndex).trim();
                            const value = header.substring(separatorIndex + 1).trim();
                            result.headers[name] = value;
                        }
                    }
                    break;
                case '-d':
                    if (i + 1 < tokens.length) {
                        result.data = tokens[++i];
                        // If method is still GET, change it to POST
                        if (result.method === 'GET') {
                            result.method = 'POST';
                        }
                    }
                    break;
                case '-I':
                    result.headOnly = true;
                    result.method = 'HEAD';
                    break;
                case '-v':
                    result.verbose = true;
                    break;
                case '-o':
                    if (i + 1 < tokens.length) {
                        result.outputFile = tokens[++i];
                    }
                    break;
                // Handle combined short options like -Iv
                default:
                    if (token.startsWith('-') && token.length > 1 && !token.startsWith('--')) {
                        for (let j = 1; j < token.length; j++) {
                            const option = token[j];
                            if (option === 'I') {
                                result.headOnly = true;
                                result.method = 'HEAD';
                            } else if (option === 'v') {
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
        appendOutput(`curl ${args.url}`, 'command-text');
        
        // If verbose mode is enabled, show request details
        if (args.verbose) {
            appendOutput('> Verbose mode enabled', 'info-text');
            appendOutput(`> Request Method: ${args.method}`, 'info-text');
            if (Object.keys(args.headers).length > 0) {
                appendOutput('> Request Headers:', 'info-text');
                for (const [name, value] of Object.entries(args.headers)) {
                    appendOutput(`>   ${name}: ${value}`, 'info-text');
                }
            }
            if (args.data) {
                appendOutput('> Request Body:', 'info-text');
                appendOutput(`>   ${args.data}`, 'info-text');
            }
        }
        
        // Ensure URL has a protocol prefix
        let url = args.url;
        if (!url.match(/^https?:\/\//i)) {
            url = 'https://' + url;
            appendOutput(`> Adding https:// prefix to URL: ${url}`, 'info-text');
        }
        
        // Prepare fetch options
        const fetchOptions = {
            method: args.method,
            headers: { ...args.headers },
            credentials: 'omit',
            mode: 'cors'
        };
        
        // Add body for methods that support it
        if (args.data && ['POST', 'PUT', 'PATCH'].includes(args.method.toUpperCase())) {
            fetchOptions.body = args.data;
        }
        
        // Show a pending message
        appendOutput(`Making ${args.method} request to ${url}...`, 'info-text');
        appendOutput('Browser curl can only read CORS-enabled endpoints.', 'info-text');

        let response;
        try {
            response = await fetch(url, fetchOptions);
        } catch (error) {
            appendOutput(`curl: (1) Request blocked or failed: ${error.message}`, 'error-text');
            appendOutput('Tip: if this endpoint does not allow CORS, test with real terminal curl instead.', 'warning-text');
            return;
        }

        appendOutput('Response received:', 'info-text');
        
        // Display status line
        const statusLine = `HTTP/${response.status} ${response.statusText}`;
        appendOutput(statusLine, response.ok ? 'success-text' : 'error-text');
        
        // Display response headers if verbose or HEAD request
        if (args.verbose || args.headOnly) {
            appendOutput('Response Headers:', 'info-text');
            for (const [name, value] of response.headers.entries()) {
                appendOutput(`${name}: ${value}`, 'log-text');
            }
        }
        
        // Get and display response body if not a HEAD request
        if (!args.headOnly) {
            try {
                // Try to get response as text
                const text = await response.text();
                
                // If it looks like JSON, try to format it
                if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                    try {
                        const json = JSON.parse(text);
                        appendOutput(JSON.stringify(json, null, 2), 'log-text');
                    } catch (e) {
                        // If parsing fails, just show as text
                        appendOutput(text, 'log-text');
                    }
                } else {
                    // For non-JSON responses
                    appendOutput(text, 'log-text');
                }
            } catch (textError) {
                appendOutput(`Unable to read response body: ${textError.message}`, 'error-text');
            }
        }
        
        // Handle output to file if specified (simulated)
        if (args.outputFile) {
            appendOutput(`Note: In this web environment, data cannot be saved to '${args.outputFile}'. This would work in a real terminal.`, 'warning-text');
        }
    } catch (error) {
        appendOutput(`curl: (1) ${error.message}`, 'error-text');
    }
}

