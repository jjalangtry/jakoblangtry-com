const fs = require('fs');
const path = require('path');

let apiKey = process.env.OPENWEATHERMAP_API_KEY;

if (!apiKey) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^OPENWEATHERMAP_API_KEY=(.+)$/m);
    if (match) {
      apiKey = match[1].trim();
    }
  }
}

const safeApiKey = apiKey || '';

const envContent = `(function() {
  window.ENV = {
    OPENWEATHERMAP_API_KEY: '${safeApiKey}'
  };
})();
`;

const publicDir = path.join(__dirname, '..', 'public');
const outputPath = path.join(publicDir, 'env.js');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, envContent);

if (!safeApiKey) {
  console.warn('Warning: OPENWEATHERMAP_API_KEY is not set. Weather command will show a runtime error.');
}

console.log(`Generated ${outputPath}`);
