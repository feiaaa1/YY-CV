import * as THREE from 'three';
import type { Category, PortfolioContent } from '../content/types';
import { createCoverModel } from '../models/cover';
import { createDirectoryFolderModel, type CollageVariant } from '../models/directoryFolder';
import { createOpenBookModel } from '../models/book';
import { createThankYouModel } from '../models/thanks';
import { createTicketStackModel } from '../models/ticket';
import { createAboutCvModel } from '../models/aboutCv';
import { createScrapbookModel } from '../models/scrapbook';
import { createJourneyModel } from '../models/journey';
import { makeTextPanel } from '../three/geometry';
import { damp, disposeObject, type SculptModelHandle } from '../three/runtime';
import { getCoverScale, getDetailScale, getDirectoryLayout, getRenderProfile } from './layout';
import { resolveInteractionAction } from './interactions';
import { createExperienceState, reduceExperience, type ExperienceAction, type ExperienceState } from './stateMachine';

type PointerSnapshot = { x: number; y: number; clientX: number; clientY: number };

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
  private readonly finishTag: THREE.Mesh;
  private readonly directoryHeader: THREE.Mesh;
  private readonly coverHandle: SculptModelHandle;
  private readonly thanksHandle: SculptModelHandle;
  private keyLight!: THREE.DirectionalLight;
  private detailHandle: SculptModelHandle | null = null;
  private state: ExperienceState;
  private hoveredHandle: SculptModelHandle | null = null;
  private pointerDown: PointerSnapshot | null = null;
  private dragDistance = 0;
  private frameId = 0;

  constructor(private readonly container: HTMLElement, private readonly content: PortfolioContent) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    this.accessibilityLayer.append(this.liveRegion);
    this.container.append(this.accessibilityLayer);

    this.addLighting();
    this.coverHandle = createCoverModel(prefersReducedMotion);
    this.coverHandle.root.position.set(0, -0.12, 0);
    this.scene.add(this.coverHandle.root);
    this.registerHandle(this.coverHandle);

    this.directoryGroup.name = 'directory-screen';
    this.directoryGroup.visible = false;
    this.scene.add(this.directoryGroup);
    this.directoryHeader = makeTextPanel(1.42, 0.62, 0.08, {
      title: '#30ua',
      background: '#F4EF62',
      foreground: '#17213A',
      align: 'center',
      width: 700,
      height: 300,
    });
    this.directoryHeader.position.set(-4.85, 3.48, -0.15);
    this.directoryHeader.rotation.z = -0.22;
    this.directoryGroup.add(this.directoryHeader);

    const collageVariants: CollageVariant[] = ['sport', 'business', 'technology', 'culture', 'cinema'];
    for (const [index, category] of this.content.categories.entries()) {
      const handle = createDirectoryFolderModel(category, collageVariants[index]!, prefersReducedMotion);
      this.folderHandles.set(category.id, handle);
      this.directoryGroup.add(handle.root);
      this.registerHandle(handle);
    }

    this.finishTag = makeTextPanel(2.05, 0.62, 0.1, {
      title: 'EN   ○   ×',
      subtitle: 'FINISH',
      background: '#2B82EE',
      foreground: '#FFF8E8',
      align: 'center',
      width: 800,
      height: 300,
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
    this.animate();
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
    window.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.resize);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.liveRegion.textContent = '3D 场景暂时中断，正在等待恢复。';
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.liveRegion.textContent = '3D 场景已恢复。';
    });
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.updatePointer(event);
    if (this.pointerDown && this.detailHandle) {
      const dx = event.clientX - this.pointerDown.clientX;
      const dy = event.clientY - this.pointerDown.clientY;
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
    this.updatePointer(event);
    this.pointerDown = { x: this.pointer.x, y: this.pointer.y, clientX: event.clientX, clientY: event.clientY };
    this.dragDistance = 0;
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown) return;
    const dx = event.clientX - this.pointerDown.clientX;
    const horizontalSwipe = Math.abs(dx) > 48
      && this.state.screen === 'detail'
      && !['about', 'journey'].includes(this.currentCategory()?.presentation ?? '');
    this.updatePointer(event);
    if (horizontalSwipe) {
      this.dispatch({ type: dx < 0 ? 'NEXT_PROJECT' : 'PREVIOUS_PROJECT', projectCount: this.currentProjectCount() });
    } else if (this.dragDistance < 12) {
      const hit = this.pickTarget();
      if (hit) this.activateTarget(hit);
    }
    this.pointerDown = null;
    this.dragDistance = 0;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.state.screen !== 'detail' || Math.abs(event.deltaY) < 8) return;
    if (['about', 'journey'].includes(this.currentCategory()?.presentation ?? '')) return;
    event.preventDefault();
    this.dispatch({ type: event.deltaY > 0 ? 'NEXT_PROJECT' : 'PREVIOUS_PROJECT', projectCount: this.currentProjectCount() });
  };

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

  private activateTarget(target: THREE.Object3D): void {
    if (target.userData.action === 'visit-website') {
      this.liveRegion.textContent = '网站链接为占位内容，替换个人资料后即可启用。';
      return;
    }
    const action = resolveInteractionAction(target.userData as Record<string, unknown>, this.currentProjectCount());
    if (action) this.dispatch(action);
  }

  private async dispatch(action: ExperienceAction): Promise<void> {
    if (this.state.transitionLocked && action.type !== 'SET_TRANSITION_LOCK') return;
    if (action.type === 'ENTER_DIRECTORY') {
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: true });
      await this.coverHandle.actions.open();
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      this.state = reduceExperience(this.state, action);
      this.coverHandle.root.visible = false;
      this.directoryGroup.visible = true;
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'OPEN_CATEGORY') {
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: true });
      await this.folderHandles.get(action.categoryId)?.actions.open();
      const unlocked = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      const next = reduceExperience(unlocked, action);
      if (next === unlocked) return;
      this.state = reduceExperience(next, { type: 'SET_TRANSITION_LOCK', locked: true });
      this.directoryGroup.visible = false;
      await this.showDetail(action.categoryId);
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'NEXT_PROJECT' || action.type === 'PREVIOUS_PROJECT') {
      const category = this.currentCategory();
      if (category?.presentation === 'journey') return;
      const count = this.currentProjectCount();
      if (category?.presentation === 'scrapbook') {
        if (action.type === 'NEXT_PROJECT' && this.state.projectIndex >= count - 1) return;
        if (action.type === 'PREVIOUS_PROJECT' && this.state.projectIndex <= 0) return;
      }
      const nextState = reduceExperience(this.state, action);
      if (nextState.projectIndex === this.state.projectIndex) return;
      this.state = reduceExperience(nextState, { type: 'SET_TRANSITION_LOCK', locked: true });
      await this.detailHandle?.actions.setProject(nextState.projectIndex);
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'SELECT_JOURNEY_STATION') {
      if (this.currentCategory()?.presentation !== 'journey') return;
      this.state = reduceExperience(reduceExperience(this.state, action), { type: 'SET_TRANSITION_LOCK', locked: true });
      await this.detailHandle?.actions.setProject(action.stationIndex);
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'CLOSE_JOURNEY_POPUP') {
      if (this.currentCategory()?.presentation !== 'journey') return;
      this.state = reduceExperience(reduceExperience(this.state, action), { type: 'SET_TRANSITION_LOCK', locked: true });
      await this.detailHandle?.actions.setProject(-1);
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'CLOSE_DETAIL') {
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: true });
      await this.detailHandle?.actions.close();
      this.state = reduceExperience(this.state, { type: 'SET_TRANSITION_LOCK', locked: false });
      const categoryId = this.state.selectedCategoryId;
      this.state = reduceExperience(this.state, action);
      this.clearDetail();
      if (categoryId) await this.folderHandles.get(categoryId)?.actions.close();
      this.setSceneBackground('#2B82EE');
      this.directoryGroup.visible = true;
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'FINISH') {
      this.state = reduceExperience(this.state, action);
      this.clearDetail();
      this.setSceneBackground('#2B82EE');
      this.directoryGroup.visible = false;
      this.coverHandle.root.visible = false;
      this.thanksHandle.root.visible = true;
      await this.thanksHandle.actions.open();
      this.renderAccessibilityControls();
      return;
    }
    if (action.type === 'RESTART') {
      await this.thanksHandle.actions.close();
      this.state = reduceExperience(this.state, action);
      this.setSceneBackground('#2B82EE');
      this.thanksHandle.root.visible = false;
      this.directoryGroup.visible = false;
      this.coverHandle.root.visible = true;
      await this.coverHandle.actions.close();
      this.renderAccessibilityControls();
    }
  }

  private currentCategory(): Category | undefined {
    return this.content.categories.find((category) => category.id === this.state.selectedCategoryId);
  }

  private currentProjectCount(): number {
    const category = this.currentCategory();
    if (category?.presentation === 'about') return 1;
    if (category?.presentation === 'scrapbook') return category.scrapbookPages?.length ?? 1;
    if (category?.presentation === 'journey') return category.journeyExperiences?.length ?? 1;
    return category?.projects.length ?? 3;
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
    this.detailHandle = category.presentation === 'about'
      ? createAboutCvModel(category, this.state.reducedMotion)
      : category.presentation === 'scrapbook'
        ? createScrapbookModel(category, this.state.reducedMotion)
        : category.presentation === 'journey'
          ? createJourneyModel(category, this.state.reducedMotion)
        : category.presentation === 'book'
          ? createOpenBookModel(category, 0, this.state.reducedMotion)
          : createTicketStackModel(category, 0, this.state.reducedMotion);
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
    if (!this.detailHandle) return;
    this.unregisterHandle(this.detailHandle);
    this.detailHandle.dispose();
    this.detailHandle = null;
  }

  private renderAccessibilityControls(): void {
    this.accessibilityLayer.replaceChildren(this.liveRegion);
    const status = this.state.screen === 'cover'
      ? '封面：点击文件夹进入作品分类。'
      : this.state.screen === 'directory'
        ? '作品目录：五个分类文件夹。'
        : this.state.screen === 'detail'
          ? this.currentCategory()?.presentation === 'about'
            ? '正在浏览自我介绍与履历总览。'
            : this.currentCategory()?.presentation === 'journey'
              ? this.state.selectedJourneyStation === null
                ? '正在浏览实习旅途，选择一个站点查看经历。'
                : `正在浏览实习旅途，第 ${this.state.selectedJourneyStation + 1} 个站点。`
              : `正在浏览 ${this.currentCategory()?.title.zh ?? ''}，项目 ${this.state.projectIndex + 1}。`
          : '感谢观看。';
    this.liveRegion.textContent = status;

    const addButton = (label: string, action: ExperienceAction) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => this.dispatch(action));
      this.accessibilityLayer.append(button);
    };

    if (this.state.screen === 'cover') addButton('进入作品目录', { type: 'ENTER_DIRECTORY' });
    if (this.state.screen === 'directory') {
      for (const category of this.content.categories) addButton(`打开${category.title.zh}`, { type: 'OPEN_CATEGORY', categoryId: category.id });
      addButton('完成浏览', { type: 'FINISH' });
    }
    if (this.state.screen === 'detail') {
      const count = this.currentProjectCount();
      const category = this.currentCategory();
      if (!['about', 'journey'].includes(category?.presentation ?? '')) {
        addButton('上一个项目', { type: 'PREVIOUS_PROJECT', projectCount: count });
        addButton('下一个项目', { type: 'NEXT_PROJECT', projectCount: count });
      }
      if (category?.presentation === 'journey') {
        category.journeyExperiences?.forEach((experience, stationIndex) => {
          addButton(`查看站点 ${stationIndex + 1}：${experience.company.zh}`, {
            type: 'SELECT_JOURNEY_STATION', stationIndex,
          });
        });
        if (this.state.selectedJourneyStation !== null) {
          addButton('返回旅途地图', { type: 'CLOSE_JOURNEY_POPUP' });
        }
      }
      addButton('关闭详情', { type: 'CLOSE_DETAIL' });
    }
    if (this.state.screen === 'thanks') addButton('重新浏览', { type: 'RESTART' });
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

  private readonly animate = (): void => {
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
    const cameraX = this.state.screen === 'detail' ? 0 : this.pointer.x * 0.12;
    const cameraY = 0.25 + (this.state.screen === 'detail' ? 0 : this.pointer.y * 0.08);
    this.camera.position.x = damp(this.camera.position.x, cameraX, 3, delta);
    this.camera.position.y = damp(this.camera.position.y, cameraY, 3, delta);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.resize);
    for (const handle of this.modelHandles) handle.dispose();
    disposeObject(this.directoryHeader);
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}
