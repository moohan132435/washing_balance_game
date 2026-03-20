import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const FACE_OPTIONS = [
  { key: "female", src: "/faces/female_face_game.png", label: "여자 캐릭터" },
  { key: "male", src: "/faces/male_face_game.png", label: "남자 캐릭터" },
];

function IntroPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [selectedFaceKey, setSelectedFaceKey] = useState(() => {
    const saved = localStorage.getItem("selectedFaceKey");
    return saved === "male" || saved === "female" ? saved : "female";
  });

  useEffect(() => {
    localStorage.setItem("selectedFaceKey", selectedFaceKey);
  }, [selectedFaceKey]);

  const selectedFace = FACE_OPTIONS.find((item) => item.key === selectedFaceKey) || FACE_OPTIONS[0];

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
    localStorage.setItem("selectedFaceKey", selectedFace.key);
    navigate("/game");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.badge}>10초 세안 밸런스 게임</div>
        <h1 style={styles.title}>세안 순서를 맞춰볼까?</h1>
        <p style={styles.subtitle}>
          분홍 포인트는 문지르고, 하늘 포인트는 2단계 터치, 살구 포인트는 3단계 터치로 마무리해보세요.
        </p>

        <div style={styles.heroFrame}>
          <img src={selectedFace.src} alt={selectedFace.label} style={styles.heroImage} />
        </div>

        <div style={styles.choiceWrap}>
          {FACE_OPTIONS.map((option) => {
            const active = option.key === selectedFaceKey;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedFaceKey(option.key)}
                style={{
                  ...styles.choiceButton,
                  borderColor: active ? "#1d4ed8" : "#d8e1ee",
                  background: active ? "#eff6ff" : "#ffffff",
                  boxShadow: active ? "0 0 0 3px rgba(29,78,216,0.12)" : "none",
                }}
              >
                {option.key === "female" ? "여자" : "남자"}
              </button>
            );
          })}
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
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    background: "rgba(255,255,255,0.97)",
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
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "14px",
  },
  title: {
    margin: 0,
    textAlign: "center",
    color: "#0f172a",
    fontSize: "clamp(30px, 8vw, 50px)",
    lineHeight: 1.05,
    letterSpacing: "-0.05em",
    fontWeight: 900,
    wordBreak: "keep-all",
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
    objectPosition: "center 32%",
    display: "block",
  },
  choiceWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  choiceButton: {
    borderRadius: "18px",
    border: "2px solid #d8e1ee",
    background: "#fff",
    minHeight: "54px",
    fontWeight: 900,
    color: "#0f172a",
  },
  input: {
    width: "100%",
    padding: "16px 18px",
    borderRadius: "18px",
    border: "1.5px solid #cbd5e1",
    fontSize: "16px",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  startButton: {
    width: "100%",
    padding: "17px 18px",
    border: "none",
    borderRadius: "20px",
    background: "linear-gradient(90deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#fff",
    fontSize: "18px",
    fontWeight: 900,
    boxShadow: "0 12px 24px rgba(29, 78, 216, 0.18)",
  },
};

export default IntroPage;
