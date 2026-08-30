import type { Category, PortfolioContent } from './types';

const project = (
  categoryId: string,
  index: number,
  zh: string,
  en: string,
  accent: string,
  tags: string[],
) => ({
  id: `${categoryId}-${index + 1}`,
  title: { zh, en },
  year: `${2024 + (index % 2)}`,
  summary: {
    zh: '以清晰的视觉系统连接概念、内容与使用体验。',
    en: 'A focused visual system connecting concept, content and experience.',
  },
  tags,
  accent,
});

const categories: Category[] = [
  {
    id: 'brand',
    title: { zh: '品牌视觉', en: 'Brand Identity' },
    shortTitle: 'BRAND',
    color: '#77A3FF',
    secondaryColor: '#F7A8FF',
    presentation: 'about',
    projects: [
      project('brand', 0, '晨光咖啡品牌', 'Morning Brew Identity', '#FF6B57', ['IDENTITY', 'PACKAGING']),
      project('brand', 1, '城市文化节', 'City Culture Festival', '#E8FF63', ['CAMPAIGN', 'SYSTEM']),
      project('brand', 2, '新生代工作室', 'New Wave Studio', '#7BE7B1', ['STRATEGY', 'TYPE']),
    ],
  },
  {
    id: 'ui-web',
    title: { zh: 'UI / 网页', en: 'UI & Web' },
    shortTitle: 'UI / WEB',
    color: '#77E3A0',
    secondaryColor: '#C6FF72',
    presentation: 'scrapbook',
    projects: [
      project('ui-web', 0, '城市漫游应用', 'City Walk App', '#2D85F6', ['PRODUCT', 'MOBILE']),
      project('ui-web', 1, '独立杂志网站', 'Independent Journal', '#FF7D58', ['EDITORIAL', 'WEB']),
      project('ui-web', 2, '创意工具面板', 'Creative Toolkit', '#B56BE8', ['DASHBOARD', 'UX']),
    ],
    scrapbookPages: [
      {
        id: 'hello', title: { zh: '你好，作品集', en: 'Hello, Portfolio' },
        subtitle: { zh: '关于我的数字设计、兴趣与视觉语言。', en: 'A scrapbook of digital design, interests and visual language.' },
        kicker: 'ABOUT ME', palette: ['#E9E6D8', '#BFD6F4', '#F5B7D1'], motif: 'intro',
      },
      {
        id: 'mobile', title: { zh: '移动产品', en: 'Mobile Product' },
        subtitle: { zh: '城市漫游应用的体验结构与关键界面。', en: 'Experience structure and key screens for a city-walk app.' },
        kicker: 'UI / PRODUCT', palette: ['#E5F1E8', '#7CC7B5', '#F0CC75'], motif: 'mobile',
      },
      {
        id: 'editorial', title: { zh: '编辑网站', en: 'Editorial Website' },
        subtitle: { zh: '独立内容网站的网格、字体和阅读节奏。', en: 'Grid, typography and reading rhythm for an independent journal.' },
        kicker: 'WEB / EDITORIAL', palette: ['#F2E3DB', '#EF876F', '#88A7D0'], motif: 'editorial',
      },
      {
        id: 'process', title: { zh: '设计过程', en: 'Design Process' },
        subtitle: { zh: '从研究、草图到组件系统和可用性验证。', en: 'From research and sketches to components and usability checks.' },
        kicker: 'PROCESS', palette: ['#E7E2F2', '#9B82CA', '#E6C65F'], motif: 'process',
      },
      {
        id: 'thanks', title: { zh: '感谢翻阅', en: 'Thank You' },
        subtitle: { zh: '期待与你一起完成有温度的数字体验。', en: 'Let us make thoughtful digital experiences together.' },
        kicker: 'CONTACT', palette: ['#E8EBE2', '#89A9A0', '#F1A7B7'], motif: 'contact',
      },
    ],
  },
  {
    id: 'poster-editorial',
    title: { zh: '海报编辑', en: 'Poster & Editorial' },
    shortTitle: 'POSTER',
    color: '#FF815B',
    secondaryColor: '#FFD169',
    presentation: 'journey',
    projects: [
      project('poster-editorial', 0, '未来文字实验', 'Future Type Studies', '#F1436F', ['POSTER', 'TYPE']),
      project('poster-editorial', 1, '声音档案', 'Sound Archive', '#3A87F5', ['EDITORIAL', 'PRINT']),
      project('poster-editorial', 2, '日常观察', 'Everyday Observations', '#F6D657', ['BOOK', 'LAYOUT']),
    ],
    journeyExperiences: [
      {
        id: 'internship-01', company: { zh: '创意工作室 A', en: 'Creative Studio A' },
        role: { zh: '视觉设计实习生', en: 'Visual Design Intern' }, period: '2023.06 — 2023.09',
        location: { zh: '上海', en: 'Shanghai' },
        summary: { zh: '参与品牌资料、社交媒体与活动视觉的设计协作。', en: 'Supported brand, social and campaign visual design.' },
        icon: 'badge', accent: '#F58B75',
      },
      {
        id: 'internship-02', company: { zh: '数字产品团队 B', en: 'Digital Product Team B' },
        role: { zh: 'UI 设计实习生', en: 'UI Design Intern' }, period: '2023.11 — 2024.02',
        location: { zh: '杭州', en: 'Hangzhou' },
        summary: { zh: '协助界面规范、组件整理与产品原型迭代。', en: 'Assisted interface systems, components and prototypes.' },
        icon: 'studio', accent: '#6DA8DD',
      },
      {
        id: 'internship-03', company: { zh: '品牌咨询公司 C', en: 'Brand Consultancy C' },
        role: { zh: '品牌设计实习生', en: 'Brand Design Intern' }, period: '2024.04 — 2024.08',
        location: { zh: '北京', en: 'Beijing' },
        summary: { zh: '参与品牌调研、提案排版与识别系统延展。', en: 'Contributed to research, decks and identity extensions.' },
        icon: 'office', accent: '#E96F72',
      },
      {
        id: 'internship-04', company: { zh: '体验设计团队 D', en: 'Experience Design Team D' },
        role: { zh: '交互设计实习生', en: 'Interaction Design Intern' }, period: '2024.10 — 2025.01',
        location: { zh: '深圳', en: 'Shenzhen' },
        summary: { zh: '参与用户旅程、动效规范与交互演示制作。', en: 'Worked on journeys, motion rules and interaction demos.' },
        icon: 'growth', accent: '#75B77D',
      },
    ],
  },
  {
    id: 'illustration',
    title: { zh: '插画', en: 'Illustration' },
    shortTitle: 'ILLUST.',
    color: '#FFEE57',
    secondaryColor: '#FF8CB6',
    presentation: 'book',
    projects: [
      project('illustration', 0, '柔软城市', 'Soft City', '#70D8EE', ['CHARACTER', 'SCENE']),
      project('illustration', 1, '植物通信', 'Botanical Signals', '#7EE181', ['BOTANICAL', 'SERIES']),
      project('illustration', 2, '夜间电台', 'Night Radio', '#755BE8', ['STORY', 'COLOR']),
    ],
  },
  {
    id: 'motion-3d',
    title: { zh: '动态 / 3D', en: 'Motion & 3D' },
    shortTitle: 'MOTION',
    color: '#F5A4E7',
    secondaryColor: '#77E4F4',
    presentation: 'ticket',
    projects: [
      project('motion-3d', 0, '弹性字体', 'Elastic Type', '#E8FF68', ['MOTION', 'TYPE']),
      project('motion-3d', 1, '纸张实验室', 'Paper Lab', '#FF755B', ['THREE.JS', 'MATERIAL']),
      project('motion-3d', 2, '漂浮档案', 'Floating Archive', '#5E82F4', ['3D', 'INTERACTION']),
    ],
  },
];

export const portfolioContent: PortfolioContent = {
  title: { zh: '作品集', en: 'PORTFOLIO' },
  owner: { zh: '你的名字', en: 'YOUR NAME' },
  role: { zh: '视觉与交互设计', en: 'VISUAL & INTERACTION DESIGN' },
  contact: 'hello@example.com',
  categories,
};
