import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const FACE_SRC = {
  male: "/faces/male_face_game.png",
  female: "/faces/female_face_game.png",
};

const SPOT_BLUEPRINTS = [
  { id: "spot-1", x: 50, y: 32, type: "inflamed" },
  { id: "spot-2", x: 38, y: 42, type: "nonInflamed" },
  { id: "spot-3", x: 61, y: 46, type: "inflamed" },
  { id: "spot-4", x: 46, y: 55, type: "nonInflamed" },
  { id: "spot-5", x: 58, y: 60, type: "inflamed" },
  { id: "spot-6", x: 41, y: 61, type: "nonInflamed" },
];

const TOOL_META = {
  wash: { label: "세안", sub: "문지르기", bg: "#ffffff", color: "#0f172a", border: "#cbd5e1" },
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
      washProgress: 0,
    }));
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
  let score = 20;
  let correct = 0;
  let partial = 0;
  let wrong = 0;
  let resolved = 0;

  spots.forEach((spot) => {
    wrong += spot.wrongCount;

    if (spot.type === "inflamed") {
      if (spot.treated) {
        score += 18;
        partial += 1;
      }
      if (spot.patched) {
        score += 14;
        correct += 1;
      }
      if (spot.resolved) resolved += 1;
    } else {
      if (spot.resolved) {
        score += 26;
        correct += 1;
        resolved += 1;
      } else if (spot.washProgress >= 1) {
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

function getSpotView(spot) {
  if (spot.resolved) {
    return {
      size: 12,
      color: "rgba(59,130,246,0.95)",
      ring: "0 0 0 4px rgba(191,219,254,0.5)",
      label: "✓",
      textColor: "#ffffff",
    };
  }

  if (spot.type === "inflamed") {
    if (spot.patched) {
      return {
        size: 16,
        color: "rgba(59,130,246,0.98)",
        ring: "0 0 0 4px rgba(147,197,253,0.45)",
        label: "",
        textColor: "#ffffff",
      };
    }
    if (spot.treated) {
      return {
        size: 18,
        color: "rgba(245,158,11,0.95)",
        ring: "0 0 0 4px rgba(253,230,138,0.42)",
        label: "",
        textColor: "#ffffff",
      };
    }
    return {
      size: 20,
      color: "rgba(239,68,68,0.94)",
      ring: "0 0 0 4px rgba(254,202,202,0.42)",
      label: "",
      textColor: "#ffffff",
    };
  }

  if (spot.washProgress >= 2) {
    return {
      size: 12,
      color: "rgba(59,130,246,0.95)",
      ring: "0 0 0 4px rgba(191,219,254,0.5)",
      label: "✓",
      textColor: "#ffffff",
    };
  }

  if (spot.washProgress === 1) {
    return {
      size: 15,
      color: "rgba(250,204,21,0.92)",
      ring: "0 0 0 4px rgba(254,240,138,0.34)",
      label: "",
      textColor: "#111827",
    };
  }

  return {
    size: 18,
    color: "rgba(245,158,11,0.92)",
    ring: "0 0 0 4px rgba(254,240,138,0.34)",
    label: "",
    textColor: "#111827",
  };
}

function getPointerPosition(event, element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const point = "touches" in event && event.touches[0] ? event.touches[0] : event;
  const x = ((point.clientX - rect.left) / rect.width) * 100;
  const y = ((point.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

function GamePage() {
  const navigate = useNavigate();
  const faceStageRef = useRef(null);
  const rubLockRef = useRef(new Map());
  const [isRubbing, setIsRubbing] = useState(false);
  const nickname = localStorage.getItem("nickname") || "PLAYER";
  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const [faceKey] = useState(() => (selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : "female"));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selectedTool, setSelectedTool] = useState("wash");
  const [spots, setSpots] = useState(() => buildSpots());
  const [statusMessage, setStatusMessage] = useState("세안은 얼굴을 문질러서, 연고·패치·압출은 스팟을 눌러서 진행해보세요.");
  const [finished, setFinished] = useState(false);
  const [foamPoints, setFoamPoints] = useState([]);

  const unresolvedCount = useMemo(() => spots.filter((spot) => !spot.resolved).length, [spots]);
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
            resolved,
            correct,
            partial,
            wrong,
          },
          currentAttemptAt: new Date().toISOString(),
        },
      });
    }
  }, [finished, navigate, nickname, spots, timeLeft, unresolvedCount]);

  useEffect(() => {
    if (!foamPoints.length) return undefined;
    const timer = window.setTimeout(() => {
      setFoamPoints((prev) => prev.slice(-6));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [foamPoints]);

  const applyWash = (position) => {
    if (!position) return;

    const faceCenterX = 50;
    const faceCenterY = 52;
    const faceRadiusX = 26;
    const faceRadiusY = 33;
    const normX = (position.x - faceCenterX) / faceRadiusX;
    const normY = (position.y - faceCenterY) / faceRadiusY;
    const insideFace = normX * normX + normY * normY <= 1;

    if (!insideFace) return;

    setFoamPoints((prev) => [...prev.slice(-10), { ...position, id: `${Date.now()}-${Math.random()}` }]);

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.resolved) return spot;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        const lockKey = `${spot.id}-${Math.round(position.x)}-${Math.round(position.y)}`;
        if (distance > 7 || rubLockRef.current.has(lockKey)) return spot;
        rubLockRef.current.set(lockKey, true);
        window.setTimeout(() => rubLockRef.current.delete(lockKey), 120);

        if (spot.type === "nonInflamed") {
          const nextProgress = Math.min(2, spot.washProgress + 1);
          const nextSpot = {
            ...spot,
            actionLog: [...spot.actionLog, "wash"],
            washProgress: nextProgress,
            resolved: nextProgress >= 2,
          };
          setStatusMessage(nextProgress >= 2 ? "비화농성 트러블이 세안으로 정리됐어요." : "좋아요. 조금 더 부드럽게 문질러보세요.");
          return nextSpot;
        }

        setStatusMessage("붉은 화농성은 세안만으로 끝내기보다 진정 관리가 먼저예요.");
        return {
          ...spot,
          actionLog: [...spot.actionLog, "wash"],
        };
      })
    );
  };

  const handleRubStart = (event) => {
    if (selectedTool !== "wash" || finished || timeLeft === 0) return;
    setIsRubbing(true);
    applyWash(getPointerPosition(event, faceStageRef.current));
  };

  const handleRubMove = (event) => {
    if (!isRubbing || selectedTool !== "wash" || finished || timeLeft === 0) return;
    applyWash(getPointerPosition(event, faceStageRef.current));
  };

  const handleRubEnd = () => {
    setIsRubbing(false);
  };

  const handleSpotClick = (spotId) => {
    if (finished || timeLeft === 0 || selectedTool === "wash") return;

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
            nextMessage = "좋아요. 화농성은 먼저 진정 단계로 들어갔어요.";
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
            nextMessage = "화농성은 패치 전에 진정 단계가 먼저예요.";
            return nextSpot;
          }

          nextSpot.wrongCount += 1;
          nextMessage = "붉은 화농성은 바로 압출하기보다 진정부터 보는 편이 좋아요.";
          return nextSpot;
        }

        if (selectedTool === "ointment") {
          nextSpot.wrongCount += 1;
          nextMessage = "비화농성은 연고보다 세안으로 부드럽게 정리하는 흐름이 좋아요.";
          return nextSpot;
        }

        if (selectedTool === "patch") {
          nextSpot.wrongCount += 1;
          nextMessage = "비화농성은 패치보다 세안이 우선이에요.";
          return nextSpot;
        }

        nextSpot.wrongCount += 1;
        nextMessage = "비화농성은 압출보다 세안으로 정리해보세요.";
        return nextSpot;
      })
    );

    if (nextMessage) setStatusMessage(nextMessage);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.topRow}>
          <button type="button" style={styles.closeButton} onClick={() => navigate("/")}>✕</button>
          <div style={styles.smallStatus}>남은 트러블 {unresolvedCount}개</div>
        </div>

        <div style={styles.stageCard}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>
          </div>

          <div
            ref={faceStageRef}
            style={styles.faceStage}
            onMouseDown={handleRubStart}
            onMouseMove={handleRubMove}
            onMouseUp={handleRubEnd}
            onMouseLeave={handleRubEnd}
            onTouchStart={handleRubStart}
            onTouchMove={handleRubMove}
            onTouchEnd={handleRubEnd}
          >
            <div style={styles.timerBox}>
              <div style={styles.timerLabel}>TIME</div>
              <div style={styles.timerValue}>{String(timeLeft).padStart(2, "0")}</div>
            </div>
            <img src={faceSrc} alt="게임 얼굴" style={styles.faceImage} draggable={false} />

            {foamPoints.map((point) => (
              <span
                key={point.id}
                style={{
                  ...styles.foamDot,
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                }}
              />
            ))}

            {spots.map((spot) => {
              const view = getSpotView(spot);
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleSpotClick(spot.id)}
                  style={{
                    ...styles.spotButton,
                    width: `${view.size}px`,
                    height: `${view.size}px`,
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                    background: view.color,
                    boxShadow: view.ring,
                    color: view.textColor,
                  }}
                  aria-label={spot.type === "inflamed" ? "화농성 트러블" : "비화농성 트러블"}
                >
                  {view.label}
                </button>
              );
            })}
          </div>

          <div style={styles.legendRow}>
            <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#ef4444" }} /> 화농성</div>
            <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#f59e0b" }} /> 비화농성</div>
            <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#3b82f6" }} /> 해결됨</div>
          </div>
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

        <div style={styles.bottomHint}>{statusMessage}</div>
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
    gridTemplateRows: "auto minmax(0, 1fr) auto auto",
    gap: "10px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  closeButton: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    border: "1px solid #d4deed",
    background: "#f8fbff",
    color: "#0f172a",
    fontSize: "22px",
    fontWeight: 700,
  },
  smallStatus: {
    color: "#475569",
    fontWeight: 800,
    fontSize: "14px",
  },
  stageCard: {
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    border: "1px solid #dbe4f0",
    boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
    padding: "12px",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    gap: "8px",
    minHeight: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(28px, 7vw, 42px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  faceStage: {
    position: "relative",
    borderRadius: "26px",
    overflow: "hidden",
    background: "linear-gradient(180deg, #101624 0%, #15203f 100%)",
    minHeight: "0",
    height: "100%",
    touchAction: "none",
    userSelect: "none",
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 28%",
    display: "block",
    userSelect: "none",
    WebkitUserDrag: "none",
  },
  timerBox: {
    position: "absolute",
    top: "12px",
    right: "12px",
    width: "74px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #0b1535 0%, #09112a 100%)",
    padding: "9px 8px",
    textAlign: "center",
    zIndex: 3,
  },
  timerLabel: {
    color: "#9dbdff",
    fontSize: "9px",
    letterSpacing: "0.22em",
    fontWeight: 900,
  },
  timerValue: {
    color: "#f7d548",
    fontWeight: 900,
    fontSize: "34px",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    textShadow: "0 0 16px rgba(247,213,72,0.2)",
  },
  foamDot: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.88)",
    boxShadow: "0 0 0 4px rgba(255,255,255,0.18)",
    pointerEvents: "none",
    zIndex: 2,
  },
  spotButton: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    border: "none",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: "10px",
    zIndex: 4,
  },
  legendRow: {
    display: "flex",
    gap: "10px 14px",
    alignItems: "center",
    flexWrap: "wrap",
    padding: "2px 4px 0",
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
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  toolButton: {
    borderRadius: "22px",
    border: "2px solid transparent",
    minHeight: "84px",
    padding: "12px",
    textAlign: "center",
  },
  toolLabel: {
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "4px",
  },
  toolSub: {
    fontSize: "13px",
    fontWeight: 700,
  },
  bottomHint: {
    borderRadius: "18px",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.4,
    wordBreak: "keep-all",
  },
};

export default GamePage;
