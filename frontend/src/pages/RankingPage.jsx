import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

function RankingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const myResult = useMemo(() => {
    const latest = location.state || getStoredResult() || getFallbackResult();
    const nickname = String(latest.nickname || localStorage.getItem("nickname") || "PLAYER")
      .trim()
      .slice(0, 30);

    return {
      ...getFallbackResult(),
      ...latest,
      nickname,
      score: Number(latest.score || 0),
      grade: latest.grade || latest.resultType || "결과 없음",
    };
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    const fetchRankings = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await requestWithFallback("get", "/api/rankings?limit=100");
        if (cancelled) return;
        const list = Array.isArray(response?.data) ? response.data : [];
        setRankings([...list].sort(compareRank));
      } catch (error) {
        if (cancelled) return;
        console.error("랭킹 조회 실패", error);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "랭킹을 불러오지 못했어요."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRankings();

    return () => {
      cancelled = true;
    };
  }, []);

  const top10 = rankings.slice(0, 10);

  const myRank = useMemo(() => {
    if (rankings.length === 0) return null;

    const exactIndex = rankings.findIndex(
      (item) =>
        String(item.nickname || "").trim() === myResult.nickname &&
        Number(item.score || 0) === myResult.score
    );

    if (exactIndex < 0) {
      return null;
    }

    return {
      rank: exactIndex + 1,
      item: rankings[exactIndex],
    };
  }, [rankings, myResult]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>전체 랭킹</h1>
        <p style={styles.subtitle}>TOP 10만 보여드려요. 내 순위도 바로 확인해보세요.</p>

        <div style={styles.myRankCard}>
          <div style={styles.myRankLabel}>내 점수 순위</div>
          {myRank ? (
            <>
              <div style={styles.myRankMain}>{myRank.rank}등</div>
              <div style={styles.myRankMeta}>
                {myRank.item?.nickname || myResult.nickname} · {Number(myRank.item?.score || myResult.score)}점
              </div>
            </>
          ) : (
            <>
              <div style={styles.myRankMain}>집계 중</div>
              <div style={styles.myRankMeta}>{myResult.nickname} · {myResult.score}점</div>
            </>
          )}
        </div>

        <div style={styles.list}>
          {loading ? (
            <div style={styles.emptyCard}>랭킹을 불러오는 중이에요.</div>
          ) : errorMessage ? (
            <div style={styles.emptyCard}>{errorMessage}</div>
          ) : top10.length === 0 ? (
            <div style={styles.emptyCard}>아직 저장된 랭킹이 없습니다.</div>
          ) : (
            top10.map((item, index) => (
              <div
                key={`${item.nickname}-${item.score}-${index}`}
                style={{
                  ...styles.card,
                  ...(myRank?.rank === index + 1 ? styles.highlightCard : null),
                }}
              >
                <div style={styles.rank}>{index + 1}</div>
                <div style={styles.playerInfo}>
                  <div style={styles.nickname}>{item.nickname}</div>
                  <div style={styles.grade}>{item.grade || item.resultType || "-"}</div>
                </div>
                <div style={styles.score}>{item.score}점</div>
              </div>
            ))
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button type="button" style={styles.button} onClick={() => navigate("/")}>처음으로</button>
          <button type="button" style={styles.button} onClick={() => navigate("/result", { state: myResult })}>결과보기</button>
          <button
            type="button"
            style={styles.button}
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
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
    padding: "16px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
  },
  title: {
    textAlign: "center",
    fontSize: "34px",
    marginBottom: "8px",
    color: "#111827",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: "18px",
    fontSize: "15px",
  },
  myRankCard: {
    background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#ffffff",
    borderRadius: "22px",
    padding: "20px",
    textAlign: "center",
    marginBottom: "18px",
    boxShadow: "0 14px 28px rgba(37,99,235,0.2)",
  },
  myRankLabel: {
    fontSize: "14px",
    opacity: 0.85,
    marginBottom: "8px",
    fontWeight: 700,
  },
  myRankMain: {
    fontSize: "36px",
    fontWeight: 900,
    lineHeight: 1,
  },
  myRankMeta: {
    marginTop: "8px",
    fontSize: "15px",
    opacity: 0.95,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emptyCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    textAlign: "center",
    color: "#64748b",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    border: "1px solid transparent",
  },
  highlightCard: {
    border: "1px solid #93c5fd",
    boxShadow: "0 10px 26px rgba(59,130,246,0.14)",
  },
  rank: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "18px",
    flexShrink: 0,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  nickname: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#111827",
    wordBreak: "break-all",
  },
  grade: {
    color: "#64748b",
    marginTop: "4px",
    wordBreak: "keep-all",
  },
  score: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#2563eb",
    flexShrink: 0,
  },
  buttonGroup: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  button: {
    padding: "14px 18px",
    border: "none",
    borderRadius: "14px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
    minWidth: "110px",
  },
};

export default RankingPage;
