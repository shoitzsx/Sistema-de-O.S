import fs from 'node:fs/promises';
import path from 'node:path';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

const root = process.cwd();
const sourcePath = path.join(root, 'DOCUMENTACAO_COMPLETA_SISTEMA.md');
const outputPath = path.join(root, 'DOCUMENTACAO_COMPLETA_SISTEMA.docx');

const md = await fs.readFile(sourcePath, 'utf-8');
const lines = md.split(/\r?\n/);

const children = [];

for (const line of lines) {
  const trimmed = line.trim();

  if (!trimmed) {
    children.push(new Paragraph({ text: '' }));
    continue;
  }

  if (trimmed.startsWith('# ')) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(trimmed.replace(/^#\s+/, ''))],
      })
    );
    continue;
  }

  if (trimmed.startsWith('## ')) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(trimmed.replace(/^##\s+/, ''))],
      })
    );
    continue;
  }

  if (trimmed.startsWith('### ')) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun(trimmed.replace(/^###\s+/, ''))],
      })
    );
    continue;
  }

  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    children.push(
      new Paragraph({
        text: trimmed.replace(/^[-*]\s+/, ''),
        bullet: { level: 0 },
      })
    );
    continue;
  }

  children.push(new Paragraph({ text: line }));
}

const doc = new Document({
  sections: [{ children }],
});

const buffer = await Packer.toBuffer(doc);
await fs.writeFile(outputPath, buffer);

console.log('DOCX_OK');
