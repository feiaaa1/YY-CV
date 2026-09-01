import * as THREE from 'three';

export type SculptModelActions = {
  setHovered(hovered: boolean): void;
  setReducedMotion(reduced: boolean): void;
  open(): Promise<void> | void;
  close(): Promise<void> | void;
  setProject(index: number): Promise<void> | void;
  explode(amount: number): void;
  reset(): void;
};

export type SculptModelHandle = {
  root: THREE.Group;
  parts: Map<string, THREE.Object3D>;
  interactiveTargets: THREE.Object3D[];
  actions: SculptModelActions;
  update(delta: number, elapsed: number): void;
  dispose(): void;
};

export function damp(current: number, target: number, lambda: number, delta: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

export function disposeObject(root: THREE.Object3D): void {
  if (root.userData.disposed === true) return;
  root.userData.disposed = true;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
  root.removeFromParent();
}

export function createHandle(
  root: THREE.Group,
  parts: Map<string, THREE.Object3D>,
  interactiveTargets: THREE.Object3D[],
  modelActions: Partial<SculptModelActions>,
  update: (delta: number, elapsed: number) => void = () => undefined,
): SculptModelHandle {
  root.userData.reducedMotion ??= false;
  const initial = new Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>();
  for (const [id, part] of parts) {
    initial.set(id, { position: part.position.clone(), rotation: part.rotation.clone(), scale: part.scale.clone() });
  }

  const actions: SculptModelActions = {
    setHovered: modelActions.setHovered ?? (() => undefined),
    setReducedMotion: modelActions.setReducedMotion ?? ((reduced) => { root.userData.reducedMotion = reduced; }),
    open: modelActions.open ?? (() => undefined),
    close: modelActions.close ?? (() => undefined),
    setProject: modelActions.setProject ?? ((index) => { root.userData.projectIndex = index; }),
    explode: modelActions.explode ?? ((amount) => {
      let index = 0;
      for (const [id, part] of parts) {
        if (id === 'root') continue;
        const base = initial.get(id);
        if (!base) continue;
        const angle = index * 2.399;
        part.position.set(base.position.x + Math.cos(angle) * amount, base.position.y + Math.sin(angle) * amount, base.position.z + amount * 0.45);
        index += 1;
      }
    }),
    reset: modelActions.reset ?? (() => {
      for (const [id, part] of parts) {
        const base = initial.get(id);
        if (!base) continue;
        part.position.copy(base.position);
        part.rotation.copy(base.rotation);
        part.scale.copy(base.scale);
      }
    }),
  };

  root.userData.sculptRuntime = {
    nodes: Object.fromEntries(parts),
    meshes: interactiveTargets.map((target) => target.name),
    sockets: ['root-surface'],
    colliders: ['root-bounds'],
    destructionGroups: [...parts.keys()].filter((id) => id !== 'root'),
  };

  return { root, parts, interactiveTargets, actions, update, dispose: () => disposeObject(root) };
}
