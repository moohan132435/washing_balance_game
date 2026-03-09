import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const WADIZ_URL =
  import.meta.env.VITE_WADIZ_URL ||
  "https://www.wadiz.kr/web/campaign/detail/placeholder";

function getScoreTone(score) {
  if (score >= 90) {
    return {
      badge: "S급 밸런스 플레이",
      title: "이 정도면 거의 트러블 응급처치 에이스예요",
      curiosity: "실전에서도 이 밸런스를 유지하려면, 세정 다음 단계에서 무엇을 더해야 할까요?",
      hook: "잘 씻는 것만으로 끝나지 않는 보호 루틴을 확인해보세요.",
    };
  }

  if (score >= 75) {
    return {
      badge: "A급 루틴 감각",
      title: "균형감은 좋았고, 마지막 한 끗이 아쉬웠어요",
      curiosity: "좋은 플레이가 더 좋아지려면, 진정과 보호를 어떻게 이어야 할까요?",
      hook: "트러블 케어 루틴의 마지막 연결고리를 와디즈에서 확인해보세요.",
    };
  }

  if (score >= 60) {
    return {
      badge: "B급 과몰입 클렌저",
      title: "열심히 씻었지만, 케어가 세정보다 뒤로 밀렸어요",
      curiosity: "왜 많이 씻을수록 오히려 아쉬운 결과가 나왔을까요?",
      hook: "과세정 없이 쫀쫀하게 관리하는 포인트를 와디즈에서 확인해보세요.",
    };
  }

  if (score >= 40) {
    return {
      badge: "C급 순서 재정비 필요",
      title: "무엇을 해야 하는지는 알았는데 타이밍이 엇갈렸어요",
      curiosity: "연고, 패치, 세안의 순서가 왜 이렇게 중요할까요?",
      hook: "순서가 바뀌면 체감도 달라지는 이유를 와디즈에서 확인해보세요.",
    };
  }

  return {
    badge: "주의! 과세정 위험",
    title: "지금은 강하게 씻기보다 밸런스를 되찾는 게 먼저예요",
    curiosity: "깨끗함만 쫓으면 왜 오히려 피부 컨디션이 흔들릴까요?",
    hook: "세정력과 보호력의 균형이 왜 중요한지 와디즈에서 확인해보세요.",
  };
}

