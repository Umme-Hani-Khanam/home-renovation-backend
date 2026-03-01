import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.get("/", async (req, res) => {
  try {
    const { projectId } = req.query;

    let query = supabase
      .from("contractors")
      .select("id, name, phone, email, role, project_id, created_at")
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, phone, email, role, project_id } = req.body;

    const { data, error } = await supabase
      .from("contractors")
      .insert([{ name, phone, email, role, project_id }])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/schedule", async (req, res) => {
  try {
    const { contractor_id, scheduled_date, note } = req.body;

    const { data, error } = await supabase
      .from("contractor_schedules")
      .insert([{ contractor_id, scheduled_date, note }])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
