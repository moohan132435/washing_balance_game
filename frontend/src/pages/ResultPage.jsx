import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function compareRank(a, b) {
  if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score);
  return String(a.nickname || "").localeCompare(String(b.nickname || ""), "ko");
}

function getGradeLabel(score, fallback) {
  if (fallback) return fallback;
  if (score >= 94) return "피부 응급처치 마스터";
  if (score >= 78) return "침착한 진정형";
  if (score >= 56) return "조금만 더 관찰형";
  return "손부터 가는 압출형";
}

function getMessage(score, fallback) {
  if (fallback) return fallback;
  if (score >= 94) return "상태를 보고 맞는 케어를 거의 놓치지 않았어요.";
  if (score >= 78) return "큰 실수 없이 안정적으로 관리했어요.";
  if (score >= 56) return "조금만 더 보고 고르면 점수가 더 올라가요.";
  return "건드리기 전에 한 번 더 보는 습관이 필요해요.";
}

function getDisplayName(name) {
  if (!name) return "PLAYER";
  return name.length > 6 ? `${name.slice(0, 5)}…` : name;
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state || {};

  const score = Number(result.score || 0);
  const resultType = getGradeLabel(score, result.resultType || result.grade);
  const resultMessage = getMessage(score, result.resultMessage);
  const ctaText = result.ctaText || "와디즈 보러가기";

  const [rankings, setRankings] = useState([]);
  const [saveMeta, setSaveMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function saveAndLoad() {
      try {
        if (result.nickname && Number.isFinite(score)) {
          const saveRes = await fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: result.nickname, score }),
          });

          if (saveRes.ok) {
            const saveJson = await saveRes.json();
            if (!cancelled) setSaveMeta(saveJson);
          }
        }

        const rankingRes = await fetch("/api/rankings?limit=5");
        if (!rankingRes.ok) throw new Error("ranking fetch failed");
        const rankingJson = await rankingRes.json();
        if (!cancelled) {
          setRankings(Array.isArray(rankingJson) ? rankingJson.sort(compareRank) : []);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setRankings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    saveAndLoad();
    return () => {
      cancelled = true;
    };
  }, [result.nickname, score]);

  const rankingCaption = useMemo(() => {
    if (!saveMeta) return "최고 점수 기준으로 랭킹이 저장돼요.";
    if (saveMeta.updated) {
      return `이번 기록 ${saveMeta.storedScore}점이 저장됐어요.`;
    }
    if (saveMeta.storedScore != null) {
      return `기존 최고 점수 ${saveMeta.storedScore}점이 유지됐어요.`;
    }
    return "최고 점수 기준으로 랭킹이 저장돼요.";
  }, [saveMeta]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.topRow}>
          <div>
            <div style={styles.kicker}>RESULT</div>
            <h1 style={styles.title}>게임 결과</h1>
          </div>
          <div style={styles.scoreCard}>
            <div style={styles.scoreLabel}>SCORE</div>
            <div style={styles.scoreValue}>{score}</div>
          </div>
        </div>

        <section style={styles.resultCard}>
          <div style={styles.resultLabel}>결과 유형</div>
          <div style={styles.resultType}>{resultType}</div>
          <div style={styles.resultMessage}>{resultMessage}</div>
        </section>

        <section style={styles.rankingCard}>
          <div style={styles.rankingTitle}>TOP 5 랭킹</div>
          {loading ? (
            <div style={styles.emptyText}>랭킹 불러오는 중...</div>
          ) : rankings.length === 0 ? (
            <div style={styles.emptyText}>아직 저장된 랭킹이 없어요.</div>
          ) : (
            <div style={styles.rankList}>
              {rankings.map((item, index) => (
                <div key={`${item.nickname}-${item.score}-${index}`} style={styles.rankRow}>
                  <div style={styles.rankLeft}>
                    <div style={styles.rankBadge}>{index + 1}</div>
                    <div style={styles.rankMeta}>
                      <div style={styles.rankName}>{getDisplayName(item.nickname)}</div>
                      <div style={styles.rankGrade}>{getGradeLabel(Number(item.score), item.grade)}</div>
                    </div>
                  </div>
                  <div style={styles.rankScore}>{Number(item.score)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={styles.caption}>{rankingCaption}</div>

        <button
          type="button"
          style={styles.ctaButton}
          onClick={() => {
            if (result.ctaHref) {
              window.location.href = result.ctaHref;
              return;
            }
            navigate("/");
          }}
        >
          {ctaText}
        </button>

        <button type="button" style={styles.retryButton} onClick={() => navigate("/")}>
          다시하기
        </button>
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
    gap: "14px",
    alignContent: "start",
  },
  topRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    alignItems: "start",
  },
  kicker: {
    color: "#4c6ef5",
    fontSize: "18px",
    fontWeight: 900,
    letterSpacing: "0.18em",
    marginBottom: "6px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(34px, 9vw, 58px)",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    lineHeight: 1,
  },
  scoreCard: {
    minWidth: "148px",
    borderRadius: "30px",
    padding: "18px 22px",
    background: "linear-gradient(180deg, #0b1434 0%, #0f172a 100%)",
    boxShadow: "0 18px 34px rgba(15,23,42,0.16)",
    textAlign: "center",
  },
  scoreLabel: {
    color: "#d1ddff",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "0.28em",
  },
  scoreValue: {
    marginTop: "6px",
    color: "#f7e67a",
    fontSize: "78px",
    lineHeight: 0.95,
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
  },
  resultCard: {
    background: "rgba(255,255,255,0.98)",
    borderRadius: "28px",
    border: "1px solid #dbe5f3",
    padding: "20px 22px",
    boxShadow: "0 16px 38px rgba(15,23,42,0.06)",
  },
  resultLabel: {
    color: "#4c6ef5",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "10px",
  },
  resultType: {
    color: "#0f172a",
    fontSize: "clamp(28px, 7.6vw, 46px)",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    lineHeight: 1.08,
  },
  resultMessage: {
    marginTop: "16px",
    color: "#6b7280",
    fontSize: "18px",
    lineHeight: 1.5,
    fontWeight: 500,
  },
  rankingCard: {
    background: "rgba(255,255,255,0.98)",
    borderRadius: "28px",
    border: "1px solid #dbe5f3",
    padding: "20px 18px",
    boxShadow: "0 16px 38px rgba(15,23,42,0.06)",
  },
  rankingTitle: {
    color: "#111827",
    fontSize: "22px",
    fontWeight: 900,
    marginBottom: "12px",
  },
  rankList: {
    display: "grid",
    gap: "12px",
  },
  rankRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "10px",
  },
  rankLeft: {
    display: "grid",
    gridTemplateColumns: "58px 1fr",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },
  rankBadge: {
    width: "54px",
    height: "54px",
    borderRadius: "999px",
    background: "#0b1434",
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    fontSize: "28px",
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
  },
  rankMeta: {
    minWidth: 0,
  },
  rankName: {
    color: "#111827",
    fontSize: "clamp(20px, 5.5vw, 34px)",
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rankGrade: {
    marginTop: "6px",
    color: "#8a94a6",
    fontSize: "clamp(14px, 4.2vw, 24px)",
    lineHeight: 1.2,
    fontWeight: 700,
  },
  rankScore: {
    color: "#4c6ef5",
    fontSize: "clamp(24px, 7vw, 44px)",
    fontWeight: 900,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    paddingLeft: "8px",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "16px",
    lineHeight: 1.5,
    padding: "8px 2px 2px",
  },
  caption: {
    textAlign: "center",
    color: "#8a94a6",
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  ctaButton: {
    border: "none",
    borderRadius: "26px",
    minHeight: "82px",
    background: "linear-gradient(90deg, #0b1434 0%, #3152e7 100%)",
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: 900,
    boxShadow: "0 16px 32px rgba(49,82,231,0.22)",
  },
  retryButton: {
    border: "1px solid #d4deed",
    borderRadius: "22px",
    minHeight: "58px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 800,
  },
};
