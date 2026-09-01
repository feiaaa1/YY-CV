import * as THREE from 'three';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTextPanel, roundedRectShape } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';
import { createTextTexture } from '../three/textures';

const BLUE = '#2B8AF0';
const YELLOW = '#F6C94F';
const PALE_YELLOW = '#FFE27A';
const CREAM = '#FFF8EA';
const FOLDER_BOTTOM_Y = -2.2;
const FRONT_REST_TILT = 0.08;
const PAPER_REST_TILT = 0.08;
const BASE_ASSEMBLY_YAW = 0.18;

function rearFolderShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-3.68, 0.18);
  shape.quadraticCurveTo(-3.68, 0, -3.48, 0);
  shape.lineTo(3.48, 0);
  shape.quadraticCurveTo(3.68, 0, 3.68, 0.2);
  shape.lineTo(3.68, 3.96);
  shape.quadraticCurveTo(3.68, 4.2, 3.44, 4.2);
  shape.lineTo(-0.62, 4.2);
  shape.lineTo(-0.82, 4.39);
  shape.quadraticCurveTo(-0.9, 4.55, -1.13, 4.55);
  shape.lineTo(-2.22, 4.55);
  shape.quadraticCurveTo(-2.45, 4.55, -2.52, 4.38);
  shape.lineTo(-2.7, 4.2);
  shape.lineTo(-3.44, 4.2);
  shape.quadraticCurveTo(-3.68, 4.2, -3.68, 3.96);
  shape.closePath();
  return shape;
}

function paperSheetShape(): THREE.Shape {
  const topShift = 0.66;
  const shape = new THREE.Shape();
  shape.moveTo(-3.68, 0.18);
  shape.quadraticCurveTo(-3.68, 0, -3.48, 0);
  shape.lineTo(3.48, 0);
  shape.quadraticCurveTo(3.68, 0, 3.68, 0.2);
  shape.lineTo(3.68 + topShift, 3.71);
  shape.quadraticCurveTo(3.68 + topShift, 3.95, 3.44 + topShift, 3.95);
  shape.lineTo(-3.44 + topShift, 3.95);
  shape.quadraticCurveTo(-3.68 + topShift, 3.95, -3.68 + topShift, 3.73);
  shape.closePath();
  return shape;
}

function frontFlapShape(): THREE.Shape {
  const topShift = 0.82;
  const shape = new THREE.Shape();
  shape.moveTo(-3.68, 0.18);
  shape.quadraticCurveTo(-3.68, 0, -3.48, 0);
  shape.lineTo(3.48, 0);
  shape.quadraticCurveTo(3.68, 0, 3.68, 0.2);
  // Both side edges lean right by the same amount. The panel therefore keeps
  // equal top and bottom widths while preserving the reference's false
  // perspective and the full-width lower hinge.
  shape.lineTo(3.68 + topShift, 3.42);
  shape.quadraticCurveTo(3.68 + topShift, 3.65, 3.44 + topShift, 3.65);
  shape.lineTo(-3.44 + topShift, 3.65);
  shape.quadraticCurveTo(-3.68 + topShift, 3.65, -3.68 + topShift, 3.43);
  shape.closePath();
  return shape;
}

function anchorMeshBottom(mesh: THREE.Mesh): void {
  mesh.geometry.computeBoundingBox();
  mesh.position.y = -(mesh.geometry.boundingBox?.min.y ?? 0);
}

