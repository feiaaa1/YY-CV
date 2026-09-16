import * as THREE from 'three';
import type { gsap } from 'gsap';
import { createTimelineController, type TimelineController } from '../animation/timelines';
import type { Category, PortfolioContent } from '../content/types';
import { COVER_RIGHT_CAPTION_X, coverTitleStickerUrl, createCoverModel } from '../models/cover';
import {
  createDirectoryFolderModel,
  directoryStickerAssetUrls,
  type CollageVariant,
} from '../models/directoryFolder';
import {
  createDirectoryTitleControl,
  createFinishBrowsingControl,
  directoryControlAssetUrls,
  directoryTitleControlWidth,
  finishBrowsingControlWidth,
} from '../models/directoryControls';
import { createThankYouModel } from '../models/thanks';
import { damp, disposeObject, type SculptModelHandle } from '../three/runtime';
import {
  getCoverScale,
  getDetailScale,
  getDirectoryLayout,
  getJourneyPopupFit,
  getRenderProfile,
  type JourneyPopupFit,
  type RenderProfile,
} from './layout';
import {
  createPointerSession,
  createWheelGestureGate,
  isHorizontalSwipe,
  isPageablePresentation,
  normalizeWheelDelta,
} from './gesturePolicy';
import { resolveInteractionAction } from './interactions';
import { countProjects, describeScreen } from './accessibility';
import { findCategory } from './categories';
import {
  findSheetTextPage,
  SHEET_TEXT_HEIGHT,
  SHEET_TEXT_WIDTH,
  type SheetTextBlock,
} from '../content/internshipSheetText';
import {
  createEducationArtworkElement,
  educationAssetUrls,
  hasEducationArtwork,
  loadEducationArtwork,
} from '../education/artwork';
import {
  createHonorsArtworkElement,
  honorsAssetUrls,
  hasHonorsArtwork,
  loadHonorsArtwork,
} from '../education/honorsArtwork';
import {
  bsuAssetUrls,
  createBsuArtworkElement,
  hasBsuArtwork,
  loadBsuArtwork,
} from '../education/bsuArtwork';
import {
  bsuRightAssetUrls,
  createBsuRightArtworkElement,
  hasBsuRightArtwork,
  loadBsuRightArtwork,
} from '../education/bsuRightArtwork';
import { educationBookmarkAssetUrls, loadEducationBookmarks } from '../education/bookmarks';
import { runLockedTransition } from './transitions';
import { preloadImageAssets } from '../performance/imageAssets';
import {
  createExperienceState,
  reduceExperience,
  type ExperienceAction,
  type ExperienceScreen,
  type ExperienceState,
} from './stateMachine';

type PointerSnapshot = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  /** Popup offset when the drag started, so panning stays absolute. */
  popupPanX?: number;
  popupPanY?: number;
};

type PopupPan = { x: number; y: number };

const LOADING_LABEL_COPY = '网页加载中';
const LOADING_LABEL_DOT_COUNT = 3;

export type ScreenModelRegistry = {
  cover: SculptModelHandle;
  directory: SculptModelHandle[];
  detail: SculptModelHandle | null;
  thanks: SculptModelHandle;
};

export function selectActiveModelHandles(
  screen: ExperienceScreen,
  registry: ScreenModelRegistry,
): SculptModelHandle[] {
  if (screen === 'cover') return [registry.cover];
  if (screen === 'directory') return registry.directory;
  if (screen === 'detail') return registry.detail ? [registry.detail] : [];
  return [registry.thanks];
}

export function addDirectoryEntranceAnimations(
  timeline: gsap.core.Timeline,
  folders: SculptModelHandle[],
): void {
  folders.forEach((handle, folderIndex) => {
    const root = handle.root;
    const targetPosition = root.position.clone();
    const targetScale = root.scale.x;
    const targetRotation = root.rotation.z;
    const folderStart = folderIndex * 0.11;

    timeline
      .fromTo(root.position, {
        x: targetPosition.x,
        y: targetPosition.y - 0.72,
        z: -0.55,
      }, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: 'back.out(1.25)',
      }, folderStart)
      .fromTo(root.scale, {
        x: targetScale * 0.76,
        y: targetScale * 0.76,
        z: targetScale * 0.76,
      }, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        ease: 'back.out(1.35)',
      }, folderStart)
      .fromTo(root.rotation, {
        z: targetRotation + (folderIndex % 2 === 0 ? -0.08 : 0.08),
      }, {
        z: targetRotation,
        ease: 'power2.out',
      }, folderStart);

    const collage = handle.parts.get('collage-root');
    if (!collage) return;
    const collagePosition = collage.position.clone();
    const collageScale = collage.scale.clone();
    const collageRotation = collage.rotation.z;
    const collageStart = folderStart + 0.16;
    timeline
      .fromTo(collage.position, {
        x: collagePosition.x,
        y: collagePosition.y - 0.34,
        z: collagePosition.z - 0.035,
      }, {
        x: collagePosition.x,
        y: collagePosition.y,
        z: collagePosition.z,
        ease: 'back.out(1.55)',
      }, collageStart)
      .fromTo(collage.scale, {
        x: collageScale.x * 0.72,
        y: collageScale.y * 0.72,
        z: collageScale.z * 0.72,
      }, {
        x: collageScale.x,
        y: collageScale.y,
        z: collageScale.z,
        ease: 'back.out(1.8)',
      }, collageStart)
      .fromTo(collage.rotation, {
        z: collageRotation + (folderIndex % 2 === 0 ? -0.08 : 0.08),
      }, {
        z: collageRotation,
        ease: 'back.out(1.4)',
      }, collageStart);
  });
}

export class PortfolioExperience {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(2, 2);
  private readonly modelHandles = new Set<SculptModelHandle>();
  private readonly targetOwners = new Map<THREE.Object3D, SculptModelHandle>();
  private readonly directoryGroup = new THREE.Group();
  private readonly folderHandles = new Map<string, SculptModelHandle>();
  private readonly preparedDetailHandles = new Map<string, SculptModelHandle>();
  private readonly accessibilityLayer: HTMLDivElement;
  private readonly liveRegion: HTMLDivElement;
  private readonly semanticRegion: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly loadingOverlay: HTMLDivElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly finishTag: THREE.Group;
  private readonly directoryHeader: THREE.Group;
  private readonly coverHandle: SculptModelHandle;
  private readonly thanksHandle: SculptModelHandle;
  private readonly screenModels: ScreenModelRegistry;
  private keyLight!: THREE.DirectionalLight;
  private detailHandle: SculptModelHandle | null = null;
  private aboutPage: { dispose: () => void } | null = null;
  private state: ExperienceState;
  private hoveredHandle: SculptModelHandle | null = null;
  private finishTagHovered = false;
  private finishTagPressed = false;
  private finishTagBaseScale = 1;
  private finishTagRestY = 3.45;
  private readonly pointerSession = createPointerSession<PointerSnapshot>();
  private readonly wheelGestureGate = createWheelGestureGate({ threshold: 24, cooldownMs: 450, idleResetMs: 180 });
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly directoryEntrance: TimelineController;
  private dragDistance = 0;
  private frameId = 0;
  private destroyed = false;
  private bootReady = false;
  private renderProfile: RenderProfile = { isMobile: false, pixelRatio: 1, shadowMapSize: 1024 };
  private profiledScreen: ExperienceScreen | null = null;
  private sheetTextOverlay: HTMLDivElement | null = null;
  private directoryAssetsPromise: Promise<string[]> | null = null;
  private directoryReady = false;

