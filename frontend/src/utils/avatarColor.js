// Deterministic "random" default avatar colors - same seed (user id/username)
// always produces the same gradient, so a user's default avatar looks stable
// across sessions/devices instead of changing on every render.

const AVATAR_GRADIENTS = [
  ['#7c3aed', '#4c1d95'], // purple
  ['#0ea5e9', '#0369a1'], // blue
  ['#f97316', '#c2410c'], // orange
  ['#10b981', '#047857'], // green
  ['#ec4899', '#9d174d'], // pink
  ['#eab308', '#a16207'], // yellow
  ['#ef4444', '#b91c1c'], // red
  ['#14b8a6', '#0f766e'], // teal
];

export const getAvatarGradient = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
};
