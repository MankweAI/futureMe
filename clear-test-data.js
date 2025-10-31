// clear-test-data.js
// ⚠️ NON-INTERACTIVE: Automatically clears ALL test data
// Use with caution - only for testing purposes!

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    `${colors.red}❌ ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY${colors.reset}`
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Clear all sessions
 */
async function clearSessions() {
  try {
    console.log(`${colors.cyan}🔍 Checking chat_sessions...${colors.reset}`);

    const { data: sessions, error: countError } = await supabase
      .from("chat_sessions")
      .select("wa_id", { count: "exact" });

    if (countError) {
      console.error(
        `${colors.yellow}⚠️ Could not count sessions: ${countError.message}${colors.reset}`
      );
      return 0;
    }

    const count = sessions?.length || 0;
    console.log(`${colors.yellow}Found ${count} sessions${colors.reset}`);

    if (count === 0) {
      console.log(`${colors.green}✅ No sessions to delete${colors.reset}`);
      return 0;
    }

    const { error: deleteError } = await supabase
      .from("chat_sessions")
      .delete()
      .neq("wa_id", "SYSTEM_PRESERVE");

    if (deleteError) {
      console.error(
        `${colors.red}❌ Failed to delete sessions: ${deleteError.message}${colors.reset}`
      );
      return 0;
    }

    console.log(`${colors.green}✅ Deleted ${count} sessions${colors.reset}`);
    return count;
  } catch (error) {
    console.error(
      `${colors.red}❌ Session deletion error: ${error.message}${colors.reset}`
    );
    return 0;
  }
}

/**
 * Clear all bursary applications
 */
async function clearApplications() {
  try {
    console.log(
      `${colors.cyan}🔍 Checking bursary_applications...${colors.reset}`
    );

    const { data: apps, error: countError } = await supabase
      .from("bursary_applications")
      .select("id", { count: "exact" });

    if (countError) {
      console.error(
        `${colors.yellow}⚠️ Could not count applications: ${countError.message}${colors.reset}`
      );
      return 0;
    }

    const count = apps?.length || 0;
    console.log(`${colors.yellow}Found ${count} applications${colors.reset}`);

    if (count === 0) {
      console.log(`${colors.green}✅ No applications to delete${colors.reset}`);
      return 0;
    }

    const { error: deleteError } = await supabase
      .from("bursary_applications")
      .delete()
      .neq("id", 0);

    if (deleteError) {
      console.error(
        `${colors.red}❌ Failed to delete applications: ${deleteError.message}${colors.reset}`
      );
      return 0;
    }

    console.log(
      `${colors.green}✅ Deleted ${count} applications${colors.reset}`
    );
    return count;
  } catch (error) {
    console.error(
      `${colors.red}❌ Application deletion error: ${error.message}${colors.reset}`
    );
    return 0;
  }
}

/**
 * Main cleanup function - NO PROMPTS
 */
async function runCleanup() {
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.cyan}🧹 FutureMe Test Data Cleanup (Auto-mode)${colors.reset}`
  );
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );

  console.log(
    `${colors.yellow}⚠️  Auto-clearing ALL test data...${colors.reset}\n`
  );

  const sessions = await clearSessions();
  const apps = await clearApplications();

  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(`${colors.green}✅ Cleanup complete!${colors.reset}`);
  console.log(`Total deleted: ${sessions + apps} records`);
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );
}

// Run immediately
runCleanup()
  .then(() => {
    console.log(
      `${colors.green}✅ Script completed successfully${colors.reset}`
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      `${colors.red}❌ Fatal error: ${error.message}${colors.reset}`
    );
    process.exit(1);
  });
