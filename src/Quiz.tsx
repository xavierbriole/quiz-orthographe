import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
  delayRender,
  continueRender,
} from "remotion";
import { C, J, POLICE, POLICE_CHINOIS, THEMES, Theme, TypeQuiz, textesTheme } from "./themes";

export type Question = {
  options: string[];
  correctIndex: number;
  // Quiz de vocabulaire : le mot à traduire, affiché au-dessus des réponses
  mot?: string;
  pinyin?: string; // quiz de chinois
  tag?: string | null; // quiz de français : « n.f. », « v. »…
};
export type QuizProps = {
  type?: TypeQuiz; // "orthographe" par défaut
  titre: string;
  questions: Question[];
  jour?: number; // numéro du jour affiché (couverture, en-tête, fin)
  sons?: boolean; // bruitages (tic-tac, ding, whoosh)
  musique?: string | null; // fichier dans public/, ex. "musique.mp3"
  volumeMusique?: number; // 0 à 1
};

// Timing (30 fps)
export const INTRO = 75; // 2,5 s
export const Q_APPARITION = 15; // 0,5 s
export const Q_REFLEXION_MIN = 210; // 7 s de compte à rebours minimum
export const Q_REPONSE = 60; // 2 s pour voir la bonne réponse
export const DUREE_MIN = 61 * 30; // > 1 min pour être éligible à Creator Rewards

// Avec peu de mots, on allonge le temps de réflexion pour dépasser 1 min
export const reflexion = (n: number) =>
  Math.max(Q_REFLEXION_MIN, Math.ceil((DUREE_MIN - INTRO - OUTRO) / n) - Q_APPARITION - Q_REPONSE);
export const dureeQuestion = (n: number) => Q_APPARITION + reflexion(n) + Q_REPONSE;
export const OUTRO = 90; // 3 s
export const dureeTotale = (n: number) => INTRO + n * dureeQuestion(n) + OUTRO;

