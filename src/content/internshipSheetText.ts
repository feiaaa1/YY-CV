/**
 * Copy for the internship detail sheets that are drawn as real text on top of a
 * text-free paper bitmap. Keeping the copy in the DOM means it stays vector
 * sharp at any display density or zoom, instead of being baked into a
 * 1086x1448 raster.
 *
 * Every coordinate below is in the sheet's own pixel space (1086 x 1448), which
 * matches the exported background artwork, so a block can be positioned by
 * measuring the original design.
 */

export const SHEET_TEXT_WIDTH = 1086;
export const SHEET_TEXT_HEIGHT = 1448;

export type SheetTextFamily = 'serif' | 'sans';

export type SheetTextBlock = {
  text: string;
  left: number;
  top: number;
  width: number;
  size: number;
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  family: SheetTextFamily;
  weight: number;
  color: string;
  letterSpacing?: number;
};

export type SheetTextPage = {
  /** Text-free artwork shipped with the sheet, relative to the asset root. */
  background: string;
  blocks: SheetTextBlock[];
};

/**
 * All four station sheets share 咪咕's paper plate. It already ships as a clean,
 * text-free background, so the other stations reuse it instead of generating a
 * plate each — the copy is the only thing that changes between sheets.
 */
export const SHEET_PLATE = 'internship_detail_migu_base.png';

const heading = (text: string, top: number, left = 119): SheetTextBlock => ({
  text,
  left,
  top,
  width: 876,
  size: 27.5,
  lineHeight: 34,
  align: 'left',
  family: 'sans',
  weight: 800,
  color: '#1d1d1d',
});

/**
 * Journal default body type. The section tops are measured off the shipped
 * artwork, so a sheet whose copy is denser than the default has to shrink its
 * body type instead of pushing the sections apart.
 */
const JOURNAL_BODY: SheetBodyType = { size: 22.2, lineHeight: 34.5 };

const body = (text: string, top: number, left = 118, type = JOURNAL_BODY): SheetTextBlock => ({
  text,
  left,
  top,
  width: 876,
  size: type.size,
  lineHeight: type.lineHeight,
  align: 'left',
  family: 'serif',
  weight: 400,
  color: '#2b2b2b',
});

const TAGLINE_WIDTH = 273;

type SheetBodyType = { size: number; lineHeight: number };

type SheetSection = {
  heading: string;
  body: string;
  /** Top of the heading's line box, in sheet pixels. */
  headingTop: number;
  /** Top of the first body line's box, in sheet pixels. */
  bodyTop: number;
  left: number;
};

type SheetCopy = {
  company: string;
  role: string;
  period: string;
  /** Overrides the journal body type when the copy needs more lines per block. */
  bodyType?: SheetBodyType;
  tagline: { text: string; top: number; right: number };
  sections: SheetSection[];
  footer: { text: string; top: number; left: number };
};

function createSheetPage(copy: SheetCopy): SheetTextPage {
  return {
    background: SHEET_PLATE,
    blocks: [
      {
        text: copy.company,
        left: 0,
        top: 117,
        width: SHEET_TEXT_WIDTH,
        size: 30,
        lineHeight: 34,
        align: 'center',
        family: 'sans',
        weight: 800,
        color: '#1f1f1f',
      },
      {
        text: copy.role,
        left: 0,
        top: 160,
        width: SHEET_TEXT_WIDTH,
        size: 26,
        lineHeight: 30,
        align: 'center',
        family: 'sans',
        weight: 500,
        color: '#262626',
      },
      {
        text: copy.period,
        left: 0,
        top: 205,
        width: SHEET_TEXT_WIDTH,
        size: 21,
        lineHeight: 24,
        align: 'center',
        family: 'serif',
        weight: 500,
        color: '#4a4a4a',
        letterSpacing: 1.2,
      },
      {
        text: copy.tagline.text,
        left: copy.tagline.right - TAGLINE_WIDTH,
        top: copy.tagline.top,
        width: TAGLINE_WIDTH,
        size: 13,
        lineHeight: 15,
        align: 'right',
        family: 'sans',
        weight: 500,
        color: '#6d6d6d',
        letterSpacing: 1.6,
      },
      ...copy.sections.flatMap((section): SheetTextBlock[] => [
        heading(section.heading, section.headingTop, section.left),
        body(section.body, section.bodyTop, section.left, copy.bodyType),
      ]),
      {
        text: copy.footer.text,
        left: copy.footer.left,
        top: copy.footer.top,
        width: 320,
        size: 11.5,
        lineHeight: 13,
        align: 'left',
        family: 'sans',
        weight: 500,
        color: '#565656',
        letterSpacing: 1.4,
      },
    ],
  };
}

