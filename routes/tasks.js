import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/* ================================
   CREATE TASK
================================= */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      deadline,
      project_id,
      reminder_at,
    } = req.body;

    if (!title || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Task title and project required",
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title,
          description,
          priority,
          deadline,
          project_id,
          reminder_at,
          reminder_sent: false,
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

/* ================================
   GET TASKS BY PROJECT
================================= */
router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const { assigned_to } = req.query;

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId);

  if (assigned_to) {
    query = query.eq("assigned_to", assigned_to);
  }

  const { data } = await query;

  res.json({ success: true, data });
});

/* ================================
   UPDATE TASK STATUS
================================= */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ================================
   GET UPCOMING REMINDERS
================================= */
router.get("/reminders/upcoming", async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .lte("reminder_at", now)
      .eq("reminder_sent", false);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ================================
   MARK REMINDER AS SENT
================================= */
router.patch("/:id/reminder-sent", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("tasks")
      .update({ reminder_sent: true })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;