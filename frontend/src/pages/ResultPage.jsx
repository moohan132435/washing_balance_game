import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const WADIZ_URL = import.meta.env.VITE_WADIZ_URL || "https://www.wadiz.kr";

const FALLBACK_RESULT = {
  nickname: localStorage.getItem("nickname") || "PLAYER",
  score: 0,
  grade: "결과 없음",
  resultType: "결과 없음",
  resultMessage: "결과 데이터가 없습니다.",
  scenarioSummary: "",
  ctaText: "와디즈 보러가기",
  currentAttemptAt: new Date().toISOString(),
};

function apiUrl(path) {
  return RAW_API_BASE_URL ? `${RAW_API_BASE_URL}${path}` : path;
}

function compareRank(a, b) {
  const scoreGap = Number(b.score || 0) - Number(a.score || 0);
  if (scoreGap !== 0) return scoreGap;

  const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return aTime - bTime;
}

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state || FALLBACK_RESULT;

  const [rankings, setRankings] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [footerMessage, setFooterMessage] = useState("결과를 저장하는 중이에요.");
  const [hasSavedOnce, setHasSavedOnce] = useState(false);

  const payload = useMemo(
    () => ({
      nickname: String(result.nickname || localStorage.getItem("nickname") || "PLAYER").trim(),
      score: Number(result.score || 0),
      grade: result.grade || result.resultType || "결과 없음",
      resultType: result.resultType || result.grade || "결과 없음",
      resultMessage: result.resultMessage || "",
      scenarioSummary: result.scenarioSummary || "",
      cleanRate: Number(result.cleanRate || 0),
      irritation: Number(result.irritation || 0),
      moisture: Number(result.moisture || 0),
      balanceTime: Number(result.balanceTime || 10),
      currentAttemptAt: result.currentAttemptAt || new Date().toISOString(),
    }),
    [result]
  );

  useEffect(() => {
    let cancelled = false;

    const saveAndFetch = async () => {
      if (hasSavedOnce) return;
      setSaveStatus("saving");
      setFooterMessage("결과를 저장하는 중이에요.");

      try {
        await axios.post(apiUrl("/api/scores"), payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });

        if (cancelled) return;
        setSaveStatus("success");
        setHasSavedOnce(true);
        setFooterMessage("최고 점수 기준으로 랭킹이 저장됐어요.");
      } catch (error) {
        if (cancelled) return;
        console.error("score save failed", error);
        setSaveStatus("error");

        const serverMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "랭킹 저장에 실패했어요.";

        setFooterMessage(serverMessage);
      }

      try {
        const response = await axios.get(apiUrl("/api/rankings?limit=5"), {
          timeout: 10000,
        });

        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setRankings([...list].sort(compareRank).slice(0, 5));
      } catch (error) {
        if (cancelled) return;
        console.error("ranking fetch failed", error);
        if (saveStatus !== "error") {
          setFooterMessage("랭킹은 저장됐지만 조회에 실패했어요.");
        }
      }
    };

    saveAndFetch();
    return () => {
      cancelled = true;
    };
  }, [hasSavedOnce, payload, saveStatus]);

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

        <div style={styles.rankCard}>
          <div style={styles.rankCardLabel}>TOP 5 랭킹</div>
          <div style={styles.rankList}>
            {rankings.length === 0 ? (
              <div style={styles.emptyText}>아직 저장된 랭킹이 없어요.</div>
            ) : (
              rankings.map((item, index) => (
                <div key={`${item.nickname}-${index}`} style={styles.rankRow}>
                  <div style={styles.rankNumber}>{index + 1}</div>
                  <div style={styles.rankNicknameWrap}>
                    <div style={styles.rankNickname}>{item.nickname}</div>
                    <div style={styles.rankGrade}>{item.grade || item.resultType || "-"}</div>
                  </div>
                  <div style={styles.rankScore}>{item.score}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.footerInfo}>{footerMessage}</div>

        <div style={styles.buttonGroup}>
          <button
            style={styles.primaryButton}
            onClick={() => window.open(WADIZ_URL, "_blank", "noopener,noreferrer")}
          >
            {result.ctaText || "와디즈 보러가기"}
          </button>

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
    gap: "14px",
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
    minWidth: "120px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    padding: "10px 14px",
    textAlign: "center",
  },
  scoreLabel: {
    fontSize: "11px",
    fontWeight: 900,
    color: "#c7d2fe",
    letterSpacing: "0.18em",
  },
  scoreValue: {
    fontSize: "44px",
    lineHeight: 1,
    fontWeight: 900,
    marginTop: "4px",
    color: "#f8e77c",
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
    fontSize: "24px",
    lineHeight: 1.2,
    fontWeight: 900,
    marginBottom: "8px",
    wordBreak: "keep-all",
  },
  typeDescription: {
    color: "#475569",
    fontSize: "15px",
    lineHeight: 1.45,
  },
  rankCard: {
    borderRadius: "24px",
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    padding: "14px",
  },
  rankCardLabel: {
    fontSize: "16px",
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: "12px",
  },
  rankList: {
    display: "grid",
    gap: "10px",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "15px",
  },
  rankRow: {
    display: "grid",
    gridTemplateColumns: "38px 1fr auto",
    gap: "10px",
    alignItems: "center",
  },
  rankNumber: {
    width: "38px",
    height: "38px",
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
    fontSize: "22px",
  },
  footerInfo: {
    textAlign: "center",
    color: "#7c879b",
    fontSize: "14px",
    fontWeight: 700,
    minHeight: "20px",
  },
  buttonGroup: {
    display: "grid",
    gap: "12px",
  },
  primaryButton: {
    width: "100%",
    border: "none",
    borderRadius: "22px",
    background: "linear-gradient(90deg, #0f1c59 0%, #3b54e6 100%)",
    color: "#ffffff",
    padding: "20px 18px",
    fontSize: "18px",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  secondaryButton: {
    width: "100%",
    borderRadius: "20px",
    border: "1px solid #d6deeb",
    background: "#ffffff",
    color: "#0f172a",
    padding: "16px 14px",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default ResultPage;
