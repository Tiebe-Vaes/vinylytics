/**
 * Sequential cobalt ramp for heatmaps: magnitude, not identity, so one ink
 * from dim to bright on the ink-black ground. Index 0 is the lowest step.
 */
const RAMP = ["#14284f", "#1a3a7a", "#1f4fd8", "#5b80e6", "#a9bdf2"];

export function useRamp(): string[] {
  return RAMP;
}
