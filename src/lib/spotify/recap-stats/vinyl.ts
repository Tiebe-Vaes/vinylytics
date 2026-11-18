/** Playing speed of an LP. */
const RPM = 100 / 3;
/** Average groove radius on a 12" LP, in metres (outer ~0.146, inner ~0.06). */
export const AVG_GROOVE_RADIUS_M = 0.11;
/** One spin = both sides of an average LP. */
const MINUTES_PER_SPIN = 42;
/** Roughly how many plays a vinyl record survives before it audibly wears. */
export const SPINS_PER_RECORD = 1000;

/** Your listening time as if it all ran on a turntable. */
export function vinylPhysics(minutes: number) {
  const rotations = Math.round(minutes * RPM);
  return {
    rotations,
    grooveKm: (rotations * 2 * Math.PI * AVG_GROOVE_RADIUS_M) / 1000,
    recordsWorn: Math.floor(minutes / MINUTES_PER_SPIN / SPINS_PER_RECORD),
  };
}
