import type { LocalizedText, SkillImage, SkillPanel } from './types';

/**
 * Copy for the fourth folder. Every word comes from 骑行营销工作台.docx — the
 * panels keep the document's own section order (背景 / 解决方案 / 效果) so the
 * screen reads exactly like the source, with English added for the bilingual
 * portfolio.
 *
 * The `en` fields are kept as the translation of record but are not printed:
 * the folder shows the Chinese copy on its own.
 */

const ASSET_ROOT = '/assets/skills';

const asset = (file: string): string => `${ASSET_ROOT}/${file}`;

/**
 * Natural width / height of every shipped screenshot. The gallery prints a
 * tile of the same proportion (clamped into a 0.62–1.5 band) so a wide desktop
 * shot is not cropped into a narrow portrait frame and a square product photo
 * is not stretched.
 */
const aspects: Record<string, number> = {
  'workbench-dashboard.webp': 0.834,
  'workbench-metrics.webp': 0.667,
  'workbench-archive.webp': 0.267,
  'data-agent-fields.webp': 0.372,
  'data-agent-rules.webp': 0.411,
  'data-agent-report.webp': 1.031,
  'task-reminder.webp': 0.824,
  'task-today.webp': 0.708,
  'task-desktop.webp': 1.638,
  'product-raw-1.webp': 1,
  'product-raw-2.webp': 1,
  'product-raw-3.webp': 1,
  'product-raw-4.webp': 1,
  'product-raw-5.webp': 1,
  'product-raw-6.webp': 1,
  'product-out-1.webp': 0.935,
  'product-out-2.webp': 0.94,
  'product-out-3.webp': 1.249,
  'product-out-4.webp': 0.776,
  'product-out-5.webp': 0.8,
  'visual-library.webp': 0.5,
  'visual-poster-1.webp': 0.355,
  'visual-poster-2.webp': 0.312,
  'visual-poster-3.webp': 0.333,
};

/**
 * Pictures whose original carries noticeably more detail than the tile. Only
 * these ship a second file, and it is fetched the moment a preview opens.
 */
const sharpened = new Set([
  'workbench-dashboard.webp',
  'workbench-archive.webp',
  'workbench-metrics.webp',
  'data-agent-fields.webp',
  'data-agent-rules.webp',
  'visual-poster-1.webp',
  'visual-poster-2.webp',
  'visual-poster-3.webp',
]);

export const skillWorkbenchFullAssetUrls = [...sharpened]
  .map((file) => `${ASSET_ROOT}/full/${file}`);

const shot = (file: string, caption?: LocalizedText): SkillImage => ({
  src: asset(file),
  full: sharpened.has(file) ? `${ASSET_ROOT}/full/${file}` : undefined,
  aspect: aspects[file]!,
  caption,
});

export const skillWorkbenchAssetUrls = [
  asset('workbench-dashboard.webp'),
  asset('workbench-archive.webp'),
  asset('workbench-metrics.webp'),
  asset('data-agent-fields.webp'),
  asset('data-agent-rules.webp'),
  asset('data-agent-report.webp'),
  asset('task-reminder.webp'),
  asset('task-today.webp'),
  asset('task-desktop.webp'),
  asset('product-raw-1.webp'),
  asset('product-raw-2.webp'),
  asset('product-raw-3.webp'),
  asset('product-raw-4.webp'),
  asset('product-raw-5.webp'),
  asset('product-raw-6.webp'),
  asset('product-out-1.webp'),
  asset('product-out-2.webp'),
  asset('product-out-3.webp'),
  asset('product-out-4.webp'),
  asset('product-out-5.webp'),
  asset('visual-library.webp'),
  asset('visual-poster-1.webp'),
  asset('visual-poster-2.webp'),
  asset('visual-poster-3.webp'),
] as const;

