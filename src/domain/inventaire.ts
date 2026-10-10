/** Compare ce qui devrait être en rayon avec ce qui a été scanné. */
export function calculerEcarts(attendus: string[], scannes: string[]) {
  const a = new Set(attendus), s = new Set(scannes);
  return { manquants: attendus.filter((id) => !s.has(id)), inattendus: scannes.filter((id) => !a.has(id)) };
}
