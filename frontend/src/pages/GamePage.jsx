import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const FACE_SRC = {
  male: "/faces/male_face_game.png",
  female: "/faces/female_face_game.png",
};

const SPOT_BLUEPRINTS = [
  { id: "spot-1", x: 50, y: 40, type: "stage1" },
  { id: "spot-2", x: 42, y: 47, type: "stage2" },
  { id: "spot-3", x: 58, y: 47, type: "stage2" },
  { id: "spot-4", x: 47, y: 55, type: "stage1" },
  { id: "spot-5", x: 56, y: 58, type: "stage2" },
  { id: "spot-6", x: 41, y: 60, type: "stage1" },
  { id: "spot-7", x: 61, y: 60, type: "stage2" },
  { id: "spot-8", x: 51, y: 64, type: "stage1" },
];

const TOOL_META = {
  stage1: { label: "1단계", title: "딥클렌징", sub: "문지르기", bg: "#d97ab9", border: "#bb4f97", text: "#ffffff" },
  stage2: { label: "2단계", title: "수분/보습", sub: "터치", bg: "#82c6f5", border: "#5eaee3", text: "#ffffff" },
  stage3: { label: "3단계", title: "피부장벽 강화", sub: "터치", bg: "#e7a27b", border: "#d88457", text: "#ffffff" },
};

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function buildSpotFromBlueprint(spot) {
  return {
    ...spot,
    currentStage: spot.type,
    resolved: false,
    fading: false,
    wrongCount: 0,
    washCount: 0,
    actionLog: [],
  };
}

function buildSpots() {
  return shuffle(SPOT_BLUEPRINTS).slice(0, 3).map(buildSpotFromBlueprint);
}

function getResultType(score) {
  if (score >= 94) return "세안 밸런스 마스터";
  if (score >= 78) return "안정적인 케어형";
  if (score >= 56) return "조금만 더 익숙해지면";
  return "순서부터 익히는 중";
}

function getResultMessage(score) {
  if (score >= 94) return "단계를 거의 놓치지 않고 깔끔하게 마무리했어요.";
  if (score >= 78) return "큰 실수 없이 안정적으로 순서를 잘 맞췄어요.";
  if (score >= 56) return "조금만 더 익숙해지면 점수가 확 올라가요.";
  return "색과 순서를 한 번 더 보고 누르면 훨씬 좋아져요.";
}

function computeScore(spots, timeLeft) {
  let score = 22;
  let wrong = 0;
  let resolved = 0;

  spots.forEach((spot) => {
    wrong += spot.wrongCount;

    if (spot.resolved) {
      resolved += 1;
      score += spot.type === "stage1" ? 18 : 22;
    } else if (spot.type === "stage1" && spot.washCount >= 1) {
      score += 6;
    } else if (spot.type === "stage2" && spot.currentStage === "stage3") {
      score += 8;
    } else {
      score -= 8;
    }
  });

  score -= wrong * 8;
  score += Math.max(0, Math.min(4, timeLeft));
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, wrong, resolved };
}

