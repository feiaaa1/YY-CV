/**
 * The suite runs in Node, but the project deliberately ships without
 * `@types/node`. Only the two read-only helpers the content tests use are
 * declared, so the type check stays honest about everything else.
 */
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
}

declare const process: {
  cwd(): string;
};
