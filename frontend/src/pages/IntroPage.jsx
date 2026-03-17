import { useState } from "react";
import { useNavigate } from "react-router-dom";

function IntroPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");

  const handleStart = () => {
    const trimmed = nickname.trim() || "PLAYER";
    localStorage.setItem("nickname", trimmed.slice(0, 12));
    navigate("/game");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.badge}>10초 피부 판단 게임</div>
        <h1 style={styles.title}>이 여드름, 어떻게 할까?</h1>
        <p style={styles.subtitle}>
          화농성인지 비화농성인지 보고<br />
          세안·연고·패치·압출 중 더 나은 선택을 해보세요.
        </p>

        <div style={styles.previewBoard}>
          <div style={styles.previewTimer}>10</div>
          <div style={styles.previewFaceWrap}>
            <div style={styles.previewFace}>
              <div style={{ ...styles.previewSpot, top: "34%", left: "48%", background: "#ef4444" }} />
              <div style={{ ...styles.previewSpot, top: "50%", left: "34%", background: "#f59e0b" }} />
              <div style={{ ...styles.previewSpot, top: "50%", left: "63%", background: "#fde68a" }} />
            </div>
          </div>
        </div>

        <div style={styles.guideGrid}>
          <div style={styles.guideCard}>
            <div style={styles.guideStep}>1</div>
            <div style={styles.guideText}>여드름 상태 확인</div>
          </div>
          <div style={styles.guideCard}>
            <div style={styles.guideStep}>2</div>
            <div style={styles.guideText}>알맞은 관리 선택</div>
          </div>
          <div style={styles.guideCard}>
            <div style={styles.guideStep}>3</div>
            <div style={styles.guideText}>점수와 랭킹 확인</div>
          </div>
        </div>

        <div style={styles.tipBox}>
          압출은 무조건 정답이 아니에요. 게임처럼 가볍게 판단해보세요.
        </div>

        <input
          style={styles.input}
          placeholder="닉네임 입력"
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleStart();
          }}
        />

        <button style={styles.button} onClick={handleStart}>
          시작하기
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
    background: "radial-gradient(circle at top, #dbeafe 0%, #eef2ff 35%, #f8fafc 100%)",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "430px",
    background: "rgba(255,255,255,0.95)",
    borderRadius: "30px",
    padding: "24px 18px 20px",
    boxShadow: "0 22px 60px rgba(15,23,42,0.12)",
    border: "1px solid rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  badge: {
    display: "inline-flex",
    height: "32px",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 14px",
    borderRadius: "999px",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 800,
    fontSize: "12px",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "14px 0 10px",
    fontSize: "clamp(34px, 9vw, 48px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    color: "#0f172a",
  },
  subtitle: {
    margin: "0 0 18px",
    fontSize: "15px",
    lineHeight: 1.55,
    color: "#475569",
    wordBreak: "keep-all",
  },
  previewBoard: {
    position: "relative",
    borderRadius: "28px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    padding: "18px 16px 16px",
    marginBottom: "14px",
    overflow: "hidden",
  },
  previewTimer: {
    position: "absolute",
    top: 12,
    right: 14,
    fontSize: "34px",
    lineHeight: 1,
    fontWeight: 900,
    color: "#facc15",
    textShadow: "0 0 12px rgba(250,204,21,0.55)",
    fontFamily: "'Courier New', monospace",
  },
  previewFaceWrap: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "18px",
  },
  previewFace: {
    position: "relative",
    width: "190px",
    height: "220px",
    borderRadius: "46% 46% 42% 42% / 38% 38% 48% 48%",
    background: "linear-gradient(180deg, #fde7d7 0%, #ffd8bf 100%)",
    boxShadow: "inset 0 -10px 20px rgba(180,83,9,0.08)",
  },
  previewSpot: {
    position: "absolute",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 0 0 4px rgba(255,255,255,0.18)",
  },
  guideGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "14px",
  },
  guideCard: {
    borderRadius: "20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "14px 10px",
  },
  guideStep: {
    width: "30px",
    height: "30px",
    margin: "0 auto 8px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  guideText: {
    fontSize: "13px",
    color: "#334155",
    fontWeight: 700,
    lineHeight: 1.4,
    wordBreak: "keep-all",
  },
  tipBox: {
    borderRadius: "18px",
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "12px 14px",
    fontSize: "14px",
    lineHeight: 1.5,
    marginBottom: "14px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 18px",
    borderRadius: "18px",
    border: "1.5px solid #cbd5e1",
    fontSize: "16px",
    marginBottom: "12px",
    outline: "none",
    background: "#fff",
  },
  button: {
    width: "100%",
    border: "none",
    borderRadius: "20px",
    padding: "18px 18px",
    background: "linear-gradient(90deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#fff",
    fontWeight: 900,
    fontSize: "18px",
    cursor: "pointer",
  },
};

export default IntroPage;