/**
 * Every sheet shares the same journal layout: the company block at the top, an
 * English tagline under the collage, four or five copy sections, and the page
 * number. Only the section tops and the block's left edge move, because each
 * sheet's collage reaches a different height.
 */
export const sheetTextPages: Record<string, SheetTextPage> = {
  migu: createSheetPage({
    company: '咪咕',
    role: '内容运营',
    period: '2025.02   -   2025.06',
    tagline: { text: 'MAKE  CONTENT  MOVE', top: 508, right: 973 },
    sections: [
      {
        heading: '项目综述',
        headingTop: 544,
        bodyTop: 579,
        left: 119,
        body: '主要负责赛事IP策划、专题内容生产、多渠道协同分发，通过内容矩阵搭建、平台资源整合与运营策略优化，提升重点项目的内容曝光与用户触达效率，相关专区累计访问量达4700万+。',
      },
      {
        heading: '赛事IP营销与内容分发',
        headingTop: 721,
        bodyTop: 757,
        left: 119,
        body: '负责世俱杯、英超等国际赛事的新媒体内容策划与传播，围绕赛事节点搭建“4大主题专刊+4个特色专栏”内容矩阵，主导9篇深度内容策划与产出；统筹咪咕“5+1”分公司稿件协同及跨区域分发，联动多渠道资源扩大赛事内容覆盖，提升重点赛事IP传播声量。',
      },
      {
        heading: '平台运营与数据增长',
        headingTop: 908,
        bodyTop: 945,
        left: 119,
        body: '参与整合全国30省红色数字内容资源，搭建VR内容素材库并持续运营16个时政教育专区；建立日/周/月度数据复盘机制，跟踪访问、点击及内容表现，针对视频质量、内容选题与页面排版持续优化，支撑专区累计访问量达4700万+。',
      },
      {
        heading: '新媒体矩阵运营与直播执行',
        headingTop: 1097,
        bodyTop: 1134,
        left: 119,
        body: '独立运营“咪咕新视界”等双微账号矩阵，累计重构及优化50+篇内容，通过账号差异化定位、标题策略及视觉包装优化，实现单阶段1.8万+浏览量；全流程参与“8K传播车”基层宣讲直播项目，负责前期脚本设计、传播素材包制作及直播执行支持，保障项目内容生产与传播落地。',
      },
    ],
    footer: { text: 'INTERNSHIP JOURNAL   /   01', top: 1378, left: 118 },
  }),
  youdao: createSheetPage({
    company: '网易有道',
    role: '内容营销',
    period: '2025.06   -   2025.09',
    tagline: { text: 'MAKE  LEARNING  CONNECT', top: 546, right: 990 },
    sections: [
      {
        heading: '项目概述',
        headingTop: 602,
        bodyTop: 646,
        left: 108,
        body: '负责教育智能硬件产品在小红书渠道的达人拓展、合作管理与内容转化，累计合作40余名渠道伙伴，助力渠道GMV环比增长25%。',
      },
      {
        heading: '渠道拓展与合作伙伴管理',
        headingTop: 788,
        bodyTop: 830,
        left: 108,
        body: '负责站外达人资源开发与商务建联，搭建达人商业价值评估模型，综合粉丝画像、互动率、历史带货转化等维度筛选合作对象；累计合作40余名KOL/KOC，形成覆盖头、腰、尾部的渠道合作矩阵。',
      },
      {
        heading: '渠道效果提升',
        headingTop: 1008,
        bodyTop: 1051,
        left: 108,
        body: '深度参与达人内容共创，从产品卖点、用户痛点与转化链路出发，优化笔记封面、文案和场景表达；合作笔记平均互动率提升25%，在不增加投放预算的前提下，获客成本降低15%，种草到站内成交的转化效率提升21%。',
      },
    ],
    footer: { text: 'INTERNSHIP JOURNAL   /   02', top: 1375, left: 116 },
  }),
  kuaishou: createSheetPage({
    company: '快手',
    role: '内容运营',
    period: '2025.10   -   2026.02',
    tagline: { text: 'TECH  CONTENT  CONNECTS', top: 513, right: 983 },
    sections: [
      {
        heading: '项目概述',
        headingTop: 544,
        bodyTop: 579,
        left: 118,
        body: '负责技术品牌在开发者圈层的内容传播、行业活动与社区电商转化项目，兼具客户触达、活动营销和销售转化经验。',
      },
      {
        heading: '账号投放策划',
        headingTop: 682,
        bodyTop: 721,
        left: 118,
        body: '主导搭建快手技术小红书账号投放机制，实时监测发布初期点击率与互动率，对62篇高潜力内容触发精准投流，整体内容转化效果提升20%；素材点击率优化10%，形成“内容筛选→数据验证→定向放量”的完整闭环，涨粉率达518%。',
      },
      {
        heading: 'AI辅助内容生产',
        headingTop: 855,
        bodyTop: 894,
        left: 118,
        body: '主导AAAI、NeurIPS等计算机顶级AI学术会议论文合集传播，通过硬核技术内容的降维拆解与视觉化重构，多矩阵传播总浏览量达15万+。在内容生产链路中引入AI工具（即梦），通过Prompt工程实现Banner及视觉素材的自动化生产，制作周期缩短30%，并同步赋能8个媒体矩阵。',
      },
      {
        heading: '社区运营',
        headingTop: 1061,
        bodyTop: 1099,
        left: 118,
        body: '负责KStack内部技术社区运营，建立“优质推流-低质折叠”的动态治理机制，结合程序员热点策划专题内容，推动社区DAU提升20%。主导“1024程序员秒杀节”全流程管控，活动当日DAU突破1.5万，积压商品库存消化率达75%。',
      },
      {
        heading: '活动策划',
        headingTop: 1228,
        bodyTop: 1268,
        left: 118,
        body: '主导Top100全球软件案例峰会、Aicon北京站等行业头部活动的立项与落地，策划2场技术沙龙，实现线下800+高净值技术人群触达，线上传播覆盖40万+，活动NPS值达9.2，强化快手在开发者圈层的技术品牌认知。',
      },
    ],
    footer: { text: 'INTERNSHIP JOURNAL   /   03', top: 1402, left: 117 },
  }),
  jd: createSheetPage({
    company: '京东',
    role: '采销（电商运营）',
    period: '2026.03   -   2026.07',
    /**
     * 京东 carries five sections of long copy, so its body type is one step
     * smaller than the journal default: the measured section tops stay put and
     * every block keeps the three lines (four for 客户增长与增购推进) it was
     * designed for instead of running into the heading below it.
     */
    bodyType: { size: 20, lineHeight: 32 },
    tagline: { text: 'GROWTH  THROUGH  COMMERCE', top: 510, right: 978 },
    sections: [
      {
        heading: '项目概述',
        headingTop: 544,
        bodyTop: 578,
        left: 118,
        body: '基于京东洗护发品类日韩线35家品牌商家运营与货盘管理背景，通过搭建精细化商家分层运营策略、冷启动孵化路径与价盘治理体系，实现月均GMV超2400W稳定运营，618大促期间直播场域成交6500W+，搭售场域UV提升35%，活动期间学生认证用户成交额同比提升13%。',
      },
      {
        heading: '品牌拓展与商业化合作',
        headingTop: 702,
        bodyTop: 737,
        left: 118,
        body: '主导“洗护焕发青年力”校园营销IP的品牌招商，完成300万元校园年框资源的拆解与招商分配；协同平台、品牌、校方和媒体资源，围绕“1元试大牌”“学生价”等权益，联动惠润、施华蔻、Fino等15家头部品牌投入RTB、CPD等预算，并获取校园晚会赞助、口播及市集场地等合作权益。',
      },
      {
        heading: '客户增长与增购推进',
        headingTop: 861,
        bodyTop: 898,
        left: 118,
        body: '主导Off&Relax江衡明星代言活动，统筹站内外资源置换与引流，实现专链成交55万、达成率125%。针对品牌库存不健康问题，主动引入虚拟金派样项目，以极低成本（商家仅需2.51元/份）置换平台核心资源位，推动3个SKU消耗3W+小样库存，带来40W+UV，转化率达7.5%，实现库存出清与新客获取双赢。',
      },
      {
        heading: '增长运营',
        headingTop: 1053,
        bodyTop: 1089,
        left: 118,
        body: '主导新入驻品牌的冷启动路径搭建，针对全网零基础新锐品牌（日UV仅150、日GMV为0），量身定制“换购+免费试用+长尾词搜索优化”组合策略，逐步打通自然搜索权重。经过1个月运营，品牌日UV提升30倍，自然搜索UV占比从0提升至40%，核心类目搜索份额实现从0到7%的突破。',
      },
      {
        heading: '渠道经营',
        headingTop: 1217,
        bodyTop: 1251,
        left: 118,
        body: '针对FINO等核心品牌全网多渠道乱价问题（京东与竞对平台最大差价达10元），通过快速反馈品牌整改、全周期跟价通拉及专区炒货等手段，稳住商品价格星级与自然流量。618大促期间，结合平台“核心单品佣金翻倍”政策，推动品牌提报20+SKU参与CPS，带动成交额环比提升45%。',
      },
    ],
    footer: { text: 'INTERNSHIP JOURNAL   /   04', top: 1378, left: 117 },
  }),
  zhuanzhuan: createSheetPage({
    company: '转转集团',
    role: '品类运营（骑行）',
    period: '2026.08   -   至今',
    /**
     * 转转 carries six sections, one more than 京东, so its body type and the
     * gap between headings are both one step tighter: every block still holds
     * the two or three lines it needs without reaching the heading below it.
     */
    bodyType: { size: 20, lineHeight: 31 },
    tagline: { text: 'RIDE  THE  GROWTH  LOOP', top: 508, right: 973 },
    sections: [
      {
        heading: '项目概述',
        headingTop: 544,
        bodyTop: 578,
        left: 118,
        body: '负责转转骑行品类全链路运营，构建“货盘筛选→品类营销→AI提效”商业运营闭环，带动品类GMV提升21%、转化率提升12%。',
      },
      {
        heading: '货盘运营',
        headingTop: 680,
        bodyTop: 714,
        left: 118,
        body: '基于价格/销量/库存/热度建立“前30%低价×热卖车型”筛选机制，通过周环比锁定高转化价格带与车型，核心货盘曝光占比从7%提升至12%。',
      },
      {
        heading: '品类营销',
        headingTop: 816,
        bodyTop: 850,
        left: 118,
        body: '策划“开学骑行季”“喜德盛品牌周”等10场活动，主导分层选品、会场搭建与Push/Feed承接；累计曝光13万+、访问3万+。',
      },
      {
        heading: '产品运营',
        headingTop: 952,
        bodyTop: 986,
        left: 118,
        body: '梳理骑行配件筛选体系并推动字段标准化，独立输出区间筛选PRD并跟进落地，商品点击率提升15%。',
      },
      {
        heading: '用户增长',
        headingTop: 1088,
        bodyTop: 1122,
        left: 118,
        body: '从0到1策划“晨骑深圳湾”等xx场线下活动，累计4场触达500+用户，新增到店100+，单日最高成交额达xx元。',
      },
      {
        heading: 'AI提效',
        headingTop: 1224,
        bodyTop: 1258,
        left: 118,
        body: '搭建AI工作台与BI数据看板，训练Skills批量产出xx条素材，周期24h→2h（提效92%），沉淀xx个Prompt与xx类视觉模板。',
      },
    ],
    footer: { text: 'INTERNSHIP JOURNAL   /   05', top: 1378, left: 117 },
  }),
};

export function findSheetTextPage(stationId: string): SheetTextPage | undefined {
  return sheetTextPages[stationId];
}
