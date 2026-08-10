const upload = require("./cloudinary");
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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

app.post("/reports", requireAuth, upload.single("photo"), async (req, res) => {
  const { category, description, location, latitude, longitude } = req.body;
  const userId = req.user.userId;

  const photoUrl = req.file ? req.file.path : null;

  const result = await pool.query(
    `INSERT INTO reports (user_id, category, description, location, latitude, longitude, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, category, description, location, latitude || null, longitude || null, photoUrl]
  );

  res.json({ message: "Report submitted!", report: result.rows[0] });
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

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});