export type FolderLayoutItem = { x: number; y: number; row: number; scale: number };

export type RenderProfile = {
  isMobile: boolean;
  pixelRatio: number;
  shadowMapSize: number;
};

export function getDirectoryLayout(width: number, height: number): FolderLayoutItem[] {
  const isMobile = width / height < 0.85;
  if (isMobile) {
    return [
      { x: -1.35, y: 2.4, row: 0, scale: 0.82 },
      { x: 1.35, y: 2.4, row: 0, scale: 0.82 },
      { x: -1.35, y: 0, row: 1, scale: 0.82 },
      { x: 1.35, y: 0, row: 1, scale: 0.82 },
      { x: 0, y: -2.4, row: 2, scale: 0.82 },
    ];
  }
  return [
    { x: -3.4, y: 1.2, row: 0, scale: 1 },
    { x: 0, y: 1.2, row: 0, scale: 1 },
    { x: 3.4, y: 1.2, row: 0, scale: 1 },
    { x: -1.75, y: -1.45, row: 1, scale: 1 },
    { x: 1.75, y: -1.45, row: 1, scale: 1 },
  ];
}

export function getRenderProfile(width: number, height: number, devicePixelRatio: number): RenderProfile {
  const isMobile = width / height < 0.85 || width < 720;
  return {
    isMobile,
    pixelRatio: Math.min(devicePixelRatio, isMobile ? 1.5 : 2),
    shadowMapSize: isMobile ? 1024 : 2048,
  };
}

export function getCoverScale(width: number, height: number): number {
  if (width >= 720 && width / height >= 0.85) return 0.54;
  return Math.min(0.48, 0.35 * Math.min(1, width / 390));
}

export function getDetailScale(width: number, height: number): number {
  return width / height < 0.85 || width < 720 ? 0.62 : 1;
}
