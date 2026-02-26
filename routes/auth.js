import express from "express";
import supabase from "../config/supabase.js";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      message: "Signup successful"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    return res.json({
      success: true,
      token: data.session.access_token
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

export default router;