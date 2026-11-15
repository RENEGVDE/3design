import { describe, it, expect } from 'vitest';
import { kelvinToColor, FINISH_MODES } from '../textures';

describe('textures', () => {
  it('maps Kelvin temperatures to warm, neutral, and cool colors', () => {
    const warm = kelvinToColor(2700);
    const neutral = kelvinToColor(4000);
    const cool = kelvinToColor(6500);

    expect(warm.getHexString()).toBe('ffbe73');
    expect(neutral.getHexString()).toBe('fff5e4');
    expect(cool.getHexString()).toBe('d4eaff');
  });

  it('clamps Kelvin temperatures outside 2700K-6500K', () => {
    expect(kelvinToColor(1500).getHexString()).toBe('ffbe73');
    expect(kelvinToColor(9000).getHexString()).toBe('d4eaff');
  });

  it('defines all four finish modes with valid PBR parameters', () => {
    expect(FINISH_MODES.map((m) => m.key)).toEqual(['matte', 'satin', 'gloss', 'glass']);
    for (const mode of FINISH_MODES) {
      expect(mode.roughness).toBeGreaterThanOrEqual(0);
      expect(mode.roughness).toBeLessThanOrEqual(1);
    }
  });
});

