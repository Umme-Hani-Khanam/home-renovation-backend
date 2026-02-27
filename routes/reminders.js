import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.post("/", async (req, res) => {
  try {
    const { title, description, reminder_date } = req.body;

    const { data, error } = await supabase
      .from("reminders")
      .insert([
        {
          title,
          description,
          reminder_date,
          user_id: req.user.id,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;