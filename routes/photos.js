import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

function parseDataUrl(base64Value) {
  const raw = String(base64Value || "").trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (match) {
    return {
      mimeType: match[1],
      payload: match[2],
    };
  }

  return {
    mimeType: "image/png",
    payload: raw.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ""),
  };
}

function extensionFromMime(mimeType) {
  if (!mimeType) return "png";
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "png";
}

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

    const { mimeType, payload } = parseDataUrl(image_base64);

    if (!payload) {
      return res.status(400).json({ success: false, message: "Invalid image payload" });
    }

    const buffer = Buffer.from(payload, "base64");

    const safeInputName = String(file_name || "photo").replace(/[^a-zA-Z0-9._-]/g, "_");
    const hasExt = safeInputName.includes(".");
    const extension = extensionFromMime(mimeType);
    const resolvedName = hasExt ? safeInputName : `${safeInputName}.${extension}`;
    const filePath = `${project_id}/${Date.now()}-${resolvedName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[POST /api/photos] Supabase storage upload error:", uploadError);
      return res.status(500).json({ success: false, message: "Failed to upload photo file" });
    }

    const { data: publicUrlData } = supabase.storage
      .from("project-photos")
      .getPublicUrl(filePath);

    let imageUrl = publicUrlData?.publicUrl || "";

    if (imageUrl && !imageUrl.startsWith("http")) {
      const baseUrl = process.env.SUPABASE_URL || "";
      imageUrl = `${baseUrl}/storage/v1/object/public/project-photos/${filePath}`;
    }

    if (!imageUrl) {
      console.error("[POST /api/photos] Missing public URL for uploaded photo", { filePath });
      return res.status(500).json({ success: false, message: "Failed to generate photo URL" });
    }

    const { data, error } = await supabase
      .from("project_photos")
      .insert([
        {
          project_id,
          image_url: imageUrl,
        },
      ])
      .select();

    if (error) {
      console.error("[POST /api/photos] Supabase insert error:", error);
      return res.status(500).json({ success: false, message: "Failed to save photo record" });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("[POST /api/photos] Unexpected error:", error);
    res.status(500).json({ success: false, message: "Photo upload failed" });
  }
});

/* GET PHOTOS */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("project_photos")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/photos/:projectId] Supabase error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch photos",
      });
    }

    res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error("[GET /api/photos/:projectId] Unexpected error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch photos" });
  }
});

export default router;
