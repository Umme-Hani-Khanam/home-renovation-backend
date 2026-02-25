import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const test = async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);
};

test();