const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔹 점수 저장 API
app.post("/api/scores", async (req, res) => {
  try {
    const { nickname, score } = req.body;

    if (!nickname || score == null) {
      return res.status(400).json({ error: "invalid input" });
    }

    // 기존 점수 조회
    const existing = await pool.query(
      "SELECT * FROM rankings WHERE nickname = $1",
      [nickname],
    );

    let updated = false;
    let previousScore = null;
    let storedScore = score;

    if (existing.rows.length === 0) {
      // 신규 유저
      await pool.query(
        `INSERT INTO rankings (nickname, score, created_at)
         VALUES ($1, $2, NOW())`,
        [nickname, score],
      );
      updated = true;
    } else {
      previousScore = existing.rows[0].score;

      if (score > previousScore) {
        // 최고점 갱신
        await pool.query(
          `UPDATE rankings
           SET score = $1, updated_at = NOW()
           WHERE nickname = $2`,
          [score, nickname],
        );
        updated = true;
        storedScore = score;
      } else {
        // 갱신 안됨
        storedScore = previousScore;
      }
    }

    return res.json({
      success: true,
      updated,
      previousScore,
      storedScore,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// 🔹 랭킹 조회 API
app.get("/api/rankings", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const result = await pool.query(
      `SELECT nickname, score
       FROM rankings
       ORDER BY score DESC
       LIMIT $1`,
      [limit],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
