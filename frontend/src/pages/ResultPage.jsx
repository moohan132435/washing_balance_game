import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const result = location.state || {
    nickname: localStorage.getItem("nickname") || "PLAYER",
    score: 0,
    grade: "결과 없음",
    cleanRate: 0,
    irritation: 0,
    moisture: 0,
    balanceTime: 0,
    resultMessage: "결과 데이터가 없습니다.",
    ctaText: "와디즈 보러가기",
    scenarioSummary: "",
    scoreBreakdown: {
      cleaningScore: 0,
      irritationScore: 0,
      discoveryScore: 0,
      careOrderScore: 0,
      protectionScore: 0,
    },
    careStats: {
      totalAcne: 0,
      revealedCount: 0,
      treatedCount: 0,
      patchedCount: 0,
    },
  };

  const payload = useMemo(
    () => ({
      nickname: result.nickname,
      score: result.score,
      grade: result.grade,
      cleanRate: Math.round(result.cleanRate || 0),
      irritation: Math.round(result.irritation || 0),
      moisture: Math.round(result.moisture || 0),
      balanceTime: Number(result.balanceTime || 0),
      scenarioSummary: result.scenarioSummary || "",
    }),
    [result]
  );

  useEffect(() => {
    console.log("[ResultPage] VITE_API_BASE_URL =", API_BASE_URL);
    console.log("[ResultPage] location.state =", location.state);
    console.log("[ResultPage] payload =", payload);
  }, [location.state, payload]);

  useEffect(() => {
    const saveScore = async () => {
      if (saved) return;

      if (!API_BASE_URL) {
        console.error("[ResultPage] VITE_API_BASE_URL is missing");
        setSaveStatus("error");
        setSaveMessage("API 주소가 설정되지 않았습니다. Vercel 환경변수를 확인해주세요.");
        return;
      }

      try {
        setSaveStatus("saving");
        setSaveMessage("랭킹 저장 중...");

        const url = `${API_BASE_URL}/api/scores`;

        console.log("[ResultPage] saving score to:", url);
        console.log("[ResultPage] request payload:", payload);

        const response = await axios.post(url, payload);

        console.log("[ResultPage] save success:", response.data);

        setSaved(true);
        setSaveStatus("success");
        setSaveMessage("랭킹 저장 완료");
      } catch (error) {
        console.error("[ResultPage] 점수 저장 실패:", error);
        console.error("[ResultPage] error.response?.status:", error?.response?.status);
        console.error("[ResultPage] error.response?.data:", error?.response?.data);

        setSaveStatus("error");
        setSaveMessage(
          `랭킹 저장 실패: ${
            error?.response?.data?.message ||
            error?.message ||
            "알 수 없는 오류"
          }`
        );
      }
    };

    saveScore();
  }, [API_BASE_URL, payload, saved]);

  const handleWadizClick = () => {
    window.open("https://www.wadiz.kr", "_blank");
  };

  const handleRetrySave = async () => {
    setSaved(false);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>게임 결과</h1>

        <div style={styles.scoreCircle}>
          <div style={styles.scoreLabel}>SCORE</div>
          <div style={styles.scoreValue}>{result.score}</div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.nickname}>닉네임: {result.nickname}</p>
          <p style={styles.grade}>등급: {result.grade}</p>
          <p style={styles.message}>{result.resultMessage}</p>
          <p style={styles.scenario}>{result.scenarioSummary}</p>
        </div>

        <div style={styles.statusBox}>
          <div style={styles.statusTitle}>랭킹 저장 상태</div>
          <div
            style={{
              ...styles.statusMessage,
              ...(saveStatus === "success"
                ? styles.statusSuccess
                : saveStatus === "error"
                ? styles.statusError
                : saveStatus === "saving"
                ? styles.statusSaving
                : {}),
            }}
          >
            {saveMessage || "저장 대기중"}
          </div>
          <div style={styles.apiInfo}>API: {API_BASE_URL || "(비어 있음)"}</div>
        </div>

        <div style={styles.statGrid}>
          <StatCard label="세정 진행도" value={Math.round(result.cleanRate || 0)} />
          <StatCard label="자극" value={Math.round(result.irritation || 0)} />
          <StatCard label="수분" value={Math.round(result.moisture || 0)} />
          <StatCard
            label="균형 유지"
            value={`${Number(result.balanceTime || 0).toFixed(1)}초`}
          />
        </div>

        <div style={styles.breakdownBox}>
          <h3 style={styles.sectionTitle}>점수 구성</h3>
          <div style={styles.breakdownItem}>
            세정 점수: {result.scoreBreakdown?.cleaningScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            자극 관리 점수: {result.scoreBreakdown?.irritationScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            문제 발견 점수: {result.scoreBreakdown?.discoveryScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            케어 순서 점수: {result.scoreBreakdown?.careOrderScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            보호 마무리 점수: {result.scoreBreakdown?.protectionScore ?? 0}
          </div>
        </div>

        <div style={styles.breakdownBox}>
          <h3 style={styles.sectionTitle}>처리 결과</h3>
          <div style={styles.breakdownItem}>
            총 여드름 수: {result.careStats?.totalAcne ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            발견한 여드름 수: {result.careStats?.revealedCount ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            연고 처리 수: {result.careStats?.treatedCount ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            패치 부착 수: {result.careStats?.patchedCount ?? 0}
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={handleWadizClick}>
            {result.ctaText}
          </button>
          <button style={styles.secondaryButton} onClick={() => navigate("/ranking")}>
            랭킹 보기
          </button>
          <button style={styles.secondaryButton} onClick={() => navigate("/game")}>
            다시하기
          </button>
          <button style={styles.secondaryButton} onClick={() => navigate("/")}>
            처음으로
          </button>
          {saveStatus === "error" && (
            <button style={styles.secondaryButton} onClick={handleRetrySave}>
              저장 재시도
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "860px",
    background: "#ffffff",
    borderRadius: "28px",
    padding: "32px",
    boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    marginTop: 0,
    marginBottom: "24px",
    fontSize: "34px",
    color: "#111827",
  },
  scoreCircle: {
    width: "160px",
    height: "160px",
    borderRadius: "50%",
    margin: "0 auto 24px",
    background: "linear-gradient(180deg, #111827 0%, #374151 100%)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: "14px",
    opacity: 0.7,
    marginBottom: "8px",
  },
  scoreValue: {
    fontSize: "42px",
    fontWeight: "800",
  },
  infoBox: {
    marginBottom: "22px",
  },
  nickname: {
    fontSize: "18px",
    margin: "8px 0",
    color: "#374151",
  },
  grade: {
    fontSize: "24px",
    margin: "8px 0",
    fontWeight: "800",
    color: "#111827",
  },
  message: {
    fontSize: "17px",
    lineHeight: "1.7",
    color: "#4b5563",
    margin: "12px 0 0 0",
  },
  scenario: {
    fontSize: "14px",
    color: "#64748b",
    marginTop: "12px",
  },
  statusBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "20px",
    textAlign: "left",
  },
  statusTitle: {
    fontWeight: "800",
    color: "#111827",
    marginBottom: "8px",
  },
  statusMessage: {
    fontSize: "15px",
    color: "#475569",
    lineHeight: "1.5",
  },
  statusSuccess: {
    color: "#047857",
  },
  statusError: {
    color: "#b91c1c",
  },
  statusSaving: {
    color: "#9a6700",
  },
  apiInfo: {
    marginTop: "8px",
    fontSize: "13px",
    color: "#64748b",
    wordBreak: "break-all",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "14px",
    marginBottom: "24px",
  },
  statCard: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
  },
  statLabel: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#111827",
  },
  breakdownBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "16px",
    textAlign: "left",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#111827",
  },
  breakdownItem: {
    lineHeight: "1.8",
    color: "#475569",
    fontSize: "15px",
  },
  buttonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "center",
    marginTop: "10px",
  },
  primaryButton: {
    padding: "14px 20px",
    border: "none",
    borderRadius: "14px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "14px 20px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default ResultPage;