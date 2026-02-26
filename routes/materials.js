import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/**
 * GET Materials by Project
 */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("materials")
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
 * CREATE Material
 */
router.post("/", async (req, res) => {
  try {
    const {
      project_id,
      name,
      quantity,
      unit,
      estimated_cost,
    } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Project ID and material name required",
      });
    }

    const { data, error } = await supabase
      .from("materials")
      .insert([
        {
          project_id,
          name,
          quantity,
          unit,
          estimated_cost,
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
 * UPDATE Material (mark purchased or edit cost)
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { purchased, quantity, estimated_cost } = req.body;

    const updateFields = {};

    if (purchased !== undefined) updateFields.purchased = purchased;
    if (quantity !== undefined) updateFields.quantity = quantity;
    if (estimated_cost !== undefined)
      updateFields.estimated_cost = estimated_cost;

    const { data, error } = await supabase
      .from("materials")
      .update(updateFields)
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE Material
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Material removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;