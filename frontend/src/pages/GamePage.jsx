import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const FACE_SRC = {
  male: "/faces/male_face_game.png",
  female: "/faces/female_face_game.png",
};

const SPOT_BLUEPRINTS = [
  { id: "spot-1", x: 49, y: 35, type: "inflamed" },
  { id: "spot-2", x: 39, y: 42, type: "nonInflamed" },
  { id: "spot-3", x: 59, y: 45, type: "inflamed" },
  { id: "spot-4", x: 45, y: 54, type: "nonInflamed" },
  { id: "spot-5", x: 56, y: 58, type: "inflamed" },
  { id: "spot-6", x: 41, y: 60, type: "nonInflamed" },
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
      squeezeCount: 0,
      washProgress: 0,
      actionLog: [],
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
      size: 10,
      hitSize: 26,
      color: "rgba(59,130,246,0.95)",
      ring: "0 0 0 3px rgba(191,219,254,0.45)",
      label: "✓",
      textColor: "#ffffff",
    };
  }

  if (spot.type === "inflamed") {
    if (spot.patched) {
      return {
        size: 14,
        hitSize: 28,
        color: "rgba(59,130,246,0.98)",
        ring: "0 0 0 3px rgba(147,197,253,0.38)",
        label: "",
        textColor: "#ffffff",
      };
    }
    if (spot.treated) {
      return {
        size: 13,
        hitSize: 28,
        color: "rgba(245,158,11,0.95)",
        ring: "0 0 0 3px rgba(253,230,138,0.34)",
        label: "",
        textColor: "#ffffff",
      };
    }
    return {
      size: 14,
      hitSize: 30,
      color: "rgba(239,68,68,0.94)",
      ring: "0 0 0 3px rgba(254,202,202,0.35)",
      label: "",
      textColor: "#ffffff",
    };
  }

  if (spot.washProgress >= 1) {
    return {
      size: 11,
      hitSize: 26,
      color: "rgba(250,204,21,0.9)",
      ring: "0 0 0 3px rgba(254,240,138,0.26)",
      label: "",
      textColor: "#111827",
    };
  }

  return {
    size: 13,
    hitSize: 28,
    color: "rgba(245,158,11,0.92)",
    ring: "0 0 0 3px rgba(254,240,138,0.28)",
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
  const lastRubAtRef = useRef(new Map());
  const [isRubbing, setIsRubbing] = useState(false);
  const nickname = localStorage.getItem("nickname") || "PLAYER";
  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const [faceKey] = useState(() => (selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : "female"));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selectedTool, setSelectedTool] = useState("wash");
  const [spots, setSpots] = useState(() => buildSpots());
  const [statusMessage, setStatusMessage] = useState("세안은 얼굴을 문질러서, 연고·패치·압출은 스팟을 눌러서 진행해보세요.");
  const finishedRef = useRef(false);
  const [foamPoints, setFoamPoints] = useState([]);

  const unresolvedCount = useMemo(() => spots.filter((spot) => !spot.resolved).length, [spots]);
  const faceSrc = FACE_SRC[faceKey] || FACE_SRC.female;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (finishedRef.current) return;

      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
  if (finishedRef.current) return;

  if (timeLeft === 0 || unresolvedCount === 0) {
    finishedRef.current = true;

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
      },
    });
  }
}, [timeLeft, unresolvedCount, spots, nickname, navigate]);

  useEffect(() => {
    if (!foamPoints.length) return undefined;
    const timer = window.setTimeout(() => {
      setFoamPoints((prev) => prev.slice(-8));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [foamPoints]);

  const applyWash = (position) => {
    if (!position) return;

    const faceCenterX = 50;
    const faceCenterY = 56;
    const faceRadiusX = 19;
    const faceRadiusY = 28;
    const normX = (position.x - faceCenterX) / faceRadiusX;
    const normY = (position.y - faceCenterY) / faceRadiusY;
    const insideFace = normX * normX + normY * normY <= 1;

    if (!insideFace) return;

    setFoamPoints((prev) => [...prev.slice(-12), { ...position, id: `${Date.now()}-${Math.random()}` }]);

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.resolved) return spot;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        const lastKey = `${spot.id}`;
        const lastRubAt = lastRubAtRef.current.get(lastKey) || 0;

        if (distance > 6 || Date.now() - lastRubAt < 140) return spot;
        lastRubAtRef.current.set(lastKey, Date.now());

        if (spot.type === "nonInflamed") {
          const nextProgress = Math.min(2, spot.washProgress + 1);
          const nextSpot = {
            ...spot,
            actionLog: [...spot.actionLog, "wash"],
            washProgress: nextProgress,
            resolved: nextProgress >= 2,
          };
          setStatusMessage(nextProgress >= 2 ? "비화농성 트러블이 세안으로 정리됐어요." : "좋아요. 거품으로 한 번 더 부드럽게 문질러보세요.");
          return nextSpot;
        }

        setStatusMessage("붉은 화농성은 세안만으로 해결되지 않아요. 연고나 패치를 써보세요.");
        return {
          ...spot,
          actionLog: [...spot.actionLog, "wash"],
        };
      })
    );
  };

  const handleRubStart = (event) => {
    if (selectedTool !== "wash" || finishedRef.current || timeLeft === 0) return;
    setIsRubbing(true);
    applyWash(getPointerPosition(event, faceStageRef.current));
  };

  const handleRubMove = (event) => {
    if (!isRubbing || selectedTool !== "wash" || finishedRef.current || timeLeft === 0) return;
    applyWash(getPointerPosition(event, faceStageRef.current));
  };

  const handleRubEnd = () => {
    setIsRubbing(false);
  };

  const handleSpotClick = (spotId) => {
    if (finishedRef.current || timeLeft === 0 || selectedTool === "wash") return;

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
            if (spot.treated) {
              nextMessage = "이미 연고로 진정 중이에요. 패치로 마무리해보세요.";
              return spot;
            }
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
            nextMessage = "화농성은 패치 전에 연고로 먼저 진정시켜보세요.";
            return nextSpot;
          }

          if (selectedTool === "squeeze") {
            nextSpot.wrongCount += 1;
            nextSpot.squeezeCount += 1;
            nextMessage = "붉은 화농성은 바로 압출하기보다 진정부터 보는 편이 좋아요.";
            return nextSpot;
          }

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

        if (selectedTool === "squeeze") {
          nextSpot.wrongCount += 1;
          nextMessage = "비화농성도 압출보다 세안으로 정리해보세요.";
          return nextSpot;
        }

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
          <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>

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
                    width: `${view.hitSize}px`,
                    height: `${view.hitSize}px`,
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                  }}
                  aria-label={spot.type === "inflamed" ? "화농성 트러블" : "비화농성 트러블"}
                >
                  <span
                    style={{
                      ...styles.spotVisual,
                      width: `${view.size}px`,
                      height: `${view.size}px`,
                      background: view.color,
                      boxShadow: view.ring,
                      color: view.textColor,
                    }}
                  >
                    {view.label}
                  </span>
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
                onClick={() => {
                  setSelectedTool(key);
                  setStatusMessage(key === "wash" ? "세안 모드예요. 얼굴 위 트러블 부근을 직접 문질러보세요." : `${meta.label} 선택됨. 스팟을 눌러 관리해보세요.`);
                }}
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
    width: "44px",
    height: "44px",
    borderRadius: "14px",
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
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(24px, 6.4vw, 38px)",
    lineHeight: 1.05,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  faceStage: {
    position: "relative",
    borderRadius: "26px",
    overflow: "hidden",
    background: "linear-gradient(180deg, #101624 0%, #15203f 100%)",
    minHeight: 0,
    height: "100%",
    touchAction: "none",
    userSelect: "none",
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 24%",
    display: "block",
    userSelect: "none",
    WebkitUserDrag: "none",
  },
  timerBox: {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "66px",
    borderRadius: "16px",
    background: "linear-gradient(180deg, #0b1535 0%, #09112a 100%)",
    padding: "8px 6px",
    textAlign: "center",
    zIndex: 5,
  },
  timerLabel: {
    color: "#9dbdff",
    fontSize: "8px",
    letterSpacing: "0.22em",
    fontWeight: 900,
  },
  timerValue: {
    color: "#f7d548",
    fontWeight: 900,
    fontSize: "30px",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    textShadow: "0 0 16px rgba(247,213,72,0.2)",
  },
  foamDot: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 0 0 3px rgba(255,255,255,0.18)",
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
    background: "transparent",
    padding: 0,
    zIndex: 6,
  },
  spotVisual: {
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: "9px",
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
    minHeight: "82px",
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
