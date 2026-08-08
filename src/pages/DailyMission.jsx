import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import CardRevealModal from "../components/CardRevealModal";
import { CheckIcon } from "../components/Icons";
import { loadPokemonData, pickRandom } from "../utils/pokemonData";
import {
  getMissionsWithStatus,
  getCustomMissions,
  addCustomMission,
  removeCustomMission,
  completeMission,
  completeBonus,
  getTodayCompletedCount,
  getWeeklyCompletedCount,
  getCardsAwardedToday,
  isCardCapReachedToday,
  DAILY_CARD_CAP,
} from "../utils/dailyMission";
import { vibrate } from "../utils/haptics";
import { useMissionChime } from "../hooks/useMissionChime";

const ERROR_LABEL_KO = {
  empty: "미션 이름을 입력해주세요",
  too_long: "미션 이름은 20자 이하로 적어주세요",
  limit_reached: "커스텀 미션은 최대 10개까지 추가할 수 있어요",
};

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DailyMission() {
  const [all, setAll] = useState([]);
  const [missions, setMissions] = useState(() => getMissionsWithStatus());
  const [customLabel, setCustomLabel] = useState("");
  const [customError, setCustomError] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [revealQueue, setRevealQueue] = useState([]);
  const playChime = useMissionChime();

  useEffect(() => {
    loadPokemonData().then(setAll);
  }, []);

  // setMissions는 매번 새 배열을 만들어 반환하므로 항상 리렌더를 일으킨다 —
  // 그 리렌더 때 아래 getCustomMissions()/getTodayCompletedCount() 등도
  // render 본문에서 다시 호출되어 최신 localStorage 상태를 반영한다.
  function refresh() {
    setMissions(getMissionsWithStatus());
  }

  function handleConfirmComplete() {
    const missionId = confirmTarget;
    setConfirmTarget(null);
    if (!missionId || all.length === 0) return;

    const picked = pickRandom(all, 1)[0];
    const outcome = completeMission(missionId, picked.id);
    if (!outcome) return; // 방어적: 이미 완료된 상태였다면 아무 것도 하지 않음

    // 오늘 카드 지급 상한을 넘기면 cardResult가 null이다 — 미션 완료(체크/시간)는
    // 그대로 기록되지만 뽑기 연출은 띄우지 않는다.
    const queue = [];
    if (outcome.cardResult) queue.push({ result: outcome.cardResult, pokemon: picked });

    if (outcome.allCompleted) {
      const bonusPicked = pickRandom(all, 1)[0];
      const bonusResult = completeBonus(bonusPicked.id);
      if (bonusResult) queue.push({ result: bonusResult, pokemon: bonusPicked });
    }

    playChime();
    vibrate(200);
    setRevealQueue(queue);
    refresh();
  }

  function handleCloseReveal() {
    setRevealQueue((q) => q.slice(1));
  }

  function handleAddCustom(e) {
    e.preventDefault();
    const result = addCustomMission(customLabel);
    if (!result.ok) {
      setCustomError(ERROR_LABEL_KO[result.error]);
      return;
    }
    setCustomLabel("");
    setCustomError(null);
    refresh();
  }

  function handleRemoveCustom(id) {
    removeCustomMission(id);
    refresh();
  }

  const todayCount = getTodayCompletedCount();
  const weekCount = getWeeklyCompletedCount();
  const cardsToday = getCardsAwardedToday();
  const capReached = isCardCapReachedToday();
  const customMissions = getCustomMissions();
  const activeReveal = revealQueue[0] || null;

  return (
    <AppShell title="일일 미션" backTo="/quiz">
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
          <span>
            오늘 완료 {todayCount}/{missions.length}
          </span>
          <span>
            오늘 획득 카드 {cardsToday}/{DAILY_CARD_CAP}장
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
          이번 주 {weekCount}개 완료 · 매일 자정에 초기화돼요
        </div>
        {capReached && (
          <div style={{ fontSize: 12, color: "var(--color-danger)", marginTop: 4 }}>
            오늘 카드 지급 한도({DAILY_CARD_CAP}장)에 도달했어요 — 미션 체크는 계속 기록돼요
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        {missions.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              marginBottom: 8,
              opacity: m.completedToday ? 0.55 : 1,
            }}
          >
            {m.completedToday && <CheckIcon size={18} style={{ color: "var(--color-success)" }} />}
            <span style={{ flex: 1, fontWeight: 600 }}>{m.label}</span>
            {m.completedToday ? (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {formatTime(m.completedAt)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmTarget(m.id)}
                className="press"
                style={{
                  minHeight: 36,
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  background: "var(--color-primary)",
                  color: "var(--color-text-on-primary)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                완료
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "var(--space-5)" }}>
        <h3 style={{ fontSize: 15, fontFamily: "var(--font-heading)", fontWeight: 400 }}>
          커스텀 미션
        </h3>
        <form onSubmit={handleAddCustom} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            maxLength={20}
            placeholder="새 미션 이름 (최대 20자)"
            disabled={customMissions.length >= 10}
            style={{
              flex: 1,
              padding: "10px 12px",
              minHeight: 40,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          />
          <button
            type="submit"
            disabled={customMissions.length >= 10}
            className="press"
            style={{
              minHeight: 40,
              padding: "0 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
            }}
          >
            추가
          </button>
        </form>
        {customError && (
          <p style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4 }}>{customError}</p>
        )}

        {customMissions.map((m) => (
          <div
            key={m.id}
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}
          >
            <span style={{ flex: 1 }}>{m.label}</span>
            <button
              type="button"
              onClick={() => handleRemoveCustom(m.id)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="정말 완료했나요?"
        message="완료로 표시하면 취소할 수 없어요"
        onConfirm={handleConfirmComplete}
        onCancel={() => setConfirmTarget(null)}
      />

      <CardRevealModal
        result={activeReveal?.result}
        pokemon={activeReveal?.pokemon}
        onClose={handleCloseReveal}
      />
    </AppShell>
  );
}
