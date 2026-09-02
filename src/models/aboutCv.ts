import * as THREE from 'three';
import type { Category } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeTag, makeTextPanel, roundedRectShape, makeExtrudedMesh } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { createPaperclip } from '../three/paperclip';

type CanvasPainter = (context: CanvasRenderingContext2D, width: number, height: number) => void;

function fallbackTexture(color: string): THREE.DataTexture {
  const parsed = new THREE.Color(color);
  const data = new Uint8Array([
    Math.round(parsed.r * 255), Math.round(parsed.g * 255), Math.round(parsed.b * 255), 255,
  ]);
  const texture = new THREE.DataTexture(data, 1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCanvasTexture(width: number, height: number, background: string, paint: CanvasPainter): THREE.Texture {
  if (typeof document === 'undefined') return fallbackTexture(background.startsWith('rgba') ? '#FFFFFF' : background);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return fallbackTexture(background);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  paint(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function makePaperPanel(width: number, height: number, depth: number, edgeColor: string, texture: THREE.Texture): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const edge = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.94, metalness: 0 });
  const face = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true });
  const mesh = new THREE.Mesh(geometry, [edge, edge.clone(), edge.clone(), edge.clone(), face, edge.clone()]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function drawHandText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight = 700,
  color = '#222126',
): void {
  context.fillStyle = color;
  context.font = `${weight} ${size}px "Arial Narrow", "PingFang SC", sans-serif`;
  context.fillText(text, x, y);
}

function makeRuledBackground(): THREE.Texture {
  return createCanvasTexture(1536, 1080, '#E9E0CC', (context, width, height) => {
    context.strokeStyle = 'rgba(113, 101, 81, 0.18)';
    context.lineWidth = 3;
    for (let y = 42; y < height; y += 67) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.fillStyle = 'rgba(81, 62, 42, 0.035)';
    for (let index = 0; index < 700; index += 1) {
      const x = (index * 83) % width;
      const y = (index * 47) % height;
      context.fillRect(x, y, 2, 1);
    }
    context.save();
    context.translate(width * 0.83, -height * 0.02);
    context.rotate(0.43);
    context.fillStyle = '#91D2EA';
    context.fillRect(0, 0, width * 0.34, height * 0.16);
    context.strokeStyle = 'rgba(255,255,255,.72)';
    context.lineWidth = 4;
    for (let y = 18; y < 150; y += 22) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width * 0.34, y);
      context.stroke();
    }
    context.restore();
    context.save();
    context.translate(-30, -25);
    context.rotate(0.18);
    context.fillStyle = '#F8F8F3';
    context.fillRect(0, 0, 190, 240);
    context.strokeStyle = 'rgba(120,130,140,.2)';
    context.lineWidth = 2;
    for (let x = 18; x < 190; x += 30) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 240); context.stroke();
    }
    for (let y = 18; y < 240; y += 30) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(190, y); context.stroke();
    }
    context.restore();
  });
}