function buildInsightData(result) {
  const cleanRate = Math.round(result.cleanRate || 0);
  const irritation = Math.round(result.irritation || 0);
  const moisture = Math.round(result.moisture || 0);
  const totalAcne = result.careStats?.totalAcne ?? 0;
  const revealedCount = result.careStats?.revealedCount ?? 0;
  const treatedCount = result.careStats?.treatedCount ?? 0;
  const patchedCount = result.careStats?.patchedCount ?? 0;

  const scoreTone = getScoreTone(result.score || 0);

  const strongPoints = [];
  const weakPoints = [];
  const wadizPoints = [];

  if (cleanRate >= 55 && cleanRate <= 82) {
    strongPoints.push("세정 강도를 비교적 적절하게 맞췄어요.");
  } else if (cleanRate > 82) {
    weakPoints.push("세정이 과해서 피부 밸런스가 쉽게 무너졌어요.");
    wadizPoints.push("쫀쫀하게 씻기되 과하지 않게 마무리하는 세정 밸런스");
  } else {
    weakPoints.push("세정이 부족해 숨은 상태를 충분히 확인하지 못했어요.");
    wadizPoints.push("잔여 노폐감 없이 깔끔하게 정리되는 세안 루틴");
  }

  if (irritation <= 40) {
    strongPoints.push("자극 관리를 잘해서 흐름이 안정적이었어요.");
  } else {
    weakPoints.push("문지르는 강도나 도구 사용으로 자극이 높아졌어요.");
    wadizPoints.push("당김과 자극 부담을 줄이는 진정형 사용감");
  }

  if (moisture >= 40) {
    strongPoints.push("수분 밸런스를 어느 정도 유지했어요.");
  } else {
    weakPoints.push("세안 후 보호력이 부족해 건조하게 끝났어요.");
    wadizPoints.push("세안 뒤에도 당기지 않는 보호감 있는 마무리");
  }

  if (totalAcne === 0) {
    strongPoints.push("이번 판은 트러블 수가 적어 기본 밸런스 유지가 중요했어요.");
    wadizPoints.push("트러블이 올라오기 전부터 관리하는 데일리 루틴");
  } else {
    if (revealedCount === totalAcne) {
      strongPoints.push("등장한 트러블을 끝까지 잘 발견했어요.");
    } else {
      weakPoints.push("올라온 트러블을 모두 발견하지는 못했어요.");
      wadizPoints.push("씻으면서도 피부 변화를 더 빨리 알아차리는 체감 포인트");
    }

    if (treatedCount >= Math.max(1, totalAcne - 1)) {
      strongPoints.push("연고 처리 타이밍이 꽤 좋았어요.");
    } else {
      weakPoints.push("발견 후 진정 액션으로 이어지는 속도가 아쉬웠어요.");
      wadizPoints.push("세안 후 다음 케어로 자연스럽게 넘어가는 루틴 연결감");
    }

    if (patchedCount >= Math.max(1, treatedCount)) {
      strongPoints.push("보호 마무리까지 신경 쓴 플레이였어요.");
    } else {
      weakPoints.push("진정 후 보호 마무리가 부족했어요.");
      wadizPoints.push("트러블 부위를 보호하면서 일상 루틴으로 이어가는 마무리감");
    }
  }

  if (strongPoints.length === 0) {
    strongPoints.push("이번 판에서는 우선 흐름을 익히는 게 핵심이었어요.");
  }

  if (weakPoints.length === 0) {
    weakPoints.push("전체 흐름은 좋았고, 실전에서는 지속력 있는 루틴 설계가 다음 과제예요.");
  }

  const persona =
    irritation >= 55
      ? "자극 과몰입형"
      : moisture <= 35
      ? "건조 엔딩형"
      : treatedCount < revealedCount
      ? "발견 후 머뭇형"
      : patchedCount < treatedCount
      ? "케어 마무리 부족형"
      : "밸런스 감각형";

  const nextMission =
    result.score >= 85
      ? "다음 판에서는 90점 이상 + 랭킹 1위를 노려보세요."
      : result.score >= 60
      ? "다음 판에서는 과세정 없이 연고 → 패치 흐름을 더 빠르게 이어보세요."
      : "다음 판에서는 먼저 얼굴 상태를 보고, 필요할 때만 케어 도구를 써보세요.";

  return {
    scoreTone,
    strongPoints: strongPoints.slice(0, 3),
    weakPoints: weakPoints.slice(0, 3),
    wadizPoints: [...new Set(wadizPoints)].slice(0, 3),
    persona,
    nextMission,
  };
}

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const result = location.state || {
    nickname: localStorage.getItem("nickname") || "PLAYER",
    score: 0,
    grade: "결과 없음",
    cleanRate: 0,
    irritation: 0,
    moisture: 0,
    balanceTime: 0,
    resultMessage: "결과 데이터가 없습니다.",
    ctaText: "와디즈 보러가기",
    scenarioSummary: "",
    scoreBreakdown: {
      cleaningScore: 0,
      irritationScore: 0,
      discoveryScore: 0,
      careOrderScore: 0,
      protectionScore: 0,
    },
    careStats: {
      totalAcne: 0,
      revealedCount: 0,
      treatedCount: 0,
      patchedCount: 0,
    },
  };

  const payload = useMemo(
    () => ({
      nickname: result.nickname,
      score: result.score,
      grade: result.grade,
      cleanRate: Math.round(result.cleanRate || 0),
      irritation: Math.round(result.irritation || 0),
      moisture: Math.round(result.moisture || 0),
      balanceTime: Number(result.balanceTime || 0),
      scenarioSummary: result.scenarioSummary || "",
    }),
    [result]
  );

  const insightData = useMemo(() => buildInsightData(result), [result]);

  useEffect(() => {
    const saveScore = async () => {
      if (saved) return;

      if (!API_BASE_URL) {
        setSaveStatus("error");
        setSaveMessage("API 주소가 설정되지 않았습니다. Vercel 환경변수를 확인해주세요.");
        return;
      }

      try {
        setSaveStatus("saving");
        setSaveMessage("랭킹 저장 중...");

        await axios.post(`${API_BASE_URL}/api/scores`, payload);

        setSaved(true);
        setSaveStatus("success");
        setSaveMessage("랭킹 저장 완료");
      } catch (error) {
        setSaveStatus("error");
        setSaveMessage(
          `랭킹 저장 실패: ${
            error?.response?.data?.message || error?.message || "알 수 없는 오류"
          }`
        );
      }
    };

    saveScore();
  }, [payload, saved]);

  const handleWadizClick = () => {
    window.open(WADIZ_URL, "_blank", "noopener,noreferrer");
  };

  const handleRetrySave = async () => {
    setSaved(false);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.heroBadge}>{insightData.scoreTone.badge}</div>
        <h1 style={styles.title}>게임 결과</h1>
        <div style={styles.heroTitle}>{insightData.scoreTone.title}</div>

        <div style={styles.heroSection}>
          <div style={styles.scoreCircle}>
            <div style={styles.scoreLabel}>SCORE</div>
            <div style={styles.scoreValue}>{result.score}</div>
          </div>

          <div style={styles.heroInfoBox}>
            <div style={styles.nickname}>{result.nickname}</div>
            <div style={styles.grade}>{result.grade}</div>
            <div style={styles.message}>{result.resultMessage}</div>
            <div style={styles.scenario}>{result.scenarioSummary}</div>
            <div style={styles.personaChip}>이번 플레이 성향: {insightData.persona}</div>
          </div>
        </div>

        <div style={styles.teaserBox}>
          <div style={styles.teaserTitle}>이 결과가 재밌는 이유</div>
          <div style={styles.teaserQuestion}>{insightData.scoreTone.curiosity}</div>
          <div style={styles.teaserText}>{insightData.scoreTone.hook}</div>
        </div>

        <div style={styles.statusBox}>
          <div style={styles.statusTitle}>랭킹 저장 상태</div>
          <div
            style={{
              ...styles.statusMessage,
              ...(saveStatus === "success"
                ? styles.statusSuccess
                : saveStatus === "error"
                ? styles.statusError
                : saveStatus === "saving"
                ? styles.statusSaving
                : {}),
            }}
          >
            {saveMessage || "저장 대기중"}
          </div>
          <div style={styles.apiInfo}>API: {API_BASE_URL || "(비어 있음)"}</div>
        </div>

        <div style={styles.statGrid}>
          <StatCard label="세정 진행도" value={Math.round(result.cleanRate || 0)} />
          <StatCard label="자극" value={Math.round(result.irritation || 0)} />
          <StatCard label="수분" value={Math.round(result.moisture || 0)} />
          <StatCard
            label="균형 유지"
            value={`${Number(result.balanceTime || 0).toFixed(1)}초`}
          />
        </div>

        <div style={styles.analysisGrid}>
          <InsightCard
            title="잘한 포인트"
            items={insightData.strongPoints}
            accent="#0f766e"
            bg="#f0fdfa"
          />
          <InsightCard
            title="아쉬운 포인트"
            items={insightData.weakPoints}
            accent="#b45309"
            bg="#fff7ed"
          />
        </div>

        <div style={styles.recommendBox}>
          <div style={styles.sectionTitle}>와디즈에서 이어서 볼 포인트</div>
          <div style={styles.recommendSubtitle}>
            게임에서 궁금해진 포인트를 실제 제품/상세 페이지에서 이어보게 만드는 영역이에요.
          </div>
          <div style={styles.recommendList}>
            {insightData.wadizPoints.map((item, index) => (
              <div key={item} style={styles.recommendItem}>
                <div style={styles.recommendNumber}>0{index + 1}</div>
                <div style={styles.recommendText}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.breakdownBox}>
          <h3 style={styles.sectionTitle}>점수 구성</h3>
          <div style={styles.breakdownItem}>
            세정 점수: {result.scoreBreakdown?.cleaningScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            자극 관리 점수: {result.scoreBreakdown?.irritationScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            문제 발견 점수: {result.scoreBreakdown?.discoveryScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            케어 순서 점수: {result.scoreBreakdown?.careOrderScore ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            보호 마무리 점수: {result.scoreBreakdown?.protectionScore ?? 0}
          </div>
        </div>

        <div style={styles.breakdownBox}>
          <h3 style={styles.sectionTitle}>처리 결과</h3>
          <div style={styles.breakdownItem}>
            총 여드름 수: {result.careStats?.totalAcne ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            발견한 여드름 수: {result.careStats?.revealedCount ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            연고 처리 수: {result.careStats?.treatedCount ?? 0}
          </div>
          <div style={styles.breakdownItem}>
            패치 부착 수: {result.careStats?.patchedCount ?? 0}
          </div>
        </div>

        <div style={styles.missionBox}>
          <div style={styles.missionTitle}>다음 미션</div>
          <div style={styles.missionText}>{insightData.nextMission}</div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={handleWadizClick}>
            {result.ctaText || "와디즈에서 루틴 이어보기"}
          </button>
          <button style={styles.secondaryButton} onClick={() => navigate("/ranking")}>
            랭킹 보기
          </button>
          <button style={styles.secondaryButton} onClick={() => navigate("/game")}>
            다시하기
          </button>
          <button style={styles.secondaryButton} onClick={() => navigate("/")}>
            처음으로
          </button>
          {saveStatus === "error" && (
            <button style={styles.secondaryButton} onClick={handleRetrySave}>
              저장 재시도
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function InsightCard({ title, items, accent, bg }) {
  return (
    <div style={{ ...styles.insightCard, background: bg }}>
      <div style={{ ...styles.insightTitle, color: accent }}>{title}</div>
      <div style={styles.insightList}>
        {items.map((item) => (
          <div key={item} style={styles.insightItem}>
            <span style={{ ...styles.insightDot, background: accent }} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #fffaf5 0%, #fdf2f8 36%, #eef4ff 100%)",
    padding: "24px 16px 48px",
    boxSizing: "border-box",
  },
  card: {
    maxWidth: "920px",
    margin: "0 auto",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.10)",
    border: "1px solid rgba(255,255,255,0.85)",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#fff1f2",
    color: "#be123c",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "14px",
  },
  title: {
    margin: 0,
    fontSize: "38px",
    fontWeight: 800,
    color: "#111827",
  },
  heroTitle: {
    marginTop: "10px",
    fontSize: "20px",
    fontWeight: 700,
    color: "#374151",
    lineHeight: 1.45,
  },
  heroSection: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    gap: "22px",
    marginTop: "24px",
    alignItems: "stretch",
  },
  scoreCircle: {
    minHeight: "220px",
    borderRadius: "28px",
    background: "linear-gradient(180deg, #fff7ed 0%, #fef3c7 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "inset 0 0 0 1px rgba(251, 191, 36, 0.20)",
  },
  scoreLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#92400e",
    letterSpacing: "0.08em",
  },
  scoreValue: {
    marginTop: "10px",
    fontSize: "64px",
    fontWeight: 800,
    color: "#7c2d12",
    lineHeight: 1,
  },
  heroInfoBox: {
    borderRadius: "24px",
    padding: "22px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    justifyContent: "center",
  },
  nickname: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#111827",
  },
  grade: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "14px",
    fontWeight: 700,
  },
  message: {
    fontSize: "15px",
    lineHeight: 1.6,
    color: "#374151",
  },
  scenario: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#64748b",
  },
  personaChip: {
    width: "fit-content",
    marginTop: "4px",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#fdf2f8",
    color: "#be185d",
    fontSize: "13px",
    fontWeight: 700,
  },
  teaserBox: {
    marginTop: "22px",
    borderRadius: "22px",
    padding: "22px",
    background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
    color: "#ffffff",
  },
  teaserTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#f9a8d4",
  },
  teaserQuestion: {
    marginTop: "8px",
    fontSize: "24px",
    fontWeight: 800,
    lineHeight: 1.45,
  },
  teaserText: {
    marginTop: "10px",
    fontSize: "15px",
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.82)",
  },
  statusBox: {
    marginTop: "20px",
    borderRadius: "18px",
    padding: "16px 18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  statusTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
    marginBottom: "8px",
  },
  statusMessage: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#475569",
  },
  statusSuccess: {
    color: "#0f766e",
  },
  statusError: {
    color: "#b91c1c",
  },
  statusSaving: {
    color: "#1d4ed8",
  },
  apiInfo: {
    marginTop: "8px",
    fontSize: "12px",
    color: "#94a3b8",
    wordBreak: "break-all",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginTop: "20px",
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "18px 16px",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#111827",
  },
  analysisGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
    marginTop: "20px",
  },
  insightCard: {
    borderRadius: "20px",
    padding: "20px",
    border: "1px solid rgba(15, 23, 42, 0.06)",
  },
  insightTitle: {
    fontSize: "17px",
    fontWeight: 800,
    marginBottom: "14px",
  },
  insightList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  insightItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    color: "#334155",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  insightDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginTop: "8px",
    flexShrink: 0,
  },
  recommendBox: {
    marginTop: "20px",
    borderRadius: "22px",
    padding: "22px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#111827",
  },
  recommendSubtitle: {
    marginTop: "8px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#7c2d12",
  },
  recommendList: {
    marginTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  recommendItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.72)",
    padding: "14px 16px",
  },
  recommendNumber: {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 800,
    flexShrink: 0,
  },
  recommendText: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#1f2937",
    fontWeight: 600,
  },
  breakdownBox: {
    marginTop: "18px",
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e5e7eb",
    padding: "20px",
  },
  breakdownItem: {
    marginTop: "10px",
    fontSize: "14px",
    color: "#374151",
    lineHeight: 1.6,
  },
  missionBox: {
    marginTop: "20px",
    borderRadius: "20px",
    padding: "20px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  missionTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1d4ed8",
  },
  missionText: {
    marginTop: "8px",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.6,
    color: "#1e3a8a",
  },
  buttonGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    marginTop: "24px",
  },
  primaryButton: {
    gridColumn: "1 / -1",
    border: "none",
    background: "linear-gradient(135deg, #111827 0%, #db2777 100%)",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "16px 18px",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(190, 24, 93, 0.18)",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    borderRadius: "16px",
    padding: "14px 16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default ResultPage;
