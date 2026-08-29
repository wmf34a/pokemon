import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dex from "./pages/Dex";
import PokemonDetail from "./pages/PokemonDetail";
import QuizHub from "./pages/QuizHub";
import SilhouetteQuiz from "./pages/SilhouetteQuiz";
import CryQuiz from "./pages/CryQuiz";
import EvolutionQuiz from "./pages/EvolutionQuiz";
import ZoomQuiz from "./pages/ZoomQuiz";
import BugReport from "./pages/BugReport";
import HintQuiz from "./pages/HintQuiz";
import Notices from "./pages/Notices";
import TypeQuiz from "./pages/TypeQuiz";
import ChooseStarter from "./pages/ChooseStarter";
import MyPokemon from "./pages/MyPokemon";
import DailyPokemon from "./pages/DailyPokemon";
import CardCollection from "./pages/CardCollection";
import DailyMission from "./pages/DailyMission";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dex" element={<Dex />} />
      <Route path="/pokemon/:id" element={<PokemonDetail />} />
      <Route path="/quiz" element={<QuizHub />} />
      <Route path="/quiz/silhouette" element={<SilhouetteQuiz />} />
      <Route path="/quiz/cry" element={<CryQuiz />} />
      <Route path="/quiz/evolution" element={<EvolutionQuiz />} />
      <Route path="/quiz/zoom" element={<ZoomQuiz />} />
      <Route path="/quiz/type" element={<TypeQuiz />} />
      <Route path="/quiz/hint" element={<HintQuiz />} />
      <Route path="/notices" element={<Notices />} />
      <Route path="/report" element={<BugReport />} />
      <Route path="/mine/choose" element={<ChooseStarter />} />
      <Route path="/mine" element={<MyPokemon />} />
      <Route path="/daily" element={<DailyPokemon />} />
      <Route path="/collection" element={<CardCollection />} />
      <Route path="/missions" element={<DailyMission />} />
    </Routes>
  );
}
