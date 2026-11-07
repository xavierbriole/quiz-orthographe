// Textes et habillage de chaque quiz. La mise en page et les animations sont communes (Quiz.tsx).
import React from "react";

export type TypeQuiz = "orthographe" | "chinois" | "francais";

export const C = {
  fond1: "#0B1026",
  fond2: "#24184F",
  carte: "#F8FAFC",
  texte: "#0F172A",
  jaune: "#FACC15",
  vert: "#22C55E",
  rouge: "#EF4444",
  gris: "#334155",
  grisTexte: "#94A3B8",
  bleuFR: "#2B4BD6",
  rougeFR: "#E63946",
  rougeCN: "#DE2910",
  jauneCN: "#FFDE00",
};

// Inter pour l'alphabet latin, Noto Sans SC pour les caractères chinois (polices embarquées, cf. Root.tsx)
export const POLICE = "Inter, 'Noto Sans SC', system-ui, sans-serif";
export const POLICE_CHINOIS = "'Noto Sans SC', Inter, sans-serif";

// Texte en jaune
export const J: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: C.jaune }}>{children}</span>;

const BandeauFR: React.FC = () => (
  <div style={{ display: "flex", width: 150, height: 14, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
    <div style={{ flex: 1, background: C.bleuFR }} />
    <div style={{ flex: 1, background: "#FFFFFF" }} />
    <div style={{ flex: 1, background: C.rougeFR }} />
  </div>
);

const Etoile: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.6 5.7 21.5l1.7-7.3L2 9.5l7.1-.6z" fill={C.jauneCN} />
  </svg>
);

const BandeauCN: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      width: 150,
      height: 14,
      padding: "0 8px",
      borderRadius: 7,
      background: C.rougeCN,
      flexShrink: 0,
      boxSizing: "border-box",
    }}
  >
    <Etoile size={12} />
    <Etoile size={7} />
    <Etoile size={7} />
  </div>
);

export type Theme = {
  police: string; // police des textes de l'interface
  bandeau: React.FC;
  pastilleJour: (jour: number) => string;
  titre: [string, string]; // 2 lignes, la 2e en jaune
  sousTitre: (n: number) => React.ReactNode;
  entete: (jour: number) => React.ReactNode;
  consigne: React.ReactNode;
  bonus: string;
  outroTitre: (n: number) => React.ReactNode;
  outroCommentaire: string;
  outroDemain: (jour: number) => string;
};

export const THEMES: Record<TypeQuiz, Theme> = {
  orthographe: {
    police: POLICE,
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

  // Apprendre le chinois, pour un public francophone (TikTok)
  chinois: {
    police: POLICE,
    bandeau: BandeauCN,
    pastilleJour: (j) => `JOUR ${j}`,
    titre: ["QUIZ", "CHINOIS"],
    sousTitre: (n) => (
      <>
        {n} mots de chinois.
        <br />
        Tu en connais combien ?
      </>
    ),
    entete: (j) => (
      <>
        <J>JOUR {j}</J> · CHINOIS
      </>
    ),
    consigne: (
      <>
        Que veut dire <J>ce mot</J> ?
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

  // Apprendre le français, pour un public sinophone (Xiaohongshu) : tout le texte est en chinois simplifié
  francais: {
    police: POLICE_CHINOIS,
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
    "0123456789/",
  ].join("");
