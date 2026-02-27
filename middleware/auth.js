import supabase from "../config/supabase.js";

export const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ success: false });
  }

  req.user = data.user;
  next();
};

export const authorizeProjectMember = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;

  const { data } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", req.user.id);

  if (!data || data.length === 0) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  next();
};