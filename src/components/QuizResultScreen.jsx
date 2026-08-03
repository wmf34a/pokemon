import { Link } from "react-router-dom";
import AppShell from "./AppShell";
import { primaryBtn } from "../styles/tokens";

// 퀴즈 한 세션(SESSION_LENGTH문제)을 다 풀었을 때 뜨는 결과 요약 화면.
// SilhouetteQuiz/CryQuiz/EvolutionQuiz가 동일하게 사용한다.
export default function QuizResultScreen({ title, total, correctCount, score, onPlayAgain }) {
  return (
    <AppShell title={title} backTo="/quiz">
      <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
        <h2>세션 완료!</h2>
        <p style={{ marginTop: 8, fontSize: 15 }}>
          {total}문제 중 <b>{correctCount}문제</b> 정답 · 총{" "}
          <b>{score}점</b>
        </p>
        <button onClick={onPlayAgain} style={primaryBtn}>
          다시 하기
        </button>
        <div style={{ marginTop: 8 }}>
          <Link
            to="/quiz"
            style={{
              color: "var(--color-text-muted)",
              fontSize: 13,
              textDecoration: "underline",
            }}
          >
            퀴즈 목록으로
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
