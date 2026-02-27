import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/* CREATE TEMPLATE */
router.post("/", async (req, res) => {
  try {
    const { name, description, default_budget, tasks } = req.body;

    const { data, error } = await supabase
      .from("templates")
      .insert([
        {
          name,
          description,
          default_budget,
          user_id: req.user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (tasks && tasks.length > 0) {
      const formattedTasks = tasks.map((task) => ({
        ...task,
        template_id: data.id,
      }));

      await supabase.from("template_tasks").insert(formattedTasks);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/prebuilt", (req, res) => {
  res.json({
    success: true,
    data: [
      {
        name: "Kitchen Remodel",
        tasks: [
          { title: "Remove cabinets" },
          { title: "Install countertop" },
          { title: "Install lighting" }
        ]
      },
      {
        name: "Bathroom Renovation",
        tasks: [
          { title: "Install shower panel" },
          { title: "Replace sink" },
          { title: "Waterproofing" }
        ]
      }
    ]
  });
});

/* APPLY TEMPLATE TO PROJECT */
router.post("/apply/:templateId/:projectId", async (req, res) => {
  try {
    const { templateId, projectId } = req.params;

    const { data: templateTasks } = await supabase
      .from("template_tasks")
      .select("*")
      .eq("template_id", templateId);

    const formatted = templateTasks.map((task) => ({
      title: task.title,
      description: task.description,
      priority: task.priority,
      project_id: projectId,
    }));

    const { error } = await supabase
      .from("tasks")
      .insert(formatted);

    if (error) throw error;

    res.json({ success: true, message: "Template applied" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;