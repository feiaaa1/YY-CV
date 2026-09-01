import { describe, expect, test } from 'vitest';
import { buildFallbackContent, collectFallbackText } from '../src/experience/fallback';
import { findCategory, hasCategory } from '../src/experience/categories';
import { portfolioContent } from '../src/content/portfolio';
import fallbackSource from '../src/experience/fallback.ts?raw';
import mainSource from '../src/main.ts?raw';
import type { PortfolioContent } from '../src/content/types';

function cloneContent(): PortfolioContent {
  return structuredClone(portfolioContent);
}

describe('fallback content', () => {
  test('keeps hostile category titles as literal text rather than markup', () => {
    const content = cloneContent();
    content.categories[0]!.title.zh = '<img src=x onerror=alert(1)>';
    const tree = buildFallbackContent(content);
    const text = collectFallbackText(tree);

    expect(text).toContain('<img src=x onerror=alert(1)>');
    expect(JSON.stringify(tree)).not.toMatch(/"tag"\s*:\s*"img"/);
  });

  test('describes every category and the contact string', () => {
    const content = cloneContent();
    const text = collectFallbackText(buildFallbackContent(content));

    for (const category of content.categories) {
      expect(text).toContain(category.title.zh);
      expect(text).toContain(category.title.en);
    }
    expect(text).toContain(content.contact);
  });

  test('builds only known safe element tags', () => {
    const tree = buildFallbackContent(cloneContent());
    const tags = new Set<string>();
    const walk = (node: { tag: string; children?: { tag: string }[] }): void => {
      tags.add(node.tag);
      for (const child of node.children ?? []) walk(child as never);
    };
    walk(tree);

    expect([...tags].sort()).toEqual(['h1', 'li', 'p', 'section', 'ul']);
  });

  test('never routes portfolio strings through an HTML sink', () => {
    for (const source of [fallbackSource, mainSource]) {
      expect(source).not.toContain('innerHTML');
      expect(source).not.toContain('outerHTML');
      expect(source).not.toContain('insertAdjacentHTML');
    }
  });
});

describe('category validation', () => {
  test('resolves only identifiers that exist in the content', () => {
    const content = cloneContent();
    const known = content.categories[0]!.id;

    expect(findCategory(content, known)?.id).toBe(known);
    expect(hasCategory(content, known)).toBe(true);
  });

  test('rejects unknown, empty, and prototype-shaped identifiers', () => {
    const content = cloneContent();

    for (const id of ['missing-category', '', '__proto__', 'constructor', 'toString']) {
      expect(findCategory(content, id)).toBeUndefined();
      expect(hasCategory(content, id)).toBe(false);
    }
  });

  test('rejects a null or undefined identifier without throwing', () => {
    const content = cloneContent();

    expect(hasCategory(content, null)).toBe(false);
    expect(hasCategory(content, undefined)).toBe(false);
  });
});
