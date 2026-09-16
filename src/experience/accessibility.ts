import type { Category, PortfolioContent } from '../content/types';
import { findCategory } from './categories';
import type { ExperienceAction, ExperienceState } from './stateMachine';

export type ScreenControl = {
  label: string;
  action: ExperienceAction;
};

export type ScreenDescriptor = {
  heading: string;
  status: string;
  details: string[];
  controls: ScreenControl[];
};

export function countProjects(category: Category | undefined): number {
  if (!category) return 0;
  if (category.presentation === 'about') return 1;
  if (category.presentation === 'scrapbook') return category.scrapbookPages?.length ?? 1;
  if (category.presentation === 'journey') return category.journeyExperiences?.length ?? 1;
  return category.projects.length;
}

function isPageable(category: Category | undefined): boolean {
  return category !== undefined && !['about', 'journey'].includes(category.presentation);
}

function describeCover(content: PortfolioContent): ScreenDescriptor {
  return {
    heading: `${content.title.zh} / ${content.title.en}`,
    status: '封面：点击文件夹进入作品分类。',
    details: [`${content.owner.zh} / ${content.owner.en}`],
    controls: [{ label: '进入作品目录', action: { type: 'ENTER_DIRECTORY' } }],
  };
}

function describeDirectory(content: PortfolioContent): ScreenDescriptor {
  const controls: ScreenControl[] = content.categories.map((category) => ({
    label: `打开${category.title.zh}`,
    action: { type: 'OPEN_CATEGORY', categoryId: category.id },
  }));
  controls.push({ label: '完成浏览', action: { type: 'FINISH' } });

  return {
    heading: '作品目录',
    status: '作品目录：五个分类文件夹。',
    details: content.categories.map((category) => `${category.title.zh} / ${category.title.en}`),
    controls,
  };
}

function describeJourneyDetail(category: Category, state: ExperienceState): Omit<ScreenDescriptor, 'heading'> {
  const selected = state.selectedJourneyStation === null
    ? undefined
    : category.journeyExperiences?.[state.selectedJourneyStation];
  return {
    status: selected ? `正在浏览${selected.company.zh}实习详情。` : '正在浏览实习作品软木板。',
    details: selected
      ? [`${selected.company.zh} / ${selected.company.en}`, `${selected.role.zh}，${selected.period}`, selected.summary.zh]
      : [`${category.title.zh} / ${category.title.en}`, '软木板上陈列咪咕、网易有道、快手与京东实习便签。'],
    controls: selected
      ? [{ label: '关闭实习详情', action: { type: 'CLOSE_JOURNEY_POPUP' } }]
      : [],
  };
}

function describeScrapbookDetail(category: Category, state: ExperienceState): Omit<ScreenDescriptor, 'heading'> {
  const pages = category.scrapbookPages ?? [];
  const count = pages.length;
  const page = pages[state.projectIndex];
  const controls: ScreenControl[] = [];

  if (page?.education) {
    controls.push({ label: '本科', action: { type: 'SET_PROJECT_INDEX', projectIndex: 1 } });
    controls.push({ label: '硕士', action: { type: 'SET_PROJECT_INDEX', projectIndex: 0 } });
  } else if (state.projectIndex > 0) {
    controls.push({ label: page?.education ? '上一页' : '上一个项目', action: { type: 'PREVIOUS_PROJECT', projectCount: count } });
  }
  if (!page?.education && state.projectIndex < count - 1) {
    controls.push({ label: page?.education ? '下一页' : '下一个项目', action: { type: 'NEXT_PROJECT', projectCount: count } });
  }

  const details = page
    ? [`${page.title.zh} / ${page.title.en}`, page.subtitle.zh,
      ...(page.education ? [
        page.education.experience.college,
        `绩点 ${page.education.experience.gpa}，排名 ${page.education.experience.rank} ${page.education.experience.rankNote ?? ''}`,
        ...page.education.experience.honors,
        ...page.education.lines.map((line) => line.text),
      ] : []),
      `第 ${state.projectIndex + 1} 页，共 ${count} 页。`]
    : [`第 ${state.projectIndex + 1} 页，共 ${count} 页。`];

  return {
    status: `正在浏览 ${category.title.zh}，第 ${state.projectIndex + 1} 页。`,
    details,
    controls,
  };
}

function describeProjectDetail(category: Category, state: ExperienceState): Omit<ScreenDescriptor, 'heading'> {
  const count = countProjects(category);
  const project = category.projects[state.projectIndex];
  const controls: ScreenControl[] = [];

  if (isPageable(category)) {
    controls.push({ label: '上一个项目', action: { type: 'PREVIOUS_PROJECT', projectCount: count } });
    controls.push({ label: '下一个项目', action: { type: 'NEXT_PROJECT', projectCount: count } });
  }

  const details = project
    ? [
      `${project.title.zh} / ${project.title.en}`,
      `${project.year}。${project.summary.zh}`,
      project.tags.join('、'),
    ]
    : [`项目 ${state.projectIndex + 1}，共 ${count} 个。`];

  return {
    status: `正在浏览 ${category.title.zh}，项目 ${state.projectIndex + 1}。`,
    details,
    controls,
  };
}

function describeAboutDetail(content: PortfolioContent, category: Category): Omit<ScreenDescriptor, 'heading'> {
  return {
    status: '正在浏览自我介绍与履历总览。',
    details: [
      `${content.owner.zh} / ${content.owner.en}`,
      `${category.title.zh} / ${category.title.en}`,
      content.contact,
    ],
    controls: [],
  };
}

function describeDetail(content: PortfolioContent, state: ExperienceState): ScreenDescriptor {
  const category = findCategory(content, state.selectedCategoryId);

  if (!category) {
    return {
      heading: '作品详情',
      status: '该分类不可用，请返回作品目录。',
      details: ['该分类不可用，请返回作品目录。'],
      controls: [{ label: '关闭详情', action: { type: 'CLOSE_DETAIL' } }],
    };
  }

  const section = category.presentation === 'about'
    ? describeAboutDetail(content, category)
    : category.presentation === 'journey'
      ? describeJourneyDetail(category, state)
      : category.presentation === 'scrapbook'
        ? describeScrapbookDetail(category, state)
        : describeProjectDetail(category, state);

  return {
    heading: `${category.title.zh} / ${category.title.en}`,
    ...section,
    controls: [...section.controls, { label: '关闭详情', action: { type: 'CLOSE_DETAIL' } }],
  };
}

function describeThanks(content: PortfolioContent): ScreenDescriptor {
  return {
    heading: '感谢观看 / THANK YOU',
    status: '感谢观看。',
    details: [`联系方式：${content.contact}`],
    controls: [{ label: '重新浏览', action: { type: 'RESTART' } }],
  };
}

export function describeScreen(content: PortfolioContent, state: ExperienceState): ScreenDescriptor {
  switch (state.screen) {
    case 'cover':
      return describeCover(content);
    case 'directory':
      return describeDirectory(content);
    case 'detail':
      return describeDetail(content, state);
    case 'thanks':
      return describeThanks(content);
  }
}
