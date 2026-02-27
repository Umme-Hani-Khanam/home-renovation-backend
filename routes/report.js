import express from "express";
import supabase from "../config/supabase.js";
import PDFDocument from "pdfkit";
import axios from "axios";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  const { data: analytics } = await supabase
    .from("projects")
    .select("total_budget")
    .eq("id", projectId)
    .single();

  const { data: photos } = await supabase
    .from("project_photos")
    .select("*")
    .eq("project_id", projectId);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.fontSize(20).text("Renovation Report");
  doc.moveDown();
  doc.text(`Project: ${project.name}`);
  doc.text(`Budget: ₹${analytics.total_budget}`);
  doc.moveDown();

  doc.text("Photos:");
  for (let photo of photos) {
    try {
      const img = await axios.get(photo.image_url, {
        responseType: "arraybuffer",
      });
      doc.image(img.data, { width: 250 });
      doc.moveDown();
    } catch {}
  }

  doc.end();
});

export default router;