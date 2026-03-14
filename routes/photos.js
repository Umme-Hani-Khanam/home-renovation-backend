import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);
const STORAGE_BUCKET = "project-photos";

function parseDataUrl(base64Value) {
  const raw = String(base64Value || "").trim().replace(/\s+/g, "");
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

function isValidBase64Payload(value) {
  if (!value || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

/* UPLOAD PHOTO */
router.post("/", async (req, res) => {
  try {
    const projectId = String(req.body?.project_id || "").trim();
    const imageBase64 = req.body?.image_base64;
    const fileName = String(req.body?.file_name || "photo").trim();

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "project_id is required.",
      });
    }

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "image_base64 is required.",
      });
    }

    const { mimeType, payload } = parseDataUrl(imageBase64);

    if (!payload || !isValidBase64Payload(payload)) {
      return res.status(400).json({ success: false, message: "Invalid image_base64 payload." });
    }

    const buffer = Buffer.from(payload, "base64");
    if (!buffer.length) {
      return res.status(400).json({ success: false, message: "Invalid image_base64 payload." });
    }

    const safeInputName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "photo";
    const hasExt = safeInputName.includes(".");
    const extension = extensionFromMime(mimeType);
    const resolvedName = hasExt ? safeInputName : `${safeInputName}.${extension}`;
    const filePath = `${projectId}/${Date.now()}-${resolvedName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[POST /api/photos] Supabase storage upload error:", uploadError);
      return res.status(500).json({ success: false, message: "Failed to upload photo file" });
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    let imageUrl = publicUrlData?.publicUrl || "";

    if (imageUrl && !imageUrl.startsWith("http")) {
      const baseUrl = process.env.SUPABASE_URL || "";
      imageUrl = `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
    }

    if (!imageUrl) {
      console.error("[POST /api/photos] Missing public URL for uploaded photo", { filePath });
      return res.status(500).json({ success: false, message: "Failed to generate photo URL" });
    }

    const { data, error } = await supabase
      .from("project_photos")
      .insert([
        {
          project_id: projectId,
          image_url: imageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[POST /api/photos] Supabase insert error:", error);
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
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
