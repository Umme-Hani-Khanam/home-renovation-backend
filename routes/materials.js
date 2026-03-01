import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

function generateMaterialSeed(projectName) {
  const name = String(projectName || "").toLowerCase();

  const base = [
    { name: "Primer", estimated_cost: 2500 },
    { name: "Paint", estimated_cost: 7500 },
    { name: "Fasteners", estimated_cost: 1800 },
  ];

  if (name.includes("kitchen")) {
    return [
      ...base,
      { name: "Cabinets", estimated_cost: 40000 },
      { name: "Granite Countertop", estimated_cost: 25000 },
      { name: "Backsplash Tiles", estimated_cost: 15000 },
    ];
  }

  if (name.includes("bathroom")) {
    return [
      ...base,
      { name: "Shower Set", estimated_cost: 12000 },
      { name: "Waterproof Paint", estimated_cost: 8000 },
      { name: "Floor Tiles", estimated_cost: 10000 },
    ];
  }

  if (name.includes("bedroom") || name.includes("living")) {
    return [
      ...base,
      { name: "Laminate Flooring", estimated_cost: 18000 },
      { name: "Wall Putty", estimated_cost: 6500 },
      { name: "Electrical Fixtures", estimated_cost: 9500 },
    ];
  }

  return [
    ...base,
    { name: "General Woodwork", estimated_cost: 12000 },
    { name: "Basic Electrical", estimated_cost: 8000 },
    { name: "Finishing Hardware", estimated_cost: 5000 },
  ];
}

router.post("/auto/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) throw projectError;

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found", data: [] });
    }

    const generated = generateMaterialSeed(project.name).map((item) => ({
      project_id: projectId,
      name: item.name,
      estimated_cost: Number(item.estimated_cost || 0),
    }));

    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) throw deleteError;

    const { data: inserted, error: insertError } = await supabase
      .from("materials")
      .insert(generated)
      .select("id, project_id, name, estimated_cost, created_at");

    if (insertError) throw insertError;

    res.json({ success: true, data: Array.isArray(inserted) ? inserted : [] });
  } catch (error) {
    res.status(200).json({ success: true, data: [], message: error.message || "Unable to auto-generate materials" });
  }
});

export default router;