const Fond: React.FC = () => {
  const frame = useCurrentFrame();
  const angle = 160 + Math.sin(frame / 90) * 10;
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(${angle}deg, ${C.fond1} 0%, ${C.fond2} 100%)` }}
    />
  );
};

const Coche: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Croix: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const Intro: React.FC<{ n: number; jour: number; theme: Theme }> = ({ n, jour, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11 } });
  const sous = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: theme.police, padding: 80 }}>
      <theme.bandeau />
      <div
        style={{
          marginTop: 40,
          padding: "14px 38px",
          borderRadius: 999,
          background: C.jaune,
          color: C.fond1,
          fontSize: 52,
          fontWeight: 900,
          letterSpacing: 4,
          transform: `scale(${0.6 + 0.4 * pop})`,
          opacity: pop,
        }}
      >
        {theme.pastilleJour(jour)}
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 112,
          fontWeight: 900,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.05,
          transform: `scale(${0.6 + 0.4 * pop})`,
          opacity: pop,
        }}
      >
        {theme.titre[0]}
        <br />
        <J>{theme.titre[1]}</J>
      </div>
      <div
        style={{
          marginTop: 60,
          fontSize: 54,
          fontWeight: 600,
          color: "#E2E8F0",
          textAlign: "center",
          opacity: sous,
          transform: `translateY(${(1 - sous) * 40}px)`,
        }}
      >
        {theme.sousTitre(n)}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ n: number; jour: number; theme: Theme }> = ({ n, jour, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const fleche = Math.sin(frame / 5) * 14;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: theme.police, padding: 80 }}>
      <div style={{ fontSize: 96, fontWeight: 900, color: "#fff", textAlign: "center", transform: `scale(${0.7 + 0.3 * pop})` }}>
        {theme.outroTitre(n)}
      </div>
      <div style={{ marginTop: 60, fontSize: 52, fontWeight: 600, color: "#E2E8F0", textAlign: "center", opacity: pop }}>
        {theme.outroCommentaire}
      </div>
      <svg width={90} height={90} viewBox="0 0 24 24" style={{ marginTop: 30, transform: `translateY(${fleche}px)` }}>
        <path d="M12 4v15M5.5 12.5L12 19l6.5-6.5" fill="none" stroke={C.jaune} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ marginTop: 50, fontSize: 40, fontWeight: 500, color: C.grisTexte, opacity: pop }}>
        {theme.outroDemain(jour + 1)}
      </div>
    </AbsoluteFill>
  );
};

const aDuChinois = (t: string) => /[\u3400-\u9fff]/.test(t);
// Largeur approximative d'un texte, en « em » (un caractère chinois est carré, une lettre plus étroite)
const largeur = (t: string) => [...t].reduce((s, c) => s + (aDuChinois(c) ? 1 : 0.6), 0);

// Polices chargées par tranches de caractères : on attend que les glyphes utilisés soient prêts
// avant de capturer les images, sinon des caractères chinois peuvent manquer sur les premières.
const useAttendrePolices = (texte: string) => {
  const [handle] = useState(() => delayRender("Chargement des polices"));
  useEffect(() => {
    const charges = ["500", "600", "700", "800", "900"].flatMap((poids) => [
      document.fonts.load(`${poids} 64px "Noto Sans SC"`, texte),
      document.fonts.load(`${poids} 64px Inter`, texte),
    ]);
    Promise.allSettled(charges).then(() => continueRender(handle));
  }, [handle, texte]);
};

// Le mot à traduire : caractères + pinyin (chinois) ou mot + nature grammaticale (français)
const Enonce: React.FC<{ q: Question; apparition: number }> = ({ q, apparition }) => {
  const mot = q.mot ?? "";
  const chinois = aDuChinois(mot);
  const taille = chinois ? Math.min(200, Math.floor(620 / largeur(mot))) : Math.min(124, Math.floor(880 / largeur(mot)));
  return (
    <div
      style={{
        marginTop: 36,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: apparition,
        transform: `scale(${0.7 + 0.3 * apparition})`,
      }}
    >
      <div
        style={{
          fontFamily: chinois ? POLICE_CHINOIS : POLICE,
          fontSize: taille,
          fontWeight: chinois ? 700 : 900,
          lineHeight: 1.15,
          color: "#fff",
          letterSpacing: chinois ? 12 : 0,
          whiteSpace: "nowrap",
        }}
      >
        {mot}
      </div>
      {q.pinyin ? (
        <div style={{ marginTop: 6, fontSize: 64, fontWeight: 600, color: C.jaune, letterSpacing: 2 }}>{q.pinyin}</div>
      ) : null}
      {q.tag ? (
        <div
          style={{
            marginTop: 18,
            padding: "6px 26px",
            borderRadius: 999,
            border: `3px solid ${C.jaune}`,
            fontSize: 38,
            fontWeight: 700,
            fontStyle: "italic",
            color: C.jaune,
          }}
        >
          {q.tag}
        </div>
      ) : null}
    </div>
  );
};

const Carte: React.FC<{
  texte: string;
  lettre: string;
  index: number;
  estBonne: boolean;
  revele: number; // 0 -> 1
  compacte: boolean; // quiz de vocabulaire : cartes moins hautes pour laisser la place au mot
}> = ({ texte, lettre, index, estBonne, revele, compacte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entree = spring({ frame: frame - 3 - index * 4, fps, config: { damping: 13 } });

  const fond = interpolateColors(revele, [0, 1], [C.carte, estBonne ? C.vert : C.gris]);
  const couleurTexte = interpolateColors(revele, [0, 1], [C.texte, estBonne ? "#FFFFFF" : C.grisTexte]);
  const echelle = estBonne ? 1 + 0.06 * revele : 1 - 0.04 * revele;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 34,
        width: "100%",
        padding: compacte ? "26px 40px" : "38px 44px",
        borderRadius: 36,
        background: fond,
        boxShadow: estBonne && revele > 0 ? `0 0 ${60 * revele}px rgba(34,197,94,0.55)` : "0 14px 30px rgba(0,0,0,0.25)",
        transform: `translateX(${(1 - entree) * 120}px) scale(${echelle})`,
        opacity: entree,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          flexShrink: 0,
          borderRadius: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          fontWeight: 800,
          background: revele > 0.5 ? "rgba(255,255,255,0.18)" : C.texte,
          color: "#fff",
        }}
      >
        {revele > 0.5 ? estBonne ? <Coche size={52} /> : <Croix size={46} color={C.rouge} /> : lettre}
      </div>
      <div
        style={{
          fontSize: Math.min(texte.length > 12 ? 64 : 74, Math.floor(700 / largeur(texte))),
          fontFamily: aDuChinois(texte) ? POLICE_CHINOIS : POLICE,
          fontWeight: 800,
          color: couleurTexte,
          letterSpacing: 1,
          textDecoration: !estBonne && revele > 0.5 ? "line-through" : "none",
          textDecorationColor: C.rouge,
          textDecorationThickness: 6,
        }}
      >
        {texte}
      </div>
    </div>
  );
};

const QuestionScene: React.FC<{ q: Question; numero: number; total: number; jour: number; theme: Theme }> = ({
  q,
  numero,
  total,
  jour,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const debutReponse = Q_APPARITION + reflexion(total);
  const revele = spring({ frame: frame - debutReponse, fps, config: { damping: 15 } });
  const restant = Math.max(0, Math.ceil((debutReponse - frame) / fps));
  const barre = interpolate(frame, [Q_APPARITION, debutReponse], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titre = spring({ frame, fps, config: { damping: 14 } });
  const pulse = frame < debutReponse ? 1 + 0.08 * Math.max(0, Math.sin(((frame - Q_APPARITION) / fps) * Math.PI * 2)) : 1;
  const bravo = spring({ frame: frame - debutReponse - 6, fps, config: { damping: 12 } });
  const enonce = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  const vocab = Boolean(q.mot);

  return (
    <AbsoluteFill style={{ fontFamily: theme.police, padding: `${vocab ? 200 : 230}px 80px 0` }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <theme.bandeau />
          <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: 3 }}>{theme.entete(jour)}</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: C.jaune }}>
          {numero}/{total}
        </div>
      </div>
      {/* Points de progression */}
      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 5,
              background: i < numero - 1 ? C.jaune : i === numero - 1 ? "#fff" : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>

      {/* Consigne */}
      <div
        style={{
          marginTop: vocab ? 70 : 110,
          fontSize: vocab ? 56 : 66,
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1.15,
          opacity: titre,
          transform: `translateY(${(1 - titre) * 30}px)`,
        }}
      >
        {theme.consigne}
      </div>

      {/* Mot à traduire (quiz de vocabulaire) */}
      {vocab ? <Enonce q={q} apparition={enonce} /> : null}

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: vocab ? 26 : 34, marginTop: vocab ? 50 : 80 }}>
        {q.options.map((opt, i) => (
          <Carte
            key={opt}
            texte={opt}
            lettre={String.fromCharCode(65 + i)}
            index={i}
            estBonne={i === q.correctIndex}
            revele={revele}
            compacte={vocab}
          />
        ))}
      </div>

      {/* Compte à rebours, puis « +1 point » */}
      <div style={{ marginTop: vocab ? 60 : 90, height: 140 }}>
        {frame < debutReponse ? (
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: 65,
                border: `8px solid ${C.jaune}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 70,
                fontWeight: 900,
                color: C.jaune,
                transform: `scale(${pulse})`,
              }}
            >
              {restant}
            </div>
            <div style={{ flex: 1, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
              <div style={{ width: `${barre * 100}%`, height: "100%", borderRadius: 11, background: C.jaune }} />
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              fontSize: 64,
              fontWeight: 900,
              color: C.jaune,
              opacity: bravo,
              transform: `scale(${0.6 + 0.4 * bravo})`,
            }}
          >
            {theme.bonus}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Bruitages d'une question (frames relatives au début de la question)
