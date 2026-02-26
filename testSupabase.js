import dotenv from "dotenv";
import supabase from "./config/supabase.js";

dotenv.config();

const test = async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);
};

test();