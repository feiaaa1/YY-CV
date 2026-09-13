export type EducationSection = { title: string; items: string[] };
export type EducationExperience = {
  id: string;
  school: string;
  period: string;
  college: string;
  major: string;
  gpa: string;
  rank: string;
  rankNote?: string;
  honors: string[];
  sections: EducationSection[];
};

// Source: 第二部分学习经历.docx. The repeated scholarship was merged with user approval.
export const educationExperiences: EducationExperience[] = [
  {
    id: 'renai', school: '天津仁爱学院', period: '2021.9—2025.7',
    college: '传媒与艺术学院', major: '传播学（网络与新媒体）',
    gpa: '3.94/4', rank: '1/94', rankNote: '连续四年排名第一',
    honors: ['国家奖学金', '天津市优秀学生', '天津市政府奖学金', '校长奖学金'],
    sections: [{ title: '所获奖项', items: [
      '第九届“互联网+”创新创业大赛天津赛区铜奖',
      '天津市公益广告大赛二等奖',
      '“讲好文物历史故事”视频大赛一等奖',
      '天津市“中广视讯杯”视频大赛三等奖',
      '天津市思想政治理论公开课大赛一等奖',
    ] }],
  },
  {
    id: 'bsu', school: '北京体育大学（211）', period: '2025.9—2027.7',
    college: '新闻与传播', major: '新闻与传播（体育传播）',
    gpa: '3.84/4', rank: '5/50', honors: [],
    sections: [
      { title: '所参与学术', items: [
        '独作文章被“第二届人工智能与传播研讨会”录用',
        '协助编撰《传统媒体与奥运》书籍',
        '所做的骑行调研被“2026体育品牌传播论坛”征用',
      ] },
      { title: '所参与实践', items: ['北京体育大学第34届校运会赛事制作', '米兰冬奥会赛事运营'] },
    ],
  },
];
