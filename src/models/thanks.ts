import * as THREE from 'three';
import type { LocalizedText } from '../content/types';
import { createTimelineController } from '../animation/timelines';
import { makeActionChip, makeExtrudedMesh, makeTextPanel, roundedRectShape } from '../three/geometry';
import { createHandle, damp, type SculptLayout, type SculptModelHandle } from '../three/runtime';

const BLUE = '#2B8AF0';
const YELLOW = '#F7D35F';
const CREAM = '#FFF9ED';
const INK = '#17213A';
const LIME = '#EFFF69';
const CARD = '#FFFDF8';

const REAR_PAPER_WIDTH = 3.4;
const REAR_PAPER_HEIGHT = 3.5;
const FRONT_PAPER_WIDTH = 3.7;
const FRONT_PAPER_HEIGHT = 3.8;
/** The rear sheet leans left - its head tips left, its bottom-left corner drops
 *  lowest. The angle stays small: it sets how much vertical room the slanted
 *  bottom edge needs before it can disappear behind the rail. */
const REAR_PAPER_TILT = 0.095;
const RAIL_WIDTH = 10.4;
/** Resting thickness of the rail. It is grown at runtime when a wider sheet
 *  needs a taller block to hide both bottom edges. */
const RAIL_THICKNESS = 0.23;
/** How deep each sheet finishes inside the rail, and the clearance kept above
 *  the rail's own bottom edge. */
const FRONT_PAPER_TUCK = 0.06;
const REAR_PAPER_TUCK = 0.05;
const RAIL_CLEARANCE = 0.04;

