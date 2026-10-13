import { normalizeScale } from './traitScale';

describe('normalizeScale', () => {
  it('normalizes and clamps values to the visual range', () => {
    expect(normalizeScale(3, 5)).toBe(0.6);
    expect(normalizeScale(-1, 5)).toBe(0);
    expect(normalizeScale(150, 120)).toBe(1);
  });
});
