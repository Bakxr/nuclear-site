const VIEWER_CONFIG = {
  PWR: {
    renderMode: "procedural",
    desktopCamera: { position: [6.2, 3.5, 6.3], lookAt: [0, 0.45, 0] },
    mobileCamera: { position: [4.9, 2.7, 5.1], lookAt: [0, 0.35, 0] },
    desktopHeight: 360,
    mobileHeight: 270,
  },
  BWR: {
    renderMode: "procedural",
    desktopCamera: { position: [6.6, 3.6, 6.4], lookAt: [0, 0.35, 0] },
    mobileCamera: { position: [5.0, 2.7, 5.0], lookAt: [0, 0.25, 0] },
    desktopHeight: 360,
    mobileHeight: 270,
  },
  PHWR: {
    renderMode: "procedural",
    desktopCamera: { position: [7.4, 2.8, 7.2], lookAt: [0, -0.1, 0] },
    mobileCamera: { position: [6.1, 2.2, 6.1], lookAt: [0, -0.1, 0] },
    desktopHeight: 360,
    mobileHeight: 260,
  },
  VVER: {
    renderMode: "procedural",
    desktopCamera: { position: [6.7, 3.8, 6.5], lookAt: [0, 0.4, 0] },
    mobileCamera: { position: [5.2, 2.8, 5.2], lookAt: [0, 0.3, 0] },
    desktopHeight: 360,
    mobileHeight: 270,
  },
  SMR: {
    renderMode: "procedural",
    desktopCamera: { position: [5.8, 3.1, 5.8], lookAt: [0, 0.3, 0] },
    mobileCamera: { position: [4.6, 2.5, 4.8], lookAt: [0, 0.2, 0] },
    desktopHeight: 360,
    mobileHeight: 260,
  },
  Other: {
    renderMode: "procedural",
    desktopCamera: { position: [6.5, 3.6, 6.2], lookAt: [0, 0.25, 0] },
    mobileCamera: { position: [5.0, 2.7, 5.0], lookAt: [0, 0.2, 0] },
    desktopHeight: 360,
    mobileHeight: 270,
  },
};

export function getReactorViewerConfig(type, isMobileViewport = false) {
  const config = VIEWER_CONFIG[type] || VIEWER_CONFIG.Other;

  return {
    type,
    renderMode: config.renderMode,
    assetPath: config.assetPath || null,
    attribution: config.attribution || null,
    transform: config.transform || null,
    camera: isMobileViewport && config.mobileCamera ? config.mobileCamera : config.desktopCamera,
    height: isMobileViewport && config.mobileHeight ? config.mobileHeight : config.desktopHeight,
  };
}

