import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const FACE_SRC = {
  male: "/faces/male_face_game.png",
  female: "/faces/female_face_game.png",
};

const SPOT_BLUEPRINTS = [
  { id: "spot-1", x: 50, y: 40, type: "inflamed" },
  { id: "spot-2", x: 42, y: 47, type: "nonInflamed" },
  { id: "spot-3", x: 58, y: 47, type: "inflamed" },
  { id: "spot-4", x: 47, y: 55, type: "nonInflamed" },
  { id: "spot-5", x: 56, y: 58, type: "inflamed" },
  { id: "spot-6", x: 41, y: 60, type: "nonInflamed" },
  { id: "spot-7", x: 61, y: 60, type: "nonInflamed" },
  { id: "spot-8", x: 51, y: 64, type: "inflamed" },
];

const TOOL_META = {
  wash: { label: "세안", sub: "분홍 트러블", bg: "#f472b6", color: "#ffffff", border: "#f472b6" },
  ointment: { label: "연고", sub: "붉은 트러블", bg: "#ef4444", color: "#ffffff", border: "#ef4444" },
  patch: { label: "패치", sub: "진정 마무리", bg: "#f59e0b", color: "#111827", border: "#f59e0b" },
};

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function buildSpotFromBlueprint(spot) {
  return {
    ...spot,
    stage: spot.type === "inflamed" ? "inflamed" : "nonInflamed",
    treated: false,
    patched: false,
    resolved: false,
    fading: false,
    wrongCount: 0,
    squeezeCount: 0,
    washProgress: 0,
    actionLog: [],
  };
}

function buildSpots() {
  return shuffle(SPOT_BLUEPRINTS).slice(0, 3).map(buildSpotFromBlueprint);
}

function getResultType(score) {
  if (score >= 94) return "피부 응급처치 마스터";
  if (score >= 78) return "침착한 진정형";
  if (score >= 56) return "조금만 더 관찰형";
  return "손부터 가는 압출형";
}

function getResultMessage(score) {
  if (score >= 94) return "상태를 보고 맞는 케어를 거의 놓치지 않았어요.";
  if (score >= 78) return "큰 실수 없이 안정적으로 관리했어요.";
  if (score >= 56) return "조금만 더 보고 고르면 점수가 더 올라가요.";
  return "건드리기 전에 한 번 더 보는 습관이 필요해요.";
}

function computeScore(spots, timeLeft) {
  let score = 8;
  let correct = 0;
  let partial = 0;
  let wrong = 0;
  let resolved = 0;

  spots.forEach((spot) => {
    wrong += spot.wrongCount;

    if (spot.type === "inflamed") {
      if (spot.treated) {
        score += 4;
        partial += 1;
      }
      if (spot.patched) {
        score += 10;
        correct += 1;
      }
      if (spot.resolved) {
        resolved += 1;
        score += 3;
      } else {
        score -= 8;
      }
    } else {
      if (spot.resolved) {
        score += 11;
        correct += 1;
        resolved += 1;
      } else if (spot.washProgress >= 1) {
        score += 2;
        partial += 1;
        score -= 4;
      } else {
        score -= 7;
      }
    }

    if (spot.squeezeCount > 0) {
      score -= spot.squeezeCount * 6;
    }
  });

  score -= wrong * 11;
  score -= Math.max(0, spots.length - resolved) * 3;
  score += Math.max(0, Math.min(2, Math.floor(timeLeft / 4)));
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, correct, partial, wrong, resolved };
}

