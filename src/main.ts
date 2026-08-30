import './styles.css';
import { portfolioContent } from './content/portfolio';
import { PortfolioExperience } from './experience/PortfolioExperience';

const app = document.querySelector<HTMLElement>('#app');

if (!app) throw new Error('Missing #app element');

try {
  new PortfolioExperience(app, portfolioContent);
} catch (error) {
  console.error(error);
  app.innerHTML = `
    <section class="fallback">
      <p class="fallback__kicker">PORTFOLIO / 作品集</p>
      <h1>你的浏览器暂时无法显示 3D 场景</h1>
      <p>请开启 WebGL 或使用最新版浏览器。你仍可通过以下列表浏览分类：</p>
      <ul>${portfolioContent.categories.map((category) => `<li>${category.title.zh} / ${category.title.en}</li>`).join('')}</ul>
      <p>${portfolioContent.contact}</p>
    </section>`;
}
