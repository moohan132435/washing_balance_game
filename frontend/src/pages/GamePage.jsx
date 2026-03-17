import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_TIME = 10;
const QUESTIONS_PER_GAME = 5;

const QUESTION_BANK = [
  {
    id: "q1",
    type: "화농성",
    zone: "이마 중앙",
    prompt: "빨갛게 올라오고 살짝 곪은 트러블이에요.",
    tone: "inflamed",
    bestAction: "ointment",
    scores: { squeeze: -16, ointment: 22, patch: 16, wash: 4 },
    feedback: {
      squeeze: "압출은 자극이 커서 감점!",
      ointment: "좋아요. 먼저 진정 케어를 선택했어요.",
      patch: "보호 선택은 괜찮지만, 먼저 진정이 더 좋아요.",
      wash: "세안만으로 끝내기엔 관리가 조금 부족해요.",
    },
  },
  {
    id: "q2",
    type: "비화농성",
    zone: "코 옆",
    prompt: "작고 하얗게 막힌 느낌의 좁쌀 트러블이에요.",
    tone: "nonInflamed",
    bestAction: "wash",
    scores: { squeeze: -12, ointment: 10, patch: 0, wash: 22 },
    feedback: {
      squeeze: "무리한 압출은 오히려 감점!",
      ointment: "나쁘진 않지만, 우선은 순한 세안이 더 잘 맞아요.",
      patch: "보호보다는 기본 세안이 더 먼저예요.",
      wash: "좋아요. 과한 자극 없이 기본 케어를 골랐어요.",
    },
  },
  {
    id: "q3",
    type: "화농성",
    zone: "턱 라인",
    prompt: "건드리면 아픈 붉은 트러블이에요.",
    tone: "inflamed",
    bestAction: "ointment",
    scores: { squeeze: -18, ointment: 22, patch: 14, wash: 2 },
    feedback: {
      squeeze: "아픈 트러블은 무리한 압출이 더 불리해요.",
      ointment: "좋아요. 진정 중심 판단이었어요.",
      patch: "보호는 괜찮지만, 먼저 진정이 더 좋아요.",
      wash: "씻는 것만으론 부족할 수 있어요.",
    },
  },
  {
    id: "q4",
    type: "비화농성",
    zone: "왼쪽 볼",
    prompt: "붉진 않지만 오돌토돌하게 올라온 상태예요.",
    tone: "nonInflamed",
    bestAction: "wash",
    scores: { squeeze: -10, ointment: 8, patch: -2, wash: 22 },
    feedback: {
      squeeze: "짜는 선택은 아쉬워요.",
      ointment: "부분적으로는 괜찮지만, 기본은 세안이에요.",
      patch: "패치는 이번 상황과는 잘 안 맞아요.",
      wash: "좋아요. 우선 자극 적은 관리가 맞아요.",
    },
  },
  {
    id: "q5",
    type: "화농성",
    zone: "오른쪽 볼",
    prompt: "도드라지고 붉은기 있는 트러블이에요.",
    tone: "inflamed",
    bestAction: "patch",
    scores: { squeeze: -18, ointment: 18, patch: 22, wash: 2 },
    feedback: {
      squeeze: "건드리는 선택은 감점!",
      ointment: "진정 케어는 좋아요. 보호까지 있으면 더 좋아요.",
      patch: "좋아요. 건드리지 않고 보호했어요.",
      wash: "세안만으론 부족해요.",
    },
  },
  {
    id: "q6",
    type: "비화농성",
    zone: "미간",
    prompt: "작고 단단하게 올라온 막힌 트러블이에요.",
    tone: "nonInflamed",
    bestAction: "wash",
    scores: { squeeze: -10, ointment: 8, patch: -2, wash: 22 },
    feedback: {
      squeeze: "성급한 압출은 감점이에요.",
      ointment: "보조로는 괜찮지만 우선순위는 아니에요.",
      patch: "패치보다는 기본 세안이 더 잘 맞아요.",
      wash: "좋아요. 기본 관리 선택이 맞았어요.",
    },
  },
  {
    id: "q7",
    type: "화농성",
    zone: "턱 중앙",
    prompt: "붉고 민감한 트러블이라 자극을 줄여야 해요.",
    tone: "inflamed",
    bestAction: "patch",
    scores: { squeeze: -18, ointment: 16, patch: 22, wash: 2 },
    feedback: {
      squeeze: "자극이 커질 수 있어 감점!",
      ointment: "괜찮아요. 진정 판단이 있었어요.",
      patch: "좋아요. 건드리지 않고 보호했어요.",
      wash: "세안만으로는 부족한 선택이에요.",
    },
  },
];

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function getResultType(score) {
  if (score >= 90) return "피부 판단 마스터";
  if (score >= 75) return "진정 우선 감각형";
  if (score >= 60) return "기본기는 있는 타입";
  if (score >= 40) return "조금 더 신중할 타입";
  return "손부터 가는 압출형";
}

