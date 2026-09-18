// Fractional-index ordering: dropping an item between neighbors at
// `prevPosition < nextPosition` only ever rewrites the single moved row,
// never the whole list.

const APPEND_GAP = 1024;

export function positionBetween(prevPosition: number | null, nextPosition: number | null): number {
  if (prevPosition === null && nextPosition === null) {
    return APPEND_GAP;
  }
  if (prevPosition === null) {
    return nextPosition! - APPEND_GAP;
  }
  if (nextPosition === null) {
    return prevPosition + APPEND_GAP;
  }
  return (prevPosition + nextPosition) / 2;
}

export function positionAtEnd(maxPosition: number | null): number {
  return maxPosition === null ? APPEND_GAP : maxPosition + APPEND_GAP;
}
