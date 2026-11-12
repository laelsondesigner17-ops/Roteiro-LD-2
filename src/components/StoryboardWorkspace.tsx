import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Clapperboard,
  Eraser,
  Film,
  ImagePlus,
  Library,
  Loader2,
  PenTool,
  Plus,
  ScanEye,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { FILM_STILL_BANK, type FilmStillReference } from '../lib/cinemaReferences';
import type { ScriptDocument, StoryboardFrame } from '../types/studio';

interface StoryboardWorkspaceProps {
  projectId: string;
  projectTitle?: string;
  ownerId: string;
  activeScript?: ScriptDocument | null;
  frames: StoryboardFrame[];
  onSaveFrame: (frame: StoryboardFrame) => void;
  onDeleteFrame: (frameId: string) => void;
  onInsertSceneToScript?: (still: FilmStillReference) => void;
}

const SHOT_SIZES = [
  'Grande Plano Geral (GPG)',
  'Plano Geral (PG)',
  'Plano Conjunto (PC)',
  'Plano Médio (PM)',
  'Plano Americano (PA)',
  'Primeiro Plano (PP)',
  'Close-up (CU)',
  'Plano Detalhe (PD)',
  'Vista Aérea / Drone',
];

const CAMERA_MOVES = [
  'Estática em tripé',
  'Panorâmica (Pan)',
  'Tilt (Vertical)',
  'Travelling / Dolly',
  'Steadicam / Seguimento',
  'Câmera na Mão',
  'Grua / Drone',
  'Zoom Lento',
];

