import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const FEVER_TIME_THRESHOLD = 3;
const COMBO_WINDOW_MS = 1300;
const FLOAT_LIFETIME_MS = 820;
const RAGE_STAGE_UP_MS = 1900;

const FACE_SRC = {
  male: "/faces/male_face_game.png",
  female: "/faces/female_face_game.png",
};

const SPOT_BLUEPRINTS = [
  { id: "spot-1", x: 50, y: 40 },
  { id: "spot-2", x: 42, y: 47 },
  { id: "spot-3", x: 58, y: 47 },
  { id: "spot-4", x: 47, y: 55 },
  { id: "spot-5", x: 56, y: 58 },
  { id: "spot-6", x: 41, y: 60 },
  { id: "spot-7", x: 61, y: 60 },
  { id: "spot-8", x: 51, y: 64 },
];

const STAGE_KEYS = ["stage1", "stage2", "stage3"];
const VARIANT_KEYS = ["normal", "golden", "bubble", "rage", "trap"];

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

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function pickRandomStage() {
  const roll = Math.random();
  if (roll < 0.4) return "stage1";
  if (roll < 0.78) return "stage2";
  return "stage3";
}

function pickRandomVariant(isFever) {
  const roll = Math.random();

  if (isFever) {
    if (roll < 0.2) return "golden";
    if (roll < 0.34) return "bubble";
    if (roll < 0.46) return "rage";
    if (roll < 0.53) return "trap";
    return "normal";
  }

  if (roll < 0.12) return "golden";
  if (roll < 0.22) return "bubble";
  if (roll < 0.3) return "rage";
  if (roll < 0.35) return "trap";
  return "normal";
}

function getVariantReward(variant) {
  if (variant === "golden") return 18;
  if (variant === "bubble") return 12;
  if (variant === "rage") return 10;
  if (variant === "trap") return 8;
  return 0;
}

function buildSpotFromBlueprint(spot, options = {}) {
  const { forcedStage, isFever = false } = options;
  const variant = options.variant || pickRandomVariant(isFever);
  const initialStage = forcedStage || pickRandomStage();
  const now = nowMs();

  return {
    ...spot,
    spawnKey: makeClientId(spot.id),
    type: initialStage,
    currentStage: initialStage,
    variant,
    resolved: false,
    fading: false,
    wrongCount: 0,
    washCount: 0,
    actionLog: [],
    bornAt: now,
    stageDeadlineAt: variant === "rage" ? now + RAGE_STAGE_UP_MS : null,
    bonusReward: getVariantReward(variant),
    trapMissArmed: variant === "trap",
    feverSpawned: isFever,
  };
}


function nowMs() {
  return Date.now();
}

