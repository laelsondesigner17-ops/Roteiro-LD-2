import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  FileAudio,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { loadMediaBlob, saveMediaBlob } from '../lib/localStore';
import type {
  CharacterProfile,
  ImportedAsset,
  Project,
  ScreenplayBlockType,
  ScriptDocument,
  StoryboardFrame,
  StoryBeat,
} from '../types/studio';

interface MediaImportLabProps {
  project: Project;
  assets: ImportedAsset[];
  onSaveAsset: (asset: ImportedAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onCreateScriptFromAI: (script: ScriptDocument) => void;
  onAddFramesFromAI: (frames: StoryboardFrame[]) => void;
  onAddBeatsFromAI: (beats: StoryBeat[]) => void;
  onAddCharactersFromAI: (chars: CharacterProfile[]) => void;
  onNavigateToScreenplay: () => void;
}

const VALID_TYPES = new Set<ScreenplayBlockType>([
  'scene_heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
]);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MediaImportLab: React.FC<MediaImportLabProps> = ({
  project,
  assets,
  onSaveAsset,
  onDeleteAsset,
  onCreateScriptFromAI,
  onAddFramesFromAI,
  onAddBeatsFromAI,
  onAddCharactersFromAI,
  onNavigateToScreenplay,
}) => {
  const [importing, setImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [synthMode, setSynthMode] = useState<'single' | 'multiple' | 'documentary' | 'storyboard_focus'>('single');
  const [creativePrompt, setCreativePrompt] = useState('');
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthResultNote, setSynthResultNote] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [webUrlOrTopic, setWebUrlOrTopic] = useState('');
  const [webLoading, setWebLoading] = useState(false);

  // Load local offline media previews from IndexedDB & revoke on cleanup
  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];
    const loadPreviews = async () => {
      const next: Record<string, string> = {};
      for (const a of assets) {
        if (a.mediaKind === 'audio' || a.mediaKind === 'video' || a.mediaKind === 'image') {
          const blob = await loadMediaBlob(a.id);
          if (blob && active) {
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            next[a.id] = url;
          }
        }
      }
      if (active) setLocalPreviews(next);
    };
    loadPreviews();
    return () => {
      active = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [assets]);

  const categories = ['Todos', ...Array.from(new Set(assets.map((a) => a.category).filter(Boolean)))];
  const visibleAssets =
    categoryFilter === 'Todos' ? assets : assets.filter((a) => a.category === categoryFilter);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImporting(true);
    setImportError(null);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const assetId = `ast_${Date.now()}_${i}`;
        setImportProgressText(
          `Processando ${i + 1}/${fileList.length}: ${file.name} (transcrição e organização IA)...`
        );

        // Save binary locally in IndexedDB for instant offline playback
        await saveMediaBlob(assetId, file);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('originalName', file.name);

