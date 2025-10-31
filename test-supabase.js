// test-supabase.js
// This loads all keys from .env.local into process.env
require("dotenv").config({ path: ".env.local" });

// We are now testing the connection EXACTLY how session-manager.js does it.
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ CRITICAL_ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Attempting to connect to Supabase...");
console.log(`Supabase URL: ${supabaseUrl}\n`);

async function testSupabaseConnection() {
  try {
    // We will test the connection by trying to read a table.
    // 'chat_sessions' is the table used by session-manager.js
    // .select('*').limit(1) is a simple, low-cost "ping".
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .limit(1);

    if (error) {
      // Handle Supabase-specific errors (e.g., table not found)
      // Updated this check to be more robust and catch your specific error message.
      const isTableNotFoundError =
        error.code === "42P01" ||
        (error.message && error.message.includes("Could not find the table"));

      if (isTableNotFoundError) {
        console.warn(
          '⚠️ SUPABASE_WARNING: Connection successful, but the table "chat_sessions" does not exist.'
        );
        console.log(
          "This is OK! The table will be created when you run the app (see next step)."
        );
        console.log("✅ SUPABASE_SUCCESS: Connection credentials are correct!");
      } else {
        console.error("❌ SUPABASE_ERROR: Could not connect to Supabase.");
        console.error(error.message);
      }
    } else {
      // If data is returned (even an empty array), the connection is perfect.
      console.log(
        '✅ SUPABASE_SUCCESS: Connected to Supabase and "chat_sessions" table successfully!'
      );
    }
  } catch (err) {
    console.error("❌ CRITICAL_ERROR: A general error occurred.");
    console.error(err.message);
  }
}

testSupabaseConnection();
