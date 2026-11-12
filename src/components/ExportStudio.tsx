import React, { useState } from 'react';
import { Download, FileCode2, FileSpreadsheet, FileText, Film } from 'lucide-react';
import {
  exportScreenplayDOCX,
  exportScreenplayFountain,
  exportScreenplayPDF,
  exportScreenplayTXT,
  exportStoryboardPDF,
} from '../lib/exporters';
import type { Project, ScriptDocument, StoryboardFrame } from '../types/studio';

interface ExportStudioProps {
  project: Project;
  scripts: ScriptDocument[];
  frames: StoryboardFrame[];
}

export const ExportStudio: React.FC<ExportStudioProps> = ({ project, scripts, frames }) => {
  const [selectedScriptId, setSelectedScriptId] = useState(scripts[0]?.id || '');
  const [exporting, setExporting] = useState<string | null>(null);

  const activeScript = scripts.find((s) => s.id === selectedScriptId) || scripts[0];

  const handleExport = async (kind: 'pdf' | 'docx' | 'txt' | 'fountain' | 'storyboard_pdf') => {
    if (!activeScript && kind !== 'storyboard_pdf') return;
    setExporting(kind);
    try {
      if (kind === 'pdf' && activeScript) exportScreenplayPDF(project, activeScript);
      if (kind === 'docx' && activeScript) await exportScreenplayDOCX(project, activeScript);
      if (kind === 'txt' && activeScript) exportScreenplayTXT(project, activeScript);
      if (kind === 'fountain' && activeScript) exportScreenplayFountain(project, activeScript);
      if (kind === 'storyboard_pdf') await exportStoryboardPDF(project, frames);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-5 space-y-4 shadow-[0_1px_2px_rgba(12,15,24,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Exportação Profissional com Formatação Original
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Preserva margens cinematográficas, Courier 12pt, recuos de personagem/diálogo e página de rosto — funciona 100% offline.
            </p>
          </div>
          {scripts.length > 0 && (
            <select
              value={activeScript?.id || ''}
              onChange={(e) => setSelectedScriptId(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  Ep. {s.episodeNumber} — {s.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={!activeScript || exporting === 'pdf'}
            className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#D62308] dark:hover:border-[#FF735E] hover:bg-[#D62308]/[0.02] transition-colors space-y-2 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <FileText className="w-5 h-5 text-[#D62308] dark:text-[#FF735E]" />
              <Download className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Roteiro em PDF Padrão
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Folha Carta, Courier 12pt, margem esquerda 1.5&quot;, numeração superior direita e capa.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleExport('docx')}
            disabled={!activeScript || exporting === 'docx'}
            className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#102EE0] dark:hover:border-[#4D6BFF] hover:bg-[#102EE0]/[0.02] transition-colors space-y-2 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="w-5 h-5 text-[#102EE0] dark:text-[#7A92FF]" />
              <Download className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Documento Word (.DOCX)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Editável no Microsoft Word / Google Docs mantendo recuos exatos de cena e diálogo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleExport('txt')}
            disabled={!activeScript || exporting === 'txt'}
            className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#102EE0] dark:hover:border-[#4D6BFF] hover:bg-[#102EE0]/[0.02] transition-colors space-y-2 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <FileText className="w-5 h-5 text-[#102EE0] dark:text-[#7A92FF]" />
              <Download className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Texto Formatado (.TXT)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Texto puro com tabulação espacial preservada para leitura universal em qualquer aparelho.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleExport('fountain')}
            disabled={!activeScript || exporting === 'fountain'}
            className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#102EE0] dark:hover:border-[#4D6BFF] hover:bg-[#102EE0]/[0.02] transition-colors space-y-2 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <FileCode2 className="w-5 h-5 text-[#102EE0] dark:text-[#7A92FF]" />
              <Download className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Formato Fountain (.FOUNTAIN)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compatível com Final Draft, Highland, Fade In e editores profissionais de cinema.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleExport('storyboard_pdf')}
            disabled={frames.length === 0 || exporting === 'storyboard_pdf'}
            className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#D62308] dark:hover:border-[#FF735E] hover:bg-[#D62308]/[0.02] transition-colors space-y-2 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <Film className="w-5 h-5 text-[#D62308] dark:text-[#FF735E]" />
              <Download className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Storyboard em PDF ({frames.length} planos)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prancha paisagem 2x2 com quadros visuais, lente, movimento de câmera e ação.
            </p>
          </button>
        </div>
      </div>

      {/* Live Print Layout Preview */}
      {activeScript && (
        <div className="mx-auto max-w-[760px] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-8 sm:p-12 font-screenplay text-[13px] leading-relaxed text-slate-900 dark:text-slate-100 space-y-3 shadow-sm">
          <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="text-base font-bold uppercase">{project.title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeScript.title}</div>
          </div>
          {activeScript.blocks.slice(0, 24).map((b) => (
            <div
              key={b.id}
              className={
                b.type === 'scene_heading'
                  ? 'font-bold uppercase pt-3'
                  : b.type === 'character'
                    ? 'font-bold uppercase text-center pt-2'
                    : b.type === 'parenthetical'
                      ? 'italic text-center text-slate-500 dark:text-slate-400'
                      : b.type === 'dialogue'
                        ? 'mx-auto max-w-[360px]'
                        : b.type === 'transition'
                          ? 'font-bold uppercase text-right'
                          : ''
              }
            >
              {b.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
