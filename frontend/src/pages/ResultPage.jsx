import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const WADIZ_URL = import.meta.env.VITE_WADIZ_URL || "https://www.wadiz.kr";

const FALLBACK_RESULT = {
  nickname: localStorage.getItem("nickname") || "PLAYER",
  score: 0,
  grade: "결과 없음",
  cleanRate: 0,
  irritation: 0,
  moisture: 0,
  balanceTime: 0,
  resultMessage: "결과 데이터가 없습니다.",
  ctaText: "와디즈에서 이어서 보기",
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

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [saveStatus, setSaveStatus] = useState("idle");
  const [, setSaveMessage] = useState("");
  const [saved, setSaved] = useState(false);
  // const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardPopupDismissed, setRewardPopupDismissed] = useState(false);
  // const showRewardPopup = (result.score || 0) >= 90;
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 390
  );

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = screenWidth <= 768;
  // const isNarrow = screenWidth <= 430;

  const result = location.state || FALLBACK_RESULT;

  // useEffect(() => {
  //   setShowRewardPopup((result.score || 0) >= 90);
  // }, [result.score]);

  const showRewardPopup = (result.score || 0) >= 90 && !rewardPopupDismissed;

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

        const response = await axios.post(`${API_BASE_URL}/api/scores`, payload);

        setSaved(true);
        setSaveStatus("success");
        setSaveMessage(response?.data?.message || "랭킹 저장 완료");
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

  const scoreBreakdown = result.scoreBreakdown || FALLBACK_RESULT.scoreBreakdown;
  const careStats = result.careStats || FALLBACK_RESULT.careStats;

  const topStrengths = getStrengths(result, scoreBreakdown, careStats).slice(0, 3);
  const topWeaknesses = getWeaknesses(result, scoreBreakdown, careStats).slice(0, 3);
  const wadizPoints = getWadizPoints(result);
  const nextMission = getNextMission(result, scoreBreakdown, careStats);

  const handleWadizClick = () => {
    window.open(WADIZ_URL, "_blank", "noopener,noreferrer");
  };

  const handleRetrySave = () => {
    setSaved(false);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  return (
    <div style={styles.wrapper}>
      {showRewardPopup ? (
        <div style={styles.rewardPopupOverlay}>
          <div style={styles.rewardPopupCard(isMobile)}>
            <div style={styles.rewardPopupTitle}>이벤트 당첨</div>
            <div style={styles.rewardPopupText}>90점을 넘기시다니 대단해요! 무료 세안밴드 행사 당첨!! 캡쳐하여 와디즈 ID와 함께 DM을 해주시면 본주문시 세안밴드를 무료로 드립니다.</div>
            <div style={styles.rewardPopupButtons(isMobile)}>
              <button
                style={styles.rewardPrimaryButton}
                onClick={() => window.open("https://www.instagram.com/direct/t/17842160088619074/", "_blank", "noopener,noreferrer")}
              >
                세안밴드 받기
              </button>
              {/* <button style={styles.rewardSecondaryButton} onClick={() => setShowRewardPopup(false)}>
                닫기
              </button> */}
              <button
                style={styles.rewardSecondaryButton}
                onClick={() => setRewardPopupDismissed(true)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div style={styles.card(isMobile)}>
        <div style={styles.hero(isMobile)}>
          <div style={styles.heroTop(isMobile)}>
            <div>
              <div style={styles.gradeBadge}>{result.grade}</div>
              <h1 style={styles.title(isMobile)}>게임 결과</h1>
              <p style={styles.resultMessage(isMobile)}>{result.resultMessage}</p>
            </div>

            <div style={styles.scoreCard(isMobile)}>
              <div style={styles.scoreLabel}>SCORE</div>
              <div style={styles.scoreValue(isMobile)}>{result.score}</div>
              <div style={styles.scoreSubtext}>{getScoreComment(result.score)}</div>
            </div>
          </div>

          <div style={styles.summaryChips(isMobile)}>
            {result.scenarioSummary ? (
              <div style={styles.summaryChipMuted}>{result.scenarioSummary}</div>
            ) : null}
          </div>
        </div>

        {/* <div style={styles.saveBox(saveStatus)}>
          <div style={styles.sectionEyebrow}>랭킹 저장 상태</div>
          <div style={styles.saveMessage(saveStatus)}>{saveMessage || "저장 대기중"}</div>
          <div style={styles.apiInfo}>{API_BASE_URL || "VITE_API_BASE_URL이 비어 있습니다."}</div>
        </div> */}

        {/* <div style={styles.statGrid(isNarrow)}>
          <StatCard label="세정 진행도" value={Math.round(result.cleanRate || 0)} suffix="" />
          <StatCard label="자극" value={Math.round(result.irritation || 0)} suffix="" />
          <StatCard label="수분" value={Math.round(result.moisture || 0)} suffix="" />
          <StatCard
            label="균형 유지"
            value={Number(result.balanceTime || 0).toFixed(1)}
            suffix="초"
          />
        </div> */}

        {/* <div style={styles.reasonBox}>
          <div style={styles.sectionEyebrow}>이 결과가 재밌는 이유</div>
          <h2 style={styles.reasonTitle(isMobile)}>{getReasonTitle(result, scoreBreakdown)}</h2>
          <p style={styles.reasonDescription}>{getReasonDescription(result, scoreBreakdown)}</p>
        </div> */}

        <div style={styles.twoColumn(isMobile)}>
          <ListCard title="잘한 포인트" tone="good" items={topStrengths} />
          <ListCard title="아쉬운 포인트" tone="bad" items={topWeaknesses} />
        </div>

        <div style={styles.wadizBox}>
          <div style={styles.sectionEyebrowAccent}>이어서 볼 포인트</div>
          {/* <p style={styles.wadizDescription}>
            게임에서 궁금해진 포인트를 실제 제품/상세페이지에서 이어보게 만드는 영역이에요.
          </p> */}

          <div style={styles.wadizList}>
            {wadizPoints.map((item, index) => (
              <div key={`${item}-${index}`} style={styles.wadizItem(isMobile)}>
                <div style={styles.wadizNumber}>{String(index + 1).padStart(2, "0")}</div>
                <div style={styles.wadizText}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        {/* <div style={styles.twoColumn(isMobile)}>
          <DetailBox title="점수 구성">
            <DetailRow label="세정 점수" value={scoreBreakdown.cleaningScore ?? 0} />
            <DetailRow label="자극 관리 점수" value={scoreBreakdown.irritationScore ?? 0} />
            <DetailRow label="문제 발견 점수" value={scoreBreakdown.discoveryScore ?? 0} />
            <DetailRow label="케어 순서 점수" value={scoreBreakdown.careOrderScore ?? 0} />
            <DetailRow label="보호 마무리 점수" value={scoreBreakdown.protectionScore ?? 0} />
          </DetailBox>

          <DetailBox title="처리 결과">
            <DetailRow label="총 여드름 수" value={careStats.totalAcne ?? 0} />
            <DetailRow label="발견한 여드름 수" value={careStats.revealedCount ?? 0} />
            <DetailRow label="연고 처리 수" value={careStats.treatedCount ?? 0} />
            <DetailRow label="패치 부착 수" value={careStats.patchedCount ?? 0} />
          </DetailBox>
        </div> */}

        <div style={styles.missionBox}>
          <div style={styles.sectionEyebrowBlue}>다음 미션</div>
          <div style={styles.missionText}>{nextMission}</div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={handleWadizClick}>
            {result.ctaText || "와디즈에서 루틴 보기"}
          </button>

          <div style={styles.secondaryGrid(isMobile)}>
            <button style={styles.secondaryButton} onClick={() => navigate("/ranking")}>랭킹 보기</button>
            <button
              style={styles.secondaryButton}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                navigate("/game");
              }}
            >
              다시하기
            </button>
            <button style={styles.secondaryButton} onClick={() => navigate("/")}>처음으로</button>
            {saveStatus === "error" ? (
              <button style={styles.secondaryButton} onClick={handleRetrySave}>저장 재시도</button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValueWrap}>
        <span style={styles.statValue}>{value}</span>
        {suffix ? <span style={styles.statSuffix}>{suffix}</span> : null}
      </div>
    </div>
  );
}

function ListCard({ title, tone, items }) {
  const isGood = tone === "good";

  return (
    <div style={styles.listCard(isGood)}>
      <h3 style={styles.listTitle(isGood)}>{title}</h3>
      <div style={styles.listItems}>
        {items.map((item, index) => (
          <div key={`${title}-${index}`} style={styles.listItem}>
            <span style={styles.bullet(isGood)} />
            <span style={styles.listText}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailBox({ title, children }) {
  return (
    <div style={styles.detailBox}>
      <h3 style={styles.detailTitle}>{title}</h3>
      <div style={styles.detailRows}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function getScoreComment(score) {
  if (score >= 90) return "거의 프로 루틴";
  if (score >= 75) return "흐름이 꽤 좋았어요";
  if (score >= 60) return "조금만 다듬으면 더 좋아져요";
  return "다음 판에서 반등 가능";
}

// function getReasonTitle(result, breakdown) {
//   if ((result.cleanRate || 0) >= 90 && (result.irritation || 0) >= 75) {
//     return "왜 많이 씻을수록 오히려 아쉬운 결과가 나왔을까요?";
//   }

//   if ((breakdown.careOrderScore || 0) <= 8) {
//     return "여드름을 발견해도 순서가 꼬이면 점수가 왜 떨어질까요?";
//   }

//   if ((result.moisture || 0) <= 25) {
//     return "깨끗해 보여도 마무리가 건조하면 왜 아쉬울까요?";
//   }

//   return "점수는 괜찮았는데 왜 더 높은 등급이 안 나왔을까요?";
// }

// function getReasonDescription(result, breakdown) {
//   if ((result.cleanRate || 0) >= 90 && (result.irritation || 0) >= 75) {
//     return "과세정 없이 쫀쫀하게 관리하는 포인트를 와디즈에서 확인해보세요.";
//   }

//   if ((breakdown.careOrderScore || 0) <= 8) {
//     return "세안 후 연고와 패치를 어떤 순서로 이어야 덜 자극적인지 상세페이지에서 자연스럽게 이어볼 수 있어요.";
//   }

//   if ((result.moisture || 0) <= 25) {
//     return "세안 직후 당김을 줄이고 마무리감을 높이는 포인트가 다음 클릭 이유가 되게 구성했어요.";
//   }

//   return "결과에서 생긴 궁금증이 실제 제품 이해로 이어지도록 문구 흐름을 설계했어요.";
// }

function getStrengths(result, breakdown, careStats) {
  const items = [];

  if ((careStats.revealedCount || 0) >= Math.max(1, (careStats.totalAcne || 0) - 1)) {
    items.push("등장한 트러블을 끝까지 잘 발견했어요.");
  }
  if ((careStats.treatedCount || 0) >= 3) {
    items.push("연고 처리 타이밍이 꽤 좋았어요.");
  }
  if ((careStats.patchedCount || 0) >= (careStats.treatedCount || 0)) {
    items.push("보호 마무리까지 신경 쓴 플레이였어요.");
  }
  if ((breakdown.cleaningScore || 0) >= 14) {
    items.push("세정 자체는 충분히 해낸 편이에요.");
  }
  if ((breakdown.discoveryScore || 0) >= 12) {
    items.push("숨은 문제를 놓치지 않으려는 흐름이 좋았어요.");
  }

  if (items.length === 0) {
    items.push("기본 플레이 흐름은 잘 잡았어요.");
  }

  return items;
}

function getWeaknesses(result, breakdown, careStats) {
  const items = [];

  if ((result.cleanRate || 0) >= 90) {
    items.push("세정이 과해서 피부 밸런스가 쉽게 무너졌어요.");
  }
  if ((result.irritation || 0) >= 70) {
    items.push("문지르는 강도나 도구 사용으로 자극이 높아졌어요.");
  }
  if ((result.moisture || 0) <= 25) {
    items.push("세안 후 보호력이 부족해 건조하게 끝났어요.");
  }
  if ((breakdown.careOrderScore || 0) <= 8) {
    items.push("연고와 패치 순서가 조금 더 매끄러우면 점수가 올라가요.");
  }
  if ((careStats.treatedCount || 0) < (careStats.revealedCount || 0)) {
    items.push("발견한 트러블을 모두 빠르게 케어하진 못했어요.");
  }

  if (items.length === 0) {
    items.push("조금만 더 빠르게 마무리하면 상위 결과가 가능해요.");
  }

  return items;
}

function getWadizPoints(result) {
  if ((result.cleanRate || 0) >= 90) {
    return [
      "쫀쫀하게 씻기되 과하지 않게 마무리하는 세정 밸런스",
      "당김과 자극 부담을 줄이는 진정형 사용감",
      "세안 뒤에도 당기지 않는 보호감 있는 마무리",
    ];
  }

  if ((result.moisture || 0) <= 25) {
    return [
      "세안 직후 건조함을 덜 느끼게 하는 마무리 포인트",
      "클렌징 후에도 피부가 편안한 사용감 설계",
      "자극은 줄이고 개운함은 남기는 루틴 방향",
    ];
  }

  return [
    "여드름 케어 루틴과 함께 보기 좋은 세정 밸런스",
    "과세정 없이 개운함을 챙기는 사용감 포인트",
    "게임에서 놓친 루틴 디테일을 실제 상세페이지에서 이어보기",
  ];
}

function getNextMission(result, breakdown, careStats) {
  if ((result.cleanRate || 0) >= 90) {
    return "다음 판에서는 과세정 없이 연고 → 패치 흐름을 더 빠르게 이어보세요.";
  }

  if ((breakdown.careOrderScore || 0) <= 8) {
    return "다음 판에서는 발견 즉시 연고, 그 다음 패치 순서를 더 또렷하게 가져가보세요.";
  }

  if ((careStats.revealedCount || 0) < (careStats.totalAcne || 0)) {
    return "다음 판에서는 메이크업 아래 숨은 트러블까지 더 빨리 찾아보세요.";
  }

  return "다음 판에서는 지금 흐름을 유지하면서 자극만 조금 더 낮춰보세요.";
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f4ee 0%, #eef3ff 100%)",
    padding: "16px",
    boxSizing: "border-box",
  },
  card: (isMobile) => ({
    width: "100%",
    maxWidth: "920px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: isMobile ? "24px" : "32px",
    padding: isMobile ? "20px 16px 24px" : "32px",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
    boxSizing: "border-box",
  }),
  hero: (isMobile) => ({
    background: "linear-gradient(135deg, #fffaf2 0%, #fff 55%, #f6f7ff 100%)",
    border: "1px solid #f1eadf",
    borderRadius: isMobile ? "22px" : "28px",
    padding: isMobile ? "18px" : "24px",
    marginBottom: "16px",
  }),
  heroTop: (isMobile) => ({
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 220px",
    gap: "16px",
    alignItems: "start",
  }),
  gradeBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#fdecef",
    color: "#c53b57",
    fontWeight: 800,
    fontSize: "14px",
    marginBottom: "14px",
  },
  title: (isMobile) => ({
    margin: 0,
    fontSize: isMobile ? "42px" : "52px",
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    color: "#0f172a",
  }),
  resultMessage: (isMobile) => ({
    margin: "18px 0 0",
    fontSize: isMobile ? "28px" : "34px",
    lineHeight: 1.32,
    letterSpacing: "-0.03em",
    color: "#374151",
    fontWeight: 800,
    wordBreak: "keep-all",
  }),
  scoreCard: (isMobile) => ({
    background: "#fbf2d9",
    border: "1px solid #f0dfb1",
    borderRadius: isMobile ? "22px" : "28px",
    minHeight: isMobile ? "auto" : "260px",
    padding: isMobile ? "22px 18px" : "28px 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  }),
  scoreLabel: {
    fontSize: "14px",
    letterSpacing: "0.18em",
    color: "#9a3412",
    fontWeight: 800,
    marginBottom: "8px",
  },
  scoreValue: (isMobile) => ({
    fontSize: isMobile ? "72px" : "86px",
    fontWeight: 900,
    lineHeight: 1,
    color: "#9a3412",
  }),
  scoreSubtext: {
    marginTop: "10px",
    color: "#7c2d12",
    fontSize: "14px",
    fontWeight: 700,
  },
  rewardPopupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.52)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
    boxSizing: "border-box",
  },
  rewardPopupCard: (isMobile) => ({
    width: "100%",
    maxWidth: isMobile ? "360px" : "420px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: isMobile ? "22px 18px" : "26px 22px",
    boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22)",
  }),
  rewardPopupTitle: {
    fontSize: "22px",
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: "10px",
  },
  rewardPopupText: {
    color: "#334155",
    fontSize: "16px",
    lineHeight: 1.7,
    wordBreak: "keep-all",
  },
  rewardPopupButtons: (isMobile) => ({
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: "10px",
    marginTop: "18px",
  }),
  rewardPrimaryButton: {
    border: "none",
    borderRadius: "16px",
    padding: "15px 16px",
    background: "linear-gradient(90deg, #1f3a8a 0%, #2563eb 100%)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 900,
    cursor: "pointer",
  },
  rewardSecondaryButton: {
    border: "1px solid #d7dde7",
    borderRadius: "16px",
    padding: "15px 16px",
    background: "#ffffff",
    color: "#111827",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  summaryChips: (isMobile) => ({
    marginTop: "16px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    flexDirection: isMobile ? "column" : "row",
  }),
  summaryChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 700,
  },
  summaryChipMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
    wordBreak: "keep-all",
  },
  saveBox: (status) => ({
    background: status === "error" ? "#fff7f7" : "#f8fafc",
    border: `1px solid ${status === "error" ? "#fecaca" : "#e5e7eb"}`,
    borderRadius: "20px",
    padding: "16px",
    marginBottom: "16px",
  }),
  sectionEyebrow: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#475569",
    marginBottom: "6px",
  },
  sectionEyebrowAccent: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#92400e",
    marginBottom: "8px",
  },
  sectionEyebrowBlue: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#1d4ed8",
    marginBottom: "8px",
  },
  saveMessage: (status) => ({
    color:
      status === "success"
        ? "#047857"
        : status === "error"
        ? "#b91c1c"
        : status === "saving"
        ? "#a16207"
        : "#334155",
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: 1.5,
    wordBreak: "keep-all",
  }),
  apiInfo: {
    marginTop: "8px",
    color: "#94a3b8",
    fontSize: "13px",
    wordBreak: "break-all",
  },
  // statGrid: (isNarrow) => ({
  //   display: "grid",
  //   gridTemplateColumns: isNarrow ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
  //   gap: "12px",
  //   marginBottom: "16px",
  // }),
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    padding: "16px 14px",
    minHeight: "112px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  statLabel: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.4,
    wordBreak: "keep-all",
  },
  statValueWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    flexWrap: "wrap",
  },
  statValue: {
    color: "#0f172a",
    fontSize: "28px",
    fontWeight: 900,
    lineHeight: 1,
  },
  statSuffix: {
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 800,
  },
  reasonBox: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e295b 100%)",
    borderRadius: "24px",
    padding: "20px",
    marginBottom: "16px",
  },
  reasonTitle: (isMobile) => ({
    margin: 0,
    color: "#ffffff",
    fontSize: isMobile ? "24px" : "34px",
    lineHeight: 1.38,
    letterSpacing: "-0.03em",
    wordBreak: "keep-all",
  }),
  reasonDescription: {
    margin: "14px 0 0",
    color: "rgba(255,255,255,0.84)",
    fontSize: "17px",
    lineHeight: 1.65,
    wordBreak: "keep-all",
  },
  twoColumn: (isMobile) => ({
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "16px",
  }),
  listCard: (isGood) => ({
    background: isGood ? "#eef9f8" : "#fff7ef",
    border: `1px solid ${isGood ? "#cfeeea" : "#f3dcc2"}`,
    borderRadius: "22px",
    padding: "18px",
  }),
  listTitle: (isGood) => ({
    margin: "0 0 14px",
    color: isGood ? "#0f766e" : "#b45309",
    fontSize: "18px",
    fontWeight: 900,
  }),
  listItems: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  bullet: (isGood) => ({
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: isGood ? "#0f988d" : "#c75e0b",
    marginTop: "6px",
    flexShrink: 0,
  }),
  listText: {
    color: "#334155",
    fontSize: "17px",
    lineHeight: 1.65,
    wordBreak: "keep-all",
  },
  wadizBox: {
    background: "#fffaf2",
    border: "1px solid #f1d7ae",
    borderRadius: "24px",
    padding: "20px",
    marginBottom: "16px",
  },
  wadizDescription: {
    margin: "0 0 16px",
    color: "#9a3412",
    fontSize: "16px",
    lineHeight: 1.6,
    wordBreak: "keep-all",
  },
  wadizList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  wadizItem: (isMobile) => ({
    display: "grid",
    gridTemplateColumns: isMobile ? "58px 1fr" : "70px 1fr",
    alignItems: "center",
    gap: "14px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: isMobile ? "14px" : "16px",
  }),
  wadizNumber: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "#0f172a",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "20px",
  },
  wadizText: {
    color: "#0f172a",
    fontSize: "17px",
    lineHeight: 1.5,
    fontWeight: 800,
    wordBreak: "keep-all",
  },
  detailBox: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    padding: "20px",
  },
  detailTitle: {
    margin: "0 0 14px",
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 900,
  },
  detailRows: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },
  detailLabel: {
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.5,
    wordBreak: "keep-all",
  },
  detailValue: {
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: 800,
    flexShrink: 0,
  },
  missionBox: {
    background: "#eef4ff",
    border: "1px solid #bfd7ff",
    borderRadius: "24px",
    padding: "20px",
    marginBottom: "16px",
  },
  missionText: {
    color: "#1e40af",
    fontSize: "20px",
    lineHeight: 1.55,
    fontWeight: 800,
    wordBreak: "keep-all",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  primaryButton: {
    width: "100%",
    border: "none",
    borderRadius: "22px",
    padding: "20px 18px",
    background: "linear-gradient(90deg, #201336 0%, #dc267f 100%)",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(220, 38, 127, 0.18)",
  },
  secondaryGrid: (isMobile) => ({
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  }),
  secondaryButton: {
    minHeight: "68px",
    padding: "16px 14px",
    borderRadius: "20px",
    border: "1px solid #d7dde7",
    background: "#ffffff",
    color: "#111827",
    fontSize: "17px",
    fontWeight: 800,
    cursor: "pointer",
    wordBreak: "keep-all",
  },
};

export default ResultPage;
