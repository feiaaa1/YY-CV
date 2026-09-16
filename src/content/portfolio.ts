import type { Category, PortfolioContent } from './types';
import { aboutProfile } from './profile';
import { educationExperiences } from './education';
import { createEducationPages } from '../education/layout';

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
    description: { zh: '个人介绍', en: 'About Me' },
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
    title: { zh: '校园经历', en: 'Campus Experience' },
    description: { zh: '校园经历', en: 'Campus Experience' },
    shortTitle: 'CAMPUS',
    color: '#77E3A0',
    secondaryColor: '#C6FF72',
    presentation: 'scrapbook',
    initialProjectIndex: 0,
    projects: [
      project('ui-web', 0, '天津仁爱学院', 'Renai College', '#BCD6BB', ['学习经历']),
      project('ui-web', 1, '荣誉与奖项', 'Honors & Awards', '#EDBCBE', ['校园经历']),
      project('ui-web', 2, '北京体育大学', 'Beijing Sport University', '#BDCEE8', ['学术实践']),
    ],
    scrapbookPages: createEducationPages(educationExperiences),
  },
  {
    id: 'poster-editorial',
    title: { zh: '实习经历', en: 'Internship Experience' },
    description: { zh: '实习经历', en: 'Internship Experience' },
    shortTitle: 'INTERNS',
    color: '#FF815B',
    secondaryColor: '#FFD169',
    presentation: 'journey',
    projects: [],
    journeyExperiences: [
      {
        id: 'migu', company: { zh: '咪咕', en: 'Migu' },
        role: { zh: '内容运营', en: 'Content Operations' }, period: '2025.02 — 2025.06',
        location: { zh: '北京', en: 'Beijing' },
        summary: { zh: '赛事 IP 内容策划、平台运营与新媒体矩阵执行。', en: 'Sports IP content, platform operations and social media execution.' },
        icon: 'badge', accent: '#5B6846',
      },
      {
        id: 'youdao', company: { zh: '网易有道', en: 'NetEase Youdao' },
        role: { zh: '内容营销', en: 'Content Marketing' }, period: '2025.06 — 2025.09',
        location: { zh: '北京', en: 'Beijing' },
        summary: { zh: '达人拓展、合作管理与内容转化。', en: 'Creator partnerships, collaboration management and content conversion.' },
        icon: 'studio', accent: '#526354',
      },
      {
        id: 'kuaishou', company: { zh: '快手', en: 'Kuaishou' },
        role: { zh: '内容运营', en: 'Content Operations' }, period: '2025.10 — 2026.02',
        location: { zh: '北京', en: 'Beijing' },
        summary: { zh: '技术品牌内容传播、社区运营与活动策划。', en: 'Technical brand content, community operations and event campaigns.' },
        icon: 'office', accent: '#3F625E',
      },
      {
        id: 'jd', company: { zh: '京东', en: 'JD.com' },
        role: { zh: '采销（电商运营）', en: 'Merchandising & E-commerce Operations' }, period: '2026.03 — 2026.07',
        location: { zh: '北京', en: 'Beijing' },
        summary: { zh: '品牌运营、商业化合作、客户增长与渠道经营。', en: 'Brand operations, commercial partnerships, customer growth and channel management.' },
        icon: 'growth', accent: '#53664B',
      },
    ],
  },
  {
    id: 'illustration',
    title: { zh: '插画', en: 'Illustration' },
    description: { zh: '专业技能', en: 'Professional Skills' },
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
    description: { zh: '项目作品', en: 'Selected Projects' },
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
  title: { zh: '电商运营作品集', en: 'E-COMMERCE PORTFOLIO' },
  owner: aboutProfile.name,
  role: { zh: '电商运营', en: 'E-COMMERCE OPERATIONS' },
  contact: aboutProfile.contact,
  categories,
};
