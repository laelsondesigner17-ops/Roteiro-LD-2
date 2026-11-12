import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  Camera,
  Clapperboard,
  Download,
  FilePlus2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  SHOT_TYPE_EXAMPLES,
  TRANSITION_TYPE_EXAMPLES,
  type ShotTypeExample,
  type TransitionTypeExample,
} from '../lib/cinemaReferences';
import {
  BLOCK_LABELS,
  type CharacterProfile,
  type Project,
  type ScreenplayBlock,
  type ScreenplayBlockType,
  type ScriptDocument,
} from '../types/studio';

interface ScreenplayEditorProps {
  project: Project;
  scripts: ScriptDocument[];
  activeScript: ScriptDocument | null;
  characters: CharacterProfile[];
  onSelectScript: (id: string) => void;
  onCreateScript: () => void;
  onDeleteScript: (id: string) => void;
  onSaveScript: (script: ScriptDocument) => void;
  onUpdateProjectStats: (sceneCount: number, pageCount: number) => void;
}

const BLOCK_ORDER: ScreenplayBlockType[] = [
  'scene_heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
];

const NEXT_BLOCK_MAP: Record<ScreenplayBlockType, ScreenplayBlockType> = {
  scene_heading: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'character',
  transition: 'scene_heading',
  shot: 'action',
};

