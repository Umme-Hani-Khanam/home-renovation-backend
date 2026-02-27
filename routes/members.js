import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.post("/invite", async (req, res) => {
  try {
    const { project_id, user_id } = req.body;

    const { data, error } = await supabase
      .from("project_members")
      .insert([{ project_id, user_id, role: "member" }])
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false });
  }
});

export default router;