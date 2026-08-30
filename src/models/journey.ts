import * as THREE from 'three';
import type { Category, JourneyExperience } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTag, makeTextPanel, roundedRectShape, updateTextPanel } from '../three/geometry';
import { createHandle, damp, type SculptModelHandle } from '../three/runtime';

const stationPositions = [
  new THREE.Vector3(-3.25, -0.75, 0.34),
  new THREE.Vector3(-1.2, 0.22, 0.38),
  new THREE.Vector3(1.25, -0.5, 0.4),
  new THREE.Vector3(3.25, 0.85, 0.42),
];

function addPart(parts: Map<string, THREE.Object3D>, parent: THREE.Object3D, object: THREE.Object3D): void {
  parent.add(object);
  parts.set(object.name, object);
}

function createScallopHeader(name: string, color: string, width: number, offsetX: number): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const bar = makeExtrudedMesh(roundedRectShape(width, 0.62, 0.13), color, 0.065, 0.025);
  bar.position.set(offsetX, 0.15, 0);
  group.add(bar);
  const count = Math.max(4, Math.round(width / 0.72));
  for (let index = 0; index < count; index += 1) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.29, 0, Math.PI * 2, false);
    const scallop = makeExtrudedMesh(shape, color, 0.065, 0.012);
    scallop.position.set(offsetX - width / 2 + 0.38 + index * ((width - 0.76) / Math.max(1, count - 1)), -0.14, 0);
    group.add(scallop);
  }
  return group;
}

function createPaperclip(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'paperclip';
  const points = [
    new THREE.Vector3(-0.42, -0.5, 0), new THREE.Vector3(-0.5, 0.24, 0),
    new THREE.Vector3(-0.24, 0.58, 0), new THREE.Vector3(0.18, 0.56, 0),
    new THREE.Vector3(0.43, 0.22, 0), new THREE.Vector3(0.35, -0.52, 0),
    new THREE.Vector3(0.12, -0.52, 0), new THREE.Vector3(0.08, 0.18, 0),
    new THREE.Vector3(0.18, 0.3, 0), new THREE.Vector3(0.29, 0.18, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 42, 0.025, 8, false),
    new THREE.MeshStandardMaterial({ color: '#D8D19B', metalness: 0.78, roughness: 0.28 }),
  );
  wire.castShadow = true;
  group.add(wire);
  return group;
}

function createStationIcon(experience: JourneyExperience, index: number): THREE.Group {
  const station = new THREE.Group();
  station.name = `station-${index}`;
  station.userData.action = 'select-journey-station';
  station.userData.stationIndex = index;
  station.userData.experienceId = experience.id;

  const sticker = makeExtrudedMesh(roundedRectShape(1.38, 1.32, 0.2), '#FFFDF2', 0.095, 0.035);
  sticker.name = `station-${index}-sticker`;
  station.add(sticker);

  const accent = new THREE.MeshStandardMaterial({ color: experience.accent, roughness: 0.78 });
  const navy = new THREE.MeshStandardMaterial({ color: '#52668E', roughness: 0.76 });
  const green = new THREE.MeshStandardMaterial({ color: '#79A872', roughness: 0.84 });
  if (experience.icon === 'badge') {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.56, 0.09), accent);
    card.position.set(0, 0.05, 0.12);
    station.add(card);
    const photo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.03), navy);
    photo.position.set(-0.23, 0.05, 0.18);
    station.add(photo);
  } else if (experience.icon === 'studio') {
    const arch = makeExtrudedMesh(roundedRectShape(0.88, 0.83, 0.24), '#D8C59B', 0.075, 0.025);
    arch.position.z = 0.11;
    station.add(arch);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 0.12), navy);
    awning.position.set(0, 0.25, 0.19);
    station.add(awning);
  } else if (experience.icon === 'office') {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.95, 0.12), accent);
    tower.position.set(0, 0, 0.13);
    station.add(tower);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const window = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.025), navy);
        window.position.set(-0.17 + column * 0.34, 0.27 - row * 0.27, 0.205);
        station.add(window);
      }
    }
  } else {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.12), new THREE.MeshStandardMaterial({ color: '#B78A58', roughness: 0.9 }));
    trunk.position.set(0, -0.12, 0.14);
    station.add(trunk);
    [[0, 0.25], [-0.27, 0.13], [0.27, 0.12], [-0.16, 0.39], [0.18, 0.4]].forEach(([x, y], leafIndex) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), green);
      leaf.name = `station-${index}-leaf-${leafIndex}`;
      leaf.scale.z = 0.38;
      leaf.position.set(x!, y!, 0.2);
      station.add(leaf);
    });
  }

  const caption = makeTextPanel(1.7, 0.45, 0.045, {
    title: experience.company.zh,
    subtitle: experience.period,
    background: '#FFF2DC', foreground: '#6E5870', accent: experience.accent,
    align: 'center', width: 900, height: 260, titleScale: 0.52,
  });
  caption.name = `station-${index}-caption`;
  caption.position.set(0, -0.92, 0.08);
  caption.rotation.z = index % 2 ? 0.035 : -0.035;
  station.add(caption);
  return station;
}

