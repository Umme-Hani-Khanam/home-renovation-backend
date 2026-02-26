import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Fetch user's projects
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId);

    if (projectError) throw projectError;

    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => p.status === "in_progress"
    ).length;

    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length;

    const totalBudget = projects.reduce(
      (sum, p) => sum + Number(p.total_budget || 0),
      0
    );

    // 2️⃣ Fetch expenses for user's projects
    const projectIds = projects.map((p) => p.id);

    let totalSpent = 0;

    if (projectIds.length > 0) {
      const { data: expenses, error: expenseError } = await supabase
        .from("expenses")
        .select("amount")
        .in("project_id", projectIds);

      if (expenseError) throw expenseError;

      totalSpent = expenses.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );
    }

    const budgetUsedPercentage =
      totalBudget > 0
        ? Math.round((totalSpent / totalBudget) * 100)
        : 0;

    // 3️⃣ Overdue tasks
    let overdueTasks = 0;

    if (projectIds.length > 0) {
      const today = new Date().toISOString().split("T")[0];

      const { data: tasks, error: taskError } = await supabase
        .from("tasks")
        .select("id")
        .in("project_id", projectIds)
        .lt("deadline", today)
        .neq("status", "completed");

      if (taskError) throw taskError;

      overdueTasks = tasks.length;
    }

    res.json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalBudget,
        totalSpent,
        budgetUsedPercentage,
        overdueTasks,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;