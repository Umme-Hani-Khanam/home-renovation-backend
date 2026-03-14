import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config(); // MUST BE FIRST

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase environment variables missing. Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
