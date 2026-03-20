const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rankings (
      id SERIAL PRIMARY KEY,
      nickname VARCHAR(30) NOT NULL UNIQUE,
      score INTEGER NOT NULL DEFAULT 0,
      grade VARCHAR(100),
      result_type VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE rankings ADD COLUMN IF NOT EXISTS grade VARCHAR(100)`);
  await pool.query(`ALTER TABLE rankings ADD COLUMN IF NOT EXISTS result_type VARCHAR(100)`);
  await pool.query(`ALTER TABLE rankings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);
}

function sanitizeNickname(rawNickname) {
  return String(rawNickname || "PLAYER").trim().slice(0, 30);
}

function sanitizeGrade(rawGrade, rawResultType) {
  return String(rawGrade || rawResultType || "결과 없음").trim().slice(0, 100);
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "database unavailable" });
  }
});

app.post("/api/scores", async (req, res) => {
  try {
    const nickname = sanitizeNickname(req.body.nickname);
    const score = Number(req.body.score);
    const grade = sanitizeGrade(req.body.grade, req.body.resultType);

    if (!nickname || Number.isNaN(score)) {
      return res.status(400).json({ success: false, message: "닉네임 또는 점수가 올바르지 않아요." });
    }

    const existing = await pool.query(
      `SELECT nickname, score, grade, result_type, created_at, updated_at
       FROM rankings
       WHERE nickname = $1`,
      [nickname],
    );

    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO rankings (nickname, score, grade, result_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING nickname, score, grade, result_type AS "resultType", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [nickname, score, grade, grade],
      );

      return res.json({
        success: true,
        updated: true,
        message: "첫 기록이 저장됐어요.",
        row: inserted.rows[0],
      });
    }

    const previous = existing.rows[0];

    if (score > Number(previous.score || 0)) {
      const updated = await pool.query(
        `UPDATE rankings
         SET score = $1,
             grade = $2,
             result_type = $2,
             updated_at = NOW()
         WHERE nickname = $3
         RETURNING nickname, score, grade, result_type AS "resultType", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [score, grade, nickname],
      );

      return res.json({
        success: true,
        updated: true,
        message: "최고 점수로 랭킹을 갱신했어요.",
        previousScore: Number(previous.score || 0),
        row: updated.rows[0],
      });
    }

    return res.json({
      success: true,
      updated: false,
      message: "기존 최고 점수가 유지됐어요.",
      previousScore: Number(previous.score || 0),
      row: {
        nickname: previous.nickname,
        score: Number(previous.score || 0),
        grade: previous.grade,
        resultType: previous.result_type,
        createdAt: previous.created_at,
        updatedAt: previous.updated_at,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "랭킹 저장 중 오류가 발생했어요." });
  }
});

app.get("/api/rankings", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));

    const result = await pool.query(
      `SELECT nickname,
              score,
              grade,
              result_type AS "resultType",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM rankings
       ORDER BY score DESC, updated_at ASC, created_at ASC
       LIMIT $1`,
      [limit],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "랭킹 조회 중 오류가 발생했어요." });
  }
});

const PORT = process.env.PORT || 5000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database schema", error);
    process.exit(1);
  });
