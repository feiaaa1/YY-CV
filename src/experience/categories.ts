import type { Category, PortfolioContent } from '../content/types';

export function findCategory(content: PortfolioContent, categoryId: string | null | undefined): Category | undefined {
  if (typeof categoryId !== 'string' || categoryId.length === 0) return undefined;
  return content.categories.find((category) => category.id === categoryId);
}

export function hasCategory(content: PortfolioContent, categoryId: string | null | undefined): boolean {
  return findCategory(content, categoryId) !== undefined;
}
