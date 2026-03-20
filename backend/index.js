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

  await pool.query(
    `ALTER TABLE rankings ADD COLUMN IF NOT EXISTS grade VARCHAR(100)`,
  );
  await pool.query(
    `ALTER TABLE rankings ADD COLUMN IF NOT EXISTS result_type VARCHAR(100)`,
  );
  await pool.query(
    `ALTER TABLE rankings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
  );

  // 모니터링 이벤트 저장용 테이블
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracking_events (
      id SERIAL PRIMARY KEY,
      event_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      event_date VARCHAR(8) NOT NULL,
      nickname VARCHAR(30),
      score INTEGER,
      event_type VARCHAR(50) NOT NULL,
      event_source VARCHAR(100),
      page VARCHAR(50),
      meta JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMP NOT NULL DEFAULT NOW()`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS event_date VARCHAR(8)`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS nickname VARCHAR(30)`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS score INTEGER`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50)`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS event_source VARCHAR(100)`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS page VARCHAR(50)`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS meta JSONB`,
  );
  await pool.query(
    `ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()`,
  );
}

function sanitizeNickname(rawNickname) {
  return String(rawNickname || "PLAYER")
    .trim()
    .slice(0, 30);
}

function sanitizeGrade(rawGrade, rawResultType) {
  return String(rawGrade || rawResultType || "결과 없음")
    .trim()
    .slice(0, 100);
}

function sanitizeEventDate(rawDate) {
  const cleaned = String(rawDate || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 8);

  if (cleaned.length === 8) return cleaned;

  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function sanitizeEventTimestamp(rawTimestamp) {
  if (!rawTimestamp) return new Date();

  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
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
      return res
        .status(400)
        .json({
          success: false,
          message: "닉네임 또는 점수가 올바르지 않아요.",
        });
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
    res
      .status(500)
      .json({ success: false, message: "랭킹 저장 중 오류가 발생했어요." });
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
    res
      .status(500)
      .json({ success: false, message: "랭킹 조회 중 오류가 발생했어요." });
  }
});

// =====================
// 모니터링 이벤트 저장
// =====================
app.post("/api/events", async (req, res) => {
  try {
    const {
      eventType,
      eventTimestamp,
      eventDate,
      nickname,
      score,
      eventSource,
      page,
      meta,
    } = req.body || {};

    if (!eventType) {
      return res
        .status(400)
        .json({ success: false, message: "eventType is required" });
    }

    const safeNickname = nickname ? sanitizeNickname(nickname) : null;
    const numericScore =
      score === null || score === undefined || score === ""
        ? null
        : Number(score);

    const safeScore = Number.isNaN(numericScore) ? null : numericScore;
    const safeEventDate = sanitizeEventDate(eventDate);
    const safeEventTimestamp = sanitizeEventTimestamp(eventTimestamp);
    const safeEventType = String(eventType).trim().slice(0, 50);
    const safeEventSource =
      String(eventSource || "")
        .trim()
        .slice(0, 100) || null;
    const safePage =
      String(page || "")
        .trim()
        .slice(0, 50) || null;
    const safeMeta = meta ?? null;

    await pool.query(
      `INSERT INTO tracking_events
        (event_timestamp, event_date, nickname, score, event_type, event_source, page, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
      [
        safeEventTimestamp,
        safeEventDate,
        safeNickname,
        safeScore,
        safeEventType,
        safeEventSource,
        safePage,
        safeMeta ? JSON.stringify(safeMeta) : null,
      ],
    );

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "이벤트 저장 중 오류가 발생했어요." });
  }
});

// =====================
// 일별 이벤트 요약
// =====================
app.get("/api/events/summary", async (req, res) => {
  try {
    const date = sanitizeEventDate(req.query.date);

    const result = await pool.query(
      `SELECT
          event_type AS "eventType",
          COUNT(*)::int AS count
       FROM tracking_events
       WHERE event_date = $1
       GROUP BY event_type
       ORDER BY event_type ASC`,
      [date],
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        success: false,
        message: "이벤트 요약 조회 중 오류가 발생했어요.",
      });
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
