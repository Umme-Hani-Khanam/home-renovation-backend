import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/**
 * ADD ITEM
 */
router.post("/", async (req, res) => {
  try {
    const { project_id, item_name, estimated_cost } = req.body;

    if (!project_id || !item_name) {
      return res.status(400).json({
        success: false,
        message: "project_id and item_name are required",
      });
    }

    const { data, error } = await supabase
      .from("shopping_list")
      .insert([
        { project_id, item_name, estimated_cost },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("[POST /api/shopping] Error:", err);
    res.status(500).json({ success: false, message: "Failed to add shopping item" });
  }
});

/**
 * GET ITEMS
 */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("shopping_list")
      .select("*")
      .eq("project_id", projectId);

    if (error) throw error;

    res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (err) {
    console.error("[GET /api/shopping/:projectId] Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch shopping items", data: [] });
  }
});

/**
 * MARK PURCHASED
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { purchased, actual_cost } = req.body;

    const { error } = await supabase
      .from("shopping_list")
      .update({ purchased, actual_cost })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/shopping/:id] Error:", err);
    res.status(500).json({ success: false, message: "Failed to update shopping item" });
  }
});

export default router;
