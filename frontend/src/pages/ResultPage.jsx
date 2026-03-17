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
  currentAttemptAt: new Date().toISOString(),
};

function compareRank(a, b) {
  const scoreGap = Number(b.score || 0) - Number(a.score || 0);
  if (scoreGap !== 0) return scoreGap;
  return new Date(a.updatedAt || a.currentAttemptAt || 0).getTime() - new Date(b.updatedAt || b.currentAttemptAt || 0).getTime();
}

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state || FALLBACK_RESULT;

  const [saved, setSaved] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [saveStatus, setSaveStatus] = useState(API_BASE_URL ? "idle" : "disabled");

  const payload = useMemo(
    () => ({
      nickname: result.nickname,
      score: result.score,
      grade: result.grade,
      cleanRate: 0,
      irritation: 0,
      moisture: 0,
      balanceTime: 10,
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
        const response = await axios.get(`${API_BASE_URL}/api/rankings?limit=200`);
        setRankings(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("랭킹 조회 실패", error);
      }
    };

    fetchRankings();
  }, [API_BASE_URL, saveStatus]);

  const topFive = rankings.slice(0, 5);
  const currentAttemptRank = useMemo(() => {
    const virtualEntry = {
      nickname: result.nickname,
      score: Number(result.score || 0),
      grade: result.grade,
      currentAttemptAt: result.currentAttemptAt || new Date().toISOString(),
    };

    const ranked = [...rankings, virtualEntry].sort(compareRank);
    return ranked.findIndex((item) => item.currentAttemptAt === virtualEntry.currentAttemptAt) + 1;
  }, [rankings, result]);

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

        <div style={styles.compactGrid}>
          <div style={styles.rankCard}>
            <div style={styles.rankCardLabel}>TOP 5 랭킹</div>
            <div style={styles.rankList}>
              {topFive.length === 0 ? (
                <div style={styles.emptyText}>아직 저장된 랭킹이 없어요.</div>
              ) : (
                topFive.map((item, index) => (
                  <div key={`${item.nickname}-${index}`} style={styles.rankRow}>
                    <div style={styles.rankNumber}>{index + 1}</div>
                    <div style={styles.rankNicknameWrap}>
                      <div style={styles.rankNickname}>{item.nickname}</div>
                      <div style={styles.rankGrade}>{item.grade}</div>
                    </div>
                    <div style={styles.rankScore}>{item.score}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.myRankCard}>
            <div style={styles.rankCardLabel}>내 랭킹</div>
            <div style={styles.myRankValue}>{currentAttemptRank > 0 ? `${currentAttemptRank}등` : "집계 전"}</div>
            <div style={styles.myRankText}>{result.nickname}</div>
            <div style={styles.subInfo}>{result.scenarioSummary || "이번 플레이 기록"}</div>
          </div>
        </div>

        <div style={styles.footerInfo}>
          {saveStatus === "success"
            ? "최고 점수 기준으로 랭킹이 저장됐어요."
            : saveStatus === "error"
            ? "랭킹 저장은 실패했지만 결과는 확인할 수 있어요."
            : saveStatus === "disabled"
            ? "API 연결 전이라 로컬 결과만 표시 중이에요."
            : "랭킹 저장 중이에요."}
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={() => window.open(WADIZ_URL, "_blank", "noopener,noreferrer")}>{result.ctaText || "와디즈 보러가기"}</button>
          <div style={styles.secondaryGrid}>
            <button style={styles.secondaryButton} onClick={() => navigate("/ranking")}>전체 랭킹 보기</button>
            <button
              style={styles.secondaryButton}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                navigate("/game");
              }}
            >
              다시하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    background: "linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%)",
    padding: "10px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    margin: "0 auto",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    padding: "16px",
    boxShadow: "0 20px 48px rgba(15,23,42,0.1)",
    border: "1px solid rgba(219,228,240,0.9)",
    display: "grid",
    gap: "12px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.16em",
    color: "#3b63e6",
    marginBottom: "6px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1,
    color: "#0f172a",
    fontWeight: 900,
  },
  scoreBox: {
    minWidth: "118px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fef08a",
    padding: "12px 14px",
    textAlign: "center",
  },
  scoreLabel: {
    fontSize: "11px",
    fontWeight: 900,
    color: "#93c5fd",
    letterSpacing: "0.18em",
  },
  scoreValue: {
    fontSize: "46px",
    lineHeight: 1,
    fontWeight: 900,
    marginTop: "4px",
  },
  typeBox: {
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    border: "1px solid #dbeafe",
    borderRadius: "24px",
    padding: "16px",
  },
  typeLabel: {
    color: "#3b63e6",
    fontSize: "13px",
    fontWeight: 900,
    marginBottom: "8px",
    letterSpacing: "0.08em",
  },
  typeValue: {
    color: "#0f172a",
    fontSize: "26px",
    lineHeight: 1.15,
    fontWeight: 900,
    marginBottom: "8px",
    wordBreak: "keep-all",
  },
  typeDescription: {
    color: "#475569",
    fontSize: "15px",
  },
  compactGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.9fr",
    gap: "12px",
  },
  rankCard: {
    borderRadius: "24px",
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    padding: "14px",
  },
  myRankCard: {
    borderRadius: "24px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#ffffff",
    padding: "14px",
    display: "grid",
    alignContent: "start",
  },
  rankCardLabel: {
    fontSize: "14px",
    fontWeight: 900,
    color: "inherit",
    marginBottom: "10px",
  },
  rankList: {
    display: "grid",
    gap: "8px",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "14px",
  },
  rankRow: {
    display: "grid",
    gridTemplateColumns: "34px 1fr auto",
    gap: "10px",
    alignItems: "center",
  },
  rankNumber: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#0f172a",
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },
  rankNicknameWrap: {
    minWidth: 0,
  },
  rankNickname: {
    color: "#0f172a",
    fontWeight: 800,
    fontSize: "18px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rankGrade: {
    color: "#64748b",
    fontSize: "13px",
    marginTop: "2px",
  },
  rankScore: {
    color: "#3b63e6",
    fontWeight: 900,
    fontSize: "20px",
  },
  myRankValue: {
    color: "#f7d548",
    fontSize: "56px",
    lineHeight: 1,
    fontWeight: 900,
    margin: "8px 0 10px",
  },
  myRankText: {
    fontWeight: 800,
    fontSize: "19px",
    marginBottom: "8px",
  },
  subInfo: {
    color: "#cbd5e1",
    fontSize: "14px",
    lineHeight: 1.45,
    wordBreak: "keep-all",
  },
  footerInfo: {
    color: "#64748b",
    fontSize: "13px",
    textAlign: "center",
  },
  buttonGroup: {
    display: "grid",
    gap: "10px",
  },
  primaryButton: {
    width: "100%",
    padding: "16px 18px",
    border: "none",
    borderRadius: "20px",
    background: "linear-gradient(90deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: 900,
  },
  secondaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  secondaryButton: {
    width: "100%",
    padding: "14px 12px",
    borderRadius: "18px",
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 800,
  },
};

export default ResultPage;
