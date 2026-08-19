require("dotenv").config();

const { Resend } = require("resend");
const crypto = require("crypto");
const { upload, uploadWithAudio } = require("./cloudinary");
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role",
      [name, email, hashedPassword]
    );

    res.json({ message: "Account created!", user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Email already in use" });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Login successful!",
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.post("/reports", requireAuth, uploadWithAudio.fields([
  { name: "photo", maxCount: 1 },
  { name: "audio", maxCount: 1 },
  { name: "video", maxCount: 1 },
]), async (req, res) => {
  try {
    const { category, description, location, latitude, longitude } = req.body;
    const userId = req.user.userId;

    const photoUrl = req.files?.photo?.[0]?.path || null;
    const audioUrl = req.files?.audio?.[0]?.path || null;
    const videoUrl = req.files?.video?.[0]?.path || null;

    const result = await pool.query(
      `INSERT INTO reports (user_id, category, description, location, latitude, longitude, photo_url, audio_url, video_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, category, description, location, latitude || null, longitude || null, photoUrl, audioUrl, videoUrl]
    );

    res.json({ message: "Report submitted!", report: result.rows[0] });
  } catch (err) {
    console.error("Report submission error:", err);
    res.status(500).json({ message: "Failed to submit report. Please try again." });
  }
});

// Guest reporting: allows anyone to submit a report WITHOUT an account.
// No requireAuth here 
app.post("/reports/guest", uploadWithAudio.fields([
  { name: "photo", maxCount: 1 },
  { name: "audio", maxCount: 1 },
  { name: "video", maxCount: 1 },
]), async (req, res) => {
  try {
    const { category, description, location, latitude, longitude } = req.body;

    const photoUrl = req.files?.photo?.[0]?.path || null;
    const audioUrl = req.files?.audio?.[0]?.path || null;
    const videoUrl = req.files?.video?.[0]?.path || null;

    const result = await pool.query(
      `INSERT INTO reports (user_id, category, description, location, latitude, longitude, photo_url, audio_url, video_url)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [category, description, location, latitude || null, longitude || null, photoUrl, audioUrl, videoUrl]
    );

    res.json({ message: "Report submitted!", report: result.rows[0] });
  } catch (err) {
    console.error("Guest report submission error:", err);
    res.status(500).json({ message: "Failed to submit report. Please try again." });
  }
});

app.get("/reports", requireAuth, requireAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT reports.*, users.name AS reporter_name
     FROM reports
     JOIN users ON reports.user_id = users.id
     ORDER BY reports.created_at DESC`
  );

  res.json(result.rows);
});

app.get("/my-reports", requireAuth, async (req, res) => {
  const userId = req.user.userId;

  const result = await pool.query(
    "SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  res.json(result.rows);
});


// page map (category, status, coordinates) — deliberately NOT reporter
app.get("/public-reports", async (req, res) => {
  const result = await pool.query(
    "SELECT category, status, latitude, longitude FROM reports WHERE latitude IS NOT NULL"
  );

  res.json(result.rows);
});


app.patch("/reports/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "in_progress", "resolved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const result = await pool.query(
    "UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Report not found" });
  }

  res.json({ message: "Status updated!", report: result.rows[0] });
});




// Citizen or admin requests a password reset by submitting their email.
// We generate a random token, store it with a 1-hour expiry, and email
// them a link containing that token.
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  // Important: respond the same way whether or not the email exists.
  // This prevents someone from using this endpoint to check which
  // emails are registered in the system (same principle as login's
  // vague "Invalid email or password" message).
  if (!user) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  // Generate a random 32-byte token, converted to a readable hex string
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await pool.query(
    "UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3",
    [token, expiry, user.id]
  );

  const resetLink = `${req.protocol}://${req.get("host")}/reset-password.html?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Reset your Smart Waste Reporting password",
    html: `
      <p>Hello ${user.name},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  res.json({ message: "If that email exists, a reset link has been sent." });
});

// User submits their reset token (from the emailed link) along with a
// new password. We verify the token is real and hasn't expired, then
// update the password and clear the token so it can't be reused.
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE reset_token = $1",
    [token]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset link" });
  }

  // Check the token hasn't expired
  if (new Date() > new Date(user.reset_token_expiry)) {
    return res.status(400).json({ message: "This reset link has expired" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the password AND clear the token, so this exact link
  // can't be used a second time
  await pool.query(
    "UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2",
    [hashedPassword, user.id]
  );

  res.json({ message: "Password reset successfully! You can now log in." });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});