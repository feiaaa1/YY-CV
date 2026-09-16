import * as THREE from 'three';
import { gsap } from 'gsap';
import { describe, expect, test } from 'vitest';
import { portfolioContent } from '../src/content/portfolio';
import { createFolderModel } from '../src/models/folder';
import { createOpenBookModel } from '../src/models/book';
import { createTicketStackModel } from '../src/models/ticket';
import { createThankYouModel } from '../src/models/thanks';
import { createCoverModel } from '../src/models/cover';
import { createDirectoryFolderModel } from '../src/models/directoryFolder';
import { createAboutCvModel } from '../src/models/aboutCv';
import { createScrapbookModel } from '../src/models/scrapbook';
import { createJourneyModel } from '../src/models/journey';
import { createPaperclip } from '../src/three/paperclip';

describe('procedural model contracts', () => {
  test('model handles expose live reduced-motion state', () => {
    const cover = createCoverModel(false);

    expect(cover.root.userData.reducedMotion).toBe(false);
    cover.actions.setReducedMotion(true);
    expect(cover.root.userData.reducedMotion).toBe(true);

    cover.dispose();
    expect(() => cover.dispose()).not.toThrow();
  });

  test('paperclip uses a continuous nested-loop metal wire with rounded terminals', () => {
    const clip = createPaperclip('#9BBFE0');
    const wire = clip.getObjectByName('wire') as THREE.Mesh;
    const material = wire.material as THREE.MeshStandardMaterial;
    wire.geometry.computeBoundingBox();
    const size = wire.geometry.boundingBox!.getSize(new THREE.Vector3());

    expect(clip.children).toHaveLength(3);
    expect(size.y).toBeGreaterThan(size.x * 1.2);
    expect(material.metalness).toBeGreaterThan(0.85);
    expect(material.roughness).toBeLessThan(0.3);
    clip.traverse((object) => object instanceof THREE.Mesh && object.geometry.dispose());
  });

  test('paperclip overall size can be reduced without changing its wire gauge', () => {
    const clip = createPaperclip('#9BBFE0', 1, 0.035, 0.62);
    const wire = clip.getObjectByName('wire') as THREE.Mesh;

    expect(clip.scale.x).toBeCloseTo(0.62);
    expect(clip.scale.y).toBeCloseTo(1);
    expect(clip.scale.z).toBeCloseTo(1);
    expect((wire.geometry as THREE.TubeGeometry).parameters.radius).toBeCloseTo(0.035);
    clip.traverse((object) => object instanceof THREE.Mesh && object.geometry.dispose());
  });

  test('reference cover exposes every identity-defining layer and flap hinge', () => {
    const cover = createCoverModel(true);
    expect([...cover.parts.keys()]).toEqual(expect.arrayContaining([
      'portfolio-title', 'year-script', 'folder-back', 'folder-tab', 'inner-sheet',
      'paper-sheet', 'paper-bottom-pivot', 'front-flap', 'greeting-carrier',
      'flap-label', 'folder-assembly', 'left-info', 'right-info', 'bottom-rail',
    ]));
    expect(cover.parts.get('folder-tab')).toBe(cover.parts.get('folder-back'));
    expect(cover.parts.get('paper-sheet')?.parent?.name).toBe('paper-bottom-pivot');
    expect(cover.parts.get('front-flap')?.parent?.name).toBe('front-flap-hinge');
    cover.dispose();
  });

  test('cover scales only the central folder while surrounding typography stays full size', async () => {
    const cover = createCoverModel(true);
    const assembly = cover.parts.get('folder-assembly')!;
    const title = cover.parts.get('portfolio-title')!;
    const year = cover.parts.get('year-script')!;
    const leftInfo = cover.parts.get('left-info')!;
    const rightInfo = cover.parts.get('right-info')!;

    expect(assembly.scale.toArray()).toEqual([0.85, 0.85, 0.85]);
    for (const typography of [title, year, leftInfo, rightInfo]) {
      expect(typography.parent).toBe(cover.root);
      expect(typography.scale.toArray()).toEqual([1, 1, 1]);
    }

    await cover.actions.open();
    await cover.actions.close();
    expect(assembly.scale.toArray()).toEqual([0.85, 0.85, 0.85]);
    cover.dispose();
  });

  test('cover greeting keeps its title and two subtitle rows visually separated', () => {
    const originalDocument = globalThis.document;
    const drawCalls: Array<{ text: string; y: number; fontSize: number }> = [];
    let currentFont = '';
    const context = {
      fillStyle: '',
      get font() { return currentFont; },
      set font(value: string) { currentFont = value; },
      textAlign: 'left',
      textBaseline: 'middle',
      clearRect: () => undefined,
      fillRect: () => undefined,
      measureText: (value: string) => ({ width: [...value].length * 16 }),
      fillText(value: string, _x: number, y: number) {
        drawCalls.push({
          text: value,
          y,
          fontSize: Number(/(\d+)px/.exec(currentFont)?.[1] ?? 0),
        });
      },
    } as unknown as CanvasRenderingContext2D;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => ({ width: 0, height: 0, getContext: () => context }),
      },
    });

    try {
      const cover = createCoverModel(true);
      const rows = ['韩婧仪', 'GINNY · 电商运营', 'E-COMMERCE OPERATIONS']
        .map((text) => drawCalls.find((call) => call.text === text)!);
      const [title, firstSubtitle, secondSubtitle] = rows;
      const bottom = (row: { y: number; fontSize: number }) => row.y + row.fontSize / 2;
      const top = (row: { y: number; fontSize: number }) => row.y - row.fontSize / 2;

      expect(bottom(title!)).toBeLessThan(top(firstSubtitle!));
      expect(bottom(firstSubtitle!)).toBeLessThan(top(secondSubtitle!));
      cover.dispose();
    } finally {
      if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document');
      else Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
    }
  });

  test('cover front flap is physically joined to the rear shell at one bottom seam', () => {
    const cover = createCoverModel(true);
    const rear = cover.parts.get('folder-back') as THREE.Mesh;
    const front = cover.parts.get('front-flap') as THREE.Mesh;
    const paper = cover.parts.get('paper-sheet') as THREE.Mesh;
    const hinge = cover.parts.get('front-flap-hinge') as THREE.Group;
    const paperPivot = cover.parts.get('paper-bottom-pivot') as THREE.Group;

    rear.geometry.computeBoundingBox();
    front.geometry.computeBoundingBox();
    paper.geometry.computeBoundingBox();
    const rearBottom = rear.position.y + rear.geometry.boundingBox!.min.y;
    const frontBottom = hinge.position.y + front.position.y + front.geometry.boundingBox!.min.y;
    const paperBottom = paperPivot.position.y + paper.position.y + paper.geometry.boundingBox!.min.y;
    const rearFrontSurface = rear.position.z + rear.geometry.boundingBox!.max.z;
    const frontBackSeam = hinge.position.z + front.position.z + front.geometry.boundingBox!.min.z;
    const rearWidth = rear.geometry.boundingBox!.max.x - rear.geometry.boundingBox!.min.x;
    const rearHeight = rear.geometry.boundingBox!.max.y - rear.geometry.boundingBox!.min.y;
    const frontHeight = front.geometry.boundingBox!.max.y - front.geometry.boundingBox!.min.y;
    const paperHeight = paper.geometry.boundingBox!.max.y - paper.geometry.boundingBox!.min.y;
    const horizontalProfile = (mesh: THREE.Mesh) => {
      const positions = mesh.geometry.getAttribute('position');
      const bounds = mesh.geometry.boundingBox!;
      const topXs: number[] = [];
      const bottomXs: number[] = [];
      for (let index = 0; index < positions.count; index += 1) {
        const y = positions.getY(index);
        if (y > bounds.max.y - 0.08) topXs.push(positions.getX(index));
        if (y < bounds.min.y + 0.08) bottomXs.push(positions.getX(index));
      }
      const topMin = Math.min(...topXs);
      const topMax = Math.max(...topXs);
      const bottomMin = Math.min(...bottomXs);
      const bottomMax = Math.max(...bottomXs);
      return {
        topWidth: topMax - topMin,
        bottomWidth: bottomMax - bottomMin,
        centerShift: (topMin + topMax - bottomMin - bottomMax) / 2,
      };
    };
    const frontProfile = horizontalProfile(front);
    const paperProfile = horizontalProfile(paper);

    expect(Math.abs(frontBottom - rearBottom)).toBeLessThan(0.025);
    expect(Math.abs(paperBottom - rearBottom)).toBeLessThan(0.025);
    expect(Math.abs(frontBackSeam - rearFrontSurface)).toBeLessThan(0.012);
    expect(Math.abs(frontProfile.bottomWidth - rearWidth)).toBeLessThan(0.13);
    expect(Math.abs(paperProfile.bottomWidth - rearWidth)).toBeLessThan(0.13);
    expect(Math.abs(frontProfile.topWidth - frontProfile.bottomWidth)).toBeLessThan(0.15);
    expect(frontProfile.centerShift).toBeGreaterThan(0.45);
    expect(Math.abs(paperProfile.topWidth - paperProfile.bottomWidth)).toBeLessThan(0.15);
    expect(paperProfile.centerShift).toBeGreaterThan(0.35);
    expect(frontHeight).toBeGreaterThan(3.55);
    expect(frontHeight).toBeLessThan(3.8);
    expect(paperHeight).toBeGreaterThan(3.85);
    expect(paperHeight).toBeLessThan(4.1);
    expect(rearHeight).toBeGreaterThan(4.5);
    expect(rearHeight).toBeLessThan(4.8);
    expect(hinge.position.x).toBeCloseTo(0.1);
    expect(paperHeight).toBeGreaterThan(frontHeight + 0.2);
    expect(paperHeight).toBeLessThan(rearHeight - 0.2);
    cover.dispose();
  });

  test('cover paper is a normally proportioned thick sheet inside the folder', () => {
    const cover = createCoverModel(true);
    const paper = cover.parts.get('paper-sheet') as THREE.Mesh;
    paper.geometry.computeBoundingBox();
    const size = paper.geometry.boundingBox!.getSize(new THREE.Vector3());

    expect(size.x).toBeGreaterThan(6.4);
    expect(size.y).toBeGreaterThan(3.55);
    expect(size.z).toBeGreaterThan(0.04);
    cover.dispose();
  });

  test('cover tab typography is a surface graphic and cannot occlude the rear shell', () => {
    const cover = createCoverModel(true);
    const label = cover.parts.get('tab-label') as THREE.Mesh;
    label.geometry.computeBoundingBox();
    const depth = label.geometry.boundingBox!.max.z - label.geometry.boundingBox!.min.z;
    const material = Array.isArray(label.material) ? label.material[0]! : label.material;

    expect(depth).toBe(0);
    expect(material.depthWrite).toBe(false);
    cover.dispose();
  });

  test('cover front typography sits above the flap surface', () => {
    const cover = createCoverModel(true);
    const front = cover.parts.get('front-flap') as THREE.Mesh;
    const greeting = cover.parts.get('greeting-carrier')!;
    const label = cover.parts.get('flap-label')!;
    front.geometry.computeBoundingBox();
    const frontSurface = front.position.z + front.geometry.boundingBox!.max.z;

    expect(greeting.position.z).toBeGreaterThan(frontSurface);
    expect(label.position.z).toBeGreaterThan(frontSurface);
    cover.dispose();
  });

  test('cover hover changes perspective through anchored pivots without moving the seam', () => {
    const cover = createCoverModel(false);
    const frontPivot = cover.parts.get('front-flap-hinge')!;
    const paperPivot = cover.parts.get('paper-bottom-pivot')!;
    const assembly = cover.parts.get('folder-assembly')!;
    const seamY = frontPivot.position.y;
    const initialFrontTilt = frontPivot.rotation.x;
    const initialPaperTilt = paperPivot.rotation.x;
    const initialAssemblyYaw = assembly.rotation.y;

    cover.root.userData.hoverPointer = { x: 0.8, y: 0.35 };
    cover.actions.setHovered(true);
    cover.update(1 / 15, 0);

    expect(frontPivot.rotation.x - initialFrontTilt).toBeGreaterThan(0.11);
    expect(paperPivot.rotation.x).toBeGreaterThan(initialPaperTilt);
    expect(initialAssemblyYaw).toBeCloseTo(0.18);
    expect(assembly.rotation.y - initialAssemblyYaw).toBeGreaterThan(0.085);
    expect(Math.abs(assembly.rotation.x)).toBeGreaterThan(0.015);
    expect(cover.root.rotation.y).toBe(0);
    expect(frontPivot.position.y).toBe(seamY);
    cover.dispose();
  });

  test('directory folder uses shallow pockets, a collage root and an outside label', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'sport', true);
    expect(folder.parts.has('front-pocket')).toBe(true);
    expect(folder.parts.has('rear-pocket')).toBe(true);
    expect(folder.parts.has('collage-root')).toBe(true);
    expect(folder.parts.has('outside-label')).toBe(true);
    expect(folder.parts.get('front-pocket')?.parent?.name).toBe('front-pocket-hinge');
    folder.dispose();
  });

  test('directory folder forms one equal-width bottom seam with an integrated rear tab', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'business', true);
    const rear = folder.parts.get('rear-pocket') as THREE.Mesh;
    const front = folder.parts.get('front-pocket') as THREE.Mesh;
    const hinge = folder.parts.get('front-pocket-hinge') as THREE.Group;
    rear.geometry.computeBoundingBox();
    front.geometry.computeBoundingBox();

    const rearBounds = rear.geometry.boundingBox!;
    const frontBounds = front.geometry.boundingBox!;
    const rearWidth = rearBounds.max.x - rearBounds.min.x;
    const frontWidth = frontBounds.max.x - frontBounds.min.x;
    const rearBottom = rear.position.y + rearBounds.min.y;
    const frontBottom = hinge.position.y + front.position.y + frontBounds.min.y;
    const rearHeight = rearBounds.max.y - rearBounds.min.y;
    const frontHeight = frontBounds.max.y - frontBounds.min.y;
    const rearDepth = rearBounds.max.z - rearBounds.min.z;
    const frontDepth = frontBounds.max.z - frontBounds.min.z;
    const rearMaterial = rear.material as THREE.MeshStandardMaterial;
    const frontMaterial = front.material as THREE.MeshStandardMaterial;
    const outsideLabel = folder.parts.get('outside-label')!;

    expect(folder.parts.get('rear-tab')).toBe(rear);
    expect(Math.abs(frontWidth - rearWidth)).toBeLessThan(0.04);
    expect(Math.abs(frontBottom - rearBottom)).toBeLessThan(0.02);
    expect(rearHeight).toBeGreaterThan(frontHeight + 0.65);
    expect(rearHeight / rearWidth).toBeGreaterThan(0.9);
    expect(frontHeight / frontWidth).toBeGreaterThan(0.54);
    expect(rearDepth).toBeLessThan(0.105);
    expect(frontDepth).toBeLessThan(0.115);
    expect(frontMaterial.color.getHex()).not.toBe(rearMaterial.color.getHex());
    expect([...folder.parts.keys()].filter((id) => id.startsWith('collage-piece-'))).toHaveLength(6);
    expect(outsideLabel.position.y).toBeGreaterThan(rearBottom - 0.27);
    expect(outsideLabel.position.y).toBeLessThan(rearBottom - 0.12);

    folder.dispose();
  });

  test('directory collage pieces stay paper-thin to prevent layer intersections', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'sport', true);
    for (const [name, object] of folder.parts) {
      if (!name.startsWith('collage-')) continue;
      if (!(object instanceof THREE.Mesh)) continue;
      object.geometry.computeBoundingBox();
      const size = object.geometry.boundingBox!.getSize(new THREE.Vector3());
      expect(Math.min(size.x, size.y, size.z)).toBeLessThan(0.012);
    }
    folder.dispose();
  });

  test.each(['sport', 'business', 'technology', 'culture', 'cinema'] as const)(
    '%s collage stays between the folder panels with controlled vertical variation',
    async (variant) => {
      const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, variant, true);
      const collage = folder.parts.get('collage-root')!;
      const rear = folder.parts.get('rear-pocket')!;
      const front = folder.parts.get('front-pocket')!;
      const rest = collage.position.clone();
      const assertBetweenPanels = () => {
        folder.root.updateMatrixWorld(true);
        const collageBounds = new THREE.Box3().setFromObject(collage);
        expect(collageBounds.min.z).toBeGreaterThan(new THREE.Box3().setFromObject(rear).max.z);
        expect(collageBounds.max.z).toBeLessThan(new THREE.Box3().setFromObject(front).max.z);
      };
      assertBetweenPanels();
      await folder.actions.open();
      await folder.actions.close();
      expect(collage.position.toArray()).toEqual(rest.toArray());
      assertBetweenPanels();
      folder.actions.setReducedMotion(false);
      folder.actions.setHovered(true);
      for (let index = 0; index < 60; index += 1) {
        folder.update(1 / 60, index / 60);
        assertBetweenPanels();
      }
      folder.actions.setHovered(false);
      for (let index = 0; index < 60; index += 1) {
        folder.update(1 / 60, index / 60);
        assertBetweenPanels();
      }
      const pieces = collage.children.filter((piece) => piece.name.startsWith('collage-piece-'));
      const frontTop = new THREE.Box3().setFromObject(front).max.y;
      const centers = pieces.map((piece) => piece.getWorldPosition(new THREE.Vector3()));
      expect(Math.min(...centers.map((center) => center.y))).toBeGreaterThan(frontTop);
      expect(Math.max(...centers.map((center) => center.x))
        - Math.min(...centers.map((center) => center.x))).toBeGreaterThanOrEqual(1.6);
      const verticalSpan = Math.max(...pieces.map((piece) => piece.position.y))
        - Math.min(...pieces.map((piece) => piece.position.y));
      expect(verticalSpan).toBeGreaterThanOrEqual(0.28);
      expect(verticalSpan).toBeLessThanOrEqual(0.36);
      folder.dispose();
    },
  );

  test('first directory folder spreads its five sticker assets across the front', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'sport', true);
    const collage = folder.parts.get('collage-root') as THREE.Group;
    const pieces = [...folder.parts.entries()]
      .filter(([name]) => name.startsWith('collage-piece-'))
      .map(([, object]) => object as THREE.Mesh);

    expect(pieces).toHaveLength(5);
    expect(pieces.map((piece) => piece.userData.stickerSource)).toEqual([
      'reader_king_of_the_book_hill.png',
      'russian_cute_flower.png',
      'duoduo_come_on.png',
      'uplift_each_other.png',
      'retro_boombox.png',
    ]);

    folder.root.updateMatrixWorld(true);
    for (const piece of pieces) {
      piece.geometry.computeBoundingBox();
      const size = piece.geometry.boundingBox!.getSize(new THREE.Vector3());
      const bounds = new THREE.Box3().setFromObject(piece);
      expect(Math.max(size.x, size.y)).toBeCloseTo(Number(piece.userData.normalizedSize));
      expect(Number(piece.userData.normalizedSize)).toBeGreaterThanOrEqual(0.5);
      expect(bounds.min.x).toBeGreaterThan(-1.34);
      expect(bounds.max.x).toBeLessThan(1.34);
      expect(bounds.max.y).toBeLessThan(1.42);
      expect(collage.position.z + piece.position.z).toBeLessThan(0.14);
    }
    expect(new Set(pieces.map((piece) => piece.rotation.z)).size).toBe(5);
    expect(new Set(pieces.map((piece) => piece.userData.normalizedSize)).size).toBeGreaterThan(1);
    expect(Number(pieces[0]?.userData.normalizedSize)).toBeCloseTo(0.955, 3);
    const verticalSpan = Math.max(...pieces.map((piece) => piece.position.y)) - Math.min(...pieces.map((piece) => piece.position.y));
    expect(verticalSpan).toBeGreaterThanOrEqual(0.28);
    expect(verticalSpan).toBeLessThanOrEqual(0.36);
    expect(pieces.some((piece) => piece.position.z > 0.006)).toBe(true);
    expect(Math.min(...pieces.map((piece) => piece.position.x))).toBeLessThan(-0.5);
    expect(Math.max(...pieces.map((piece) => piece.position.x))).toBeGreaterThan(0.5);
    folder.dispose();
  });

  test('second and third directory folders use their supplied sticker sets', () => {
    const uiFolder = createDirectoryFolderModel(portfolioContent.categories[1]!, 'business', true);
    const posterFolder = createDirectoryFolderModel(portfolioContent.categories[2]!, 'technology', true);
    expect([...uiFolder.parts.values()].filter((object) => object.userData.stickerSource)).toHaveLength(6);
    expect([...posterFolder.parts.values()].filter((object) => object.userData.stickerSource)).toHaveLength(5);
    expect(uiFolder.parts.get('collage-piece-0')?.userData.stickerSource).toBe('retro_boombox.png');
    expect(posterFolder.parts.get('collage-piece-0')?.userData.stickerSource).toBe('reader_monster_reader.png');
    uiFolder.dispose();
    posterFolder.dispose();
  });

  test('fourth directory folder uses the supplied illustration sticker set', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[3]!, 'culture', true);
    const pieces = [...folder.parts.values()].filter((object) => object.userData.stickerSource);

    expect(pieces).toHaveLength(5);
    expect(pieces.map((piece) => piece.userData.stickerSource)).toEqual([
      'reader_bedtime_reader.png',
      'duoduo_love_duoduo.png',
      'russian_deal_hands.png',
      'productivity_green_arrow.png',
      'retro_tv_face.png',
    ]);
    folder.dispose();
  });

  test('fifth directory folder uses the supplied project sticker set', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[4]!, 'cinema', true);
    const pieces = [...folder.parts.values()].filter((object) => object.userData.stickerSource);

    expect(pieces).toHaveLength(5);
    expect(pieces.map((piece) => piece.userData.stickerSource)).toEqual([
      'productivity_teamwork_badge.png',
      'russian_coffee.png',
      'retro_record_player.png',
      'reader_fantastic_dinosaur.png',
      'duoduo_full_marks.png',
    ]);
    folder.dispose();
  });

  test('directory hover opens only the front panel while the folder root stays fixed', () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'business', false);
    const hinge = folder.parts.get('front-pocket-hinge') as THREE.Group;
    const collage = folder.parts.get('collage-root') as THREE.Group;
    const rootPosition = folder.root.position.clone();
    const rootRotation = folder.root.rotation.clone();
    const initialCollageY = collage.position.y;

    folder.root.userData.hoverPointer = { x: 0.8, y: 0.4 };
    folder.actions.setHovered(true);
    folder.update(1 / 15, 0);

    expect(folder.root.position.toArray()).toEqual(rootPosition.toArray());
    expect(folder.root.rotation.toArray()).toEqual(rootRotation.toArray());
    expect(hinge.rotation.x).toBeGreaterThan(0.1);
    expect(collage.position.y).toBeGreaterThan(initialCollageY + 0.025);
    folder.dispose();
  });

  test('directory folder opens its front panel toward the camera from the fixed bottom hinge', async () => {
    const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'business', true);
    const hinge = folder.parts.get('front-pocket-hinge') as THREE.Group;
    const collage = folder.parts.get('collage-root') as THREE.Group;
    const seamY = hinge.position.y;
    const initialCollageY = collage.position.y;

    await folder.actions.open();

    expect(hinge.rotation.x).toBeGreaterThan(1.05);
    expect(hinge.position.y).toBe(seamY);
    expect(collage.position.y).toBeGreaterThan(initialCollageY + 0.18);
    folder.dispose();
  });

  test('folder exposes separately named, clickable and explodable parts', () => {
    const handle = createFolderModel({
      id: 'test-folder',
      color: '#77A3FF',
      title: { zh: '品牌视觉', en: 'Brand Identity' },
      variant: 'directory',
    });

    expect(handle.parts.has('back-panel')).toBe(true);
    expect(handle.parts.has('front-flap')).toBe(true);
    expect(handle.interactiveTargets.length).toBeGreaterThan(0);

    const initialX = handle.parts.get('front-flap')?.position.x;
    handle.actions.explode(1);
    expect(handle.parts.get('front-flap')?.position.x).not.toBe(initialX);
    handle.actions.reset();
    expect(handle.parts.get('front-flap')?.position.x).toBe(initialX);
    handle.dispose();
  });

  test('cover folder keeps its title carrier and inner sheet in front of the rear panel', () => {
    const cover = createFolderModel({
      id: 'cover-folder',
      color: '#F4C74A',
      secondaryColor: '#FFF4A6',
      title: { zh: '作品集', en: 'Portfolio' },
      variant: 'cover',
    });

    expect(cover.parts.has('cover-title')).toBe(true);
    expect(cover.parts.get('inner-sheet')!.position.z).toBeGreaterThan(
      cover.parts.get('back-panel')!.position.z + 0.16,
    );
    cover.dispose();
  });

  test('book and ticket detail models expose project navigation actions', () => {
    const bookCategory = portfolioContent.categories[0]!;
    const ticketCategory = portfolioContent.categories[1]!;
    const book = createOpenBookModel(bookCategory, 0);
    const ticket = createTicketStackModel(ticketCategory, 0);

    expect(book.parts.has('left-page')).toBe(true);
    expect(book.parts.has('right-page')).toBe(true);
    expect(ticket.parts.has('main-ticket')).toBe(true);
    expect(ticket.parts.has('serrated-edge')).toBe(true);
    for (const id of ['page-edge-left', 'page-edge-right', 'index-tabs', 'sticker-field']) {
      expect(book.parts.has(id)).toBe(true);
    }
    for (const id of ['rear-note', 'serial-tab', 'lower-strip']) {
      expect(ticket.parts.has(id)).toBe(true);
    }

    book.actions.setProject(2);
    ticket.actions.setProject(1);
    expect(book.root.userData.projectIndex).toBe(2);
    expect(ticket.root.userData.projectIndex).toBe(1);

    book.dispose();
    ticket.dispose();
  });

  test('book closes the entire composition, not only its page pivots', async () => {
    const book = createOpenBookModel(portfolioContent.categories[3]!, 0, true);
    book.root.scale.setScalar(1);
    await book.actions.close();
    expect(book.root.scale.x).toBeCloseTo(0.02);
    expect(book.root.scale.y).toBeCloseTo(0.02);
    expect(book.root.scale.z).toBeCloseTo(0.02);
    book.dispose();
  });

  test('book turns one physical leaf with independent front and back project content', async () => {
    const category = portfolioContent.categories[3]!;
    const book = createOpenBookModel(category, 0, true);
    const turningPage = book.parts.get('turning-page')!;
    const body = book.parts.get('turning-page-body') as THREE.Mesh;
    const front = book.parts.get('turning-page-front') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const back = book.parts.get('turning-page-back') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

    expect((body.geometry as THREE.BoxGeometry).parameters.depth).toBeGreaterThan(0);
    expect(front.material.map).not.toBe(back.material.map);
    expect(back.rotation.y).toBeCloseTo(Math.PI);

    await book.actions.open();
    const forwardTurn = book.actions.setProject(1);
    const rightPivot = book.parts.get('right-page')!;
    const rightPage = rightPivot.children[0] as THREE.Mesh;
    expect(turningPage.position.x).toBeCloseTo(rightPivot.position.x + rightPage.position.x);
    expect(
      book.parts.get('turning-page-pivot')!.position.z + front.position.z,
    ).toBeCloseTo((rightPage.geometry as THREE.BoxGeometry).parameters.depth / 2, 2);
    await forwardTurn;

    expect(turningPage.userData.frontProjectIndex).toBe(0);
    expect(turningPage.userData.backProjectIndex).toBe(1);
    expect(turningPage.userData.frontContent.title).toBe(category.projects[0]!.title.en);
    expect(turningPage.userData.backContent.title).toBe(category.projects[1]!.title.zh);
    expect(turningPage.visible).toBe(false);
    expect(book.root.userData.projectIndex).toBe(1);

    const backwardTurn = book.actions.setProject(0);
    const leftPivot = book.parts.get('left-page')!;
    const leftPage = leftPivot.children[0]!;
    expect(turningPage.position.x).toBeCloseTo(leftPivot.position.x + leftPage.position.x);
    await backwardTurn;
    expect(turningPage.userData.frontContent.title).toBe(category.projects[1]!.title.zh);
    expect(turningPage.userData.backContent.title).toBe(category.projects[0]!.title.en);
    book.dispose();
  });

  test('about CV is a fixed layered paper composition with independent clips and cards', async () => {
    const about = createAboutCvModel(portfolioContent.categories[0]!, true);

    expect([...about.parts.keys()]).toEqual(expect.arrayContaining([
      'ruled-background', 'main-board', 'cv-tab-stack', 'portrait-card',
      'about-print', 'abilities-cards', 'software-panel', 'personality-panel',
      'contact-panel', 'profile-strip',
      'corner-controls', 'close-tag', 'expand-hint',
    ]));
    expect(about.interactiveTargets.some((target) => target.userData.action === 'close-detail')).toBe(true);
    expect(about.interactiveTargets.some((target) => target.userData.action === 'visit-website')).toBe(false);

    await about.actions.open();
    expect(about.root.userData.open).toBe(true);
    expect(about.root.userData.projectIndex).toBe(0);
    about.actions.setProject(2);
    expect(about.root.userData.projectIndex).toBe(0);
    about.dispose();
  });

  test('about CV portrait keeps the source texture ratio and flat layout panels do not overlap', async () => {
    const about = createAboutCvModel(portfolioContent.categories[0]!, true);
    const portrait = about.parts.get('portrait-card') as THREE.Mesh;
    const software = about.parts.get('software-panel') as THREE.Mesh;
    const personality = about.parts.get('personality-panel') as THREE.Mesh;
    const abilityCards = [0, 1, 2].map((index) => about.parts.get(`ability-card-${index}`) as THREE.Mesh);
    about.root.updateMatrixWorld(true);
    const boxSize = (mesh: THREE.Mesh) => new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    const overlapsInXy = (first: THREE.Mesh, second: THREE.Mesh) => {
      const firstBox = new THREE.Box3().setFromObject(first);
      const secondBox = new THREE.Box3().setFromObject(second);
      return firstBox.min.x < secondBox.max.x && firstBox.max.x > secondBox.min.x
        && firstBox.min.y < secondBox.max.y && firstBox.max.y > secondBox.min.y;
    };

    const portraitSize = boxSize(portrait);
    expect(portraitSize.x / portraitSize.y).toBeCloseTo(620 / 790, 1);
    expect(portrait.userData.imageFit).toBe('contain');
    expect(overlapsInXy(portrait, software)).toBe(false);
    for (const card of abilityCards) expect(overlapsInXy(card, personality)).toBe(false);

    await about.actions.toggleExpanded();
    about.root.updateMatrixWorld(true);
    const flatPanels = [
      about.parts.get('cv-tab-stack') as THREE.Mesh,
      about.parts.get('about-print') as THREE.Mesh,
      portrait,
      software,
      about.parts.get('abilities-cards') as THREE.Mesh,
      personality,
      about.parts.get('contact-panel') as THREE.Mesh,
      about.parts.get('profile-strip') as THREE.Mesh,
      about.parts.get('corner-controls') as THREE.Mesh,
    ];
    for (const [index, panel] of flatPanels.entries()) {
      for (const other of flatPanels.slice(index + 1)) {
        expect(overlapsInXy(panel, other), `${panel.name} overlaps ${other.name}`).toBe(false);
      }
    }
    about.dispose();
  });

  test('about CV exposes a readable expand control that animates and restores the layout', async () => {
    const about = createAboutCvModel(portfolioContent.categories[0]!, false);
    const expand = about.parts.get('expand-control') as THREE.Mesh;
    const close = about.parts.get('close-tag') as THREE.Mesh;
    const hint = about.parts.get('expand-hint') as THREE.Mesh;
    const personality = about.parts.get('personality-panel')!;
    const initialPosition = personality.position.clone();
    const initialScale = personality.scale.clone();
    const actions = about.actions as typeof about.actions & { toggleExpanded(): void };

    expect(about.interactiveTargets).toContain(expand);
    expect(expand.userData.action).toBe('toggle-about-expanded');
    expect(hint.userData.hintStyle).toBe('hand-drawn-arrow');
    expect(hint.visible).toBe(true);
    expect((expand.geometry as THREE.BoxGeometry).parameters.width * expand.scale.x).toBeGreaterThanOrEqual(1);
    expect((close.geometry as THREE.BoxGeometry).parameters.width * close.scale.x).toBeGreaterThanOrEqual(1);

    const expandTransition = actions.toggleExpanded();
    expect(about.root.userData.layoutTransitioning).toBe(true);
    await expandTransition;
    expect(about.root.userData.expanded).toBe(true);
    expect(about.root.userData.layoutTransitioning).toBe(false);
    expect(expand.userData.label).toBe('收起');
    expect(hint.visible).toBe(false);
    expect(personality.scale.x).not.toBeCloseTo(initialScale.x);
    expect(personality.position.equals(initialPosition)).toBe(false);

    await actions.toggleExpanded();
    expect(about.root.userData.expanded).toBe(false);
    expect(expand.userData.label).toBe('展开');
    expect(hint.visible).toBe(true);
    expect(personality.scale.equals(initialScale)).toBe(true);
    expect(personality.position.equals(initialPosition)).toBe(true);
    about.dispose();
  });

  test('about CV hover feedback belongs to the exact portrait, panel, or ability card under the pointer', () => {
    const about = createAboutCvModel(portfolioContent.categories[0]!, false);
    const targetNames = [
      'portrait-card', 'software-panel', 'ability-card-0', 'ability-card-1',
      'ability-card-2', 'personality-panel', 'contact-panel',
    ];
    const targetParts = targetNames.map((name) => about.parts.get(name)!);
    const baseZ = new Map(targetParts.map((part) => [part, part.position.z]));
    const actions = about.actions as typeof about.actions & { setHoveredTarget(target: THREE.Object3D | null): void };

    for (const target of targetParts) {
      expect(about.interactiveTargets).toContain(target);
      actions.setHoveredTarget(target);
      about.actions.setHovered(true);
      for (let tick = 0; tick < 120; tick += 1) about.update(1 / 60, tick / 60);
      expect(target.position.z).toBeGreaterThan(baseZ.get(target)! + 0.05);
      for (const other of targetParts) {
        if (other === target) continue;
        expect(other.position.z).toBeCloseTo(baseZ.get(other)!, 3);
      }
      about.actions.setHovered(false);
      actions.setHoveredTarget(null);
      for (let tick = 0; tick < 120; tick += 1) about.update(1 / 60, tick / 60);
    }
    about.dispose();
  });


  test('scrapbook print coordinates cover the entire paper, including both sides of a turning leaf', () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true);
    for (const name of ['active-left-page-print', 'active-right-page-print', 'turning-page-front', 'turning-page-back']) {
      const mesh = scrapbook.root.getObjectByName(name) as THREE.Mesh;
      const uv = mesh.geometry.getAttribute('uv');
      const u = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
      const v = Array.from({ length: uv.count }, (_, i) => uv.getY(i));
      expect(Math.min(...u)).toBeCloseTo(0);
      expect(Math.max(...u)).toBeCloseTo(1);
      expect(Math.min(...v)).toBeCloseTo(0);
      expect(Math.max(...v)).toBeCloseTo(1);
    }
    scrapbook.dispose();
  });

  test('scrapbook supports a single spread with no active page-turn target', async () => {
    const category = portfolioContent.categories[1]!;
    const scrapbook = createScrapbookModel({ ...category, scrapbookPages: category.scrapbookPages!.slice(0, 1) }, true);
    expect(scrapbook.parts.get('page-counter')?.userData.pageLabel).toBe('1 / 1 Pages');
    expect(scrapbook.interactiveTargets.some((target) => ['next-project', 'previous-project'].includes(target.userData.action))).toBe(false);
    await scrapbook.actions.setProject(9);
    expect(scrapbook.root.userData.projectIndex).toBe(0);
    scrapbook.dispose();
  });

  test('scrapbook exposes content-driven bounded page states and spine-anchored navigation', async () => {
    const category = portfolioContent.categories[1]!;
    const scrapbook = createScrapbookModel(category, true);

    expect([...scrapbook.parts.keys()]).toEqual(expect.arrayContaining([
      'inactive-page-0', 'inactive-page-1', 'inactive-page-2', 'inactive-page-3',
      'left-page-pivot', 'right-page-pivot', 'active-left-page', 'active-right-page',
      'center-binding', 'left-collage', 'right-collage', 'page-counter',
      'close-tag',
    ]));
    expect(scrapbook.parts.has('previous-arrow')).toBe(false);
    expect(scrapbook.parts.has('next-arrow')).toBe(false);
    expect(scrapbook.interactiveTargets.some((target) => target.userData.action === 'previous-project')).toBe(false);
    expect(scrapbook.interactiveTargets.some((target) => target.userData.action === 'next-project')).toBe(true);
    expect(scrapbook.root.userData.projectIndex).toBe(0);

    const last = category.scrapbookPages!.length - 1;
    await scrapbook.actions.setProject(99);
    expect(scrapbook.root.userData.projectIndex).toBe(last);
    expect(scrapbook.parts.get('page-counter')?.userData.pageLabel).toBe(`${last + 1} / ${last + 1} Pages`);
    expect(scrapbook.parts.get('active-left-page')?.userData.pageId).toBe(category.scrapbookPages![last]!.id);

    await scrapbook.actions.setProject(-3);
    expect(scrapbook.root.userData.projectIndex).toBe(0);
    scrapbook.dispose();
  });

  test('education scrapbook can open on the master page and exposes direct degree bookmarks', () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true, 0);
    const bachelor = scrapbook.parts.get('education-bookmark-bachelor')!;
    const master = scrapbook.parts.get('education-bookmark-master')!;

    expect(scrapbook.root.userData.projectIndex).toBe(0);
    expect(scrapbook.parts.get('active-left-page')?.userData.pageId).toBe('bsu-1');
    expect(bachelor.userData).toMatchObject({ action: 'select-project-index', projectIndex: 1 });
    expect(master.userData).toMatchObject({ action: 'select-project-index', projectIndex: 0 });
    expect(scrapbook.interactiveTargets).toEqual(expect.arrayContaining([bachelor, master]));
    scrapbook.dispose();
  });

  test('scrapbook turns a dedicated double-sided leaf without snapping resting pages across the spine', async () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true);
    const turningPivot = scrapbook.parts.get('turning-page-pivot');
    const turningPage = scrapbook.parts.get('turning-page');

    expect(turningPivot).toBeDefined();
    expect(turningPage?.parent).toBe(turningPivot);
    await scrapbook.actions.setProject(1);
    expect(turningPivot?.rotation.y).toBeCloseTo(0);
    expect(turningPage?.visible).toBe(false);
    expect(scrapbook.parts.get('left-page-pivot')?.rotation.y).toBeCloseTo(0);
    expect(scrapbook.parts.get('right-page-pivot')?.rotation.y).toBeCloseTo(0);
    scrapbook.dispose();
  });

  test('scrapbook lands a turned leaf at the resting page depth without a second page adjustment', async () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, false);
    await scrapbook.actions.open();
    scrapbook.actions.setHovered(true);
    scrapbook.root.userData.hoverPointer = { x: .7, y: -.4 };
    scrapbook.update(.2, 0);
    const hoverRotation = scrapbook.parts.get('book-hover-rig')!.rotation.y;

    await scrapbook.actions.setProject(1);

    const leftPivot = scrapbook.parts.get('left-page-pivot')!;
    const rightPivot = scrapbook.parts.get('right-page-pivot')!;
    const turningPivot = scrapbook.parts.get('turning-page-pivot')!;
    expect(leftPivot.rotation.y).toBeCloseTo(.16);
    expect(rightPivot.rotation.y).toBeCloseTo(-.16);
    expect(turningPivot.position.z).toBeCloseTo(leftPivot.position.z);
    expect(scrapbook.parts.get('book-hover-rig')!.rotation.y).toBeCloseTo(hoverRotation);

    scrapbook.update(.016, 1);
    expect(leftPivot.rotation.y).toBeCloseTo(.16);
    expect(rightPivot.rotation.y).toBeCloseTo(-.16);
    scrapbook.dispose();
  });

  test('scrapbook omits separate arrow graphics', () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true);
    expect(scrapbook.parts.has('previous-arrow')).toBe(false);
    expect(scrapbook.parts.has('next-arrow')).toBe(false);
    scrapbook.dispose();
  });

  test('scrapbook close control uses white background and black text', () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true);
    const closeTag = scrapbook.parts.get('close-tag')!;
    const label = closeTag.getObjectByName('close-tag-label') as THREE.Mesh;
    const materials = Array.isArray(label.material) ? label.material : [label.material];

    expect(closeTag.position.x).toBeGreaterThan(4.5);
    expect(closeTag.position.y).toBeLessThan(-3.1);
    expect(materials.some((material) => material instanceof THREE.MeshStandardMaterial && material.color.getHex() === 0xfffdf6)).toBe(true);
    scrapbook.dispose();
  });

  test('scrapbook keeps a stable V angle while the whole book responds to hover', async () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true);
    const hoverRig = scrapbook.parts.get('book-hover-rig');
    const leftPivot = scrapbook.parts.get('left-page-pivot');
    const rightPivot = scrapbook.parts.get('right-page-pivot');
    const leftCollage = scrapbook.parts.get('left-collage');
    const rightCollage = scrapbook.parts.get('right-collage');

    expect(scrapbook.parts.has('left-corner-fold-flap')).toBe(false);
    expect(scrapbook.parts.has('right-corner-fold-flap')).toBe(false);
    expect(hoverRig).toBeDefined();

    await scrapbook.actions.open();

    expect(leftPivot?.rotation.y).toBeGreaterThan(0.1);
    expect(rightPivot?.rotation.y).toBeLessThan(-0.1);
    expect(Math.abs((leftPivot?.rotation.y ?? 0) + (rightPivot?.rotation.y ?? 0))).toBeLessThan(0.02);
    expect(leftCollage?.parent).toBe(leftPivot);
    expect(rightCollage?.parent).toBe(rightPivot);
    const restingAngle = leftPivot?.rotation.y ?? 0;

    scrapbook.actions.setReducedMotion(false);
    scrapbook.root.userData.hoverPointer = { x: 0.9, y: 0.7 };
    scrapbook.actions.setHovered(true);
    scrapbook.update(1 / 12, 0);

    expect(hoverRig?.rotation.y).toBeGreaterThan(0.045);
    expect(Math.abs(hoverRig?.rotation.x ?? 0)).toBeGreaterThan(0.018);
    expect(leftPivot?.rotation.y).toBeCloseTo(restingAngle);
    expect(rightPivot?.rotation.y).toBeCloseTo(-restingAngle);
    expect(scrapbook.root.rotation.y).toBe(0);
    scrapbook.dispose();
  });

  test('internship board exposes the supplied artwork and internship label images', () => {
    const journey = createJourneyModel(portfolioContent.categories[2]!, true);

    expect([...journey.parts.keys()]).toEqual(expect.arrayContaining([
      'board-back', 'corkboard-background', 'lined-paper', 'torn-paper', 'calendar',
      'photo-stack', 'flower-decoration', 'heart-decoration', 'keychain-decoration',
      'internship-label-migu', 'internship-label-youdao',
      'internship-label-kuaishou', 'internship-label-jd', 'close-tag',
    ]));
    expect(journey.interactiveTargets.some((target) => target.userData.action === 'journey-hover-surface')).toBe(true);
    const highestArtworkZ = Math.max(
      journey.parts.get('lined-paper')!.position.z,
      journey.parts.get('photo-stack')!.position.z,
      journey.parts.get('keychain-decoration')!.position.z,
    );
    const jdLabel = journey.parts.get('internship-label-jd') as THREE.Mesh;
    const miguLabel = journey.parts.get('internship-label-migu') as THREE.Mesh;
    expect(jdLabel.position.z).toBeGreaterThan(highestArtworkZ);
    expect(jdLabel.castShadow).toBe(true);
    expect(jdLabel.userData.assetSource).toBe('internship_label_jd.png');
    expect(journey.interactiveTargets).toEqual(expect.arrayContaining([
      miguLabel,
      journey.parts.get('internship-label-youdao'),
      journey.parts.get('internship-label-kuaishou'),
      jdLabel,
    ]));
    [miguLabel, journey.parts.get('internship-label-youdao'), journey.parts.get('internship-label-kuaishou'), jdLabel]
      .forEach((label, stationIndex) => {
        expect(label?.userData).toMatchObject({ action: 'select-journey-station', stationIndex });
      });
    const labels = ['migu', 'youdao', 'kuaishou', 'jd']
      .map((id) => journey.parts.get(`internship-label-${id}`) as THREE.Mesh<THREE.PlaneGeometry>);
    expect(labels.every((label) => label.geometry.parameters.width >= 2.37)).toBe(true);
    expect(labels.every((label) => label.geometry.parameters.width <= 2.58)).toBe(true);
    expect(labels.some((label) => label.rotation.z < -0.08)).toBe(true);
    expect(labels.some((label) => label.rotation.z > 0.08)).toBe(true);
    for (let index = 1; index < labels.length; index += 1) {
      const previous = labels[index - 1]!;
      const current = labels[index]!;
      const combinedHalfWidth = (previous.geometry.parameters.width + current.geometry.parameters.width) / 2;
      expect(previous.position.distanceTo(current.position)).toBeLessThan(combinedHalfWidth);
    }
    journey.dispose();
  });

  test('internship board opens and closes each supplied detail paper', async () => {
    const journey = createJourneyModel(portfolioContent.categories[2]!, true);
    const popup = journey.parts.get('internship-detail-popup')!;
    const backdrop = journey.parts.get('internship-detail-backdrop') as THREE.Mesh;
    const details = ['migu', 'youdao', 'kuaishou', 'jd'];

    expect(popup.visible).toBe(false);
    expect(backdrop.userData.action).toBe('close-journey-popup');
    backdrop.geometry.computeBoundingBox();
    const backdropSize = backdrop.geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(backdropSize.x).toBeGreaterThanOrEqual(40);
    expect(backdropSize.y).toBeGreaterThanOrEqual(40);
    for (const [index, id] of details.entries()) {
      const detail = journey.parts.get(`internship-detail-${id}`) as THREE.Mesh;
      expect(detail.userData.assetSource).toBe(`internship_detail_${id}.png`);
      await journey.actions.setProject(index);
      expect(popup.visible).toBe(true);
      expect(detail.visible).toBe(true);
      expect(detail.scale.x).toBe(1);
      expect((detail.material as THREE.MeshBasicMaterial).opacity).toBe(1);

      await journey.actions.setProject(-1);
      expect(popup.visible).toBe(false);
      expect(detail.visible).toBe(false);
    }
    journey.dispose();
  });

  test('internship labels use interruptible GSAP hover lift and scale feedback', () => {
    const journey = createJourneyModel(portfolioContent.categories[2]!, false);
    const label = journey.parts.get('internship-label-youdao')!;
    const restZ = label.position.z;

    journey.actions.setHoveredTarget(label);
    for (const tween of gsap.getTweensOf([label.scale, label.position])) tween.progress(1);
    expect(label.scale.x).toBeCloseTo(1.06);
    expect(label.position.z).toBeCloseTo(restZ + 0.1);

    journey.actions.setHoveredTarget(null);
    for (const tween of gsap.getTweensOf([label.scale, label.position])) tween.progress(1);
    expect(label.scale.x).toBe(1);
    expect(label.position.z).toBeCloseTo(restZ);
    journey.dispose();
  });

  test('thank-you model exposes restart as a Three.js interaction target', () => {
    const thanks = createThankYouModel({ zh: '感谢观看', en: 'THANK YOU' }, 'hello@example.com');
    expect(thanks.interactiveTargets.some((target) => target.userData.action === 'restart')).toBe(true);
    expect([...thanks.parts.keys()]).toEqual(expect.arrayContaining([
      'thank-you-title', 'year-script', 'rear-paper', 'front-paper',
      'message-carrier', 'contact-line', 'bottom-rail', 'restart-tab',
    ]));
    thanks.dispose();
  });
});
