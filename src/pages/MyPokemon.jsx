import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { loadPokemonData, TYPE_COLOR } from "../utils/pokemonData";
import { getMyPokemon, graduateAndRestart, resetMyPokemon } from "../utils/myPokemon";
import {
  getCareState,
  feed,
  play,
  sleep,
  getFeedCooldownMs,
  getPlayCooldownMs,
  getSleepCooldownMs,
  getMoodLevel,
  MOOD_LABEL_KO,
  MOOD_FILTER,
} from "../utils/pokemonCare";

const GRUMPY_TOAST_KEY = "pokemonCare.grumpyToastShown.v1";

// 기분이 좋을수록 더 활발하게, 지치거나 삐쳤을수록 느리게 흔들린다.
const IDLE_BOB_DURATION = {
  happy: "1.6s",
  normal: "2.4s",
  tired: "3.4s",
  grumpy: "4.2s",
};

function formatCooldown(ms) {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}시간 ${minutes > 0 ? `${minutes}분 ` : ""}후`;
  return `${minutes}분 후`;
}

function Gauge({ label, value }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: "var(--radius-pill)",
          background: "var(--color-surface-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: "var(--color-accent)",
            borderRadius: "var(--radius-pill)",
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({ label, cooldownMs, onClick }) {
  const disabled = cooldownMs > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? undefined : "press"}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: "var(--radius-md)",
        border: "none",
        background: disabled ? "var(--color-surface-2)" : "var(--color-primary)",
        color: disabled ? "var(--color-text-muted)" : "var(--color-text-on-primary)",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {disabled ? `${label} (${formatCooldown(cooldownMs)})` : label}
    </button>
  );
}

export default function MyPokemon() {
  const navigate = useNavigate();
  const [record, setRecord] = useState(undefined); // undefined = 아직 확인 전, null = 없음
  const [p, setP] = useState(null);
  const [dismissedGraduation, setDismissedGraduation] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [careState, setCareState] = useState(null);
  const [showGrumpyToast, setShowGrumpyToast] = useState(false);

  useEffect(() => {
    const rec = getMyPokemon();
    setRecord(rec);
    if (!rec) {
      navigate("/mine/choose", { replace: true });
      return;
    }
    loadPokemonData().then((all) => {
      setP(all.find((x) => x.id === rec.currentStageId) || null);
    });
    setCareState(getCareState());
  }, [navigate]);

  const mood = careState ? getMoodLevel(careState) : null;

  useEffect(() => {
    if (mood !== "grumpy") return;
    let alreadyShown;
    try {
      alreadyShown = sessionStorage.getItem(GRUMPY_TOAST_KEY);
    } catch {
      alreadyShown = null;
    }
    if (alreadyShown) return;
    setShowGrumpyToast(true);
    try {
      sessionStorage.setItem(GRUMPY_TOAST_KEY, "1");
    } catch {
      // 세션 저장 불가 환경에서는 방문마다 다시 뜨는 정도로 허용
    }
  }, [mood]);

  function handleCareAction(actionFn) {
    setCareState(actionFn());
  }

  if (record === undefined || record === null || !p) {
    return (
      <AppShell title="내 포켓몬" backTo="/">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 20, width: "60%", margin: "0 auto 8px" }} />
      </AppShell>
    );
  }

  const tint = TYPE_COLOR[p.types[0]] || "#999";
  const isFinalEvolution = p.evolvesTo?.length === 0;

  function handleGraduate() {
    graduateAndRestart();
    navigate("/mine/choose");
  }

  function handleReset() {
    resetMyPokemon();
    navigate("/mine/choose");
  }

  return (
    <AppShell title="내 포켓몬" backTo="/">
      <div
        style={{
          textAlign: "center",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6) var(--space-4) var(--space-4)",
          background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`,
        }}
      >
        <img
          src={p.artwork}
          alt={record.nickname}
          className="care-idle-bob"
          style={{
            width: 180,
            height: 180,
            filter: mood ? MOOD_FILTER[mood] : "none",
            animationDuration: IDLE_BOB_DURATION[mood] || IDLE_BOB_DURATION.normal,
          }}
        />
        <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          #{String(p.id).padStart(4, "0")}
        </div>
        <h1 style={{ fontSize: 26, marginTop: 2 }}>{record.nickname}</h1>
        <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{p.nameKo}</div>
        {mood && (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 6 }}>
            {MOOD_LABEL_KO[mood]}
          </div>
        )}
      </div>

      <p
        style={{
          marginTop: "var(--space-5)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        퀴즈를 풀면서 함께 키워보세요!
      </p>

      {showGrumpyToast && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "10px 16px",
            borderRadius: "var(--radius-pill)",
            border: "1.5px solid var(--color-danger)",
            background: "color-mix(in srgb, var(--color-danger) 14%, var(--color-surface))",
            color: "var(--color-text)",
            fontWeight: 700,
            fontSize: 13,
            margin: "var(--space-3) auto 0",
            maxWidth: 320,
          }}
        >
          {record.nickname}가 삐쳤어요! 돌봐주세요
        </div>
      )}

      {careState && (
        <div
          style={{
            marginTop: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Gauge label="배고픔" value={careState.hunger} />
          <Gauge label="행복도" value={careState.happiness} />
          <Gauge label="피로도" value={careState.fatigue} />

          <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)" }}>
            <ActionButton
              label="밥주기"
              cooldownMs={getFeedCooldownMs()}
              onClick={() => handleCareAction(feed)}
            />
            <ActionButton
              label="놀아주기"
              cooldownMs={getPlayCooldownMs()}
              onClick={() => handleCareAction(play)}
            />
            <ActionButton
              label="재우기"
              cooldownMs={getSleepCooldownMs()}
              onClick={() => handleCareAction(sleep)}
            />
          </div>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 8 }}>
            밥주기·놀아주기는 6시간마다, 재우기는 8시간마다 다시 할 수 있어요
          </p>
        </div>
      )}

      {isFinalEvolution && !dismissedGraduation && (
        <div
          style={{
            marginTop: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            background: "var(--color-surface-2)",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: 15 }}>
            최고 단계까지 진화를 마쳤어요!
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setDismissedGraduation(true)}
              className="press"
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              계속 보기
            </button>
            <button
              type="button"
              onClick={handleGraduate}
              className="press"
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--color-primary)",
                color: "var(--color-text-on-primary)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              새 친구 고르기
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: 13,
              textDecoration: "underline",
              cursor: "pointer",
              minHeight: 44,
              padding: "10px",
            }}
          >
            다른 포켓몬 고르기
          </button>
        ) : (
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              background: "var(--color-surface-2)",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700 }}>정말요?</p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
              지금 포켓몬의 진화 진행 상황은 사라져요.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="press"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="press"
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--color-danger)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                새로 고르기
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
