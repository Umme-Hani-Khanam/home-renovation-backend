import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.post("/", async (req, res) => {
  try {
    const { name, quantity, unit, low_stock_threshold } = req.body;

    const { data, error } = await supabase
      .from("inventory")
      .insert([
        {
          name,
          quantity,
          unit,
          low_stock_threshold,
          user_id: req.user.id,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;