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

    res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data: members, error: membersError } = await supabase
      .from("project_members")
      .select("id, project_id, user_id, invite_email, role, status, invited_at, accepted_at")
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false });

    if (membersError) throw membersError;

    const safeMembers = Array.isArray(members) ? members : [];
    const userIds = [...new Set(safeMembers.map((member) => member.user_id).filter(Boolean))];

    let profileMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      if (profilesError && profilesError.code !== "PGRST205") {
        throw profilesError;
      }

      profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    }

    const enriched = safeMembers.map((member) => ({
      ...member,
      profile: member.user_id ? profileMap.get(member.user_id) || null : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
