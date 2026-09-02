import * as THREE from 'three';
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

describe('procedural model contracts', () => {
  test('model handles expose live reduced-motion state', () => {
    const cover = createCoverModel(false);

    expect(cover.root.userData.reducedMotion).toBe(false);
    cover.actions.setReducedMotion(true);
    expect(cover.root.userData.reducedMotion).toBe(true);

    cover.dispose();
    expect(() => cover.dispose()).not.toThrow();
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
    expect([...folder.parts.keys()].filter((id) => id.startsWith('collage-backing-'))).toHaveLength(5);
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

  test('about CV is a fixed layered paper composition with independent clips and cards', async () => {
    const about = createAboutCvModel(portfolioContent.categories[0]!, true);

    expect([...about.parts.keys()]).toEqual(expect.arrayContaining([
      'ruled-background', 'main-board', 'cv-tab-stack', 'portrait-card',
      'about-print', 'abilities-cards', 'software-panel', 'experience-panel',
      'contact-panel', 'brown-paperclip', 'red-paperclip', 'website-button',
      'corner-controls', 'close-tag',
    ]));
    expect(about.interactiveTargets.some((target) => target.userData.action === 'close-detail')).toBe(true);
    expect(about.interactiveTargets.some((target) => target.userData.action === 'visit-website')).toBe(true);

    await about.actions.open();
    expect(about.root.userData.open).toBe(true);
    expect(about.root.userData.projectIndex).toBe(0);
    about.actions.setProject(2);
    expect(about.root.userData.projectIndex).toBe(0);
    about.dispose();
  });

  test('scrapbook exposes five bounded page states and spine-anchored navigation', async () => {
    const category = portfolioContent.categories[1]!;
    const scrapbook = createScrapbookModel(category, true);

    expect([...scrapbook.parts.keys()]).toEqual(expect.arrayContaining([
      'inactive-page-0', 'inactive-page-1', 'inactive-page-2', 'inactive-page-3',
      'left-page-pivot', 'right-page-pivot', 'active-left-page', 'active-right-page',
      'center-binding', 'left-collage', 'right-collage', 'page-counter',
      'previous-arrow', 'next-arrow', 'close-tag',
    ]));
    expect(scrapbook.interactiveTargets.some((target) => target.userData.action === 'previous-project')).toBe(true);
    expect(scrapbook.interactiveTargets.some((target) => target.userData.action === 'next-project')).toBe(true);
    expect(scrapbook.root.userData.projectIndex).toBe(0);

    await scrapbook.actions.setProject(4);
    expect(scrapbook.root.userData.projectIndex).toBe(4);
    expect(scrapbook.parts.get('page-counter')?.userData.pageLabel).toBe('5 / 5 Pages');
    expect(scrapbook.parts.get('active-left-page')?.userData.pageId).toBe('thanks');
    expect(scrapbook.parts.get('previous-arrow')?.visible).toBe(true);
    expect(scrapbook.parts.get('next-arrow')?.visible).toBe(false);

    await scrapbook.actions.setProject(-3);
    expect(scrapbook.root.userData.projectIndex).toBe(0);
    expect(scrapbook.parts.get('previous-arrow')?.visible).toBe(false);
    expect(scrapbook.parts.get('next-arrow')?.visible).toBe(true);
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

  test('scrapbook arrow graphics are large enough to remain legible', () => {
    const scrapbook = createScrapbookModel(portfolioContent.categories[1]!, true);
    const label = scrapbook.parts.get('previous-arrow')?.getObjectByName('previous-arrow-label') as THREE.Mesh | undefined;
    expect(label).toBeDefined();
    label?.geometry.computeBoundingBox();
    const size = label?.geometry.boundingBox?.getSize(new THREE.Vector3());
    expect(size?.x).toBeGreaterThanOrEqual(0.7);
    expect(size?.y).toBeGreaterThanOrEqual(0.55);
    scrapbook.dispose();
  });

  test('scrapbook opens into a persistent V angle instead of flattening at the spine', async () => {
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
    expect(leftPivot?.rotation.y).toBeGreaterThan(restingAngle);
    expect(rightPivot?.rotation.y).toBeLessThan(-restingAngle);
    expect(scrapbook.root.rotation.y).toBe(0);
    scrapbook.dispose();
  });

  test('journey invitation exposes the layered case, route and four independent stations', () => {
    const journey = createJourneyModel(portfolioContent.categories[2]!, true);

    expect([...journey.parts.keys()]).toEqual(expect.arrayContaining([
      'outer-case', 'inner-rim', 'invitation-sheet', 'blue-scallop-header',
      'coral-scallop-header', 'journey-title', 'journey-route', 'pennant-string',
      'cloud-field', 'balloon-left', 'balloon-right', 'bottom-ribbon', 'paperclip',
      'station-0', 'station-1', 'station-2', 'station-3', 'experience-popup',
      'popup-close', 'close-tag',
    ]));
    expect([...journey.parts.keys()].filter((id) => id.startsWith('route-dash-')).length).toBeGreaterThanOrEqual(10);
    expect([...journey.parts.keys()].filter((id) => id.startsWith('decoration-')).length).toBeGreaterThanOrEqual(12);
    expect(journey.interactiveTargets.filter((target) => target.userData.action === 'select-journey-station')).toHaveLength(4);
    expect(journey.interactiveTargets.some((target) => target.userData.action === 'journey-hover-surface')).toBe(true);
    journey.dispose();
  });

  test('journey selection lifts one station and opens its matching experience card', async () => {
    const journey = createJourneyModel(portfolioContent.categories[2]!, true);
    const selectedStation = journey.parts.get('station-2');
    const otherStation = journey.parts.get('station-0');
    const popup = journey.parts.get('experience-popup');
    const selectedStart = selectedStation?.position.clone();

    expect(popup?.visible).toBe(false);
    await journey.actions.open();
    const reveal = journey.actions.setProject(2);

    expect(journey.root.userData.selectedStation).toBe(2);
    expect(popup?.visible).toBe(true);
    expect(popup?.userData.experienceId).toBe('internship-03');
    expect(selectedStation?.scale.x).toBeGreaterThan(otherStation?.scale.x ?? 0);
    expect(popup?.scale.x).toBeLessThan(0.2);
    await reveal;
    expect(popup?.scale.x).toBeCloseTo(1);
    expect(selectedStation?.position.y).toBeGreaterThan(selectedStart?.y ?? 0);
    expect(selectedStation?.position.z).toBeGreaterThan(selectedStart?.z ?? 0);
    let dimmedOpacity = 1;
    otherStation?.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        dimmedOpacity = Math.min(dimmedOpacity, object.material.opacity);
      }
    });
    expect(dimmedOpacity).toBeLessThan(0.75);

    const dismiss = journey.actions.setProject(-1);
    expect(journey.root.userData.selectedStation).toBe(-1);
    expect(popup?.visible).toBe(true);
    await dismiss;
    expect(popup?.visible).toBe(false);
    expect(selectedStation?.position.y).toBeCloseTo(selectedStart?.y ?? 0);
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
