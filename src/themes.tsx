// Textes et habillage de chaque quiz. La mise en page et les animations sont communes (Quiz.tsx).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type TypeQuiz = "orthographe" | "chinois" | "francais";

export const C = {
  jaune: "#FACC15",
  bleuFR: "#2B4BD6",
  rougeFR: "#E63946",
  or: "#E8B04B",
};

// Inter pour l'alphabet latin, Noto Sans SC pour les caractères chinois (polices embarquées, cf. Root.tsx)
export const POLICE = "Inter, 'Noto Sans SC', system-ui, sans-serif";
export const POLICE_CHINOIS = "'Noto Sans SC', Inter, sans-serif";
// Thème « chinois » : police à empattements (style imprimé traditionnel), latin et chinois
export const POLICE_SERIF = "'Noto Serif SC', Georgia, serif";

// Texte mis en valeur, dans la couleur d'accent du thème (variable CSS posée par Quiz.tsx)
export const J: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: "var(--accent)" }}>{children}</span>
);

export type Palette = {
  fond: (angle: number) => string; // arrière-plan CSS (angle qui oscille doucement)
  accent: string; // jaune / or : chiffres, mots mis en valeur, compte à rebours
  surAccent: string; // texte sur la pastille d'accent
  texte: string;
  texteDoux: string;
  discret: string;
  piste: string; // fond des barres de progression
  carte: string;
  texteCarte: string;
  bordureCarte?: string;
  ombreCarte: string;
  puce: string; // rond de la lettre A/B/C
  puceTexte: string;
  bonne: string;
  surBonne: string;
  lueurBonne: string;
  mauvaise: string;
  mauvaiseTexte: string;
  croix: string;
  arrondi: number; // coins des cartes
  arrondiPastille: number;
};

const PALETTE_NUIT: Palette = {
  fond: (a) => `linear-gradient(${a}deg, #0B1026 0%, #24184F 100%)`,
  accent: C.jaune,
  surAccent: "#0B1026",
  texte: "#FFFFFF",
  texteDoux: "#E2E8F0",
  discret: "#94A3B8",
  piste: "rgba(255,255,255,0.16)",
  carte: "#F8FAFC",
  texteCarte: "#0F172A",
  ombreCarte: "0 14px 30px rgba(0,0,0,0.25)",
  puce: "#0F172A",
  puceTexte: "#FFFFFF",
  bonne: "#22C55E",
  surBonne: "#FFFFFF",
  lueurBonne: "rgba(34,197,94,0.55)",
  mauvaise: "#334155",
  mauvaiseTexte: "#94A3B8",
  croix: "#EF4444",
  arrondi: 36,
  arrondiPastille: 999,
};

// Laque rouge, or et papier de riz
const PALETTE_LAQUE: Palette = {
  fond: (a) =>
    `radial-gradient(ellipse at ${50 + (a - 160) * 1.5}% 32%, #A11D1F 0%, #6E1013 52%, #3A070A 100%)`,
  accent: C.or,
  surAccent: "#4A0B0E",
  texte: "#FFF6E5",
  texteDoux: "#F3DDB8",
  discret: "#D8A98F",
  piste: "rgba(232,176,75,0.22)",
  carte: "#FBF1DC",
  texteCarte: "#2A1610",
  bordureCarte: `3px solid ${C.or}`,
  ombreCarte: "0 14px 30px rgba(30,0,0,0.35)",
  puce: "#8E1B1B",
  puceTexte: "#F6D58E",
  bonne: "#1F8A5B",
  surBonne: "#FFF6E5",
  lueurBonne: "rgba(31,138,91,0.6)",
  mauvaise: "#4E1013",
  mauvaiseTexte: "#B9877A",
  croix: "#FF9B8A",
  arrondi: 16,
  arrondiPastille: 10,
};

