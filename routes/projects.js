import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

/**
 * CREATE PROJECT
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      start_date,
      end_date,
      total_budget,
    } = req.body;

    const userId = req.user.id;

    if (!name || total_budget === undefined) {
      return res.status(400).json({
        success: false,
        message: "Project name and total budget required",
      });
    }

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name,
          description,
          location,
          start_date,
          end_date,
          total_budget,
          user_id: userId,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET USER PROJECTS
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * UPDATE PROJECT STATUS
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "planning",
      "in_progress",
      "completed",
      "on_hold",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
      });
    }

    const { data, error } = await supabase
      .from("projects")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PROJECT ANALYTICS
 */
router.get("/:id/analytics", async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Get Project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError) throw projectError;

    const totalBudget = Number(project.total_budget || 0);

    // 2️⃣ Get Expenses
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("amount")
      .eq("project_id", id);

    if (expenseError) throw expenseError;

    const totalSpent = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const remainingBudget = totalBudget - totalSpent;

    const budgetUsedPercentage =
      totalBudget > 0
        ? Math.round((totalSpent / totalBudget) * 100)
        : 0;

    // 3️⃣ Get Tasks
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("status, deadline")
      .eq("project_id", id);

    if (taskError) throw taskError;

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (t) => t.status === "completed"
    ).length;

    const completionPercentage =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    const today = new Date().toISOString().split("T")[0];

    const overdueTasks = tasks.filter(
      (t) =>
        t.deadline &&
        t.deadline < today &&
        t.status !== "completed"
    ).length;

    // 4️⃣ Health Logic
    let healthStatus = "healthy";

    if (budgetUsedPercentage > 90) {
      healthStatus = "budget_risk";
    }

    if (overdueTasks > 0) {
      healthStatus = "delayed";
    }

    res.json({
      success: true,
      data: {
        totalBudget,
        totalSpent,
        remainingBudget,
        budgetUsedPercentage,
        totalTasks,
        completedTasks,
        completionPercentage,
        overdueTasks,
        healthStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE PROJECT
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;