import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const CANVAS_SIZE = 360;
const REVEAL_THRESHOLD = 55;
const POSSIBLE_SPOTS = [
  { id: "forehead", x: 180, y: 118, name: "이마" },
  { id: "leftCheek", x: 128, y: 192, name: "왼쪽 볼" },
  { id: "rightCheek", x: 232, y: 192, name: "오른쪽 볼" },
  { id: "chin", x: 180, y: 255, name: "턱" },
  { id: "noseSide", x: 160, y: 180, name: "코 옆" },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateScenario() {
  const gender = Math.random() < 0.5 ? "male" : "female";
  const skinTypes = ["dry", "oily", "sensitive", "normal"];
  const skinType = skinTypes[Math.floor(Math.random() * skinTypes.length)];
  const hasMakeup =
    gender === "female" ? Math.random() < 0.75 : Math.random() < 0.15;

  const shuffled = shuffle(POSSIBLE_SPOTS);

  const initialCountRoll = Math.random();
  let initialCount = 0;
  if (initialCountRoll < 0.25) initialCount = 0;
  else if (initialCountRoll < 0.65) initialCount = 1;
  else initialCount = 2;

  const lateCountRoll = Math.random();
  let lateCount = 0;
  if (lateCountRoll < 0.45) lateCount = 0;
  else if (lateCountRoll < 0.82) lateCount = 1;
  else lateCount = 2;

  const initialAcneSpots = shuffled.slice(0, initialCount).map((spot) => ({
    ...spot,
    hiddenUnderMakeup: hasMakeup,
    source: "initial",
  }));

  const lateAcneSpots = shuffled
    .slice(initialCount, initialCount + lateCount)
    .map((spot) => ({
      ...spot,
      hiddenUnderMakeup: hasMakeup,
      source: "late",
    }));

  return {
    gender,
    skinType,
    hasMakeup,
    initialAcneSpots,
    lateAcneSpots,
  };
}

function getGrade(score) {
  if (score >= 90) return "피부 응급처치 마스터";
  if (score >= 75) return "밸런스 케어 고수";
  if (score >= 60) return "과몰입 클렌저형";
  if (score >= 40) return "순서 꼬임 케어형";
  return "과세정 위험군";
}

function getResultMessage(grade) {
  if (grade === "피부 응급처치 마스터") {
    return "상태 확인부터 보호 마무리까지, 가장 이상적인 순서로 케어했습니다.";
  }
  if (grade === "밸런스 케어 고수") {
    return "세정과 스팟 케어의 균형을 꽤 잘 맞췄습니다.";
  }
  if (grade === "과몰입 클렌저형") {
    return "세정은 열심히 했지만, 자극 관리나 케어 순서가 조금 아쉬웠습니다.";
  }
  if (grade === "순서 꼬임 케어형") {
    return "무엇을 할지는 맞았지만, 순서와 타이밍이 흔들렸습니다.";
  }
  return "너무 서두르거나 과하게 반응했습니다. 먼저 균형부터 잡아야 합니다.";
}

function getCtaText(grade) {
  if (grade === "피부 응급처치 마스터") return "이 케어 밸런스를 유지하는 방법 보기";
  if (grade === "밸런스 케어 고수") return "트러블 케어 루틴 더 보기";
  if (grade === "과몰입 클렌저형") return "과하지 않은 세정 루틴 보기";
  if (grade === "순서 꼬임 케어형") return "순서부터 다시 잡는 방법 보기";
  return "보호까지 생각한 케어 방식 보기";
}

function GamePage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const bubblePointsRef = useRef([]);
  const nickname = localStorage.getItem("nickname") || "PLAYER";

  const scenario = useMemo(() => generateScenario(), []);

  const initialAcneState = useMemo(
    () =>
      scenario.initialAcneSpots.map((spot) => ({
        ...spot,
        revealed: !spot.hiddenUnderMakeup,
        treated: false,
        patched: false,
      })),
    [scenario]
  );

  const [timeLeft, setTimeLeft] = useState(15);
  const [cleanRate, setCleanRate] = useState(0);
  const [irritation, setIrritation] = useState(
    scenario.skinType === "sensitive" ? 18 : 10
  );
  const [moisture, setMoisture] = useState(
    scenario.skinType === "dry" ? 84 : 100
  );
  const [balanceTime, setBalanceTime] = useState(0);
  const [currentEvent, setCurrentEvent] = useState("");
  const [eventType, setEventType] = useState("");
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [hasTriggeredTenSec, setHasTriggeredTenSec] = useState(false);
  const [hasTriggeredFiveSec, setHasTriggeredFiveSec] = useState(false);
  const [acneStates, setAcneStates] = useState(initialAcneState);
  const [pendingLateSpots, setPendingLateSpots] = useState(
    scenario.lateAcneSpots
  );
  const [toolLogs, setToolLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState("얼굴 상태를 확인해보세요.");

  const eventMap = useMemo(
    () => ({
      DRYNESS: {
        label: "건조 경고! 수분 감소량 증가",
      },
      OIL_REBOUND: {
        label: "피지 반등! 세정 효율 저하",
      },
      SENSITIVE: {
        label: "자극 민감 상태! 자극 상승 주의",
      },
    }),
    []
  );

  const visibleAcneCount = acneStates.filter((spot) => spot.revealed).length;
  const treatedCount = acneStates.filter((spot) => spot.treated).length;
  const patchedCount = acneStates.filter((spot) => spot.patched).length;

  const coachingMessage = useMemo(() => {
    if (selectedTool === "ointment") {
      return "연고 모드예요. 보이는 여드름을 눌러 진정시켜보세요.";
    }

    if (selectedTool === "patch") {
      return "패치 모드예요. 연고 후 패치로 마무리하면 좋아요.";
    }

    if (irritation >= 65) {
      return "자극이 너무 높아요. 잠깐 멈추고 케어 순서를 보세요.";
    }

    if (moisture <= 28) {
      return "수분이 많이 떨어졌어요. 너무 과하게 문지르지 마세요.";
    }

    if (scenario.hasMakeup && cleanRate < 35) {
      return "메이크업이 아직 많이 남아 있어요. 부드럽게 조금 더 세정해보세요.";
    }

    if (scenario.hasMakeup && cleanRate >= 35 && cleanRate < REVEAL_THRESHOLD) {
      return "메이크업은 어느 정도 지워졌어요. 숨은 트러블이 있는지 더 확인해보세요.";
    }

    if (visibleAcneCount > 0 && treatedCount < visibleAcneCount) {
      return "보이는 여드름엔 연고를 먼저 써보는 게 좋아요.";
    }

    if (treatedCount > patchedCount && visibleAcneCount > 0) {
      return "연고 처리한 부위엔 패치로 마무리해보세요.";
    }

    if (!scenario.hasMakeup && cleanRate < 30) {
      return "지금은 세정이 조금 부족해요. 얼굴 상태가 더 잘 보일 정도로만 정리해보세요.";
    }

    return "지금 흐름 괜찮아요. 과세정만 피하면서 상태를 보고 다음 액션을 선택하세요.";
  }, [
    selectedTool,
    irritation,
    moisture,
    scenario.hasMakeup,
    cleanRate,
    visibleAcneCount,
    treatedCount,
    patchedCount,
  ]);

  const triggerRandomEvent = useCallback(() => {
    const keys = Object.keys(eventMap);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    setEventType(randomKey);
    setCurrentEvent(eventMap[randomKey].label);
  }, [eventMap]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, width, height);

    const faceColor = scenario.gender === "female" ? "#f7d9cc" : "#efcfbf";
    const hairColor = scenario.gender === "female" ? "#5a433c" : "#4b372f";

    // 뒤쪽 머리
    ctx.fillStyle = hairColor;
    if (scenario.gender === "female") {
      ctx.beginPath();
      ctx.ellipse(180, 165, 138, 165, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(180, 145, 128, 125, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 목
    ctx.fillStyle = faceColor;
    ctx.fillRect(150, 292, 60, 40);

    // 얼굴
    ctx.beginPath();
    ctx.ellipse(width / 2, 182, 108, 140, 0, 0, Math.PI * 2);
    ctx.fillStyle = faceColor;
    ctx.fill();

    // 앞머리 / 윗머리
    ctx.fillStyle = hairColor;
    if (scenario.gender === "female") {
      ctx.beginPath();
      ctx.moveTo(72, 128);
      ctx.quadraticCurveTo(180, 58, 288, 128);
      ctx.lineTo(288, 145);
      ctx.quadraticCurveTo(180, 110, 72, 145);
      ctx.closePath();
      ctx.fill();

      ctx.fillRect(74, 145, 24, 95);
      ctx.fillRect(262, 145, 24, 95);
    } else {
      ctx.beginPath();
      ctx.moveTo(76, 126);
      ctx.quadraticCurveTo(180, 78, 284, 126);
      ctx.lineTo(284, 146);
      ctx.quadraticCurveTo(180, 118, 76, 146);
      ctx.closePath();
      ctx.fill();

      ctx.fillRect(84, 144, 15, 36);
      ctx.fillRect(261, 144, 15, 36);
    }

    // 눈썹
    ctx.strokeStyle = "#5d463c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(122, 152);
    ctx.lineTo(152, 148);
    ctx.moveTo(208, 148);
    ctx.lineTo(238, 152);
    ctx.stroke();

    // 눈
    ctx.fillStyle = "#2f2f2f";
    ctx.beginPath();
    ctx.arc(142, 174, 6, 0, Math.PI * 2);
    ctx.arc(218, 174, 6, 0, Math.PI * 2);
    ctx.fill();

    // 코
    ctx.beginPath();
    ctx.moveTo(180, 182);
    ctx.lineTo(172, 208);
    ctx.lineTo(188, 208);
    ctx.closePath();
    ctx.fillStyle = "#eab8a5";
    ctx.fill();

    // 입
    ctx.beginPath();
    ctx.arc(180, 238, 20, 0, Math.PI, false);
    ctx.strokeStyle = scenario.gender === "female" ? "#c26b80" : "#9a5a5a";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 자극 붉은기
    const rednessAlpha = Math.min(0.35, irritation / 230);
    if (rednessAlpha > 0.03) {
      ctx.globalAlpha = rednessAlpha;
      ctx.fillStyle = "#ff8b8b";
      ctx.beginPath();
      ctx.arc(124, 205, 24, 0, Math.PI * 2);
      ctx.arc(236, 205, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 메이크업 표현 - 얼굴 내부에만 자연스럽게
    if (scenario.hasMakeup && cleanRate < 100) {
      const makeupAlpha = Math.max(0, (100 - cleanRate) / 100) * 0.58;

      if (makeupAlpha > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(180, 182, 108, 140, 0, 0, Math.PI * 2);
        ctx.clip();

        ctx.globalAlpha = makeupAlpha;

        // 아주 옅은 베이스 톤
        ctx.fillStyle = "#f3cdc7";
        ctx.beginPath();
        ctx.ellipse(180, 182, 102, 132, 0, 0, Math.PI * 2);
        ctx.fill();

        if (scenario.gender === "female") {
          // 블러셔
          ctx.fillStyle = "#f3a0b2";
          ctx.beginPath();
          ctx.arc(125, 205, 18, 0, Math.PI * 2);
          ctx.arc(235, 205, 18, 0, Math.PI * 2);
          ctx.fill();

          // 아이메이크업
          ctx.fillStyle = "#d8b4fe";
          ctx.beginPath();
          ctx.ellipse(142, 168, 16, 7, 0, 0, Math.PI * 2);
          ctx.ellipse(218, 168, 16, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          // 립
          ctx.fillStyle = "#d85a78";
          ctx.beginPath();
          ctx.ellipse(180, 236, 22, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // 여드름 / 패치
    acneStates.forEach((spot) => {
      if (!spot.revealed) return;

      if (spot.patched) {
        ctx.fillStyle = "#f7d7a8";
        ctx.strokeStyle = "#c9a66b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(spot.x - 13, spot.y - 10, 26, 20, 6);
        ctx.fill();
        ctx.stroke();
        return;
      }

      if (spot.treated) {
        ctx.fillStyle = "#ffc9cf";
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#e8798f";
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 4, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.fillStyle = "#ff9ea0";
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 버블
    bubblePointsRef.current.forEach((bubble) => {
      ctx.globalAlpha = bubble.alpha;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#dbeafe";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }, [scenario, cleanRate, irritation, acneStates]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const animation = setInterval(() => {
      bubblePointsRef.current = bubblePointsRef.current
        .map((bubble) => ({
          ...bubble,
          alpha: bubble.alpha - 0.03,
          radius: bubble.radius + 0.08,
        }))
        .filter((bubble) => bubble.alpha > 0);

      drawCanvas();
    }, 60);

    return () => clearInterval(animation);
  }, [drawCanvas]);

  useEffect(() => {
    if (scenario.hasMakeup && cleanRate >= REVEAL_THRESHOLD) {
      setAcneStates((prev) =>
        prev.map((spot) => ({
          ...spot,
          revealed: true,
        }))
      );

      if (scenario.initialAcneSpots.length > 0 || scenario.lateAcneSpots.length > 0) {
        setStatusMessage("세정이 진행되며 숨은 트러블이 보이기 시작했어요.");
      } else {
        setStatusMessage("메이크업은 지워졌지만 숨은 여드름은 없었어요.");
      }
    }
  }, [cleanRate, scenario]);

  const applyScrubEffect = useCallback(() => {
    let cleanDelta = scenario.hasMakeup ? 1.5 : 1.0;
    let irritationDelta = 1.0;
    let moistureDelta = -0.8;

    if (scenario.skinType === "dry") moistureDelta -= 0.4;
    if (scenario.skinType === "sensitive") irritationDelta += 0.5;
    if (scenario.skinType === "oily") cleanDelta += 0.2;

    if (eventType === "DRYNESS") moistureDelta -= 0.6;
    if (eventType === "OIL_REBOUND") cleanDelta -= 0.5;
    if (eventType === "SENSITIVE") irritationDelta += 0.8;

    setCleanRate((prev) => clamp(prev + cleanDelta, 0, 100));
    setIrritation((prev) => clamp(prev + irritationDelta, 0, 100));
    setMoisture((prev) => clamp(prev + moistureDelta, 0, 100));
  }, [eventType, scenario]);

  const addBubble = useCallback((x, y) => {
    bubblePointsRef.current.push({
      x,
      y,
      radius: Math.random() * 9 + 10,
      alpha: 0.52,
    });
  }, []);

  const handleScrubStart = () => {
    if (selectedTool) return;
    setIsScrubbing(true);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
  };

  const handlePointerMove = (clientX, clientY) => {
    if (!isScrubbing || selectedTool) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    addBubble(x, y);
    applyScrubEffect();
    drawCanvas();
  };

  const handleMouseMove = (e) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  const applyToolAtPoint = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedTool) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const visibleSpots = acneStates.filter((spot) => spot.revealed);
    // if (visibleSpots.length === 0) {
    //   setStatusMessage("아직 드러난 여드름이 없어요. 먼저 세정으로 상태를 확인해보세요.");
    //   setToolLogs((prev) => [...prev, `${selectedTool}_wasted`]);
    //   setIrritation((prev) => clamp(prev + 1, 0, 100));
    //   return;
    // }
    if (visibleSpots.length === 0) {
      const wrongToolName = selectedTool === "ointment" ? "연고" : "패치";

      setStatusMessage(`아직 보이는 여드름이 없는데 ${wrongToolName}를 먼저 썼어요. 순서가 꼬였습니다.`);
      setToolLogs((prev) => [...prev, `${selectedTool}_wasted`]);

      setIrritation((prev) => clamp(prev + 2, 0, 100));
      setMoisture((prev) => clamp(prev - 1, 0, 100));

      setSelectedTool(null);
      return;
    }

    let nearest = null;
    let nearestDistance = Infinity;

    visibleSpots.forEach((spot) => {
      const distance = Math.sqrt((spot.x - x) ** 2 + (spot.y - y) ** 2);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = spot;
      }
    });

    // if (!nearest || nearestDistance > 35) {
    //   setStatusMessage("여드름 위치를 더 정확히 눌러주세요.");
    //   setToolLogs((prev) => [...prev, `${selectedTool}_miss`]);
    //   return;
    // }
    if (!nearest || nearestDistance > 35) {
      const wrongToolName = selectedTool === "ointment" ? "연고" : "패치";

      setStatusMessage(`${wrongToolName}를 여드름이 아닌 곳에 사용했어요. 오히려 자극만 올라갑니다.`);
      setToolLogs((prev) => [...prev, `${selectedTool}_wrong_target`]);

      setIrritation((prev) => clamp(prev + 3, 0, 100));
      setMoisture((prev) => clamp(prev - 1, 0, 100));

      setSelectedTool(null);
      return;
    }

    if (selectedTool === "ointment") {
      setAcneStates((prev) =>
        prev.map((spot) =>
          spot.id === nearest.id
            ? {
                ...spot,
                treated: true,
              }
            : spot
        )
      );
      setStatusMessage(`${nearest.name} 여드름에 연고를 발랐어요.`);
      setToolLogs((prev) => [...prev, "ointment"]);
      setSelectedTool(null);
      return;
    }

    if (selectedTool === "patch") {
      const target = acneStates.find((spot) => spot.id === nearest.id);
      const patchedWithoutOintment = target && !target.treated;

      setAcneStates((prev) =>
        prev.map((spot) =>
          spot.id === nearest.id
            ? {
                ...spot,
                patched: true,
              }
            : spot
        )
      );

      if (patchedWithoutOintment) {
        setStatusMessage(`${nearest.name}에 패치를 붙였지만, 연고 없이 바로 붙였어요.`);
        setToolLogs((prev) => [...prev, "patch_without_ointment"]);
      } else {
        setStatusMessage(`${nearest.name}에 패치를 붙여 보호했어요.`);
        setToolLogs((prev) => [...prev, "patch_after_ointment"]);
      }

      setSelectedTool(null);
    }
  };

  const handleFaceClick = (e) => {
    if (!selectedTool) return;
    applyToolAtPoint(e.clientX, e.clientY);
  };

  // 타이머는 항상 흐름
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 회복
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScrubbing) {
        setIrritation((prev) => clamp(prev - 0.45, 0, 100));
        setMoisture((prev) => clamp(prev + 0.22, 0, 100));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isScrubbing]);

  // 균형 유지 시간
  useEffect(() => {
    const interval = setInterval(() => {
      const isBalanced =
        cleanRate >= 45 &&
        cleanRate <= 82 &&
        irritation <= 45 &&
        moisture >= 32;

      if (isBalanced) {
        setBalanceTime((prev) => prev + 0.1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cleanRate, irritation, moisture]);

  // 랜덤 이벤트
  useEffect(() => {
    if (timeLeft === 10 && !hasTriggeredTenSec) {
      triggerRandomEvent();
      setHasTriggeredTenSec(true);
    }
    if (timeLeft === 5 && !hasTriggeredFiveSec) {
      triggerRandomEvent();
      setHasTriggeredFiveSec(true);
    }
  }, [timeLeft, hasTriggeredTenSec, hasTriggeredFiveSec, triggerRandomEvent]);

  // 중간 여드름 등장
  useEffect(() => {
    if (
      timeLeft <= 12 &&
      timeLeft >= 3 &&
      pendingLateSpots.length > 0 &&
      Math.random() < 0.18
    ) {
      const nextSpot = pendingLateSpots[0];

      setAcneStates((prev) => [
        ...prev,
        {
          ...nextSpot,
          revealed: !nextSpot.hiddenUnderMakeup || cleanRate >= REVEAL_THRESHOLD,
          treated: false,
          patched: false,
        },
      ]);

      setPendingLateSpots((prev) => prev.slice(1));
      setStatusMessage(`${nextSpot.name} 쪽에 새로운 트러블이 올라왔어요.`);
    }
  }, [timeLeft, pendingLateSpots, cleanRate]);

  // 종료
  useEffect(() => {
    if (timeLeft > 0) return;

    const targetClean = scenario.hasMakeup ? 80 : 55;
    const cleaningScore = Math.max(
      0,
      30 - Math.abs(cleanRate - targetClean) * 0.7
    );

    const irritationScore = Math.max(0, 20 - irritation * 0.18);

    const totalAcne = acneStates.length;
    const revealedCount = acneStates.filter((spot) => spot.revealed).length;
    const discoveryScore =
      totalAcne === 0 ? 15 : Math.round((revealedCount / totalAcne) * 15);

    let careOrderScore = 0;
    const ointmentCount = toolLogs.filter((log) => log === "ointment").length;
    const patchAfterOintmentCount = toolLogs.filter(
      (log) => log === "patch_after_ointment"
    ).length;
    const patchWithoutOintmentCount = toolLogs.filter(
      (log) => log === "patch_without_ointment"
    ).length;
    // const wastedCount = toolLogs.filter(
    //   (log) => log.includes("wasted") || log.includes("miss")
    // ).length;
    const wastedCount = toolLogs.filter(
      (log) =>
        log.includes("wasted") ||
        log.includes("miss") ||
        log.includes("wrong_target")
    ).length;

    careOrderScore += Math.min(10, ointmentCount * 5);
    careOrderScore += Math.min(10, patchAfterOintmentCount * 5);
    careOrderScore -= patchWithoutOintmentCount * 4;
    // careOrderScore -= wastedCount * 2;
    careOrderScore -= wastedCount * 3;
    careOrderScore = clamp(careOrderScore, 0, 20);

    let protectionScore = 0;
    if (totalAcne === 0) {
      protectionScore = patchWithoutOintmentCount > 0 ? 4 : 15;
    } else {
      const protectedCount = acneStates.filter((spot) => spot.patched).length;
      protectionScore = clamp((protectedCount / totalAcne) * 15, 0, 15);
    }

    const totalScore = Math.round(
      cleaningScore +
        irritationScore +
        discoveryScore +
        careOrderScore +
        protectionScore
    );

    const grade = getGrade(totalScore);
    const resultMessage = getResultMessage(grade);
    const ctaText = getCtaText(grade);

    const scenarioSummary = [
      scenario.gender === "female" ? "여성 얼굴" : "남성 얼굴",
      scenario.hasMakeup ? "메이크업 상태" : "맨얼굴 상태",
      scenario.skinType === "dry"
        ? "건조 피부"
        : scenario.skinType === "oily"
        ? "유분 피부"
        : scenario.skinType === "sensitive"
        ? "민감 피부"
        : "보통 피부",
      totalAcne > 0 ? `여드름 ${totalAcne}개` : "여드름 없음",
    ].join(" / ");

    navigate("/result", {
      state: {
        nickname,
        score: totalScore,
        grade,
        cleanRate,
        irritation,
        moisture,
        balanceTime,
        resultMessage,
        ctaText,
        scenarioSummary,
        scoreBreakdown: {
          cleaningScore: Math.round(cleaningScore),
          irritationScore: Math.round(irritationScore),
          discoveryScore: Math.round(discoveryScore),
          careOrderScore: Math.round(careOrderScore),
          protectionScore: Math.round(protectionScore),
        },
        careStats: {
          totalAcne,
          revealedCount,
          treatedCount,
          patchedCount,
        },
      },
    });
  }, [
    timeLeft,
    scenario,
    cleanRate,
    irritation,
    moisture,
    balanceTime,
    acneStates,
    toolLogs,
    navigate,
    nickname,
    treatedCount,
    patchedCount,
  ]);

  const toolDescription =
    selectedTool === "ointment"
      ? "연고 모드: 보이는 여드름을 눌러주세요."
      : selectedTool === "patch"
      ? "패치 모드: 보이는 여드름을 눌러주세요."
      : "기본 모드: 얼굴을 문질러 상태를 확인하세요.";

  return (
    <div style={styles.wrapper}>
      <div style={styles.topBar}>
        <div style={styles.topCard}>
          <div style={styles.topLabel}>플레이어</div>
          <div style={styles.topValue}>{nickname}</div>
        </div>
        <div style={styles.topCard}>
          <div style={styles.topLabel}>남은 시간</div>
          <div style={styles.topValue}>{timeLeft}초</div>
        </div>
      </div>

      <h1 style={styles.title}>15초 피부 케어 게임</h1>

      <div style={styles.mainArea}>
        <div style={styles.leftPanel}>
          <div
            style={styles.faceArea}
            onMouseDown={handleScrubStart}
            onMouseUp={handleScrubEnd}
            onMouseLeave={handleScrubEnd}
            onMouseMove={handleMouseMove}
            onClick={handleFaceClick}
            onTouchStart={handleScrubStart}
            onTouchEnd={handleScrubEnd}
            onTouchCancel={handleScrubEnd}
            onTouchMove={handleTouchMove}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={styles.canvas}
            />
            <div style={styles.faceGuideText}>
              {selectedTool ? toolDescription : "마우스로 문질러 세정해보세요"}
            </div>
          </div>

          <div style={styles.feedbackBox}>
            <div style={styles.feedbackTitle}>실시간 코칭</div>
            <div style={styles.feedbackPrimary}>{coachingMessage}</div>
            <div style={styles.feedbackSecondary}>{statusMessage}</div>
          </div>

          <div style={styles.toolBar}>
            <button
              style={{
                ...styles.toolButton,
                ...(selectedTool === "ointment" ? styles.toolButtonActive : {}),
              }}
              onClick={() =>
                setSelectedTool((prev) => (prev === "ointment" ? null : "ointment"))
              }
            >
              연고
            </button>
            <button
              style={{
                ...styles.toolButton,
                ...(selectedTool === "patch" ? styles.toolButtonActive : {}),
              }}
              onClick={() =>
                setSelectedTool((prev) => (prev === "patch" ? null : "patch"))
              }
            >
              패치
            </button>
            <button
              style={styles.toolButtonSecondary}
              onClick={() => setSelectedTool(null)}
            >
              손으로 세정
            </button>
          </div>

          <div style={styles.playGuideBox}>
            <p style={styles.playGuideTitle}>현재 상황</p>
            <p style={styles.playGuideText}>{toolDescription}</p>
            <p style={styles.playGuideText}>
              시나리오:{" "}
              {scenario.gender === "female" ? "여성" : "남성"} /{" "}
              {scenario.hasMakeup ? "메이크업" : "맨얼굴"} /{" "}
              {scenario.skinType === "dry"
                ? "건조"
                : scenario.skinType === "oily"
                ? "유분"
                : scenario.skinType === "sensitive"
                ? "민감"
                : "보통"}
            </p>
          </div>
        </div>

        <div style={styles.sidePanel}>
          <GaugeCard label="세정 진행도" value={cleanRate} color="#60a5fa" />
          <GaugeCard label="자극 게이지" value={irritation} color="#f87171" />
          <GaugeCard label="수분 게이지" value={moisture} color="#34d399" />

          <div style={styles.eventBox}>
            <div style={styles.eventTitle}>랜덤 이벤트</div>
            <div style={styles.eventContent}>{currentEvent || "이벤트 대기중..."}</div>
          </div>

          <div style={styles.scoreHintBox}>
            <div style={styles.scoreHintTitle}>실시간 상태</div>
            <div style={styles.scoreHintText}>균형 유지 시간: {balanceTime.toFixed(1)}초</div>
            <div style={styles.scoreHintText}>보이는 여드름 수: {visibleAcneCount}</div>
            <div style={styles.scoreHintText}>연고 처리: {treatedCount}</div>
            <div style={styles.scoreHintText}>패치 부착: {patchedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GaugeCard({ label, value, color }) {
  return (
    <div style={styles.gaugeCard}>
      <div style={styles.gaugeLabel}>{label}</div>
      <div style={styles.gaugeBg}>
        <div
          style={{
            ...styles.gaugeFill,
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: color,
          }}
        />
      </div>
      <div style={styles.gaugeValue}>{Math.round(value)}</div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
    padding: "20px",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  topCard: {
    minWidth: "160px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "14px 18px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    textAlign: "center",
  },
  topLabel: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "4px",
  },
  topValue: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#111827",
  },
  title: {
    textAlign: "center",
    fontSize: "34px",
    margin: "10px 0 24px 0",
    color: "#1f2937",
  },
  mainArea: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
  },
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  faceArea: {
    width: "360px",
    height: "360px",
    borderRadius: "24px",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    position: "relative",
    touchAction: "none",
    userSelect: "none",
    cursor: "pointer",
  },
  canvas: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  faceGuideText: {
    position: "absolute",
    bottom: "14px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,255,255,0.88)",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    color: "#475569",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },
  feedbackBox: {
    width: "360px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "14px 16px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  },
  feedbackTitle: {
    fontWeight: "800",
    color: "#2563eb",
    marginBottom: "8px",
  },
  feedbackPrimary: {
    color: "#1f2937",
    fontWeight: "700",
    lineHeight: "1.5",
    marginBottom: "6px",
  },
  feedbackSecondary: {
    color: "#64748b",
    lineHeight: "1.5",
    fontSize: "14px",
  },
  toolBar: {
    width: "360px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  toolButton: {
    flex: 1,
    minWidth: "100px",
    padding: "12px 14px",
    border: "none",
    borderRadius: "14px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
  },
  toolButtonActive: {
    background: "#2563eb",
  },
  toolButtonSecondary: {
    flex: 1,
    minWidth: "100px",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: "700",
    cursor: "pointer",
  },
  playGuideBox: {
    width: "360px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  },
  playGuideTitle: {
    margin: "0 0 8px 0",
    fontWeight: "700",
    color: "#1d4ed8",
  },
  playGuideText: {
    margin: "6px 0",
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.5",
  },
  sidePanel: {
    width: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  gaugeCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  },
  gaugeLabel: {
    fontSize: "14px",
    color: "#475569",
    marginBottom: "10px",
    fontWeight: "600",
  },
  gaugeBg: {
    width: "100%",
    height: "16px",
    background: "#e5e7eb",
    borderRadius: "999px",
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.08s linear",
  },
  gaugeValue: {
    marginTop: "8px",
    fontWeight: "700",
    color: "#111827",
  },
  eventBox: {
    background: "#fff8e6",
    border: "1px solid #f3d38d",
    borderRadius: "18px",
    padding: "16px",
    minHeight: "96px",
  },
  eventTitle: {
    fontWeight: "800",
    color: "#9a6700",
    marginBottom: "8px",
  },
  eventContent: {
    color: "#7c5b1a",
    lineHeight: "1.5",
    fontSize: "15px",
  },
  scoreHintBox: {
    background: "#eefcf5",
    border: "1px solid #b7f0ce",
    borderRadius: "18px",
    padding: "16px",
  },
  scoreHintTitle: {
    fontWeight: "800",
    color: "#047857",
    marginBottom: "8px",
  },
  scoreHintText: {
    color: "#065f46",
    fontSize: "15px",
    lineHeight: "1.5",
  },
};

export default GamePage;