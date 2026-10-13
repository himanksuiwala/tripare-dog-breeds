export const TRAIT_SCALE_MAX = 5;
export const EXERCISE_MINUTES_MAX = 120;

export function normalizeScale(value: number, maximum: number): number {
  if (!Number.isFinite(value) || maximum <= 0) {
    return 0;
  }

  return Math.min(Math.max(value, 0), maximum) / maximum;
}
