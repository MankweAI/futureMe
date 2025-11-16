// test-supabase.js
require("dotenv").config({ path: ".env.local" });

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
  let success = true;

  try {
    // Test 1: Check chat_sessions table (from original project)
    console.log("Checking 'chat_sessions' table...");
    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .limit(1);

    if (sessionError && sessionError.code !== "42P01") {
      // 42P01 = table does not exist
      console.error("❌ SUPABASE_ERROR (chat_sessions):", sessionError.message);
      success = false;
    } else if (sessionError && sessionError.code === "42P01") {
      console.warn(
        "⚠️ 'chat_sessions' table not found. This might be okay if you renamed it, but session-manager expects it."
      );
      success = false;
    } else {
      console.log("✅ 'chat_sessions' table is accessible.");
    }

    // Test 2: Check NEW user_profiles table
    console.log("\nChecking 'user_profiles' table...");
    const { error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1);

    if (profileError && profileError.code === "42P01") {
      console.error("❌ CRITICAL_ERROR: 'user_profiles' table not found!");
      console.error("FIX: Run the SQL query from Step 1 to create it.");
      success = false;
    } else if (profileError) {
      console.error("❌ SUPABASE_ERROR (user_profiles):", profileError.message);
      success = false;
    } else {
      console.log(
        "✅ 'user_profiles' table is accessible. (Dashboard metrics READY)"
      );
    }

    // Test 3: Check NEW suggestions table
    console.log("\nChecking 'suggestions' table...");
    const { error: suggestionError } = await supabase
      .from("suggestions")
      .select("*")
      .limit(1);

    if (suggestionError && suggestionError.code === "42P01") {
      console.error("❌ CRITICAL_ERROR: 'suggestions' table not found!");
      console.error("FIX: Run the SQL query from Step 1 to create it.");
      success = false;
    } else {
      console.log(
        "✅ 'suggestions' table is accessible. (Suggestion box READY)"
      );
    }

    console.log("\n--- Supabase Test Summary ---");
    if (success) {
      console.log("✅ SUPABASE_SUCCESS: All required tables are connected!");
    } else {
      console.log(
        "❌ SUPABASE_FAILURE: One or more table checks failed. See errors above."
      );
    }
  } catch (err) {
    console.error("❌ CRITICAL_ERROR: A general error occurred.");
    console.error(err.message);
  }
}

testSupabaseConnection();
