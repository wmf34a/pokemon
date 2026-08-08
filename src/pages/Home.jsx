import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { SparklesIcon } from "../components/Icons";
import { loadPokemonData } from "../utils/pokemonData";
import { useDailyPokemon } from "../hooks/useDailyPokemon";
import {
  getMyPokemon,
  resolveBranchEvolution,
  clearPendingEvolution,
  EVOLUTION_THRESHOLD,
} from "../utils/myPokemon";
import { getCareState, getMoodLevel, MOOD_LABEL_KO, MOOD_FILTER } from "../utils/pokemonCare";

export default function Home() {
  const [mine, setMine] = useState(undefined); // undefined=확인 전, null=없음, 객체=있음
  const dailyPokemon = useDailyPokemon();
  const [all, setAll] = useState([]);
  // null | "branch" (분기 선택 대기) | "reveal" (짠! 화면)
  const [celebrationStep, setCelebrationStep] = useState(null);

  useEffect(() => {
    const rec = getMyPokemon();
    setMine(rec);
    loadPokemonData().then(setAll);
    if (rec?.pendingEvolution) {
      const hasBranchChoice =
        Array.isArray(rec.pendingBranchChoices) && rec.pendingBranchChoices.length > 0;
      setCelebrationStep(hasBranchChoice ? "branch" : "reveal");
    }
  }, []);

  const currentPokemon = useMemo(
    () => (mine ? all.find((p) => p.id === mine.currentStageId) : null),
    [mine, all]
  );

  // "포켓몬 키우기" 상태는 mine이 있을 때만 의미가 있다(돌봄 대상 = currentStageId).
  const careMood = useMemo(() => (mine ? getMoodLevel(getCareState()) : null), [mine]);

  // 진화 리빌 연출의 이전/이후 포켓몬. history의 마지막 두 항목을 사용해, 홈 화면을
  // 다시 방문하기 전에 여러 번 진화가 쌓였더라도(퀴즈를 몰아서 푼 경우 등) 마지막
  // 한 번의 전환만 보여준다.
  const revealPair = useMemo(() => {
    if (!mine || mine.history.length < 2 || all.length === 0) return null;
    const fromId = mine.history[mine.history.length - 2];
    const toId = mine.history[mine.history.length - 1];
    const from = all.find((p) => p.id === fromId);
    const to = all.find((p) => p.id === toId);
    if (!from || !to) return null; // 방어적: 데이터 누락이면 연출을 만들 수 없음
    return { from, to };
  }, [mine, all]);

  useEffect(() => {
    // 방어적 엣지 케이스: pendingEvolution은 true인데 리빌에 필요한 데이터가 없으면
    // (분기 선택 대상도 아니고 revealPair도 못 만들면) 연출 없이 바로 내려버린다.
    if (celebrationStep === "reveal" && all.length > 0 && !revealPair) {
      clearPendingEvolution();
      setMine(getMyPokemon());
      setCelebrationStep(null);
    }
  }, [celebrationStep, all, revealPair]);

  function handlePickBranch(id) {
    const updated = resolveBranchEvolution(id);
    if (!updated) return; // 방어적: 유효하지 않은 선택이면 무시
    setMine(updated);
    setCelebrationStep("reveal");
  }

  function handleContinue() {
    clearPendingEvolution();
    setMine(getMyPokemon());
    setCelebrationStep(null);
  }

  if (celebrationStep === "branch" && mine) {
    return (
      <AppShell title="진화!">
        <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
          <h2 style={{ fontSize: 22 }}>어떤 모습으로 진화할까요?</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 4 }}>
            마음에 드는 모습을 골라주세요
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 12,
              marginTop: "var(--space-5)",
            }}
          >
            {mine.pendingBranchChoices.map((choice) => {
              const p = all.find((x) => x.id === choice.id);
              if (!p) return null; // 방어적: 데이터에 없는 후보는 건너뜀
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handlePickBranch(choice.id)}
                  className="press"
                  style={{
                    border: "none",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                    background: "var(--color-surface)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <img
                    src={p.artwork}
                    alt="어떤 모습일까요"
                    style={{ width: 76, height: 76, filter: "brightness(0)" }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  if (celebrationStep === "reveal" && revealPair) {
    return (
      <AppShell title="진화!">
        <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <img
              src={revealPair.from.artwork}
              alt={revealPair.from.nameKo}
              style={{ width: 84, height: 84, opacity: 0.55, filter: "grayscale(1)" }}
            />
            <span style={{ fontSize: 22, color: "var(--color-text-muted)" }}>→</span>
            <div
              className="evolution-shimmer-ring"
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
              }}
            >
              <img
                src={revealPair.to.artwork}
                alt={revealPair.to.nameKo}
                className="evolution-reveal-new"
                style={{ width: 112, height: 112 }}
              />
            </div>
          </div>
          <h2 style={{ fontSize: 24, marginTop: "var(--space-5)" }}>
            짠! {revealPair.to.nameKo}(으)로 진화했어요!
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 4 }}>
            {mine?.nickname}가 한층 더 성장했어요
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="press"
            style={{
              marginTop: "var(--space-5)",
              minHeight: 48,
              padding: "12px 28px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            계속하기
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={undefined}>
      <div style={{ padding: "var(--space-4) 0 var(--space-2)" }}>
        <img
          src={`${import.meta.env.BASE_URL}pokeball.svg`}
          alt=""
          style={{ width: 40, height: 40, marginBottom: "var(--space-3)" }}
        />
        <h1 style={{ fontSize: 30, color: "var(--color-primary)" }}>
          포켓몬 도감 & 퀴즈
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)", lineHeight: 1.5 }}>
          아이와 함께, 또는 포켓몬을 좋아하는 누구나 즐길 수 있는 미니 도감 &
          퀴즈 앱입니다.
        </p>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        {mine === undefined && (
          <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
        )}

        {mine === null && (
          <Link
            to="/mine/choose"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-5)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary)",
              color: "var(--color-text-on-primary)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "color-mix(in srgb, currentColor 18%, transparent)",
                flexShrink: 0,
              }}
            >
              <SparklesIcon size={26} strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                나만의 포켓몬을 만나보세요!
              </div>
              <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                포켓몬을 골라 퀴즈를 풀며 키워보세요
              </div>
            </div>
          </Link>
        )}

        {mine && (
          <Link
            to="/mine"
            className="press pop-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-card)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--color-surface-2)",
                flexShrink: 0,
              }}
            >
              {currentPokemon && (
                <img
                  src={currentPokemon.artwork}
                  alt={mine.nickname}
                  style={{ width: 52, height: 52 }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>내 포켓몬</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>
                {mine.nickname}
              </div>

              {currentPokemon && currentPokemon.evolvesTo?.length > 0 ? (
                <div style={{ marginTop: 6 }}>
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
                        width: `${Math.min(
                          100,
                          Math.round(
                            (mine.pointsSinceLastEvolution / EVOLUTION_THRESHOLD) * 100
                          )
                        )}%`,
                        background: "var(--color-accent)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                    다음 진화까지 {mine.pointsSinceLastEvolution} / {EVOLUTION_THRESHOLD}
                  </div>
                </div>
              ) : (
                currentPokemon && (
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>
                    최고 단계까지 진화를 마쳤어요
                  </div>
                )
              )}
            </div>
          </Link>
        )}
      </div>

      {dailyPokemon && (
        <Link
          to="/daily"
          className="press pop-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img src={dailyPokemon.artwork} alt="" style={{ width: 44, height: 44 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>오늘의 포켓몬</div>
            <div style={{ fontWeight: 700 }}>{dailyPokemon.nameKo}</div>
          </div>
        </Link>
      )}

      {careMood && currentPokemon && (
        <Link
          to="/care"
          className="press pop-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img
            src={currentPokemon.artwork}
            alt=""
            style={{ width: 44, height: 44, filter: MOOD_FILTER[careMood] }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>포켓몬 키우기</div>
            <div style={{ fontWeight: 700 }}>{MOOD_LABEL_KO[careMood]}</div>
          </div>
        </Link>
      )}

      <p style={{ marginTop: "var(--space-10)", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
        본 앱은 팬이 제작한 비공식 프로젝트이며 Nintendo, Game Freak, The
        Pokémon Company와 관련이 없습니다. 데이터 출처:{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokeAPI</a>
      </p>
    </AppShell>
  );
}
