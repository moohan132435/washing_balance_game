import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RAW_BASE_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_BACKEND_URL,
  import.meta.env.VITE_API_URL,
  "",
]
  .map((v) => (typeof v === "string" ? v.trim().replace(/\/$/, "") : ""))
  .filter((v, i, arr) => v || i === arr.lastIndexOf(v));

function buildCandidates(path) {
  const candidates = RAW_BASE_CANDIDATES.map((base) => (base ? `${base}${path}` : path));
  return [...new Set(candidates)];
}

async function requestWithFallback(path) {
  const candidates = buildCandidates(path);
  let lastError = null;

  for (const url of candidates) {
    try {
      return await axios.get(url, { timeout: 12000 });
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
  const navigate = useNavigate();
  const [rankings, setRankings] = useState([]);
  const [message, setMessage] = useState("랭킹을 불러오는 중이에요.");

  useEffect(() => {
    let cancelled = false;

    const fetchRankings = async () => {
      try {
        const response = await requestWithFallback("/api/rankings?limit=100");
        if (cancelled) return;

        const list = Array.isArray(response.data) ? response.data : [];
        setRankings(list);
        setMessage(list.length ? "닉네임별 최고 점수 기준이에요." : "아직 저장된 랭킹이 없습니다.");
      } catch (error) {
        if (cancelled) return;
        console.error("랭킹 조회 실패", error);
        setMessage(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "랭킹 조회에 실패했어요.",
        );
      }
    };

    fetchRankings();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>전체 랭킹</h1>
        <p style={styles.subtitle}>{message}</p>

        <div style={styles.list}>
          {rankings.length === 0 ? (
            <div style={styles.emptyCard}>아직 저장된 랭킹이 없습니다.</div>
          ) : (
            rankings.map((item, index) => (
              <div key={`${item.nickname}-${index}`} style={styles.card}>
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
          <button style={styles.button} onClick={() => navigate("/game")}>다시 도전하기</button>
          <button style={styles.button} onClick={() => navigate("/")}>처음으로</button>
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
  container: { maxWidth: "760px", margin: "0 auto" },
  title: {
    textAlign: "center",
    fontSize: "34px",
    marginBottom: "8px",
    color: "#111827",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: "24px",
    fontSize: "15px",
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
  playerInfo: { flex: 1 },
  nickname: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#111827",
  },
  grade: {
    color: "#64748b",
    marginTop: "4px",
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
  },
};

export default RankingPage;
