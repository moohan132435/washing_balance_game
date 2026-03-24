import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const WADIZ_URL =
  import.meta.env.VITE_WADIZ_URL || "https://www.wadiz.kr/web/wcomingsoon/rwd/396453";
const INSTAGRAM_DM_URL = import.meta.env.VITE_INSTAGRAM_DM_URL || "https://ig.me/m/pgb_kr";
const RAW_BASE_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_BACKEND_URL,
  import.meta.env.VITE_API_URL,
  "",
]
  .map((v) => (typeof v === "string" ? v.trim().replace(/\/$/, "") : ""))
  .filter((v, i, arr) => v || i === arr.lastIndexOf(v));

function getStoredResult() {
  try {
    const raw = localStorage.getItem("lastGameResult");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getFallbackResult() {
  return {
    nickname: localStorage.getItem("nickname") || "PLAYER",
    score: 0,
    grade: "결과 없음",
    resultType: "결과 없음",
    resultMessage: "결과 데이터가 없습니다.",
    scenarioSummary: "",
    ctaText: "와디즈 보러가기",
    currentAttemptAt: new Date().toISOString(),
  };
}

function compareRank(a, b) {
  const scoreGap = Number(b.score || 0) - Number(a.score || 0);
  if (scoreGap !== 0) return scoreGap;

  const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return aTime - bTime;
}

function buildCandidates(path) {
  const candidates = RAW_BASE_CANDIDATES.map((base) => (base ? `${base}${path}` : path));
  return [...new Set(candidates)];
}

async function requestWithFallback(method, path, config = {}) {
  const candidates = buildCandidates(path);
  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await axios({
        method,
        url,
        timeout: 12000,
        ...config,
      });
      return response;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status < 500 && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("request failed");
}

function formatEventDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function trackEvent(payload) {
  try {
    await requestWithFallback("post", "/api/events", {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("event tracking failed", error);
  }
}

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = useMemo(() => {
    const latest = location.state || getStoredResult() || getFallbackResult();
    return {
      ...getFallbackResult(),
      ...latest,
    };
  }, [location.state]);

  const [rankings, setRankings] = useState([]);
  const [footerMessage, setFooterMessage] = useState("결과를 저장하는 중이에요.");
  const [isSaving, setIsSaving] = useState(true);
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const didRunRef = useRef(false);

  const payload = useMemo(
    () => ({
      nickname: String(result.nickname || localStorage.getItem("nickname") || "PLAYER")
        .trim()
        .slice(0, 30),
      score: Number(result.score || 0),
      grade: result.grade || result.resultType || "결과 없음",
      resultType: result.resultType || result.grade || "결과 없음",
      resultMessage: result.resultMessage || "",
      scenarioSummary: result.scenarioSummary || "",
      currentAttemptAt: result.currentAttemptAt || new Date().toISOString(),
    }),
    [result]
  );

  useEffect(() => {
    localStorage.setItem("lastGameResult", JSON.stringify(result));
  }, [result]);

  useEffect(() => {
    setShowActionButtons(false);
    const timer = window.setTimeout(() => {
      setShowActionButtons(true);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    let cancelled = false;
    if (didRunRef.current) return;
    didRunRef.current = true;

    const run = async () => {
      setIsSaving(true);
      try {
        const saveResponse = await requestWithFallback("post", "/api/scores", {
          data: payload,
          headers: { "Content-Type": "application/json" },
        });

        if (cancelled) return;
        const saveData = saveResponse?.data || {};
        setFooterMessage(saveData.message || "최고 점수 기준으로 랭킹이 저장됐어요.");
      } catch (error) {
        if (cancelled) return;
        console.error("score save failed", error);
        const serverMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "랭킹 저장에 실패했어요.";
        setFooterMessage(serverMessage);
      }

      try {
        const rankingResponse = await requestWithFallback("get", "/api/rankings?limit=5");
        if (cancelled) return;
        const list = Array.isArray(rankingResponse?.data) ? rankingResponse.data : [];
        const sortedTop5 = [...list].sort(compareRank).slice(0, 5);
        setRankings(sortedTop5);

        const isTop5 = sortedTop5.some(
          (item) => String(item.nickname || "").trim() === payload.nickname && Number(item.score || 0) === payload.score
        );

        if (isTop5) {
          setShowEventPopup(true);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("ranking fetch failed", error);
        const serverMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "랭킹 조회에 실패했어요.";
        setFooterMessage((prev) => (prev === "결과를 저장하는 중이에요." ? serverMessage : `${prev} / ${serverMessage}`));
      } finally {
        if (!cancelled) setIsSaving(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <div style={styles.wrapper}>
      {showEventPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupCard}>
            <button type="button" style={styles.popupCloseButton} onClick={() => setShowEventPopup(false)}>
              X
            </button>
            <div style={styles.popupBadge}>스타벅스 이벤트!</div>
            <div style={styles.popupTitle}>TOP 5라면 지금 바로 참여해보세요</div>
            <div style={styles.popupSteps}>
              <div style={styles.popupStep}>1. 게임 결과 캡쳐</div>
              <div style={styles.popupStep}>2. 와디즈 알림신청 캡쳐</div>
              <div style={styles.popupStep}>3. 두 장을 PGB_KR로 DM 보내기</div>
            </div>
            <div style={styles.popupHint}>확인 후 스타벅스 이벤트 참여 대상으로 안내드려요.</div>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.titleWrap}>
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

        <div style={styles.footerInfo}>{isSaving ? "결과를 저장하는 중이에요." : showActionButtons ? footerMessage : "결과 확인 중... 버튼은 잠시 후 나타나요."}</div>

        <div style={{ ...styles.buttonGroup, ...(showActionButtons ? styles.buttonGroupVisible : styles.buttonGroupHidden) }}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => {
              trackEvent({
                eventType: "wadiz_click",
                eventTimestamp: new Date().toISOString(),
                eventDate: formatEventDate(),
                nickname: payload.nickname,
                score: payload.score,
                eventSource: "result_primary_button",
                page: "ResultPage",
                meta: { target: "wadiz" },
              });
              window.open(WADIZ_URL, "_blank", "noopener,noreferrer");
            }}
          >
            {result.ctaText || "와디즈 보러가기"}
          </button>

          <button
            type="button"
            style={styles.eventButton}
            onClick={() => {
              trackEvent({
                eventType: "instagram_dm_click",
                eventTimestamp: new Date().toISOString(),
                eventDate: formatEventDate(),
                nickname: payload.nickname,
                score: payload.score,
                eventSource: "result_event_button",
                page: "ResultPage",
                meta: { target: "instagram_dm" },
              });
              window.open(INSTAGRAM_DM_URL, "_blank", "noopener,noreferrer");
            }}
          >
            스타벅스 이벤트 참여
          </button>

          <div style={styles.secondaryGrid}>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate("/ranking", { state: result })}>
              전체 랭킹 보기
            </button>
            <button
              type="button"
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
    overflowX: "hidden",
  },
  card: {
    width: "min(520px, calc(100vw - 20px))",
    margin: "0 auto",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    padding: "16px",
    boxShadow: "0 20px 48px rgba(15,23,42,0.1)",
    border: "1px solid rgba(219,228,240,0.9)",
    display: "grid",
    gap: "14px",
    position: "relative",
  },
  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.52)",
    display: "grid",
    placeItems: "center",
    zIndex: 30,
    padding: "18px",
    boxSizing: "border-box",
  },
  popupCard: {
    width: "min(420px, calc(100vw - 36px))",
    background: "#ffffff",
    borderRadius: "28px",
    padding: "22px 18px 20px",
    boxShadow: "0 24px 56px rgba(15,23,42,0.24)",
    border: "1px solid rgba(219,228,240,0.95)",
    display: "grid",
    gap: "12px",
    position: "relative",
  },
  popupCloseButton: {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "1px solid #d6deeb",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  popupBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 900,
    letterSpacing: "-0.01em",
  },
  popupTitle: {
    marginTop: "4px",
    color: "#0f172a",
    fontSize: "26px",
    lineHeight: 1.2,
    fontWeight: 900,
    wordBreak: "keep-all",
    paddingRight: "42px",
  },
  popupSteps: {
    display: "grid",
    gap: "10px",
  },
  popupStep: {
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    padding: "14px 14px",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: 1.45,
    wordBreak: "keep-all",
  },
  popupHint: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
    fontWeight: 700,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "12px",
    alignItems: "start",
  },
  titleWrap: {
    minWidth: 0,
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
    fontSize: "clamp(28px, 7vw, 42px)",
    lineHeight: 1,
    color: "#0f172a",
    fontWeight: 900,
    wordBreak: "keep-all",
  },
  scoreBox: {
    minWidth: "118px",
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
    fontSize: "22px",
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
    gridTemplateColumns: "38px minmax(0, 1fr) auto",
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
    flexShrink: 0,
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
    padding: "18px 18px",
    fontSize: "18px",
    fontWeight: 900,
    cursor: "pointer",
  },
  eventButton: {
    width: "100%",
    border: "none",
    borderRadius: "22px",
    background: "linear-gradient(90deg, #111827 0%, #000000 100%)",
    color: "#ffffff",
    padding: "18px 18px",
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
