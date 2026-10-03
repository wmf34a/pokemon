/**
 * 업데이트 알림.
 *
 * 서버가 없는 앱이라 소식은 코드에 함께 배포된다. 새 기능을 넣을 때
 * 이 배열 맨 위에 한 줄 추가하면 종 아이콘에 빨간 점이 붙는다.
 *
 * **id 는 되돌리거나 다시 쓰지 않는다.** 읽음 표시를 "내가 본 가장 큰 id" 하나로
 * 기억하기 때문에, 중간에 끼워 넣으면 이미 읽은 사람에게 안 보인다.
 * 새 소식은 항상 가장 큰 번호를 준다.
 */
export const NOTICES = [
  {
    id: 6,
    date: "2026-10-03",
    title: "진화하지 않는 포켓몬도 파트너로 고를 수 있어요",
    body: "루차불, 라프라스, 메타몽처럼 진화가 없는 포켓몬 117마리가 파트너 목록에 새로 들어왔어요. 고를 수 있는 포켓몬이 340마리에서 457마리가 됐어요. 진화하지 않는 포켓몬은 이름 옆에 ⊘ 표시가 붙어요.",
  },
  {
    id: 5,
    date: "2026-09-09",
    title: "도감에서 세대별로 골라 볼 수 있어요",
    body: "도감에서 \"세대순\"을 고르면 1세대부터 9세대까지 버튼이 나와요. 보던 정렬과 필터는 다음에 열 때도 그대로 남아 있어요.",
  },
  {
    id: 4,
    date: "2026-08-29",
    title: "스무고개 퀴즈가 생겼어요",
    body: "힌트를 하나씩 열어가며 포켓몬을 맞혀 보세요. 힌트를 적게 볼수록 점수가 높아요. 1세대 포켓몬은 생김새 힌트도 함께 나와요.",
  },
  {
    id: 3,
    date: "2026-08-27",
    title: "미션 카드를 열면 울음소리가 나요",
    body: "일일 미션을 마치고 카드를 받을 때 그 포켓몬의 울음소리를 들려줘요.",
  },
  {
    id: 2,
    date: "2026-08-26",
    title: "일일 미션이 매일 새로 시작해요",
    body: "미션 기록이 자정에 초기화돼요. 만들어 둔 미션 목록은 그대로 남아요.",
  },
  {
    id: 1,
    date: "2026-08-25",
    title: "카드 수집이 열렸어요",
    body: "퀴즈를 맞히거나 미션을 마치면 포켓몬 카드를 모을 수 있어요.",
  },
];

const READ_KEY = "pokemonQuiz.noticeRead";

/** 마지막으로 읽은 소식 번호. 처음 온 사람은 0 이라 전부 새 소식이 된다 */
export function getLastReadId() {
  try {
    return Number(localStorage.getItem(READ_KEY)) || 0;
  } catch {
    // 시크릿 모드처럼 저장이 막힌 환경. 알림이 매번 새로 보일 뿐 앱은 돈다
    return 0;
  }
}

export function markAllNoticesRead() {
  try {
    const newest = NOTICES.reduce((max, n) => Math.max(max, n.id), 0);
    localStorage.setItem(READ_KEY, String(newest));
  } catch {
    // 저장이 안 되면 빨간 점이 남는다. 그것 때문에 앱을 멈추지는 않는다
  }
}

/** 아직 안 읽은 소식. 최신이 앞에 온다 (NOTICES 자체가 내림차순이다) */
export function getUnreadNotices() {
  const lastRead = getLastReadId();
  return NOTICES.filter((n) => n.id > lastRead);
}

export function unreadNoticeCount() {
  return getUnreadNotices().length;
}

/*
 * 처음 한 번만 띄우는 안내.
 *
 * 종과 벌레 아이콘이 화면 오른쪽 위에 새로 생겼는데, 아무 말도 없으면
 * 아이도 부모도 그것이 뭔지 모른 채 지나간다. 딱 한 번만 알려준다.
 */
const TOUR_KEY = "pokemonQuiz.tourSeen";

export function hasSeenTour() {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    // 저장이 막힌 환경에서는 본 것으로 친다. 올 때마다 팝업이 뜨는 것이 더 나쁘다
    return true;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    // 저장이 안 되면 다음에 또 뜬다. 그것 때문에 앱을 멈추지는 않는다
  }
}
