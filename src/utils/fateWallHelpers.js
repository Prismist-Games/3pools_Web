// src/utils/fateWallHelpers.js
// Pure helper functions for the 4×4 fate wall grid.

/** Convert flat index to { row, col } */
export function indexToRC(index) {
  return { row: Math.floor(index / 4), col: index % 4 };
}

/** Convert { row, col } to flat index */
export function rcToIndex(row, col) {
  return row * 4 + col;
}

/** Get flat indices of 4-directional neighbors (no diagonals). Out-of-bounds excluded. */
export function getNeighbors(index) {
  const { row, col } = indexToRC(index);
  const neighbors = [];
  if (row > 0) neighbors.push(rcToIndex(row - 1, col));
  if (row < 3) neighbors.push(rcToIndex(row + 1, col));
  if (col > 0) neighbors.push(rcToIndex(row, col - 1));
  if (col < 3) neighbors.push(rcToIndex(row, col + 1));
  return neighbors;
}

/** Get all 4 flat indices for a row (0–3). */
export function getRowIndices(row) {
  return [0, 1, 2, 3].map(col => rcToIndex(row, col));
}

/** Get all 4 flat indices for a col (0–3). */
export function getColIndices(col) {
  return [0, 1, 2, 3].map(row => rcToIndex(row, col));
}

/**
 * Determine the doom hit target index for one Doom draw.
 *
 * Rules (in priority order):
 * 1. Get the 4 candidate indices for the given row or col.
 * 2. GUARD_STONE protection: for each guard_stone in the line, exclude its
 *    4-directional neighbors from candidates. Guard stone itself stays in.
 * 3. BAIT priority: if any remaining candidate holds a bait charm, doom hits
 *    a random bait (ignoring non-bait candidates).
 * 4. Otherwise: uniformly random among all remaining candidates (including nulls).
 *
 * @param {Array} cells - flat 4×4 array (index 0–15, null = empty)
 * @param {'row'|'col'} direction
 * @param {number} lineIndex - 0–3
 * @returns {number} flat index of the doom target
 */
export function getDoomTarget(cells, direction, lineIndex) {
  const indices = direction === 'row'
    ? getRowIndices(lineIndex)
    : getColIndices(lineIndex);

  let candidates = [...indices];

  // Step 2: Guard stone protection
  const guardStoneIndices = indices.filter(i => cells[i]?.type === 'guard_stone');
  for (const gsIdx of guardStoneIndices) {
    const protected_ = getNeighbors(gsIdx);
    candidates = candidates.filter(i => i === gsIdx || !protected_.includes(i));
  }

  // Step 3: Bait priority
  const baitCandidates = candidates.filter(i => cells[i]?.type === 'bait');
  if (baitCandidates.length > 0) {
    return baitCandidates[Math.floor(Math.random() * baitCandidates.length)];
  }

  // Step 4: Uniform random
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Check whether ALL candidates in a line are excluded by guard stones
 * (player must re-pick a different line).
 */
export function isLineFullyProtected(cells, direction, lineIndex) {
  const indices = direction === 'row'
    ? getRowIndices(lineIndex)
    : getColIndices(lineIndex);

  let candidates = [...indices];
  const guardStoneIndices = indices.filter(i => cells[i]?.type === 'guard_stone');
  for (const gsIdx of guardStoneIndices) {
    const protected_ = getNeighbors(gsIdx);
    candidates = candidates.filter(i => i === gsIdx || !protected_.includes(i));
  }
  return candidates.length === 0;
}

/**
 * Check whether a line has at least one filled charm
 * (Luck draw requires a non-empty line).
 */
export function lineHasCharm(cells, direction, lineIndex) {
  const indices = direction === 'row'
    ? getRowIndices(lineIndex)
    : getColIndices(lineIndex);
  return indices.some(i => cells[i] !== null);
}
