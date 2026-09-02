import * as THREE from 'three';
import type { Category, PortfolioContent } from '../content/types';
import { createCoverModel } from '../models/cover';
import { createDirectoryFolderModel, type CollageVariant } from '../models/directoryFolder';
import { createThankYouModel } from '../models/thanks';
import { makeTextPanel } from '../three/geometry';
import { damp, disposeObject, type SculptModelHandle } from '../three/runtime';
import { getCoverScale, getDetailScale, getDirectoryLayout, getRenderProfile } from './layout';
import {
  createPointerSession,
  createWheelGestureGate,
  isHorizontalSwipe,
  isPageablePresentation,
  normalizeWheelDelta,
} from './gesturePolicy';
import { resolveInteractionAction } from './interactions';
import { countProjects, describeScreen } from './accessibility';
import { findCategory, hasCategory } from './categories';
import { runLockedTransition } from './transitions';
import { createExperienceState, reduceExperience, type ExperienceAction, type ExperienceState } from './stateMachine';

type PointerSnapshot = { x: number; y: number; clientX: number; clientY: number; pointerId: number };

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
  private readonly accessibilityLayer: HTMLDivElement;
  private readonly liveRegion: HTMLDivElement;
  private readonly semanticRegion: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly finishTag: THREE.Mesh;
  private readonly directoryHeader: THREE.Mesh;
  private readonly coverHandle: SculptModelHandle;
  private readonly thanksHandle: SculptModelHandle;
  private keyLight!: THREE.DirectionalLight;
  private detailHandle: SculptModelHandle | null = null;
  private state: ExperienceState;
  private hoveredHandle: SculptModelHandle | null = null;
  private readonly pointerSession = createPointerSession<PointerSnapshot>();
  private readonly wheelGestureGate = createWheelGestureGate({ threshold: 24, cooldownMs: 450, idleResetMs: 180 });
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private dragDistance = 0;
  private frameId = 0;
  private destroyed = false;

  constructor(private readonly container: HTMLElement, private readonly content: PortfolioContent) {
    const prefersReducedMotion = this.reducedMotionQuery.matches;
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

    this.addLighting();
    this.coverHandle = createCoverModel(prefersReducedMotion);
    this.coverHandle.root.position.set(0, -0.12, 0);
    this.scene.add(this.coverHandle.root);
    this.registerHandle(this.coverHandle);

    this.directoryGroup.name = 'directory-screen';
    this.directoryGroup.visible = false;
    this.scene.add(this.directoryGroup);
    this.directoryHeader = makeTextPanel(1.42, 0.62, 0.08, {
      title: '作品目录',
      subtitle: '选择分类',
      background: '#F4EF62',
      foreground: '#17213A',
      align: 'center',
      width: 1200,
      height: 500,
      titleScale: 0.2,
      subtitleScale: 0.075,
    });
    this.directoryHeader.position.set(-4.85, 3.48, -0.15);
    this.directoryHeader.rotation.z = 0;
    this.directoryGroup.add(this.directoryHeader);

    const collageVariants: CollageVariant[] = ['sport', 'business', 'technology', 'culture', 'cinema'];
    for (const [index, category] of this.content.categories.entries()) {
      const handle = createDirectoryFolderModel(category, collageVariants[index]!, prefersReducedMotion);
      this.folderHandles.set(category.id, handle);
      this.directoryGroup.add(handle.root);
      this.registerHandle(handle);
    }

    this.finishTag = makeTextPanel(2.05, 0.62, 0.1, {
      title: '完成浏览',
      subtitle: '结束',
      background: '#2B82EE',
      foreground: '#FFF8E8',
      align: 'center',
      width: 1400,
      height: 500,
      titleScale: 0.2,
      subtitleScale: 0.075,
    });
    this.finishTag.name = 'finish-tag';
    this.finishTag.userData.action = 'finish';
    this.finishTag.position.set(4.7, 3.45, 0.1);
    this.directoryGroup.add(this.finishTag);

    this.thanksHandle = createThankYouModel({ zh: '感谢观看', en: 'THANK YOU' }, this.content.contact, prefersReducedMotion);
    this.thanksHandle.root.visible = false;
    this.scene.add(this.thanksHandle.root);
    this.registerHandle(this.thanksHandle);

    this.camera.position.set(0, 0.25, 11.8);
    this.camera.lookAt(0, 0, 0);
    this.bindEvents();
    this.resize();
    this.renderAccessibilityControls();
    this.scheduleFrame();
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
      this.detailHandle.root.userData.dragRotation = {
        x: THREE.MathUtils.clamp(-dy * 0.0025, -0.12, 0.12),
        y: THREE.MathUtils.clamp(dx * 0.0025, -0.16, 0.16),
      };
      return;
    }
    const hit = this.pickTarget();
    const owner = hit ? this.targetOwners.get(hit) ?? null : null;
    if (owner) owner.root.userData.hoverPointer = { x: this.pointer.x, y: this.pointer.y };
    if (owner !== this.hoveredHandle) {
      this.hoveredHandle?.actions.setHovered(false);
      owner?.actions.setHovered(true);
      this.hoveredHandle = owner;
    }
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.pointerSession.isActive()) return;
    this.updatePointer(event);
    const pointerDown = {
      x: this.pointer.x,
      y: this.pointer.y,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    };
    if (!this.pointerSession.start(pointerDown)) return;
    this.dragDistance = 0;
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
    if (target.userData.action === 'visit-website') {
      this.announce('网站链接尚未配置，替换个人资料后即可启用。', true);
      return;
    }
    const action = resolveInteractionAction(target.userData as Record<string, unknown>, this.currentProjectCount());
    if (action) this.dispatch(action);
  }

  private async dispatch(action: ExperienceAction): Promise<void> {
    if (this.state.transitionLocked && action.type !== 'SET_TRANSITION_LOCK') return;

    if (action.type === 'ENTER_DIRECTORY') {
      await this.runTransition(
        async () => {
          await this.coverHandle.actions.open();
          this.applyAction(action);
          this.coverHandle.root.visible = false;
          this.directoryGroup.visible = true;
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
      if (!hasCategory(this.content, action.categoryId)) {
        this.announce('该分类不可用，已留在作品目录。', true);
        return;
      }
      await this.runTransition(
        async () => {
          await this.folderHandles.get(action.categoryId)?.actions.open();
          this.applyAction(action);
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
        },
        async () => {
          this.applyAction({ type: 'CLOSE_JOURNEY_POPUP' });
          await this.detailHandle?.actions.setProject(-1);
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
        },
        () => {
          this.applyAction({ type: 'CLOSE_JOURNEY_POPUP' });
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
    const category = this.content.categories.find((item) => item.id === categoryId);
    if (!category) return;
    this.setSceneBackground(category.presentation === 'about'
      ? '#DED3BC'
      : category.presentation === 'scrapbook'
        ? '#414D6A'
        : category.presentation === 'journey'
          ? '#A8CFE1'
        : category.presentation === 'book' ? '#C91F58' : '#A75EDF');
    switch (category.presentation) {
      case 'about': {
        const { createAboutCvModel } = await import('../models/aboutCv');
        this.detailHandle = createAboutCvModel(category, this.state.reducedMotion);
        break;
      }
      case 'scrapbook': {
        const { createScrapbookModel } = await import('../models/scrapbook');
        this.detailHandle = createScrapbookModel(category, this.state.reducedMotion);
        break;
      }
      case 'journey': {
        const { createJourneyModel } = await import('../models/journey');
        this.detailHandle = createJourneyModel(category, this.state.reducedMotion);
        break;
      }
      case 'book': {
        const { createOpenBookModel } = await import('../models/book');
        this.detailHandle = createOpenBookModel(category, 0, this.state.reducedMotion);
        break;
      }
      case 'ticket': {
        const { createTicketStackModel } = await import('../models/ticket');
        this.detailHandle = createTicketStackModel(category, 0, this.state.reducedMotion);
        break;
      }
    }
    if (!this.detailHandle) return;
    this.detailHandle.root.scale.setScalar(0.02);
    this.detailHandle.root.userData.targetScale = getDetailScale(this.container.clientWidth, this.container.clientHeight);
    this.scene.add(this.detailHandle.root);
    this.registerHandle(this.detailHandle);
    await this.detailHandle.actions.open();
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
    if (!this.detailHandle) return;
    this.unregisterHandle(this.detailHandle);
    this.detailHandle.dispose();
    this.detailHandle = null;
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

  private renderAccessibilityControls(focusFirstControl = false): void {
    const descriptor = describeScreen(this.content, this.state);
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

    const buttons = descriptor.controls.map((control) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = control.label;
      button.addEventListener('click', () => this.dispatch(control.action));
      return button;
    });
    this.accessibilityLayer.append(...buttons);
    if (focusFirstControl) buttons[0]?.focus({ preventScroll: true });
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const profile = getRenderProfile(width, height, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(profile.pixelRatio);
    this.renderer.setSize(width, height, false);
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
    this.directoryHeader.scale.setScalar(profile.isMobile ? 0.72 : 1);
    this.directoryHeader.position.set(profile.isMobile ? -2.1 : -4.85, profile.isMobile ? 4.55 : 3.48, -0.15);
    this.finishTag.position.set(profile.isMobile ? 1.75 : 4.7, profile.isMobile ? 4.55 : 3.45, 0.1);
    this.thanksHandle.root.scale.setScalar(profile.isMobile ? 0.82 : 1);
    this.coverHandle.root.scale.setScalar(getCoverScale(width, height));
    if (this.detailHandle) this.detailHandle.root.userData.targetScale = getDetailScale(width, height);
  };

  private readonly onReducedMotionChange = (event: MediaQueryListEvent): void => {
    const reduced = event.matches;
    this.state = { ...this.state, reducedMotion: reduced };
    for (const handle of this.modelHandles) handle.actions.setReducedMotion(reduced);
    if (!reduced) return;
    this.resetGestureState();
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
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    for (const handle of this.modelHandles) handle.update(delta, elapsed);
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
    const cameraY = 0.25 + (tracksPointer ? this.pointer.y * 0.08 : 0);
    this.camera.position.x = damp(this.camera.position.x, cameraX, 3, delta);
    this.camera.position.y = damp(this.camera.position.y, cameraY, 3, delta);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    this.scheduleFrame();
  };

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
    for (const handle of this.modelHandles) handle.dispose();
    disposeObject(this.directoryHeader);
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}
