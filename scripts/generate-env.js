const fs = require("fs");
const path = require("path");

function readEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, "utf-8");
  }
  return "";
}

function getEnvVar(name) {
  if (process.env[name]) return process.env[name];
  const content = readEnvFile();
  const match = content.match(new RegExp(`^${name}=(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

const safeApiKey = getEnvVar("OPENWEATHERMAP_API_KEY");
const adminHash = getEnvVar("ADMIN_PASSWORD_HASH");

const envContent = `(function() {
  window.ENV = {
    OPENWEATHERMAP_API_KEY: '${safeApiKey}',
    ADMIN_PASSWORD_HASH: '${adminHash}'
  };
})();
`;

const publicDir = path.join(__dirname, "..", "public");
const outputPath = path.join(publicDir, "env.js");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, envContent);

if (!safeApiKey) {
  console.warn(
    "Warning: OPENWEATHERMAP_API_KEY is not set. Weather command will show a runtime error.",
  );
}

console.log(`Generated ${outputPath}`);