const STYLE_OPTIONS = [
  { value: 'estruturar', label: 'Estruturar Texto Longo & Ritmo' },
  { value: 'estilo_noir', label: 'Thriller / Noir Cinematográfico' },
  { value: 'dialogo_natural', label: 'Diálogos Naturais com Subtexto' },
  { value: 'comedia_agil', label: 'Comédia & Timing Ágil' },
  { value: 'documental', label: 'Documental / Jornalístico' },
  { value: 'poetico', label: 'Poético & Autoral' },
  { value: 'youtube_retencao', label: 'Vídeo Digital / Alta Retenção' },
];

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  project,
  scripts,
  activeScript,
  characters,
  onSelectScript,
  onCreateScript,
  onDeleteScript,
  onSaveScript,
  onUpdateProjectStats,
}) => {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [manualVisualGuide, setManualVisualGuide] = useState<'shot' | 'transition' | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [showDoctor, setShowDoctor] = useState(false);
  const [styleGoal, setStyleGoal] = useState('estruturar');
  const [doctorInstructions, setDoctorInstructions] = useState('');
  const [longDraftInput, setLongDraftInput] = useState('');
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorResult, setDoctorResult] = useState<{
    diagnosis: string;
    styleSuggestions: string[];
    improvedBlocks: Array<{ type: string; content: string }>;
  } | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  // TTS Table Read state
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);

  const stats = useMemo(() => {
    if (!activeScript) return { scenes: 0, words: 0, pages: 1 };
    const scenes = activeScript.blocks.filter((b) => b.type === 'scene_heading').length;
    const words = activeScript.blocks.reduce(
      (acc, b) => acc + (b.content.trim() ? b.content.trim().split(/\s+/).length : 0),
      0
    );
    const pages = Math.max(1, Math.ceil(activeScript.blocks.length / 18));
    return { scenes, words, pages };
  }, [activeScript]);

  const knownCharacterNames = useMemo(() => {
    const names = new Set<string>();
    characters.forEach((c) => {
      if (c.name.trim()) names.add(c.name.trim().toUpperCase());
    });
    activeScript?.blocks.forEach((b) => {
      if (b.type === 'character' && b.content.trim()) {
        names.add(b.content.replace(/\(.*?\)/g, '').trim().toUpperCase());
      }
    });
    return Array.from(names).slice(0, 8);
  }, [characters, activeScript]);

  if (!activeScript) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nenhum roteiro selecionado neste projeto.
        </p>
        <button
          type="button"
          onClick={onCreateScript}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-4 py-2.5 text-xs font-semibold text-white cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Criar Primeiro Roteiro
        </button>
      </div>
    );
  }

  const updateBlocks = (newBlocks: ScreenplayBlock[]) => {
    const nextScript: ScriptDocument = { ...activeScript, blocks: newBlocks };
    onSaveScript(nextScript);
    const sc = newBlocks.filter((b) => b.type === 'scene_heading').length;
    const pg = Math.max(1, Math.ceil(newBlocks.length / 18));
    if (sc !== project.sceneCount || pg !== project.pageCount) {
      onUpdateProjectStats(sc, pg);
    }
  };

  const handleBlockChange = (id: string, content: string) => {
    updateBlocks(activeScript.blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const handleBlockTypeChange = (id: string, type: ScreenplayBlockType) => {
    updateBlocks(activeScript.blocks.map((b) => (b.id === id ? { ...b, type } : b)));
  };

  const insertBlockAfter = (
    afterId: string | null,
    type: ScreenplayBlockType,
    initialContent = ''
  ) => {
    const newBlock: ScreenplayBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: initialContent,
    };
    if (!afterId) {
      updateBlocks([...activeScript.blocks, newBlock]);
    } else {
      const idx = activeScript.blocks.findIndex((b) => b.id === afterId);
      const next = [...activeScript.blocks];
      next.splice(idx + 1, 0, newBlock);
      updateBlocks(next);
    }
    setFocusedBlockId(newBlock.id);
    if (type === 'shot' || type === 'transition') {
      setManualVisualGuide(type);
    } else {
      setManualVisualGuide(null);
    }
    requestAnimationFrame(() => {
      const el = textareaRefs.current[newBlock.id];
      if (el) {
        el.focus();
        el.setSelectionRange(initialContent.length, initialContent.length);
      }
    });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = activeScript.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= activeScript.blocks.length) return;
    const next = [...activeScript.blocks];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    updateBlocks(next);
  };

  const removeBlock = (id: string) => {
    if (activeScript.blocks.length <= 1) return;
    updateBlocks(activeScript.blocks.filter((b) => b.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: ScreenplayBlock) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const idx = BLOCK_ORDER.indexOf(block.type);
      const nextType = BLOCK_ORDER[(idx + 1) % BLOCK_ORDER.length];
      handleBlockTypeChange(block.id, nextType);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertBlockAfter(block.id, NEXT_BLOCK_MAP[block.type]);
    }
  };

  const handleRunDoctor = async () => {
    setDoctorLoading(true);
    setDoctorError(null);
    try {
      const sourceText =
        longDraftInput.trim() ||
        activeScript.blocks.map((b) => `[${b.type.toUpperCase()}] ${b.content}`).join('\n');
      const res = await fetch('/api/ai/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          styleGoal,
          instructions: doctorInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar texto.');
      setDoctorResult(data);
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : 'Falha na análise de IA.');
    } finally {
      setDoctorLoading(false);
    }
  };

  const applyDoctorBlocks = (replaceAll: boolean) => {
    if (!doctorResult?.improvedBlocks?.length) return;
    const mapped: ScreenplayBlock[] = doctorResult.improvedBlocks.map((b, i) => ({
      id: `blk_${Date.now()}_${i}`,
      type: BLOCK_ORDER.includes(b.type as ScreenplayBlockType)
        ? (b.type as ScreenplayBlockType)
        : 'action',
      content: b.content || '',
    }));
    updateBlocks(replaceAll ? mapped : [...activeScript.blocks, ...mapped]);
    setShowDoctor(false);
  };

  const handleContinueScene = async () => {
    if (continueLoading) return;
    setContinueLoading(true);
    setDoctorError(null);
    try {
      const res = await fetch('/api/ai/continue-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.title,
          logline: project.logline,
          format: project.format,
          recentBlocks: activeScript.blocks.slice(-18).map((b) => ({ type: b.type, content: b.content })),
          characterNames: knownCharacterNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao continuar cena.');
      const nextBlocks: ScreenplayBlock[] = (data.blocks || []).map(
        (b: { type?: string; content?: string }, i: number) => ({
          id: `blk_ai_${Date.now()}_${i}`,
          type: BLOCK_ORDER.includes(b.type as ScreenplayBlockType)
            ? (b.type as ScreenplayBlockType)
            : 'action',
          content: b.content || '',
        })
      );
      if (nextBlocks.length > 0) {
        updateBlocks([...activeScript.blocks, ...nextBlocks]);
        setFocusedBlockId(nextBlocks[nextBlocks.length - 1].id);
      }
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : 'Erro ao continuar cena.');
    } finally {
      setContinueLoading(false);
    }
  };

  const focusedBlock = activeScript.blocks.find((b) => b.id === focusedBlockId) || null;
  const activeVisualGuide: 'shot' | 'transition' | null =
    focusedBlock?.type === 'shot'
      ? 'shot'
      : focusedBlock?.type === 'transition'
        ? 'transition'
        : manualVisualGuide;

  const applyQuickChip = (chip: string, mode: 'prefix' | 'suffix' | 'replace') => {
    if (!focusedBlock) return;
    const curr = focusedBlock.content;
    let nextVal = curr;
    if (mode === 'replace') {
      nextVal = chip;
    } else if (mode === 'prefix') {
      nextVal = curr.startsWith(chip) ? curr : `${chip}${curr.replace(/^(INT\.|EXT\.|INT\.\/EXT\.)\s*/i, '')}`;
    } else {
      nextVal = `${curr.replace(/\s*-\s*(DIA|NOITE|CREPÚSCULO|AMANHECER)$/i, '').trim()} ${chip}`.trim();
    }
    handleBlockChange(focusedBlock.id, nextVal);
  };

  const handleApplyShotExample = (shot: ShotTypeExample) => {
    if (focusedBlock?.type === 'shot') {
      const existingParts = focusedBlock.content.split('—');
      const trailingDetail = existingParts.length > 1 ? existingParts.slice(1).join('—').trim() : '';
      const nextVal = trailingDetail ? `${shot.insertText}${trailingDetail}` : shot.insertText;
      handleBlockChange(focusedBlock.id, nextVal);
      requestAnimationFrame(() => {
        const el = textareaRefs.current[focusedBlock.id];
        if (el) {
          el.focus();
          el.setSelectionRange(nextVal.length, nextVal.length);
        }
      });
    } else {
      insertBlockAfter(focusedBlockId, 'shot', shot.insertText);
    }
  };

  const handleApplyTransitionExample = (transition: TransitionTypeExample) => {
    if (focusedBlock?.type === 'transition') {
      handleBlockChange(focusedBlock.id, transition.insertText);
      requestAnimationFrame(() => {
        const el = textareaRefs.current[focusedBlock.id];
        if (el) {
          el.focus();
          el.setSelectionRange(transition.insertText.length, transition.insertText.length);
        }
      });
    } else {
      insertBlockAfter(focusedBlockId, 'transition', transition.insertText);
    }
  };

  const renderTransitionPreview = (item: TransitionTypeExample) => {
    switch (item.visualStyle) {
      case 'cut':
        return (
          <div className="relative w-full h-full grid grid-cols-2 overflow-hidden">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <img src={item.toImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white shadow" />
          </div>
        );
      case 'fade_in':
        return (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <img src={item.toImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          </div>
        );
      case 'fade_out':
        return (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/65 to-black" />
          </div>
        );
      case 'dissolve':
        return (
          <div className="relative w-full h-full overflow-hidden">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <img
              src={item.toImage}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-55 mix-blend-screen"
            />
          </div>
        );
      case 'match':
        return (
          <div className="relative w-full h-full grid grid-cols-2 overflow-hidden">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <img src={item.toImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-7 h-7 rounded-full border-2 border-white/90 shadow-sm" />
            </div>
          </div>
        );
      case 'smash':
        return (
          <div className="relative w-full h-full overflow-hidden">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <img
              src={item.toImage}
              alt=""
              referrerPolicy="no-referrer"
              style={{ clipPath: 'polygon(52% 0, 100% 0, 100% 100%, 42% 100%)' }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              style={{ clipPath: 'polygon(51% 0, 53% 0, 43% 100%, 41% 100%)' }}
              className="absolute inset-0 bg-[#FF735E]"
            />
          </div>
        );
      case 'wipe':
        return (
          <div className="relative w-full h-full overflow-hidden">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <img
              src={item.toImage}
              alt=""
              referrerPolicy="no-referrer"
              style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 65% 100%)' }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        );
      case 'iris':
        return (
          <div className="relative w-full h-full overflow-hidden bg-black">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div
              style={{
                background:
                  'radial-gradient(circle at center, transparent 28%, rgba(0,0,0,0.92) 48%, rgba(0,0,0,1) 100%)',
              }}
              className="absolute inset-0"
            />
          </div>
        );
      case 'audio_bridge':
        return (
          <div className="relative w-full h-full grid grid-cols-2 overflow-hidden">
            <img src={item.fromImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <img src={item.toImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute inset-x-2 bottom-2 h-2 rounded-sm bg-black/75 flex items-center gap-0.5 px-1.5">
              <span className="h-1 flex-1 bg-[#7A92FF]" />
              <span className="h-1.5 w-2 bg-[#7A92FF]" />
              <span className="h-1 flex-1 bg-[#FF735E]" />
            </div>
          </div>
        );
    }
  };

  const handleTableReadTTS = async () => {
    setTtsLoading(true);
    setTtsError(null);
    try {
      // Collect dialogue lines with speaker names and assigned character voices
      const lines: Array<{ speaker: string; voiceName: string; style?: string; text: string }> = [];
      let currentChar = 'Narrador';
      for (const block of activeScript.blocks) {
        if (block.type === 'character') {
          currentChar = block.content.replace(/\(.*?\)/g, '').trim() || 'Narrador';
        } else if (block.type === 'dialogue' && block.content.trim()) {
          const matchedChar = characters.find(
            (c) => c.name.toUpperCase() === currentChar.toUpperCase()
          );
          lines.push({
            speaker: currentChar,
            voiceName: matchedChar?.voiceName || (lines.length % 2 === 0 ? 'Charon' : 'Kore'),
            style: matchedChar?.voiceStyle,
            text: block.content.trim(),
          });
        }
      }

      const distinctSpeakers = new Set(lines.map((l) => l.speaker));
      const payload =
        lines.length >= 2 && distinctSpeakers.size >= 2
          ? { mode: 'dual', dialogueLines: lines }
          : {
              mode: 'single',
              text: activeScript.blocks
                .slice(0, 20)
                .map((b) => b.content)
                .filter(Boolean)
                .join('\n'),
              voiceName: characters[0]?.voiceName || 'Charon',
              style: 'Leitura cinematográfica expressiva em português brasileiro',
            };

      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar leitura em voz alta.');
      setTtsAudioUrl(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
    } catch (err) {
      setTtsError(err instanceof Error ? err.message : 'Erro no serviço TTS.');
    } finally {
      setTtsLoading(false);
    }
  };

  const getBlockClasses = (type: ScreenplayBlockType): string => {
    switch (type) {
      case 'scene_heading':
        return 'font-bold uppercase tracking-wide text-slate-950 dark:text-[#7A92FF] mt-4';
      case 'action':
        return 'text-slate-800 dark:text-slate-200';
      case 'character':
        return 'font-bold uppercase text-center mx-auto max-w-[260px] text-slate-950 dark:text-white mt-3';
      case 'parenthetical':
        return 'italic text-center mx-auto max-w-[240px] text-slate-600 dark:text-slate-400 text-[13px]';
      case 'dialogue':
        return 'mx-auto max-w-[380px] text-slate-900 dark:text-slate-100';
      case 'transition':
        return 'font-bold uppercase text-right text-slate-700 dark:text-slate-300';
      case 'shot':
        return 'font-bold uppercase text-[#D62308] dark:text-[#FF735E]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] px-4 py-3 shadow-[0_1px_2px_rgba(12,15,24,0.03)]">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <select
            value={activeScript.id}
            onChange={(e) => onSelectScript(e.target.value)}
            aria-label="Selecionar roteiro ou episódio"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#102EE0]"
          >
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                Ep. {s.episodeNumber} — {s.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onCreateScript}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-[#102EE0] dark:text-[#7A92FF]" />
            Novo Roteiro / Ep.
          </button>

          {scripts.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteScript(activeScript.id)}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs text-[#D62308] dark:text-[#FF735E] hover:bg-[#D62308]/10 whitespace-nowrap shrink-0 cursor-pointer"
              title="Excluir este roteiro"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>{stats.scenes} cenas</span>
            <span aria-hidden="true">·</span>
            <span>{stats.pages} págs est.</span>
            <span aria-hidden="true">·</span>
            <span>{stats.words} palavras</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTableReadTTS}
            disabled={ttsLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#102EE0]/25 dark:border-[#2E4EFF]/40 bg-[#102EE0]/5 dark:bg-[#2E4EFF]/10 px-3.5 py-1.5 text-xs font-semibold text-[#102EE0] dark:text-[#8BA0FF] hover:bg-[#102EE0]/10 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {ttsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AudioLines className="w-3.5 h-3.5" />}
            Leitura Dramatizada (TTS)
          </button>

          <button
            type="button"
            onClick={() => setShowDoctor((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showDoctor
                ? 'bg-[#D62308] text-white'
                : 'bg-[#D62308] hover:bg-[#B51C05] dark:bg-[#E03419] text-white shadow-sm'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Script Doctor IA
          </button>
        </div>
      </div>

      {/* TTS Audio Player Banner */}
      {(ttsAudioUrl || ttsError) && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {ttsError ? (
            <p className="text-xs text-[#D62308] dark:text-[#FF735E]">{ttsError}</p>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  Mesa de Leitura (Gemini TTS)
                </span>
                <audio controls src={ttsAudioUrl || ''} className="h-8 flex-1 max-w-md" />
              </div>
              <a
                href={ttsAudioUrl || '#'}
                download={`${activeScript.title || 'leitura'}.wav`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar WAV
              </a>
            </>
          )}
        </div>
      )}

      {/* AI Script Doctor & Long-Text Restructuring Drawer */}
      {showDoctor && (
        <div className="rounded-2xl border border-[#D62308]/30 bg-white dark:bg-[#141824] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Estruturação de Textos Longos & Estilo de Escrita (IA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Analisa o roteiro atual ou qualquer rascunho longo colado abaixo, sugere melhorias de estilo e reestrutura em blocos cinematográficos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estilo / Objetivo Narrativo
              </label>
              <select
                value={styleGoal}
                onChange={(e) => setStyleGoal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                {STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Diretriz Específica (Opcional)
              </label>
              <input
                type="text"
                value={doctorInstructions}
                onChange={(e) => setDoctorInstructions(e.target.value)}
                placeholder="Ex: Aumente o suspense e corte diálogos expositivos..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Texto longo bruto para reestruturar (deixe vazio para analisar o roteiro atual)
            </label>
            <textarea
              rows={4}
              value={longDraftInput}
              onChange={(e) => setLongDraftInput(e.target.value)}
              placeholder="Cole aqui notas extensas, tratamento literário, prosa ou páginas brutas..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunDoctor}
              disabled={doctorLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D62308] hover:bg-[#B51C05] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {doctorLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Analisar & Reestruturar
            </button>
            {doctorError && <span className="text-xs text-[#D62308]">{doctorError}</span>}
          </div>

          {doctorResult && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Diagnóstico Estrutural</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {doctorResult.diagnosis}
                </p>
              </div>
              {doctorResult.styleSuggestions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Sugestões de Estilo</h4>
                  <ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                    {doctorResult.styleSuggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => applyDoctorBlocks(true)}
                  className="rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Substituir Roteiro ({doctorResult.improvedBlocks?.length || 0} blocos)
                </button>
                <button
                  type="button"
                  onClick={() => applyDoctorBlocks(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Adicionar ao Final
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Element Insertion Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Inserir bloco:</span>
            {BLOCK_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => insertBlockAfter(focusedBlockId, type)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  focusedBlock?.type === type
                    ? 'border-[#102EE0] bg-[#102EE0]/10 text-[#102EE0] dark:border-[#4D6BFF] dark:bg-[#2E4EFF]/15 dark:text-[#8BA0FF]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#102EE0] hover:text-[#102EE0] dark:hover:border-[#4D6BFF] dark:hover:text-[#7A92FF]'
                }`}
              >
                + {BLOCK_LABELS[type].split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setManualVisualGuide((curr) => (curr === 'transition' ? null : 'transition'))}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeVisualGuide === 'transition'
                  ? 'border-[#102EE0] bg-[#102EE0]/10 text-[#102EE0] dark:border-[#4D6BFF] dark:text-[#8BA0FF]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#102EE0]'
              }`}
            >
              <Clapperboard className="w-3 h-3" />
              Tipos de Transição
            </button>
            <button
              type="button"
              onClick={() => setManualVisualGuide((curr) => (curr === 'shot' ? null : 'shot'))}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeVisualGuide === 'shot'
                  ? 'border-[#D62308] bg-[#D62308]/10 text-[#D62308] dark:border-[#FF735E] dark:text-[#FF735E]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#D62308]'
              }`}
            >
              <Camera className="w-3 h-3" />
              Tipos de Plano
            </button>
            <span className="hidden xl:inline text-[11px] text-slate-400 dark:text-slate-500">
              Tab alterna tipo · Enter cria próximo
            </span>
          </div>
        </div>

        {focusedBlock?.type === 'scene_heading' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-400 mr-1">Atalhos de cena:</span>
            {['INT. ', 'EXT. ', 'INT./EXT. '].map((prefix) => (
              <button
                key={prefix}
                type="button"
                onClick={() => applyQuickChip(prefix, 'prefix')}
                className="rounded-md bg-slate-100 dark:bg-[#0B0E17] px-2 py-0.5 text-[11px] font-semibold text-[#102EE0] dark:text-[#7A92FF] hover:opacity-80 cursor-pointer"
              >
                {prefix.trim()}
              </button>
            ))}
            {['- DIA', '- NOITE', '- CREPÚSCULO', '- AMANHECER'].map((suffix) => (
              <button
                key={suffix}
                type="button"
                onClick={() => applyQuickChip(suffix, 'suffix')}
                className="rounded-md bg-slate-100 dark:bg-[#0B0E17] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#102EE0] cursor-pointer"
              >
                {suffix}
              </button>
            ))}
          </div>
        )}

        {focusedBlock?.type === 'character' && knownCharacterNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-400 mr-1">Personagens:</span>
            {knownCharacterNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => applyQuickChip(name, 'replace')}
                className="rounded-md bg-slate-100 dark:bg-[#0B0E17] px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-[#102EE0] dark:hover:text-[#7A92FF] cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Visual Shot Suggestions with Example Film Frames */}
        {activeVisualGuide === 'shot' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Sugestões de Plano / Enquadramento com Imagem de Exemplo
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {focusedBlock?.type === 'shot'
                    ? 'Clique para aplicar o enquadramento no bloco Plano selecionado.'
                    : 'Clique em um tipo para inserir um novo bloco Plano no roteiro.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManualVisualGuide(null);
                  if (focusedBlock?.type === 'shot') setFocusedBlockId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                aria-label="Fechar sugestões de plano"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {SHOT_TYPE_EXAMPLES.map((shot) => {
                const isSelected =
                  focusedBlock?.type === 'shot' &&
                  focusedBlock.content.toUpperCase().startsWith(shot.insertText.trim());
                return (
                  <button
                    key={shot.id}
                    type="button"
                    onClick={() => handleApplyShotExample(shot)}
                    className={`group text-left rounded-xl border overflow-hidden transition-colors cursor-pointer flex flex-col bg-slate-50 dark:bg-[#0B0E17] ${
                      isSelected
                        ? 'border-[#D62308] ring-1 ring-[#D62308]/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-[#102EE0] dark:hover:border-[#4D6BFF]'
                    }`}
                  >
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                      <img
                        src={shot.imageUrl}
                        alt={shot.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-medium text-slate-200 truncate">
                        {shot.framingNote}
                      </span>
                    </div>
                    <div className="p-2 space-y-0.5">
                      <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {shot.label}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                        {shot.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Visual Transition Suggestions with Example Previews */}
        {activeVisualGuide === 'transition' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Sugestões de Transição com Exemplo Visual
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {focusedBlock?.type === 'transition'
                    ? 'Clique para aplicar a transição no bloco selecionado.'
                    : 'Clique em uma transição para inserir no roteiro.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManualVisualGuide(null);
                  if (focusedBlock?.type === 'transition') setFocusedBlockId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                aria-label="Fechar sugestões de transição"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {TRANSITION_TYPE_EXAMPLES.map((item) => {
                const isSelected =
                  focusedBlock?.type === 'transition' &&
                  focusedBlock.content.trim().toUpperCase() === item.insertText.toUpperCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleApplyTransitionExample(item)}
                    className={`group text-left rounded-xl border overflow-hidden transition-colors cursor-pointer flex flex-col bg-slate-50 dark:bg-[#0B0E17] ${
                      isSelected
                        ? 'border-[#102EE0] ring-1 ring-[#102EE0]/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-[#102EE0] dark:hover:border-[#4D6BFF]'
                    }`}
                  >
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                      {renderTransitionPreview(item)}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-1.5 left-2 text-[10px] font-screenplay font-bold text-white">
                        {item.insertText}
                      </span>
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.label}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Screenplay Sheet */}
      <div className="mx-auto max-w-[820px] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] shadow-sm px-5 sm:px-14 py-10 space-y-3">
        {/* Editable Script Title & Synopsis Header */}
        <div className="pb-6 mb-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <input
            type="text"
            value={activeScript.title}
            onChange={(e) => onSaveScript({ ...activeScript, title: e.target.value })}
            className="w-full bg-transparent font-screenplay text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
            placeholder="Título do Roteiro ou Episódio"
          />
          <input
            type="text"
            value={activeScript.synopsis}
            onChange={(e) => onSaveScript({ ...activeScript, synopsis: e.target.value })}
            className="w-full bg-transparent text-xs text-slate-500 dark:text-slate-400 focus:outline-none"
            placeholder="Sinopse curta do episódio / rascunho..."
          />
        </div>

        {activeScript.blocks.map((block) => {
          const isFocused = focusedBlockId === block.id;
          return (
            <div
              key={block.id}
              className={`group relative rounded-xl px-2.5 py-1.5 transition-colors ${
                isFocused
                  ? 'bg-[#102EE0]/5 ring-1 ring-[#102EE0]/30 dark:ring-[#4D6BFF]/40'
                  : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
              }`}
            >
              {/* Inline Block Controls */}
              <div className="flex items-center justify-between gap-2 mb-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                <select
                  value={block.type}
                  onChange={(e) => handleBlockTypeChange(block.id, e.target.value as ScreenplayBlockType)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0E17] px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                >
                  {BLOCK_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {BLOCK_LABELS[t]}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, -1)}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 1)}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-slate-400 hover:text-[#D62308] cursor-pointer"
                    title="Remover bloco"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                ref={(el) => {
                  textareaRefs.current[block.id] = el;
                }}
                rows={Math.max(1, Math.ceil((block.content.length || 1) / (block.type === 'dialogue' ? 42 : 64)))}
                value={block.content}
                onFocus={() => {
                  setFocusedBlockId(block.id);
                  if (block.type === 'shot' || block.type === 'transition') {
                    setManualVisualGuide(block.type);
                  }
                }}
                onChange={(e) => handleBlockChange(block.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, block)}
                placeholder={`Escreva ${BLOCK_LABELS[block.type].toLowerCase()}...`}
                className={`w-full resize-none bg-transparent font-screenplay text-[15px] leading-relaxed focus:outline-none ${getBlockClasses(
                  block.type
                )}`}
              />
            </div>
          );
        })}

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => insertBlockAfter(activeScript.blocks[activeScript.blocks.length - 1]?.id || null, 'action')}
            className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-[#102EE0] hover:text-[#102EE0] dark:hover:border-[#4D6BFF] dark:hover:text-[#7A92FF] transition-colors cursor-pointer"
          >
            + Adicionar novo bloco ao final
          </button>
          <button
            type="button"
            onClick={handleContinueScene}
            disabled={continueLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#D62308]/10 hover:bg-[#D62308]/15 border border-[#D62308]/25 py-2.5 text-xs font-semibold text-[#D62308] dark:text-[#FF735E] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {continueLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {continueLoading ? 'Escrevendo continuação...' : 'Continuar Cena com IA'}
          </button>
        </div>
      </div>
    </div>
  );
};