function createPennants(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pennant-string';
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.25, 0.15, 0), new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(2.25, 0.15, 0),
  ]);
  const cord = new THREE.Mesh(
    new THREE.TubeGeometry(cordCurve, 36, 0.018, 6, false),
    new THREE.MeshStandardMaterial({ color: '#D7B463', roughness: 0.72 }),
  );
  group.add(cord);
  const colors = ['#F18479', '#F0CE58', '#7288BD', '#E5A8B8', '#84B29B', '#F18479'];
  colors.forEach((color, index) => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.17, 0.1); shape.lineTo(0.17, 0.1); shape.lineTo(0, -0.34); shape.closePath();
    const flag = makeExtrudedMesh(shape, color, 0.035, 0.008);
    flag.position.set(-1.75 + index * 0.7, -0.03 + Math.abs(index - 2.5) * 0.025, 0.02);
    group.add(flag);
  });
  return group;
}

function createBalloonCluster(name: string, colors: string[]): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  colors.forEach((color, index) => {
    const balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 20, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.48, transparent: true, opacity: 0.9 }),
    );
    balloon.scale.set(0.82, 1.18, 0.46);
    balloon.position.set((index - (colors.length - 1) / 2) * 0.42, index % 2 ? -0.14 : 0.17, index * 0.025);
    balloon.castShadow = true;
    group.add(balloon);
    const stringCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(balloon.position.x, balloon.position.y - 0.38, 0),
      new THREE.Vector3(balloon.position.x + 0.08, balloon.position.y - 0.8, 0),
      new THREE.Vector3(0, -1.22, 0),
    ]);
    const string = new THREE.Mesh(
      new THREE.TubeGeometry(stringCurve, 20, 0.009, 5, false),
      new THREE.MeshStandardMaterial({ color: '#D9B987', roughness: 0.82 }),
    );
    group.add(string);
  });
  return group;
}

function createCloudField(): THREE.Group {
  const field = new THREE.Group();
  field.name = 'cloud-field';
  const placements = [[-3.5, 0.9, 0.72], [-0.2, 0.45, 0.54], [2.45, 1.35, 0.62]];
  placements.forEach(([x, y, scale], cloudIndex) => {
    const cloud = new THREE.Group();
    cloud.name = `cloud-${cloudIndex}`;
    [[-0.32, 0], [0, 0.12], [0.34, 0], [0.02, -0.13]].forEach(([offsetX, offsetY], puffIndex) => {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 14, 10),
        new THREE.MeshStandardMaterial({ color: cloudIndex % 2 ? '#F8E8D2' : '#E5EAF1', roughness: 0.94, transparent: true, opacity: 0.55 }),
      );
      puff.name = `cloud-${cloudIndex}-puff-${puffIndex}`;
      puff.scale.z = 0.22;
      puff.position.set(offsetX!, offsetY!, 0);
      cloud.add(puff);
    });
    cloud.position.set(x!, y!, 0.02);
    cloud.scale.setScalar(scale!);
    field.add(cloud);
  });
  return field;
}

