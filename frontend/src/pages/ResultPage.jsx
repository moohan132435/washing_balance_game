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

  const [rankings, setRankings] = useState([]);
  const [saveStatus, setSaveStatus] = useState(API_BASE_URL ? "idle" : "disabled");
  const [savedRecord, setSavedRecord] = useState(null);
  const [saveMeta, setSaveMeta] = useState({ updated: false, previousScore: null, storedScore: null });

  const payload = useMemo(
    () => ({
      nickname: result.nickname,
      score: Number(result.score || 0),
      grade: result.grade || result.resultType || "결과 없음",
      cleanRate: 0,
      irritation: 0,
      moisture: 0,
      balanceTime: 10,
      scenarioSummary: result.scenarioSummary || "",
    }),
    [result]
  );

  useEffect(() => {
    let mounted = true;

    const saveAndFetch = async () => {
      if (!API_BASE_URL || !payload.nickname) return;

      try {
        setSaveStatus("saving");
        const saveResponse = await axios.post(`${API_BASE_URL}/api/scores`, payload);
        const saveBody = saveResponse?.data || {};
        const stored = saveBody.data || null;

        if (!mounted) return;

        setSavedRecord(stored);
        setSaveMeta({
          updated: Boolean(saveBody.updated),
          previousScore: saveBody.previousScore ?? null,
          storedScore: saveBody.storedScore ?? stored?.score ?? Number(result.score || 0),
        });

        const rankingResponse = await axios.get(`${API_BASE_URL}/api/rankings?limit=200`);
        const rankingList = Array.isArray(rankingResponse.data) ? rankingResponse.data : [];
        const sorted = [...rankingList].sort(compareRank);

        if (!mounted) return;

        setRankings(sorted);
        if (!stored && result.nickname) {
          const matched = sorted.find((item) => item.nickname === result.nickname);
          if (matched) setSavedRecord(matched);
        }
        setSaveStatus("success");
      } catch (error) {
        console.error("랭킹 저장/조회 실패", error);
        if (mounted) setSaveStatus("error");
      }
    };

    saveAndFetch();
    return () => {
      mounted = false;
    };
  }, [API_BASE_URL, payload, result.nickname, result.score]);

  const topFive = useMemo(() => rankings.slice(0, 5), [rankings]);

  const mySavedRank = useMemo(() => {
    if (!savedRecord?.nickname || !rankings.length) return null;
    const index = rankings.findIndex((item) => item.nickname === savedRecord.nickname);
    return index >= 0 ? index + 1 : null;
  }, [rankings, savedRecord]);

  const rightCardTitle = saveStatus === "success" ? "내 저장 기록" : "내 기록";
  const rightMainValue = savedRecord ? `${savedRecord.score}점` : `${Number(result.score || 0)}점`;
  const footerMessage =
    saveStatus === "success"
      ? saveMeta.updated
        ? `이번 ${result.score}점이 저장되어 최고 기록이 갱신됐어요.`
        : saveMeta.previousScore != null && Number(result.score || 0) < Number(saveMeta.storedScore || 0)
        ? `이번 ${result.score}점은 기존 최고 ${saveMeta.storedScore}점보다 낮아 랭킹은 유지됐어요.`
        : "최고 점수 기준으로 랭킹이 저장됐어요."
      : saveStatus === "error"
      ? "랭킹 저장은 실패했지만 결과는 확인할 수 있어요."
      : saveStatus === "disabled"
      ? "API 연결 전이라 로컬 결과만 표시 중이에요."
      : "랭킹 저장 중이에요.";

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
            <div style={styles.rankCardLabel}>{rightCardTitle}</div>
            <div style={styles.myRankValue}>{rightMainValue}</div>
            <div style={styles.myRankText}>{savedRecord?.nickname || result.nickname}</div>
            <div style={styles.subInfo}>
              {mySavedRank ? `저장 순위 ${mySavedRank}등 · 최고 점수 기준` : "랭킹 집계 중"}
            </div>
            <div style={styles.attemptInfo}>
              이번 플레이 {result.score}점
              {saveStatus === "success" && !saveMeta.updated && Number(saveMeta.storedScore || 0) > Number(result.score || 0)
                ? ` · 저장 최고 ${saveMeta.storedScore}점 유지`
                : saveStatus === "success"
                ? " · 이번 점수 저장 완료"
                : ""}
            </div>
          </div>
        </div>

        <div style={styles.footerInfo}>{footerMessage}</div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={() => window.open(WADIZ_URL, "_blank", "noopener,noreferrer")}>
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
    padding: "14px 16px",
    textAlign: "center",
  },
  scoreLabel: {
    color: "#9db6ff",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.22em",
  },
  scoreValue: {
    marginTop: "6px",
    color: "#f8e984",
    fontSize: "58px",
    fontWeight: 900,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  typeBox: {
    borderRadius: "26px",
    border: "1px solid #d8e2f4",
    background: "#f8fbff",
    padding: "18px",
  },
  typeLabel: {
    color: "#3b63e6",
    fontWeight: 900,
    fontSize: "13px",
    marginBottom: "8px",
  },
  typeValue: {
    fontWeight: 900,
    fontSize: "30px",
    color: "#0f172a",
    lineHeight: 1.15,
  },
  typeDescription: {
    marginTop: "10px",
    color: "#64748b",
    fontSize: "16px",
    lineHeight: 1.45,
  },
  compactGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "12px",
  },
  rankCard: {
    borderRadius: "26px",
    border: "1px solid #d8e2f4",
    background: "#ffffff",
    padding: "16px",
  },
  myRankCard: {
    borderRadius: "26px",
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
    fontSize: "54px",
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
  attemptInfo: {
    marginTop: "12px",
    color: "#93c5fd",
    fontSize: "14px",
    lineHeight: 1.5,
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
