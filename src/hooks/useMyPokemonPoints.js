import { useCallback } from "react";
import { getMyPokemon, addPoints } from "../utils/myPokemon";
import { loadPokemonData } from "../utils/pokemonData";

// 퀴즈 정답 시 포인트를 "내 포켓몬"에 적립하는 훅.
// 진화/분기 선택 연출은 모두 홈 화면(Home.jsx)에서 재생되므로, 이 훅은 addPoints의
// 결과를 그냥 흘려보내고(fire-and-forget) 퀴즈 화면 자체는 아무 것도 보여주지 않는다.
//
// 퀴즈 화면들의 `all` state는 1세대 필터(applyGen1OnlyFilter) 등이 적용돼 있을 수
// 있어, "내 포켓몬"의 현재 단계가 그 목록에 없을 수도 있다(필터 켠 뒤 non-gen1
// 스타터를 이미 키우고 있던 경우 등). 그래서 이 훅은 퀴즈 화면의 필터된 목록을
// 받지 않고, loadPokemonData()로 필터 없는 전체 목록을 직접(캐시되어 있으므로
// 추가 네트워크 요청 없이) 가져와 조회한다.
export function useAwardPoints() {
  return useCallback((points) => {
    const record = getMyPokemon();
    if (!record) return; // 내 포켓몬이 없으면 조용히 무시

    loadPokemonData().then((all) => {
      const currentStagePokemon = all.find((p) => p.id === record.currentStageId);
      if (!currentStagePokemon) return; // 방어적: 데이터에 없는 id면 무시
      addPoints(points, currentStagePokemon);
    });
  }, []);
}
