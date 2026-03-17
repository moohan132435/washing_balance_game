import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const FACE_SRC = {
  male: "/faces/male_face_game.png",
  female: "/faces/female_face_game.png",
};

const SPOT_BLUEPRINTS = [
  { id: "spot-1", x: 51, y: 25, type: "inflamed" },
  { id: "spot-2", x: 38, y: 37, type: "nonInflamed" },
  { id: "spot-3", x: 61, y: 41, type: "inflamed" },
  { id: "spot-4", x: 46, y: 52, type: "nonInflamed" },
  { id: "spot-5", x: 57, y: 57, type: "inflamed" },
];

const TOOL_META = {
  wash: { label: "세안", sub: "기본", bg: "#f8fafc", color: "#0f172a", border: "#cbd5e1" },
  ointment: { label: "연고", sub: "진정", bg: "#3d63eb", color: "#ffffff", border: "#3d63eb" },
  patch: { label: "패치", sub: "보호", bg: "#f1cc4a", color: "#111827", border: "#f1cc4a" },
  squeeze: { label: "압출", sub: "짜기", bg: "#e74c42", color: "#ffffff", border: "#e74c42" },
};

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function buildSpots() {
  return shuffle(SPOT_BLUEPRINTS)
    .slice(0, 3)
    .map((spot) => ({
      ...spot,
      treated: false,
      patched: false,
      resolved: false,
      wrongCount: 0,
      actionLog: [],
    }));
}

function getSpotLabel(type) {
  return type === "inflamed" ? "화농성" : "비화농성";
}

function getResultType(score) {
  if (score >= 90) return "피부 응급처치 마스터";
  if (score >= 75) return "침착한 진정형";
  if (score >= 55) return "조금만 더 관찰형";
  return "손부터 가는 압출형";
}

function getResultMessage(score) {
  if (score >= 90) return "상태를 보고 맞는 케어를 꽤 잘 골랐어요.";
  if (score >= 75) return "큰 실수 없이 안정적으로 관리했어요.";
  if (score >= 55) return "조금만 더 보고 고르면 점수가 더 올라가요.";
  return "건드리기 전에 한 번 더 보는 습관이 필요해요.";
}

function computeScore(spots, timeLeft) {
  let score = 24;
  let correct = 0;
  let partial = 0;
  let wrong = 0;
  let resolved = 0;

  spots.forEach((spot) => {
    wrong += spot.wrongCount;

    if (spot.type === "inflamed") {
      if (spot.treated) {
        score += 20;
        correct += 1;
      }
      if (spot.patched) {
        score += 10;
        partial += 1;
      }
      if (spot.resolved) {
        resolved += 1;
      }
    } else {
      if (spot.resolved) {
        score += 24;
        correct += 1;
        resolved += 1;
      } else if (spot.actionLog.includes("ointment")) {
        score += 8;
        partial += 1;
      }
    }
  });

  score -= wrong * 8;
  score += Math.max(0, Math.min(8, timeLeft));
  score = Math.max(0, Math.min(100, score));

  return { score, correct, partial, wrong, resolved };
}

