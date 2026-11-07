// Les différents quiz : d'où viennent les mots, où la vidéo est publiée, légende et hashtags.
// Choisir le(s) quiz à générer : node scripts/render.mjs --quiz=chinois   (ou QUIZ=orthographe,chinois,francais)
import { construirePool } from "./mots.mjs";
import { construirePoolVocab } from "./vocabulaire.mjs";
import { construireVideo, construireVideoVocab } from "../src/questions.js";

// Un socle fixe (la niche) + 2 hashtags qui tournent chaque jour, pour varier sans s'éparpiller
const tourner = (liste, jour) => [0, 1].map((k) => liste[(jour * 2 + k) % liste.length]);

export const QUIZ = {
  // Orthographe française, public francophone → TikTok
  orthographe: {
    libelle: "Orthographe",
    composition: "QuizOrthographe",
    historique: "historique.json",
    prefixe: "quiz",
    plateforme: "tiktok",
    pool: construirePool,
    video: (pool, deja, n, graine) => construireVideo(pool, deja, n, graine),
    stockEpuise: "Plus assez de mots inédits : augmente RANG_MAX dans scripts/mots.mjs",
    legende: ({ jour, n }) =>
      `Quiz d'orthographe du jour ${jour} ✏️ ${n} mots pièges en français : tu fais combien sans faute ? ` +
      `Dis ton score en commentaire 👇\n\n` +
      [
        ...["#orthographe", "#français", "#apprendresurtiktok", "#quiz"],
        ...tourner(
          ["#languefrançaise", "#francais", "#dictée", "#culturegénérale", "#motspièges",
           "#grammaire", "#éducation", "#quizz", "#défi", "#apprendre"],
          jour
        ),
      ].join(" "),
  },

  // Apprendre le chinois, public francophone → TikTok
  chinois: {
    libelle: "Chinois",
    composition: "QuizChinois",
    historique: "historique-chinois.json",
    prefixe: "chinois",
    plateforme: "tiktok",
    // Compte TikTok dédié, utilisé seulement s'il a été connecté (sinon : le compte principal)
    compteTikTok: "chinois",
    pool: construirePoolVocab,
    video: (pool, deja, n, graine) => construireVideoVocab(pool, deja, n, graine, "chinois"),
    stockEpuise: "Plus assez de mots inédits : ajoute des mots dans data/vocabulaire.txt",
    legende: ({ jour, n }) =>
      `Quiz de chinois du jour ${jour} 🇨🇳 ${n} mots de chinois : tu en connais combien ? ` +
      `Dis ton score en commentaire 👇\n\n` +
      [
        ...["#chinois", "#apprendrelechinois", "#mandarin", "#apprendresurtiktok"],
        ...tourner(
          ["#quiz", "#chine", "#languechinoise", "#vocabulaire", "#hsk",
           "#apprendreunelangue", "#polyglotte", "#défi", "#culturegénérale", "#langues"],
          jour
        ),
      ].join(" "),
  },

  // Apprendre le français, public sinophone → Xiaohongshu (publication à la main : pas d'API ouverte)
  francais: {
    libelle: "Français",
    composition: "QuizFrancais",
    historique: "historique-francais.json",
    prefixe: "francais",
    plateforme: "xiaohongshu",
    couverture: true, // image de couverture .png (sur Xiaohongshu, la couverture compte beaucoup)
    pool: construirePoolVocab,
    video: (pool, deja, n, graine) => construireVideoVocab(pool, deja, n, graine, "francais"),
    stockEpuise: "Plus assez de mots inédits : ajoute des mots dans data/vocabulaire.txt",
    // Titre : 20 caractères max sur Xiaohongshu
    titre: ({ jour, n }) => `每日法语第${jour}天｜${n}个单词认识几个`,
    legende: ({ jour, n, questions }) =>
      `🇫🇷 零基础也能玩的法语单词挑战！\n` +
      `${n} 个单词，每个都有思考时间，看看你能答对几个？\n` +
      `评论区告诉我你的得分吧 👇 关注我，每天学几个法语单词～\n\n` +
      `📒 今日单词（看完视频再对答案哦）：\n` +
      questions.map((q) => `${q.mot}${q.tag ? ` (${q.tag})` : ""} = ${q.options[q.correctIndex]}`).join("\n") +
      `\n\n` +
      [
        ...["#法语", "#法语学习", "#学法语", "#法语单词", "#每日法语"],
        ...tourner(
          ["#法语入门", "#小语种", "#留学法国", "#法国", "#语言学习",
           "#法语零基础", "#自学法语", "#背单词", "#外语学习", "#法语打卡"],
          jour
        ),
      ].join(" "),
  },
};
