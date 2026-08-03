import { useEffect } from "react";
import { SparklesIcon } from "./Icons";
import { evolutionToast } from "../styles/tokens";
import { useEvolutionChime } from "../hooks/useEvolutionChime";

function getMessage(result) {
  if (result.branchChoicePending) return "진화 준비 완료! 홈에서 골라보세요";
  if (result.newStagePokemon) return `짠! ${result.newStagePokemon.nameKo}(으)로 진화했어요!`;
  return "짠! 진화했어요!";
}

export default function EvolutionToast({ result }) {
  const playChime = useEvolutionChime();
  const shouldShow = Boolean(result?.evolved || result?.branchChoicePending);

  useEffect(() => {
    if (shouldShow) playChime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  if (!shouldShow) return null;

  const sprite = result.newStagePokemon?.artwork;

  return (
    <div className="evolution-reveal-new" style={evolutionToast}>
      {sprite ? (
        <img src={sprite} alt={result.newStagePokemon.nameKo} style={{ width: 28, height: 28, objectFit: "contain" }} />
      ) : (
        <SparklesIcon size={20} />
      )}
      <span>{getMessage(result)}</span>
    </div>
  );
}