export function createJourneyModel(category: Category, reducedMotion = false): SculptModelHandle {
  const experiences = category.journeyExperiences ?? [];
  if (experiences.length !== 4) throw new Error(`Journey category ${category.id} requires exactly four experiences.`);

  const root = new THREE.Group();
  root.name = `journey-${category.id}`;
  root.userData.open = false;
  root.userData.selectedStation = -1;
  const timelines = createTimelineController({ reducedMotion });
  const popupTimelines = createTimelineController({ reducedMotion });
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];
  const rig = new THREE.Group();
  rig.name = 'journey-hover-rig';
  root.add(rig);
  parts.set(rig.name, rig);

  const outerCase = makeExtrudedMesh(roundedRectShape(9.65, 5.82, 0.42), '#405B9A', 0.22, 0.1);
  outerCase.name = 'outer-case'; outerCase.position.z = -0.42;
  outerCase.userData.action = 'journey-hover-surface';
  addPart(parts, rig, outerCase);
  targets.push(outerCase);
  const innerRim = makeExtrudedMesh(roundedRectShape(9.22, 5.4, 0.34), '#8FBDE0', 0.12, 0.06);
  innerRim.name = 'inner-rim'; innerRim.position.z = -0.27;
  (innerRim.material as THREE.MeshStandardMaterial).transparent = true;
  (innerRim.material as THREE.MeshStandardMaterial).opacity = 0.83;
  addPart(parts, rig, innerRim);

  const sheet = makeTextPanel(8.82, 5.02, 0.11, {
    title: '', subtitle: 'INTERNSHIP JOURNEY  ·  FOUR STOPS  ·  KEEP MOVING',
    kicker: 'PORTFOLIO EXPERIENCE MAP', background: '#FFF9E9', foreground: '#B58F8B', accent: '#E8C867',
    align: 'center', width: 1700, height: 980, titleScale: 0.2,
  });
  sheet.name = 'invitation-sheet'; sheet.position.set(0, -0.1, -0.08);
  sheet.userData.action = 'journey-hover-surface';
  addPart(parts, rig, sheet);
  targets.push(sheet);

  const blueHeader = createScallopHeader('blue-scallop-header', '#86BADA', 4.7, -2.0);
  blueHeader.position.set(0, 2.02, 0.04);
  addPart(parts, rig, blueHeader);
  const coralHeader = createScallopHeader('coral-scallop-header', '#F5A79E', 4.25, 2.22);
  coralHeader.position.set(0, 2.02, 0.05);
  addPart(parts, rig, coralHeader);

  const titleShadow = makeTextPanel(5.85, 0.88, 0.045, {
    title: 'MY JOURNEY', subtitle: '我的实习旅途', background: '#FFF9E9', foreground: '#3E84C6', accent: '#FFF9E9',
    align: 'center', width: 1500, height: 360, titleScale: 0.7, transparentBackground: true,
  });
  titleShadow.position.set(0.08, 1.67, 0.2);
  rig.add(titleShadow);
  const title = makeTextPanel(5.85, 0.88, 0.05, {
    title: 'MY JOURNEY', subtitle: '我的实习旅途', background: '#FFF9E9', foreground: '#EF6D63', accent: '#4C8FD0',
    align: 'center', width: 1500, height: 360, titleScale: 0.7, transparentBackground: true,
  });
  title.name = 'journey-title'; title.position.set(-0.03, 1.74, 0.26);
  addPart(parts, rig, title);

  const routeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.05, -0.7, 0.12), new THREE.Vector3(-3.05, -0.15, 0.12),
    new THREE.Vector3(-2.15, -0.92, 0.12), new THREE.Vector3(-1.15, -0.02, 0.12),
    new THREE.Vector3(0.05, -1.15, 0.12), new THREE.Vector3(1.2, -0.35, 0.12),
    new THREE.Vector3(2.2, -0.85, 0.12), new THREE.Vector3(3.1, 0.15, 0.12),
    new THREE.Vector3(4.0, 0.6, 0.12),
  ], false, 'centripetal');
  const route = new THREE.Mesh(
    new THREE.TubeGeometry(routeCurve, 120, 0.26, 10, false),
    new THREE.MeshStandardMaterial({ color: '#C8C7E4', roughness: 0.88 }),
  );
  route.name = 'journey-route'; route.scale.z = 0.32; route.castShadow = true;
  addPart(parts, rig, route);
  for (let index = 0; index < 14; index += 1) {
    const t = 0.045 + index * 0.069;
    const point = routeCurve.getPoint(t);
    const tangent = routeCurve.getTangent(t);
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.055, 0.035),
      new THREE.MeshStandardMaterial({ color: '#FFFDF0', roughness: 0.9 }),
    );
    dash.name = `route-dash-${index}`;
    dash.position.copy(point); dash.position.z = 0.23;
    dash.rotation.z = Math.atan2(tangent.y, tangent.x);
    addPart(parts, rig, dash);
  }

  const pennants = createPennants(); pennants.position.set(0, 1.08, 0.28);
  addPart(parts, rig, pennants);
  const paperclip = createPaperclip(); paperclip.position.set(4.15, 1.65, 0.35); paperclip.rotation.z = -0.42;
  addPart(parts, rig, paperclip);

  const cloudField = createCloudField();
  addPart(parts, rig, cloudField);

  const balloonLeft = createBalloonCluster('balloon-left', ['#F39B67', '#63D8BB', '#77B8E5']);
  balloonLeft.position.set(-3.55, 2.72, 0.18); balloonLeft.scale.setScalar(0.82);
  addPart(parts, rig, balloonLeft);
  const balloonRight = createBalloonCluster('balloon-right', ['#73D3D2', '#F49CB5']);
  balloonRight.position.set(4.35, -1.55, 0.34); balloonRight.scale.setScalar(0.78);
  addPart(parts, rig, balloonRight);

  const bottomRibbon = makeTextPanel(8.2, 0.72, 0.095, {
    title: 'FOUR STOPS · ONE JOURNEY', subtitle: 'LEARN  ·  CREATE  ·  GROW',
    background: '#425C97', foreground: '#F3D98B', accent: '#F3A797',
    align: 'center', width: 1500, height: 300, titleScale: 0.54,
  });
  bottomRibbon.name = 'bottom-ribbon'; bottomRibbon.position.set(0.62, -2.38, 0.38); bottomRibbon.rotation.z = -0.015;
  addPart(parts, rig, bottomRibbon);

  const decorationColors = ['#F4C858', '#F08179', '#76A8D7', '#86BC9A'];
  for (let index = 0; index < 16; index += 1) {
    const shape = new THREE.Shape();
    const points = 4;
    for (let point = 0; point < points * 2; point += 1) {
      const angle = Math.PI / 4 + point * Math.PI / points;
      const radius = point % 2 === 0 ? 0.16 : 0.055;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    const decoration = makeExtrudedMesh(shape, decorationColors[index % decorationColors.length]!, 0.035, 0.007);
    decoration.name = `decoration-${index}`;
    const x = -4.05 + ((index * 1.67) % 8.1);
    const y = -2.05 + ((index * 1.13) % 3.8);
    decoration.position.set(x, y, 0.24 + (index % 3) * 0.012);
    decoration.rotation.z = index * 0.31;
    addPart(parts, rig, decoration);
  }

  const stations = experiences.map((experience, index) => {
    const station = createStationIcon(experience, index);
    station.position.copy(stationPositions[index]!);
    station.rotation.z = [-0.04, 0.045, -0.025, 0.035][index]!;
    addPart(parts, rig, station);
    targets.push(station);
    return station;
  });
  const stationMaterials = stations.map((station) => {
    const materials: THREE.MeshStandardMaterial[] = [];
    station.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const candidates = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of candidates) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.transparent = true;
        materials.push(material);
      }
    });
    return materials;
  });

  const popup = makeTextPanel(4.15, 2.2, 0.13, {
    title: experiences[0]!.company.zh,
    subtitle: `${experiences[0]!.role.zh}\n${experiences[0]!.period} · ${experiences[0]!.location.zh}\n${experiences[0]!.summary.zh}`,
    kicker: 'INTERNSHIP STOP 01', background: '#FFF8E9', foreground: '#4B5773', accent: experiences[0]!.accent,
    width: 1300, height: 700, titleScale: 0.72,
  });
  popup.name = 'experience-popup'; popup.position.set(0, 0.15, 0.82); popup.visible = false;
  addPart(parts, rig, popup);

  const popupClose = makeTag('×  BACK / 返回', '#F5D965', 'close-journey-popup');
  popupClose.name = 'popup-close'; popupClose.position.set(1.32, -0.78, 0.12); popup.add(popupClose);
  parts.set(popupClose.name, popupClose); targets.push(popupClose);

  const closeTag = makeTag('CLOSE / 关闭', '#8ED7E2', 'close-detail');
  closeTag.name = 'close-tag'; closeTag.position.set(0, -3.35, 0.18);
  addPart(parts, root, closeTag); targets.push(closeTag);

  const selectStation = (index: number): Promise<void> => {
    if (index < 0 || index >= experiences.length) {
      root.userData.selectedStation = -1;
      stations.forEach((station) => {
        station.scale.setScalar(1);
        station.userData.dimmed = false;
      });
      if (!popup.visible) return Promise.resolve();
      return popupTimelines.run((timeline) => {
        stations.forEach((station, stationIndex) => {
          const base = stationPositions[stationIndex]!;
          timeline.to(station.position, { y: base.y, z: base.z, duration: 0.3 }, 0);
          stationMaterials[stationIndex]!.forEach((material) => {
            timeline.to(material, { opacity: 1, duration: 0.24 }, 0);
          });
        });
        timeline
          .to(popup.scale, { x: 0.04, y: 0.04, z: 0.04, duration: 0.24, ease: 'back.in(1.35)' }, 0)
          .call(() => { popup.visible = false; });
      });
    }
    const experience = experiences[index]!;
    root.userData.selectedStation = index;
    popup.userData.experienceId = experience.id;
    popup.visible = true;
    popup.scale.setScalar(0.04);
    popup.position.x = THREE.MathUtils.clamp(stationPositions[index]!.x * 0.22, -0.75, 0.75);
    updateTextPanel(popup, {
      title: experience.company.zh,
      subtitle: `${experience.role.zh}\n${experience.period} · ${experience.location.zh}\n${experience.summary.zh}`,
      kicker: `INTERNSHIP STOP ${String(index + 1).padStart(2, '0')}`,
      background: '#FFF8E9', foreground: '#4B5773', accent: experience.accent,
      width: 1300, height: 700, titleScale: 0.72,
    });
    stations.forEach((station, stationIndex) => {
      const selected = stationIndex === index;
      station.scale.setScalar(selected ? 1.16 : 0.9);
      station.userData.dimmed = !selected;
    });
    return popupTimelines.run((timeline) => {
      stations.forEach((station, stationIndex) => {
        const base = stationPositions[stationIndex]!;
        const selected = stationIndex === index;
        timeline.to(station.position, {
          y: base.y + (selected ? 0.13 : 0),
          z: base.z + (selected ? 0.3 : 0),
          duration: 0.34,
        }, 0);
        stationMaterials[stationIndex]!.forEach((material) => {
          timeline.to(material, { opacity: selected ? 1 : 0.42, duration: 0.26 }, 0);
        });
      });
      timeline.to(popup.scale, {
        x: 1, y: 1, z: 1, duration: 0.42, ease: 'back.out(1.65)',
      }, 0);
    });
  };

  let hovered = false;
  const handle = createHandle(root, parts, targets, {
    setHovered: (value) => { hovered = value; },
    setProject: selectStation,
    open: () => timelines.run((timeline) => {
      root.userData.open = true;
      innerRim.scale.setScalar(0.82);
      sheet.scale.setScalar(0.84);
      title.scale.setScalar(0.05);
      route.scale.set(0.02, 0.02, 0.02);
      stations.forEach((station) => station.scale.setScalar(0.02));
      timeline
        .to(innerRim.scale, { x: 1, y: 1, z: 1, duration: 0.36 }, 0)
        .to(sheet.scale, { x: 1, y: 1, z: 1, duration: 0.42 }, 0.08)
        .to(title.scale, { x: 1, y: 1, z: 1, duration: 0.42, ease: 'back.out(1.7)' }, 0.24)
        .to(route.scale, { x: 1, y: 1, z: 0.32, duration: 0.52 }, 0.3);
      stations.forEach((station, index) => {
        timeline.to(station.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.48 + index * 0.08);
      });
    }),
    close: () => timelines.run((timeline) => {
      root.userData.open = false;
      popup.visible = false;
      timeline.to(rig.scale, { x: 0.04, y: 0.04, z: 0.04, duration: 0.42 }, 0);
    }),
  }, (delta) => {
    const pointer = root.userData.hoverPointer ?? { x: 0, y: 0 };
    const amount = hovered ? 1 : 0;
    rig.rotation.y = damp(rig.rotation.y, pointer.x * 0.055 * amount, 7, delta);
    rig.rotation.x = damp(rig.rotation.x, -pointer.y * 0.035 * amount, 7, delta);
    stations.forEach((station, index) => {
      if (root.userData.selectedStation >= 0) return;
      const pulse = 1 + Math.sin(index * 1.7 + performance.now() * 0.0018) * 0.012 * amount;
      station.scale.setScalar(damp(station.scale.x, pulse, 7, delta));
    });
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => {
    timelines.killActiveTimeline();
    popupTimelines.killActiveTimeline();
    baseDispose();
  };
  return handle;
}