function makeAboutTexture(): THREE.Texture {
  return createCanvasTexture(1500, 510, 'rgba(255,255,255,0)', (context, width) => {
    context.textBaseline = 'alphabetic';
    drawHandText(context, 'ABOUT ME!', 28, 92, 76, 800);
    context.strokeStyle = '#FF4E68';
    context.lineWidth = 5;
    context.beginPath(); context.arc(392, 66, 23, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.moveTo(415, 28); context.lineTo(428, 15); context.moveTo(421, 34); context.lineTo(438, 39); context.stroke();
    const lines = [
      'HI! MY NAME IS YOUR NAME. I HAVE A BACHELOR’S DEGREE IN VISUAL',
      'COMMUNICATION DESIGN. I’M CURRENTLY BASED IN YOUR CITY.',
      'I AM CURIOUS, PASSIONATE AND WILLING TO LEARN. MY PASSION IS',
      'DIGITAL ILLUSTRATION, PHOTOGRAPHY AND VIBRANT VISUAL STORIES.',
      'I ENJOY TURNING COMPLEX IDEAS INTO CLEAR, PLAYFUL EXPERIENCES.',
    ];
    lines.forEach((line, index) => drawHandText(context, line, 30, 155 + index * 67, 38, 650));
    context.strokeStyle = '#FF4E68';
    context.lineWidth = 5;
    context.beginPath(); context.ellipse(279, 145, 111, 28, -0.02, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.ellipse(1030, 213, 122, 28, 0.02, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.moveTo(615, 338); context.lineTo(863, 338); context.stroke();
    context.fillStyle = '#FF4E68';
    context.font = '700 34px sans-serif';
    context.fillText('✦', width - 90, 82);
  });
}

function makePortraitTexture(): THREE.Texture {
  if (typeof document === 'undefined') return fallbackTexture('#FFD9E3');
  const width = 620;
  const height = 790;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return fallbackTexture('#FFD9E3');
  context.fillStyle = '#FFD9E3';
  context.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const paint = (image: HTMLImageElement): void => {
    context.fillStyle = '#FFD9E3';
    context.fillRect(0, 0, width, height);
    const imageHeight = height - 112;
    const ratio = Math.min(width / image.naturalWidth, imageHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    context.drawImage(image, (width - drawWidth) / 2, 0, drawWidth, drawHeight);
    context.fillStyle = '#FFFDF8';
    context.fillRect(0, height - 112, width, 112);
    drawHandText(context, 'NAME: GINNY HAN', 34, height - 61, 29, 800);
    drawHandText(context, 'ROLE: VISUAL DESIGNER', 34, height - 20, 27, 650);
    texture.needsUpdate = true;
  };
  const image = new Image();
  image.onload = () => paint(image);
  image.src = '/ginny-han.png';
  return texture;
}

function makeSoftwareTexture(): THREE.Texture {
  return createCanvasTexture(520, 760, '#FFFFFF', (context, width) => {
    context.textAlign = 'center';
    drawHandText(context, 'SOFTWARE', width / 2, 80, 53, 800);
    drawHandText(context, 'SKILLS', width / 2, 142, 53, 800);
    const items = [
      { x: 135, y: 305, label: 'Ps', color: '#19233D' },
      { x: 365, y: 305, label: 'Ai', color: '#5B2A18' },
      { x: 135, y: 520, label: 'Pr', color: '#492148' },
      { x: 365, y: 520, label: 'Fg', color: '#F06A80' },
    ];
    items.forEach((item, index) => {
      context.strokeStyle = '#FF506B'; context.lineWidth = 5;
      context.beginPath(); context.arc(item.x, item.y, 75, 0, Math.PI * 2); context.stroke();
      drawHandText(context, item.label, item.x, item.y + 22, 70, 800, item.color);
      drawHandText(context, `${index + 1}.`, item.x - 90, item.y + 14, 33, 700, '#FF506B');
    });
    context.textAlign = 'left';
  });
}

function makeExperienceTexture(): THREE.Texture {
  return createCanvasTexture(1050, 690, '#FFFFFF', (context) => {
    drawHandText(context, 'WORK EXPERIENCE', 24, 74, 64, 800);
    const rows = [
      ['MAJI BRANDING AGENCY', 'JANUARY – JUNE 2021', 'GRAPHIC DESIGN INTERN. SOCIAL MEDIA, CAMPAIGN AND STORY DESIGN.'],
      ['KONNICHIWA GROUP', 'MARCH 2022 – JULY 2023', 'GRAPHIC DESIGNER. HANDLED BRANDING AND SOCIAL CAMPAIGNS.'],
      ['TINY AND FLUFF', 'AUGUST 2023 – PRESENT', 'FREELANCE ILLUSTRATION, COMMISSIONS AND PERSONAL PROJECTS.'],
      ['PROLINK LOGISTICS', 'MARCH 2022 – OCTOBER 2022', 'FREELANCE GRAPHIC DESIGN AND CLIENT SOCIAL MEDIA.'],
    ];
    rows.forEach((row, index) => {
      const y = 145 + index * 132;
      drawHandText(context, row[0]!, 28, y, 36, 800);
      drawHandText(context, row[1]!, 520, y - 2, 20, 650, '#55545A');
      drawHandText(context, row[2]!, 31, y + 49, 24, 550, '#3A393D');
      context.strokeStyle = '#FF506B'; context.lineWidth = 4;
      context.beginPath(); context.ellipse(206, y - 11, 180, 30, -0.03, 0, Math.PI * 2); context.stroke();
      context.strokeStyle = 'rgba(65,65,70,.28)'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(22, y + 86); context.lineTo(1020, y + 86); context.stroke();
    });
  });
}

function makeContactTexture(category: Category): THREE.Texture {
  return createCanvasTexture(740, 610, '#FFFFFF', (context) => {
    drawHandText(context, 'CONTACT ME', 35, 85, 67, 800);
    drawHandText(context, '✦', 620, 84, 38, 800, '#FF506B');
    const lines = [
      'YOURNAME@EMAIL.COM',
      '+00 123 456 789',
      'BEHANCE.NET/YOURNAME',
      'LINKEDIN.COM/IN/YOURNAME',
      `PORTFOLIO / ${category.title.en.toUpperCase()}`,
    ];
    lines.forEach((line, index) => drawHandText(context, line, 35, 160 + index * 70, 31, index < 2 ? 750 : 560));
    context.strokeStyle = '#FF506B'; context.lineWidth = 5;
    context.beginPath(); context.moveTo(35, 246); context.lineTo(380, 246); context.stroke();
    drawHandText(context, 'CHECK OUT MY OTHER WORK', 35, 535, 25, 500, '#AAA5A7');
  });
}

function makeAbilityCard(label: string, color: string, glyph: string): THREE.Mesh {
  const texture = createCanvasTexture(420, 520, color, (context, width) => {
    context.fillStyle = 'rgba(255,255,255,.42)'; context.fillRect(34, 32, width - 68, 340);
    context.textAlign = 'center';
    drawHandText(context, glyph, width / 2, 260, 142, 800, '#304157');
    drawHandText(context, label.toUpperCase(), width / 2, 455, 34, 800, '#2E2930');
    context.textAlign = 'left';
  });
  return makePaperPanel(0.82, 1.03, 0.055, color, texture);
}

export function createAboutCvModel(category: Category, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = `about-cv-${category.id}`;
  root.userData.open = false;
  root.userData.projectIndex = 0;
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];

  const ruledBackground = makePaperPanel(8.82, 6.35, 0.1, '#D9CFBA', makeRuledBackground());
  ruledBackground.name = 'ruled-background';
  ruledBackground.position.set(0, 0, -0.42);
  root.add(ruledBackground); parts.set(ruledBackground.name, ruledBackground);

  const lowerScrap = makeExtrudedMesh(roundedRectShape(5.5, 0.72, 0.06), '#FBFBF2', 0.04, 0.015);
  lowerScrap.name = 'lower-paper-scrap';
  lowerScrap.position.set(1.25, -3.0, -0.28);
  lowerScrap.rotation.z = 0.04;
  root.add(lowerScrap); parts.set(lowerScrap.name, lowerScrap);
  for (let index = 0; index < 11; index += 1) {
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: '#D2C6AF', roughness: 0.95 }),
    );
    hole.rotation.x = Math.PI / 2;
    hole.position.set(-1.05 + index * 0.45, -2.76, -0.21);
    root.add(hole);
  }

  const mainBoard = makeExtrudedMesh(roundedRectShape(7.92, 4.82, 0.12), '#FEFEFA', 0.075, 0.022);
  mainBoard.name = 'main-board';
  mainBoard.position.set(0.22, -0.02, -0.02);
  root.add(mainBoard); parts.set(mainBoard.name, mainBoard);

  const tabBack = makeExtrudedMesh(roundedRectShape(2.14, 0.72, 0.12), '#F6F5F0', 0.06, 0.02);
  tabBack.name = 'cv-tab-stack';
  tabBack.position.set(-3.2, 2.63, -0.18);
  root.add(tabBack); parts.set(tabBack.name, tabBack);
  const tabText = makeTextPanel(1.92, 0.54, 0.025, {
    title: 'CURRICULUM VITAE', background: '#FBFAF7', foreground: '#38343B', align: 'center', width: 1000, height: 280,
  });
  tabText.position.set(-3.2, 2.67, -0.12);
  root.add(tabText); parts.set('cv-tab-label', tabText);

  const aboutPrint = makePaperPanel(5.2, 1.7, 0.018, '#FFFFFF', makeAboutTexture());
  aboutPrint.name = 'about-print';
  aboutPrint.position.set(1.2, 1.4, 0.095);
  root.add(aboutPrint); parts.set(aboutPrint.name, aboutPrint);

  const portraitCard = makePaperPanel(2.16, 3.32, 0.085, '#FFF7F4', makePortraitTexture());
  portraitCard.name = 'portrait-card';
  portraitCard.position.set(-3.02, 0.25, 0.29);
  portraitCard.rotation.z = 0.055;
  root.add(portraitCard); parts.set(portraitCard.name, portraitCard);

  const abilities = new THREE.Group();
  abilities.name = 'abilities-cards';
  abilities.position.set(0.57, -0.03, 0.2);
  const abilityData = [
    ['ILLUSTRATION', '#B7D864', '✎'], ['GRAPHIC DESIGN', '#F5C657', '▣'], ['PHOTOGRAPHY', '#72C9D7', '◉'],
  ];
  abilityData.forEach(([label, color, glyph], index) => {
    const card = makeAbilityCard(label!, color!, glyph!);
    card.name = `ability-card-${index}`;
    card.position.set((index - 1) * 0.83, 0, index * 0.018);
    card.rotation.z = (index - 1) * 0.055;
    abilities.add(card);
    parts.set(card.name, card);
  });
  root.add(abilities); parts.set(abilities.name, abilities);

  const softwarePanel = makePaperPanel(1.44, 2.38, 0.02, '#FFFFFF', makeSoftwareTexture());
  softwarePanel.name = 'software-panel';
  softwarePanel.position.set(-1.95, -1.23, 0.105);
  root.add(softwarePanel); parts.set(softwarePanel.name, softwarePanel);

  const experiencePanel = makePaperPanel(4.08, 2.32, 0.02, '#FFFFFF', makeExperienceTexture());
  experiencePanel.name = 'experience-panel';
  experiencePanel.position.set(0.75, -1.28, 0.104);
  root.add(experiencePanel); parts.set(experiencePanel.name, experiencePanel);

  const contactPanel = makePaperPanel(2.18, 1.76, 0.022, '#FFFFFF', makeContactTexture(category));
  contactPanel.name = 'contact-panel';
  contactPanel.position.set(2.91, -0.46, 0.132);
  root.add(contactPanel); parts.set(contactPanel.name, contactPanel);

  const brownClip = createPaperclip('#5D3A37', 0.74, 0.035, 0.62);
  brownClip.name = 'brown-paperclip';
  brownClip.position.set(-2.45, 2.38, 0.48);
  brownClip.rotation.z = 0.035;
  root.add(brownClip); parts.set(brownClip.name, brownClip);

  const redClip = createPaperclip('#F03759', 0.86, 0.035, 0.62);
  redClip.name = 'red-paperclip';
  redClip.position.set(3.25, 2.43, 0.35);
  redClip.rotation.z = -0.035;
  root.add(redClip); parts.set(redClip.name, redClip);

  const websiteButton = makeTextPanel(1.86, 0.55, 0.065, {
    title: '↗  WEBSITE / COMING SOON', background: '#F7F4EA', foreground: '#202126', align: 'center', width: 900, height: 260,
  });
  websiteButton.name = 'website-button';
  websiteButton.userData.action = 'visit-website';
  websiteButton.position.set(-3.35, -2.44, 0.44);
  root.add(websiteButton); parts.set(websiteButton.name, websiteButton); targets.push(websiteButton);

  const controls = new THREE.Group();
  controls.name = 'corner-controls';
  controls.position.set(3.77, -2.44, 0.43);
  const expand = makeTag('展开', '#EFFF69', 'none');
  expand.name = 'expand-control';
  expand.scale.setScalar(0.52);
  expand.position.x = -0.52;
  controls.add(expand); parts.set(expand.name, expand);
  const closeTag = makeTag('关闭', '#F7A8FF', 'close-detail');
  closeTag.name = 'close-tag';
  closeTag.scale.setScalar(0.52);
  closeTag.position.x = 0.34;
  controls.add(closeTag); parts.set(closeTag.name, closeTag); targets.push(closeTag);
  root.add(controls); parts.set(controls.name, controls);

  const finalTransforms = new Map<THREE.Object3D, { y: number; z: number; rotationZ: number }>();
  for (const part of [mainBoard, tabBack, aboutPrint, portraitCard, abilities, softwarePanel, experiencePanel, contactPanel, brownClip, redClip, websiteButton, controls]) {
    finalTransforms.set(part, { y: part.position.y, z: part.position.z, rotationZ: part.rotation.z });
  }

  let hovered = false;
  const handle = createHandle(root, parts, targets, {
    setHovered: (value) => { hovered = value; },
    setProject: () => { root.userData.projectIndex = 0; },
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      finalTransforms.forEach((final, part) => {
        part.position.y = final.y - (part === portraitCard ? 0.72 : 0.28);
        part.position.z = final.z - 0.52;
      });
      portraitCard.rotation.z = -0.08;
      abilities.scale.setScalar(0.8);
      timeline
        .to(mainBoard.position, { y: finalTransforms.get(mainBoard)!.y, z: finalTransforms.get(mainBoard)!.z, duration: 0.5 }, 0)
        .to(tabBack.position, { y: finalTransforms.get(tabBack)!.y, z: finalTransforms.get(tabBack)!.z, duration: 0.48 }, 0.08)
        .to(aboutPrint.position, { y: finalTransforms.get(aboutPrint)!.y, z: finalTransforms.get(aboutPrint)!.z, duration: 0.5 }, 0.12)
        .to(portraitCard.position, { y: finalTransforms.get(portraitCard)!.y, z: finalTransforms.get(portraitCard)!.z, duration: 0.62 }, 0.18)
        .to(portraitCard.rotation, { z: finalTransforms.get(portraitCard)!.rotationZ, duration: 0.62 }, 0.18)
        .to(abilities.position, { y: finalTransforms.get(abilities)!.y, z: finalTransforms.get(abilities)!.z, duration: 0.52 }, 0.24)
        .to(abilities.scale, { x: 1, y: 1, z: 1, duration: 0.5 }, 0.24)
        .to(softwarePanel.position, { y: finalTransforms.get(softwarePanel)!.y, z: finalTransforms.get(softwarePanel)!.z, duration: 0.55 }, 0.28)
        .to(experiencePanel.position, { y: finalTransforms.get(experiencePanel)!.y, z: finalTransforms.get(experiencePanel)!.z, duration: 0.55 }, 0.32)
        .to(contactPanel.position, { y: finalTransforms.get(contactPanel)!.y, z: finalTransforms.get(contactPanel)!.z, duration: 0.55 }, 0.36)
        .to(brownClip.position, { y: finalTransforms.get(brownClip)!.y, z: finalTransforms.get(brownClip)!.z, duration: 0.46 }, 0.34)
        .to(redClip.position, { y: finalTransforms.get(redClip)!.y, z: finalTransforms.get(redClip)!.z, duration: 0.46 }, 0.375)
        .to(websiteButton.position, { y: finalTransforms.get(websiteButton)!.y, z: finalTransforms.get(websiteButton)!.z, duration: 0.46 }, 0.41)
        .to(controls.position, { y: finalTransforms.get(controls)!.y, z: finalTransforms.get(controls)!.z, duration: 0.46 }, 0.445);
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      timeline.to(root.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.42 }, 0);
    }),
  }, (delta, elapsed) => {
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    const still = root.userData.reducedMotion === true;
    const hoverAmount = hovered && !still ? 1 : 0;
    const drift = still ? 0 : 1;
    const portraitFinal = finalTransforms.get(portraitCard)!;
    const abilitiesFinal = finalTransforms.get(abilities)!;
    portraitCard.position.z = damp(portraitCard.position.z, portraitFinal.z + hoverAmount * 0.1, 8, delta);
    portraitCard.rotation.z = damp(portraitCard.rotation.z, portraitFinal.rotationZ + hoverAmount * pointer.x * 0.025, 8, delta);
    abilities.position.z = damp(abilities.position.z, abilitiesFinal.z + hoverAmount * 0.07, 8, delta);
    brownClip.rotation.y = damp(brownClip.rotation.y, hoverAmount * 0.08 + Math.sin(elapsed * 1.6) * 0.01 * drift, 6, delta);
    redClip.rotation.y = damp(redClip.rotation.y, hoverAmount * -0.08 + Math.sin(elapsed * 1.4) * 0.01 * drift, 6, delta);
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => { timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