function getSpotView(spot) {
  const fadedOpacity = spot.fading ? 0 : 1;
  const fadedScale = spot.fading ? 0.52 : 1;

  if (spot.resolved) {
    return {
      size: 10,
      hitSize: 24,
      color: "rgba(59,130,246,0.94)",
      ring: "0 0 0 2px rgba(191,219,254,0.5)",
      border: "2px solid rgba(255,255,255,0.9)",
      opacity: fadedOpacity,
      scale: fadedScale,
    };
  }

  if (spot.type === "inflamed") {
    if (spot.treated) {
      return {
        size: 11,
        hitSize: 26,
        color: "rgba(245,158,11,0.95)",
        ring: "0 0 0 3px rgba(253,230,138,0.45)",
        border: "2px solid rgba(255,251,235,0.95)",
        opacity: 1,
        scale: 1,
      };
    }

    return {
      size: 12,
      hitSize: 28,
      color: "rgba(239,68,68,0.95)",
      ring: "0 0 0 3px rgba(254,202,202,0.46)",
      border: "2px solid rgba(255,241,242,0.96)",
      opacity: 1,
      scale: 1,
    };
  }

  if (spot.washProgress >= 1) {
    return {
      size: 10,
      hitSize: 24,
      color: "rgba(244,114,182,0.82)",
      ring: "0 0 0 3px rgba(251,207,232,0.4)",
      border: "2px solid rgba(255,255,255,0.95)",
      opacity: 1,
      scale: 0.86,
    };
  }

  return {
    size: 11,
    hitSize: 26,
    color: "rgba(244,114,182,0.95)",
    ring: "0 0 0 3px rgba(251,207,232,0.44)",
    border: "2px solid rgba(255,255,255,0.95)",
    opacity: 1,
    scale: 1,
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
  const finishedRef = useRef(false);
  const spawnIntervalRef = useRef(null);
  const timeLeftRef = useRef(TOTAL_TIME);
  const [isRubbing, setIsRubbing] = useState(false);
  const nickname = localStorage.getItem("nickname") || "PLAYER";
  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const [faceKey] = useState(() =>
    selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : "female"
  );
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selectedTool, setSelectedTool] = useState("wash");
  const [spots, setSpots] = useState(() => buildSpots());
  const [statusMessage, setStatusMessage] = useState(
    "세안은 얼굴을 문질러서, 연고·패치는 스팟을 눌러서 진행해보세요."
  );
  const [foamPoints, setFoamPoints] = useState([]);

  const unresolvedCount = useMemo(() => spots.filter((spot) => !spot.resolved).length, [spots]);
  const faceSrc = FACE_SRC[faceKey] || FACE_SRC.female;

  const triggerFadeOut = (spotId) => {
    window.setTimeout(() => {
      setSpots((prev) => prev.map((spot) => (spot.id === spotId ? { ...spot, fading: true } : spot)));
    }, 40);
  };

  const spawnSpot = () => {
    setSpots((prev) => {
      const activeIds = new Set(prev.filter((spot) => !spot.fading && !spot.resolved).map((spot) => spot.id));
      const candidate = shuffle(SPOT_BLUEPRINTS).find((blueprint) => !activeIds.has(blueprint.id));
      if (!candidate) return prev;
      setStatusMessage("새 트러블이 올라왔어요. 테두리 있는 스팟을 눌러 빠르게 정리해보세요.");
      return [...prev, buildSpotFromBlueprint(candidate)];
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (finishedRef.current) return;
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

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
          currentAttemptAt: new Date().toISOString(),
        },
      });
    }
  }, [navigate, nickname, spots, timeLeft, unresolvedCount]);

  useEffect(() => {
    if (!foamPoints.length) return undefined;

    const timer = window.setTimeout(() => {
      const now = Date.now();
      setFoamPoints((prev) => prev.filter((point) => point.expiresAt > now));
    }, 80);

    return () => window.clearTimeout(timer);
  }, [foamPoints]);

  useEffect(() => {
    if (spawnIntervalRef.current) {
      window.clearInterval(spawnIntervalRef.current);
    }

    spawnIntervalRef.current = window.setInterval(() => {
      if (finishedRef.current || timeLeftRef.current <= 0) return;
      if (Math.random() < 0.88) {
        spawnSpot();
      }
    }, 2000);

    return () => {
      if (spawnIntervalRef.current) {
        window.clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, []);

  const applyWash = (position) => {
    if (!position) return;

    const faceCenterX = 50;
    const faceCenterY = 57;
    const faceRadiusX = 18;
    const faceRadiusY = 27;
    const normX = (position.x - faceCenterX) / faceRadiusX;
    const normY = (position.y - faceCenterY) / faceRadiusY;
    const insideFace = normX * normX + normY * normY <= 1;

    if (!insideFace) return;

    setFoamPoints((prev) => [
      ...prev.filter((point) => point.expiresAt > Date.now()).slice(-10),
      { ...position, id: `${Date.now()}-${Math.random()}`, expiresAt: Date.now() + 220 },
    ]);

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.resolved) return spot;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        const lastRubAt = lastRubAtRef.current.get(spot.id) || 0;

        if (distance > 6 || Date.now() - lastRubAt < 120) return spot;
        lastRubAtRef.current.set(spot.id, Date.now());

        if (spot.type === "nonInflamed") {
          const nextProgress = Math.min(2, spot.washProgress + 1);
          const resolved = nextProgress >= 2;
          const nextSpot = {
            ...spot,
            actionLog: [...spot.actionLog, "wash"],
            washProgress: nextProgress,
            resolved,
          };

          setStatusMessage(
            resolved
              ? "분홍 트러블이 세안으로 정리됐어요."
              : "좋아요. 분홍 스팟을 한 번 더 문질러 마무리해보세요."
          );
          if (resolved) triggerFadeOut(spot.id);
          return nextSpot;
        }

        setStatusMessage("붉은 화농성은 세안만으로 해결되지 않아요. 빨간 연고 버튼을 먼저 써보세요.");
        return {
          ...spot,
          wrongCount: spot.wrongCount + 1,
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
    let fadeTargetId = null;

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
              nextSpot.wrongCount += 1;
              nextMessage = "이미 연고 단계예요. 노란 패치 버튼으로 마무리해보세요.";
              return nextSpot;
            }
            nextSpot.treated = true;
            nextMessage = "좋아요. 붉은 화농성을 진정 단계로 바꿨어요.";
            return nextSpot;
          }

          if (selectedTool === "patch") {
            if (spot.treated) {
              nextSpot.patched = true;
              nextSpot.resolved = true;
              nextMessage = "패치까지 완료! 트러블이 정리됐어요.";
              fadeTargetId = spot.id;
              return nextSpot;
            }
            nextSpot.wrongCount += 2;
            nextMessage = "붉은 스팟은 먼저 빨간 연고 버튼으로 진정시켜주세요.";
            return nextSpot;
          }

          return nextSpot;
        }

        if (selectedTool === "ointment") {
          nextSpot.wrongCount += 1;
          nextMessage = "분홍 비화농성은 연고보다 세안이 더 잘 맞아요.";
          return nextSpot;
        }

        if (selectedTool === "patch") {
          nextSpot.wrongCount += 1;
          nextMessage = "분홍 비화농성은 패치보다 세안이 먼저예요.";
          return nextSpot;
        }

        return nextSpot;
      })
    );

    if (fadeTargetId) triggerFadeOut(fadeTargetId);
    if (nextMessage) setStatusMessage(nextMessage);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.topRow}>
          <button type="button" style={styles.closeButton} onClick={() => navigate("/")}>
            ✕
          </button>
          <div style={styles.smallStatus}>남은 트러블 {unresolvedCount}개</div>
        </div>

        <div style={styles.stageCard}>
          <div style={styles.stageHeader}>
            <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>
            <div style={styles.timerBox}>
              <div style={styles.timerLabel}>TIME</div>
              <div style={styles.timerValue}>{String(timeLeft).padStart(2, "0")}</div>
            </div>
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
                      border: view.border,
                      opacity: view.opacity,
                      transform: `translate(-50%, -50%) scale(${view.scale})`,
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div style={styles.legendRow}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: "#ef4444" }} /> 화농성
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: "#f472b6" }} /> 비화농성
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: "#3b82f6" }} /> 해결됨
            </div>
          </div>

          <div style={styles.bottomHint}>{statusMessage}</div>
        </div>

        <div style={styles.toolGrid}>
          {Object.entries(TOOL_META).map(([key, meta]) => {
            const active = selectedTool === key;
            return (
              <button
                key={key}
                type="button"
                style={{
                  ...styles.toolButton,
                  background: meta.bg,
                  color: meta.color,
                  border: `2px solid ${active ? "#3b63e6" : meta.border}`,
                  boxShadow: active ? "0 12px 24px rgba(59,99,230,0.18)" : "none",
                }}
                onClick={() => setSelectedTool(key)}
              >
                <div style={styles.toolLabel}>{meta.label}</div>
                <div style={styles.toolSub}>{meta.sub}</div>
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
    gridTemplateRows: "auto minmax(0, 1fr) auto",
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
    fontWeight: 900,
  },
  smallStatus: {
    flex: 1,
    textAlign: "right",
    color: "#475569",
    fontWeight: 800,
    fontSize: "15px",
  },
  stageCard: {
    background: "rgba(255,255,255,0.98)",
    borderRadius: "28px",
    border: "1px solid #dae4f0",
    boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
    padding: "14px",
    display: "grid",
    gap: "10px",
  },
  stageHeader: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "start",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontWeight: 900,
    fontSize: "clamp(28px, 7vw, 44px)",
    letterSpacing: "-0.05em",
    lineHeight: 1.02,
  },
  timerBox: {
    minWidth: "92px",
    borderRadius: "22px",
    padding: "10px 12px",
    background: "linear-gradient(180deg, #0b1434 0%, #0f172a 100%)",
    textAlign: "center",
    boxShadow: "0 14px 28px rgba(15,23,42,0.22)",
  },
  timerLabel: {
    color: "#9db6ff",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.28em",
  },
  timerValue: {
    color: "#f8d94c",
    fontSize: "40px",
    fontWeight: 900,
    lineHeight: 1,
    marginTop: "2px",
    fontVariantNumeric: "tabular-nums",
  },
  faceStage: {
    position: "relative",
    minHeight: "360px",
    borderRadius: "28px",
    overflow: "hidden",
    background: "linear-gradient(180deg, #dcdcdc 0%, #cfcfcf 100%)",
    userSelect: "none",
    touchAction: "none",
  },
  faceImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
  },
  foamDot: {
    position: "absolute",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 30% 30%, #ffffff 0%, #ffffff 35%, rgba(255,255,255,0.68) 60%, rgba(255,255,255,0) 100%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    boxShadow: "0 0 8px rgba(255,255,255,0.65)",
  },
  spotButton: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },
  spotVisual: {
    position: "absolute",
    left: "50%",
    top: "50%",
    borderRadius: "999px",
    transition: "transform 220ms ease, opacity 220ms ease, background 220ms ease, box-shadow 220ms ease",
  },
  legendRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    color: "#475569",
    fontWeight: 700,
    fontSize: "13px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  bottomHint: {
    borderRadius: "18px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#ffffff",
    padding: "14px 16px",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.45,
  },
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
  },
  toolButton: {
    borderRadius: "24px",
    padding: "18px 12px",
    minHeight: "98px",
    textAlign: "center",
  },
  toolLabel: {
    fontWeight: 900,
    fontSize: "26px",
    lineHeight: 1,
  },
  toolSub: {
    marginTop: "8px",
    fontWeight: 700,
    fontSize: "15px",
    opacity: 0.88,
  },
};

export default GamePage;
