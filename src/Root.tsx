import React from "react";
import { Composition } from "remotion";
// Police embarquée : rendu identique sur n'importe quel serveur
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import { Quiz, QuizProps, dureeTotale } from "./Quiz";
// Exemple pour la prévisualisation (Studio). Le rendu réel passe des mots inédits via scripts/render.mjs
import exemple from "../data/exemple.json";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="QuizOrthographe"
    component={Quiz}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={dureeTotale(exemple.questions.length)}
    defaultProps={exemple as QuizProps}
    calculateMetadata={({ props }) => ({
      durationInFrames: dureeTotale(props.questions.length),
    })}
  />
);
