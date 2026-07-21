import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dex from "./pages/Dex";
import PokemonDetail from "./pages/PokemonDetail";
import QuizHub from "./pages/QuizHub";
import SilhouetteQuiz from "./pages/SilhouetteQuiz";
import ChosungQuiz from "./pages/ChosungQuiz";
import CryQuiz from "./pages/CryQuiz";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dex" element={<Dex />} />
      <Route path="/pokemon/:id" element={<PokemonDetail />} />
      <Route path="/quiz" element={<QuizHub />} />
      <Route path="/quiz/silhouette" element={<SilhouetteQuiz />} />
      <Route path="/quiz/chosung" element={<ChosungQuiz />} />
      <Route path="/quiz/cry" element={<CryQuiz />} />
    </Routes>
  );
}
