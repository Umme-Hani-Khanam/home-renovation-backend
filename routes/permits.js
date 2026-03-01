import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.post("/", async (req, res) => {
  try {
    const { permit_name, status, approval_date, project_id } = req.body;

    if (!permit_name || !project_id) {
      return res.status(400).json({
        success: false,
        message: "permit_name and project_id are required",
      });
    }

    const { data, error } = await supabase
      .from("permits")
      .insert([{ permit_name, status, approval_date, project_id }])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("permits")
      .select("*")
      .eq("project_id", projectId);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { permit_name, status, approval_date } = req.body;

    const updatePayload = {};

    if (permit_name !== undefined) updatePayload.permit_name = permit_name;
    if (status !== undefined) updatePayload.status = status;
    if (approval_date !== undefined) updatePayload.approval_date = approval_date;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update",
      });
    }

    const { data, error } = await supabase
      .from("permits")
      .update(updatePayload)
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
