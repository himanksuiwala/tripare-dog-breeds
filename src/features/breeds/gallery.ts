export function resolveInitialImageIndex(
  images: readonly { id: string }[],
  selectedImageId: string,
): number {
  const selectedIndex = images.findIndex(
    (image) => image.id === selectedImageId,
  );
  return selectedIndex >= 0 ? selectedIndex : 0;
}
