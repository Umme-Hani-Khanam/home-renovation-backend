import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/**
 * GET Contractors by Project
 */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * CREATE Contractor
 */
router.post("/", async (req, res) => {
  try {
    const {
      project_id,
      name,
      phone,
      email,
      role,
      contract_amount,
    } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Project ID and contractor name required",
      });
    }

    const { data, error } = await supabase
      .from("contractors")
      .insert([
        {
          project_id,
          name,
          phone,
          email,
          role,
          contract_amount,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE Contractor
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("contractors")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Contractor removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;