const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase environment variables not set. Database features will be disabled."
  );
  // Export a dummy function if no credentials
  module.exports = {
    getSupabaseClient: () => {
      throw new Error(
        "Supabase not configured. Missing environment variables."
      );
    },
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);

  module.exports = {
    getSupabaseClient: () => supabase,
  };
}