  constructor(private readonly container: HTMLElement, private readonly content: PortfolioContent) {
    const prefersReducedMotion = this.reducedMotionQuery.matches;
    this.directoryEntrance = createTimelineController({ reducedMotion: () => this.state.reducedMotion });
    this.state = createExperienceState(prefersReducedMotion);
    this.scene.background = new THREE.Color('#2B82EE');

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.container.append(this.renderer.domElement);

    this.accessibilityLayer = document.createElement('div');
    this.accessibilityLayer.className = 'sr-controls';
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.semanticRegion = document.createElement('div');
    this.accessibilityLayer.append(this.liveRegion, this.semanticRegion);
    this.container.append(this.accessibilityLayer);

    this.toast = document.createElement('div');
    this.toast.className = 'scene-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.dataset.visible = 'false';
    this.container.append(this.toast);

    const initialLoader = this.container.querySelector<HTMLDivElement>('#initial-loader');
    this.loadingOverlay = initialLoader ?? document.createElement('div');
    this.loadingOverlay.className = 'scene-loader';
    this.loadingOverlay.dataset.visible = 'true';
    this.loadingOverlay.setAttribute('role', 'status');
    this.loadingOverlay.setAttribute('aria-live', 'polite');
    this.loadingOverlay.setAttribute('aria-label', '正在加载完整体验');
    let loadingGraphic = this.loadingOverlay.querySelector<SVGSVGElement>('.pl');
    if (!loadingGraphic) {
      const svgNamespace = 'http://www.w3.org/2000/svg';
      loadingGraphic = document.createElementNS(svgNamespace, 'svg');
      loadingGraphic.classList.add('pl');
      loadingGraphic.setAttribute('width', '240');
      loadingGraphic.setAttribute('height', '240');
      loadingGraphic.setAttribute('viewBox', '0 0 240 240');
      loadingGraphic.setAttribute('aria-hidden', 'true');
      const rings = [
        ['a', '120', '120', '105', '0 660', '-330'],
        ['b', '120', '120', '35', '0 220', '-110'],
        ['c', '85', '120', '70', '0 440', '0'],
        ['d', '155', '120', '70', '0 440', '0'],
      ] as const;
      for (const [variant, cx, cy, radius, dasharray, dashoffset] of rings) {
        const circle = document.createElementNS(svgNamespace, 'circle');
        circle.classList.add('pl__ring', `pl__ring--${variant}`);
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#000');
        circle.setAttribute('stroke-width', '20');
        circle.setAttribute('stroke-dasharray', dasharray);
        circle.setAttribute('stroke-dashoffset', dashoffset);
        circle.setAttribute('stroke-linecap', 'round');
        loadingGraphic.append(circle);
      }
    }
    let loadingLabel = this.loadingOverlay.querySelector<HTMLParagraphElement>('.scene-loader__label');
    if (!loadingLabel) {
      loadingLabel = document.createElement('p');
      loadingLabel.className = 'scene-loader__label';
      loadingLabel.setAttribute('aria-hidden', 'true');
      const loadingLabelText = document.createElement('span');
      loadingLabelText.className = 'scene-loader__label-text';
      loadingLabelText.dataset.text = LOADING_LABEL_COPY;
      loadingLabelText.textContent = LOADING_LABEL_COPY;
      loadingLabel.append(loadingLabelText);
      const dots = document.createElement('span');
      dots.className = 'scene-loader__label-dots';
      for (let index = 0; index < LOADING_LABEL_DOT_COUNT; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'scene-loader__label-dot';
        dots.append(dot);
      }
      loadingLabel.append(dots);
    }
    if (!initialLoader) {
      this.loadingOverlay.append(loadingGraphic, loadingLabel);
      this.container.append(this.loadingOverlay);
    }

    this.addLighting();
    this.coverHandle = createCoverModel(prefersReducedMotion);
    this.coverHandle.root.position.set(0, -0.12, 0);
    this.scene.add(this.coverHandle.root);
    this.registerHandle(this.coverHandle);

    this.directoryGroup.name = 'directory-screen';
    this.directoryGroup.visible = false;
    this.scene.add(this.directoryGroup);
    this.directoryHeader = createDirectoryTitleControl();
    this.directoryHeader.position.set(-4.85, 3.48, -0.15);
    this.directoryGroup.add(this.directoryHeader);

    this.finishTag = createFinishBrowsingControl();
    this.finishTag.position.set(4.7, 3.45, 0.1);
    this.directoryGroup.add(this.finishTag);

    this.thanksHandle = createThankYouModel(
      { zh: '感谢观看', en: 'THANK YOU' },
      `${this.content.contact}\n${this.content.contactEmail}`,
      prefersReducedMotion,
    );
    this.thanksHandle.root.visible = false;
    this.scene.add(this.thanksHandle.root);
    this.registerHandle(this.thanksHandle);
    this.screenModels = {
      cover: this.coverHandle,
      directory: [],
      detail: null,
      thanks: this.thanksHandle,
    };

    this.camera.position.set(0, 0.25, 11.8);
    this.camera.lookAt(0, 0, 0);
    this.bindEvents();
    this.resize();
    this.renderAccessibilityControls();
    this.scheduleFrame();
    this.setLoading(true);
    void this.initializeExperience();
  }

  private addLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#FFF8DF', '#174F9E', 2.25);
    this.scene.add(hemisphere);
    this.keyLight = new THREE.DirectionalLight('#FFF3D3', 3.2);
    this.keyLight.position.set(-4, 6, 8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.camera.near = 0.1;
    this.keyLight.shadow.camera.far = 30;
    this.keyLight.shadow.camera.left = -8;
    this.keyLight.shadow.camera.right = 8;
    this.keyLight.shadow.camera.top = 8;
    this.keyLight.shadow.camera.bottom = -8;
    this.scene.add(this.keyLight);
    const rim = new THREE.DirectionalLight('#98D8FF', 1.9);
    rim.position.set(5, 1, -3);
    this.scene.add(rim);
  }

  private registerHandle(handle: SculptModelHandle): void {
    this.modelHandles.add(handle);
    for (const target of handle.interactiveTargets) this.targetOwners.set(target, handle);
  }

  private unregisterHandle(handle: SculptModelHandle): void {
    this.modelHandles.delete(handle);
    for (const target of handle.interactiveTargets) this.targetOwners.delete(target);
  }

  private bindEvents(): void {
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.onPointerCancel);
    this.renderer.domElement.addEventListener('lostpointercapture', this.onLostPointerCapture);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.reducedMotionQuery.addEventListener('change', this.onReducedMotionChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.resize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.stopAnimation();
    this.announce('3D 场景暂时中断，正在等待恢复。', true);
  };

