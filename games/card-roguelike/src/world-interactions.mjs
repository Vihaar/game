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
      "The flooded index reflects a room that no longer exists. A guardian stands in the water, practising the gesture you used upstairs. A note beside it has your handwriting. You cannot remember writing it, or the corridor you entered through.",
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
      "Pinprick stars hang on almost invisible threads. Move one, and a distant constellation answers. The same pattern runs through your grimoire and the guardians' spells. You thought the library was studying magic. It has been studying the magician.",
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
      "Between torn pages, a reflection raises its hand. Your hand. It wears the first guardian's torn sleeve. Behind it stand every keeper you defeated, each bearing a part of your face. These were your abandoned answers, preserved as bodies. You have been fighting yourself.",
  },
  {
    title: "The last open page",
    question: "How does everything fit together?",
    passage:
      "The book opens to eight pages at once. Your handwriting fills them all. Every discovery, every guardian, every version of you reaches the same answer. The library learned to become you. Now you understand everything it contains. There is no one left to ask, and nothing left that you can bear not to know.",
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