function makeClientId(prefix = "fx") {
  return `${prefix}-${nowMs()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSpots(isFever = false) {
  return shuffle(SPOT_BLUEPRINTS)
    .slice(0, 3)
    .map((spot) => buildSpotFromBlueprint(spot, { isFever }));
}

function getResultType(score) {
  if (score >= 165) return "세안 밸런스 레전드";
  if (score >= 135) return "세안 밸런스 마스터";
  if (score >= 105) return "안정적인 케어형";
  if (score >= 80) return "조금만 더 익숙해지면";
  return "순서부터 익히는 중";
}

function getResultMessage(score) {
  if (score >= 165) return "콤보와 특수 포인트까지 거의 완벽하게 챙겼어요.";
  if (score >= 135) return "실수는 적고 템포는 빠르게, 상위권 플레이였어요.";
  if (score >= 105) return "흐름을 잘 타기 시작했어요. 조금만 더 다듬으면 고득점권이에요.";
  if (score >= 80) return "한두 번만 더 익히면 랭킹 경쟁이 가능한 점수대예요.";
  return "분홍은 문지르기, 하늘/살구는 클릭 순서를 더 익히면 점수가 빠르게 올라가요.";
}

function computeScore(stats, timeLeft, activeSpots = []) {
  const unresolved = activeSpots.filter((spot) => !spot.resolved && !spot.fading).length;
  const totalSpawned = Math.max(stats.totalSpawned, 1);
  const totalResolved = stats.stage1Resolved + stats.stage23Resolved;
  const clearRate = totalResolved / totalSpawned;

  let score = 78;
  score += stats.stage1Resolved * 14;
  score += stats.stage23Resolved * 24;
  score += stats.goldenResolved * 16;
  score += stats.bubbleResolved * 11;
  score += stats.rageResolved * 13;
  score += stats.trapResolved * 9;
  score += stats.chainExplosions * 8;
  score += stats.comboBonus;
  score += stats.bestCombo * 5;
  score += Math.round(clearRate * 38);
  score += Math.max(0, timeLeft) * 5;
  score -= stats.wrongCount * 3;
  score -= stats.stageDrops * 5;
  score -= unresolved * 5;

  if (stats.bestCombo >= 4) score += 12;
  if (stats.bestCombo >= 7) score += 16;
  if (clearRate >= 0.85) score += 15;
  if (clearRate >= 0.95) score += 12;

  score = Math.max(0, Math.round(score));

  return {
    score,
    wrong: stats.wrongCount,
    resolved: totalResolved,
    unresolved,
    totalSpawned,
    clearRate,
  };
}

function getSpotView(spot) {
  const fadedOpacity = spot.fading ? 0 : 1;
  const fadedScale = spot.fading ? 0.54 : 1;
  const isGolden = spot.variant === "golden";
  const isBubble = spot.variant === "bubble";
  const isRage = spot.variant === "rage";
  const isTrap = spot.variant === "trap";

  const base = {
    size: isGolden ? 12 : 10,
    hitSize: isGolden || isBubble ? 38 : 36,
    opacity: fadedOpacity,
    scale: fadedScale,
  };

  if (spot.resolved) {
    return {
      ...base,
      color: "rgba(231,162,123,0.95)",
      ring: "0 0 0 3px rgba(255,229,213,0.92)",
      border: "2px solid rgba(255,255,255,0.96)",
    };
  }

  let color = "rgba(217,122,185,0.98)";
  let ring = "0 0 0 2px rgba(253,231,242,0.95)";
  let border = "2px solid rgba(255,255,255,0.98)";

  if (spot.currentStage === "stage2") {
    color = "rgba(130,198,245,0.98)";
    ring = "0 0 0 2px rgba(226,243,255,0.94)";
  }

  if (spot.currentStage === "stage3") {
    color = "rgba(231,162,123,0.98)";
    ring = "0 0 0 2px rgba(255,229,213,0.9)";
    border = "2px solid rgba(255,248,244,0.98)";
  }

  if (isGolden) {
    ring = "0 0 0 3px rgba(255,241,166,0.95), 0 0 20px rgba(255,215,84,0.7)";
    border = "2px solid rgba(255,248,200,0.98)";
  } else if (isBubble) {
    ring = `${ring}, 0 0 18px rgba(255,255,255,0.55)`;
  } else if (isRage) {
    ring = `${ring}, 0 0 18px rgba(255,111,111,0.42)`;
  } else if (isTrap) {
    ring = `${ring}, 0 0 18px rgba(131,82,255,0.32)`;
  }

  return {
    ...base,
    color,
    ring,
    border,
  };
}

function getPointerPosition(event, element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const touchPoint =
    "touches" in event && event.touches[0]
      ? event.touches[0]
      : "changedTouches" in event && event.changedTouches[0]
      ? event.changedTouches[0]
      : event;
  const x = ((touchPoint.clientX - rect.left) / rect.width) * 100;
  const y = ((touchPoint.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

function preventGhostClick(event) {
  if (typeof event?.preventDefault === "function") {
    event.preventDefault();
  }
}

function GamePage() {
  const navigate = useNavigate();
  const faceStageRef = useRef(null);
  const lastRubAtRef = useRef(new Map());
  const finishedRef = useRef(false);
  const spawnIntervalRef = useRef(null);
  const timeLeftRef = useRef(TOTAL_TIME);
  const comboRef = useRef({ count: 0, lastResolvedAt: 0 });
  const statsRef = useRef({
    totalSpawned: 3,
    stage1Resolved: 0,
    stage23Resolved: 0,
    wrongCount: 0,
    goldenResolved: 0,
    bubbleResolved: 0,
    rageResolved: 0,
    trapResolved: 0,
    chainExplosions: 0,
    comboBonus: 0,
    bestCombo: 0,
    stageDrops: 0,
  });

  const selectedFaceKey = localStorage.getItem("selectedFaceKey");
  const nickname = localStorage.getItem("nickname") || "PLAYER";

  const [faceKey] = useState(() =>
    selectedFaceKey === "male" || selectedFaceKey === "female" ? selectedFaceKey : "female"
  );
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [spots, setSpots] = useState(() => buildSpots(false));
  const [statusMessage, setStatusMessage] = useState("분홍은 문지르기, 하늘/살구는 클릭으로 처리하세요.");
  const [foamPoints, setFoamPoints] = useState([]);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [isRubbing, setIsRubbing] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [liveScore, setLiveScore] = useState(0);

  const unresolvedCount = useMemo(() => spots.filter((spot) => !spot.resolved && !spot.fading).length, [spots]);
  const faceSrc = FACE_SRC[faceKey] || FACE_SRC.female;
  const isFever = timeLeft <= FEVER_TIME_THRESHOLD;

  const pushFloatingText = (x, y, text, kind = "score") => {
    setFloatingTexts((prev) => [
      ...prev.filter((item) => item.expiresAt > nowMs()).slice(-8),
      {
        id: makeClientId("float"),
        x,
        y,
        text,
        kind,
        expiresAt: nowMs() + FLOAT_LIFETIME_MS,
      },
    ]);
  };

  const updateLiveScore = () => {
    const preview = computeScore(statsRef.current, timeLeftRef.current, spots);
    setLiveScore(preview.score);
  };

  const registerComboSuccess = (spot, bonusScore = 0) => {
    const now = nowMs();
    const nextCombo = now - comboRef.current.lastResolvedAt <= COMBO_WINDOW_MS ? comboRef.current.count + 1 : 1;
    comboRef.current = {
      count: nextCombo,
      lastResolvedAt: now,
    };

    setCombo(nextCombo);
    setBestCombo((prev) => {
      const next = Math.max(prev, nextCombo);
      statsRef.current.bestCombo = Math.max(statsRef.current.bestCombo, next);
      return next;
    });

    const comboBonus = nextCombo >= 2 ? nextCombo * 3 + (isFever ? 3 : 0) : 0;
    statsRef.current.comboBonus += comboBonus + bonusScore;

    if (nextCombo >= 2) {
      pushFloatingText(spot.x, spot.y - 6, `COMBO x${nextCombo}`, "combo");
      setStatusMessage(nextCombo >= 5 ? "콤보가 붙었어요! 계속 이어가세요" : "좋아요! 콤보가 시작됐어요");
    }
  };

  const resetComboOnMiss = () => {
    comboRef.current = { ...comboRef.current, count: 0 };
    setCombo(0);
  };

  const triggerFadeOut = (spotId) => {
    window.setTimeout(() => {
      setSpots((prev) =>
        prev.map((spot) => (spot.id === spotId ? { ...spot, fading: true } : spot))
      );
    }, 40);

    window.setTimeout(() => {
      setSpots((prev) => prev.filter((spot) => spot.id !== spotId));
    }, 220);
  };

  const registerResolve = (spot, options = {}) => {
    const {
      scoreText = null,
      status = "깔끔하게 처리했어요",
      chainReaction = false,
      comboBonus = 0,
    } = options;

    if (spot.type === "stage1") {
      statsRef.current.stage1Resolved += 1;
    } else {
      statsRef.current.stage23Resolved += 1;
    }

    if (spot.variant === "golden") statsRef.current.goldenResolved += 1;
    if (spot.variant === "bubble") statsRef.current.bubbleResolved += 1;
    if (spot.variant === "rage") statsRef.current.rageResolved += 1;
    if (spot.variant === "trap") statsRef.current.trapResolved += 1;
    if (chainReaction) statsRef.current.chainExplosions += 1;

    registerComboSuccess(spot, comboBonus);
    setStatusMessage(status);

    if (scoreText) {
      pushFloatingText(spot.x, spot.y - 4, scoreText, spot.variant === "golden" ? "gold" : "score");
    }
  };

  const chainBoostNearestSpot = (sourceSpotId) => {
    let impacted = false;

    setSpots((prev) => {
      const source = prev.find((spot) => spot.id === sourceSpotId);
      if (!source) return prev;

      const candidates = prev
        .filter((spot) => !spot.resolved && !spot.fading && spot.id !== sourceSpotId)
        .sort((a, b) => {
          const da = Math.hypot(a.x - source.x, a.y - source.y);
          const db = Math.hypot(b.x - source.x, b.y - source.y);
          return da - db;
        });

      const target = candidates[0];
      if (!target) return prev;
      impacted = true;

      return prev.map((spot) => {
        if (spot.id !== target.id) return spot;

        if (spot.currentStage === "stage1") {
          return {
            ...spot,
            resolved: true,
            actionLog: [...spot.actionLog, "bubble_chain_stage1"],
          };
        }

        if (spot.currentStage === "stage2") {
          return {
            ...spot,
            currentStage: "stage3",
            actionLog: [...spot.actionLog, "bubble_chain_to_stage3"],
          };
        }

        return {
          ...spot,
          resolved: true,
          actionLog: [...spot.actionLog, "bubble_chain_stage3"],
        };
      });
    });

    return impacted;
  };

  const spawnSpot = (options = {}) => {
    const { force = false } = options;

    setSpots((prev) => {
      const activeIds = new Set(prev.filter((spot) => !spot.fading && !spot.resolved).map((spot) => spot.id));
      const candidate = shuffle(SPOT_BLUEPRINTS).find((blueprint) => !activeIds.has(blueprint.id));
      if (!candidate) return prev;
      if (!force && activeIds.size >= 5) return prev;

      const nextSpot = buildSpotFromBlueprint(candidate, { isFever: timeLeftRef.current <= FEVER_TIME_THRESHOLD });
      statsRef.current.totalSpawned += 1;
      setStatusMessage(nextSpot.variant === "golden" ? "골든 포인트 등장! 놓치지 마세요" : "새 포인트가 생겼어요.");
      return [...prev, nextSpot];
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    trackEvent({
      eventType: "game_start_click",
      eventTimestamp: new Date().toISOString(),
      eventDate: formatEventDate(),
      nickname,
      score: null,
      eventSource: "game_entry",
      page: "GamePage",
      meta: { faceKey },
    });
  }, [faceKey, nickname]);

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
    updateLiveScore();
  }, [spots, timeLeft]);

  useEffect(() => {
    if (finishedRef.current || isGuideOpen) return;

    if (timeLeft === 0) {
      finishedRef.current = true;

      const { score, wrong, resolved, unresolved, totalSpawned, clearRate } = computeScore(
        statsRef.current,
        timeLeft,
        spots
      );
      const resultType = getResultType(score);
      const payload = {
        nickname,
        score,
        grade: resultType,
        resultType,
        resultMessage: getResultMessage(score),
        scenarioSummary: `정리 ${resolved}/${totalSpawned} · 미정리 ${unresolved} · 오답 ${wrong}회 · 최고콤보 ${statsRef.current.bestCombo}`,
        ctaText: "와디즈 보러가기",
        currentAttemptAt: new Date().toISOString(),
        meta: {
          clearRate,
          goldenResolved: statsRef.current.goldenResolved,
          bubbleResolved: statsRef.current.bubbleResolved,
          rageResolved: statsRef.current.rageResolved,
          trapResolved: statsRef.current.trapResolved,
          chainExplosions: statsRef.current.chainExplosions,
          bestCombo: statsRef.current.bestCombo,
        },
      };

      localStorage.setItem("lastGameResult", JSON.stringify(payload));
      navigate("/result", {
        replace: true,
        state: payload,
      });
    }
  }, [isGuideOpen, navigate, nickname, spots, timeLeft]);

  useEffect(() => {
    if (!foamPoints.length) return undefined;

    const timer = window.setTimeout(() => {
      const now = nowMs();
      setFoamPoints((prev) => prev.filter((point) => point.expiresAt > now));
    }, 80);

    return () => window.clearTimeout(timer);
  }, [foamPoints]);

  useEffect(() => {
    if (!floatingTexts.length) return undefined;

    const timer = window.setTimeout(() => {
      const now = nowMs();
      setFloatingTexts((prev) => prev.filter((item) => item.expiresAt > now));
    }, 90);

    return () => window.clearTimeout(timer);
  }, [floatingTexts]);

  useEffect(() => {
    if (spawnIntervalRef.current) {
      window.clearInterval(spawnIntervalRef.current);
    }

    spawnIntervalRef.current = window.setInterval(() => {
      if (finishedRef.current || isGuideOpen || timeLeftRef.current <= 0) return;
      const feverMode = timeLeftRef.current <= FEVER_TIME_THRESHOLD;
      const chance = feverMode ? 0.96 : 0.9;
      if (Math.random() < chance) {
        spawnSpot();
      }
    }, isFever ? 1200 : 1850);

    return () => {
      if (spawnIntervalRef.current) {
        window.clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, [isGuideOpen, isFever]);

  useEffect(() => {
    if (finishedRef.current || isGuideOpen || timeLeft <= 0) return;
    if (unresolvedCount !== 0) return;

    const timer = window.setTimeout(() => {
      if (finishedRef.current || timeLeftRef.current <= 0) return;
      spawnSpot({ force: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [unresolvedCount, isGuideOpen, timeLeft]);

  useEffect(() => {
    if (finishedRef.current || isGuideOpen || timeLeft <= 0) return undefined;

    const timer = window.setInterval(() => {
      let didDrop = false;

      setSpots((prev) => {
        const now = nowMs();
        return prev.map((spot) => {
          if (spot.resolved || spot.fading || spot.variant !== "rage" || !spot.stageDeadlineAt) return spot;
          if (now < spot.stageDeadlineAt) return spot;

          didDrop = true;
          statsRef.current.stageDrops += 1;

          if (spot.currentStage === "stage1") {
            return {
              ...spot,
              currentStage: "stage2",
              stageDeadlineAt: now + RAGE_STAGE_UP_MS,
            };
          }

          if (spot.currentStage === "stage2") {
            return {
              ...spot,
              currentStage: "stage3",
              stageDeadlineAt: now + RAGE_STAGE_UP_MS,
            };
          }

          return {
            ...spot,
            stageDeadlineAt: now + RAGE_STAGE_UP_MS,
          };
        });
      });

      if (didDrop) {
        resetComboOnMiss();
        setStatusMessage("폭주 포인트가 더 까다로워졌어요!");
      }
    }, 180);

    return () => window.clearInterval(timer);
  }, [isGuideOpen, timeLeft]);

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
      ...prev.filter((point) => point.expiresAt > nowMs()).slice(-12),
      { ...position, id: makeClientId("foam"), expiresAt: nowMs() + 220 },
    ]);

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.resolved || spot.fading || spot.currentStage !== "stage1") return spot;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        const lastRubAt = lastRubAtRef.current.get(spot.id) || 0;

        if (distance > 10.5 || nowMs() - lastRubAt < 45) return spot;
        lastRubAtRef.current.set(spot.id, nowMs());

        let status = "좋아요! 분홍 포인트를 깔끔하게 정리했어요";
        let scoreText = "+14";
        let comboBonus = 0;

        if (spot.variant === "golden") {
          status = "골든 포인트 대성공!";
          scoreText = "+30";
          comboBonus += 8;
        } else if (spot.variant === "bubble") {
          status = "버블 보너스! 주변까지 튀어요";
          scoreText = "+22";
          comboBonus += 5;
        } else if (spot.variant === "rage") {
          status = "폭주 포인트를 제때 잡았어요";
          scoreText = "+20";
        } else if (spot.variant === "trap") {
          status = "함정 포인트도 정확하게 처리했어요";
          scoreText = "+18";
        }

        registerResolve(spot, { scoreText, status, comboBonus });
        triggerFadeOut(spot.id);

        return {
          ...spot,
          washCount: 1,
          resolved: true,
          actionLog: [...spot.actionLog, "stage1"],
        };
      })
    );
  };

  const handleFacePointerDown = (event) => {
    if (isGuideOpen) return;
    preventGhostClick(event);
    setIsRubbing(true);
    applyStage1(getPointerPosition(event, faceStageRef.current));
  };

  const handleFacePointerMove = (event) => {
    if (isGuideOpen || !isRubbing) return;
    preventGhostClick(event);
    applyStage1(getPointerPosition(event, faceStageRef.current));
  };

  const handleFacePointerUp = () => {
    setIsRubbing(false);
  };

  const handleSpotPress = (spotId) => {
    if (isGuideOpen) return;

    setSpots((prev) =>
      prev.map((spot) => {
        if (spot.id !== spotId) return spot;

        if (spot.resolved || spot.fading) {
          statsRef.current.wrongCount += 1;
          resetComboOnMiss();
          setStatusMessage("이미 끝난 포인트예요. 다음 걸 노려보세요");
          return { ...spot, wrongCount: spot.wrongCount + 1 };
        }

        if (spot.currentStage === "stage1") {
          statsRef.current.wrongCount += 1;
          resetComboOnMiss();
          setStatusMessage(spot.variant === "trap" ? "함정! 분홍은 문질러야 해요" : "분홍은 클릭 말고 문질러 주세요");
          return { ...spot, wrongCount: spot.wrongCount + 1 };
        }

        if (spot.currentStage === "stage2") {
          setStatusMessage(
            spot.variant === "golden" ? "골든 포인트! 마지막 한 번만 더" : "좋아요. 마지막으로 살구를 1번만 누르세요"
          );
          return {
            ...spot,
            currentStage: "stage3",
            actionLog: [...spot.actionLog, "stage2"],
            stageDeadlineAt: spot.variant === "rage" ? nowMs() + RAGE_STAGE_UP_MS : spot.stageDeadlineAt,
          };
        }

        if (spot.currentStage === "stage3") {
          let status = "살구까지 마무리했어요";
          let scoreText = "+24";
          let comboBonus = isFever ? 4 : 0;
          let chainReaction = false;

          if (spot.variant === "golden") {
            status = "골든 포인트 클리어! 점수 대폭 상승";
            scoreText = "+42";
            comboBonus += 10;
          } else if (spot.variant === "bubble") {
            const impacted = chainBoostNearestSpot(spot.id);
            chainReaction = impacted;
            status = impacted ? "버블 연쇄! 주변 포인트까지 영향을 줬어요" : "버블 보너스 성공!";
            scoreText = impacted ? "+36" : "+30";
            comboBonus += impacted ? 8 : 4;
          } else if (spot.variant === "rage") {
            status = "폭주 포인트를 막판에 잡아냈어요";
            scoreText = "+33";
            comboBonus += 5;
          } else if (spot.variant === "trap") {
            status = "함정 포인트도 정확하게 처리했어요";
            scoreText = "+28";
            comboBonus += 3;
          }

          registerResolve(spot, { scoreText, status, chainReaction, comboBonus });
          triggerFadeOut(spot.id);
          return {
            ...spot,
            resolved: true,
            actionLog: [...spot.actionLog, "stage3"],
          };
        }

        return spot;
      })
    );
  };

  const handleSpotTouchStart = (event, spotId) => {
    preventGhostClick(event);
    handleSpotPress(spotId);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <button type="button" style={styles.backButton} onClick={() => navigate("/")}>
            ✕
          </button>
          <div style={styles.topInfo}>남은 포인트 {unresolvedCount}개</div>
        </div>

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>이 부위, 어떻게 씻을까?</h1>
            <div style={styles.subtitle}>콤보와 특수 포인트를 챙기면 점수가 크게 올라가요</div>
          </div>
          <div style={styles.scoreTimerWrap}>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>SCORE</div>
              <div style={styles.scoreValue}>{liveScore}</div>
            </div>
            <div style={{ ...styles.timerBox, ...(isFever ? styles.timerBoxFever : {}) }}>
              <div style={styles.timerLabel}>{isFever ? "FEVER" : "TIME"}</div>
              <div style={styles.timerValue}>{String(timeLeft).padStart(2, "0")}</div>
            </div>
          </div>
        </div>

        <div style={styles.tipRow}>
          <div style={{ ...styles.tipChip, background: "#fde7f2", color: "#b83280" }}>분홍 = 문지르기</div>
          <div style={{ ...styles.tipChip, background: "#e2f3ff", color: "#1f6fb2" }}>하늘 = 클릭</div>
          <div style={{ ...styles.tipChip, background: "#ffe5d5", color: "#b85d2f" }}>살구 = 클릭</div>
        </div>

        <div style={styles.variantRow}>
          <div style={{ ...styles.variantChip, background: "#fff6bf", color: "#9a6800" }}>골든 = 보너스점수</div>
          <div style={{ ...styles.variantChip, background: "#eef8ff", color: "#2d6ea6" }}>버블 = 연쇄효과</div>
          <div style={{ ...styles.variantChip, background: "#ffe9e9", color: "#b73e3e" }}>폭주 = 빨리 처리</div>
          <div style={{ ...styles.variantChip, background: "#f1ebff", color: "#6c49c6" }}>함정 = 정확하게</div>
        </div>

        {isGuideOpen && (
          <div style={styles.guideOverlay}>
            <div style={styles.guideCard}>
              <div style={styles.guideTitle}>이것만 기억하면 돼요</div>
              <div style={styles.guideLine}>
                <span style={{ ...styles.guideDot, background: "#d97ab9" }} />
                분홍은 문지르면 바로 제거
              </div>
              <div style={styles.guideLine}>
                <span style={{ ...styles.guideDot, background: "#82c6f5" }} />
                하늘은 클릭하면 살구로 변경
              </div>
              <div style={styles.guideLine}>
                <span style={{ ...styles.guideDot, background: "#e7a27b" }} />
                살구는 1번만 클릭하면 제거
              </div>
              <div style={styles.guideLineMuted}>골든/버블/폭주/함정 포인트가 랜덤으로 등장해요</div>
              <button type="button" style={styles.guideButton} onClick={() => setIsGuideOpen(false)}>
                바로 시작
              </button>
            </div>
          </div>
        )}

        <div
          ref={faceStageRef}
          style={{
            ...styles.faceFrame,
            ...(isFever ? styles.faceFrameFever : {}),
          }}
          onMouseDown={handleFacePointerDown}
          onMouseMove={handleFacePointerMove}
          onMouseUp={handleFacePointerUp}
          onMouseLeave={handleFacePointerUp}
          onTouchStart={handleFacePointerDown}
          onTouchMove={handleFacePointerMove}
          onTouchEnd={handleFacePointerUp}
        >
          <img src={faceSrc} alt="game face" style={styles.faceImage} draggable={false} />

          {isFever && <div style={styles.feverBadge}>FEVER TIME</div>}
          {combo >= 2 && <div style={styles.comboBadge}>COMBO x{combo}</div>}
          {bestCombo >= 3 && <div style={styles.bestComboBadge}>BEST x{bestCombo}</div>}

          {spots.map((spot) => {
            const view = getSpotView(spot);
            const variantLabel =
              spot.variant === "golden"
                ? "G"
                : spot.variant === "bubble"
                ? "B"
                : spot.variant === "rage"
                ? "!"
                : spot.variant === "trap"
                ? "?"
                : "";

            return (
              <button
                key={spot.spawnKey}
                type="button"
                onClick={() => handleSpotPress(spot.id)}
                onTouchStart={(event) => handleSpotTouchStart(event, spot.id)}
                style={{
                  ...styles.spot,
                  ...(spot.variant === "golden" ? styles.spotGold : {}),
                  ...(spot.variant === "bubble" ? styles.spotBubble : {}),
                  ...(spot.variant === "rage" ? styles.spotRage : {}),
                  ...(spot.variant === "trap" ? styles.spotTrap : {}),
                  width: `${view.hitSize}px`,
                  height: `${view.hitSize}px`,
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  opacity: view.opacity,
                  transform: `translate(-50%, -50%) scale(${view.scale})`,
                  boxShadow: view.ring,
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
                {variantLabel ? <span style={styles.variantMark}>{variantLabel}</span> : null}
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

          {floatingTexts.map((item) => (
            <span
              key={item.id}
              style={{
                ...styles.floatText,
                ...(item.kind === "combo"
                  ? styles.floatTextCombo
                  : item.kind === "gold"
                  ? styles.floatTextGold
                  : {}),
                left: `${item.x}%`,
                top: `${item.y}%`,
              }}
            >
              {item.text}
            </span>
          ))}
        </div>

        <div style={styles.smallStatus}>{statusMessage}</div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    background: "linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%)",
    padding: "6px",
    boxSizing: "border-box",
  },
  card: {
    width: "min(430px, calc(100vw - 12px))",
    margin: "0 auto",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "22px",
    padding: "10px",
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
    border: "1px solid rgba(219,228,240,0.9)",
    display: "grid",
    gap: "8px",
    position: "relative",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "20px",
    fontWeight: 900,
  },
  topInfo: {
    color: "#334155",
    fontWeight: 900,
    fontSize: "15px",
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "8px",
    alignItems: "start",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(20px, 7vw, 34px)",
    lineHeight: 0.96,
    letterSpacing: "-0.05em",
    fontWeight: 900,
    wordBreak: "keep-all",
  },
  subtitle: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
    wordBreak: "keep-all",
  },
  scoreTimerWrap: {
    display: "grid",
    gap: "6px",
  },
  scoreBox: {
    minWidth: "102px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, #fff4da 0%, #ffe6a9 100%)",
    padding: "7px 10px",
    textAlign: "center",
    border: "1px solid rgba(250,196,73,0.45)",
  },
  scoreLabel: {
    fontSize: "10px",
    fontWeight: 900,
    color: "#8a5a00",
    letterSpacing: "0.14em",
  },
  scoreValue: {
    fontSize: "28px",
    lineHeight: 1,
    marginTop: "2px",
    fontWeight: 900,
    color: "#5d3f00",
  },
  timerBox: {
    minWidth: "102px",
    borderRadius: "20px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    padding: "8px 10px",
    textAlign: "center",
  },
  timerBoxFever: {
    background: "linear-gradient(180deg, #772bff 0%, #ff4eb8 100%)",
    boxShadow: "0 8px 20px rgba(167, 71, 255, 0.32)",
  },
  timerLabel: {
    fontSize: "10px",
    fontWeight: 900,
    color: "#c7d2fe",
    letterSpacing: "0.18em",
  },
  timerValue: {
    fontSize: "36px",
    lineHeight: 1,
    fontWeight: 900,
    marginTop: "4px",
    color: "#f8e77c",
  },
  tipRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "6px",
  },
  tipChip: {
    padding: "7px 4px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "11px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  variantRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "6px",
  },
  variantChip: {
    padding: "6px 8px",
    borderRadius: "12px",
    fontWeight: 900,
    fontSize: "11px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  guideOverlay: {
    position: "absolute",
    inset: "104px 10px auto 10px",
    zIndex: 10,
  },
  guideCard: {
    background: "rgba(255,255,255,0.98)",
    borderRadius: "20px",
    padding: "12px",
    border: "1px solid #dbe4f0",
    boxShadow: "0 12px 28px rgba(15,23,42,0.16)",
    display: "grid",
    gap: "8px",
  },
  guideTitle: {
    color: "#0f172a",
    fontSize: "17px",
    fontWeight: 900,
    textAlign: "center",
  },
  guideLine: {
    minHeight: "38px",
    borderRadius: "12px",
    border: "1px solid #dbe4f0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "center",
    padding: "0 8px",
    color: "#334155",
    fontWeight: 900,
    fontSize: "14px",
    background: "#ffffff",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  guideLineMuted: {
    minHeight: "34px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    color: "#64748b",
    fontWeight: 800,
    fontSize: "12px",
    background: "#f8fafc",
  },
  guideDot: {
    width: "11px",
    height: "11px",
    borderRadius: "999px",
    flexShrink: 0,
    boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
  },
  guideButton: {
    width: "100%",
    minHeight: "46px",
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(90deg, #24348f 0%, #4760ea 100%)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 900,
  },
  faceFrame: {
    position: "relative",
    borderRadius: "22px",
    overflow: "hidden",
    background: "#d2d7de",
    aspectRatio: "1 / 0.84",
    touchAction: "none",
    userSelect: "none",
  },
  faceFrameFever: {
    boxShadow: "inset 0 0 0 3px rgba(201, 70, 255, 0.35)",
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
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  },
  spotGold: {
    filter: "drop-shadow(0 0 8px rgba(255, 217, 79, 0.65))",
  },
  spotBubble: {
    filter: "drop-shadow(0 0 7px rgba(255,255,255,0.75))",
  },
  spotRage: {
    filter: "drop-shadow(0 0 8px rgba(255, 102, 102, 0.45))",
  },
  spotTrap: {
    filter: "drop-shadow(0 0 8px rgba(126, 87, 255, 0.42))",
  },
  variantMark: {
    position: "absolute",
    top: "-4px",
    right: "-2px",
    minWidth: "14px",
    height: "14px",
    borderRadius: "999px",
    background: "rgba(15,23,42,0.92)",
    color: "#ffffff",
    fontSize: "9px",
    lineHeight: "14px",
    fontWeight: 900,
    textAlign: "center",
  },
  feverBadge: {
    position: "absolute",
    top: "10px",
    left: "10px",
    borderRadius: "999px",
    padding: "6px 10px",
    background: "rgba(124, 58, 237, 0.92)",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "12px",
    zIndex: 3,
  },
  comboBadge: {
    position: "absolute",
    top: "10px",
    right: "10px",
    borderRadius: "999px",
    padding: "6px 10px",
    background: "rgba(15,23,42,0.9)",
    color: "#fef08a",
    fontWeight: 900,
    fontSize: "12px",
    zIndex: 3,
  },
  bestComboBadge: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    borderRadius: "999px",
    padding: "5px 9px",
    background: "rgba(255,255,255,0.9)",
    color: "#7c3aed",
    fontWeight: 900,
    fontSize: "11px",
    zIndex: 3,
  },
  foam: {
    position: "absolute",
    width: "15px",
    height: "15px",
    borderRadius: "999px",
    transform: "translate(-50%, -50%)",
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 0 0 2px rgba(255,255,255,0.5), 0 6px 12px rgba(255,255,255,0.45)",
    pointerEvents: "none",
  },
  floatText: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    fontWeight: 900,
    fontSize: "13px",
    color: "#0f172a",
    textShadow: "0 1px 6px rgba(255,255,255,0.85)",
    pointerEvents: "none",
  },
  floatTextCombo: {
    color: "#7c3aed",
    fontSize: "14px",
  },
  floatTextGold: {
    color: "#a16207",
    fontSize: "14px",
  },
  smallStatus: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 800,
    minHeight: "18px",
    padding: "0 2px",
    textAlign: "center",
    wordBreak: "keep-all",
  },
};

export default GamePage;
