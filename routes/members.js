import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.post("/invite", async (req, res) => {
  try {
    const { project_id, user_id, invite_email, role, status, invited_at, accepted_at } = req.body;

    if (!project_id || (!user_id && !invite_email)) {
      return res.status(400).json({
        success: false,
        message: "project_id and either user_id or invite_email are required",
      });
    }

    const finalStatus = status || (user_id ? "accepted" : "pending");

    const payload = {
      project_id,
      user_id: user_id || null,
      invite_email: invite_email || null,
      role: role || "member",
      status: finalStatus,
      invited_at: invited_at || new Date().toISOString(),
      accepted_at: accepted_at || (finalStatus === "accepted" ? new Date().toISOString() : null),
    };

    const { data, error } = await supabase
      .from("project_members")
      .insert([payload])
      .select("id, project_id, user_id, invite_email, role, status, invited_at, accepted_at");

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("project_members")
      .select(
        "id, project_id, user_id, invite_email, role, status, invited_at, accepted_at, profiles:user_id(id, full_name, email, avatar_url)"
      )
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
