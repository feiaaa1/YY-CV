import * as THREE from 'three';
import type { Category, ScrapbookPage } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTextPanel, roundedRectShape, updateTextPanel } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';

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

function makeCanvasTexture(width: number, height: number, background: string, paint: CanvasPainter): THREE.Texture {
  if (typeof document === 'undefined') return fallbackTexture(background);
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

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = '#303039',
  weight = 700,
  align: CanvasTextAlign = 'left',
): void {
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.font = `${weight} ${size}px "Arial Rounded MT Bold", "PingFang SC", sans-serif`;
  context.fillText(text, x, y);
}

function drawPaperPattern(context: CanvasRenderingContext2D, width: number, height: number, page: ScrapbookPage, side: 'left' | 'right'): void {
  context.strokeStyle = side === 'left' ? 'rgba(116,135,158,.22)' : 'rgba(169,115,112,.2)';
  context.lineWidth = 3;
  if (side === 'left') {
    for (let y = 78; y < height; y += 74) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
  } else {
    for (let x = 70; x < width; x += 82) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
    }
    for (let y = 58; y < height; y += 82) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
  }
  context.fillStyle = 'rgba(90,74,58,.035)';
  for (let index = 0; index < 480; index += 1) {
    context.fillRect((index * 79) % width, (index * 43) % height, 2, 1);
  }
  context.fillStyle = page.palette[1];
  context.globalAlpha = 0.18;
  context.beginPath();
  context.arc(side === 'left' ? width * 0.12 : width * 0.84, height * 0.84, width * 0.22, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function makeSpreadTexture(page: ScrapbookPage, side: 'left' | 'right'): THREE.Texture {
  const background = side === 'left' ? '#F1EFE5' : '#E8E3CF';
  return makeCanvasTexture(1200, 1420, background, (context, width, height) => {
    drawPaperPattern(context, width, height, page, side);
    if (side === 'left') {
      drawText(context, page.kicker, 76, 132, 44, '#696A73', 750);
      const titleWords = page.title.en.toUpperCase().split(' ');
      titleWords.forEach((word, index) => {
        context.lineWidth = 11;
        context.strokeStyle = index % 2 === 0 ? page.palette[2] : page.palette[1];
        context.fillStyle = '#C9D8EE';
        context.font = '900 150px "Arial Rounded MT Bold", sans-serif';
        context.strokeText(word, 84, 330 + index * 170);
        context.fillText(word, 84, 330 + index * 170);
      });
      context.fillStyle = page.palette[1];
      context.globalAlpha = 0.32;
      context.beginPath(); context.roundRect(72, 780, 640, 175, 46); context.fill();
      context.globalAlpha = 1;
      drawText(context, page.title.zh, 118, 850, 54, '#42434A', 800);
      drawText(context, page.subtitle.zh, 118, 920, 30, '#51525B', 540);
      drawText(context, page.subtitle.en, 86, 1110, 29, '#575661', 540);
      drawText(context, `PAGE ${page.id.toUpperCase()}`, 86, 1330, 25, '#7D7880', 650);
      context.strokeStyle = '#EF7190'; context.lineWidth = 8;
      context.beginPath(); context.moveTo(90, 1005); context.bezierCurveTo(180, 940, 270, 1080, 360, 1004); context.stroke();
    } else {
      drawText(context, 'NOTE', 90, 160, 94, '#7B8290', 900);
      drawText(context, page.kicker.toLowerCase(), 90, 250, 50, page.palette[2], 700);
      const bullets = page.motif === 'intro'
        ? ['visual stories', 'playful systems', 'digital craft', 'soft colors']
        : page.motif === 'mobile'
          ? ['user journeys', 'map discovery', 'mobile components', 'prototype tests']
          : page.motif === 'editorial'
            ? ['modular grid', 'reading rhythm', 'responsive type', 'content archive']
            : page.motif === 'process'
              ? ['research', 'wireframes', 'design tokens', 'usability checks']
              : ['say hello', 'new projects', 'collaboration', 'thank you'];
      bullets.forEach((bullet, index) => {
        drawText(context, `${index + 1}. ${bullet}`, 100, 390 + index * 92, 42, '#414148', 620);
        context.strokeStyle = index % 2 ? page.palette[2] : page.palette[1];
        context.lineWidth = 5;
        context.beginPath(); context.moveTo(92, 410 + index * 92); context.lineTo(560, 410 + index * 92); context.stroke();
      });
      context.save();
      context.translate(900, 720);
      context.rotate(-0.08);
      ['S', 'O', 'C', 'I', 'A', 'L', 'S'].forEach((letter, index) => {
        context.fillStyle = [page.palette[1], page.palette[2], '#E9CB74'][index % 3]!;
        context.fillRect((index % 2) * 118, index * 82, 100, 72);
        drawText(context, letter, 50 + (index % 2) * 118, 57 + index * 82, 56, '#3A3C52', 900, 'center');
      });
      context.restore();
      context.fillStyle = page.palette[1]; context.globalAlpha = 0.38;
      context.beginPath(); context.roundRect(112, 890, 530, 330, 34); context.fill();
      context.globalAlpha = 1;
      drawText(context, page.title.en, 150, 1005, 49, '#464650', 800);
      drawText(context, 'selected notes / process / outcome', 150, 1082, 28, '#55545E', 560);
      drawText(context, '2026 · UI / WEB', 150, 1160, 29, '#65616A', 700);
    }
  });
}

function makePatternTexture(index: number): THREE.Texture {
  const palettes = [
    ['#F6F3E9', '#91B7D9', '#E8A4B7'], ['#F3E7DD', '#D94E62', '#79A66B'],
    ['#E5F2F2', '#79C5D5', '#F6BDD0'], ['#F2EFE7', '#55555E', '#D9C6A4'],
  ];
  const palette = palettes[index]!;
  return makeCanvasTexture(700, 1100, palette[0]!, (context, width, height) => {
    if (index === 1) {
      for (let y = 0; y < height; y += 115) {
        for (let x = 0; x < width; x += 115) {
          context.fillStyle = (x / 115 + y / 115) % 2 ? palette[1]! : palette[2]!;
          context.beginPath(); context.arc(x + 55, y + 55, 34, 0, Math.PI * 2); context.fill();
        }
      }
    } else {
      context.strokeStyle = palette[1]!; context.lineWidth = index === 3 ? 2 : 7;
      for (let x = 0; x < width; x += index === 2 ? 90 : 58) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
      }
      for (let y = 0; y < height; y += index === 2 ? 90 : 58) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
      }
    }
    drawText(context, `${index + 1}`, 80, height - 90, 54, palette[2]!, 800);
  });
}

