const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  // cors({
  //   origin: ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean),
  // }),
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  }),
);

app.options("*", cors());

app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL이 없습니다. DB 저장이 동작하지 않습니다.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  if (!process.env.DATABASE_URL) return;

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
}

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.get("/api/health", async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.json({
        ok: true,
        message: "Server is healthy, but DB is not configured",
      });
    }

    await pool.query("SELECT 1");
    return res.json({
      ok: true,
      message: "Server and DB are healthy",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "DB health check failed",
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

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      ok: false,
      message: "DATABASE_URL이 설정되지 않아 랭킹 저장이 불가능합니다.",
    });
  }

  try {
    const query = `
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
    `;

    const values = [
      String(nickname).trim(),
      Number(score),
      String(grade),
      Number(cleanRate || 0),
      Number(irritation || 0),
      Number(moisture || 0),
      Number(balanceTime || 0),
      String(scenarioSummary || ""),
    ];

    const result = await pool.query(query, values);

    return res.json({
      ok: true,
      message: "점수가 저장되었습니다.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("점수 저장 실패:", error);
    return res.status(500).json({
      ok: false,
      message: "점수 저장 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

app.get("/api/rankings", async (req, res) => {
  if (!process.env.DATABASE_URL) {
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
      LIMIT 10;
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("랭킹 조회 실패:", error);
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
