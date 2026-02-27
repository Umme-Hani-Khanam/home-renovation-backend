import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/* AUTO GENERATE MATERIALS */
router.post("/auto/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    const materials = [];

    const name = project.name.toLowerCase();

    if (name.includes("kitchen")) {
      materials.push(
        { name: "Cabinets", estimated_cost: 40000 },
        { name: "Granite Countertop", estimated_cost: 25000 },
        { name: "Tiles", estimated_cost: 15000 }
      );
    }

    if (name.includes("bathroom")) {
      materials.push(
        { name: "Shower Set", estimated_cost: 12000 },
        { name: "Waterproof Paint", estimated_cost: 8000 }
      );
    }

    const formatted = materials.map(m => ({
      ...m,
      project_id: projectId,
    }));

    if (formatted.length > 0) {
      await supabase.from("materials").insert(formatted);
    }

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;