function createRoundedPage(
  name: string,
  width: number,
  height: number,
  texture: THREE.Texture,
  edgeColor = '#DDD8CA',
): THREE.Group {
  const page = new THREE.Group();
  page.name = name;
  const body = makeExtrudedMesh(roundedRectShape(width, height, 0.18), edgeColor, 0.075, 0.025);
  body.name = `${name}-body`;
  body.position.z = -0.04;
  page.add(body);
  const printGeometry = new THREE.ShapeGeometry(roundedRectShape(width - 0.045, height - 0.045, 0.16));
  const print = new THREE.Mesh(printGeometry, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  print.name = `${name}-print`;
  print.position.z = 0.055;
  print.receiveShadow = true;
  page.add(print);
  page.userData.printMesh = print;
  return page;
}

function updatePageTexture(page: THREE.Group, texture: THREE.Texture): void {
  const print = page.userData.printMesh as THREE.Mesh | undefined;
  if (!print) return;
  const material = print.material as THREE.MeshBasicMaterial;
  material.map?.dispose();
  material.map = texture;
  material.needsUpdate = true;
}

function createTurningPage(frontTexture: THREE.Texture, backTexture: THREE.Texture): THREE.Group {
  const page = new THREE.Group();
  page.name = 'turning-page';
  const body = makeExtrudedMesh(roundedRectShape(4.25, 5.18, 0.18), '#DCD7C9', 0.075, 0.025);
  body.position.z = -0.04;
  page.add(body);
  const shape = roundedRectShape(4.205, 5.135, 0.16);
  const front = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ map: frontTexture, toneMapped: false }),
  );
  front.name = 'turning-page-front';
  front.position.z = 0.055;
  page.add(front);
  const back = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ map: backTexture, toneMapped: false }),
  );
  back.name = 'turning-page-back';
  back.position.z = -0.065;
  back.rotation.y = Math.PI;
  page.add(back);
  page.userData.frontPrint = front;
  page.userData.backPrint = back;
  return page;
}

