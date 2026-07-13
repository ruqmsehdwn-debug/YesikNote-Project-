const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function hasFinalConsonant(word: string): boolean | null {
  const last = [...word.trim()].at(-1);
  if (!last) return null;
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % 28 !== 0;
}

export function withParticle(
  word: string,
  pair: ['이', '가'] | ['을', '를'] | ['은', '는'],
): string {
  const finalConsonant = hasFinalConsonant(word);
  if (finalConsonant === null) return `${word}${pair[1]}`;
  return `${word}${finalConsonant ? pair[0] : pair[1]}`;
}
