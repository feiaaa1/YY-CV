import './styles.css';
import { portfolioContent } from './content/portfolio';
import { PortfolioExperience } from './experience/PortfolioExperience';
import { buildFallback } from './experience/fallback';

const app = document.querySelector<HTMLElement>('#app');

if (!app) throw new Error('Missing #app element');

try {
  new PortfolioExperience(app, portfolioContent);
} catch (error) {
  console.error(error);
  buildFallback(app, portfolioContent);
}
