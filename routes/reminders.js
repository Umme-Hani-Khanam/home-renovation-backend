import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/* CREATE REMINDER */
router.post("/", async (req, res) => {
  try {
    const { title, description, reminder_date } = req.body;

    if (!title || !reminder_date) {
      return res.status(400).json({
        success: false,
        message: "Title and reminder date are required",
      });
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert([
        {
          title,
          description,
          reminder_date,
          user_id: req.user.id,
          completed: false,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* GET UPCOMING REMINDERS ONLY */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("completed", false)
      .order("reminder_date", { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* MARK REMINDER AS COMPLETED */
router.patch("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("reminders")
      .update({ completed: true })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({ success: true, message: "Reminder marked as completed" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;