const SonsQuestion: React.FC<{ total: number }> = ({ total }) => {
  const { fps } = useVideoConfig();
  const debutReponse = Q_APPARITION + reflexion(total);
  // Tic-tac doux uniquement sur les 3 dernières secondes (moins fatigant sur toute la vidéo)
  const tics: number[] = [];
  for (let k = 1; k <= 3 && debutReponse - k * fps >= Q_APPARITION; k++) tics.push(debutReponse - k * fps);
  return (
    <>
      <Audio src={staticFile("sons/whoosh.wav")} volume={0.35} />
      {tics.map((frame) => (
        <Sequence key={frame} from={frame} durationInFrames={Math.round(fps * 0.25)}>
          <Audio src={staticFile("sons/tic-fin.wav")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={debutReponse} durationInFrames={Math.round(fps * 1.1)}>
        <Audio src={staticFile("sons/bonne-reponse.wav")} volume={0.6} />
      </Sequence>
    </>
  );
};

export const Quiz: React.FC<QuizProps> = ({
  type = "orthographe",
  questions,
  jour = 1,
  sons = true,
  musique = null,
  volumeMusique = 0.15,
}) => {
  const n = questions.length;
  const { durationInFrames } = useVideoConfig();
  const theme = THEMES[type];
  useAttendrePolices(textesTheme(theme) + questions.map((q) => [q.mot, q.pinyin, q.tag, ...q.options].join("")).join(""));
  return (
    <AbsoluteFill>
      <Fond />
      {musique ? (
        <Audio
          src={staticFile(musique)}
          loop
          volume={(f) =>
            volumeMusique *
            interpolate(f, [0, 30, durationInFrames - 45, durationInFrames - 1], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
      <Sequence durationInFrames={INTRO}>
        <Intro n={n} jour={jour} theme={theme} />
      </Sequence>
      {questions.map((q, i) => (
        <Sequence key={i} from={INTRO + i * dureeQuestion(n)} durationInFrames={dureeQuestion(n)}>
          <QuestionScene q={q} numero={i + 1} total={n} jour={jour} theme={theme} />
          {sons ? <SonsQuestion total={n} /> : null}
        </Sequence>
      ))}
      <Sequence from={INTRO + n * dureeQuestion(n)} durationInFrames={OUTRO}>
        <Outro n={n} jour={jour} theme={theme} />
        {sons ? <Audio src={staticFile("sons/fin.wav")} volume={0.5} /> : null}
      </Sequence>
    </AbsoluteFill>
  );
};