function getSpotView(spot) {
  const fadedOpacity = spot.fading ? 0 : 1;
  const fadedScale = spot.fading ? 0.56 : 1;

  if (spot.resolved) {
    return {
      size: 11,
      hitSize: 26,
      color: "rgba(231,162,123,0.95)",
      ring: "0 0 0 3px rgba(255,229,213,0.92)",
      border: "2px solid rgba(255,255,255,0.96)",
      opacity: fadedOpacity,
      scale: fadedScale,
    };
  }

  if (spot.currentStage === "stage3") {
    return {
      size: 12,
      hitSize: 28,
      color: "rgba(231,162,123,0.96)",
      ring: "0 0 0 3px rgba(255,229,213,0.82)",
      border: "2px solid rgba(255,248,244,0.98)",
      opacity: 1,
      scale: 1,
    };
  }

  if (spot.currentStage === "stage2") {
    return {
      size: 12,
      hitSize: 28,
      color: "rgba(130,198,245,0.96)",
      ring: "0 0 0 3px rgba(226,243,255,0.9)",
      border: "2px solid rgba(255,255,255,0.98)",
      opacity: 1,
      scale: 1,
    };
  }

  return {
    size: 12,
    hitSize: 28,
    color: "rgba(217,122,185,0.96)",
    ring: "0 0 0 3px rgba(253,231,242,0.92)",
    border: "2px solid rgba(255,255,255,0.98)",
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
  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const nickname = localStorage.getItem("nickname") || "PLAYER";

  const [faceKey] = useState(() =>
    selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : "female"
  );
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selectedTool, setSelectedTool] = useState("stage1");
  const [spots, setSpots] = useState(() => buildSpots());
  const [statusMessage, setStatusMessage] = useState("분홍은 문지르기, 하늘은 2단계 터치, 살구는 3단계 터치.");
  const [foamPoints, setFoamPoints] = useState([]);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [isRubbing, setIsRubbing] = useState(false);

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
      setStatusMessage("새 세안 포인트가 생겼어요. 색에 맞는 단계로 처리해 주세요.");
      return [...prev, buildSpotFromBlueprint(candidate)];
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (finishedRef.current || isGuideOpen) return;
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isGuideOpen]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (finishedRef.current || isGuideOpen) return;

    if (timeLeft === 0 || unresolvedCount === 0) {
      finishedRef.current = true;
      const { score, wrong, resolved } = computeScore(spots, timeLeft);
      const resultType = getResultType(score);
      const payload = {
        nickname,
        score,
        grade: resultType,
        resultType,
        resultMessage: getResultMessage(score),
        scenarioSummary: `정리 ${resolved}/${spots.length} · 오답 ${wrong}회`,
        ctaText: "와디즈 보러가기",
        currentAttemptAt: new Date().toISOString(),
      };

      localStorage.setItem("lastGameResult", JSON.stringify(payload));
      navigate("/result", {
        replace: true,
        state: payload,
      });
    }
  }, [isGuideOpen, navigate, nickname, spots, timeLeft, unresolvedCount]);

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
      if (finishedRef.current || isGuideOpen || timeLeftRef.current <= 0) return;
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
  }, [isGuideOpen]);

  const applyStage1 = (position) => {
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
        if (spot.resolved || spot.currentStage !== "stage1") return spot;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        const lastRubAt = lastRubAtRef.current.get(spot.id) || 0;

        if (distance > 6 || Date.now() - lastRubAt < 120) return spot;
        lastRubAtRef.current.set(spot.id, Date.now());

        const nextWashCount = Math.min(2, spot.washCount + 1);
        const resolved = nextWashCount >= 2;
        const nextSpot = {
          ...spot,
          washCount: nextWashCount,
          resolved,
          actionLog: [...spot.actionLog, "stage1"],
        };

        setStatusMessage(resolved ? "분홍 포인트 정리 완료." : "좋아요. 한 번 더 문질러 마무리해 주세요.");

        if (resolved) triggerFadeOut(spot.id);
        return nextSpot;
      })
    );
  };

  const handleFacePointerDown = (event) => {
    if (isGuideOpen) return;
    if (selectedTool !== "stage1") return;
    setIsRubbing(true);
    applyStage1(getPointerPosition(event, faceStageRef.current));
  };

  const handleFacePointerMove = (event) => {
    if (isGuideOpen) return;
    if (!isRubbing || selectedTool !== "stage1") return;
    applyStage1(getPointerPosition(event, faceStageRef.current));
  };

  const handleFacePointerUp = () => {
    setIsRubbing(false);
  };

  const handleSpotPress = (spotId) => {
    if (isGuideOpen) return;
    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.id !== spotId || spot.resolved) return spot;

        if (spot.currentStage === "stage2") {
          if (selectedTool !== "stage2") {
            setStatusMessage("하늘 포인트는 2단계 수분/보습을 먼저 눌러 주세요.");
            return { ...spot, wrongCount: spot.wrongCount + 1 };
          }

          setStatusMessage("좋아요. 이제 살구 포인트가 됐어요. 3단계로 마무리해 주세요.");
          return {
            ...spot,
            currentStage: "stage3",
            actionLog: [...spot.actionLog, "stage2"],
          };
        }

        if (spot.currentStage === "stage3") {
          if (selectedTool !== "stage3") {
            setStatusMessage("살구 포인트는 3단계 피부장벽 강화로 마무리해 주세요.");
            return { ...spot, wrongCount: spot.wrongCount + 1 };
          }

          triggerFadeOut(spot.id);
          setStatusMessage("살구 포인트까지 깔끔하게 마무리했어요.");
          return {
            ...spot,
            resolved: true,
            actionLog: [...spot.actionLog, "stage3"],
          };
        }

        setStatusMessage("분홍 포인트는 버튼이 아니라 얼굴을 문질러서 처리해 주세요.");
        return { ...spot, wrongCount: spot.wrongCount + 1 };
      })
    );
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <button type="button" style={styles.backButton} onClick={() => navigate("/")}>✕</button>
          <div style={styles.topInfo}>남은 포인트 {unresolvedCount}개</div>
        </div>

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>이 부위, 어떻게 씻을까?</h1>
          </div>
          <div style={styles.timerBox}>
            <div style={styles.timerLabel}>TIME</div>
            <div style={styles.timerValue}>{String(timeLeft).padStart(2, "0")}</div>
          </div>
        </div>

        <div style={styles.tipRow}>
          <div style={{ ...styles.tipChip, background: "#fde7f2", color: "#b83280" }}>분홍 = 문지르기</div>
          <div style={{ ...styles.tipChip, background: "#e2f3ff", color: "#1f6fb2" }}>하늘 = 2단계 터치</div>
          <div style={{ ...styles.tipChip, background: "#ffe5d5", color: "#b85d2f" }}>살구 = 3단계 터치</div>
        </div>

        {isGuideOpen && (
          <div style={styles.guideOverlay}>
            <div style={styles.guideCard}>
              <div style={styles.guideTitle}>시작 전에 이것만 보면 돼요</div>
              <div style={styles.guideLine}>분홍은 문지르기</div>
              <div style={styles.guideLine}>하늘은 2단계 터치</div>
              <div style={styles.guideLine}>살구는 3단계 터치</div>
              <button type="button" style={styles.guideButton} onClick={() => setIsGuideOpen(false)}>바로 시작하기</button>
            </div>
          </div>
        )}

        <div
          ref={faceStageRef}
          style={styles.faceFrame}
          onMouseDown={handleFacePointerDown}
          onMouseMove={handleFacePointerMove}
          onMouseUp={handleFacePointerUp}
          onMouseLeave={handleFacePointerUp}
          onTouchStart={handleFacePointerDown}
          onTouchMove={handleFacePointerMove}
          onTouchEnd={handleFacePointerUp}
        >
          <img src={faceSrc} alt="game face" style={styles.faceImage} draggable={false} />

          {spots.map((spot) => {
            const view = getSpotView(spot);
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleSpotPress(spot.id)}
                style={{
                  ...styles.spot,
                  width: `${view.hitSize}px`,
                  height: `${view.hitSize}px`,
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  opacity: view.opacity,
                  transform: `translate(-50%, -50%) scale(${view.scale})`,
                  boxShadow: view.ring,
                  pointerEvents: spot.fading ? "none" : "auto",
                }}
              >
                <span
                  style={{
                    width: `${view.size}px`,
                    height: `${view.size}px`,
                    borderRadius: "999px",
                    background: view.color,
                    border: view.border,
                    display: "block",
                  }}
                />
              </button>
            );
          })}

          {foamPoints.map((point) => (
            <span
              key={point.id}
              style={{
                ...styles.foam,
                left: `${point.x}%`,
                top: `${point.y}%`,
              }}
            />
          ))}
        </div>

        <div style={styles.statusBox}>{statusMessage}</div>

        <div style={styles.toolGrid}>
          {Object.entries(TOOL_META).map(([toolKey, meta]) => {
            const active = selectedTool === toolKey;
            return (
              <button
                key={toolKey}
                type="button"
                onClick={() => setSelectedTool(toolKey)}
                style={{
                  ...styles.toolButton,
                  background: meta.bg,
                  borderColor: active ? "#3158d8" : meta.border,
                  boxShadow: active ? "0 0 0 4px rgba(49,88,216,0.16)" : "none",
                  transform: active ? "translateY(-2px)" : "none",
                }}
              >
                <div style={{ ...styles.toolLabel, color: meta.text }}>{meta.label}</div>
                <div style={{ ...styles.toolTitle, color: meta.text }}>{meta.title}</div>
                <div style={{ ...styles.toolSub, color: meta.text }}>{meta.sub}</div>
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
    background: "linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%)",
    padding: "10px",
    boxSizing: "border-box",
  },
  card: {
    width: "min(520px, calc(100vw - 20px))",
    margin: "0 auto",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "30px",
    padding: "16px",
    boxShadow: "0 20px 48px rgba(15,23,42,0.1)",
    border: "1px solid rgba(219,228,240,0.9)",
    display: "grid",
    gap: "14px",
    position: "relative",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: "58px",
    height: "58px",
    borderRadius: "20px",
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: 900,
  },
  topInfo: {
    color: "#334155",
    fontWeight: 900,
    fontSize: "18px",
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "12px",
    alignItems: "start",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(34px, 10vw, 58px)",
    lineHeight: 0.95,
    letterSpacing: "-0.06em",
    fontWeight: 900,
    wordBreak: "keep-all",
  },
  timerBox: {
    minWidth: "118px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    padding: "12px 14px",
    textAlign: "center",
  },
  timerLabel: {
    fontSize: "11px",
    fontWeight: 900,
    color: "#c7d2fe",
    letterSpacing: "0.22em",
  },
  timerValue: {
    fontSize: "44px",
    lineHeight: 1,
    fontWeight: 900,
    marginTop: "4px",
    color: "#f8e77c",
  },
  tipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  tipChip: {
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "13px",
  },
  guideOverlay: {
    position: "absolute",
    inset: "120px 16px auto 16px",
    zIndex: 10,
  },
  guideCard: {
    background: "rgba(255,255,255,0.97)",
    borderRadius: "28px",
    padding: "18px",
    border: "1px solid #dbe4f0",
    boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
    display: "grid",
    gap: "12px",
  },
  guideTitle: {
    color: "#0f172a",
    fontSize: "20px",
    fontWeight: 900,
    textAlign: "center",
  },
  guideLine: {
    minHeight: "54px",
    borderRadius: "18px",
    border: "1px solid #dbe4f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
    color: "#334155",
    fontWeight: 900,
    fontSize: "18px",
    background: "#ffffff",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  guideButton: {
    width: "100%",
    minHeight: "62px",
    border: "none",
    borderRadius: "22px",
    background: "linear-gradient(90deg, #24348f 0%, #4760ea 100%)",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 900,
  },
  faceFrame: {
    position: "relative",
    borderRadius: "28px",
    overflow: "hidden",
    background: "#d2d7de",
    aspectRatio: "1 / 1.06",
    touchAction: "none",
    userSelect: "none",
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  spot: {
    position: "absolute",
    border: "none",
    background: "transparent",
    padding: 0,
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    transition: "transform 0.18s ease, opacity 0.2s ease",
  },
  foam: {
    position: "absolute",
    width: "18px",
    height: "18px",
    borderRadius: "999px",
    transform: "translate(-50%, -50%)",
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 0 0 2px rgba(255,255,255,0.5), 0 6px 12px rgba(255,255,255,0.45)",
    pointerEvents: "none",
  },
  statusBox: {
    borderRadius: "22px",
    background: "#0f172a",
    color: "#ffffff",
    padding: "18px 16px",
    fontSize: "16px",
    lineHeight: 1.45,
    fontWeight: 800,
    wordBreak: "keep-all",
    minHeight: "84px",
    display: "flex",
    alignItems: "center",
  },
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },
  toolButton: {
    minHeight: "154px",
    borderRadius: "28px",
    border: "3px solid transparent",
    padding: "14px 10px",
    display: "grid",
    alignContent: "center",
    gap: "8px",
  },
  toolLabel: {
    fontSize: "18px",
    fontWeight: 900,
    textAlign: "center",
  },
  toolTitle: {
    fontSize: "18px",
    lineHeight: 1.15,
    fontWeight: 900,
    textAlign: "center",
    wordBreak: "keep-all",
  },
  toolSub: {
    fontSize: "14px",
    fontWeight: 800,
    textAlign: "center",
  },
};

export default GamePage;
