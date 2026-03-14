import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

router.post("/", async (req, res) => {
  try {
    const title = normalizeString(req.body?.title);
    const description = normalizeString(req.body?.description);
    const reminderDate = normalizeString(req.body?.reminder_date);

    if (!title || !reminderDate) {
      return res.status(400).json({
        success: false,
        message: "title and reminder_date are required.",
      });
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert([
        {
          title,
          description: description || null,
          reminder_date: reminderDate,
          completed: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .order("completed", { ascending: true })
      .order("reminder_date", { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = {};

    if (req.body?.title !== undefined) {
      const title = normalizeString(req.body.title);
      if (!title) {
        return res.status(400).json({
          success: false,
          message: "title cannot be empty.",
        });
      }
      updatePayload.title = title;
    }

    if (req.body?.description !== undefined) {
      updatePayload.description = normalizeString(req.body.description) || null;
    }

    if (req.body?.reminder_date !== undefined) {
      const reminderDate = normalizeString(req.body.reminder_date);
      if (!reminderDate) {
        return res.status(400).json({
          success: false,
          message: "reminder_date cannot be empty.",
        });
      }
      updatePayload.reminder_date = reminderDate;
    }

    if (req.body?.completed !== undefined) {
      updatePayload.completed = Boolean(req.body.completed);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const { data, error } = await supabase
      .from("reminders")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({ success: true, message: "Reminder deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
