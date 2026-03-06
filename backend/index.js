const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let rankings = [];

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Server is healthy" });
});

app.post("/api/scores", (req, res) => {
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

  const newRecord = {
    nickname: String(nickname).trim(),
    score: Number(score),
    grade: String(grade),
    cleanRate: Number(cleanRate || 0),
    irritation: Number(irritation || 0),
    moisture: Number(moisture || 0),
    balanceTime: Number(balanceTime || 0),
    scenarioSummary: String(scenarioSummary || ""),
    createdAt: new Date().toISOString(),
  };

  const existingIndex = rankings.findIndex(
    (item) => item.nickname.toLowerCase() === newRecord.nickname.toLowerCase(),
  );

  if (existingIndex >= 0) {
    if (newRecord.score > rankings[existingIndex].score) {
      rankings[existingIndex] = newRecord;
    }
  } else {
    rankings.push(newRecord);
  }

  rankings = rankings.sort((a, b) => b.score - a.score).slice(0, 100);

  return res.json({
    ok: true,
    message: "점수가 저장되었습니다.",
    data: newRecord,
  });
});

app.get("/api/rankings", (req, res) => {
  const top10 = [...rankings].sort((a, b) => b.score - a.score).slice(0, 10);
  return res.json(top10);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