function updateTurningTextures(page: THREE.Group, frontTexture: THREE.Texture, backTexture: THREE.Texture): void {
  const front = page.userData.frontPrint as THREE.Mesh;
  const back = page.userData.backPrint as THREE.Mesh;
  const frontMaterial = front.material as THREE.MeshBasicMaterial;
  const backMaterial = back.material as THREE.MeshBasicMaterial;
  frontMaterial.map?.dispose();
  backMaterial.map?.dispose();
  frontMaterial.map = frontTexture;
  backMaterial.map = backTexture;
  frontMaterial.needsUpdate = true;
  backMaterial.needsUpdate = true;
}

function makeRoundControl(id: string, label: string, action: string): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  group.userData.action = action;
  const text = makeTextPanel(0.72, 0.58, 0.02, {
    title: label, background: '#FFFDF6', foreground: '#11131C', align: 'center', transparentBackground: true,
    titleScale: 0.27, width: 520, height: 420,
  });
  text.name = `${id}-label`;
  text.position.z = 0.075;
  group.add(text);
  return group;
}

export function createScrapbookModel(category: Category, reducedMotion = false): SculptModelHandle {
  const pages = category.scrapbookPages ?? [];
  if (pages.length !== 5) throw new Error(`Scrapbook category ${category.id} requires exactly five pages.`);

  const root = new THREE.Group();
  root.name = `scrapbook-${category.id}`;
  root.userData.projectIndex = 0;
  root.userData.open = false;
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];
  const inactiveLeaves: THREE.Group[] = [];
  const inactiveLeafBaseX: number[] = [];
  const restingOpenAngle = 0.16;

  const backing = makeExtrudedMesh(roundedRectShape(9.15, 6.35, 0.32), '#414D6A', 0.08, 0.04);
  backing.name = 'scrapbook-backing';
  backing.position.z = -0.62;
  root.add(backing); parts.set(backing.name, backing);

  for (let index = 0; index < 4; index += 1) {
    const leaf = createRoundedPage(`inactive-page-${index}`, 4.25, 5.08, makePatternTexture(index));
    leaf.position.set(-2.35 - index * 0.39, -0.05 + index * 0.035, -0.42 + index * 0.075);
    leaf.rotation.z = (index - 1.5) * 0.012;
    root.add(leaf);
    inactiveLeaves.push(leaf);
    inactiveLeafBaseX.push(leaf.position.x);
    parts.set(leaf.name, leaf);
  }

  const leftPivot = new THREE.Group();
  leftPivot.name = 'left-page-pivot';
  leftPivot.position.set(0, 0, -0.04);
  const rightPivot = new THREE.Group();
  rightPivot.name = 'right-page-pivot';
  rightPivot.position.set(0, 0, 0.02);
  root.add(leftPivot, rightPivot);
  parts.set(leftPivot.name, leftPivot); parts.set(rightPivot.name, rightPivot);

  const leftPage = createRoundedPage('active-left-page', 4.25, 5.18, makeSpreadTexture(pages[0]!, 'left'), '#DCD7C9');
  leftPage.position.x = -2.1;
  leftPage.userData.pageId = pages[0]!.id;
  leftPivot.add(leftPage); parts.set(leftPage.name, leftPage); targets.push(leftPage);

  const rightPage = createRoundedPage('active-right-page', 4.25, 5.18, makeSpreadTexture(pages[0]!, 'right'), '#DCD7C9');
  rightPage.position.x = 2.1;
  rightPage.userData.pageId = pages[0]!.id;
  rightPage.userData.action = 'next-project';
  rightPivot.add(rightPage); parts.set(rightPage.name, rightPage); targets.push(rightPage);

  const turningPivot = new THREE.Group();
  turningPivot.name = 'turning-page-pivot';
  turningPivot.position.z = 0.25;
  const turningPage = createTurningPage(
    makeSpreadTexture(pages[0]!, 'right'),
    makeSpreadTexture(pages[1]!, 'left'),
  );
  turningPage.position.x = 2.1;
  turningPage.visible = false;
  turningPivot.add(turningPage);
  root.add(turningPivot);
  parts.set(turningPivot.name, turningPivot);
  parts.set(turningPage.name, turningPage);

  const centerBinding = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 4.9, 18),
    new THREE.MeshStandardMaterial({ color: '#C9C2B2', roughness: 0.94 }),
  );
  centerBinding.name = 'center-binding';
  centerBinding.position.z = 0.1;
  root.add(centerBinding); parts.set(centerBinding.name, centerBinding);

  const leftCollage = new THREE.Group();
  leftCollage.name = 'left-collage';
  leftCollage.position.set(-2.05, 0, 0.18);
  root.add(leftCollage); parts.set(leftCollage.name, leftCollage);
  const leftPhoto = makeTextPanel(1.18, 1.52, 0.065, {
    title: '01', subtitle: 'SELECTED\nSCREEN', kicker: 'PHOTO', background: '#FFF8F0', foreground: '#343641', accent: pages[0]!.palette[2], width: 720, height: 920,
  });
  leftPhoto.name = 'left-photo-card';
  leftPhoto.position.set(-1.02, 0.78, 0);
  leftPhoto.rotation.z = -0.075;
  leftCollage.add(leftPhoto); parts.set(leftPhoto.name, leftPhoto);
  const leftNote = makeTextPanel(1.55, 0.88, 0.05, {
    title: 'MORE INFOS', subtitle: pages[0]!.title.zh, background: pages[0]!.palette[2], foreground: '#40414A', width: 850, height: 500,
  });
  leftNote.name = 'left-note-card';
  leftNote.position.set(0.78, -1.38, 0.02);
  leftNote.rotation.z = 0.03;
  leftCollage.add(leftNote); parts.set(leftNote.name, leftNote);

  const rightCollage = new THREE.Group();
  rightCollage.name = 'right-collage';
  rightCollage.position.set(2.05, 0, 0.18);
  root.add(rightCollage); parts.set(rightCollage.name, rightCollage);
  const rightPhoto = makeTextPanel(1.3, 1.54, 0.065, {
    title: '02', subtitle: 'PROJECT\nDETAIL', kicker: 'PHOTO', background: '#FFF8F0', foreground: '#343641', accent: pages[0]!.palette[1], width: 720, height: 920,
  });
  rightPhoto.name = 'right-photo-card';
  rightPhoto.position.set(1.0, 1.12, 0);
  rightPhoto.rotation.z = 0.09;
  rightCollage.add(rightPhoto); parts.set(rightPhoto.name, rightPhoto);
  const rightSticker = makeTextPanel(1.58, 0.82, 0.045, {
    title: 'SOFT DETAILS', subtitle: pages[0]!.kicker, background: pages[0]!.palette[1], foreground: '#40414A', width: 850, height: 470,
  });
  rightSticker.name = 'right-sticker-card';
  rightSticker.position.set(-0.62, -1.58, 0.03);
  rightSticker.rotation.z = -0.035;
  rightCollage.add(rightSticker); parts.set(rightSticker.name, rightSticker);

  inactiveLeaves.forEach((leaf) => leftPivot.attach(leaf));
  leftPivot.attach(leftCollage);
  rightPivot.attach(rightCollage);

  const pageCounter = makeTextPanel(1.72, 0.46, 0.045, {
    title: '1 / 5 Pages', background: '#414D6A', foreground: '#FFFDF2', align: 'center', width: 900, height: 250,
  });
  pageCounter.name = 'page-counter';
  pageCounter.userData.pageLabel = '1 / 5 Pages';
  pageCounter.position.set(0, 3.18, -0.02);
  root.add(pageCounter); parts.set(pageCounter.name, pageCounter);

  const closeTag = makeRoundControl('close-tag', '关闭', 'close-detail');
  closeTag.position.set(3.15, -2.75, 0.12);
  root.add(closeTag); parts.set(closeTag.name, closeTag); targets.push(closeTag);

  const hoverRig = new THREE.Group();
  hoverRig.name = 'book-hover-rig';
  root.add(hoverRig);
  [backing, leftPivot, rightPivot, turningPivot, centerBinding]
    .forEach((part) => hoverRig.attach(part));
  parts.set(hoverRig.name, hoverRig);

  const applyPage = (index: number): void => {
    const page = pages[index]!;
    root.userData.projectIndex = index;
    leftPage.userData.pageId = page.id;
    rightPage.userData.pageId = page.id;
    updatePageTexture(leftPage, makeSpreadTexture(page, 'left'));
    updatePageTexture(rightPage, makeSpreadTexture(page, 'right'));
    updateTextPanel(leftPhoto, {
      title: `${index + 1}`.padStart(2, '0'), subtitle: `${page.title.en}\nSELECTED SCREEN`, kicker: 'PHOTO',
      background: '#FFF8F0', foreground: '#343641', accent: page.palette[2], width: 720, height: 920,
    });
    updateTextPanel(leftNote, {
      title: page.title.zh, subtitle: page.kicker, background: page.palette[2], foreground: '#40414A', width: 850, height: 500,
    });
    updateTextPanel(rightPhoto, {
      title: `${index + 1}`.padStart(2, '0'), subtitle: `${page.kicker}\nPROJECT DETAIL`, kicker: 'PHOTO',
      background: '#FFF8F0', foreground: '#343641', accent: page.palette[1], width: 720, height: 920,
    });
    updateTextPanel(rightSticker, {
      title: page.title.en, subtitle: page.subtitle.en, background: page.palette[1], foreground: '#40414A', width: 850, height: 470,
    });
    const pageLabel = `${index + 1} / ${pages.length} Pages`;
    pageCounter.userData.pageLabel = pageLabel;
    updateTextPanel(pageCounter, {
      title: pageLabel, background: '#414D6A', foreground: '#FFFDF2', align: 'center', width: 900, height: 250,
    });
    leftPage.userData.action = index > 0 ? 'previous-project' : undefined;
    rightPage.userData.action = index < pages.length - 1 ? 'next-project' : undefined;
  };

  let hovered = false;
  const handle = createHandle(root, parts, targets, {
    setHovered: (value) => { hovered = value; },
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      root.userData.opening = true;
      leftPivot.rotation.y = 1.12;
      rightPivot.rotation.y = -1.12;
      leftCollage.scale.setScalar(0.72);
      rightCollage.scale.setScalar(0.72);
      timeline
        .to(leftPivot.rotation, { y: restingOpenAngle, duration: 0.78 }, 0)
        .to(rightPivot.rotation, { y: -restingOpenAngle, duration: 0.78 }, 0.06)
        .to(leftCollage.scale, { x: 1, y: 1, z: 1, duration: 0.5 }, 0.28)
        .to(rightCollage.scale, { x: 1, y: 1, z: 1, duration: 0.5 }, 0.34)
        .call(() => { root.userData.opening = false; }, [], 0.85);
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      root.userData.opening = false;
      timeline
        .to(leftPivot.rotation, { y: 1.08, duration: 0.52 }, 0)
        .to(rightPivot.rotation, { y: -1.08, duration: 0.52 }, 0)
        .to(root.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.4 }, 0.18);
    }),
    setProject: (requestedIndex) => {
      const nextIndex = THREE.MathUtils.clamp(Math.round(requestedIndex), 0, pages.length - 1);
      const currentIndex = root.userData.projectIndex as number;
      if (nextIndex === currentIndex) {
        applyPage(nextIndex);
        return;
      }
      if (root.userData.turning) return;
      const forward = nextIndex > currentIndex;
      const currentPage = pages[currentIndex]!;
      const nextPage = pages[nextIndex]!;
      root.userData.turning = true;
      turningPivot.rotation.y = forward ? -restingOpenAngle : restingOpenAngle;
      turningPage.rotation.set(0, 0, 0);
      turningPage.position.x = forward ? 2.1 : -2.1;
      updateTurningTextures(
        turningPage,
        makeSpreadTexture(currentPage, forward ? 'right' : 'left'),
        makeSpreadTexture(nextPage, forward ? 'left' : 'right'),
      );
      if (forward) {
        updatePageTexture(rightPage, makeSpreadTexture(nextPage, 'right'));
        rightPage.userData.pageId = nextPage.id;
      } else {
        updatePageTexture(leftPage, makeSpreadTexture(nextPage, 'left'));
        leftPage.userData.pageId = nextPage.id;
      }
      turningPage.visible = true;
      const endAngle = forward ? -Math.PI + restingOpenAngle : Math.PI - restingOpenAngle;
      return timelines.run((timeline) => {
        timeline
          .to([leftCollage.scale, rightCollage.scale], { x: 0.15, y: 0.15, z: 0.15, duration: 0.24 }, 0)
          .to(turningPage.rotation, { z: forward ? -0.025 : 0.025, duration: 0.38, yoyo: true, repeat: 1 }, 0)
          .to(turningPivot.rotation, { y: endAngle, duration: 0.86, ease: 'power2.inOut' }, 0)
          .call(() => {
            applyPage(nextIndex);
            turningPage.visible = false;
            turningPivot.rotation.y = 0;
            turningPage.rotation.set(0, 0, 0);
            root.userData.turning = false;
          }, [], 0.87)
          .to([leftCollage.scale, rightCollage.scale], { x: 1, y: 1, z: 1, duration: 0.28 }, 0.87);
      });
    },
  }, (delta) => {
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    const lift = hovered && !root.userData.turning && root.userData.reducedMotion !== true ? 1 : 0;
    hoverRig.rotation.y = damp(hoverRig.rotation.y, pointer.x * 0.14 * lift, 7, delta);
    hoverRig.rotation.x = damp(hoverRig.rotation.x, -pointer.y * 0.07 * lift, 7, delta);
    hoverRig.rotation.z = damp(hoverRig.rotation.z, pointer.x * 0.012 * lift, 7, delta);
    leftCollage.position.z = damp(leftCollage.position.z, 0.18 + lift * 0.07, 7, delta);
    rightCollage.position.z = damp(rightCollage.position.z, 0.18 + lift * 0.09, 7, delta);
    leftCollage.position.x = damp(leftCollage.position.x, -2.05 - pointer.x * 0.055 * lift, 7, delta);
    rightCollage.position.x = damp(rightCollage.position.x, 2.05 + pointer.x * 0.075 * lift, 7, delta);
    leftCollage.position.y = damp(leftCollage.position.y, pointer.y * 0.045 * lift, 7, delta);
    rightCollage.position.y = damp(rightCollage.position.y, pointer.y * 0.06 * lift, 7, delta);
    leftPivot.rotation.x = damp(leftPivot.rotation.x, lift * pointer.y * 0.018, 7, delta);
    rightPivot.rotation.x = damp(rightPivot.rotation.x, lift * pointer.y * -0.018, 7, delta);
    if (root.userData.open && !root.userData.opening && !root.userData.turning) {
      const hoverOpenAngle = restingOpenAngle + lift * (0.07 + Math.abs(pointer.y) * 0.025);
      leftPivot.rotation.y = damp(leftPivot.rotation.y, hoverOpenAngle, 8, delta);
      rightPivot.rotation.y = damp(rightPivot.rotation.y, -hoverOpenAngle, 8, delta);
    }
    inactiveLeaves.forEach((leaf, index) => {
      leaf.position.x = damp(leaf.position.x, inactiveLeafBaseX[index]! - lift * index * 0.025, 6, delta);
      leaf.position.y = damp(leaf.position.y, -0.05 + index * 0.035 + lift * index * 0.012, 6, delta);
    });
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => { timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
