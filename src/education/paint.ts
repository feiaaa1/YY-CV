import type { ScrapbookPage } from '../content/types';
import { educationFontFamily } from './layout';
import { wrapMeasuredText } from '../three/textLayout';

export function paintEducationPage(ctx: CanvasRenderingContext2D, page: ScrapbookPage, side: 'left' | 'right'): void {
  const { experience, lines, continuation } = page.education!;
  const ink = '#303E42';
  const muted = '#626B68';
  const text = (value: string, x: number, y: number, size: number, weight = 500, color = ink) => {
    ctx.font = `${weight} ${size}px ${educationFontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  };
  const paragraph = (value: string, x: number, y: number, size: number, width: number, weight = 500) => {
    ctx.font = `${weight} ${size}px ${educationFontFamily}`;
    const wrapped = wrapMeasuredText(value, width, (str) => ctx.measureText(str).width, Number.MAX_SAFE_INTEGER);
    wrapped.forEach((line, index) => text(line, x, y + index * size * 1.5, size, weight));
    return y + wrapped.length * size * 1.5;
  };
  ctx.fillStyle = '#F8F5EC';
  ctx.fillRect(0, 0, 1200, 1420);
  // Restrained paper texture and two pastel tabs keep the existing scrapbook character.
  ctx.fillStyle = 'rgba(76,71,55,.035)';
  for (let i = 0; i < 900; i++) ctx.fillRect((i * 79) % 1200, (i * 137) % 1420, 2, 2);
  ctx.fillStyle = page.palette[1];
  ctx.fillRect(84, 78, 14, 48);
  text('02 / 学习经历', 122, 115, 32, 700, muted);
  text(side === 'left' ? 'LEARNING JOURNEY' : 'EXPERIENCE & ACHIEVEMENTS', 84, 186, 28, 500, muted);
  ctx.save();
  ctx.translate(1080, 85);
  ctx.rotate(0.1);
  ctx.fillStyle = page.palette[2];
  ctx.fillRect(-58, -28, 116, 52);
  ctx.restore();

  if (side === 'left') {
    paragraph(experience.school, 84, 310, 72, 1032, 750);
    text(experience.period, 86, 405, 44, 600, muted);
    text('学院', 86, 508, 29, 500, muted);
    paragraph(experience.college, 86, 566, 42, 1032, 600);
    text('专业', 86, 655, 29, 500, muted);
    paragraph(experience.major, 86, 713, 42, 1032, 600);
    ctx.fillStyle = page.palette[1];
    ctx.beginPath(); ctx.roundRect(84, 782, 1032, 178, 18); ctx.fill();
    text('绩点 / GPA', 116, 832, 28, 500, muted);
    text('专业排名', 650, 832, 28, 500, muted);
    text(experience.gpa, 116, 912, 65, 750);
    text(experience.rank, 650, 912, 65, 750);
    if (experience.rankNote) text(experience.rankNote, 86, 1015, 34, 600);
    if (experience.honors.length) {
      text('所获荣誉', 86, 1090, 34, 700, muted);
      experience.honors.forEach((honor, index) => {
        text(honor, 86 + (index % 2) * 530, 1160 + Math.floor(index / 2) * 66, 37, 600);
      });
    } else {
      text('学术与实践', 86, 1080, 38, 700);
      text('研究、编撰与赛事现场', 86, 1148, 34, 500, muted);
    }
  } else {
    text(continuation ? '经历记录 · 续' : '成长与积累', 84, 270, 57, 750);
    for (const line of lines) {
      if (line.kind === 'heading') {
        text(line.text, 84, line.y, 43, 750);
      } else {
        if (line.marker) text(line.marker, 38, line.y - 2, 23, 600, '#697B67');
        text(line.text, 100, line.y, 40, 500);
      }
    }
  }
  text(side === 'left' ? experience.period : experience.school, 84, 1338, 27, 500, muted);
  text(side === 'left' ? '学习档案' : '方向键翻页 · Esc 关闭', 790, 1338, 24, 500, muted);
}
