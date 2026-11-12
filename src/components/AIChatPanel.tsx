import React, { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, Globe, Loader2, Send, Sparkles, X } from 'lucide-react';
import type { ChatMessage, Project, ScriptDocument } from '../types/studio';

interface AIChatPanelProps {
  project: Project;
  activeScript: ScriptDocument | null;
  messages: ChatMessage[];
  onSendMessageRecord: (msg: ChatMessage) => void;
  onInsertBlockToScript: (text: string) => void;
  onCloseMobile?: () => void;
}

type PersonaKey = 'showrunner' | 'script_doctor' | 'cinematographer' | 'fast_assistant';
type ModelKey = 'gemini-4-carbon' | 'gemini-4-argon' | 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

const PERSONAS: Array<{ key: PersonaKey; label: string; defaultModel: ModelKey; desc: string }> = [
  { key: 'showrunner', label: 'Showrunner', defaultModel: 'gemini-4-carbon', desc: 'Raciocínio profundo de estrutura e arcos' },
  { key: 'cinematographer', label: 'Dir. Fotografia', defaultModel: 'gemini-4-argon', desc: 'Decupagem visual, câmera e lentes' },
  { key: 'script_doctor', label: 'Script Doctor', defaultModel: 'gemini-4-hydrogen', desc: 'Reescrita, ritmo e subtexto' },
  { key: 'fast_assistant', label: 'Assistente Rápido', defaultModel: 'gemini-3.1-flash-lite', desc: 'Ideias instantâneas e rubricas' },
];

function renderMessageWithLinks(content: string, isUser: boolean) {
  const parts = content.split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-0.5 underline break-all ${
            isUser
              ? 'text-blue-100 hover:text-white'
              : 'text-[#102EE0] dark:text-[#7A92FF] hover:opacity-80'
          }`}
        >
          {part}
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  project,
  activeScript,
  messages,
  onSendMessageRecord,
  onInsertBlockToScript,
  onCloseMobile,
}) => {
  const [persona, setPersona] = useState<PersonaKey>('showrunner');
  const [modelPref, setModelPref] = useState<ModelKey>('gemini-4-carbon');
  const [useWebSearch, setUseWebSearch] = useState<boolean>(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, loading]);

  const handleSelectPersona = (nextPersona: PersonaKey) => {
    setPersona(nextPersona);
    const found = PERSONAS.find((p) => p.key === nextPersona);
    if (found) setModelPref(found.defaultModel);
  };

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? input).trim();
    if (!text || loading) return;

    if (!promptOverride) setInput('');
    setError(null);

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      projectId: project.id,
      ownerId: project.ownerId,
      role: 'user',
      persona,
      modelUsed: modelPref,
      content: text,
    };
    onSendMessageRecord(userMsg);
    setLoading(true);

    try {
      const scriptSnippet = activeScript
        ? activeScript.blocks
            .slice(0, 35)
            .map((b) => `${b.type.toUpperCase()}: ${b.content}`)
            .join('\n')
        : '';

      const projectContext = `Título: ${project.title}\nFormato: ${project.format}\nLogline: ${project.logline}\nRoteiro Atual:\n${scriptSnippet}`;

      const history = messages.slice(-12).map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        text: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          message: text,
          persona,
          modelPreference: modelPref,
          projectContext,
          useWebSearch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem.');

      const sources: Array<{ title: string; uri: string }> = Array.isArray(data.sources) ? data.sources : [];
      const sourcesFooter =
        sources.length > 0
          ? `\n\nFontes na web:\n${sources.map((s) => `• ${s.title} (${s.uri})`).join('\n')}`
          : '';

      onSendMessageRecord({
        id: `msg_${Date.now()}_a`,
        projectId: project.id,
        ownerId: project.ownerId,
        role: 'assistant',
        persona,
        modelUsed: data.modelUsed || modelPref,
        content: `${data.reply || ''}${sourcesFooter}`.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na comunicação com Gemini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141824] border-l border-slate-200/80 dark:border-slate-800/80">
      <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#D62308] dark:text-[#FF735E]" />
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Sala de Roteiro IA
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUseWebSearch((v) => !v)}
            title="Ativar ou desativar pesquisa na internet em tempo real via Google"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
              useWebSearch
                ? 'border-[#102EE0]/40 bg-[#102EE0]/10 text-[#102EE0] dark:border-[#4D6BFF]/50 dark:bg-[#2E4EFF]/15 dark:text-[#8BA0FF]'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Globe className="w-3 h-3" />
            Web
          </button>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white lg:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role & Model Selectors */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handleSelectPersona(p.key)}
              className={`rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                persona === p.key
                  ? 'border-[#102EE0] bg-[#102EE0]/10 text-[#102EE0] dark:border-[#4D6BFF] dark:bg-[#2E4EFF]/15 dark:text-[#8BA0FF] font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={modelPref}
          onChange={(e) => setModelPref(e.target.value as ModelKey)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300"
        >
          <option value="gemini-4-carbon">gemini-4-carbon (Raciocínio Profundo)</option>
          <option value="gemini-4-argon">gemini-4-argon (Tarefas Complexas / Visão)</option>
          <option value="gemini-4-hydrogen">gemini-4-hydrogen (Uso Geral)</option>
          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Rápido)</option>
        </select>
      </div>

      {/* Scrollable Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2.5 py-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Converse com o assistente mantendo o contexto completo de <strong>{project.title}</strong>
              {useWebSearch ? ' e pesquisa na internet ativada.' : '.'}
            </p>
            <div className="space-y-1.5">
              {[
                'Sugira uma virada dramática para a próxima cena',
                'Pesquise referências reais na web para dar autenticidade a este roteiro',
                'Como melhorar o subtexto do diálogo principal?',
                'Proponha 3 planos de câmera para abrir a sequência',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 hover:border-[#102EE0] dark:hover:border-[#4D6BFF] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'ml-6 bg-[#102EE0] dark:bg-[#2E4EFF] text-white'
                : 'mr-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E17] text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="whitespace-pre-wrap">{renderMessageWithLinks(msg.content, msg.role === 'user')}</div>
            {msg.role === 'assistant' && (
              <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>{msg.modelUsed || 'gemini'}</span>
                <button
                  type="button"
                  onClick={() => onInsertBlockToScript(msg.content)}
                  className="inline-flex items-center gap-1 text-[#D62308] dark:text-[#FF735E] font-semibold hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Inserir no Roteiro
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#102EE0] dark:text-[#7A92FF]" />
            {useWebSearch ? 'Pesquisando e pensando...' : 'Pensando...'}
          </div>
        )}
        {error && <p className="text-xs text-[#D62308] px-1">{error}</p>}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={useWebSearch ? 'Pergunte, cole um link ou pesquise na web...' : 'Pergunte sobre cena, arco, câmera...'}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#102EE0]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] p-2.5 text-white disabled:opacity-50 cursor-pointer shrink-0"
          aria-label="Enviar mensagem"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
