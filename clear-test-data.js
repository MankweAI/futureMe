// clear-test-data.js
// ⚠️ WARNING: This script will DELETE ALL test data from your database
// Use with caution - only for testing purposes!

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const readline = require("readline");

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

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt user for confirmation
 */
function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

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
      .neq("wa_id", "SYSTEM_PRESERVE"); // Delete all except system (none exist)

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
      .neq("id", 0); // Delete all

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
 * Clear specific test user by phone number
 */
async function clearSpecificUser(waId) {
  try {
    console.log(
      `${colors.cyan}🔍 Clearing data for user ${waId}...${colors.reset}`
    );

    let totalDeleted = 0;

    // Delete session
    const { data: sessions, error: sessionError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("wa_id", waId)
      .select();

    if (sessionError) {
      console.error(
        `${colors.yellow}⚠️ Session deletion error: ${sessionError.message}${colors.reset}`
      );
    } else {
      const sessionCount = sessions?.length || 0;
      totalDeleted += sessionCount;
      if (sessionCount > 0) {
        console.log(
          `${colors.green}✅ Deleted ${sessionCount} session(s)${colors.reset}`
        );
      }
    }

    // Delete applications
    const { data: apps, error: appError } = await supabase
      .from("bursary_applications")
      .delete()
      .eq("wa_id", waId)
      .select();

    if (appError) {
      console.error(
        `${colors.yellow}⚠️ Application deletion error: ${appError.message}${colors.reset}`
      );
    } else {
      const appCount = apps?.length || 0;
      totalDeleted += appCount;
      if (appCount > 0) {
        console.log(
          `${colors.green}✅ Deleted ${appCount} application(s)${colors.reset}`
        );
      }
    }

    return totalDeleted;
  } catch (error) {
    console.error(
      `${colors.red}❌ User deletion error: ${error.message}${colors.reset}`
    );
    return 0;
  }
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(
    `${colors.cyan}🧹 FutureMe Test Data Cleanup Script${colors.reset}`
  );
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );

  console.log(
    `${colors.yellow}⚠️  WARNING: This will delete test data from your database!${colors.reset}\n`
  );

  console.log("What would you like to do?\n");
  console.log("1️⃣  Clear ALL sessions and applications (complete reset)");
  console.log("2️⃣  Clear specific user by phone number");
  console.log("3️⃣  Clear only sessions");
  console.log("4️⃣  Clear only applications");
  console.log("5️⃣  Exit (cancel)\n");

  const choice = await promptUser("Enter your choice (1-5): ");

  switch (choice.trim()) {
    case "1":
      console.log(
        `\n${colors.red}⚠️  You are about to delete ALL test data!${colors.reset}`
      );
      const confirmAll = await promptUser('Type "DELETE ALL" to confirm: ');

      if (confirmAll.trim() === "DELETE ALL") {
        console.log(`\n${colors.cyan}Starting cleanup...${colors.reset}\n`);
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
      } else {
        console.log(
          `\n${colors.yellow}❌ Cancelled - confirmation did not match${colors.reset}\n`
        );
      }
      break;

    case "2":
      const waId = await promptUser(
        "\nEnter phone number (e.g., 27721111111): "
      );
      const confirm = await promptUser(`Delete all data for ${waId}? (y/n): `);

      if (confirm.toLowerCase() === "y") {
        console.log(`\n${colors.cyan}Clearing user data...${colors.reset}\n`);
        const deleted = await clearSpecificUser(waId);

        console.log(
          `\n${colors.green}✅ Deleted ${deleted} record(s) for ${waId}${colors.reset}\n`
        );
      } else {
        console.log(`\n${colors.yellow}❌ Cancelled${colors.reset}\n`);
      }
      break;

    case "3":
      const confirmSessions = await promptUser(
        "\nDelete all sessions? (y/n): "
      );
      if (confirmSessions.toLowerCase() === "y") {
        console.log(`\n${colors.cyan}Clearing sessions...${colors.reset}\n`);
        const count = await clearSessions();
        console.log(
          `\n${colors.green}✅ Done! Deleted ${count} session(s)${colors.reset}\n`
        );
      } else {
        console.log(`\n${colors.yellow}❌ Cancelled${colors.reset}\n`);
      }
      break;

    case "4":
      const confirmApps = await promptUser(
        "\nDelete all applications? (y/n): "
      );
      if (confirmApps.toLowerCase() === "y") {
        console.log(
          `\n${colors.cyan}Clearing applications...${colors.reset}\n`
        );
        const count = await clearApplications();
        console.log(
          `\n${colors.green}✅ Done! Deleted ${count} application(s)${colors.reset}\n`
        );
      } else {
        console.log(`\n${colors.yellow}❌ Cancelled${colors.reset}\n`);
      }
      break;

    case "5":
    default:
      console.log(`\n${colors.yellow}❌ Cancelled${colors.reset}\n`);
      break;
  }

  rl.close();
}

// Run the script
runCleanup().catch((error) => {
  console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});