function getResultMessage(score) {
  if (score >= 90) return "자극을 줄이면서 상황별 선택을 꽤 잘했어요.";
  if (score >= 75) return "전체적으로 좋은 판단이 많았어요.";
  if (score >= 60) return "나쁘지 않지만 몇 번은 아쉬운 선택이 있었어요.";
  if (score >= 40) return "급하게 손대는 순간 감점이 커졌어요.";
  return "건드리기 전에 한 번 더 보는 습관이 필요해요.";
}

function getAcneVisual(question) {
  const map = {
    "이마 중앙": { top: "28%", left: "50%" },
    "코 옆": { top: "46%", left: "58%" },
    "턱 라인": { top: "74%", left: "48%" },
    "왼쪽 볼": { top: "50%", left: "30%" },
    "오른쪽 볼": { top: "50%", left: "70%" },
    "미간": { top: "34%", left: "50%" },
    "턱 중앙": { top: "76%", left: "50%" },
  };
  return map[question.zone] || { top: "50%", left: "50%" };
}

function GamePage() {
  const navigate = useNavigate();
  const nickname = localStorage.getItem("nickname") || "PLAYER";
  const questions = useMemo(() => shuffle(QUESTION_BANK).slice(0, QUESTIONS_PER_GAME), []);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState("화면을 보고 더 나은 관리 버튼을 골라보세요.");
  const [flashAction, setFlashAction] = useState("");
  const finishedRef = useRef(false);

  const currentQuestion = questions[questionIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft > 0) return;
    if (finishedRef.current) return;
    finishedRef.current = true;

    const resultType = getResultType(score);
    navigate("/result", {
      replace: true,
      state: {
        nickname,
        score: Math.max(0, Math.min(100, score)),
        grade: resultType,
        resultType,
        cleanRate: 0,
        irritation: 0,
        moisture: 0,
        balanceTime: TOTAL_TIME,
        resultMessage: getResultMessage(score),
        ctaText: "와디즈 보러가기",
        scenarioSummary: `${answers.filter((item) => item.action === "squeeze").length}번 압출 선택 / ${answers.filter((item) => item.correct).length}개 정답`,
        careStats: {
          total: questions.length,
          solved: answers.length,
          correct: answers.filter((item) => item.correct).length,
        },
      },
    });
  }, [answers, navigate, nickname, questions.length, score, timeLeft]);

  const handleAction = (action) => {
    if (!currentQuestion || timeLeft <= 0 || finishedRef.current) return;

    const delta = currentQuestion.scores[action] ?? 0;
    const nextScore = Math.max(0, Math.min(100, score + delta));
    const correct = action === currentQuestion.bestAction;
    setScore(nextScore);
    setFlashAction(action);
    setFeedback(currentQuestion.feedback[action]);
    setAnswers((prev) => [
      ...prev,
      {
        id: currentQuestion.id,
        action,
        correct,
        delta,
      },
    ]);

    window.setTimeout(() => {
      setFlashAction("");
      setQuestionIndex((prev) => {
        if (prev >= questions.length - 1) {
          finishedRef.current = true;
          const resultType = getResultType(nextScore);
          navigate("/result", {
            replace: true,
            state: {
              nickname,
              score: nextScore,
              grade: resultType,
              resultType,
              cleanRate: 0,
              irritation: 0,
              moisture: 0,
              balanceTime: TOTAL_TIME - timeLeft,
              resultMessage: getResultMessage(nextScore),
              ctaText: "와디즈 보러가기",
              scenarioSummary: `${actionLabelCount([...answers, { action }], "squeeze")}번 압출 선택 / ${[...answers, { correct }].filter((item) => item.correct).length}개 정답`,
              careStats: {
                total: questions.length,
                solved: answers.length + 1,
                correct: [...answers, { correct }].filter((item) => item.correct).length,
              },
            },
          });
          return prev;
        }
        return prev + 1;
      });
    }, 650);
  };

  if (!currentQuestion) return null;

  const visual = getAcneVisual(currentQuestion);
  const countdownText = String(timeLeft).padStart(2, "0");
  const progressText = `${questionIndex + 1}/${questions.length}`;

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <button type="button" style={styles.closeButton} onClick={() => navigate("/")}>
            ×
          </button>
          <div style={styles.topCenter}>
            <div style={styles.player}>{nickname}</div>
            <div style={styles.progress}>ROUND {progressText}</div>
          </div>
          <div style={styles.countdownBox}>
            <div style={styles.countdownLabel}>TIME</div>
            <div style={styles.countdownValue}>{countdownText}</div>
          </div>
        </div>

        <div style={styles.stageCard}>
          <div style={styles.questionChipRow}>
            <div style={{ ...styles.typeChip, background: currentQuestion.tone === "inflamed" ? "#fee2e2" : "#fef3c7", color: currentQuestion.tone === "inflamed" ? "#b91c1c" : "#92400e" }}>
              {currentQuestion.type}
            </div>
            <div style={styles.scoreChip}>SCORE {score}</div>
          </div>

          <div style={styles.questionTitle}>이 여드름, 어떻게 할까?</div>
          <div style={styles.questionDesc}>{currentQuestion.zone} · {currentQuestion.prompt}</div>

          <div style={styles.faceStage}>
            <div style={styles.faceShadow} />
            <div style={styles.hair} />
            <div style={styles.face}>
              <div style={{ ...styles.eye, left: "30%" }} />
              <div style={{ ...styles.eye, left: "62%" }} />
              <div style={styles.mouth} />
              <div style={{ ...styles.cheek, left: "22%" }} />
              <div style={{ ...styles.cheek, right: "22%" }} />
              <div style={{ ...styles.acneSpot, ...visual, background: currentQuestion.tone === "inflamed" ? "radial-gradient(circle, #ef4444 0%, #dc2626 52%, rgba(239,68,68,0.24) 100%)" : "radial-gradient(circle, #fde68a 0%, #f59e0b 55%, rgba(245,158,11,0.18) 100%)", boxShadow: currentQuestion.tone === "inflamed" ? "0 0 0 12px rgba(239,68,68,0.14)" : "0 0 0 10px rgba(245,158,11,0.1)" }} />
              {flashAction === "ointment" && <div style={{ ...styles.actionStamp, top: "20%", right: "6%" }}>연고</div>}
              {flashAction === "patch" && <div style={{ ...styles.patchStamp, ...visual }}>PATCH</div>}
              {flashAction === "squeeze" && <div style={{ ...styles.warningStamp, top: "18%", left: "8%" }}>!</div>}
              {flashAction === "wash" && <div style={styles.foamLayer} />}
            </div>
          </div>

          <div style={styles.feedbackBox}>{feedback}</div>
        </div>

        <div style={styles.buttonGrid}>
          <ActionButton label="압출" hint="짜기" tone="danger" onClick={() => handleAction("squeeze")} />
          <ActionButton label="연고" hint="진정" tone="blue" onClick={() => handleAction("ointment")} />
          <ActionButton label="패치" hint="보호" tone="yellow" onClick={() => handleAction("patch")} />
          <ActionButton label="세안" hint="기본" tone="white" onClick={() => handleAction("wash")} />
        </div>
      </div>
    </div>
  );
}

