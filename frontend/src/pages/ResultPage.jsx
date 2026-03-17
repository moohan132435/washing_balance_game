import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const WADIZ_URL = import.meta.env.VITE_WADIZ_URL || "https://www.wadiz.kr";

const FALLBACK_RESULT = {
  nickname: localStorage.getItem("nickname") || "PLAYER",
  score: 0,
  grade: "결과 없음",
  resultType: "결과 없음",
  resultMessage: "결과 데이터가 없습니다.",
  scenarioSummary: "",
};

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state || FALLBACK_RESULT;

  const [saved, setSaved] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle");

  const payload = useMemo(
    () => ({
      nickname: result.nickname,
      score: result.score,
      grade: result.resultType || result.grade,
      cleanRate: 0,
      irritation: 0,
      moisture: 0,
      balanceTime: Number(result.balanceTime || 0),
      scenarioSummary: result.scenarioSummary || "",
    }),
    [result]
  );

  useEffect(() => {
    const saveScore = async () => {
      if (!API_BASE_URL || saved) return;
      try {
        setSaveStatus("saving");
        await axios.post(`${API_BASE_URL}/api/scores`, payload);
        setSaved(true);
        setSaveStatus("success");
      } catch (error) {
        console.error("랭킹 저장 실패", error);
        setSaveStatus("error");
      }
    };
    saveScore();
  }, [API_BASE_URL, payload, saved]);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!API_BASE_URL) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/rankings`);
        setRankings(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("랭킹 조회 실패", error);
      }
    };
    fetchRankings();
  }, [API_BASE_URL, saveStatus]);

  const topFive = rankings.slice(0, 5);
  const userRank = rankings.findIndex((item) => item.nickname === result.nickname) + 1;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>RESULT</div>
            <h1 style={styles.title}>게임 결과</h1>
          </div>
          <div style={styles.scoreBox}>
            <div style={styles.scoreLabel}>SCORE</div>
            <div style={styles.scoreValue}>{result.score}</div>
          </div>
        </div>

        <div style={styles.typeBox}>
          <div style={styles.typeLabel}>결과 유형</div>
          <div style={styles.typeValue}>{result.resultType || result.grade}</div>
          <div style={styles.typeDescription}>{result.resultMessage}</div>
        </div>

        <div style={styles.rankGrid}>
          <div style={styles.rankCard}>
            <div style={styles.rankCardLabel}>TOP 5 랭킹</div>
            <div style={styles.rankList}>
              {topFive.length === 0 ? (
                <div style={styles.emptyText}>아직 랭킹이 없어요.</div>
              ) : (
                topFive.map((item, index) => (
                  <div key={`${item.nickname}-${index}`} style={styles.rankItem}>
                    <div style={styles.rankLeft}>
                      <div style={styles.rankBadge}>{index + 1}</div>
                      <div>
                        <div style={styles.rankName}>{item.nickname}</div>
                        <div style={styles.rankType}>{item.grade}</div>
                      </div>
                    </div>
                    <div style={styles.rankScore}>{item.score}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.rankCard}>
            <div style={styles.rankCardLabel}>내 랭킹</div>
            <div style={styles.myRankBox}>
              <div style={styles.myRankNumber}>{userRank > 0 ? `${userRank}등` : "-"}</div>
              <div style={styles.myRankText}>{result.nickname}</div>
              <div style={styles.myRankCaption}>{result.scenarioSummary || "이번 결과가 랭킹에 저장돼요."}</div>
            </div>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={() => navigate("/game")}>다시하기</button>
          <button style={styles.secondaryButton} onClick={() => navigate("/ranking")}>전체 랭킹</button>
          <button style={styles.secondaryButton} onClick={() => window.open(WADIZ_URL, "_blank")}>와디즈 보러가기</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    padding: "20px 16px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at top, #dbeafe 0%, #eff6ff 36%, #f8fafc 100%)",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "30px",
    padding: "22px 18px 18px",
    boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
    border: "1px solid rgba(255,255,255,0.9)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "16px",
  },
  eyebrow: {
    fontSize: "12px",
    color: "#2563eb",
    fontWeight: 900,
    letterSpacing: "0.12em",
  },
  title: {
    margin: "6px 0 0",
    fontSize: "34px",
    lineHeight: 1.05,
    color: "#0f172a",
    letterSpacing: "-0.04em",
  },
  scoreBox: {
    minWidth: "98px",
    borderRadius: "22px",
    background: "#0f172a",
    color: "#fff",
    padding: "12px 14px",
    textAlign: "center",
  },
  scoreLabel: {
    fontSize: "11px",
    letterSpacing: "0.14em",
    color: "#93c5fd",
    fontWeight: 900,
  },
  scoreValue: {
    marginTop: "4px",
    fontSize: "34px",
    lineHeight: 1,
    fontWeight: 900,
    color: "#facc15",
  },
  typeBox: {
    borderRadius: "24px",
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    border: "1px solid #dbeafe",
    padding: "18px 16px",
    marginBottom: "14px",
  },
  typeLabel: {
    fontSize: "12px",
    color: "#2563eb",
    fontWeight: 900,
    letterSpacing: "0.12em",
    marginBottom: "8px",
  },
  typeValue: {
    fontSize: "28px",
    lineHeight: 1.08,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: "8px",
  },
  typeDescription: {
    fontSize: "15px",
    lineHeight: 1.55,
    color: "#475569",
    wordBreak: "keep-all",
  },
  rankGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
    marginBottom: "16px",
  },
  rankCard: {
    borderRadius: "24px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "16px 14px",
  },
  rankCardLabel: {
    fontSize: "14px",
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: "12px",
  },
  rankList: { display: "flex", flexDirection: "column", gap: "10px" },
  rankItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
  rankLeft: { display: "flex", alignItems: "center", gap: "10px" },
  rankBadge: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankName: { fontSize: "15px", fontWeight: 800, color: "#0f172a" },
  rankType: { fontSize: "12px", color: "#64748b", marginTop: "2px" },
  rankScore: { fontSize: "22px", fontWeight: 900, color: "#2563eb" },
  myRankBox: {
    borderRadius: "20px",
    background: "#0f172a",
    color: "#fff",
    padding: "18px 14px",
    textAlign: "center",
  },
  myRankNumber: { fontSize: "36px", fontWeight: 900, color: "#facc15", lineHeight: 1 },
  myRankText: { fontSize: "16px", fontWeight: 800, marginTop: "8px" },
  myRankCaption: { fontSize: "13px", color: "#cbd5e1", marginTop: "6px", lineHeight: 1.5 },
  emptyText: { color: "#64748b", fontSize: "14px" },
  buttonGroup: { display: "grid", gridTemplateColumns: "1fr", gap: "10px" },
  primaryButton: {
    border: "none",
    borderRadius: "20px",
    background: "linear-gradient(90deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#fff",
    fontSize: "17px",
    fontWeight: 900,
    padding: "16px 18px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1.5px solid #cbd5e1",
    borderRadius: "20px",
    background: "#fff",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: 800,
    padding: "15px 18px",
    cursor: "pointer",
  },
};

export default ResultPage;
