// scripts/setup.js
// Initial setup script for Vercel deployment

const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up WhatsApp AI Tutor project for Vercel...\n");

// Create necessary directories
const directories = ["temp", "logs"];

directories.forEach((dir) => {
  const dirPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
});

// Check .env.local file
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("\n❌ .env.local file not found!");
  console.log("Please create a .env.local file with the following variables:");
  console.log("- OPENAI_API_KEY=your_openai_api_key_here");
  console.log("- SUPABASE_URL=your_supabase_url_here");
  console.log("- SUPABASE_ANON_KEY=your_supabase_anon_key_here");
  console.log("- MANYCHAT_API_KEY=your_manychat_api_key_here");
  console.log("- MANYCHAT_PAGE_ID=your_manychat_page_id_here");
  console.log("- WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here");
} else {
  console.log("\n✅ .env.local file found");
}

// Check Vercel CLI
console.log("\n🔍 Checking Vercel CLI...");
const { exec } = require("child_process");

exec("vercel --version", (error, stdout, stderr) => {
  if (error) {
    console.log("❌ Vercel CLI not found. Please install it:");
    console.log("npm install -g vercel");
  } else {
    console.log(`✅ Vercel CLI found: ${stdout.trim()}`);
  }
});

console.log("\n🎉 Setup complete!");
console.log("\nNext steps:");
console.log("1. Fill in your API keys in the .env.local file");
console.log("2. Install Vercel CLI: npm install -g vercel");
console.log('3. Run "npm install" to install dependencies');
console.log('4. Run "npm run dev" to start local development');
console.log('5. Run "npm run deploy" to deploy to Vercel');
console.log(
  "\n📊 Test your setup: Visit /api/test-connections after starting the server"
);