export function createCoverModel(reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = 'reference-cover';
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });

  const folderAssembly = new THREE.Group();
  folderAssembly.name = 'folder-assembly';
  folderAssembly.rotation.y = BASE_ASSEMBLY_YAW;
  root.add(folderAssembly);
  parts.set(folderAssembly.name, folderAssembly);

  const title = makeTextPanel(10.15, 1.6, 0.035, {
    title: 'PORTFOLIO',
    background: BLUE,
    foreground: PALE_YELLOW,
    align: 'center',
    width: 1900,
    height: 330,
    titleScale: 0.66,
    transparentBackground: true,
  });
  title.name = 'portfolio-title';
  title.position.set(0, 3.05, -0.12);
  root.add(title);
  parts.set(title.name, title);

  const yearScript = makeTextPanel(8.5, 0.72, 0.03, {
    title: '2024                              Graphic Design',
    background: BLUE,
    foreground: CREAM,
    align: 'center',
    width: 1800,
    height: 250,
    titleScale: 0.22,
    transparentBackground: true,
  });
  yearScript.name = 'year-script';
  yearScript.position.set(0.15, 2.48, 0.02);
  root.add(yearScript);
  parts.set(yearScript.name, yearScript);

  const folderBack = makeExtrudedMesh(rearFolderShape(), '#E99908', 0.14, 0.045);
  folderBack.name = 'folder-back';
  anchorMeshBottom(folderBack);
  folderBack.position.y += FOLDER_BOTTOM_Y;
  folderBack.position.z = -0.18;
  const rearFrontSurfaceZ = folderBack.position.z + folderBack.geometry.boundingBox!.max.z;
  folderAssembly.add(folderBack);
  parts.set(folderBack.name, folderBack);
  // The tab is part of the rear shell silhouette, not a floating second mesh.
  parts.set('folder-tab', folderBack);

  const tabLabelTexture = createTextTexture({
    title: 'Graphic Design',
    background: '#E99908',
    foreground: '#9C7621',
    align: 'center',
    width: 700,
    height: 180,
    titleScale: 0.12,
    transparentBackground: true,
  });
  const tabLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.34),
    new THREE.MeshBasicMaterial({
      map: tabLabelTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  tabLabel.name = 'tab-label';
  tabLabel.position.set(-1.68, 1.96, 0.03);
  tabLabel.castShadow = false;
  tabLabel.receiveShadow = false;
  tabLabel.renderOrder = 4;
  folderAssembly.add(tabLabel);
  parts.set(tabLabel.name, tabLabel);

  const paperPivot = new THREE.Group();
  paperPivot.name = 'paper-bottom-pivot';
  paperPivot.position.set(0, FOLDER_BOTTOM_Y, rearFrontSurfaceZ + 0.02);
  paperPivot.rotation.set(PAPER_REST_TILT, 0, 0.008);
  folderAssembly.add(paperPivot);
  parts.set(paperPivot.name, paperPivot);

  const innerSheet = makeExtrudedMesh(paperSheetShape(), '#FFFDF8', 0.065, 0.045);
  innerSheet.name = 'inner-sheet';
  anchorMeshBottom(innerSheet);
  paperPivot.add(innerSheet);
  parts.set(innerSheet.name, innerSheet);
  parts.set('paper-sheet', innerSheet);

  const flapHinge = new THREE.Group();
  flapHinge.name = 'front-flap-hinge';
  flapHinge.position.set(0.1, FOLDER_BOTTOM_Y, rearFrontSurfaceZ);
  flapHinge.rotation.x = FRONT_REST_TILT;
  folderAssembly.add(flapHinge);

  const frontFlap = makeExtrudedMesh(frontFlapShape(), '#F2C642', 0.14, 0.045);
  frontFlap.name = 'front-flap';
  anchorMeshBottom(frontFlap);
  // Put the flap's lower-back edge on the hinge origin. The rear shell's
  // front surface and this edge now share one axis in X, Y and Z.
  frontFlap.position.z = -(frontFlap.geometry.boundingBox?.min.z ?? 0);
  const frontSurfaceZ = frontFlap.position.z + (frontFlap.geometry.boundingBox?.max.z ?? 0);
  frontFlap.userData.action = 'enter-directory';
  flapHinge.add(frontFlap);
  parts.set(frontFlap.name, frontFlap);
  parts.set(flapHinge.name, flapHinge);
  targets.push(frontFlap);

  const greeting = makeTextPanel(5.1, 1.55, 0.012, {
    title: '老板您好',
    subtitle: 'oɪn_njo',
    background: YELLOW,
    foreground: '#E4AB25',
    accent: 'rgba(0,0,0,0)',
    align: 'center',
    width: 1250,
    height: 500,
    titleScale: 0.36,
    subtitleScale: 0.16,
    transparentBackground: true,
  });
  greeting.name = 'greeting-carrier';
  greeting.position.set(0.18, 2.2, frontSurfaceZ + 0.018);
  greeting.rotation.z = -0.012;
  greeting.castShadow = false;
  flapHinge.add(greeting);
  parts.set(greeting.name, greeting);

  const flapLabel = makeTextPanel(1.8, 0.5, 0.008, {
    title: 'Folder',
    background: YELLOW,
    foreground: '#75674F',
    accent: 'rgba(0,0,0,0)',
    align: 'center',
    width: 760,
    height: 240,
    titleScale: 0.2,
    transparentBackground: true,
  });
  flapLabel.name = 'flap-label';
  flapLabel.position.set(-2.38, 0.38, frontSurfaceZ + 0.018);
  flapLabel.rotation.z = -0.04;
  flapLabel.castShadow = false;
  flapLabel.receiveShadow = false;
  flapHinge.add(flapLabel);
  parts.set(flapLabel.name, flapLabel);

  const leftInfo = makeTextPanel(2.35, 1.08, 0.03, {
    title: '求职者 七米', subtitle: 'BRAND DESIGN\n● 品牌设计', background: BLUE, foreground: CREAM, accent: PALE_YELLOW, width: 850, height: 430, titleScale: 0.12, subtitleScale: 0.055, transparentBackground: true,
  });
  leftInfo.name = 'left-info';
  leftInfo.position.set(-4.45, -1.48, 0.02);
  root.add(leftInfo);
  parts.set(leftInfo.name, leftInfo);

  const rightInfo = makeTextPanel(2.3, 1.75, 0.03, {
    title: '手机号183xxxxxxxx', subtitle: 'VISUAL DESIGN\n● 视觉设计\n微信号ABCDEFG\nGRAPHIC DESIGN', background: BLUE, foreground: CREAM, accent: PALE_YELLOW, width: 850, height: 650, titleScale: 0.095, subtitleScale: 0.042, transparentBackground: true,
  });
  rightInfo.name = 'right-info';
  rightInfo.position.set(4.42, -0.78, 0.02);
  root.add(rightInfo);
  parts.set(rightInfo.name, rightInfo);

  const bottomRail = makeExtrudedMesh(roundedRectShape(10.4, 0.23, 0.025), PALE_YELLOW, 0.055, 0.015);
  bottomRail.name = 'bottom-rail';
  bottomRail.position.set(0, -2.43, 0.12);
  root.add(bottomRail);
  parts.set(bottomRail.name, bottomRail);

  root.userData.hovered = false;
  const setOpacity = (value: number) => {
    for (const object of [title, yearScript, leftInfo, rightInfo]) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.transparent = true;
        material.opacity = value;
      }
    }
  };

  const handle = createHandle(root, parts, targets, {
    setHovered: (hovered) => { root.userData.hovered = hovered; },
    open: () => timelines.run((timeline) => {
      const fade = { value: 1 };
      timeline
        .to(flapHinge.rotation, { x: 1.18, duration: 0.72, ease: 'power3.inOut' }, 0)
        .to(paperPivot.rotation, { x: 0.13, duration: 0.52, ease: 'power2.out' }, 0.08)
        .to(folderAssembly.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.72 }, 0)
        .to(fade, { value: 0, duration: 0.35, onUpdate: () => setOpacity(fade.value) }, 0.08);
    }),
    close: () => timelines.run((timeline) => {
      setOpacity(1);
      timeline
        .to(flapHinge.rotation, { x: FRONT_REST_TILT, duration: 0.55 }, 0)
        .to(paperPivot.rotation, { x: PAPER_REST_TILT, z: 0.008, duration: 0.48 }, 0)
        .to(folderAssembly.rotation, { x: 0, y: BASE_ASSEMBLY_YAW, z: 0, duration: 0.45 }, 0)
        .to(folderAssembly.scale, { x: 1, y: 1, z: 1, duration: 0.5 }, 0);
    }),
  }, (delta) => {
    const hover = root.userData.hovered && root.userData.reducedMotion !== true ? 1 : 0;
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    const pointerX = THREE.MathUtils.clamp(Number(pointer.x) || 0, -1, 1);
    const pointerY = THREE.MathUtils.clamp(Number(pointer.y) || 0, -1, 1);
    folderAssembly.rotation.y = damp(folderAssembly.rotation.y, BASE_ASSEMBLY_YAW + hover * pointerX * 0.3, 8, delta);
    folderAssembly.rotation.x = damp(folderAssembly.rotation.x, hover * -pointerY * 0.13, 8, delta);
    flapHinge.rotation.x = damp(
      flapHinge.rotation.x,
      FRONT_REST_TILT + hover * (0.31 + pointerY * 0.09),
      9,
      delta,
    );
    paperPivot.rotation.x = damp(
      paperPivot.rotation.x,
      PAPER_REST_TILT + hover * (0.07 + pointerY * 0.025),
      8,
      delta,
    );
    paperPivot.rotation.z = damp(paperPivot.rotation.z, 0.008 + hover * pointerX * 0.008, 8, delta);
  });

  const baseDispose = handle.dispose;
  handle.dispose = () => {
    timelines.killActiveTimeline();
    baseDispose();
  };
  return handle;
}