const BandeauFR: React.FC = () => (
  <div style={{ display: "flex", width: 150, height: 14, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
    <div style={{ flex: 1, background: C.bleuFR }} />
    <div style={{ flex: 1, background: "#FFFFFF" }} />
    <div style={{ flex: 1, background: C.rougeFR }} />
  </div>
);

// Filet doré avec un losange au centre
const BandeauOr: React.FC = () => (
  <svg width={150} height={18} viewBox="0 0 150 18" style={{ flexShrink: 0 }}>
    <path d="M0 9H58M92 9H150" stroke={C.or} strokeWidth={2.5} />
    <path d="M75 1l8 8-8 8-8-8z" fill={C.or} />
    <path d="M75 5l4 4-4 4-4-4z" fill="#6E1013" />
    <circle cx={62} cy={9} r={2.5} fill={C.or} />
    <circle cx={88} cy={9} r={2.5} fill={C.or} />
  </svg>
);

export type Theme = {
  palette: Palette;
  police: string; // police des textes de l'interface
  policeLatin: string; // mots et réponses en alphabet latin
  policeHanzi: string; // caractères chinois (mot à traduire, réponses)
  bandeau: React.FC;
  decor?: React.FC; // décor animé derrière toutes les scènes
  sceau?: string; // tampon (sceau chinois) affiché au-dessus du titre d'ouverture
  pastilleJour: (jour: number) => string;
  titre: [string, string]; // 2 lignes, la 2e en couleur d'accent
  sousTitre: (n: number) => React.ReactNode;
  entete: (jour: number) => React.ReactNode;
  consigne: React.ReactNode;
  bonus: string;
  outroTitre: (n: number) => React.ReactNode;
  outroCommentaire: string;
  outroDemain: (jour: number) => string;
};

// ---------- Décor du thème chinois ----------

// Motif « 回 » (grecque chinoise) dans un coin
const Grecque: React.FC<{ x: number; y: number; sx: number; sy: number }> = ({ x, y, sx, sy }) => (
  <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={C.or} strokeWidth={4} strokeLinecap="square">
    <path d="M0 96V0H96" />
    <path d="M16 96V16H80V64H40V40H60" />
  </g>
);

// Fleur de prunier (梅花) à 5 pétales
const Fleur: React.FC<{ taille: number; couleur: string }> = ({ taille, couleur }) => (
  <svg width={taille} height={taille} viewBox="-12 -12 24 24">
    {[0, 72, 144, 216, 288].map((r) => (
      <ellipse key={r} cx={0} cy={-6} rx={4.6} ry={6} fill={couleur} transform={`rotate(${r})`} />
    ))}
    <circle r={2.6} fill={C.or} />
  </svg>
);

const DecorChinois: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const m = 34; // marge du cadre
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Grand caractère en filigrane */}
      <div
        style={{
          position: "absolute",
          right: -170,
          bottom: 40,
          fontFamily: POLICE_SERIF,
          fontWeight: 900,
          fontSize: 980,
          lineHeight: 1,
          color: C.or,
          opacity: 0.06,
          transform: `rotate(${-6 + Math.sin(frame / 120) * 1.5}deg)`,
        }}
      >
        学
      </div>
      {/* Fleurs de prunier qui tombent lentement */}
      {Array.from({ length: 9 }).map((_, i) => {
        const vitesse = 0.9 + ((i * 37) % 10) / 12;
        const y = ((frame * vitesse + i * 260) % (height + 200)) - 100;
        const x = ((i * 389) % (width - 120)) + 60 + Math.sin((frame + i * 40) / 45) * 30;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              opacity: 0.32,
              transform: `rotate(${frame * (i % 2 ? 0.8 : -0.6) + i * 40}deg)`,
            }}
          >
            <Fleur taille={26 + (i % 3) * 10} couleur={i % 3 === 0 ? "#F7C6CF" : "#F29BAE"} />
          </div>
        );
      })}
      {/* Cadre doré avec grecques aux coins */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        <rect x={m} y={m} width={width - 2 * m} height={height - 2 * m} fill="none" stroke={C.or} strokeWidth={2} />
        <rect x={m + 12} y={m + 12} width={width - 2 * m - 24} height={height - 2 * m - 24} fill="none" stroke={C.or} strokeWidth={1} opacity={0.6} />
        <Grecque x={m} y={m} sx={1} sy={1} />
        <Grecque x={width - m} y={m} sx={-1} sy={1} />
        <Grecque x={m} y={height - m} sx={1} sy={-1} />
        <Grecque x={width - m} y={height - m} sx={-1} sy={-1} />
      </svg>
    </AbsoluteFill>
  );
};

// Sceau (tampon) : caractères dans un carré au filet doré, légèrement penché
export const Sceau: React.FC<{ texte: string; taille: number; style?: React.CSSProperties }> = ({ texte, taille, style }) => (
  <div
    style={{
      width: taille,
      height: taille,
      borderRadius: taille * 0.1,
      border: `${Math.max(3, taille * 0.035)}px solid ${C.or}`,
      outline: `${Math.max(1, taille * 0.012)}px solid ${C.or}`,
      outlineOffset: -taille * 0.08,
      background: "#B3191E",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: POLICE_SERIF,
      fontWeight: 900,
      fontSize: taille * (texte.length > 1 ? 0.36 : 0.62),
      lineHeight: 1.05,
      color: "#F6D58E",
      textAlign: "center",
      writingMode: texte.length > 1 ? "vertical-rl" : undefined,
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
      ...style,
    }}
  >
    {texte}
  </div>
);

