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

    const { data, error } = await supabase
      .from("shopping_list")
      .insert([
        { project_id, item_name, estimated_cost },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/**
 * GET ITEMS
 */
router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params;

  const { data } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("project_id", projectId);

  res.json({ success: true, data });
});

/**
 * MARK PURCHASED
 */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { purchased, actual_cost } = req.body;

  await supabase
    .from("shopping_list")
    .update({ purchased, actual_cost })
    .eq("id", id);

  res.json({ success: true });
});

export default router;