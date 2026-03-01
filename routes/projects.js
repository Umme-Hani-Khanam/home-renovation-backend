import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

function safeNumber(value) {
  return Number(value || 0);
}

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

router.get("/:id/progress-estimation", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, deadline, status, created_at")
      .eq("project_id", id);

    if (error) throw error;

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const total = safeTasks.length;
    const completed = safeTasks.filter((task) => task.status === "completed").length;

    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const taskCompletionRatio = `${completed}/${total}`;

    const pendingDeadlines = safeTasks
      .filter((task) => task.status !== "completed" && task.deadline)
      .map((task) => new Date(task.deadline).getTime())
      .filter((value) => !Number.isNaN(value));

    const now = Date.now();
    let estimatedCompletionDate = null;

    if (pendingDeadlines.length > 0) {
      estimatedCompletionDate = new Date(Math.max(...pendingDeadlines)).toISOString();
    } else if (total > 0 && completed === total) {
      estimatedCompletionDate = new Date(now).toISOString();
    } else if (total > 0 && completed > 0) {
      const elapsedDays = Math.max(1, Math.round((now - new Date(safeTasks[0].created_at || now).getTime()) / 86400000));
      const pace = completed / elapsedDays;
      const remainingTasks = total - completed;
      const remainingDays = pace > 0 ? Math.ceil(remainingTasks / pace) : 0;
      estimatedCompletionDate = new Date(now + remainingDays * 86400000).toISOString();
    }

    res.json({
      success: true,
      data: {
        totalTasks: total,
        completedTasks: completed,
        estimatedCompletion: completionPercentage,
        completionPercentage,
        taskCompletionRatio,
        estimatedCompletionDate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id/report", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("project_id", id);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id);

    res.json({
      success: true,
      data: {
        project,
        expenses: Array.isArray(expenses) ? expenses : [],
        tasks: Array.isArray(tasks) ? tasks : [],
      },
    });
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

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, total_budget")
      .eq("id", id)
      .single();

    if (projectError) throw projectError;

    const totalBudget = safeNumber(project?.total_budget);

    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("amount, category")
      .eq("project_id", id);

    if (expenseError) throw expenseError;

    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const totalSpent = safeExpenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const remainingBudget = totalBudget - totalSpent;
    const budgetUsedPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("status, deadline")
      .eq("project_id", id);

    if (taskError) throw taskError;

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const totalTasks = safeTasks.length;
    const completedTasks = safeTasks.filter((task) => task.status === "completed").length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const today = new Date().toISOString().split("T")[0];
    const overdueTasks = safeTasks.filter(
      (task) => task.deadline && task.deadline < today && task.status !== "completed"
    ).length;

    let healthStatus = "healthy";
    if (budgetUsedPercentage > 90) healthStatus = "budget_risk";
    if (overdueTasks > 0) healthStatus = "delayed";

    const taskStatusDistribution = ["pending", "in_progress", "completed"].map((status) => ({
      status,
      count: safeTasks.filter((task) => (task.status || "pending") === status).length,
    }));

    const groupedExpenses = safeExpenses.reduce((acc, expense) => {
      const key = expense.category || "uncategorized";
      acc[key] = (acc[key] || 0) + safeNumber(expense.amount);
      return acc;
    }, {});

    const expenseBreakdown = Object.entries(groupedExpenses).map(([category, amount]) => ({
      category,
      amount,
    }));

    const budgetSeries = [
      { label: "Budget", value: totalBudget },
      { label: "Spent", value: totalSpent },
      { label: "Remaining", value: Math.max(remainingBudget, 0) },
    ];

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
        budgetSeries,
        taskStatusDistribution,
        expenseBreakdown,
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
