import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Category } from '../content/types';
import { aboutProfile } from '../content/profile';
import { createTimelineController } from '../animation/timelines';
import { makeTag, makeTextPanel, roundedRectShape, makeExtrudedMesh, updateTextPanel } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { configureTextTexture } from '../three/textures';

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
  return configureTextTexture(texture);
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

function drawPill(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  background: string,
  foreground = '#26242A',
  fontSize = 30,
): void {
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(x, y, width, height, height / 2);
  context.fill();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawHandText(context, label, x + width / 2, y + height / 2 + 1, fontSize, 750, foreground);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
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
    drawHandText(context, `你好，我是${aboutProfile.name.zh}`, 30, 188, 58, 800);
    drawHandText(context, aboutProfile.name.en.toUpperCase(), 30, 266, 70, 800, '#FF4E68');
    drawHandText(context, '个人介绍  /  PERSONAL PROFILE', 32, 340, 35, 650, '#4C4950');
    drawPill(context, 'ESTJ', 32, 384, 174, 70, '#F5C657', '#30313A', 31);
    drawPill(context, '超级大E人', 226, 384, 252, 70, '#9ED8E5', '#30313A', 30);
    drawPill(context, '调解大师', 498, 384, 226, 70, '#B7D864', '#30313A', 30);
    context.strokeStyle = '#FF4E68';
    context.lineWidth = 5;
    context.beginPath(); context.ellipse(297, 169, 270, 42, -0.02, 0, Math.PI * 2); context.stroke();
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
  configureTextTexture(texture);
  const paint = (image: HTMLImageElement): void => {
    context.fillStyle = '#FFD9E3';
    context.fillRect(0, 0, width, height);
    const imageHeight = height - 112;
    const ratio = Math.min(width / image.naturalWidth, imageHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    context.drawImage(image, (width - drawWidth) / 2, (imageHeight - drawHeight) / 2, drawWidth, drawHeight);
    context.fillStyle = '#FFFDF8';
    context.fillRect(0, height - 112, width, 112);
    drawHandText(context, `NAME: ${aboutProfile.name.zh} / ${aboutProfile.name.en.toUpperCase()}`, 30, height - 61, 27, 800);
    drawHandText(context, `WECHAT / TEL: ${aboutProfile.contact}`, 30, height - 20, 24, 650);
    texture.needsUpdate = true;
  };
  const image = new Image();
  image.onload = () => paint(image);
  image.src = aboutProfile.portraitSrc;
  return texture;
}

function makeSoftwareTexture(): THREE.Texture {
  return createCanvasTexture(520, 760, '#FFFFFF', (context, width) => {
    context.textAlign = 'center';
    drawHandText(context, 'TOOL BOX', width / 2, 72, 51, 800);
    drawHandText(context, '技能', width / 2, 123, 31, 700, '#FF506B');
    const colors = ['#DDE8FF', '#F8D3DE', '#E1EDB8', '#F9E4A4'];
    aboutProfile.skills.forEach((label, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const singleLastItem = index === aboutProfile.skills.length - 1;
      const pillWidth = singleLastItem ? 226 : 202;
      const x = singleLastItem ? (width - pillWidth) / 2 : 48 + column * 222;
      drawPill(context, label, x, 160 + row * 91, pillWidth, 62, colors[index % colors.length]!, '#26242A', 27);
    });
    context.textAlign = 'left';
  });
}

function makePersonalityTexture(): THREE.Texture {
  return createCanvasTexture(1050, 690, '#FFFFFF', (context) => {
    drawHandText(context, 'PERSONAL TAGS', 30, 76, 60, 800);
    drawHandText(context, '我的关键词', 32, 125, 30, 700, '#FF506B');
    const layouts = [
      [30, 170, 330], [380, 170, 235], [635, 170, 160],
      [30, 270, 280], [330, 270, 410],
      [30, 370, 250], [300, 370, 280],
    ] as const;
    const colors = ['#F8D3DE', '#F9E4A4', '#DDE8FF', '#E1EDB8', '#CDEBF0', '#F2D8F5', '#FFD9C4'];
    aboutProfile.tags.forEach((label, index) => {
      const [x, y, pillWidth] = layouts[index]!;
      drawPill(context, label, x, y, pillWidth, 72, colors[index]!, '#29272D', label.length > 8 ? 28 : 31);
    });
    drawHandText(context, '# 热情  # 爱好  # 沟通  # 行动派', 34, 535, 31, 700, '#5E5A62');
    context.strokeStyle = '#FF506B'; context.lineWidth = 5;
    context.beginPath(); context.moveTo(32, 575); context.lineTo(975, 575); context.stroke();
    drawHandText(context, 'GINNY', 35, 640, 48, 800, '#FF506B');
  });
}

function makeContactTexture(): THREE.Texture {
  return createCanvasTexture(740, 610, '#FFFFFF', (context) => {
    drawHandText(context, 'CONTACT ME', 35, 85, 67, 800);
    drawHandText(context, '✦', 620, 84, 38, 800, '#FF506B');
    drawHandText(context, '微信 / 电话', 38, 178, 40, 750, '#454249');
    drawHandText(context, aboutProfile.contact, 38, 260, 55, 800, '#FF506B');
    drawPill(context, 'WECHAT', 38, 320, 230, 68, '#DDE8FF', '#2E3442', 30);
    drawPill(context, 'MOBILE', 286, 320, 230, 68, '#E1EDB8', '#2E3442', 30);
    context.strokeStyle = '#FF506B'; context.lineWidth = 5;
    context.beginPath(); context.moveTo(38, 426); context.lineTo(665, 426); context.stroke();
    drawHandText(context, `${aboutProfile.name.zh}  /  ${aboutProfile.name.en.toUpperCase()}`, 38, 505, 36, 800);
    drawHandText(context, 'KEEP IN TOUCH', 38, 555, 26, 650, '#8A858D');
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

function makeExpandHint(): THREE.Mesh {
  const texture = createCanvasTexture(420, 300, 'rgba(255,255,255,0)', (context) => {
    context.strokeStyle = '#FF506B';
    context.lineWidth = 10;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(46, 52);
    context.bezierCurveTo(172, 34, 310, 76, 286, 214);
    context.stroke();
    context.beginPath();
    context.moveTo(286, 214);
    context.lineTo(238, 171);
    context.moveTo(286, 214);
    context.lineTo(307, 151);
    context.stroke();
    context.fillStyle = '#FF506B';
    context.beginPath(); context.arc(42, 53, 9, 0, Math.PI * 2); context.fill();
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.68),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.userData.hintStyle = 'hand-drawn-arrow';
  return mesh;
}

export function createAboutCvModel(category: Category, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = `about-cv-${category.id}`;
  root.userData.open = false;
  root.userData.projectIndex = 0;
  root.userData.expanded = false;
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

  const portraitCard = makePaperPanel(2.44, 3.11, 0.085, '#FFF7F4', makePortraitTexture());
  portraitCard.name = 'portrait-card';
  portraitCard.position.set(-3.02, 1.12, 0.29);
  portraitCard.rotation.z = 0.055;
  portraitCard.userData.action = 'about-hover';
  portraitCard.userData.imageFit = 'contain';
  root.add(portraitCard); parts.set(portraitCard.name, portraitCard); targets.push(portraitCard);

  const abilities = new THREE.Group();
  abilities.name = 'abilities-cards';
  abilities.position.set(0.57, 0.58, 0.2);
  const abilityData = [
    ['ESTJ', '#B7D864', 'E'], ['超级大E人', '#F5C657', '!'], ['调解大师', '#72C9D7', '✓'],
  ];
  abilityData.forEach(([label, color, glyph], index) => {
    const card = makeAbilityCard(label!, color!, glyph!);
    card.name = `ability-card-${index}`;
    card.userData.action = 'about-hover';
    card.position.set((index - 1) * 0.83, 0, index * 0.018);
    card.rotation.z = (index - 1) * 0.055;
    abilities.add(card);
    parts.set(card.name, card);
    targets.push(card);
  });
  root.add(abilities); parts.set(abilities.name, abilities);

  const softwarePanel = makePaperPanel(1.44, 2.38, 0.02, '#FFFFFF', makeSoftwareTexture());
  softwarePanel.name = 'software-panel';
  softwarePanel.userData.action = 'about-hover';
  softwarePanel.position.set(-2.62, -1.78, 0.105);
  root.add(softwarePanel); parts.set(softwarePanel.name, softwarePanel); targets.push(softwarePanel);

  const personalityPanel = makePaperPanel(4.08, 2.32, 0.02, '#FFFFFF', makePersonalityTexture());
  personalityPanel.name = 'personality-panel';
  personalityPanel.userData.action = 'about-hover';
  personalityPanel.position.set(0.75, -1.28, 0.104);
  root.add(personalityPanel); parts.set(personalityPanel.name, personalityPanel); targets.push(personalityPanel);

  const contactPanel = makePaperPanel(2.18, 1.76, 0.022, '#FFFFFF', makeContactTexture());
  contactPanel.name = 'contact-panel';
  contactPanel.userData.action = 'about-hover';
  contactPanel.position.set(2.91, -0.46, 0.132);
  root.add(contactPanel); parts.set(contactPanel.name, contactPanel); targets.push(contactPanel);

  const profileStrip = makeTextPanel(1.86, 0.55, 0.065, {
    title: '个人介绍 / GINNY', background: '#F7F4EA', foreground: '#202126', align: 'center', width: 900, height: 260,
  });
  profileStrip.name = 'profile-strip';
  profileStrip.position.set(-3.35, -2.44, 0.44);
  root.add(profileStrip); parts.set(profileStrip.name, profileStrip);

  const controls = new THREE.Group();
  controls.name = 'corner-controls';
  controls.position.set(3.77, -2.44, 0.43);
  const expand = makeTag('展开', '#EFFF69', 'toggle-about-expanded');
  expand.name = 'expand-control';
  expand.userData.label = '展开';
  expand.scale.setScalar(0.82);
  expand.position.x = -0.74;
  controls.add(expand); parts.set(expand.name, expand); targets.push(expand);
  const closeTag = makeTag('关闭', '#F7A8FF', 'close-detail');
  closeTag.name = 'close-tag';
  closeTag.userData.label = '关闭';
  closeTag.scale.setScalar(0.82);
  closeTag.position.x = 0.66;
  controls.add(closeTag); parts.set(closeTag.name, closeTag); targets.push(closeTag);
  root.add(controls); parts.set(controls.name, controls);

  const expandHint = makeExpandHint();
  expandHint.name = 'expand-hint';
  expandHint.position.set(-1.13, 0.52, 0.03);
  controls.add(expandHint); parts.set(expandHint.name, expandHint);

  const finalTransforms = new Map<THREE.Object3D, { y: number; z: number; rotationZ: number }>();
  for (const part of [mainBoard, tabBack, aboutPrint, portraitCard, abilities, softwarePanel, personalityPanel, contactPanel, profileStrip, controls]) {
    finalTransforms.set(part, { y: part.position.y, z: part.position.z, rotationZ: part.rotation.z });
  }

  const layoutParts = [tabBack, aboutPrint, portraitCard, abilities, softwarePanel, personalityPanel, contactPanel, profileStrip, controls];
  const compactLayout = new Map(layoutParts.map((part) => [part, {
    position: part.position.clone(),
    scale: part.scale.clone(),
  }]));
  const expandedLayout = new Map<THREE.Object3D, { position: THREE.Vector3; scale: number }>([
    [tabBack, { position: new THREE.Vector3(-3.55, 2.65, -0.18), scale: 0.8 }],
    [aboutPrint, { position: new THREE.Vector3(0, 2.15, 0.12), scale: 1 }],
    [portraitCard, { position: new THREE.Vector3(-3.12, -0.22, 0.3), scale: 0.9 }],
    [softwarePanel, { position: new THREE.Vector3(-1.15, 0.1, 0.2), scale: 0.9 }],
    [abilities, { position: new THREE.Vector3(1.05, 0.65, 0.25), scale: 0.9 }],
    [contactPanel, { position: new THREE.Vector3(3.25, 0.1, 0.22), scale: 0.9 }],
    [personalityPanel, { position: new THREE.Vector3(1.35, -1.72, 0.2), scale: 0.85 }],
    [profileStrip, { position: new THREE.Vector3(-3.35, -2.75, 0.26), scale: 1 }],
    [controls, { position: new THREE.Vector3(3.48, -3.42, 0.3), scale: 0.75 }],
  ]);

  const setExpandLabel = (label: '展开' | '收起'): void => {
    expand.userData.label = label;
    updateTextPanel(expand, {
      title: label,
      background: '#EFFF69',
      foreground: '#172033',
      align: 'center',
      width: 700,
      height: 240,
      titleScale: 0.28,
    });
  };

  let hovered = false;
  let hoveredTarget: THREE.Object3D | null = null;
  root.userData.layoutTransitioning = false;
  let hintTween: gsap.core.Timeline | null = null;
  const showExpandHint = (visible: boolean) => {
    hintTween?.kill();
    expandHint.visible = true;
    const targetScale = visible ? 1 : 0.01;
    const targetY = visible ? 0.52 : 0.45;
    if (root.userData.reducedMotion === true) {
      expandHint.scale.setScalar(targetScale);
      expandHint.position.y = targetY;
      expandHint.rotation.z = 0;
      expandHint.visible = visible;
      return;
    }
    hintTween = gsap.timeline({ onComplete: () => { expandHint.visible = visible; } })
      .to(expandHint.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.2, ease: 'power2.out' }, 0)
      .to(expandHint.position, { y: targetY, duration: 0.2, ease: 'power2.out' }, 0)
      .to(expandHint.rotation, { z: 0, duration: 0.2, ease: 'power2.out' }, 0);
  };
  const startHintPulse = () => {
    hintTween?.kill();
    if (root.userData.reducedMotion === true || root.userData.expanded === true) return;
    expandHint.visible = true;
    expandHint.scale.setScalar(1);
    expandHint.position.y = 0.52;
    expandHint.rotation.z = 0;
    hintTween = gsap.timeline({ repeat: -1, repeatDelay: 1.8 })
      .to(expandHint.position, { y: 0.47, duration: 0.38, ease: 'sine.out' }, 0)
      .to(expandHint.rotation, { z: 0.035, duration: 0.38, ease: 'sine.out' }, 0)
      .to(expandHint.position, { y: 0.52, duration: 0.38, ease: 'sine.in' })
      .to(expandHint.rotation, { z: 0, duration: 0.38, ease: 'sine.in' }, '<');
  };
  const hoverParts = [portraitCard, softwarePanel, ...abilities.children, personalityPanel, contactPanel];
  const hoverBase = new Map(hoverParts.map((part) => [part, {
    z: part.position.z,
    scale: part.scale.clone(),
  }]));
  const handle = createHandle(root, parts, targets, {
    setHovered: (value) => { hovered = value; },
    setHoveredTarget: (target) => { hoveredTarget = target; },
    setReducedMotion: (reduced) => {
      root.userData.reducedMotion = reduced;
      if (reduced) showExpandHint(root.userData.expanded !== true);
      else startHintPulse();
    },
    setProject: () => { root.userData.projectIndex = 0; },
    toggleExpanded: () => {
      const expanded = root.userData.expanded !== true;
      root.userData.expanded = expanded;
      root.userData.layoutTransitioning = true;
      setExpandLabel(expanded ? '收起' : '展开');
      showExpandHint(!expanded);
      return timelines.run((timeline) => {
        for (const part of layoutParts) {
          const compact = compactLayout.get(part)!;
          const readable = expandedLayout.get(part)!;
          const destination = expanded ? readable : compact;
          timeline.to(part.position, {
            x: destination.position.x,
            y: destination.position.y,
            z: destination.position.z,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0);
          timeline.to(part.scale, {
            x: destination.scale instanceof THREE.Vector3 ? destination.scale.x : destination.scale,
            y: destination.scale instanceof THREE.Vector3 ? destination.scale.y : destination.scale,
            z: destination.scale instanceof THREE.Vector3 ? destination.scale.z : destination.scale,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0);
        }
        timeline.call(() => {
          root.userData.layoutTransitioning = false;
          if (!expanded) startHintPulse();
        });
      });
    },
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      startHintPulse();
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
        .to(personalityPanel.position, { y: finalTransforms.get(personalityPanel)!.y, z: finalTransforms.get(personalityPanel)!.z, duration: 0.55 }, 0.32)
        .to(contactPanel.position, { y: finalTransforms.get(contactPanel)!.y, z: finalTransforms.get(contactPanel)!.z, duration: 0.55 }, 0.36)
        .to(profileStrip.position, { y: finalTransforms.get(profileStrip)!.y, z: finalTransforms.get(profileStrip)!.z, duration: 0.46 }, 0.41)
        .to(controls.position, { y: finalTransforms.get(controls)!.y, z: finalTransforms.get(controls)!.z, duration: 0.46 }, 0.445);
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      timeline.to(root.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.42 }, 0);
    }),
  }, (delta, elapsed) => {
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    const still = root.userData.reducedMotion === true;
    const activeTarget = hovered && !still && root.userData.layoutTransitioning !== true ? hoveredTarget : null;
    for (const part of hoverParts) {
      const base = hoverBase.get(part)!;
      const topLevelExpanded = root.userData.expanded === true ? expandedLayout.get(part) : undefined;
      const restZ = topLevelExpanded?.position.z ?? base.z;
      const restScale = topLevelExpanded?.scale ?? base.scale.x;
      const amount = part === activeTarget ? 1 : 0;
      part.position.z = damp(part.position.z, restZ + amount * 0.13, 9, delta);
      const scale = damp(part.scale.x, restScale * (1 + amount * 0.035), 9, delta);
      part.scale.setScalar(scale);
    }
    const portraitFinal = finalTransforms.get(portraitCard)!;
    portraitCard.rotation.z = damp(
      portraitCard.rotation.z,
      portraitFinal.rotationZ + (activeTarget === portraitCard ? pointer.x * 0.025 : 0),
      8,
      delta,
    );
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => { hintTween?.kill(); timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
