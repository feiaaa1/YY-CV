import * as THREE from 'three';
import { createTextTexture, type TextTextureOptions } from './textures';
import { createReferenceTexture, type ReferenceGraphic } from './referenceGraphics';

export function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export function folderBackShape(width: number, height: number, tabWidth: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + 0.18, y);
  shape.lineTo(x + width - 0.18, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + 0.18);
  shape.lineTo(x + width, y + height - 0.18);
  shape.quadraticCurveTo(x + width, y + height, x + width - 0.18, y + height);
  shape.lineTo(tabWidth / 2, y + height);
  shape.lineTo(tabWidth / 2 - 0.18, y + height + 0.42);
  shape.lineTo(-tabWidth / 2 + 0.18, y + height + 0.42);
  shape.lineTo(-tabWidth / 2, y + height);
  shape.lineTo(x + 0.18, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - 0.18);
  shape.lineTo(x, y + 0.18);
  shape.quadraticCurveTo(x, y, x + 0.18, y);
  return shape;
}

export function ticketShape(width: number, height: number, teeth = 16): THREE.Shape {
  const shape = new THREE.Shape();
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  shape.moveTo(left, bottom + 0.16);
  for (let index = 0; index <= teeth; index += 1) {
    const x = left + (width * index) / teeth;
    shape.lineTo(x, bottom + (index % 2 === 0 ? 0.16 : 0));
  }
  shape.lineTo(right, top - 0.3);
  shape.lineTo(right - 0.3, top);
  shape.lineTo(left, top);
  shape.closePath();
  return shape;
}

export function makeExtrudedMesh(shape: THREE.Shape, color: string, depth = 0.08, bevel = 0.04): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel * 0.7,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeTextPanel(width: number, height: number, depth: number, options: TextTextureOptions): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
  const edge = new THREE.MeshStandardMaterial({
    color: options.background ?? '#FFF9EC',
    roughness: 0.92,
    transparent: options.transparentBackground ?? false,
    opacity: options.transparentBackground ? 0 : 1,
  });
  const face = new THREE.MeshBasicMaterial({ map: createTextTexture(options), toneMapped: false, transparent: options.transparentBackground ?? false });
  const mesh = new THREE.Mesh(geometry, [edge, edge.clone(), edge.clone(), edge.clone(), face, edge.clone()]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeReferencePanel(width: number, height: number, depth: number, graphic: ReferenceGraphic): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const edge = new THREE.MeshStandardMaterial({ color: graphic.background, roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ map: createReferenceTexture(graphic), roughness: 0.88 });
  const mesh = new THREE.Mesh(geometry, [edge, edge.clone(), edge.clone(), edge.clone(), face, edge.clone()]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function updateTextPanel(mesh: THREE.Mesh, options: TextTextureOptions): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const face = materials[4];
  if (!(face instanceof THREE.MeshStandardMaterial) && !(face instanceof THREE.MeshBasicMaterial)) return;
  face.map?.dispose();
  face.map = createTextTexture(options);
  face.needsUpdate = true;
}

export function makeTag(label: string, color: string, action: string): THREE.Mesh {
  const tag = makeTextPanel(1.7, 0.58, 0.075, {
    title: label,
    background: color,
    foreground: '#172033',
    align: 'center',
    width: 640,
    height: 240,
    titleScale: 0.2,
  });
  const edgeColor = new THREE.Color(color).multiplyScalar(0.68);
  const materials = Array.isArray(tag.material) ? tag.material : [tag.material];
  materials.forEach((material, index) => {
    if (index === 4 || !(material instanceof THREE.MeshStandardMaterial)) return;
    material.color.copy(edgeColor);
  });
  tag.userData.action = action;
  return tag;
}
