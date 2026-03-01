import express from "express";
import supabase from "../config/supabase.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

function normalizeCycle(value) {
  const allowed = ["monthly", "yearly"];
  if (!value) return null;
  return allowed.includes(value) ? value : null;
}

function normalizeRecurring(value) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return false;
}

async function isAssignableMember(projectId, userId) {
  if (!projectId || !userId) return false;

  const { data, error } = await supabase
    .from("project_members")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  if (data.status && data.status !== "accepted") {
    return false;
  }

  return true;
}

async function withAssignedMember(projectId, tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  if (safeTasks.length === 0) return [];

  const assignedIds = [...new Set(safeTasks.map((task) => task.assigned_to).filter(Boolean))];
  if (assignedIds.length === 0) {
    return safeTasks.map((task) => ({ ...task, assigned_member: null }));
  }

  const { data: members, error: membersError } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, invite_email, role, status, invited_at, accepted_at")
    .eq("project_id", projectId)
    .in("user_id", assignedIds);

  if (membersError) throw membersError;

  const memberMap = new Map((members || []).map((member) => [member.user_id, member]));
  const profileIds = [...new Set((members || []).map((member) => member.user_id).filter(Boolean))];

  let profileMap = new Map();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", profileIds);

    if (profilesError && profilesError.code !== "PGRST205") {
      throw profilesError;
    }

    profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  }

  return safeTasks.map((task) => {
    const member = task.assigned_to ? memberMap.get(task.assigned_to) || null : null;
    const profile = task.assigned_to ? profileMap.get(task.assigned_to) || null : null;

    return {
      ...task,
      assigned_member: member
        ? {
            ...member,
            profile,
          }
        : null,
    };
  });
}

router.get("/reminders/upcoming", async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .not("reminder_at", "is", null)
      .gte("reminder_at", now)
      .eq("reminder_sent", false)
      .order("reminder_at", { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      deadline,
      project_id,
      reminder_at,
      assigned_to,
      recurring,
      recurring_cycle,
    } = req.body;

    if (!title || !project_id) {
      return res.status(400).json({
        success: false,
        message: "Task title and project required",
      });
    }

    if (assigned_to) {
      const validMember = await isAssignableMember(project_id, assigned_to);
      if (!validMember) {
        return res.status(400).json({
          success: false,
          message: "assigned_to must reference an accepted project_members.user_id for this project",
        });
      }
    }

    const insertPayload = {
      title,
      description,
      priority,
      deadline,
      project_id,
      reminder_at,
      reminder_sent: false,
      assigned_to: assigned_to || null,
      recurring: normalizeRecurring(recurring),
      recurring_cycle: normalizeCycle(recurring_cycle),
    };

    if (!insertPayload.recurring) {
      insertPayload.recurring_cycle = null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([insertPayload])
      .select();

    if (error) throw error;

    const enriched = await withAssignedMember(project_id, data);

    res.status(201).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { assigned_to } = req.query;

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (assigned_to) {
      query = query.eq("assigned_to", assigned_to);
    }

    const { data, error } = await query;

    if (error) throw error;

    const enriched = await withAssignedMember(projectId, data);

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      title,
      description,
      priority,
      deadline,
      reminder_at,
      assigned_to,
      recurring,
      recurring_cycle,
      reminder_sent,
    } = req.body;

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", id)
      .maybeSingle();

    if (existingTaskError) throw existingTaskError;

    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const updatePayload = {};

    if (status !== undefined) updatePayload.status = status;
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (priority !== undefined) updatePayload.priority = priority;
    if (deadline !== undefined) updatePayload.deadline = deadline;
    if (reminder_at !== undefined) updatePayload.reminder_at = reminder_at;
    if (reminder_sent !== undefined) updatePayload.reminder_sent = reminder_sent;

    if (assigned_to !== undefined) {
      if (assigned_to) {
        const validMember = await isAssignableMember(existingTask.project_id, assigned_to);
        if (!validMember) {
          return res.status(400).json({
            success: false,
            message: "assigned_to must reference an accepted project_members.user_id for this project",
          });
        }
        updatePayload.assigned_to = assigned_to;
      } else {
        updatePayload.assigned_to = null;
      }
    }

    if (recurring !== undefined) {
      const recurringValue = normalizeRecurring(recurring);
      updatePayload.recurring = recurringValue;

      if (!recurringValue) {
        updatePayload.recurring_cycle = null;
      }
    }

    if (recurring_cycle !== undefined && updatePayload.recurring !== false) {
      updatePayload.recurring_cycle = normalizeCycle(recurring_cycle);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided for update" });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .select();

    if (error) throw error;

    const enriched = await withAssignedMember(existingTask.project_id, data);

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/:id/reminder-sent", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("tasks")
      .update({ reminder_sent: true })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;

