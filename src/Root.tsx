import React from "react";
import { Composition } from "remotion";
// Polices embarquées : rendu identique sur n'importe quel serveur
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
// Caractères chinois (quiz de chinois et de français)
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "@fontsource/noto-sans-sc/900.css";
// Thème du quiz de chinois : police à empattements
import "@fontsource/noto-serif-sc/500.css";
import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/noto-serif-sc/900.css";
import { Quiz, QuizProps, dureeTotale } from "./Quiz";
// Exemples pour la prévisualisation (Studio). Le rendu réel passe des mots inédits via scripts/render.mjs
import exemple from "../data/exemple.json";
import exempleChinois from "../data/exemple-chinois.json";
import exempleFrancais from "../data/exemple-francais.json";

const QUIZ: { id: string; exemple: QuizProps }[] = [
  { id: "QuizOrthographe", exemple: exemple as QuizProps },
  { id: "QuizChinois", exemple: exempleChinois as QuizProps },
  { id: "QuizFrancais", exemple: exempleFrancais as QuizProps },
];

export const RemotionRoot: React.FC = () => (
  <>
    {QUIZ.map(({ id, exemple }) => (
      <Composition
        key={id}
        id={id}
        component={Quiz}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={dureeTotale(exemple.questions.length)}
        defaultProps={exemple}
        calculateMetadata={({ props }) => ({
          durationInFrames: dureeTotale(props.questions.length),
        })}
      />
    ))}
  </>
);
