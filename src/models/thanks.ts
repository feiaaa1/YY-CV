import * as THREE from 'three';
import type { LocalizedText } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeExtrudedMesh, makeTag, makeTextPanel, roundedRectShape } from '../three/geometry';
import { createHandle, type SculptModelHandle } from '../three/runtime';

const BLUE = '#2B8AF0';
const YELLOW = '#F7D35F';
const CREAM = '#FFF9ED';

export function createThankYouModel(title: LocalizedText, contact: string, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = 'thank-you-cards';
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];
  const timelines = createTimelineController({ reducedMotion });

  const thankTitle = makeTextPanel(10.25, 1.62, 0.03, {
    title: 'THANK YOU', background: BLUE, foreground: YELLOW, align: 'center', width: 1900, height: 330, titleScale: 0.65, transparentBackground: true,
  });
  thankTitle.name = 'thank-you-title';
  thankTitle.position.set(0, 3.05, -0.1);
  root.add(thankTitle);
  parts.set(thankTitle.name, thankTitle);

  const yearScript = makeTextPanel(8.6, 0.72, 0.025, {
    title: '2024                              Graphic Design', background: BLUE, foreground: CREAM, align: 'center', width: 1800, height: 250, titleScale: 0.22, transparentBackground: true,
  });
  yearScript.name = 'year-script';
  yearScript.position.set(0.12, 2.47, 0.01);
  root.add(yearScript);
  parts.set(yearScript.name, yearScript);

  const rearPaper = makeTextPanel(3.5, 3.65, 0.12, { title: '', background: '#F5EEE5', foreground: YELLOW });
  rearPaper.name = 'rear-paper';
  rearPaper.position.set(-0.55, -0.45, -0.16);
  rearPaper.rotation.z = -0.14;
  root.add(rearPaper);
  parts.set(rearPaper.name, rearPaper);

  const frontPaper = makeTextPanel(3.75, 3.85, 0.13, { title: '', background: '#FFFDF8', foreground: YELLOW });
  frontPaper.name = 'front-paper';
  frontPaper.position.set(0.35, -0.78, 0.07);
  root.add(frontPaper);
  parts.set(frontPaper.name, frontPaper);

  const message = makeTextPanel(2.8, 1.45, 0.012, {
    title: title.zh,
    subtitle: `${title.en}\nTHANKS FOR WATCHING`,
    background: '#FFFDF8', foreground: YELLOW, align: 'center', width: 1000, height: 520,
    titleScale: 0.15, subtitleScale: 0.06, transparentBackground: true,
  });
  message.name = 'message-carrier';
  message.position.set(0.35, -0.55, 0.15);
  message.castShadow = false;
  root.add(message);
  parts.set(message.name, message);

  const contactLine = makeTextPanel(3.3, 0.85, 0.02, {
    title: 'PLEASE contact me', subtitle: contact, background: BLUE, foreground: CREAM, accent: YELLOW,
    width: 1000, height: 340, titleScale: 0.13, subtitleScale: 0.052, transparentBackground: true,
  });
  contactLine.name = 'contact-line';
  contactLine.position.set(-3.9, -2.0, 0.02);
  root.add(contactLine);
  parts.set(contactLine.name, contactLine);

  const bottomRail = makeExtrudedMesh(roundedRectShape(10.4, 0.23, 0.025), YELLOW, 0.055, 0.015);
  bottomRail.name = 'bottom-rail';
  bottomRail.position.set(0, -2.48, 0.1);
  root.add(bottomRail);
  parts.set(bottomRail.name, bottomRail);

  const restart = makeTag('RESTART / 重新浏览', '#EFFF69', 'restart');
  restart.name = 'restart-tab';
  restart.scale.setScalar(0.72);
  restart.position.set(4.35, -2.05, 0.15);
  root.add(restart);
  parts.set(restart.name, restart);
  targets.push(restart);

  const rest = {
    rearY: rearPaper.position.y,
    rearRot: rearPaper.rotation.z,
    frontY: frontPaper.position.y,
  };
  rearPaper.position.y = -4;
  frontPaper.position.y = -4;
  message.position.y = -4;
  thankTitle.scale.setScalar(0.72);

  const handle = createHandle(root, parts, targets, {
    open: () => timelines.run((timeline) => {
      timeline
        .to(thankTitle.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.4)' }, 0)
        .to(rearPaper.position, { y: rest.rearY, duration: 0.72 }, 0.12)
        .to(rearPaper.rotation, { z: rest.rearRot, duration: 0.72 }, 0.12)
        .to(frontPaper.position, { y: rest.frontY, duration: 0.68 }, 0.22)
        .to(message.position, { y: -0.55, duration: 0.68 }, 0.22);
    }),
    close: () => timelines.run((timeline) => {
      timeline.to([rearPaper.position, frontPaper.position, message.position], { y: -4, duration: 0.48 }, 0).to(thankTitle.scale, { x: 0.72, y: 0.72, z: 0.72, duration: 0.4 }, 0.08);
    }),
  });
  const baseDispose = handle.dispose;
  handle.dispose = () => { timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
