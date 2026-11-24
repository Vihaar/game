/** Optional reading adds context, never resources or a prerequisite to advance. */
export const CHAPTER_BOOKS = Object.freeze([
  {
    title: "The first name",
    question: "How can something be named?",
    passage:
      "On the open page, a mark becomes a sound, and a sound becomes an idea. You trace the shape of a word. The world is still unfamiliar, but now you can ask it a question.",
  },
  {
    title: "Roots between pages",
    question: "How does life connect?",
    passage:
      "Fine paper roots run from one book to another. A fallen leaf feeds a new shoot. Nothing here grows entirely alone. You follow one thread and find that it passes through your own shadow.",
  },
  {
    title: "What the water keeps",
    question: "What survives time?",
    passage:
      "The flooded index reflects a room that no longer exists. A remembered voice changes what you notice in the present. The page asks what a memory carries. When you look up, you can no longer remember the corridor you entered through.",
  },
  {
    title: "The shape of becoming",
    question: "How can things change?",
    passage:
      "A folded seed opens into a paper flower. Its material is familiar; its possibility is new. Beside it, two ideas wait to be combined. A corner of the room folds inward as you begin to understand.",
  },
  {
    title: "A small rule, a vast sky",
    question: "What holds the cosmos together?",
    passage:
      "Pinprick stars hang on almost invisible threads. Move one, and a distant constellation answers. You begin to see the pattern of the whole sky. Its threads tighten, and the stars seem to notice you in return.",
  },
  {
    title: "A margin for doubt",
    question: "What makes something true?",
    passage:
      "The press has left one sentence unfinished. In its margin, another reader has written: What would change your mind? You look again, looking for evidence. The familiar answer dissolves, taking part of the wall with it.",
  },
  {
    title: "The reader in the mirror",
    question: "Who is doing the learning?",
    passage:
      "Between torn pages, a reflection turns when you turn. You have studied the world, but every question has also revealed the one asking it. The reflection knows the next question before you ask it. The library is learning you, too.",
  },
  {
    title: "The last open page",
    question: "How does everything fit together?",
    passage:
      "The book opens to eight pages at once. Language, life, memory, change, the cosmos, truth and self reach toward one another. One unanswered question remains: what can still shelter you when nothing is unknown? The pages tremble, but they do not close.",
  },
]);
export function chapterBook(index) {
  return CHAPTER_BOOKS[
    Math.max(0, Math.min(7, Number.isInteger(index) ? index : 0))
  ];
}
export function worldAvailable({ started, phase, travelling, modal }) {
  return Boolean(started && phase === "explore" && !travelling && !modal);
}