        const res = await fetch('/api/media/import', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Falha ao importar ${file.name}`);
        }

        const newAsset: ImportedAsset = {
          id: assetId,
          projectId: project.id,
          ownerId: project.ownerId,
          fileName: data.fileName || file.name,
          mimeType: data.mimeType || file.type || 'application/octet-stream',
          fileSize: data.fileSize || file.size,
          mediaKind: data.mediaKind || 'other',
          category: data.category || 'Material Bruto',
          tags: data.tags || [],
          summary: data.summary || '',
          transcription: data.transcription || '',
          extractedText: data.extractedText || '',
          aiAnalysis: data.aiAnalysis || '',
        };

        onSaveAsset(newAsset);
        setSelectedIds((prev) => (prev.includes(assetId) ? prev : [...prev, assetId]));
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro durante a importação.');
    } finally {
      setImporting(false);
      setImportProgressText('');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleImportWebUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = webUrlOrTopic.trim();
    if (!query || webLoading) return;
    setWebLoading(true);
    setImportError(null);
    try {
      const res = await fetch('/api/media/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrTopic: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao pesquisar na internet.');

      const assetId = `ast_web_${Date.now()}`;
      const newAsset: ImportedAsset = {
        id: assetId,
        projectId: project.id,
        ownerId: project.ownerId,
        fileName: data.fileName || query.slice(0, 80),
        mimeType: data.mimeType || 'text/uri-list',
        fileSize: data.fileSize || 0,
        mediaKind: 'document',
        category: data.category || 'Pesquisa Web',
        tags: data.tags || ['internet'],
        summary: data.summary || '',
        transcription: '',
        extractedText: data.extractedText || '',
        aiAnalysis: data.aiAnalysis || '',
      };
      onSaveAsset(newAsset);
      setSelectedIds((prev) => (prev.includes(assetId) ? prev : [...prev, assetId]));
      setWebUrlOrTopic('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao pesquisar link ou tema na web.');
    } finally {
      setWebLoading(false);
    }
  };

  const handleSynthesizeScripts = async () => {
    const chosen = assets.filter((a) => selectedIds.includes(a.id));
    if (chosen.length === 0) return;

    setSynthLoading(true);
    setImportError(null);
    setSynthResultNote(null);

    try {
      const res = await fetch('/api/ai/synthesize-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.title,
          mode: synthMode,
          creativePrompt,
          files: chosen.map((c) => ({
            fileName: c.fileName,
            category: c.category,
            summary: c.summary,
            transcription: c.transcription,
            extractedText: c.extractedText,
            aiAnalysis: c.aiAnalysis,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar roteiro.');

      const createdScripts: ScriptDocument[] = (data.scripts || []).map(
        (
          s: {
            title?: string;
            episodeNumber?: number;
            synopsis?: string;
            blocks?: Array<{ type: string; content: string }>;
          },
          idx: number
        ) => ({
          id: `scr_ai_${Date.now()}_${idx}`,
          projectId: project.id,
          ownerId: project.ownerId,
          title: s.title || `Roteiro Gerado ${idx + 1}`,
          episodeNumber: s.episodeNumber || idx + 1,
          synopsis: s.synopsis || '',
          blocks: (s.blocks || []).map((b, bIdx) => ({
            id: `blk_${Date.now()}_${idx}_${bIdx}`,
            type: VALID_TYPES.has(b.type as ScreenplayBlockType)
              ? (b.type as ScreenplayBlockType)
              : 'action',
            content: b.content || '',
          })),
        })
      );

      for (const scr of createdScripts) {
        onCreateScriptFromAI(scr);
      }

      if (Array.isArray(data.frames) && data.frames.length > 0) {
        onAddFramesFromAI(
          data.frames.map(
            (
              f: {
                sceneTitle?: string;
                shotSize?: string;
                cameraMovement?: string;
                lens?: string;
                durationSec?: number;
                action?: string;
                dialogueCue?: string;
              },
              i: number
            ) => ({
              id: `frm_ai_${Date.now()}_${i}`,
              projectId: project.id,
              ownerId: project.ownerId,
              order: i + 1,
              sceneTitle: f.sceneTitle || `CENA ${i + 1}`,
              shotSize: f.shotSize || 'Plano Médio (PM)',
              cameraMovement: f.cameraMovement || 'Estática em tripé',
              lens: f.lens || '35mm',
              durationSec: f.durationSec || 5,
              action: f.action || '',
              dialogueCue: f.dialogueCue || '',
              audioNotes: '',
            })
          )
        );
      }

      if (Array.isArray(data.beats) && data.beats.length > 0) {
        onAddBeatsFromAI(
          data.beats.map(
            (
              b: { act?: string; title?: string; summary?: string; emotionalArc?: string },
              i: number
            ) => ({
              id: `beat_ai_${Date.now()}_${i}`,
              projectId: project.id,
              ownerId: project.ownerId,
              order: i + 1,
              act: b.act || 'Ato I',
              title: b.title || `Beat ${i + 1}`,
              summary: b.summary || '',
              emotionalArc: b.emotionalArc || '',
              linkedScene: '',
            })
          )
        );
      }

      if (Array.isArray(data.characters) && data.characters.length > 0) {
        onAddCharactersFromAI(
          data.characters.map(
            (
              c: { name?: string; role?: string; motivation?: string; voiceName?: string },
              i: number
            ) => ({
              id: `char_ai_${Date.now()}_${i}`,
              projectId: project.id,
              ownerId: project.ownerId,
              name: (c.name || 'PERSONAGEM').toUpperCase(),
              role: c.role || 'Elenco',
              archetype: '',
              motivation: c.motivation || '',
              flaw: '',
              arc: '',
              voiceName: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(c.voiceName || '')
                ? (c.voiceName as CharacterProfile['voiceName'])
                : 'Kore',
              voiceStyle: 'Interpretação natural',
            })
          )
        );
      }

      setSynthResultNote(
        `${createdScripts.length} roteiro(s) criado(s)! ${data.rationale || ''}`
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Falha na síntese de roteiro.');
    } finally {
      setSynthLoading(false);
    }
  };

  const renderKindIcon = (kind: ImportedAsset['mediaKind']) => {
    switch (kind) {
      case 'video':
        return <Film className="w-4 h-4 text-[#D62308] dark:text-[#FF735E]" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-[#102EE0] dark:text-[#7A92FF]" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-[#D62308] dark:text-[#FF735E]" />;
      default:
        return <FileText className="w-4 h-4 text-[#102EE0] dark:text-[#7A92FF]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Universal Dropzone */}
      <div className="rounded-2xl border border-dashed border-[#102EE0]/35 dark:border-[#4D6BFF]/40 bg-white dark:bg-[#141824] p-7 text-center space-y-3 shadow-[0_1px_3px_rgba(12,15,24,0.03)]">
        <UploadCloud className="w-9 h-9 text-[#102EE0] dark:text-[#7A92FF] mx-auto" />
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Importador Universal de Mídia & Documentos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
            Importe MP4, MOV, WebM, MP3, M4A, WAV, PDF, DOCX, TXT, Fountain, FDX, legendas SRT e imagens. A IA transcreve áudios/vídeos com alta precisão e organiza tudo automaticamente.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] dark:hover:bg-[#1E3DF0] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer">
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {importing ? 'Processando com Gemini...' : 'Selecionar Arquivos (Vídeo, Áudio, Docs, Imagens)'}
          <input
            type="file"
            multiple
            accept="video/*,audio/*,image/*,.pdf,.docx,.doc,.txt,.md,.fountain,.fdx,.srt,.vtt,.csv,.json"
            className="hidden"
            disabled={importing}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>
        {importProgressText && (
          <p className="text-xs text-[#102EE0] dark:text-[#7A92FF] font-medium">{importProgressText}</p>
        )}
        {importError && <p className="text-xs text-[#D62308] dark:text-[#FF735E]">{importError}</p>}
      </div>

      {/* Live Web Research & URL Importer (Internet-Powered AI) */}
      <form
        onSubmit={handleImportWebUrl}
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-[0_1px_2px_rgba(12,15,24,0.03)]"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">
          <Globe className="w-4 h-4 text-[#102EE0] dark:text-[#7A92FF]" />
          <span>Pesquisa Web IA:</span>
        </div>
        <input
          type="text"
          value={webUrlOrTopic}
          onChange={(e) => setWebUrlOrTopic(e.target.value)}
          placeholder="Cole uma URL (https://...) ou digite um tema para pesquisar no Google..."
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={webLoading || !webUrlOrTopic.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {webLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          {webLoading ? 'Pesquisando...' : 'Importar da Web'}
        </button>
      </form>

      {/* Multi-File AI Script Synthesizer */}
      {assets.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-5 space-y-4 shadow-[0_1px_2px_rgba(12,15,24,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Criar Roteiro Único ou Múltiplos a partir dos Arquivos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {selectedIds.length} de {assets.length} arquivo(s) selecionado(s) para exploração criativa
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedIds(assets.map((a) => a.id))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={synthMode}
              onChange={(e) => setSynthMode(e.target.value as typeof synthMode)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="single">Roteiro Único Integrado (todos os arquivos)</option>
              <option value="multiple">Múltiplos Roteiros / Episódios (2 a 4)</option>
              <option value="documentary">Roteiro Documental (Depoimentos + Off)</option>
              <option value="storyboard_focus">Decupagem Visual & Storyboard Completo</option>
            </select>
            <input
              type="text"
              value={creativePrompt}
              onChange={(e) => setCreativePrompt(e.target.value)}
              placeholder="Direção criativa (ex: Tom investigativo, 3 episódios curtos...)"
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSynthesizeScripts}
              disabled={synthLoading || selectedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D62308] hover:bg-[#B51C05] dark:bg-[#E03419] px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {synthLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Explorar Arquivos & Gerar Roteiro(s)
            </button>

            {synthResultNote && (
              <div className="flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400">
                <span>{synthResultNote}</span>
                <button
                  type="button"
                  onClick={onNavigateToScreenplay}
                  className="underline font-semibold cursor-pointer"
                >
                  Abrir no Editor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Organized Media Library */}
      {assets.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#141824] border border-slate-200/70 dark:border-slate-800/80">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#102EE0] dark:bg-[#2E4EFF] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleAssets.map((asset) => {
              const isSelected = selectedIds.includes(asset.id);
              const previewUrl = localPreviews[asset.id];
              return (
                <div
                  key={asset.id}
                  className={`rounded-2xl border p-4 space-y-3 bg-white dark:bg-[#141824] transition-colors ${
                    isSelected
                      ? 'border-[#102EE0] dark:border-[#4D6BFF]'
                      : 'border-slate-200/80 dark:border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(asset.id)}
                      className="flex items-start gap-2.5 text-left min-w-0 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#102EE0] dark:text-[#7A92FF] mt-0.5 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {renderKindIcon(asset.mediaKind)}
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {asset.fileName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          <span>{asset.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatBytes(asset.fileSize)}</span>
                          {asset.tags.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{asset.tags.join(' · ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAsset(asset.id)}
                      className="p-1 text-slate-400 hover:text-[#D62308] cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {previewUrl && asset.mediaKind === 'audio' && (
                    <audio controls src={previewUrl} className="w-full h-8" />
                  )}
                  {previewUrl && asset.mediaKind === 'video' && (
                    <video controls src={previewUrl} className="w-full rounded-xl max-h-48 bg-black" />
                  )}
                  {previewUrl && asset.mediaKind === 'image' && (
                    <img
                      src={previewUrl}
                      alt={asset.fileName}
                      className="w-full rounded-xl max-h-48 object-cover"
                    />
                  )}

                  {asset.summary && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {asset.summary}
                    </p>
                  )}

                  {(asset.transcription || asset.extractedText || asset.aiAnalysis) && (
                    <details className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2">
                      <summary className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        Ver transcrição / texto extraído completo
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-600 dark:text-slate-400 max-h-56 overflow-y-auto font-sans leading-relaxed">
                        {asset.transcription || asset.extractedText || asset.aiAnalysis}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
