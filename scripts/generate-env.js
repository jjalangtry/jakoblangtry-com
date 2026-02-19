const fs = require('fs');
const path = require('path');

const apiKey = process.env.OPENWEATHERMAP_API_KEY;
const safeApiKey = apiKey || '';

const envContent = `// Client-side environment variables
const ENV = {
    OPENWEATHERMAP_API_KEY: '${safeApiKey}'
};

// Expose the environment to the window
window.ENV = ENV;
`;

const publicDir = path.join(__dirname, '..', 'public');
const outputPath = path.join(publicDir, 'env.js');

// Ensure public directory exists (it should, but doesn't hurt to check)
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, envContent);

if (!apiKey) {
  console.warn('Warning: OPENWEATHERMAP_API_KEY is not set. Weather command will show a clear runtime error.');
}

console.log(`Successfully generated ${outputPath}.`);