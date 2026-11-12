import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from 'docx';
import { FORMAT_LABELS } from '../types/studio';
import type { Project, ScriptDocument, StoryboardFrame } from '../types/studio';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(title: string): string {
  return (title || 'roteiro-ld')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportScreenplayPDF(project: Project, script: ScriptDocument) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = 612;
  const pageHeight = 792;
  const marginTop = 72;
  const marginBottom = 72;
  const leftAction = 108; // 1.5 inch industry standard
  const maxRight = pageWidth - 72; // 1.0 inch right margin

  // Title Page
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize((project.title || 'SEM TÍTULO').toUpperCase(), 380);
  doc.text(titleLines, pageWidth / 2, 260, { align: 'center' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(12);
  if (script.title && script.title !== project.title) {
    doc.text(script.title, pageWidth / 2, 260 + titleLines.length * 24 + 12, { align: 'center' });
  }

  doc.setFontSize(11);
  doc.text(
    `${FORMAT_LABELS[project.format] || project.format}${project.genre ? ` · ${project.genre}` : ''}`,
    pageWidth / 2,
    340,
    { align: 'center' }
  );

  if (project.logline) {
    const logLines = doc.splitTextToSize(project.logline, 360);
    doc.text(logLines, pageWidth / 2, 390, { align: 'center' });
  }

  doc.text(`Escrito por ${project.author || 'Roteirista'}`, pageWidth / 2, 640, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Gerado com Roteiro LD', pageWidth / 2, 700, { align: 'center' });

  // Screenplay Pages
  doc.addPage();
  let pageNum = 1;
  let y = marginTop;

  const drawPageNumber = (num: number) => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(11);
    doc.text(`${num}.`, maxRight, 42, { align: 'right' });
  };
  drawPageNumber(pageNum);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      pageNum += 1;
      y = marginTop;
      drawPageNumber(pageNum);
    }
  };

  doc.setFontSize(12);
  const lineH = 14.4;

  for (const block of script.blocks) {
    const raw = (block.content || '').trim();
    if (!raw) continue;

    if (block.type === 'scene_heading') {
      y += 12;
      const lines = doc.splitTextToSize(raw.toUpperCase(), maxRight - leftAction);
      ensureSpace(lines.length * lineH + 10);
      doc.setFont('courier', 'bold');
      doc.text(lines, leftAction, y);
      y += lines.length * lineH + 8;
    } else if (block.type === 'action') {
      const lines = doc.splitTextToSize(raw, maxRight - leftAction);
      ensureSpace(lines.length * lineH + 8);
      doc.setFont('courier', 'normal');
      doc.text(lines, leftAction, y);
      y += lines.length * lineH + 8;
    } else if (block.type === 'character') {
      y += 6;
      const lines = doc.splitTextToSize(raw.toUpperCase(), 200);
      ensureSpace(lines.length * lineH + 4);
      doc.setFont('courier', 'bold');
      doc.text(lines, 266, y);
      y += lines.length * lineH + 2;
    } else if (block.type === 'parenthetical') {
      const text = raw.startsWith('(') ? raw : `(${raw})`;
      const lines = doc.splitTextToSize(text, 180);
      ensureSpace(lines.length * lineH + 2);
      doc.setFont('courier', 'italic');
      doc.text(lines, 224, y);
      y += lines.length * lineH + 2;
    } else if (block.type === 'dialogue') {
      const lines = doc.splitTextToSize(raw, 252);
      ensureSpace(lines.length * lineH + 8);
      doc.setFont('courier', 'normal');
      doc.text(lines, 180, y);
      y += lines.length * lineH + 8;
    } else if (block.type === 'transition') {
      const lines = doc.splitTextToSize(raw.toUpperCase(), 200);
      ensureSpace(lines.length * lineH + 10);
      doc.setFont('courier', 'bold');
      doc.text(lines, maxRight, y, { align: 'right' });
      y += lines.length * lineH + 10;
    } else if (block.type === 'shot') {
      const lines = doc.splitTextToSize(raw.toUpperCase(), maxRight - leftAction);
      ensureSpace(lines.length * lineH + 8);
      doc.setFont('courier', 'bold');
      doc.text(lines, leftAction, y);
      y += lines.length * lineH + 8;
    }
  }

  doc.save(`${safeFileName(project.title)}-${safeFileName(script.title)}.pdf`);
}

