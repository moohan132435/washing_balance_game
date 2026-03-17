const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

function normalizeOrigin(value) {
  if (!value) return "";
  return String(value).trim().replace(/\/$/, "");
}

const allowedOrigins = [
  "http://localhost:5173",
  normalizeOrigin(process.env.FRONTEND_URL),
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

console.log("[BOOT] FRONTEND_URL:", process.env.FRONTEND_URL || "(missing)");
console.log("[BOOT] DATABASE_URL exists:", Boolean(process.env.DATABASE_URL));
console.log("[BOOT] NODE_ENV:", process.env.NODE_ENV || "(missing)");
console.log("[BOOT] allowedOrigins:", allowedOrigins);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;

async function initDb() {
  if (!pool) {
    console.warn("[DB] DATABASE_URL이 없습니다. DB 초기화를 건너뜁니다.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rankings (
      id SERIAL PRIMARY KEY,
      nickname VARCHAR(30) UNIQUE NOT NULL,
      score INT NOT NULL,
      grade VARCHAR(50) NOT NULL,
      clean_rate INT NOT NULL DEFAULT 0,
      irritation INT NOT NULL DEFAULT 0,
      moisture INT NOT NULL DEFAULT 0,
      balance_time NUMERIC(6,2) NOT NULL DEFAULT 0,
      scenario_summary TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("[DB] rankings 테이블 준비 완료");
}

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.get("/api/health", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        ok: true,
        message: "Server is healthy, but DB is not configured",
        hasDatabaseUrl: false,
        frontendUrl: normalizeOrigin(process.env.FRONTEND_URL),
      });
    }

    await pool.query("SELECT 1");
    return res.json({
      ok: true,
      message: "Server and DB are healthy",
      hasDatabaseUrl: true,
      frontendUrl: normalizeOrigin(process.env.FRONTEND_URL),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "DB health check failed",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      error: error.message,
    });
  }
});

app.post("/api/scores", async (req, res) => {
  const {
    nickname,
    score,
    grade,
    cleanRate,
    irritation,
    moisture,
    balanceTime,
    scenarioSummary,
  } = req.body;

  if (!nickname || score === undefined || !grade) {
    return res.status(400).json({
      ok: false,
      message: "nickname, score, grade는 필수입니다.",
    });
  }

  if (!pool) {
    return res.status(500).json({
      ok: false,
      message: "DATABASE_URL이 설정되지 않아 랭킹 저장이 불가능합니다.",
    });
  }

  try {
    const values = [
      String(nickname).trim().slice(0, 30),
      Number(score),
      String(grade),
      Number(cleanRate || 0),
      Number(irritation || 0),
      Number(moisture || 0),
      Number(balanceTime || 0),
      String(scenarioSummary || ""),
    ];

    const result = await pool.query(
      `
      INSERT INTO rankings (
        nickname,
        score,
        grade,
        clean_rate,
        irritation,
        moisture,
        balance_time,
        scenario_summary,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (nickname)
      DO UPDATE SET
        score = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.score
          ELSE rankings.score
        END,
        grade = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.grade
          ELSE rankings.grade
        END,
        clean_rate = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.clean_rate
          ELSE rankings.clean_rate
        END,
        irritation = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.irritation
          ELSE rankings.irritation
        END,
        moisture = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.moisture
          ELSE rankings.moisture
        END,
        balance_time = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.balance_time
          ELSE rankings.balance_time
        END,
        scenario_summary = CASE
          WHEN EXCLUDED.score > rankings.score THEN EXCLUDED.scenario_summary
          ELSE rankings.scenario_summary
        END,
        updated_at = CASE
          WHEN EXCLUDED.score > rankings.score THEN CURRENT_TIMESTAMP
          ELSE rankings.updated_at
        END
      RETURNING *;
      `,
      values,
    );

    return res.json({
      ok: true,
      message: "점수가 저장되었습니다.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[DB] 점수 저장 실패:", error);
    return res.status(500).json({
      ok: false,
      message: "점수 저장 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

app.get("/api/rankings", async (req, res) => {
  if (!pool) {
    return res.status(500).json({
      ok: false,
      message: "DATABASE_URL이 설정되지 않아 랭킹 조회가 불가능합니다.",
    });
  }

  try {
    const result = await pool.query(`
      SELECT
        nickname,
        score,
        grade,
        clean_rate AS "cleanRate",
        irritation,
        moisture,
        balance_time AS "balanceTime",
        scenario_summary AS "scenarioSummary",
        updated_at AS "updatedAt"
      FROM rankings
      ORDER BY score DESC, updated_at ASC
      ;
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("[DB] 랭킹 조회 실패:", error);
    return res.status(500).json({
      ok: false,
      message: "랭킹 조회 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB 초기화 실패:", error);
    process.exit(1);
  });
