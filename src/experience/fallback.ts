import type { PortfolioContent } from '../content/types';

export type FallbackTag = 'section' | 'p' | 'h1' | 'ul' | 'li';

export type FallbackNode = {
  tag: FallbackTag;
  className?: string;
  text?: string;
  children?: FallbackNode[];
};

export function buildFallbackContent(content: PortfolioContent): FallbackNode {
  return {
    tag: 'section',
    className: 'fallback',
    children: [
      { tag: 'p', className: 'fallback__kicker', text: 'PORTFOLIO / 作品集' },
      { tag: 'h1', text: '你的浏览器暂时无法显示 3D 场景' },
      { tag: 'p', text: '请开启 WebGL 或使用最新版浏览器。你仍可通过以下列表浏览分类：' },
      {
        tag: 'ul',
        children: content.categories.map((category) => ({
          tag: 'li' as const,
          text: `${category.title.zh} / ${category.title.en}`,
        })),
      },
      { tag: 'p', text: content.contact },
    ],
  };
}

export function collectFallbackText(node: FallbackNode): string {
  const parts = node.text ? [node.text] : [];
  for (const child of node.children ?? []) parts.push(collectFallbackText(child));
  return parts.join(' ');
}

function createFallbackElement(node: FallbackNode): HTMLElement {
  const element = document.createElement(node.tag);
  if (node.className) element.className = node.className;
  if (node.text !== undefined) element.textContent = node.text;
  for (const child of node.children ?? []) element.append(createFallbackElement(child));
  return element;
}

export function buildFallback(container: HTMLElement, content: PortfolioContent): void {
  container.replaceChildren(createFallbackElement(buildFallbackContent(content)));
}
