import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const FACE_POOL = [
  { key: "male", src: "/faces/male_face_game.png", label: "남자 피부" },
  { key: "female", src: "/faces/female_face_game.png", label: "여자 피부" },
];

function pickRandomFace() {
  return FACE_POOL[Math.floor(Math.random() * FACE_POOL.length)];
}

function IntroPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [face, setFace] = useState(() => pickRandomFace());

  useEffect(() => {
    localStorage.setItem("selectedFaceKey", face.key);
  }, [face]);

  const helperText = useMemo(
    () => ["화농성은 진정 먼저", "좁쌀·블랙헤드는 세안 우선", "압출은 정답이 아닐 수 있어요"],
    []
  );

  const handleStart = () => {
    const trimmed = nickname.trim();

    if (!trimmed) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (trimmed.length < 2 || trimmed.length > 10) {
      alert("닉네임은 2~10자로 입력해주세요.");
      return;
    }

    localStorage.setItem("nickname", trimmed);
    localStorage.setItem("selectedFaceKey", face.key);
    navigate("/game");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.badge}>10초 피부 판단 게임</div>
        <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>
        <p style={styles.subtitle}>화농성인지 비화농성인지 보고 세안 · 연고 · 패치 · 압출 중 더 나은 선택을 해보세요.</p>

        <div style={styles.heroFrame}>
          <img src={face.src} alt={face.label} style={styles.heroImage} />
          <button type="button" style={styles.shuffleButton} onClick={() => setFace(pickRandomFace())}>
            얼굴 바꾸기
          </button>
        </div>

        <div style={styles.stepGrid}>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepText}>여드름 상태 확인</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepText}>알맞은 관리 선택</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepText}>점수와 랭킹 확인</div>
          </div>
        </div>

        <div style={styles.helperBox}>
          {helperText.map((item) => (
            <div key={item} style={styles.helperLine}>{item}</div>
          ))}
        </div>

        <input
          type="text"
          placeholder="닉네임 입력 (2~10자)"
          value={nickname}
          maxLength={10}
          onChange={(e) => setNickname(e.target.value)}
          style={styles.input}
        />

        <button style={styles.startButton} onClick={handleStart}>시작하기</button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    background: "linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    padding: "18px",
    boxShadow: "0 18px 46px rgba(15,23,42,0.1)",
    border: "1px solid #dbe4f0",
    display: "grid",
    gap: "14px",
  },
  badge: {
    justifySelf: "center",
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "14px",
    letterSpacing: "0.02em",
  },
  title: {
    margin: 0,
    textAlign: "center",
    color: "#0f172a",
    fontSize: "clamp(34px, 8vw, 56px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    fontWeight: 900,
  },
  subtitle: {
    margin: 0,
    textAlign: "center",
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.5,
    wordBreak: "keep-all",
  },
  heroFrame: {
    position: "relative",
    borderRadius: "28px",
    background: "linear-gradient(180deg, #0f172a 0%, #111c3d 100%)",
    overflow: "hidden",
    aspectRatio: "1 / 1",
    minHeight: "260px",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 35%",
    display: "block",
  },
  shuffleButton: {
    position: "absolute",
    right: "12px",
    bottom: "12px",
    border: "none",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.92)",
    color: "#0f172a",
    padding: "10px 14px",
    fontWeight: 800,
  },
  stepGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  stepCard: {
    borderRadius: "20px",
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    padding: "12px 10px",
    textAlign: "center",
    minHeight: "108px",
    display: "grid",
    alignContent: "center",
    gap: "8px",
  },
  stepNumber: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    margin: "0 auto",
    display: "grid",
    placeItems: "center",
    background: "#3b63e6",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "28px",
  },
  stepText: {
    color: "#1e293b",
    fontSize: "14px",
    fontWeight: 800,
    lineHeight: 1.35,
    wordBreak: "keep-all",
  },
  helperBox: {
    borderRadius: "18px",
    background: "#eef4ff",
    padding: "12px 14px",
    display: "grid",
    gap: "6px",
  },
  helperLine: {
    color: "#1f3ea7",
    fontSize: "14px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "16px 18px",
    borderRadius: "18px",
    border: "1.5px solid #cbd5e1",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
    background: "#ffffff",
  },
  startButton: {
    width: "100%",
    padding: "17px 18px",
    border: "none",
    borderRadius: "20px",
    background: "linear-gradient(90deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(29, 78, 216, 0.18)",
  },
};

export default IntroPage;