function actionLabelCount(list, label) {
  return list.filter((item) => item.action === label).length;
}

function ActionButton({ label, hint, tone, onClick }) {
  const toneMap = {
    danger: { bg: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)", color: "#fff", border: "none" },
    blue: { bg: "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", border: "none" },
    yellow: { bg: "linear-gradient(180deg, #facc15 0%, #eab308 100%)", color: "#111827", border: "none" },
    white: { bg: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1" },
  };

  const style = toneMap[tone];

  return (
    <button type="button" onClick={onClick} style={{ ...styles.actionButton, background: style.bg, color: style.color, border: style.border }}>
      <div style={styles.actionLabel}>{label}</div>
      <div style={{ ...styles.actionHint, color: tone === "white" ? "#64748b" : "rgba(255,255,255,0.9)" }}>{hint}</div>
    </button>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    background: "radial-gradient(circle at top, #dbeafe 0%, #eff6ff 32%, #f8fafc 100%)",
  },
  shell: {
    minHeight: "100svh",
    display: "grid",
    gridTemplateRows: "72px 1fr auto",
    maxWidth: "520px",
    margin: "0 auto",
    padding: "12px 12px max(16px, env(safe-area-inset-bottom))",
    boxSizing: "border-box",
    gap: "10px",
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "52px 1fr auto",
    alignItems: "center",
    gap: "10px",
  },
  closeButton: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
    border: "1px solid #dbeafe",
    background: "rgba(255,255,255,0.8)",
    fontSize: "30px",
    lineHeight: 1,
    color: "#0f172a",
    cursor: "pointer",
  },
  topCenter: {
    minWidth: 0,
  },
  player: {
    fontSize: "14px",
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: "4px",
  },
  progress: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
  countdownBox: {
    minWidth: "94px",
    height: "60px",
    borderRadius: "20px",
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
  },
  countdownLabel: {
    fontSize: "10px",
    letterSpacing: "0.18em",
    color: "#93c5fd",
    fontWeight: 900,
  },
  countdownValue: {
    fontSize: "34px",
    lineHeight: 1,
    fontWeight: 900,
    color: "#facc15",
    fontFamily: "'Courier New', monospace",
    textShadow: "0 0 10px rgba(250,204,21,0.45)",
  },
  stageCard: {
    borderRadius: "32px",
    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 22px 50px rgba(15,23,42,0.1)",
    padding: "16px 14px 14px",
    display: "grid",
    gridTemplateRows: "auto auto auto 1fr auto",
    minHeight: 0,
    overflow: "hidden",
  },
  questionChipRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "10px",
  },
  typeChip: {
    height: "34px",
    padding: "0 14px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: 900,
  },
  scoreChip: {
    height: "34px",
    padding: "0 14px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "inline-flex",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: 900,
  },
  questionTitle: {
    fontSize: "30px",
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    marginBottom: "6px",
  },
  questionDesc: {
    fontSize: "15px",
    lineHeight: 1.5,
    color: "#475569",
    marginBottom: "6px",
    wordBreak: "keep-all",
  },
  faceStage: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 0 4px",
  },
  faceShadow: {
    position: "absolute",
    bottom: "12px",
    width: "200px",
    height: "38px",
    background: "rgba(15,23,42,0.12)",
    filter: "blur(18px)",
    borderRadius: "50%",
  },
  hair: {
    position: "absolute",
    top: "8%",
    width: "280px",
    height: "290px",
    borderRadius: "44% 44% 40% 40% / 46% 46% 38% 38%",
    background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
  },
  face: {
    position: "relative",
    width: "248px",
    height: "312px",
    borderRadius: "45% 45% 42% 42% / 38% 38% 48% 48%",
    background: "linear-gradient(180deg, #ffe7d5 0%, #ffd8bf 100%)",
    boxShadow: "inset 0 -16px 24px rgba(180,83,9,0.09)",
    overflow: "hidden",
    zIndex: 1,
  },
  eye: {
    position: "absolute",
    top: "38%",
    width: "26px",
    height: "14px",
    borderRadius: "999px",
    background: "#111827",
  },
  mouth: {
    position: "absolute",
    left: "50%",
    bottom: "22%",
    transform: "translateX(-50%)",
    width: "48px",
    height: "22px",
    borderRadius: "0 0 30px 30px",
    borderBottom: "4px solid #b45309",
  },
  cheek: {
    position: "absolute",
    top: "54%",
    width: "28px",
    height: "18px",
    borderRadius: "50%",
    background: "rgba(244,114,182,0.18)",
  },
  acneSpot: {
    position: "absolute",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
  },
  actionStamp: {
    position: "absolute",
    minWidth: "56px",
    height: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 20px rgba(37,99,235,0.25)",
  },
  patchStamp: {
    position: "absolute",
    width: "54px",
    height: "24px",
    borderRadius: "999px",
    transform: "translate(-50%, -50%) rotate(-10deg)",
    background: "rgba(255,255,255,0.85)",
    border: "1px solid #cbd5e1",
    color: "#334155",
    fontSize: "10px",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  warningStamp: {
    position: "absolute",
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
    fontSize: "26px",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 20px rgba(239,68,68,0.24)",
  },
  foamLayer: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 30% 36%, rgba(255,255,255,0.95) 0 10px, transparent 11px), radial-gradient(circle at 58% 54%, rgba(255,255,255,0.92) 0 14px, transparent 15px), radial-gradient(circle at 46% 66%, rgba(255,255,255,0.9) 0 10px, transparent 11px), radial-gradient(circle at 68% 36%, rgba(255,255,255,0.85) 0 8px, transparent 9px)",
    opacity: 0.95,
  },
  feedbackBox: {
    marginTop: "8px",
    borderRadius: "18px",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "14px 14px",
    fontSize: "14px",
    lineHeight: 1.5,
    fontWeight: 700,
    textAlign: "left",
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },
  actionButton: {
    minHeight: "88px",
    borderRadius: "24px",
    boxShadow: "0 16px 30px rgba(15,23,42,0.08)",
    cursor: "pointer",
    padding: "14px 10px",
  },
  actionLabel: {
    fontSize: "24px",
    fontWeight: 900,
    letterSpacing: "-0.04em",
    marginBottom: "4px",
  },
  actionHint: {
    fontSize: "13px",
    fontWeight: 800,
  },
};

export default GamePage;