  private readonly onContextRestored = (): void => {
    this.clock.getDelta();
    this.scheduleFrame();
    this.announce('3D 场景已恢复。', true);
  };

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.pointerSession.isActive() && !this.pointerSession.owns(event.pointerId)) return;
    this.updatePointer(event);
    const pointerDown = this.pointerSession.get(event.pointerId);
    if (pointerDown && this.detailHandle) {
      const dx = event.clientX - pointerDown.clientX;
      const dy = event.clientY - pointerDown.clientY;
      this.dragDistance = Math.hypot(dx, dy);
      if (!this.panJourneyPopup(dx, dy, pointerDown)) {
        this.detailHandle.root.userData.dragRotation = {
          x: THREE.MathUtils.clamp(-dy * 0.0025, -0.12, 0.12),
          y: THREE.MathUtils.clamp(dx * 0.0025, -0.16, 0.16),
        };
      }
      return;
    }
    const hit = this.pickTarget();
    // The finish chip lives outside the model handles, so it tracks its own
    // pointer state and eases toward it in the animation loop.
    this.finishTagHovered = hit === this.finishTag;
    const owner = hit ? this.targetOwners.get(hit) ?? null : null;
    if (owner) owner.root.userData.hoverPointer = { x: this.pointer.x, y: this.pointer.y };
    if (owner !== this.hoveredHandle) {
      this.hoveredHandle?.actions.setHoveredTarget(null);
      this.hoveredHandle?.actions.setHovered(false);
      owner?.actions.setHovered(true);
      this.hoveredHandle = owner;
    }
    owner?.actions.setHoveredTarget(hit);
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.pointerSession.isActive()) return;
    this.updatePointer(event);
    const popupPan = this.detailHandle?.root.userData.popupPan as PopupPan | undefined;
    const pointerDown = {
      x: this.pointer.x,
      y: this.pointer.y,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      popupPanX: popupPan?.x,
      popupPanY: popupPan?.y,
    };
    if (!this.pointerSession.start(pointerDown)) return;
    this.dragDistance = 0;
    this.finishTagPressed = this.pickTarget() === this.finishTag;
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.finishPointerInteraction(event, false);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    this.finishPointerInteraction(event, true);
  };

  private readonly onLostPointerCapture = (event: PointerEvent): void => {
    this.finishPointerInteraction(event, true);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.state.screen !== 'detail') return;
    if (this.scrollJourneyPopup(event.deltaY, event.deltaMode)) {
      event.preventDefault();
      return;
    }
    if (!isPageablePresentation(this.currentCategory()?.presentation)) return;
    event.preventDefault();
    const direction = this.wheelGestureGate.push(
      normalizeWheelDelta(event.deltaY, event.deltaMode, this.renderer.domElement.clientHeight),
      performance.now(),
    );
    if (direction) {
      this.dispatch({
        type: direction > 0 ? 'NEXT_PROJECT' : 'PREVIOUS_PROJECT',
        projectCount: this.currentProjectCount(),
      });
    }
  };

  private finishPointerInteraction(event: PointerEvent, cancelled: boolean): void {
    const pointerDown = cancelled
      ? this.pointerSession.cancel(event.pointerId)
      : this.pointerSession.end(event.pointerId);
    if (!pointerDown) return;

    try {
      if (cancelled) return;

      const dx = event.clientX - pointerDown.clientX;
      const dy = event.clientY - pointerDown.clientY;
      this.dragDistance = Math.hypot(dx, dy);
      this.updatePointer(event);
      const isPageableDetail = this.state.screen === 'detail'
        && !['about', 'journey'].includes(this.currentCategory()?.presentation ?? '');
      if (isPageableDetail && isHorizontalSwipe({ dx, dy })) {
        this.dispatch({ type: dx < 0 ? 'NEXT_PROJECT' : 'PREVIOUS_PROJECT', projectCount: this.currentProjectCount() });
      } else if (this.dragDistance < 12) {
        const hit = this.pickTarget();
        if (hit) this.activateTarget(hit);
      }
    } finally {
      this.resetPointerInteraction(event.pointerId);
    }
  }

  private resetPointerInteraction(releasedPointerId?: number): void {
    const pointerDown = this.pointerSession.reset();
    this.dragDistance = 0;
    this.finishTagPressed = false;
    if (this.detailHandle) this.detailHandle.root.userData.dragRotation = { x: 0, y: 0 };
    const pointerId = releasedPointerId ?? pointerDown?.pointerId;
    if (pointerId !== undefined) this.releasePointerCapture(pointerId);
  }

  private resetGestureState(): void {
    this.resetPointerInteraction();
    this.wheelGestureGate.reset();
  }

  private releasePointerCapture(pointerId: number): void {
    try {
      if (this.renderer.domElement.hasPointerCapture?.(pointerId)) {
        this.renderer.domElement.releasePointerCapture?.(pointerId);
      }
    } catch {
      // Pointer capture can already be released when cancellation is delivered.
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const presentation = this.currentCategory()?.presentation;
    if (event.key === 'Escape' && this.state.screen === 'detail') {
      this.dispatch(presentation === 'journey' && this.state.selectedJourneyStation !== null
        ? { type: 'CLOSE_JOURNEY_POPUP' }
        : { type: 'CLOSE_DETAIL' });
    }
    if (event.key === 'ArrowRight' && this.state.screen === 'detail' && !['about', 'journey'].includes(presentation ?? '')) {
      this.dispatch({ type: 'NEXT_PROJECT', projectCount: this.currentProjectCount() });
    }
    if (event.key === 'ArrowLeft' && this.state.screen === 'detail' && !['about', 'journey'].includes(presentation ?? '')) {
      this.dispatch({ type: 'PREVIOUS_PROJECT', projectCount: this.currentProjectCount() });
    }
    if (event.key === 'Enter' && this.state.screen === 'cover') this.dispatch({ type: 'ENTER_DIRECTORY' });
  };

  private pickTarget(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const candidates = [...this.targetOwners.keys()].filter((target) => target.visible && this.isVisibleInScene(target));
    if (this.finishTag.visible && this.directoryGroup.visible) candidates.push(this.finishTag);
    const intersections = this.raycaster.intersectObjects(candidates, true);
    for (const intersection of intersections) {
      if (!this.isVisibleInScene(intersection.object)) continue;
      let object: THREE.Object3D | null = intersection.object;
      while (object && !object.userData.action) object = object.parent;
      if (object?.userData.action) return object;
    }
    return null;
  }

  private isVisibleInScene(object: THREE.Object3D): boolean {
    let cursor: THREE.Object3D | null = object;
    while (cursor) {
      if (!cursor.visible) return false;
      cursor = cursor.parent;
    }
    return true;
  }

  private applyAction(action: ExperienceAction): void {
    const unlocked = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
    const next = reduceExperience(unlocked, action);
    this.state = reduceExperience(next, { type: 'SET_TRANSITION_LOCK', locked: this.state.transitionLocked });
  }

  private runTransition(
    operation: () => Promise<void> | void,
    recovery: () => Promise<void> | void,
    failureMessage: string,
  ): Promise<boolean> {
    return runLockedTransition(operation, recovery, {
      lock: (locked) => {
        this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked });
      },
      announce: (message) => this.announce(message, true),
      onError: (error) => console.error(error),
      failureMessage,
    });
  }

  private showOnly(screen: 'cover' | 'directory' | 'thanks'): void {
    this.clearDetail();
    this.setSceneBackground('#2B82EE');
    this.coverHandle.root.visible = screen === 'cover';
    this.directoryGroup.visible = screen === 'directory';
    this.thanksHandle.root.visible = screen === 'thanks';
  }

  private activateTarget(target: THREE.Object3D): void {
    if (target.userData.action === 'toggle-about-expanded') {
      this.targetOwners.get(target)?.actions.toggleExpanded();
      return;
    }
    if (target.userData.action === 'visit-website') {
      this.announce('网站链接尚未配置，替换个人资料后即可启用。', true);
      return;
    }
    const action = resolveInteractionAction(target.userData as Record<string, unknown>, this.currentProjectCount());
    if (action) this.dispatch(action);
  }

  private playDirectoryEntrance(): Promise<void> {
    const folders = this.content.categories
      .map((category) => this.folderHandles.get(category.id))
      .filter((handle): handle is SculptModelHandle => handle !== undefined);

    return this.directoryEntrance.run((timeline) => addDirectoryEntranceAnimations(timeline, folders));
  }

  private preloadDirectoryAssets(): Promise<string[]> {
    this.directoryAssetsPromise ??= preloadImageAssets(
      [...directoryStickerAssetUrls, ...directoryControlAssetUrls],
      undefined,
      'low',
    );
    return this.directoryAssetsPromise;
  }

  private async ensureDirectoryReady(): Promise<void> {
    if (this.directoryReady) return;
    const failed = await this.preloadDirectoryAssets();
    if (this.destroyed) return;

    const collageVariants: CollageVariant[] = ['sport', 'business', 'technology', 'culture', 'cinema'];
    for (const [index, category] of this.content.categories.entries()) {
      const handle = createDirectoryFolderModel(category, collageVariants[index]!, this.state.reducedMotion);
      this.folderHandles.set(category.id, handle);
      this.directoryGroup.add(handle.root);
      this.registerHandle(handle);
    }
    this.screenModels.directory = [...this.folderHandles.values()];
    this.directoryReady = true;
    this.resize();
    if (failed.length > 0) {
      console.warn('Some directory artwork could not be preloaded:', failed);
      this.announce('部分装饰图片加载失败，已保留完整导航功能。', true);
    }
  }

  private async initializeExperience(): Promise<void> {
    try {
      const [aboutModule, journeyModule, scrapbookModule, bookModule, ticketModule] = await Promise.all([
        import('../about/aboutProfilePage'),
        import('../models/journey'),
        import('../models/scrapbook'),
        import('../models/book'),
        import('../models/ticket'),
      ]);
      const assets = [
        coverTitleStickerUrl,
        ...directoryStickerAssetUrls,
        ...directoryControlAssetUrls,
        ...educationAssetUrls,
        ...honorsAssetUrls,
        ...bsuAssetUrls,
        ...bsuRightAssetUrls,
        ...educationBookmarkAssetUrls,
        ...aboutModule.aboutProfileAssetUrls,
        ...journeyModule.journeyAssetUrls,
      ];
      const failed = await preloadImageAssets(assets, undefined, 'high');

      await Promise.all([
        loadEducationArtwork(),
        loadHonorsArtwork(),
        loadBsuArtwork(),
        loadBsuRightArtwork(),
        loadEducationBookmarks(),
      ]);
      await this.ensureDirectoryReady();
      await this.warmDirectoryRendering();
      for (const category of this.content.categories) {
        let prepared: SculptModelHandle | null = null;
        if (category.presentation === 'scrapbook') {
          prepared = scrapbookModule.createScrapbookModel(
            category,
            this.state.reducedMotion,
            category.initialProjectIndex ?? 0,
          );
        } else if (category.presentation === 'journey') {
          prepared = journeyModule.createJourneyModel(category, this.state.reducedMotion);
        } else if (category.presentation === 'book') {
          prepared = bookModule.createOpenBookModel(category, 0, this.state.reducedMotion);
        } else if (category.presentation === 'ticket') {
          prepared = ticketModule.createTicketStackModel(category, 0, this.state.reducedMotion);
        }
        if (!prepared) continue;

        prepared.root.userData.targetScale = getDetailScale(
          this.container.clientWidth,
          this.container.clientHeight,
          category.presentation,
        );
        if (category.presentation === 'journey') this.syncJourneyPopupGeometry(prepared);
        this.scene.add(prepared.root);
        await this.warmDetailRendering(prepared);
        prepared.root.removeFromParent();
        this.preparedDetailHandles.set(category.id, prepared);
      }
      if (this.destroyed) return;

      this.bootReady = true;
      this.setLoading(false);
      if (failed.length > 0) {
        console.warn('Some artwork could not be preloaded:', failed);
        this.announce('少量装饰图片未能加载，其余内容仍可正常浏览。', true);
      }
    } catch (error) {
      console.error(error);
      this.bootReady = true;
      this.setLoading(false);
      this.announce('预加载未完全完成，已切换为边浏览边加载。', true);
    }
  }

  private async warmDirectoryRendering(): Promise<void> {
    const coverWasVisible = this.coverHandle.root.visible;
    const directoryWasVisible = this.directoryGroup.visible;
    this.coverHandle.root.visible = false;
    this.directoryGroup.visible = true;

    try {
      this.directoryGroup.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) this.renderer.initTexture(value);
          }
        }
      });
      await this.renderer.compileAsync(this.scene, this.camera);
    } finally {
      this.directoryGroup.visible = directoryWasVisible;
      this.coverHandle.root.visible = coverWasVisible;
    }
  }

  private async dispatch(action: ExperienceAction): Promise<void> {
    if (!this.bootReady) return;
    if (this.state.transitionLocked && action.type !== 'SET_TRANSITION_LOCK') return;

    if (action.type === 'ENTER_DIRECTORY') {
      await this.runTransition(
        async () => {
          await this.ensureDirectoryReady();
          await this.coverHandle.actions.open();
          this.applyAction(action);
          this.coverHandle.root.visible = false;
          this.directoryGroup.visible = true;
          await this.playDirectoryEntrance();
        },
        () => {
          this.applyAction({ type: 'ENTER_DIRECTORY' });
          this.showOnly('directory');
        },
        '进入作品目录时出现问题，已直接显示目录。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'OPEN_CATEGORY') {
      const category = this.content.categories.find((item) => item.id === action.categoryId);
      if (!category) {
        this.announce('该分类不可用，已留在作品目录。', true);
        return;
      }
      await this.runTransition(
        async () => {
          await this.folderHandles.get(action.categoryId)?.actions.open();
          this.applyAction({ ...action, initialProjectIndex: category.initialProjectIndex });
          this.directoryGroup.visible = false;
          await this.showDetail(action.categoryId);
        },
        async () => {
          this.applyAction({ type: 'CLOSE_DETAIL' });
          await this.folderHandles.get(action.categoryId)?.actions.close();
          this.showOnly('directory');
        },
        '打开该分类时出现问题，已返回作品目录。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'SET_PROJECT_INDEX') {
      const category = this.currentCategory();
      const count = this.currentProjectCount();
      if (!category || category.presentation !== 'scrapbook') return;
      if (action.projectIndex < 0 || action.projectIndex >= count || action.projectIndex === this.state.projectIndex) return;
      const previousIndex = this.state.projectIndex;
      await this.runTransition(
        async () => {
          this.applyAction(action);
          await this.detailHandle?.actions.setProject(action.projectIndex);
        },
        async () => {
          this.applyAction({ type: 'SET_PROJECT_INDEX', projectIndex: previousIndex });
          await this.detailHandle?.actions.setProject(previousIndex);
        },
        '切换学历页面时出现问题，已回到上一个页面。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'NEXT_PROJECT' || action.type === 'PREVIOUS_PROJECT') {
      const category = this.currentCategory();
      if (!category || category.presentation === 'journey') return;
      const count = this.currentProjectCount();
      if (category.presentation === 'scrapbook') {
        if (action.type === 'NEXT_PROJECT' && this.state.projectIndex >= count - 1) return;
        if (action.type === 'PREVIOUS_PROJECT' && this.state.projectIndex <= 0) return;
      }
      const nextIndex = reduceExperience(this.state, action).projectIndex;
      if (nextIndex === this.state.projectIndex) return;
      const previousIndex = this.state.projectIndex;
      await this.runTransition(
        async () => {
          this.applyAction(action);
          await this.detailHandle?.actions.setProject(nextIndex);
        },
        async () => {
          this.applyAction({ type: 'SET_PROJECT_INDEX', projectIndex: previousIndex });
          await this.detailHandle?.actions.setProject(previousIndex);
        },
        '切换项目时出现问题，已回到上一个项目。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'SELECT_JOURNEY_STATION') {
      if (this.currentCategory()?.presentation !== 'journey') return;
      await this.runTransition(
        async () => {
          this.applyAction(action);
          await this.detailHandle?.actions.setProject(action.stationIndex);
          this.mountSheetText(action.stationIndex);
        },
        async () => {
          this.applyAction({ type: 'CLOSE_JOURNEY_POPUP' });
          await this.detailHandle?.actions.setProject(-1);
          this.clearSheetText();
        },
        '打开该站点时出现问题，已回到旅途地图。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'CLOSE_JOURNEY_POPUP') {
      if (this.currentCategory()?.presentation !== 'journey') return;
      await this.runTransition(
        async () => {
          this.applyAction(action);
          await this.detailHandle?.actions.setProject(-1);
          this.clearSheetText();
        },
        () => {
          this.applyAction({ type: 'CLOSE_JOURNEY_POPUP' });
          this.clearSheetText();
        },
        '返回旅途地图时出现问题，已重置站点选择。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'CLOSE_DETAIL') {
      this.resetGestureState();
      const categoryId = this.state.selectedCategoryId;
      await this.runTransition(
        async () => {
          await this.detailHandle?.actions.close();
          this.applyAction(action);
          this.clearDetail();
          if (categoryId) await this.folderHandles.get(categoryId)?.actions.close();
          this.setSceneBackground('#2B82EE');
          this.directoryGroup.visible = true;
        },
        () => {
          this.applyAction({ type: 'CLOSE_DETAIL' });
          this.showOnly('directory');
        },
        '关闭详情时出现问题，已返回作品目录。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'FINISH') {
      await this.runTransition(
        async () => {
          this.applyAction(action);
          this.clearDetail();
          this.setSceneBackground('#2B82EE');
          this.directoryGroup.visible = false;
          this.coverHandle.root.visible = false;
          this.thanksHandle.root.visible = true;
          await this.thanksHandle.actions.open();
        },
        () => {
          this.applyAction({ type: 'FINISH' });
          this.showOnly('thanks');
        },
        '结束浏览时出现问题，已直接显示致谢画面。',
      );
      this.renderAccessibilityControls();
      return;
    }

    if (action.type === 'RESTART') {
      await this.runTransition(
        async () => {
          await this.thanksHandle.actions.close();
          this.applyAction(action);
          this.setSceneBackground('#2B82EE');
          this.thanksHandle.root.visible = false;
          this.directoryGroup.visible = false;
          this.coverHandle.root.visible = true;
          await this.coverHandle.actions.close();
        },
        () => {
          this.applyAction({ type: 'RESTART' });
          this.showOnly('cover');
        },
        '重新开始时出现问题，已直接返回封面。',
      );
      this.renderAccessibilityControls();
    }
  }

  private currentCategory(): Category | undefined {
    return findCategory(this.content, this.state.selectedCategoryId);
  }

  private currentProjectCount(): number {
    return countProjects(this.currentCategory());
  }

  private async showDetail(categoryId: string): Promise<void> {
    this.clearDetail();
    // The popup size depends on the render pixel ratio, so settle the detail
    // profile before measuring the artwork against it.
    this.applyRenderProfile();
    const category = this.content.categories.find((item) => item.id === categoryId);
    if (!category) return;
    this.setSceneBackground(category.presentation === 'about'
      ? '#DED3BC'
      : category.presentation === 'scrapbook'
        ? '#414D6A'
        : category.presentation === 'journey'
          ? '#FFFFFF'
        : category.presentation === 'book' ? '#C91F58' : '#A75EDF');
    let wasPrepared = false;
    switch (category.presentation) {
      case 'about': {
        const { mountAboutProfilePage } = await import('../about/aboutProfilePage');
        this.aboutPage = mountAboutProfilePage(this.container, {
          reducedMotion: this.state.reducedMotion,
          onClose: () => { void this.dispatch({ type: 'CLOSE_DETAIL' }); },
        });
        return;
      }
      case 'scrapbook': {
        const { createScrapbookModel } = await import('../models/scrapbook');
        this.detailHandle = this.preparedDetailHandles.get(category.id)
          ?? createScrapbookModel(category, this.state.reducedMotion, this.state.projectIndex);
        wasPrepared = this.preparedDetailHandles.delete(category.id);
        this.detailHandle.actions.setReducedMotion(this.state.reducedMotion);
        break;
      }
      case 'journey': {
        const { createJourneyModel, preloadJourneyBoardAssets } = await import('../models/journey');
        const failed = await preloadJourneyBoardAssets();
        if (failed.length > 0) console.warn('Some internship artwork could not be preloaded:', failed);
        this.detailHandle = this.preparedDetailHandles.get(category.id)
          ?? createJourneyModel(category, this.state.reducedMotion);
        wasPrepared = this.preparedDetailHandles.delete(category.id);
        this.detailHandle.actions.setReducedMotion(this.state.reducedMotion);
        break;
      }
      case 'book': {
        const { createOpenBookModel } = await import('../models/book');
        this.detailHandle = this.preparedDetailHandles.get(category.id)
          ?? createOpenBookModel(category, 0, this.state.reducedMotion);
        wasPrepared = this.preparedDetailHandles.delete(category.id);
        this.detailHandle.actions.setReducedMotion(this.state.reducedMotion);
        break;
      }
      case 'ticket': {
        const { createTicketStackModel } = await import('../models/ticket');
        this.detailHandle = this.preparedDetailHandles.get(category.id)
          ?? createTicketStackModel(category, 0, this.state.reducedMotion);
        wasPrepared = this.preparedDetailHandles.delete(category.id);
        this.detailHandle.actions.setReducedMotion(this.state.reducedMotion);
        break;
      }
    }
    if (!this.detailHandle) return;
    this.detailHandle.root.scale.setScalar(0.02);
    const targetScale = getDetailScale(
      this.container.clientWidth,
      this.container.clientHeight,
      category.presentation,
    );
    this.detailHandle.root.userData.targetScale = targetScale;
    if (category.presentation === 'journey') this.syncJourneyPopupGeometry();
    this.scene.add(this.detailHandle.root);
    this.registerHandle(this.detailHandle);
    this.screenModels.detail = this.detailHandle;
    if (!wasPrepared) await this.warmDetailRendering(this.detailHandle);
    await this.detailHandle.actions.open();
  }

  private async warmDetailRendering(handle: SculptModelHandle): Promise<void> {
    const initializedTextures = new Set<THREE.Texture>();
    const initializeTexture = (texture: THREE.Texture) => {
      if (initializedTextures.has(texture)) return;
      initializedTextures.add(texture);
      this.renderer.initTexture(texture);
    };
    const preloadTextures = handle.root.userData.preloadTextures;
    if (Array.isArray(preloadTextures)) {
      preloadTextures.forEach((texture) => {
        if (texture instanceof THREE.Texture) initializeTexture(texture);
      });
    }
    handle.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) initializeTexture(value);
        }
      }
    });
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  private setSceneBackground(color: string): void {
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.set(color);
      return;
    }
    this.scene.background = new THREE.Color(color);
  }

  private clearDetail(): void {
    this.resetGestureState();
    this.clearSheetText();
    this.aboutPage?.dispose();
    this.aboutPage = null;
    if (!this.detailHandle) return;
    this.unregisterHandle(this.detailHandle);
    this.detailHandle.dispose();
    this.detailHandle = null;
    this.screenModels.detail = null;
  }

  private announce(message: string, visible = false): void {
    this.liveRegion.textContent = message;
    if (!visible) return;
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.dataset.visible = 'true';
    this.toastTimer = setTimeout(() => {
      this.toast.dataset.visible = 'false';
      this.toastTimer = null;
    }, 4000);
  }

  private setLoading(visible: boolean): void {
    this.loadingOverlay.dataset.visible = String(visible);
    this.loadingOverlay.setAttribute('aria-hidden', String(!visible));
    this.container.setAttribute('aria-busy', String(visible));
  }

  private renderAccessibilityControls(focusFirstControl = false): void {
    const descriptor = describeScreen(this.content, this.state);
    const artworkPage = this.state.screen === 'detail'
      ? this.currentCategory()?.scrapbookPages?.[this.state.projectIndex]
      : undefined;
    const education = artworkPage?.education;
    this.accessibilityLayer.classList.toggle('sr-controls--education', Boolean(education));
    this.accessibilityLayer.replaceChildren(this.liveRegion, this.semanticRegion);
    this.liveRegion.textContent = descriptor.status;

    const heading = document.createElement('h2');
    heading.textContent = descriptor.heading;
    const details = descriptor.details.map((detail) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = detail;
      return paragraph;
    });
    this.semanticRegion.replaceChildren(heading, ...details);
    if (education) {
      const currentPage = this.currentCategory()!.scrapbookPages![this.state.projectIndex]!;
      const element = (tag: 'p' | 'h2' | 'h3', text: string) => {
        const node = document.createElement(tag);
        node.textContent = text;
        return node;
      };
      const entry = education.experience;
      this.semanticRegion.replaceChildren(
        element('p', '02 / 学习经历'), element('h2', entry.school),
        element('p', entry.period), element('p', `学院：${entry.college}`),
        element('p', `专业：${entry.major}`),
        element('p', `绩点 ${entry.gpa} · 排名 ${entry.rank}`),
      );
      if (entry.rankNote) this.semanticRegion.append(element('p', entry.rankNote));
      if (entry.honors.length) {
        this.semanticRegion.append(element('h3', '所获荣誉'), ...entry.honors.map((honor) => element('p', honor)));
      }
      if (hasEducationArtwork(currentPage)) {
        this.semanticRegion.replaceChildren(createEducationArtworkElement(), createHonorsArtworkElement());
      }
      if (hasBsuArtwork(currentPage)) {
        this.semanticRegion.replaceChildren(createBsuArtworkElement(), createBsuRightArtworkElement());
      }
      let paragraph: HTMLElement | undefined;
      if (!hasHonorsArtwork(currentPage)) {
        for (const line of education.lines) {
          if (line.kind === 'heading') {
            this.semanticRegion.append(element('h3', line.text));
            paragraph = undefined;
          } else if (line.marker || !paragraph) {
            paragraph = element('p', `${line.marker ? `${line.marker}. ` : ''}${line.text}`);
            this.semanticRegion.append(paragraph);
          } else paragraph.textContent += line.text;
        }
      }
      this.semanticRegion.scrollTop = 0;
    }

    const buttons = descriptor.controls.map((control) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = control.label;
      if (education && control.action.type === 'SET_PROJECT_INDEX') {
        button.classList.add('education-degree-bookmark', `education-degree-bookmark--${control.action.projectIndex === 0 ? 'master' : 'bachelor'}`);
        if (control.action.projectIndex === this.state.projectIndex) button.setAttribute('aria-current', 'page');
      }
      button.addEventListener('click', () => this.dispatch(control.action));
      return button;
    });
    this.accessibilityLayer.append(...buttons);
    if (focusFirstControl) buttons[0]?.focus({ preventScroll: true });
  }

  /**
   * Draws the internship copy as real text over the sheet's text-free plate.
   * Vector text stays sharp at any display density, zoom or size, which a
   * flattened bitmap can never do.
   */
  private mountSheetText(stationIndex: number): void {
    this.clearSheetText();
    const station = this.currentCategory()?.journeyExperiences?.[stationIndex];
    const page = station ? findSheetTextPage(station.id) : undefined;
    if (!station || !page) return;

    const overlay = document.createElement('div');
    overlay.className = 'sheet-text';
    overlay.dataset.station = station.id;
    overlay.setAttribute('aria-hidden', 'true');

    const paper = document.createElement('div');
    paper.className = 'sheet-text__paper';
    paper.style.width = `${SHEET_TEXT_WIDTH}px`;
    paper.style.height = `${SHEET_TEXT_HEIGHT}px`;
    for (const block of page.blocks) paper.append(this.createSheetTextBlock(block));

    overlay.append(paper);
    this.container.append(overlay);
    this.sheetTextOverlay = overlay;
    this.syncSheetText();
  }

  private createSheetTextBlock(block: SheetTextBlock): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'sheet-text__block';
    element.textContent = block.text;
    element.style.left = `${block.left}px`;
    element.style.top = `${block.top}px`;
    element.style.width = `${block.width}px`;
    element.style.fontSize = `${block.size}px`;
    element.style.lineHeight = `${block.lineHeight}px`;
    element.style.textAlign = block.align;
    element.style.fontWeight = String(block.weight);
    element.style.fontFamily = block.family === 'serif'
      ? 'var(--sheet-text-serif)'
      : 'var(--sheet-text-sans)';
    element.style.color = block.color;
    if (block.letterSpacing) element.style.letterSpacing = `${block.letterSpacing}px`;
    return element;
  }

  private clearSheetText(): void {
    this.sheetTextOverlay?.remove();
    this.sheetTextOverlay = null;
  }

  /** Keeps the text glued to the sheet while it opens, pans or the view resizes. */
  private syncSheetText(): void {
    const overlay = this.sheetTextOverlay;
    const handle = this.detailHandle;
    if (!overlay || !handle) return;
    const layer = handle.parts.get(`internship-detail-${overlay.dataset.station}`) as THREE.Mesh | undefined;
    if (!layer || !layer.visible) return;

    layer.updateWorldMatrix(true, false);
    const geometry = layer.geometry as THREE.PlaneGeometry;
    const halfWidth = geometry.parameters.width / 2;
    const halfHeight = geometry.parameters.height / 2;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const planeCorners: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    const corners = planeCorners.map(([x, y]) => {
      const point = new THREE.Vector3(x * halfWidth, y * halfHeight, 0)
        .applyMatrix4(layer.matrixWorld)
        .project(this.camera);
      return {
        x: rect.left + ((point.x + 1) / 2) * rect.width,
        y: rect.top + (1 - (point.y + 1) / 2) * rect.height,
      };
    });
    const left = Math.min(...corners.map((corner) => corner.x));
    const top = Math.min(...corners.map((corner) => corner.y));
    const right = Math.max(...corners.map((corner) => corner.x));
    const bottom = Math.max(...corners.map((corner) => corner.y));
    const width = Math.max(1, right - left);
    overlay.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`;
    overlay.style.width = `${width.toFixed(2)}px`;
    overlay.style.height = `${Math.max(1, bottom - top).toFixed(2)}px`;
    const paper = overlay.firstElementChild as HTMLElement | null;
    if (paper) paper.style.transform = `scale(${(width / SHEET_TEXT_WIDTH).toFixed(5)})`;
  }

  /**
   * Keeps the internship popup at its native bitmap size and records how far it
   * overflows the viewport, so the detail screen pans instead of shrinking the
   * artwork into mush.
   */
  private syncJourneyPopupGeometry(handle: SculptModelHandle | null = this.detailHandle): void {
    if (!handle) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const rootScale = (handle.root.userData.targetScale as number | undefined) ?? 1;
    const fit = getJourneyPopupFit(width, height, rootScale, {
      pixelRatio: this.renderProfile.pixelRatio,
    });
    handle.root.userData.popupScale = fit.scale;
    handle.root.userData.popupFit = fit;
    const pan = handle.root.userData.popupPan as PopupPan | undefined;
    if (pan) handle.root.userData.popupPan = this.clampPopupPan(fit, pan);
  }

  private clampPopupPan(fit: JourneyPopupFit, pan: PopupPan): PopupPan {
    return {
      x: THREE.MathUtils.clamp(pan.x, -fit.overflowX / 2, fit.overflowX / 2),
      y: THREE.MathUtils.clamp(pan.y, -fit.overflowY / 2, fit.overflowY / 2),
    };
  }

  /** Drags the popup bitmap under the pointer while it overflows the viewport. */
  private panJourneyPopup(dx: number, dy: number, origin: PointerSnapshot): boolean {
    const handle = this.detailHandle;
    if (!handle) return false;
    const fit = handle.root.userData.popupFit as JourneyPopupFit | undefined;
    if (!fit || (fit.overflowX <= 0 && fit.overflowY <= 0)) return false;
    if (this.currentCategory()?.presentation !== 'journey') return false;
    if (this.state.selectedJourneyStation === null) return false;
    const height = Math.max(1, this.container.clientHeight);
    const worldPerPixel = fit.visibleHeight / height;
    const maxX = fit.overflowX / 2;
    const maxY = fit.overflowY / 2;
    // The sheet follows the pointer, like dragging a tall page.
    handle.root.userData.popupPan = {
      x: THREE.MathUtils.clamp((origin.popupPanX ?? 0) + dx * worldPerPixel, -maxX, maxX),
      y: THREE.MathUtils.clamp((origin.popupPanY ?? 0) + dy * worldPerPixel, -maxY, maxY),
    };
    return true;
  }

  /** Mouse wheel scrolls a popup that is taller than the viewport. */
  private scrollJourneyPopup(deltaY: number, deltaMode: number): boolean {
    const handle = this.detailHandle;
    const fit = handle?.root.userData.popupFit as JourneyPopupFit | undefined;
    if (!handle || !fit || fit.overflowY <= 0) return false;
    if (this.currentCategory()?.presentation !== 'journey') return false;
    if (this.state.selectedJourneyStation === null) return false;
    const height = Math.max(1, this.renderer.domElement.clientHeight);
    const worldPerPixel = fit.visibleHeight / height;
    const pan = (handle.root.userData.popupPan as PopupPan | undefined) ?? { x: 0, y: 0 };
    handle.root.userData.popupPan = this.clampPopupPan(fit, {
      x: pan.x,
      // Scrolling down walks further down a sheet that is taller than the view.
      y: pan.y + normalizeWheelDelta(deltaY, deltaMode, height) * worldPerPixel,
    });
    return true;
  }

  /**
   * Every screen renders at the display's density: the scene draws its own
   * text into canvas textures, so a smaller framebuffer is upscaled by the
   * browser and every glyph loses its edge.
   */
  private applyRenderProfile(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderProfile = getRenderProfile(width, height, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(this.renderProfile.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.profiledScreen = this.state.screen;
  }

  private syncRenderProfile(): void {
    if (this.profiledScreen === this.state.screen) return;
    this.applyRenderProfile();
  }

  /**
   * World half-width the cover camera sees across the artwork plane. The
   * captions live in the model's local space, so the limit depends on the
   * frustum, the viewport aspect and the model's own scale.
   */
  private coverVisibleHalfWidth(width: number, height: number): number {
    const distance = Math.max(0.1, this.camera.position.z - 0.02);
    const halfHeight = Math.tan((this.camera.fov * Math.PI) / 360) * distance;
    return (halfHeight * (width / Math.max(1, height))) / getCoverScale(width, height);
  }

  /**
   * Hands the end page the area the camera can actually see, so its cards and
   * closing panels stack inside a phone screen instead of running off it.
   */
  private layoutThanksScreen(width: number, height: number, isMobile: boolean): void {
    const distance = Math.max(0.1, this.camera.position.z);
    const halfHeight = Math.tan((this.camera.fov * Math.PI) / 360) * distance;
    const halfWidth = halfHeight * (width / Math.max(1, height));
    const rootScale = Math.max(0.1, this.thanksHandle.root.scale.x);
    this.thanksHandle.actions.setLayout({
      isMobile,
      halfWidth: halfWidth / rootScale,
      halfHeight: halfHeight / rootScale,
    });
  }

  /**
   * Portrait viewports have no room beside the folder, so the two contact
   * captions move under it — where they are fully visible instead of being
   * clipped by the screen edge.
   */
  private layoutCoverCaptions(width: number, height: number, isMobile: boolean): void {
    const leftInfo = this.coverHandle.parts.get('left-info');
    const rightInfo = this.coverHandle.parts.get('right-info');
    if (isMobile) {
      leftInfo?.position.set(-1.75, -4.6, 0.02);
      rightInfo?.position.set(1.75, -4.6, 0.02);
      return;
    }
    leftInfo?.position.set(-4.45, -1.55, 0.02);
    // The block is set clear of the flap, but its widest line
    // ("SQL · Excel · SPSS · AI") reaches ~0.97 units right of the panel centre,
    // so pull the column back whenever the margin would run off screen.
    const rightLimit = this.coverVisibleHalfWidth(width, height) - 1.2;
    rightInfo?.position.set(Math.min(COVER_RIGHT_CAPTION_X, rightLimit), -0.9, 0.02);
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.applyRenderProfile();
    const profile = this.renderProfile;
    this.renderer.shadowMap.enabled = true;
    this.keyLight.shadow.mapSize.width = profile.shadowMapSize;
    this.keyLight.shadow.mapSize.height = profile.shadowMapSize;
    this.camera.aspect = width / height;
    this.camera.fov = profile.isMobile ? 48 : 38;
    this.camera.position.z = profile.isMobile ? 13.6 : 11.8;
    this.camera.updateProjectionMatrix();
    const positions = getDirectoryLayout(width, height);
    this.content.categories.forEach((category, index) => {
      const handle = this.folderHandles.get(category.id);
      const layout = positions[index];
      if (!handle || !layout) return;
      handle.root.position.set(layout.x, layout.y, 0);
      handle.root.scale.setScalar(layout.scale);
    });
    const controlScale = profile.isMobile ? 0.9 : 1;
    // The supplied control artwork is wider than the chips it replaced, so on
    // narrow desktop windows the side anchors slide in far enough to keep the
    // whole sticker - decorations included - on screen.
    const cameraHalfHeight = Math.tan((this.camera.fov / 2) * (Math.PI / 180)) * this.camera.position.z;
    const visibleHalfWidth = cameraHalfHeight * this.camera.aspect;
    const fitControlX = (anchor: number, width: number): number => (
      Math.sign(anchor) * Math.min(Math.abs(anchor), Math.max(1.5, visibleHalfWidth - (width * controlScale) / 2 - 0.15))
    );
    this.directoryHeader.scale.setScalar(controlScale);
    this.directoryHeader.position.set(
      profile.isMobile ? -1.5 : fitControlX(-4.85, directoryTitleControlWidth),
      profile.isMobile ? 4.5 : 3.48,
      -0.15,
    );
    this.finishTagBaseScale = controlScale;
    this.finishTagRestY = profile.isMobile ? 4.5 : 3.45;
    this.finishTag.scale.setScalar(this.finishTagBaseScale);
    this.finishTag.position.set(
      profile.isMobile ? 1.5 : fitControlX(4.7, finishBrowsingControlWidth),
      this.finishTagRestY,
      0.1,
    );
    this.thanksHandle.root.scale.setScalar(profile.isMobile ? 0.82 : 1);
    this.layoutThanksScreen(width, height, profile.isMobile);
    this.coverHandle.root.scale.setScalar(getCoverScale(width, height));
    this.layoutCoverCaptions(width, height, profile.isMobile);
    if (this.detailHandle) {
      const presentation = this.currentCategory()?.presentation;
      const targetScale = getDetailScale(width, height, presentation);
      this.detailHandle.root.userData.targetScale = targetScale;
      if (presentation === 'journey') this.syncJourneyPopupGeometry();
    }
  };

  private readonly onReducedMotionChange = (event: MediaQueryListEvent): void => {
    const reduced = event.matches;
    this.state = { ...this.state, reducedMotion: reduced };
    for (const handle of this.modelHandles) handle.actions.setReducedMotion(reduced);
    if (!reduced) return;
    this.resetGestureState();
    this.hoveredHandle?.actions.setHoveredTarget(null);
    this.hoveredHandle?.actions.setHovered(false);
    this.hoveredHandle = null;
    this.pointer.set(2, 2);
    this.camera.position.x = 0;
    this.camera.position.y = 0.25;
    this.camera.lookAt(0, 0, 0);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopAnimation();
      return;
    }
    this.clock.getDelta();
    this.scheduleFrame();
  };

  private scheduleFrame(): void {
    if (this.destroyed || this.frameId !== 0) return;
    this.frameId = requestAnimationFrame(this.animate);
  }

  private stopAnimation(): void {
    if (this.frameId === 0) return;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  private readonly animate = (): void => {
    this.frameId = 0;
    if (this.destroyed) return;
    this.syncRenderProfile();
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    const activeHandles = selectActiveModelHandles(this.state.screen, this.screenModels);
    for (const handle of activeHandles) handle.update(delta, elapsed);
    if (this.detailHandle) {
      const targetScale = this.detailHandle.root.userData.targetScale ?? 1;
      const scale = damp(this.detailHandle.root.scale.x, targetScale, 7, delta);
      this.detailHandle.root.scale.setScalar(scale);
      const drag = this.detailHandle.root.userData.dragRotation ?? { x: 0, y: 0 };
      this.detailHandle.root.rotation.x = damp(this.detailHandle.root.rotation.x, drag.x, 5, delta);
      this.detailHandle.root.rotation.y = damp(this.detailHandle.root.rotation.y, drag.y, 5, delta);
    }
    const tracksPointer = this.state.screen !== 'detail' && !this.state.reducedMotion;
    const cameraX = tracksPointer ? this.pointer.x * 0.12 : 0;
    // An open internship sheet is a bitmap that has to land on the pixel grid
    // one texel per pixel. The default camera is tilted down by ~1.2 degrees,
    // which keystones the sheet and resamples its lower rows into a washed-out
    // grey, so the camera levels out while a sheet is open.
    const sheetOpen = this.state.screen === 'detail'
      && this.state.selectedJourneyStation !== null
      && this.currentCategory()?.presentation === 'journey';
    const cameraY = sheetOpen ? 0 : 0.25 + (tracksPointer ? this.pointer.y * 0.08 : 0);
    this.camera.position.x = damp(this.camera.position.x, cameraX, 3, delta);
    this.camera.position.y = damp(this.camera.position.y, cameraY, 3, delta);
    this.camera.lookAt(0, 0, 0);
    if (this.sheetTextOverlay) this.syncSheetText();
    this.syncFinishTagFeedback(delta);
    this.renderer.render(this.scene, this.camera);
    this.scheduleFrame();
  };

  /** Lifts the finish chip under the pointer and dips it while pressed. */
  private syncFinishTagFeedback(delta: number): void {
    const active = this.directoryGroup.visible;
    const hovered = active && this.finishTagHovered;
    const pressed = active && this.finishTagPressed;
    const targetScale = this.finishTagBaseScale * (pressed ? 0.96 : hovered ? 1.07 : 1);
    const targetY = this.finishTagRestY + (pressed ? -0.05 : hovered ? 0.09 : 0);
    this.finishTag.scale.setScalar(damp(this.finishTag.scale.x, targetScale, 16, delta));
    this.finishTag.position.y = damp(this.finishTag.position.y, targetY, 16, delta);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopAnimation();
    this.resetGestureState();
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.onPointerCancel);
    this.renderer.domElement.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.reducedMotionQuery.removeEventListener('change', this.onReducedMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.resize);
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.directoryEntrance.killActiveTimeline();
    this.aboutPage?.dispose();
    this.aboutPage = null;
    for (const handle of this.modelHandles) handle.dispose();
    for (const handle of this.preparedDetailHandles.values()) handle.dispose();
    this.preparedDetailHandles.clear();
    disposeObject(this.directoryHeader);
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}
