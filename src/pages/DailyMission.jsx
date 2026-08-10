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
  DEFAULT_MISSIONS,
  MAX_CUSTOM_PER_DAY,
} from "../utils/dailyMission";
import { vibrate } from "../utils/haptics";

const ERROR_LABEL_KO = {
  empty: "미션 이름을 입력해주세요",
  too_long: "미션 이름은 20자 이하로 적어주세요",
  limit_reached: "커스텀 미션은 오늘 더 못 만들어요(하루 최대 4개)",
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

    const queue = [{ result: outcome.cardResult, pokemon: picked }];

    if (outcome.allCompleted) {
      const bonusPicked = pickRandom(all, 1)[0];
      const bonusResult = completeBonus(bonusPicked.id);
      if (bonusResult) queue.push({ result: bonusResult, pokemon: bonusPicked });
    }

    vibrate(200); // 카드 획득 소리는 CardRevealModal이 실제로 카드가 뒤집히는 순간에 재생한다
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
  const customMissions = getCustomMissions();
  const activeReveal = revealQueue[0] || null;
  const customFull = customMissions.length >= MAX_CUSTOM_PER_DAY;

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
          <span>오늘 획득 카드 {cardsToday}장</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
          이번 주 {weekCount}개 완료
        </div>
        <ul
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            marginTop: 6,
            lineHeight: 1.7,
            paddingLeft: 16,
          }}
        >
          <li>기본 미션 {DEFAULT_MISSIONS.length}개는 매일 항상 있어요.</li>
          <li>
            커스텀 미션은 오늘 하루만 유지돼요 — 최대 {MAX_CUSTOM_PER_DAY}개까지 만들 수 있고,
            자정이 지나면 목록에서 자동으로 사라져요(필요하면 다음날 다시 만들면 돼요).
          </li>
          <li>
            그래서 하루에 볼 수 있는 미션은 최대 {DEFAULT_MISSIONS.length + MAX_CUSTOM_PER_DAY}개
            (기본 {DEFAULT_MISSIONS.length} + 커스텀 {MAX_CUSTOM_PER_DAY})예요.
          </li>
          <li>미션 하나 완료하면 카드 1장, 전체 완료하면 보너스 카드 1장이 더 나와요 — 둘 다 확정 지급이에요.</li>
        </ul>
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
          오늘의 커스텀 미션
        </h3>
        <form onSubmit={handleAddCustom} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            maxLength={20}
            placeholder="새 미션 이름 (최대 20자)"
            disabled={customFull}
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
            disabled={customFull}
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

        {customMissions.map((m) => {
          const doneToday = missions.find((x) => x.id === m.id)?.completedToday;
          return (
            <div
              key={m.id}
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}
            >
              <span style={{ flex: 1 }}>{m.label}</span>
              {doneToday ? (
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>오늘 완료됨</span>
              ) : (
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
              )}
            </div>
          );
        })}
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
