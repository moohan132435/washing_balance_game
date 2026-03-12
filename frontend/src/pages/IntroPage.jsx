import { useState } from "react";
import { useNavigate } from "react-router-dom";

function IntroPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");

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
    navigate("/game");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>10초 피부 케어 게임</h1>
        {/* <p style={styles.subtitle}>
          얼굴 상태를 확인하고,
          <br />
          세정 → 연고 → 패치 순서로 균형 있게 마무리하세요.
        </p> */}

        <div style={styles.guideBox}>
          <p style={styles.guideTitle}>플레이 방법</p>
          <p style={styles.guideText}>1. 얼굴을 문질러 메이크업/피지를 정리하세요.</p>
          <p style={styles.guideText}>2. 숨은 여드름이 보이면 연고를 사용하세요.</p>
          <p style={styles.guideText}>3. 마지막에 패치를 붙이면 고득점입니다.</p>
          <p style={styles.guideText}>4. 너무 과하게 문지르면 자극이 올라갑니다.</p>
        </div>

        <input
          type="text"
          placeholder="닉네임 입력 (2~10자)"
          value={nickname}
          maxLength={10}
          onChange={(e) => setNickname(e.target.value)}
          style={styles.input}
        />

        <button style={styles.startButton} onClick={handleStart}>
          시작하기
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "36px 28px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "34px",
    fontWeight: "800",
    color: "#1f2937",
  },
  subtitle: {
    margin: "0 0 24px 0",
    fontSize: "18px",
    lineHeight: "1.6",
    color: "#4b5563",
  },
  guideBox: {
    background: "#f8fbff",
    border: "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "20px",
    textAlign: "left",
  },
  guideTitle: {
    margin: "0 0 8px 0",
    fontWeight: "700",
    color: "#1d4ed8",
  },
  guideText: {
    margin: "6px 0",
    color: "#475569",
    fontSize: "15px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    boxSizing: "border-box",
    marginBottom: "14px",
    outline: "none",
  },
  startButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default IntroPage;