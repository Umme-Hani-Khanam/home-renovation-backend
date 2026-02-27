import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/* UPLOAD PHOTO */
router.post("/", async (req, res) => {
  try {
    const { project_id, image_base64, file_name } = req.body;

    if (!project_id || !image_base64) {
      return res.status(400).json({
        success: false,
        message: "Project and image required",
      });
    }

    const buffer = Buffer.from(
      image_base64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const filePath = `${project_id}/${Date.now()}-${file_name}`;

    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(filePath, buffer, {
        contentType: "image/png",
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("project-photos")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("project_photos")
      .insert([
        {
          project_id,
          image_url: publicUrlData.publicUrl,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET PHOTOS */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("project_photos")
      .select("*")
      .eq("project_id", projectId);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;