export function createThankYouModel(title: LocalizedText, contact: string, reducedMotion = false): SculptModelHandle {
  const root = new THREE.Group();
  root.name = 'thank-you-cards';
  const parts = new Map<string, THREE.Object3D>([['root', root]]);
  const targets: THREE.Object3D[] = [];
  root.userData.reducedMotion = reducedMotion;
  const timelines = createTimelineController({ reducedMotion: () => root.userData.reducedMotion === true });

  // The wordmark is the page's only "THANK YOU"; the card below carries the
  // Chinese message on its own instead of repeating the same two lines.
  const thankTitle = makeTextPanel(10.25, 1.62, 0.03, {
    title: 'THANK YOU',
    background: BLUE,
    foreground: YELLOW,
    align: 'center',
    titleScale: 0.72,
    accent: 'rgba(0,0,0,0)',
    transparentBackground: true,
  });
  thankTitle.name = 'thank-you-title';
  root.add(thankTitle);
  parts.set(thankTitle.name, thankTitle);

  const rearPaper = makeTextPanel(REAR_PAPER_WIDTH, REAR_PAPER_HEIGHT, 0.12, {
    title: '',
    background: '#F5EEE5',
    foreground: YELLOW,
    accent: 'rgba(0,0,0,0)',
  });
  rearPaper.name = 'rear-paper';
  root.add(rearPaper);
  parts.set(rearPaper.name, rearPaper);

  const frontPaper = makeTextPanel(FRONT_PAPER_WIDTH, FRONT_PAPER_HEIGHT, 0.13, {
    title: '',
    background: CARD,
    foreground: YELLOW,
    accent: 'rgba(0,0,0,0)',
  });
  frontPaper.name = 'front-paper';
  root.add(frontPaper);
  parts.set(frontPaper.name, frontPaper);

  // Ink on the cream card: the old yellow-on-cream set the message at about
  // 1.6:1 contrast, which is why the closing line read as a smudge.
  const message = makeTextPanel(2.8, 1.45, 0.012, {
    title: title.zh,
    subtitle: '如果对我的经历感兴趣\n欢迎随时联系我',
    background: CARD,
    foreground: INK,
    accent: YELLOW,
    align: 'center',
    titleScale: 0.18,
    subtitleScale: 0.095,
    titleY: 0.36,
    subtitleY: 0.66,
    transparentBackground: true,
  });
  message.name = 'message-carrier';
  message.castShadow = false;
  root.add(message);
  parts.set(message.name, message);

  const contactLine = makeTextPanel(3.3, 0.85, 0.02, {
    title: '联系我',
    subtitle: contact,
    background: BLUE,
    foreground: CREAM,
    accent: YELLOW,
    titleScale: 0.2,
    subtitleScale: 0.11,
    titleY: 0.3,
    subtitleY: 0.68,
    transparentBackground: true,
  });
  contactLine.name = 'contact-line';
  root.add(contactLine);
  parts.set(contactLine.name, contactLine);

  const bottomRail = makeExtrudedMesh(roundedRectShape(RAIL_WIDTH, RAIL_THICKNESS, 0.025), YELLOW, 0.055, 0.015);
  bottomRail.name = 'bottom-rail';
  root.add(bottomRail);
  parts.set(bottomRail.name, bottomRail);

  const restart = makeActionChip(2.2, {
    title: '重新浏览',
    hint: '回到封面',
    background: LIME,
    foreground: INK,
  });
  restart.name = 'restart-tab';
  restart.userData.action = 'restart';
  root.add(restart);
  parts.set(restart.name, restart);
  targets.push(restart);

  // Resting pose of every panel. The layout pass rewrites these numbers, and
  // the open/close timelines read them back, so the screen stays put when the
  // viewport changes shape.
  const rest = {
    titleScale: 1,
    titleY: 3.05,
    paperScale: 1,
    // Vertical stretch per sheet. Layout rewrites them so every bottom edge
    // lands inside the rail; the sheets always hang from their top edge.
    frontStretch: 1,
    rearStretch: 1,
    frontPaperY: 0,
    rearPaperY: 0,
    rearX: -0.42,
    rearY: -0.3,
    frontX: 0.36,
    frontY: -0.72,
    messageX: 0.36,
    // Distance from the front sheet's centre to the closing message. The
    // message rides on the sheet, so a stretched card keeps it centred.
    messageOffsetY: 0.31,
    messageY: -0.52,
    contactX: -3.9,
    contactY: -1.95,
    restartX: 4,
    restartY: -1.95,
    restartScale: 0.95,
    railY: -2.95,
    railScaleX: 1,
    railScaleY: 1,
  };

  const applyRestingPose = (): void => {
    thankTitle.scale.setScalar(rest.titleScale);
    thankTitle.position.set(0, rest.titleY, -0.1);

    // Both sheets keep the top edge their resting pose gave them and grow
    // downwards from there, so lengthening the paper never pushes the closing
    // line or the fanned corner around.
    const rearTiltCos = Math.cos(REAR_PAPER_TILT);
    const frontHeight = FRONT_PAPER_HEIGHT * rest.paperScale * rest.frontStretch;
    const frontTop = rest.frontY + (FRONT_PAPER_HEIGHT * rest.paperScale) / 2;
    rest.frontPaperY = frontTop - frontHeight / 2;
    frontPaper.scale.set(rest.paperScale, rest.paperScale * rest.frontStretch, rest.paperScale);
    frontPaper.position.set(rest.frontX, rest.frontPaperY, 0.07);

    const rearHeight = REAR_PAPER_HEIGHT * rest.paperScale * rest.rearStretch;
    const rearTop = rest.rearY + (REAR_PAPER_HEIGHT * rest.paperScale * rearTiltCos) / 2;
    rest.rearPaperY = rearTop - (rearHeight * rearTiltCos) / 2;
    rearPaper.scale.set(rest.paperScale, rest.paperScale * rest.rearStretch, rest.paperScale);
    rearPaper.position.set(rest.rearX, rest.rearPaperY, -0.16);
    rearPaper.rotation.z = REAR_PAPER_TILT;

    rest.messageY = rest.frontPaperY + rest.messageOffsetY;
    message.position.set(rest.messageX, rest.messageY, 0.15);
    contactLine.position.set(rest.contactX, rest.contactY, 0.02);
    restart.position.set(rest.restartX, rest.restartY, 0.15);
    restart.scale.setScalar(rest.restartScale);
    bottomRail.position.set(0, rest.railY, 0.1);
    bottomRail.scale.set(rest.railScaleX, rest.railScaleY, 1);
  };

  /**
   * Lengths the two sheets so the closing cards meet the yellow block instead
   * of hovering above it. The front sheet's flat bottom sits just inside the
   * rail; the leaning sheet is stretched until its lowest corner - the left one
   * its lean drops furthest, and the one the eye can still see - finishes in
   * the same band, which sends the rest of that slanted edge rising behind the
   * front sheet. The rail is grown by the slant's full span so both ends of the
   * edge stay inside the block at every viewport.
   */
  const solvePaperStretch = (): void => {
    const angle = REAR_PAPER_TILT;
    const lean = Math.abs(Math.sin(angle));
    const rearTiltSpan = REAR_PAPER_WIDTH * rest.paperScale * lean;
    rest.railScaleY = Math.max(
      1,
      (rearTiltSpan + RAIL_CLEARANCE + REAR_PAPER_TUCK) / RAIL_THICKNESS,
    );

    const railThickness = RAIL_THICKNESS * rest.railScaleY;
    const railTop = rest.railY + railThickness / 2;
    const railBottom = rest.railY - railThickness / 2;

    const frontTop = rest.frontY + (FRONT_PAPER_HEIGHT * rest.paperScale) / 2;
    rest.frontStretch = (frontTop - (railTop - FRONT_PAPER_TUCK))
      / (FRONT_PAPER_HEIGHT * rest.paperScale);

    const cos = Math.cos(angle);
    const rearTop = rest.rearY + (REAR_PAPER_HEIGHT * rest.paperScale * cos) / 2;
    const rearHeight = (rearTop - (railBottom + RAIL_CLEARANCE) - rearTiltSpan / 2) / cos;
    rest.rearStretch = rearHeight / (REAR_PAPER_HEIGHT * rest.paperScale);
  };

  // Cards start below the frame and rise on open. The offset follows the rest
  // pose so the entrance keeps its travel after a resize.
  const hideForEntrance = (): void => {
    rearPaper.position.y = rest.rearPaperY - 4;
    frontPaper.position.y = rest.frontPaperY - 4;
    message.position.y = rest.messageY - 4;
    thankTitle.scale.setScalar(rest.titleScale * 0.86);
  };

  const applyLayout = (layout: SculptLayout): void => {
    if (layout.isMobile) {
      // Portrait screens are far taller than wide: the wordmark, the card and
      // the closing panels stack down the middle. The rail rides directly under
      // the sheets here - anchoring it to the bottom edge would leave the two
      // shapes half a screen apart - and the closing panels fill the space it
      // used to hold.
      rest.titleScale = 0.62;
      rest.titleY = layout.halfHeight * 0.78;
      rest.paperScale = 0.86;
      // The wordmark stands on its own up here now, so the sheets climb a
      // little to keep the band between the two from opening into a hole.
      const sheetLift = 0.4;
      rest.rearX = -0.26;
      rest.rearY = layout.halfHeight * 0.18 + 0.44 + sheetLift;
      rest.frontX = 0.22;
      rest.frontY = layout.halfHeight * 0.18 + sheetLift;
      rest.messageX = 0.22;
      rest.messageOffsetY = 0.2;
      rest.contactX = 0;
      rest.contactY = -layout.halfHeight * 0.53;
      rest.restartX = 0;
      rest.restartY = -layout.halfHeight * 0.74;
      rest.restartScale = 0.95;
      rest.railY = -layout.halfHeight * 0.32;
      rest.railScaleX = Math.min(0.62, (layout.halfWidth - 0.3) / 5.2);
    } else {
      rest.titleScale = 1;
      rest.titleY = 3.05;
      rest.paperScale = 1;
      rest.rearX = -0.42;
      rest.rearY = -0.3;
      rest.frontX = 0.36;
      rest.frontY = -0.72;
      rest.messageX = 0.36;
      rest.messageOffsetY = 0.31;
      // The closing panels hug the viewport edges, but never past them.
      rest.contactX = -Math.min(3.9, layout.halfWidth - 2.05);
      rest.contactY = -1.95;
      rest.restartX = Math.min(4, layout.halfWidth - 1.4);
      rest.restartY = -1.95;
      rest.restartScale = 0.95;
      rest.railY = -2.95;
      rest.railScaleX = Math.min(1, (layout.halfWidth - 0.3) / 5.2);
    }
    solvePaperStretch();
    applyRestingPose();
    if (root.userData.opened !== true) hideForEntrance();
  };

  applyLayout({ isMobile: false, halfWidth: 6.5, halfHeight: 4.06 });

  let restartHovered = false;
  const update = (delta: number, _elapsed: number): void => {
    const targetScale = rest.restartScale * (restartHovered ? 1.07 : 1);
    const targetY = rest.restartY + (restartHovered ? 0.09 : 0);
    restart.scale.setScalar(damp(restart.scale.x, targetScale, 15, delta));
    restart.position.y = damp(restart.position.y, targetY, 15, delta);
  };

  const handle = createHandle(root, parts, targets, {
    setLayout: applyLayout,
    setHovered: (hovered) => {
      restartHovered = hovered;
    },
    open: () => timelines.run((timeline) => {
      root.userData.opened = true;
      timeline
        .to(thankTitle.scale, { x: rest.titleScale, y: rest.titleScale, z: rest.titleScale, duration: 0.55, ease: 'back.out(1.4)' }, 0)
        .to(rearPaper.position, { y: rest.rearPaperY, duration: 0.72 }, 0.12)
        .to(rearPaper.rotation, { z: REAR_PAPER_TILT, duration: 0.72 }, 0.12)
        .to(frontPaper.position, { y: rest.frontPaperY, duration: 0.68 }, 0.22)
        .to(message.position, { y: rest.messageY, duration: 0.68 }, 0.22);
    }),
    close: () => timelines.run((timeline) => {
      timeline
        .to([rearPaper.position, frontPaper.position, message.position], { y: -4, duration: 0.48 }, 0)
        .to(
          thankTitle.scale,
          { x: rest.titleScale * 0.86, y: rest.titleScale * 0.86, z: rest.titleScale * 0.86, duration: 0.4 },
          0.08,
        );
    }).finally(() => {
      root.userData.opened = false;
    }),
  }, update);
  const baseDispose = handle.dispose;
  handle.dispose = () => { timelines.killActiveTimeline(); baseDispose(); };
  return handle;
}
