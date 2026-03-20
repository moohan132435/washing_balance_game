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
  wash: {
    label: "1단계 딥클렌징",
    sub: "문지르기",
    bg: "#f472b6",
    color: "#ffffff",
    border: "#f472b6",
  },
  moisture: {
    label: "2단계 수분/보습",
    sub: "터치",
    bg: "#67c8ff",
    color: "#ffffff",
    border: "#67c8ff",
  },
  barrier: {
    label: "3단계 피부장벽 강화",
    sub: "터치",
    bg: "#f49b72",
    color: "#ffffff",
    border: "#f49b72",
  },
};

const GUIDE_LINES = [
  "분홍 여드름은 1단계 딥클렌징으로 문질러 주세요.",
  "붉은 여드름은 2단계 수분/보습으로 먼저 진정시켜 주세요.",
  "진정된 붉은 여드름은 3단계 피부장벽 강화로 마무리해 주세요.",
];

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function buildSpotFromBlueprint(spot) {
  return {
    ...spot,
    treated: false,
    protected: false,
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
  if (score >= 94) return "단계를 잘 지켜서 빠르게 정리했어요.";
  if (score >= 78) return "전체 흐름은 좋았고 몇 번만 더 하면 더 익숙해져요.";
  if (score >= 56) return "단계만 조금 더 익히면 점수가 훨씬 올라가요.";
  return "서두르기보다 단계에 맞게 눌러 보는 연습이 필요해요.";
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
      if (spot.protected) {
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
        color: "rgba(103,200,255,0.95)",
        ring: "0 0 0 3px rgba(191,232,255,0.52)",
        border: "2px solid rgba(255,255,255,0.96)",
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

function persistResult(result) {
  localStorage.setItem("latestGameResult", JSON.stringify(result));
}

function GamePage() {
  const navigate = useNavigate();
  const faceStageRef = useRef(null);
  const lastRubAtRef = useRef(new Map());
  const finishedRef = useRef(false);
  const spawnIntervalRef = useRef(null);
  const timeLeftRef = useRef(TOTAL_TIME);

  const nickname = localStorage.getItem("nickname") || "PLAYER";
  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const [faceKey] = useState(() =>
    selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : "female",
  );
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selectedTool, setSelectedTool] = useState("wash");
  const [spots, setSpots] = useState(() => buildSpots());
  const [statusMessage, setStatusMessage] = useState(
    "분홍은 문지르기, 붉은 여드름은 2단계 후 3단계로 마무리해 주세요.",
  );
  const [foamPoints, setFoamPoints] = useState([]);
  const [showGuide, setShowGuide] = useState(true);
  const [isRubbing, setIsRubbing] = useState(false);

  const unresolvedCount = useMemo(() => spots.filter((spot) => !spot.resolved).length, [spots]);
  const faceSrc = FACE_SRC[faceKey] || FACE_SRC.female;

  const triggerFadeOut = (spotId) => {
    window.setTimeout(() => {
      setSpots((prev) => prev.map((spot) => (spot.id === spotId ? { ...spot, fading: true } : spot)));
    }, 40);
  };

  const finishGame = (currentSpots, remainingTime) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const { score, correct, partial, wrong, resolved } = computeScore(currentSpots, remainingTime);
    const resultType = getResultType(score);
    const nextResult = {
      nickname,
      score,
      grade: resultType,
      resultType,
      resultMessage: getResultMessage(score),
      scenarioSummary: `해결 ${resolved}/${currentSpots.length} · 오답 ${wrong}회`,
      ctaText: "와디즈 보러가기",
      careStats: {
        totalSpots: currentSpots.length,
        resolved,
        correct,
        partial,
        wrong,
      },
      currentAttemptAt: new Date().toISOString(),
    };

    persistResult(nextResult);
    navigate("/result", { replace: true, state: nextResult });
  };

  const spawnSpot = () => {
    setSpots((prev) => {
      const activeIds = new Set(prev.filter((spot) => !spot.fading && !spot.resolved).map((spot) => spot.id));
      const candidate = shuffle(SPOT_BLUEPRINTS).find((blueprint) => !activeIds.has(blueprint.id));
      if (!candidate) return prev;
      setStatusMessage("새 여드름이 올라왔어요. 색을 보고 맞는 단계로 처리해 주세요.");
      return [...prev, buildSpotFromBlueprint(candidate)];
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (finishedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
    if (!finishedRef.current && timeLeft === 0) {
      finishGame(spots, 0);
    }
  }, [timeLeft, spots]);

  useEffect(() => {
    if (!finishedRef.current && unresolvedCount === 0) {
      finishGame(spots, timeLeft);
    }
  }, [spots, unresolvedCount, timeLeft]);

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
              ? "분홍 여드름이 딥클렌징으로 정리됐어요."
              : "좋아요. 분홍 여드름을 한 번 더 문질러 마무리해 주세요.",
          );

          if (resolved) triggerFadeOut(spot.id);
          return nextSpot;
        }

        setStatusMessage("붉은 여드름은 문지르기보다 2단계 수분/보습이 먼저예요.");
        return {
          ...spot,
          wrongCount: spot.wrongCount + 1,
          actionLog: [...spot.actionLog, "wash"],
        };
      }),
    );
  };

  const handleRubStart = (event) => {
    if (showGuide || selectedTool !== "wash" || finishedRef.current || timeLeft === 0) return;
    setIsRubbing(true);
    applyWash(getPointerPosition(event, faceStageRef.current));
  };

  const handleRubMove = (event) => {
    if (showGuide || !isRubbing || selectedTool !== "wash" || finishedRef.current || timeLeft === 0) return;
    applyWash(getPointerPosition(event, faceStageRef.current));
  };

  const handleRubEnd = () => {
    setIsRubbing(false);
  };

  const handleSpotClick = (spotId) => {
    if (showGuide || finishedRef.current || timeLeft === 0 || selectedTool === "wash") return;

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
          if (selectedTool === "moisture") {
            if (spot.treated) {
              nextSpot.wrongCount += 1;
              nextMessage = "이미 2단계까지 완료했어요. 3단계 피부장벽 강화로 마무리해 주세요.";
              return nextSpot;
            }
            nextSpot.treated = true;
            nextMessage = "좋아요. 붉은 여드름을 진정 단계로 바꿨어요.";
            return nextSpot;
          }

          if (selectedTool === "barrier") {
            if (spot.treated) {
              nextSpot.protected = true;
              nextSpot.resolved = true;
              nextMessage = "피부장벽 강화까지 완료했어요. 여드름이 정리됐어요.";
              fadeTargetId = spot.id;
              return nextSpot;
            }
            nextSpot.wrongCount += 2;
            nextMessage = "붉은 여드름은 2단계 수분/보습을 먼저 터치해 주세요.";
            return nextSpot;
          }

          return nextSpot;
        }

        if (selectedTool === "moisture") {
          nextSpot.wrongCount += 1;
          nextMessage = "분홍 여드름은 2단계보다 1단계 딥클렌징이 더 잘 맞아요.";
          return nextSpot;
        }

        if (selectedTool === "barrier") {
          nextSpot.wrongCount += 1;
          nextMessage = "분홍 여드름은 3단계보다 먼저 문질러서 딥클렌징해 주세요.";
          return nextSpot;
        }

        return nextSpot;
      }),
    );

    if (fadeTargetId) triggerFadeOut(fadeTargetId);
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
          <div style={styles.stageHeader}>
            <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>
            <div style={styles.timerBox}>
              <div style={styles.timerLabel}>TIME</div>
              <div style={styles.timerValue}>{String(timeLeft).padStart(2, "0")}</div>
            </div>
          </div>

          <div style={styles.quickGuideRow}>
            <div style={{ ...styles.quickGuideChip, background: "#ffe4f1", color: "#a21c63" }}>분홍 = 문지르기</div>
            <div style={{ ...styles.quickGuideChip, background: "#ffe4e4", color: "#b91c1c" }}>붉음 = 2단계 → 3단계</div>
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
                  aria-label={spot.type === "inflamed" ? "붉은 여드름" : "분홍 여드름"}
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

            {showGuide && (
              <div style={styles.guideOverlay}>
                <div style={styles.guideCard}>
                  <div style={styles.guideTitle}>시작 전에 이것만 보면 돼요</div>
                  <div style={styles.guideList}>
                    {GUIDE_LINES.map((line) => (
                      <div key={line} style={styles.guideItem}>{line}</div>
                    ))}
                  </div>
                  <button
                    type="button"
                    style={styles.guideButton}
                    onClick={() => {
                      setShowGuide(false);
                      setStatusMessage("분홍은 문지르기, 붉은 여드름은 2단계 후 3단계로 마무리해 주세요.");
                    }}
                  >
                    바로 시작하기
                  </button>
                </div>
              </div>
            )}
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
                  border: `2px solid ${active ? "#1d4ed8" : meta.border}`,
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
  quickGuideRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  quickGuideChip: {
    borderRadius: "999px",
    padding: "7px 12px",
    fontWeight: 800,
    fontSize: "13px",
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
  guideOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15,23,42,0.46)",
    display: "grid",
    placeItems: "center",
    padding: "18px",
  },
  guideCard: {
    width: "100%",
    maxWidth: "320px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.97)",
    padding: "18px",
    boxShadow: "0 20px 48px rgba(15,23,42,0.2)",
    display: "grid",
    gap: "12px",
  },
  guideTitle: {
    fontSize: "22px",
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.2,
  },
  guideList: { display: "grid", gap: "10px" },
  guideItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "10px 12px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.4,
  },
  guideButton: {
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(90deg, #0f1c59 0%, #3b54e6 100%)",
    color: "#ffffff",
    padding: "14px 16px",
    fontWeight: 900,
    fontSize: "15px",
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
    padding: "16px 10px",
    minHeight: "102px",
    textAlign: "center",
  },
  toolLabel: {
    fontWeight: 900,
    fontSize: "18px",
    lineHeight: 1.2,
    wordBreak: "keep-all",
  },
  toolSub: {
    marginTop: "8px",
    fontWeight: 800,
    fontSize: "14px",
    opacity: 0.95,
  },
};

export default GamePage;
