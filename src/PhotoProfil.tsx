// Photo de profil du compte TikTok du quiz de chinois (1080×1080, affichée en rond par TikTok).
// Rendu : npm run photo-profil → assets/photo-profil-chinois.png
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, POLICE_SERIF, Sceau } from "./themes";
import { useAttendrePolices } from "./Quiz";

const Fleur: React.FC<{ x: number; y: number; taille: number; rotation: number; couleur: string }> = ({ x, y, taille, rotation, couleur }) => (
  <svg width={taille} height={taille} viewBox="-12 -12 24 24" style={{ position: "absolute", left: x, top: y, transform: `rotate(${rotation}deg)` }}>
    {[0, 72, 144, 216, 288].map((r) => (
      <ellipse key={r} cx={0} cy={-6} rx={4.6} ry={6} fill={couleur} transform={`rotate(${r})`} />
    ))}
    <circle r={2.6} fill={C.or} />
  </svg>
);

export const PhotoProfil: React.FC = () => {
  useAttendrePolices("中学");
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, #B3222A 0%, #7A1216 55%, #3E080B 100%)" }}>
      {/* Anneaux dorés, visibles dans le rond de TikTok */}
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={540} cy={540} r={470} fill="none" stroke={C.or} strokeWidth={10} />
        <circle cx={540} cy={540} r={444} fill="none" stroke={C.or} strokeWidth={3} opacity={0.7} />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <circle key={i} cx={540 + Math.cos(a) * 457} cy={540 + Math.sin(a) * 457} r={4} fill={C.or} />;
        })}
      </svg>
      {/* Caractère central */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: POLICE_SERIF,
            fontWeight: 900,
            fontSize: 640,
            lineHeight: 1,
            marginTop: -40,
            color: "#F6D58E",
            textShadow: "0 18px 40px rgba(0,0,0,0.45)",
          }}
        >
          中
        </div>
      </AbsoluteFill>
      <Sceau texte="学" taille={190} style={{ position: "absolute", right: 205, bottom: 175, transform: "rotate(-8deg)" }} />
      <Fleur x={205} y={215} taille={120} rotation={15} couleur="#F29BAE" />
      <Fleur x={300} y={170} taille={64} rotation={-20} couleur="#F7C6CF" />
    </AbsoluteFill>
  );
};
