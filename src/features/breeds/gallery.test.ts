import { resolveInitialImageIndex } from './gallery';

describe('resolveInitialImageIndex', () => {
  const images = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];

  it('opens the selected image', () => {
    expect(resolveInitialImageIndex(images, 'second')).toBe(1);
  });

  it('falls back to the first image when the selection is stale', () => {
    expect(resolveInitialImageIndex(images, 'missing')).toBe(0);
  });
});