function GamePage() {
  const navigate = useNavigate();
  const nickname = localStorage.getItem("nickname") || "PLAYER";
  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const [faceKey] = useState(() => (selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : Math.random() < 0.5 ? "male" : "female"));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selectedTool, setSelectedTool] = useState("wash");
  const [spots, setSpots] = useState(() => buildSpots());
  const [statusMessage, setStatusMessage] = useState("버튼을 고르고 여드름을 눌러 관리해보세요.");
  const [finished, setFinished] = useState(false);

  const unresolvedCount = useMemo(() => spots.filter((spot) => !spot.resolved).length, [spots]);
  const inflamedCount = useMemo(() => spots.filter((spot) => spot.type === "inflamed").length, [spots]);
  const faceSrc = FACE_SRC[faceKey] || FACE_SRC.female;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (finished) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (finished) return;

    if (timeLeft === 0 || unresolvedCount === 0) {
      setFinished(true);
      const { score, correct, partial, wrong, resolved } = computeScore(spots, timeLeft);
      const resultType = getResultType(score);

      navigate("/result", {
        replace: true,
        state: {
          nickname,
          score,
          grade: resultType,
          resultType,
          resultMessage: getResultMessage(score),
          scenarioSummary: `해결 ${resolved}/${spots.length} · 오답 ${wrong}회`,
          ctaText: "와디즈 보러가기",
          careStats: {
            totalSpots: spots.length,
            inflamedCount,
            resolved,
            correct,
            partial,
            wrong,
          },
          currentAttemptAt: new Date().toISOString(),
        },
      });
    }
  }, [finished, inflamedCount, navigate, nickname, spots, timeLeft, unresolvedCount]);

  const handleSpotClick = (spotId) => {
    if (finished || timeLeft === 0) return;

    let nextMessage = "";

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.id !== spotId || spot.resolved) return spot;

        const nextSpot = {
          ...spot,
          actionLog: [...spot.actionLog, selectedTool],
        };

        if (spot.type === "inflamed") {
          if (selectedTool === "ointment") {
            nextSpot.treated = true;
            nextMessage = "화농성은 먼저 진정시키는 선택이 좋아요.";
            return nextSpot;
          }

          if (selectedTool === "patch") {
            if (spot.treated) {
              nextSpot.patched = true;
              nextSpot.resolved = true;
              nextMessage = "연고 후 패치까지 완료했어요.";
              return nextSpot;
            }
            nextSpot.wrongCount += 1;
            nextMessage = "화농성은 바로 패치보다 진정부터 보는 편이 좋아요.";
            return nextSpot;
          }

          nextSpot.wrongCount += 1;
          nextMessage = selectedTool === "squeeze"
            ? "붉은 화농성은 압출보다 진정이 먼저예요."
            : "붉은 화농성은 세안만으로 끝내기 어려워요.";
          return nextSpot;
        }

        if (selectedTool === "wash") {
          nextSpot.resolved = true;
          nextMessage = "비화농성은 자극 없이 씻어내는 접근이 먼저예요.";
          return nextSpot;
        }

        if (selectedTool === "ointment") {
          nextMessage = "연고도 가능하지만, 비화농성은 세안 우선이 더 좋아요.";
          return nextSpot;
        }

        nextSpot.wrongCount += 1;
        nextMessage = selectedTool === "squeeze"
          ? "작은 막힘은 바로 짜기보다 세안으로 먼저 풀어보세요."
          : "비화농성에는 패치보다 세안이 더 알맞아요.";
        return nextSpot;
      })
    );

    if (nextMessage) {
      setStatusMessage(nextMessage);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.headerRow}>
          <button type="button" style={styles.closeButton} onClick={() => navigate("/")}>✕</button>
          <div style={styles.progressText}>남은 트러블 {unresolvedCount}개</div>
        </div>

        <div style={styles.stageCard}>
          <div style={styles.timerBox}>
            <div style={styles.timerLabel}>TIME</div>
            <div style={styles.timerValue}>{String(timeLeft).padStart(2, "0")}</div>
          </div>

          <div style={styles.titleWrap}>
            <div style={styles.stateBadge}>{inflamedCount > 0 ? "화농성 포함" : "비화농성 위주"}</div>
            <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>
            <p style={styles.subtitle}>버튼을 고른 뒤 얼굴 위 트러블을 눌러 직접 관리해보세요.</p>
          </div>

          <div style={styles.faceStage}>
            <img src={faceSrc} alt="게임 얼굴" style={styles.faceImage} />
            {spots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleSpotClick(spot.id)}
                style={{
                  ...styles.spotButton,
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  background: spot.resolved
                    ? "rgba(59,130,246,0.22)"
                    : spot.type === "inflamed"
                    ? "rgba(239,68,68,0.92)"
                    : "rgba(245,158,11,0.92)",
                  boxShadow: spot.resolved
                    ? "0 0 0 6px rgba(191,219,254,0.36)"
                    : spot.type === "inflamed"
                    ? "0 0 0 6px rgba(254,202,202,0.34)"
                    : "0 0 0 6px rgba(254,240,138,0.34)",
                }}
                aria-label={`${getSpotLabel(spot.type)} 트러블`}
              >
                {spot.resolved ? "✓" : ""}
              </button>
            ))}
          </div>

          <div style={styles.legendRow}>
            <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#ef4444" }} /> 화농성</div>
            <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#f59e0b" }} /> 비화농성</div>
            <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#3b82f6" }} /> 해결됨</div>
          </div>

          <div style={styles.statusBox}>{statusMessage}</div>
        </div>

        <div style={styles.toolGrid}>
          {Object.entries(TOOL_META).map(([key, meta]) => {
            const active = selectedTool === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTool(key)}
                style={{
                  ...styles.toolButton,
                  background: meta.bg,
                  color: meta.color,
                  borderColor: active ? "#0f172a" : meta.border,
                  boxShadow: active ? "0 0 0 3px rgba(15,23,42,0.12)" : "none",
                }}
              >
                <div style={styles.toolLabel}>{meta.label}</div>
                <div style={{ ...styles.toolSub, color: meta.color === "#ffffff" ? "rgba(255,255,255,0.86)" : "rgba(15,23,42,0.78)" }}>{meta.sub}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    background: "linear-gradient(180deg, #edf3ff 0%, #f7fbff 100%)",
    padding: "10px",
    boxSizing: "border-box",
  },
  shell: {
    maxWidth: "520px",
    minHeight: "calc(100svh - 20px)",
    margin: "0 auto",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: "10px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  closeButton: {
    width: "54px",
    height: "54px",
    borderRadius: "18px",
    border: "1px solid #d4deed",
    background: "#f8fbff",
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: 700,
  },
  progressText: {
    color: "#475569",
    fontWeight: 800,
    fontSize: "14px",
    paddingRight: "6px",
  },
  stageCard: {
    position: "relative",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    border: "1px solid #dbe4f0",
    boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
    padding: "14px",
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr) auto auto",
    gap: "10px",
    minHeight: 0,
  },
  timerBox: {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "112px",
    borderRadius: "22px",
    background: "linear-gradient(180deg, #0b1535 0%, #09112a 100%)",
    padding: "12px 10px",
    textAlign: "center",
    zIndex: 2,
  },
  timerLabel: {
    color: "#9dbdff",
    fontSize: "11px",
    letterSpacing: "0.24em",
    fontWeight: 900,
  },
  timerValue: {
    color: "#f7d548",
    fontWeight: 900,
    fontSize: "46px",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    textShadow: "0 0 16px rgba(247,213,72,0.2)",
  },
  titleWrap: {
    paddingRight: "122px",
  },
  stateBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    background: "#f4ead1",
    color: "#9a6321",
    padding: "10px 14px",
    fontWeight: 800,
    fontSize: "13px",
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(34px, 8vw, 52px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.45,
    wordBreak: "keep-all",
  },
  faceStage: {
    position: "relative",
    borderRadius: "28px",
    overflow: "hidden",
    background: "linear-gradient(180deg, #0f172a 0%, #111c3d 100%)",
    minHeight: "320px",
    height: "100%",
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 30%",
    display: "block",
  },
  spotButton: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: "none",
    display: "grid",
    placeItems: "center",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "16px",
  },
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px 14px",
    alignItems: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#475569",
    fontWeight: 700,
    fontSize: "13px",
  },
  legendDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  statusBox: {
    borderRadius: "18px",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "14px 16px",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.45,
    wordBreak: "keep-all",
  },
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  toolButton: {
    borderRadius: "24px",
    border: "2px solid transparent",
    minHeight: "94px",
    padding: "14px",
    textAlign: "center",
  },
  toolLabel: {
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "4px",
  },
  toolSub: {
    fontSize: "14px",
    fontWeight: 700,
  },
};

export default GamePage;