export async function exportStoryboardPDF(project: Project, frames: StoryboardFrame[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const pageWidth = 842;
  const margin = 36;
  const cols = 2;
  const rows = 2;
  const cellW = (pageWidth - margin * 2 - 20) / cols;
  const cellH = 228;

  const drawHeader = (pageIdx: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${project.title || 'Projeto'} — Storyboard de Produção`, margin, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Página ${pageIdx} · ${frames.length} planos`, pageWidth - margin, 32, { align: 'right' });
  };

  drawHeader(1);
  let pageIdx = 1;

  for (let i = 0; i < frames.length; i++) {
    const slot = i % (cols * rows);
    if (i > 0 && slot === 0) {
      doc.addPage();
      pageIdx += 1;
      drawHeader(pageIdx);
    }

    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = margin + col * (cellW + 20);
    const y = 52 + row * (cellH + 18);

    doc.setDrawColor(200);
    doc.rect(x, y, cellW, cellH);

    const imgW = 192;
    const imgH = 108;
    if (frames[i].imageUrl && frames[i].imageUrl!.startsWith('data:image')) {
      try {
        doc.addImage(frames[i].imageUrl!, 'JPEG', x + 10, y + 10, imgW, imgH);
      } catch {
        doc.setFillColor(240, 240, 240);
        doc.rect(x + 10, y + 10, imgW, imgH, 'F');
      }
    } else {
      doc.setFillColor(242, 242, 242);
      doc.rect(x + 10, y + 10, imgW, imgH, 'F');
      doc.setFontSize(8);
      doc.text(`PLANO #${frames[i].order}`, x + 10 + imgW / 2, y + 66, { align: 'center' });
    }

    const infoX = x + imgW + 20;
    const infoW = cellW - imgW - 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`#${frames[i].order} · ${frames[i].shotSize}`, infoX, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Câmera: ${frames[i].cameraMovement} · ${frames[i].lens || '35mm'} · ${frames[i].durationSec}s`, infoX, y + 36);
    const sceneLines = doc.splitTextToSize(frames[i].sceneTitle || '', infoW);
    doc.text(sceneLines.slice(0, 2), infoX, y + 52);

    const actionLines = doc.splitTextToSize(`Ação: ${frames[i].action || '-'}`, cellW - 20);
    doc.text(actionLines.slice(0, 3), x + 10, y + imgH + 28);

    if (frames[i].dialogueCue) {
      const dlgLines = doc.splitTextToSize(`Áudio/Fala: ${frames[i].dialogueCue}`, cellW - 20);
      doc.text(dlgLines.slice(0, 2), x + 10, y + imgH + 74);
    }
  }

  doc.save(`${safeFileName(project.title)}-storyboard.pdf`);
}

export async function exportScreenplayDOCX(project: Project, script: ScriptDocument) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 240 },
      children: [
        new TextRun({
          text: (project.title || 'SEM TÍTULO').toUpperCase(),
          font: 'Courier New',
          size: 32,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${script.title} · ${FORMAT_LABELS[project.format] || project.format}`,
          font: 'Courier New',
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1400 },
      children: [
        new TextRun({
          text: project.logline || '',
          font: 'Courier New',
          size: 22,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Escrito por ${project.author || 'Roteirista'}`,
          font: 'Courier New',
          size: 24,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  for (const block of script.blocks) {
    const text = (block.content || '').trim();
    if (!text) continue;

    if (block.type === 'scene_heading') {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          indent: { left: convertInchesToTwip(0) },
          children: [new TextRun({ text: text.toUpperCase(), font: 'Courier New', size: 24, bold: true })],
        })
      );
    } else if (block.type === 'action') {
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          indent: { left: convertInchesToTwip(0) },
          children: [new TextRun({ text, font: 'Courier New', size: 24 })],
        })
      );
    } else if (block.type === 'character') {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 20 },
          indent: { left: convertInchesToTwip(2.2) },
          children: [new TextRun({ text: text.toUpperCase(), font: 'Courier New', size: 24, bold: true })],
        })
      );
    } else if (block.type === 'parenthetical') {
      const pText = text.startsWith('(') ? text : `(${text})`;
      children.push(
        new Paragraph({
          spacing: { after: 20 },
          indent: { left: convertInchesToTwip(1.6), right: convertInchesToTwip(1.8) },
          children: [new TextRun({ text: pText, font: 'Courier New', size: 24, italics: true })],
        })
      );
    } else if (block.type === 'dialogue') {
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          indent: { left: convertInchesToTwip(1.0), right: convertInchesToTwip(1.5) },
          children: [new TextRun({ text, font: 'Courier New', size: 24 })],
        })
      );
    } else if (block.type === 'transition') {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 120, after: 180 },
          children: [new TextRun({ text: text.toUpperCase(), font: 'Courier New', size: 24, bold: true })],
        })
      );
    } else if (block.type === 'shot') {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          children: [new TextRun({ text: text.toUpperCase(), font: 'Courier New', size: 24, bold: true })],
        })
      );
    }
  }

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.5),
              right: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  triggerDownload(blob, `${safeFileName(project.title)}-${safeFileName(script.title)}.docx`);
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function exportScreenplayTXT(project: Project, script: ScriptDocument) {
  const lines: string[] = [];
  lines.push(`${(project.title || 'SEM TÍTULO').toUpperCase()}`);
  lines.push(`${script.title} — ${FORMAT_LABELS[project.format] || project.format}`);
  if (project.author) lines.push(`Escrito por ${project.author}`);
  if (project.logline) lines.push(`\nLogline: ${project.logline}`);
  lines.push('\n' + '='.repeat(60) + '\n');

  for (const block of script.blocks) {
    const text = (block.content || '').trim();
    if (!text) continue;

    if (block.type === 'scene_heading') {
      lines.push(`\n${text.toUpperCase()}\n`);
    } else if (block.type === 'action') {
      for (const l of wrapText(text, 60)) lines.push(l);
      lines.push('');
    } else if (block.type === 'character') {
      lines.push(' '.repeat(22) + text.toUpperCase());
    } else if (block.type === 'parenthetical') {
      const pText = text.startsWith('(') ? text : `(${text})`;
      for (const l of wrapText(pText, 26)) lines.push(' '.repeat(16) + l);
    } else if (block.type === 'dialogue') {
      for (const l of wrapText(text, 35)) lines.push(' '.repeat(10) + l);
      lines.push('');
    } else if (block.type === 'transition') {
      const upper = text.toUpperCase();
      lines.push(' '.repeat(Math.max(0, 60 - upper.length)) + upper + '\n');
    } else if (block.type === 'shot') {
      lines.push(text.toUpperCase() + '\n');
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${safeFileName(project.title)}-${safeFileName(script.title)}.txt`);
}

export function exportScreenplayFountain(project: Project, script: ScriptDocument) {
  const lines: string[] = [
    `Title: ${project.title}`,
    `Credit: Escrito por`,
    `Author: ${project.author || 'Roteirista'}`,
    `Notes: ${project.logline || ''}`,
    '',
  ];

  for (const block of script.blocks) {
    const text = (block.content || '').trim();
    if (!text) continue;

    if (block.type === 'scene_heading') {
      const needsDot = !/^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/i.test(text);
      lines.push(`\n${needsDot ? '.' : ''}${text.toUpperCase()}\n`);
    } else if (block.type === 'action') {
      lines.push(`${text}\n`);
    } else if (block.type === 'character') {
      lines.push(`@${text.toUpperCase()}`);
    } else if (block.type === 'parenthetical') {
      lines.push(text.startsWith('(') ? text : `(${text})`);
    } else if (block.type === 'dialogue') {
      lines.push(`${text}\n`);
    } else if (block.type === 'transition') {
      lines.push(`> ${text.toUpperCase()}\n`);
    } else if (block.type === 'shot') {
      lines.push(`${text.toUpperCase()}\n`);
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${safeFileName(project.title)}-${safeFileName(script.title)}.fountain`);
}
