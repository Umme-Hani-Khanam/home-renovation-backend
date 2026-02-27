import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config(); // MUST BE FIRST

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables missing.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;