// Games whose frame rate is locked by default, by Steam app id. Steam doesn't expose this,
// so the list is maintained by hand; extend it as you find more.
export const FRAME_CAPS: Record<number, number> = {
  1245620: 60, // Elden Ring
  2622380: 60, // Elden Ring Nightreign
  570940: 60, // Dark Souls: Remastered
  335300: 60, // Dark Souls II: Scholar of the First Sin
  374320: 60, // Dark Souls III
  814380: 60, // Sekiro: Shadows Die Twice
  1888160: 120, // Armored Core VI
  524220: 60, // NieR:Automata
  1778820: 60, // Tekken 8
  1364780: 60, // Street Fighter 6
  1971870: 60, // Mortal Kombat 1
  678950: 60, // Dragon Ball FighterZ
  105600: 60, // Terraria (can be unlocked in settings)
  391540: 30, // Undertale
  504230: 60, // Celeste
};