export const skillPanels: SkillPanel[] = [
  {
    id: 'workbench',
    code: '01',
    shortTitle: 'WORKBENCH',
    title: { zh: '骑行营销工作台', en: 'Cycling Marketing Workbench' },
    tagline: { zh: '从热点发现到活动复盘的完整闭环', en: 'Trend to review, in one loop' },
    accent: '#FFE45C',
    cover: asset('workbench-archive.webp'),
    sections: [
      {
        label: { zh: '背景', en: 'Context' },
        text: {
          zh: '骑行品类需要保持较高频的营销节奏。每周都需要持续关注骑行行业热点内容，并基于热点策划周五至下周一的营销活动；活动上线后，还需要重新回收 Push、Feed、会场等渠道数据，与历史活动进行横向对比和效果归因。一轮完整工作通常需要约 5 小时，且不同周之间的复盘口径较难保持一致。',
          en: 'Cycling keeps a high marketing cadence. Every week I follow category trends, plan the Friday-to-Monday campaign around them, then pull Push, Feed and venue data to compare with past campaigns and attribute the result. One full round took about five hours, and the review criteria drifted from week to week.',
        },
      },
      {
        label: { zh: '解决方案', en: 'Solution' },
        text: {
          zh: '针对这一问题，我搭建了一个 AI 骑行营销工作台。整个工作台将原本分散的 热点发现 → 选题生成 → 活动策划 → 数据抓取 → 数据看板 → 活动复盘 串联成完整闭环，让 AI 不只参与内容生成，而是进入营销运营的核心工作流。',
          en: 'I built an AI cycling marketing workbench that links trend discovery → topic generation → campaign planning → data capture → dashboards → campaign review into one loop, so AI joins the core workflow instead of only drafting copy.',
        },
      },
      {
        label: { zh: '效果', en: 'Impact' },
        text: {
          zh: '一次完整营销分析与复盘的工作时间由原来的约 5 小时缩短至约 1 小时，效率提升约 80%。同时，通过固定数据指标和复盘框架，使不同活动之间可以持续进行横向比较，减少依赖个人经验判断的问题。',
          en: 'One full analysis and review dropped from about five hours to about one — roughly 80% faster. Fixed metrics and a shared review framework let campaigns be compared consistently instead of relying on personal judgement.',
        },
      },
    ],
    imageGroups: [
      {
        label: { zh: '工作台界面', en: 'Workbench screens' },
        images: [
          shot('workbench-dashboard.webp', { zh: '热点与选题生成', en: 'Trends and topics' }),
          shot('workbench-metrics.webp', { zh: '数据看板', en: 'Metrics board' }),
          shot('workbench-archive.webp', { zh: '活动数据回收', en: 'Campaign archive' }),
        ],
      },
    ],
  },
  {
    id: 'data-agent',
    code: '02',
    shortTitle: 'DATA AGENT',
    title: { zh: '数据取数智能体', en: 'AI Data Agent' },
    tagline: { zh: '飞书 + Codex，把高频取数沉淀成 Skills', en: 'Feishu + Codex, high-frequency pulls as skills' },
    accent: '#7BE7B1',
    cover: asset('data-agent-report.webp'),
    sections: [
      {
        label: { zh: '背景', en: 'Context' },
        text: {
          zh: '日常运营过程中需要频繁查看不同系统的数据，同时每天还需要完成日报更新。由于业务数据分散在多个系统中，传统取数流程往往需要在不同平台之间反复切换，再进行筛选、整理和计算。这占用了大量时间，也容易因为筛选条件、统计口径或人工操作不同产生误差。',
          en: 'Daily operations mean checking data across several systems and refreshing the daily report. Because the data is scattered, the old flow meant switching platforms, then filtering, sorting and calculating by hand. It consumed hours and invited errors from inconsistent filters, definitions or manual steps.',
        },
      },
      {
        label: { zh: '解决方案', en: 'Solution' },
        text: {
          zh: '搭建了一套 AI 数据取数智能体，将飞书工作环境与 Codex 连接，并针对高频数据需求训练和沉淀专门的取数 Skills。首先将日常高频数据需求拆解成固定的数据规则，包括数据源、筛选条件、计算逻辑、时间范围和输出格式，并将这些规则封装进 Skills 中。完成配置后，智能体可以按照固定规则自动完成每日数据更新，同时支持通过自然语言进行临时取数。',
          en: 'I built an AI data agent that connects the Feishu workspace to Codex and trains dedicated pulling skills for recurring needs. High-frequency requests were broken into fixed rules — data source, filters, calculation logic, time range and output format — and packaged as skills. The agent then refreshes the daily numbers automatically while still answering ad-hoc requests in natural language.',
        },
      },
      {
        label: { zh: '效果', en: 'Impact' },
        text: {
          zh: '日报中的固定数据可以自动更新，减少每天重复操作；另一方面，临时的数据需求也能够通过指令快速完成查询，大幅降低跨系统寻找数据的时间成本。',
          en: 'The fixed figures in the daily report update themselves, cutting repeated manual work, and one-off questions are answered by a single instruction instead of hunting across systems.',
        },
      },
    ],
    imageGroups: [
      {
        label: { zh: '取数配置与日报', en: 'Pulling rules and daily report' },
        images: [
          shot('data-agent-fields.webp', { zh: '字段与口径拆解', en: 'Fields and definitions' }),
          shot('data-agent-rules.webp', { zh: '取数规则清单', en: 'Rule list' }),
          shot('data-agent-report.webp', { zh: '自动更新后的日报', en: 'Auto-updated report' }),
        ],
      },
    ],
  },
  {
    id: 'task-assistant',
    code: '03',
    shortTitle: 'TASK DESK',
    title: { zh: '桌面任务管理助手', en: 'Desktop Task Assistant' },
    tagline: { zh: '每天 10:00 与 14:00 主动提醒未完成事项', en: 'Proactive reminders at 10:00 and 14:00' },
    accent: '#7FD8F7',
    cover: asset('task-desktop.webp'),
    sections: [
      {
        label: { zh: '背景', en: 'Context' },
        text: {
          zh: '日常运营工作中同时存在活动策划、数据分析、设计沟通、商品运营、跨部门协作等大量并行任务。过去主要依赖聊天记录、飞书消息记录待办事项，但这些信息分散在不同位置，容易出现“事情记录过，但没有及时推进”的情况。尤其在任务较多时，普通记事本只能解决“记录”问题，却无法主动提醒哪些工作还没有完成。',
          en: 'Operations work runs many tasks in parallel: campaign planning, data analysis, design requests, merchandising, cross-team coordination. To-dos used to live in chat threads and Feishu messages, so items were logged but not always pushed forward. A plain notebook solves recording, never reminding.',
        },
      },
      {
        label: { zh: '解决方案', en: 'Solution' },
        text: {
          zh: '搭建了一个桌面任务管理助手。工具可以随时记录新增工作，并对任务进行完成/未完成状态管理。相比普通备忘录，我进一步加入了主动提醒机制：系统会在每天 10:00 和 14:00 自动检查当前任务状态，并汇总仍未完成的工作内容进行提醒。',
          en: 'I built a desktop task assistant that logs new work at any time and tracks each item as done or open. On top of a normal memo it adds a proactive reminder: twice a day, at 10:00 and 14:00, it checks the list and surfaces everything still unfinished.',
        },
      },
      {
        label: { zh: '效果', en: 'Impact' },
        text: {
          zh: '通过主动提醒机制，减少了因为工作事项过多导致的任务遗漏，同时帮助我持续记录每日工作的推进情况。',
          en: 'The reminder loop removed the drop-offs caused by too many parallel tasks and keeps a running record of what moved each day.',
        },
      },
    ],
    imageGroups: [
      {
        label: { zh: '助手界面', en: 'Assistant screens' },
        images: [
          shot('task-reminder.webp', { zh: '14:00 待办提醒', en: '14:00 reminder' }),
          shot('task-today.webp', { zh: '今日待办与逾期标记', en: 'Today list' }),
          shot('task-desktop.webp', { zh: '桌面常驻运行', en: 'Always-on desktop app' }),
        ],
      },
    ],
  },
  {
    id: 'product-image',
    code: '04',
    shortTitle: 'PRODUCT IMG',
    title: { zh: '商品详情图生成 Skill', en: 'Product Image Skill' },
    tagline: { zh: '上传图片 + 一条指令，输出标准化商品图', en: 'One upload plus one instruction' },
    accent: '#FFB1D8',
    cover: asset('product-raw-1.webp'),
    sections: [
      {
        label: { zh: '背景', en: 'Context' },
        text: {
          zh: '骑行商品在进入前端展示前，需要将大量实拍商品图处理成符合平台规范的标准商品图片。传统流程通常需要先完成商品抠图、去背景、去阴影/杂物，再进行画面优化和规范化生成，不同商品需要重复执行相似步骤。链路较长，需要在多个工具之间来回切换；不同批次、不同操作人员生成的图片容易在商品比例、背景、光影、构图等方面出现差异，导致最终商品展示不统一。',
          en: 'Before a bike reaches the storefront, large batches of studio photos have to become platform-compliant product images. The old flow cut out the product, removed background, shadows and clutter, then optimised and normalised the frame — repeated for every item, across several tools. Batches and operators drifted apart in scale, background, lighting and composition, so the storefront never looked consistent.',
        },
      },
      {
        label: { zh: '解决方案', en: 'Solution' },
        text: {
          zh: '把商品图片的处理标准抽象成一套固定规则，并进一步封装成商品详情图生成 Skill。只需要上传原始实拍图并发送对应指令，Skill 即可按照既定规范完成整套图片处理流程。',
          en: 'I abstracted the image standard into one fixed rule set and packaged it as a product image skill. Upload the raw photo, send the matching instruction, and the skill runs the whole pipeline to spec.',
        },
      },
      {
        label: { zh: '效果', en: 'Impact' },
        text: {
          zh: '项目将原来多个独立的图片处理步骤压缩成了“上传图片 + 一条指令”的标准工作流，大幅减少中间操作成本。',
          en: 'The project compresses several standalone retouching steps into a single “upload + one instruction” workflow, greatly reducing the work in between.',
        },
      },
    ],
    bullets: {
      label: { zh: 'Skill 中预设商品图的核心规范', en: 'Core rules preset in the skill' },
      items: [
        { zh: '自动识别并保留商品主体', en: 'Detect and keep the product itself' },
        { zh: '清理原始背景、阴影及无关元素', en: 'Clear the original background, shadows and clutter' },
        { zh: '保留车架、金属等真实商品质感', en: 'Keep the real texture of frame and metal' },
        { zh: '统一商品主体比例和视觉位置', en: 'Normalise product scale and visual position' },
        { zh: '输出符合平台展示要求的标准化商品图片', en: 'Export platform-ready standard product images' },
      ],
    },
    imageGroups: [
      {
        label: { zh: '上传的原图', en: 'Raw photos uploaded' },
        images: [
          shot('product-raw-1.webp'),
          shot('product-raw-2.webp'),
          shot('product-raw-3.webp'),
          shot('product-raw-4.webp'),
          shot('product-raw-5.webp'),
          shot('product-raw-6.webp'),
        ],
      },
      {
        label: { zh: '根据指令生成的内容', en: 'Generated from one instruction' },
        images: [
          shot('product-out-1.webp'),
          shot('product-out-2.webp'),
          shot('product-out-3.webp'),
          shot('product-out-4.webp'),
          shot('product-out-5.webp'),
        ],
      },
    ],
  },
  {
    id: 'visual-workflow',
    code: '05',
    shortTitle: 'CAMPAIGN VISUAL',
    title: { zh: '骑行营销会场视觉工作流', en: 'Campaign Visual Workflow' },
    tagline: { zh: '把优质案例沉淀成固定的生成规则', en: 'Turning past winners into generation rules' },
    accent: '#C2A6FF',
    cover: asset('visual-poster-1.webp'),
    sections: [
      {
        label: { zh: '背景', en: 'Context' },
        text: {
          zh: '骑行营销活动需要持续生产活动主视觉、会场头图、场景图和营销海报。过去运营侧通常需要先整理设计需求，再向设计部门提需，由设计人员进行生成。耗时较长，且沟通链路较长。',
          en: 'Cycling campaigns constantly need key visuals, venue headers, scene shots and posters. Operations used to write a design brief first, hand it to the design team and wait — a long loop with a long communication chain.',
        },
      },
      {
        label: { zh: '解决方案', en: 'Solution' },
        text: {
          zh: '把过去营销活动中的优质案例进行拆解，对构图、景深、色彩、人物状态、车型位置、标题层级、信息排版和整体氛围进行系统总结。在此基础上，持续训练并沉淀骑行营销视觉的固定生成规则，将活动海报的风格、画面语言和生成流程进行标准化。',
          en: 'I broke down the strongest past campaigns — composition, depth of field, colour, rider pose, bike placement, title hierarchy, layout and mood — and summarised them systematically. From there I trained and accumulated fixed generation rules, standardising the style, visual language and production flow of campaign posters.',
        },
      },
      {
        label: { zh: '效果', en: 'Impact' },
        text: {
          zh: '通过将视觉经验沉淀成固定的 AI 生成规则，减少了跨部门沟通和反复修改成本，也明显提升了不同活动之间的视觉一致性和场景表达能力。',
          en: 'Turning visual experience into fixed AI rules cut cross-team back-and-forth and revision cost, and clearly improved visual consistency and scene storytelling across campaigns.',
        },
      },
    ],
    imageGroups: [
      {
        label: { zh: '活动视觉产出', en: 'Campaign output' },
        images: [
          shot('visual-library.webp', { zh: '会场素材库', en: 'Venue library' }),
          shot('visual-poster-1.webp', { zh: '主视觉与海报', en: 'Key visual' }),
          shot('visual-poster-2.webp', { zh: '开学季会场', en: 'Back-to-school venue' }),
          shot('visual-poster-3.webp', { zh: '折叠车会场', en: 'Folding bike venue' }),
        ],
      },
    ],
  },
];
