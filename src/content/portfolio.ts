import type { Category, PortfolioContent } from './types';
import { aboutProfile } from './profile';
import { educationExperiences } from './education';
import { createEducationPages } from '../education/layout';
import { skillPanels } from './skillWorkbench';
import { projectShowcases } from './projectExperience';

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
      {
        id: 'zhuanzhuan', company: { zh: '转转集团', en: 'Zhuanzhuan Group' },
        role: { zh: '品类运营（骑行）', en: 'Category Operations (Cycling)' }, period: '2026.08 — 至今',
        location: { zh: '深圳', en: 'Shenzhen' },
        summary: { zh: '骑行品类全链路运营，搭建货盘、营销与 AI 提效的运营闭环。', en: 'End-to-end cycling category operations across assortment, campaigns and AI efficiency.' },
        icon: 'growth', accent: '#C0503A',
      },
    ],
  },
  {
    id: 'illustration',
    title: { zh: 'AI作品集', en: 'AI Skills' },
    description: { zh: 'AI作品集', en: 'AI Skills' },
    shortTitle: 'SKILLS',
    color: '#FFEE57',
    secondaryColor: '#FF8CB6',
    presentation: 'accordion',
    projects: [],
    skillPanels,
  },
  {
    id: 'motion-3d',
    title: { zh: '项目经历', en: 'Project Experience' },
    description: { zh: '项目经历', en: 'Project Experience' },
    shortTitle: 'PROJECTS',
    color: '#F5A4E7',
    secondaryColor: '#77E4F4',
    presentation: 'projects',
    projects: [],
    projectShowcases,
  },
];

export const portfolioContent: PortfolioContent = {
  title: { zh: '作品集', en: 'PORTFOLIO' },
  owner: aboutProfile.name,
  contact: aboutProfile.contact,
  contactEmail: aboutProfile.contactEmail,
  categories,
};
