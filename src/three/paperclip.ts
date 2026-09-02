import * as THREE from 'three';

const centerline = [
  new THREE.Vector3(0.25, 0.95, 0),
  new THREE.Vector3(0.25, 0.45, 0),
  new THREE.Vector3(0.25, -0.45, 0),
  new THREE.Vector3(0.15, -0.68, 0),
  new THREE.Vector3(-0.1, -0.82, 0),
  new THREE.Vector3(-0.38, -0.8, 0),
  new THREE.Vector3(-0.58, -0.62, 0),
  new THREE.Vector3(-0.64, -0.34, 0),
  new THREE.Vector3(-0.64, 0.22, 0),
  new THREE.Vector3(-0.6, 0.55, 0),
  new THREE.Vector3(-0.46, 0.82, 0),
  new THREE.Vector3(-0.22, 1.02, 0),
  new THREE.Vector3(0.08, 1.1, 0),
  new THREE.Vector3(0.4, 1.08, 0),
  new THREE.Vector3(0.68, 0.9, 0),
  new THREE.Vector3(0.86, 0.62, 0),
  new THREE.Vector3(0.92, 0.25, 0),
  new THREE.Vector3(0.92, -0.28, 0),
  new THREE.Vector3(0.88, -0.72, 0),
  new THREE.Vector3(0.75, -1.05, 0),
  new THREE.Vector3(0.5, -1.28, 0),
  new THREE.Vector3(0.18, -1.4, 0),
  new THREE.Vector3(-0.18, -1.4, 0),
  new THREE.Vector3(-0.52, -1.27, 0),
  new THREE.Vector3(-0.78, -1.03, 0),
  new THREE.Vector3(-0.94, -0.72, 0),
  new THREE.Vector3(-1, -0.36, 0),
  new THREE.Vector3(-1, -0.05, 0),
];

export function createPaperclip(color: string, scale = 1, radius = 0.035): THREE.Group {
  const group = new THREE.Group();
  group.name = 'paperclip';
  const curve = new THREE.CatmullRomCurve3(centerline, false, 'centripetal');
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.92,
    roughness: 0.2,
    envMapIntensity: 1.1,
  });
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 128, radius, 12, false), material);
  wire.name = 'wire';
  wire.castShadow = true;
  wire.receiveShadow = true;
  group.add(wire);

  const terminalGeometry = new THREE.SphereGeometry(radius, 12, 8);
  for (const [index, point] of [centerline[0]!, centerline.at(-1)!].entries()) {
    const terminal = new THREE.Mesh(terminalGeometry, material);
    terminal.name = `terminal-${index}`;
    terminal.position.copy(point);
    terminal.castShadow = true;
    group.add(terminal);
  }

  group.scale.setScalar(scale);
  return group;
}