export const THEMES: Record<TypeQuiz, Theme> = {
  orthographe: {
    palette: PALETTE_NUIT,
    police: POLICE,
    policeLatin: POLICE,
    policeHanzi: POLICE_CHINOIS,
    bandeau: BandeauFR,
    pastilleJour: (j) => `JOUR ${j}`,
    titre: ["QUIZ", "ORTHOGRAPHE"],
    sousTitre: (n) => (
      <>
        {n} mots pièges.
        <br />
        Tu en écris combien sans faute ?
      </>
    ),
    entete: (j) => (
      <>
        <J>JOUR {j}</J> · ORTHOGRAPHE
      </>
    ),
    consigne: (
      <>
        Quelle est la <J>bonne orthographe</J> ?
      </>
    ),
    bonus: "+1 point si tu l'avais !",
    outroTitre: (n) => (
      <>
        Alors, ton score
        <br />
        <J>sur {n} ?</J>
      </>
    ),
    outroCommentaire: "Dis-le en commentaire",
    outroDemain: (j) => `Rendez-vous demain pour le jour ${j}`,
  },

  // Apprendre le chinois, pour un public anglophone (TikTok) : interface en anglais, habillage laque et or
  chinois: {
    palette: PALETTE_LAQUE,
    police: POLICE_SERIF,
    policeLatin: POLICE_SERIF,
    policeHanzi: POLICE_SERIF,
    bandeau: BandeauOr,
    decor: DecorChinois,
    sceau: "中文",
    pastilleJour: (j) => `DAY ${j}`,
    titre: ["CHINESE", "QUIZ"],
    sousTitre: (n) => (
      <>
        {n} Chinese words.
        <br />
        How many do you know?
      </>
    ),
    entete: (j) => (
      <>
        <J>DAY {j}</J> · CHINESE
      </>
    ),
    consigne: (
      <>
        What does this <J>mean</J>?
      </>
    ),
    bonus: "+1 point if you got it!",
    outroTitre: (n) => (
      <>
        What&apos;s your score
        <br />
        <J>out of {n}?</J>
      </>
    ),
    outroCommentaire: "Tell me in the comments",
    outroDemain: (j) => `See you tomorrow for day ${j}`,
  },

  // Apprendre le français, pour un public sinophone (Xiaohongshu) : tout le texte est en chinois simplifié
  francais: {
    palette: PALETTE_NUIT,
    police: POLICE_CHINOIS,
    policeLatin: POLICE,
    policeHanzi: POLICE_CHINOIS,
    bandeau: BandeauFR,
    pastilleJour: (j) => `第 ${j} 天`,
    titre: ["法语", "单词挑战"],
    sousTitre: (n) => (
      <>
        {n} 个法语单词
        <br />
        你能认出几个？
      </>
    ),
    entete: (j) => (
      <>
        <J>第 {j} 天</J> · 每日法语
      </>
    ),
    consigne: (
      <>
        这个法语单词是<J>什么意思</J>？
      </>
    ),
    bonus: "答对了就加 1 分！",
    outroTitre: (n) => (
      <>
        你答对了几个？
        <br />
        <J>满分 {n} 分</J>
      </>
    ),
    outroCommentaire: "在评论区告诉我吧",
    outroDemain: (j) => `明天见 · 第 ${j} 天`,
  },
};

// Texte brut d'un nœud React (fragments, spans, chaînes)
const texteDe = (n: React.ReactNode): string => {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(texteDe).join("");
  if (React.isValidElement(n)) return texteDe((n.props as { children?: React.ReactNode }).children);
  return "";
};

// Tous les textes fixes d'un thème, pour précharger les glyphes chinois avant la capture des images
export const textesTheme = (t: Theme) =>
  [
    t.pastilleJour(0),
    t.titre.join(""),
    texteDe(t.sousTitre(0)),
    texteDe(t.entete(0)),
    texteDe(t.consigne),
    t.bonus,
    texteDe(t.outroTitre(0)),
    t.outroCommentaire,
    t.outroDemain(0),
    t.sceau ?? "",
    t.decor ? "学" : "",
    "0123456789/",
  ].join("");
