import React, { useState } from 'react';
import { BookOpen, ImagePlus, Loader2, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import {
  STRUCTURE_TEMPLATES,
  VOICE_OPTIONS,
  type CharacterProfile,
  type Project,
  type ScriptDocument,
  type StoryBeat,
  type StructureType,
  type VoiceName,
} from '../types/studio';

interface StorytellingWorkspaceProps {
  project: Project;
  activeScript?: ScriptDocument | null;
  beats: StoryBeat[];
  characters: CharacterProfile[];
  onUpdateProjectStructure: (structureType: StructureType) => void;
  onSaveBeat: (beat: StoryBeat) => void;
  onDeleteBeat: (beatId: string) => void;
  onSaveCharacter: (char: CharacterProfile) => void;
  onDeleteCharacter: (charId: string) => void;
}

export const StorytellingWorkspace: React.FC<StorytellingWorkspaceProps> = ({
  project,
  activeScript,
  beats,
  characters,
  onUpdateProjectStructure,
  onSaveBeat,
  onDeleteBeat,
  onSaveCharacter,
  onDeleteCharacter,
}) => {
  const [subTab, setSubTab] = useState<'beats' | 'characters'>('beats');
  const [analyzingCharId, setAnalyzingCharId] = useState<string | null>(null);
  const [generatingBeats, setGeneratingBeats] = useState(false);

  const sortedBeats = [...beats].sort((a, b) => a.order - b.order);

  const handleLoadTemplate = (type: StructureType) => {
    onUpdateProjectStructure(type);
    const template = STRUCTURE_TEMPLATES[type];
    const startOrder = sortedBeats.length > 0 ? sortedBeats[sortedBeats.length - 1].order + 1 : 1;
    template.beats.forEach((b, idx) => {
      onSaveBeat({
        id: `beat_${Date.now()}_${idx}`,
        projectId: project.id,
        ownerId: project.ownerId,
        order: startOrder + idx,
        act: b.act,
        title: b.title,
        summary: b.summary,
        emotionalArc: b.emotionalArc,
        linkedScene: '',
      });
    });
  };

  const handleGenerateBeatsAI = async () => {
    if (generatingBeats) return;
    setGeneratingBeats(true);
    try {
      const scriptSummary = activeScript
        ? activeScript.blocks
            .slice(0, 20)
            .map((b) => b.content)
            .join(' ')
        : '';
      const res = await fetch('/api/ai/generate-beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.title,
          format: project.format,
          genre: project.genre,
          logline: project.logline,
          structureType: project.structureType,
          scriptSummary,
          useWebSearch: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar escaleta.');
      const startOrder = sortedBeats.length > 0 ? sortedBeats[sortedBeats.length - 1].order + 1 : 1;
      (data.beats || []).forEach(
        (
          b: { act?: string; title?: string; summary?: string; emotionalArc?: string; linkedScene?: string },
          idx: number
        ) => {
          onSaveBeat({
            id: `beat_ai_${Date.now()}_${idx}`,
            projectId: project.id,
            ownerId: project.ownerId,
            order: startOrder + idx,
            act: b.act || 'Ato I',
            title: b.title || `Beat ${startOrder + idx}`,
            summary: b.summary || '',
            emotionalArc: b.emotionalArc || '',
            linkedScene: b.linkedScene || '',
          });
        }
      );
    } finally {
      setGeneratingBeats(false);
    }
  };

  const handleAddBeat = () => {
    const nextOrder = sortedBeats.length > 0 ? sortedBeats[sortedBeats.length - 1].order + 1 : 1;
    onSaveBeat({
      id: `beat_${Date.now()}`,
      projectId: project.id,
      ownerId: project.ownerId,
      order: nextOrder,
      act: 'Ato II',
      title: `Novo Beat #${nextOrder}`,
      summary: '',
      emotionalArc: '',
      linkedScene: '',
    });
  };

  const handleAddCharacter = () => {
    onSaveCharacter({
      id: `char_${Date.now()}`,
      projectId: project.id,
      ownerId: project.ownerId,
      name: 'NOVO PERSONAGEM',
      role: 'Coadjuvante',
      archetype: '',
      motivation: '',
      flaw: '',
      arc: '',
      voiceName: 'Kore',
      voiceStyle: 'Tom natural e expressivo',
    });
  };

  const handleUploadPortrait = async (char: CharacterProfile, file: File) => {
    setAnalyzingCharId(char.id);
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxW = 640;
            const scale = img.width > maxW ? maxW / img.width : 1;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: 'image/jpeg',
          contextPrompt: `Retrato de referência do personagem ${char.name} (${char.role}). Descreva postura, expressão, figurino e presença cênica.`,
        }),
      });
      const data = await res.json();
      onSaveCharacter({
        ...char,
        imageUrl: dataUrl,
        arc: char.arc || data.visualAnalysis || '',
      });
    } finally {
      setAnalyzingCharId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] px-4 py-3 shadow-[0_1px_2px_rgba(12,15,24,0.03)]">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B0E17]">
          <button
            type="button"
            onClick={() => setSubTab('beats')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'beats'
                ? 'bg-white dark:bg-[#1E2434] text-[#102EE0] dark:text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Escaleta & Beats ({sortedBeats.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('characters')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'characters'
                ? 'bg-white dark:bg-[#1E2434] text-[#102EE0] dark:text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Personagens & Vozes ({characters.length})
          </button>
        </div>

        {subTab === 'beats' ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={project.structureType}
              onChange={(e) => onUpdateProjectStructure(e.target.value as StructureType)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
            >
              {Object.entries(STRUCTURE_TEMPLATES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleLoadTemplate(project.structureType)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Gerar Modelo
            </button>
            <button
              type="button"
              onClick={handleGenerateBeatsAI}
              disabled={generatingBeats}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D62308] hover:bg-[#B51C05] dark:bg-[#E03419] px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {generatingBeats ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generatingBeats ? 'Criando Escaleta...' : 'Escaleta IA'}
            </button>
            <button
              type="button"
              onClick={handleAddBeat}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Beat
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddCharacter}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Personagem
          </button>
        )}
      </div>

      {subTab === 'beats' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedBeats.map((beat) => (
            <div
              key={beat.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-4 space-y-3 shadow-[0_1px_2px_rgba(12,15,24,0.03)]"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-[#102EE0] dark:text-[#7A92FF] tabular-nums">
                    #{beat.order}
                  </span>
                  <span aria-hidden="true">·</span>
                  <input
                    type="text"
                    value={beat.act}
                    onChange={(e) => onSaveBeat({ ...beat, act: e.target.value })}
                    className="w-24 bg-transparent font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                    placeholder="Ato"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteBeat(beat.id)}
                  className="p-1 text-slate-400 hover:text-[#D62308] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                value={beat.title}
                onChange={(e) => onSaveBeat({ ...beat, title: e.target.value })}
                className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
                placeholder="Título do Beat"
              />

              <textarea
                rows={3}
                value={beat.summary}
                onChange={(e) => onSaveBeat({ ...beat, summary: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-800 dark:text-slate-200 resize-none"
                placeholder="O que acontece dramaticamente neste ponto..."
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={beat.emotionalArc}
                  onChange={(e) => onSaveBeat({ ...beat, emotionalArc: e.target.value })}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300"
                  placeholder="Carga emocional"
                />
                <input
                  type="text"
                  value={beat.linkedScene}
                  onChange={(e) => onSaveBeat({ ...beat, linkedScene: e.target.value })}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300"
                  placeholder="Cena vinculada"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {characters.map((char) => (
            <div
              key={char.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] p-5 space-y-4 shadow-[0_1px_2px_rgba(12,15,24,0.03)]"
            >
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0B0E17] border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-400">
                      {(char.name || 'P').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <label
                    className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 hover:opacity-100 transition-opacity text-white cursor-pointer"
                    title="Enviar foto de referência (analisada por IA)"
                  >
                    {analyzingCharId === char.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadPortrait(char, f);
                      }}
                    />
                  </label>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => onSaveCharacter({ ...char, name: e.target.value })}
                      className="w-full bg-transparent text-base font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 focus:outline-none"
                      placeholder="NOME DO PERSONAGEM"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteCharacter(char.id)}
                      className="p-1 text-slate-400 hover:text-[#D62308] cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={char.role}
                      onChange={(e) => onSaveCharacter({ ...char, role: e.target.value })}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                      placeholder="Papel (ex: Protagonista)"
                    />
                    <input
                      type="text"
                      value={char.archetype}
                      onChange={(e) => onSaveCharacter({ ...char, archetype: e.target.value })}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                      placeholder="Arquétipo"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Motivação Central
                  </label>
                  <textarea
                    rows={2}
                    value={char.motivation}
                    onChange={(e) => onSaveCharacter({ ...char, motivation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Falha / Conflito Interno
                  </label>
                  <textarea
                    rows={2}
                    value={char.flaw}
                    onChange={(e) => onSaveCharacter({ ...char, flaw: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Arco de Transformação
                </label>
                <textarea
                  rows={2}
                  value={char.arc}
                  onChange={(e) => onSaveCharacter({ ...char, arc: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Voz para Leitura TTS
                  </label>
                  <select
                    value={char.voiceName}
                    onChange={(e) => onSaveCharacter({ ...char, voiceName: e.target.value as VoiceName })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.label} — {v.tone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Direção de Interpretação
                  </label>
                  <input
                    type="text"
                    value={char.voiceStyle}
                    onChange={(e) => onSaveCharacter({ ...char, voiceStyle: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    placeholder="Ex: Tom grave, pausado..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
