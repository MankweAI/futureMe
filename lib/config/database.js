/**
 * Database Configuration
 * Supabase client setup for session storage
 */
const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

/**
 * Get or create Supabase client
 */
function getSupabaseClient() {
  if (!supabase) {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        "⚠️ Supabase credentials missing, using memory-only storage"
      );
      // Return a mock client that stores nothing
      return {
        from: () => ({
          select: () => ({
            eq: () => ({ single: () => ({ data: null, error: null }) }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
      };
    }

    // Create actual client
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabase;
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        message: "Missing Supabase credentials",
      };
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from("user_sessions")
      .select("count")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // Not found is ok
      throw error;
    }

    return {
      success: true,
      message: "Supabase connected successfully",
    };
  } catch (error) {
    console.error("Database connection test failed:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

module.exports = {
  getSupabaseClient,
  testConnection,
};