async function compressImageDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 960;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: String(reader.result), mimeType: file.type || 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.78), mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({
  projectId,
  projectTitle,
  ownerId,
  activeScript,
  frames,
  onSaveFrame,
  onDeleteFrame,
  onInsertSceneToScript,
}) => {
  const sortedFrames = [...frames].sort((a, b) => a.order - b.order);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [decoupling, setDecoupling] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Film Still Bank state
  const [showFilmBank, setShowFilmBank] = useState(false);
  const [targetFrameIdForBank, setTargetFrameIdForBank] = useState<string | null>(null);
  const [bankCategory, setBankCategory] = useState<'Todos' | FilmStillReference['category']>('Todos');
  const [bankQuery, setBankQuery] = useState('');
  const [bankFeedback, setBankFeedback] = useState<string | null>(null);

  // Sketchpad modal state
  const [sketchFrame, setSketchFrame] = useState<StoryboardFrame | null>(null);
  const [brushColor, setBrushColor] = useState('#E5A93C');
  const [isErasing, setIsErasing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const totalDuration = sortedFrames.reduce((acc, f) => acc + (Number(f.durationSec) || 0), 0);

  const bankCategories: Array<'Todos' | FilmStillReference['category']> = [
    'Todos',
    'Drama & Noir',
    'Ficção Científica',
    'Suspense',
    'Ação',
    'Detalhes & Inserts',
  ];

  const filteredStills = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return FILM_STILL_BANK.filter((item) => {
      if (bankCategory !== 'Todos' && item.category !== bankCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.filmReference.toLowerCase().includes(q) ||
        item.shotSize.toLowerCase().includes(q) ||
        item.cameraMovement.toLowerCase().includes(q) ||
        item.lens.toLowerCase().includes(q) ||
        item.lightingNote.toLowerCase().includes(q) ||
        item.sceneUsage.toLowerCase().includes(q)
      );
    });
  }, [bankCategory, bankQuery]);

  const targetFrameForBank = targetFrameIdForBank
    ? sortedFrames.find((f) => f.id === targetFrameIdForBank) || null
    : null;

  const notifyBank = (msg: string) => {
    setBankFeedback(msg);
    setTimeout(() => {
      setBankFeedback((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const handleUseStillAsNewFrame = (still: FilmStillReference) => {
    const nextOrder = sortedFrames.length > 0 ? sortedFrames[sortedFrames.length - 1].order + 1 : 1;
    onSaveFrame({
      id: `frm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      projectId,
      ownerId,
      order: nextOrder,
      sceneTitle: `CENA ${nextOrder} — ${still.title.toUpperCase()}`,
      shotSize: still.shotSize,
      cameraMovement: still.cameraMovement,
      lens: still.lens,
      durationSec: 6,
      action: still.sceneUsage,
      dialogueCue: '',
      audioNotes: '',
      imageUrl: still.imageUrl,
      aiAnalysis: `${still.filmReference}. ${still.lightingNote}`,
    });
    notifyBank(`Cena #${nextOrder} criada com "${still.title}".`);
  };

  const handleApplyStillToTargetFrame = (
    still: FilmStillReference,
    includeTechnicalSetup: boolean
  ) => {
    if (!targetFrameForBank) {
      handleUseStillAsNewFrame(still);
      return;
    }
    onSaveFrame({
      ...targetFrameForBank,
      imageUrl: still.imageUrl,
      ...(includeTechnicalSetup
        ? {
            shotSize: still.shotSize,
            cameraMovement: still.cameraMovement,
            lens: still.lens,
            action: targetFrameForBank.action || still.sceneUsage,
            aiAnalysis: `${still.filmReference}. ${still.lightingNote}`,
          }
        : {
            aiAnalysis: targetFrameForBank.aiAnalysis || `${still.filmReference}. ${still.lightingNote}`,
          }),
    });
    notifyBank(`Referência "${still.title}" aplicada ao Plano #${targetFrameForBank.order}.`);
    setTargetFrameIdForBank(null);
  };

  const handleAddFrame = () => {
    const nextOrder = sortedFrames.length > 0 ? sortedFrames[sortedFrames.length - 1].order + 1 : 1;
    onSaveFrame({
      id: `frm_${Date.now()}`,
      projectId,
      ownerId,
      order: nextOrder,
      sceneTitle: `CENA ${nextOrder} — NOVA DECUPAGEM`,
      shotSize: 'Plano Médio (PM)',
      cameraMovement: 'Estática em tripé',
      lens: '35mm',
      durationSec: 5,
      action: '',
      dialogueCue: '',
      audioNotes: '',
      imageUrl: '',
      aiAnalysis: '',
    });
  };

  const handleUploadImage = async (frame: StoryboardFrame, file: File) => {
    try {
      const { dataUrl } = await compressImageDataUrl(file);
      onSaveFrame({ ...frame, imageUrl: dataUrl });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erro ao processar imagem.');
    }
  };

  const handleAnalyzeFrameImage = async (frame: StoryboardFrame) => {
    if (!frame.imageUrl) return;
    setAnalyzingId(frame.id);
    setAnalysisError(null);
    try {
      let base64Payload = frame.imageUrl;
      if (!base64Payload.startsWith('data:')) {
        // Fetch local asset image and convert to base64
        const resImg = await fetch(frame.imageUrl);
        const blob = await resImg.blob();
        base64Payload = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(blob);
        });
      }

      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Payload,
          mimeType: 'image/jpeg',
          contextPrompt: `${frame.sceneTitle} - ${frame.action}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na análise visual.');

      onSaveFrame({
        ...frame,
        sceneTitle: data.sceneHeading || frame.sceneTitle,
        shotSize: data.shotSize || frame.shotSize,
        cameraMovement: data.cameraMovement || frame.cameraMovement,
        lens: data.lens || frame.lens,
        action: frame.action || data.actionDescription || '',
        aiAnalysis: data.visualAnalysis || '',
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erro ao analisar quadro.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const openSketchpad = (frame: StoryboardFrame) => {
    setSketchFrame(frame);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#14171D';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Rule of thirds subtle guides
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 3, 0);
      ctx.lineTo(canvas.width / 3, canvas.height);
      ctx.moveTo((canvas.width * 2) / 3, 0);
      ctx.lineTo((canvas.width * 2) / 3, canvas.height);
      ctx.moveTo(0, canvas.height / 3);
      ctx.lineTo(canvas.width, canvas.height / 3);
      ctx.moveTo(0, (canvas.height * 2) / 3);
      ctx.lineTo(canvas.width, (canvas.height * 2) / 3);
      ctx.stroke();
    }, 50);
  };

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.strokeStyle = isErasing ? '#14171D' : brushColor;
    ctx.lineWidth = isErasing ? 18 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const saveSketchToFrame = () => {
    if (!sketchFrame || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    onSaveFrame({ ...sketchFrame, imageUrl: dataUrl });
    setSketchFrame(null);
  };

  const handleDecoupleScript = async () => {
    if (!activeScript || activeScript.blocks.length === 0 || decoupling) return;
    setDecoupling(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/ai/script-to-storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: projectTitle || activeScript.title,
          blocks: activeScript.blocks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao decupar roteiro em planos.');

      const startOrder = sortedFrames.length > 0 ? sortedFrames[sortedFrames.length - 1].order + 1 : 1;
      const shots = Array.isArray(data.frames) ? data.frames : Array.isArray(data.shots) ? data.shots : [];
      shots.forEach((shot: Record<string, unknown>, idx: number) => {
        onSaveFrame({
          id: `frm_${Date.now()}_${idx}`,
          projectId,
          ownerId,
          order: startOrder + idx,
          sceneTitle: String(shot.sceneTitle || `PLANO ${startOrder + idx}`),
          shotSize: String(shot.shotSize || 'Plano Médio (PM)'),
          cameraMovement: String(shot.cameraMovement || 'Estática em tripé'),
          lens: String(shot.lens || '35mm'),
          durationSec: Number(shot.durationSec) || 5,
          action: String(shot.action || ''),
          dialogueCue: String(shot.dialogueCue || ''),
          audioNotes: '',
          imageUrl: '',
          aiAnalysis: '',
        });
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erro ao decupar roteiro.');
    } finally {
      setDecoupling(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] px-4 py-3 shadow-[0_1px_2px_rgba(12,15,24,0.03)]">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Storyboard & Decupagem Cinematográfica
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {sortedFrames.length} planos · Duração estimada {totalDuration}s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTargetFrameIdForBank(null);
              setShowFilmBank((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showFilmBank
                ? 'border-[#102EE0] bg-[#102EE0]/10 text-[#102EE0] dark:border-[#4D6BFF] dark:bg-[#2E4EFF]/15 dark:text-[#8BA0FF]'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] text-slate-700 dark:text-slate-200 hover:border-[#102EE0]'
            }`}
          >
            <Library className="w-4 h-4" />
            Banco de Filmes ({FILM_STILL_BANK.length})
          </button>

          {activeScript && activeScript.blocks.length > 0 && (
            <button
              type="button"
              onClick={handleDecoupleScript}
              disabled={decoupling}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D62308] hover:bg-[#B81D05] dark:bg-[#E03419] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {decoupling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Decupar Roteiro (IA)
            </button>
          )}
          <button
            type="button"
            onClick={handleAddFrame}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Plano
          </button>
        </div>
      </div>

      {analysisError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          {analysisError}
        </div>
      )}

      {bankFeedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{bankFeedback}</span>
        </div>
      )}

      {/* Cinema Film Still Reference Bank inside Storyboard */}
      {showFilmBank && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-5 space-y-4 shadow-[0_1px_3px_rgba(12,15,24,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Banco de Capturas de Grandes Filmes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Referências clássicas e contemporâneas de enquadramento, lente e iluminação para usar direto nas cenas do storyboard ou no roteiro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowFilmBank(false);
                setTargetFrameIdForBank(null);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              aria-label="Fechar banco de filmes"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {targetFrameForBank && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#102EE0]/30 bg-[#102EE0]/5 dark:bg-[#2E4EFF]/10 px-3.5 py-2.5 text-xs">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Aplicando referência no <strong className="text-[#102EE0] dark:text-[#8BA0FF]">Plano #{targetFrameForBank.order}</strong> ({targetFrameForBank.sceneTitle})
              </span>
              <button
                type="button"
                onClick={() => setTargetFrameIdForBank(null)}
                className="text-xs font-semibold text-[#102EE0] dark:text-[#8BA0FF] hover:underline cursor-pointer"
              >
                Trocar para: Criar Nova Cena
              </button>
            </div>
          )}

          {/* Category Filter + Live Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B0E17]">
              {bankCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBankCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    bankCategory === cat
                      ? 'bg-white dark:bg-[#141824] text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)}
                placeholder="Buscar filme, lente, plano ou luz..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#102EE0]/40"
              />
            </div>
          </div>

          {filteredStills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhuma captura encontrada para os filtros atuais.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBankCategory('Todos');
                  setBankQuery('');
                }}
                className="mt-2 text-xs font-semibold text-[#102EE0] dark:text-[#8BA0FF] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[540px] overflow-y-auto pr-1">
              {filteredStills.map((still) => (
                <div
                  key={still.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0B0E17] overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={still.imageUrl}
                      alt={`${still.title} — ${still.filmReference}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 text-[11px] font-medium text-white truncate">
                      {still.filmReference}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {still.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>{still.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{still.shotSize}</span>
                        <span aria-hidden="true">·</span>
                        <span>{still.lens}</span>
                        <span aria-hidden="true">·</span>
                        <span>{still.cameraMovement}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Luz: </span>
                      {still.lightingNote}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Uso em cena: </span>
                      {still.sceneUsage}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {targetFrameForBank ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApplyStillToTargetFrame(still, true)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-3 py-1.5 text-[11px] font-semibold text-white whitespace-nowrap cursor-pointer"
                          >
                            Aplicar no Plano #{targetFrameForBank.order}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyStillToTargetFrame(still, false)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                          >
                            Só Imagem
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUseStillAsNewFrame(still)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-3 py-1.5 text-[11px] font-semibold text-white whitespace-nowrap cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Usar em Nova Cena
                          </button>
                          {onInsertSceneToScript && (
                            <button
                              type="button"
                              onClick={() => {
                                onInsertSceneToScript(still);
                                notifyBank(`Cena "${still.title}" adicionada ao roteiro.`);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-[#D62308] hover:text-[#D62308] dark:hover:text-[#FF735E] whitespace-nowrap cursor-pointer"
                              title="Inserir cabeçalho, plano e ação no roteiro ativo"
                            >
                              <Clapperboard className="w-3.5 h-3.5" />
                              Ao Roteiro
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {sortedFrames.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center bg-white/50 dark:bg-[#141824]/50">
          <Film className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Nenhum quadro de storyboard ainda
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Adicione planos, escolha referências no Banco de Filmes, envie fotos para análise com IA ou desenhe esboços rápidos.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleAddFrame}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-4 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Quadro
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetFrameIdForBank(null);
                setShowFilmBank(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141824] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#102EE0] cursor-pointer"
            >
              <Library className="w-4 h-4 text-[#102EE0] dark:text-[#8BA0FF]" />
              Explorar Banco de Filmes
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedFrames.map((frame) => (
            <div
              key={frame.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(12,15,24,0.04)]"
            >
              {/* Frame Visual 16:9 */}
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                {frame.imageUrl ? (
                  <img
                    src={frame.imageUrl}
                    alt={frame.sceneTitle || `Quadro ${frame.order}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-400 p-4 text-center">
                    <Camera className="w-7 h-7 mb-2 opacity-60" />
                    <span className="text-xs font-medium">Quadro #{frame.order} — Sem imagem</span>
                  </div>
                )}

                <div className="absolute top-2.5 left-2.5 rounded-lg bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                  #{frame.order} · {frame.durationSec}s
                </div>

                <div className="absolute bottom-2.5 right-2.5 flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetFrameIdForBank(frame.id);
                      setShowFilmBank(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-black/75 hover:bg-black/90 px-2.5 py-1.5 text-[11px] font-medium text-white cursor-pointer"
                    title="Escolher captura no Banco de Filmes"
                  >
                    <Library className="w-3.5 h-3.5" />
                    Banco
                  </button>
                  <label className="inline-flex items-center gap-1 rounded-lg bg-black/75 hover:bg-black/90 px-2.5 py-1.5 text-[11px] font-medium text-white cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" />
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(frame, f);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => openSketchpad(frame)}
                    className="inline-flex items-center gap-1 rounded-lg bg-black/75 hover:bg-black/90 px-2.5 py-1.5 text-[11px] font-medium text-white cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Esboço
                  </button>
                  {frame.imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleAnalyzeFrameImage(frame)}
                      disabled={analyzingId === frame.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#D62308] hover:bg-[#B51C05] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60 cursor-pointer"
                    >
                      {analyzingId === frame.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ScanEye className="w-3.5 h-3.5" />
                      )}
                      Analisar IA
                    </button>
                  )}
                </div>
              </div>

              {/* Frame Technical Metadata & Action */}
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={frame.sceneTitle}
                    onChange={(e) => onSaveFrame({ ...frame, sceneTitle: e.target.value })}
                    className="w-full bg-transparent text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100 focus:outline-none"
                    placeholder="CENA / TÍTULO DO PLANO"
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteFrame(frame.id)}
                    className="p-1 text-slate-400 hover:text-[#D62308] cursor-pointer shrink-0"
                    title="Remover quadro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={frame.shotSize}
                    onChange={(e) => onSaveFrame({ ...frame, shotSize: e.target.value })}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200"
                  >
                    {!SHOT_SIZES.includes(frame.shotSize) && frame.shotSize && (
                      <option value={frame.shotSize}>{frame.shotSize}</option>
                    )}
                    {SHOT_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={frame.cameraMovement}
                    onChange={(e) => onSaveFrame({ ...frame, cameraMovement: e.target.value })}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200"
                  >
                    {!CAMERA_MOVES.includes(frame.cameraMovement) && frame.cameraMovement && (
                      <option value={frame.cameraMovement}>{frame.cameraMovement}</option>
                    )}
                    {CAMERA_MOVES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={frame.lens}
                    onChange={(e) => onSaveFrame({ ...frame, lens: e.target.value })}
                    placeholder="Lente (ex: 35mm)"
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={frame.durationSec}
                    onChange={(e) => onSaveFrame({ ...frame, durationSec: Number(e.target.value) || 1 })}
                    placeholder="Segundos"
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 tabular-nums"
                  />
                </div>

                <textarea
                  rows={2}
                  value={frame.action}
                  onChange={(e) => onSaveFrame({ ...frame, action: e.target.value })}
                  placeholder="Ação visual do quadro..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 resize-none"
                />

                <input
                  type="text"
                  value={frame.dialogueCue}
                  onChange={(e) => onSaveFrame({ ...frame, dialogueCue: e.target.value })}
                  placeholder="Fala / SFX / Trilha..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300"
                />

                {frame.aiAnalysis && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="font-semibold text-[#D62308] dark:text-[#FF735E]">Direção Visual IA: </span>
                    {frame.aiAnalysis}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Storyboard Sketchpad Modal */}
      {sketchFrame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141824] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Esboço Rápido — Plano #{sketchFrame.order}
              </h3>
              <button
                type="button"
                onClick={() => setSketchFrame(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['#2E4EFF', '#F8FAFC', '#E03419', '#FBBF24'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setBrushColor(color);
                    setIsErasing(false);
                  }}
                  className={`w-6 h-6 rounded-lg border cursor-pointer ${
                    !isErasing && brushColor === color ? 'ring-2 ring-[#102EE0] dark:ring-[#4D6BFF] border-white' : 'border-slate-600'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setIsErasing((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs cursor-pointer ${
                  isErasing
                    ? 'border-[#D62308] bg-[#D62308]/15 text-[#D62308] dark:text-[#FF735E]'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                Borracha
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              className="w-full aspect-video rounded-xl border border-slate-700 touch-none cursor-crosshair"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSketchFrame(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveSketchToFrame}
                className="rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Salvar no Quadro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
