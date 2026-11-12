import React, { useEffect, useState } from 'react';
import {
  Bot,
  FolderKanban,
  Menu,
  Moon,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import { AIChatPanel } from './components/AIChatPanel';
import { ExportStudio } from './components/ExportStudio';
import { MediaImportLab } from './components/MediaImportLab';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { StoryboardWorkspace } from './components/StoryboardWorkspace';
import { StorytellingWorkspace } from './components/StorytellingWorkspace';
import { useLocalWorkspace } from './hooks/useLocalWorkspace';
import { FORMAT_LABELS, type Project, type WorkspaceTab } from './types/studio';

const NAV_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'screenplay', label: 'Roteiro' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'media', label: 'Mídia & IA' },
  { id: 'export', label: 'Exportar' },
];

export default function App() {
  const {
    loadingWorkspace,
    bundle,
    activeProjectId,
    setActiveProjectId,
    createProject,
    updateProject,
    saveScript,
    deleteScript,
    saveFrame,
    deleteFrame,
    saveBeat,
    deleteBeat,
    saveCharacter,
    deleteCharacter,
    saveAsset,
    deleteAsset,
    addChatMessage,
  } = useLocalWorkspace();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('screenplay');
  const [activeScriptByProject, setActiveScriptByProject] = useState<Record<string, string>>({});
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('roteiro-ld-theme') !== 'light';
  });
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showChatDesktop, setShowChatDesktop] = useState(true);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // New project form state
  const [newTitle, setNewTitle] = useState('');
  const [newLogline, setNewLogline] = useState('');
  const [newGenre, setNewGenre] = useState('Drama / Suspense');
  const [newFormat, setNewFormat] = useState<Project['format']>('curta');
  const [newAuthor, setNewAuthor] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('roteiro-ld-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('roteiro-ld-theme', 'light');
    }
  }, [darkMode]);

  const activeProject =
    bundle.projects.find((p) => p.id === activeProjectId) || bundle.projects[0] || null;
  const projectScripts = activeProject ? bundle.scripts[activeProject.id] || [] : [];
  const activeScriptId = activeProject ? activeScriptByProject[activeProject.id] : undefined;
  const activeScript =
    projectScripts.find((s) => s.id === activeScriptId) || projectScripts[0] || null;

  const projectFrames = activeProject ? bundle.frames[activeProject.id] || [] : [];
  const projectBeats = activeProject ? bundle.beats[activeProject.id] || [] : [];
  const projectCharacters = activeProject ? bundle.characters[activeProject.id] || [] : [];
  const projectAssets = activeProject ? bundle.assets[activeProject.id] || [] : [];
  const projectChat = activeProject ? bundle.chatMessages[activeProject.id] || [] : [];

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createProject({
      title: newTitle.trim(),
      logline: newLogline.trim(),
      genre: newGenre.trim(),
      format: newFormat,
      author: newAuthor.trim() || 'Roteirista',
      structureType: 'three_act',
    });
    setNewTitle('');
    setNewLogline('');
    setShowNewProjectModal(false);
  };

  const handleCreateScript = async () => {
    if (!activeProject) return;
    const nextNum = projectScripts.length + 1;
    const created = await saveScript(
      activeProject.id,
      {
        id: `scr_${Date.now()}`,
        projectId: activeProject.id,
        ownerId: activeProject.ownerId,
        title: `Episódio / Versão ${nextNum}`,
        episodeNumber: nextNum,
        synopsis: '',
        blocks: [
          {
            id: `blk_${Date.now()}_1`,
            type: 'scene_heading',
            content: 'INT. NOVA CENA - DIA',
          },
          {
            id: `blk_${Date.now()}_2`,
            type: 'action',
            content: 'Descreva a ação inicial.',
          },
        ],
      },
      true
    );
    setActiveScriptByProject((prev) => ({ ...prev, [activeProject.id]: created.id }));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#141824] border-r border-slate-200/80 dark:border-slate-800/80 p-4 space-y-5 overflow-y-auto">
      {/* Projects List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Projetos
          </span>
          <button
            type="button"
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#102EE0] dark:text-[#7A92FF] hover:bg-[#102EE0]/10 dark:hover:bg-[#2E4EFF]/15 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>

        <div className="space-y-1.5">
          {bundle.projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActiveProjectId(p.id);
                setShowSidebarMobile(false);
              }}
              className={`w-full text-left rounded-xl px-3.5 py-2.5 text-xs transition-all cursor-pointer ${
                activeProject?.id === p.id
                  ? 'bg-[#102EE0] dark:bg-[#2E4EFF] text-white font-semibold shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <div className="truncate">{p.title}</div>
              <div
                className={`text-[11px] truncate mt-0.5 ${
                  activeProject?.id === p.id
                    ? 'text-blue-100'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {FORMAT_LABELS[p.format]} · {p.sceneCount} cenas
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Project Metadata Editor */}
      {activeProject && (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ficha do Projeto
          </span>
          <input
            type="text"
            value={activeProject.title}
            onChange={(e) => updateProject(activeProject.id, { title: e.target.value })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#102EE0]/40"
            placeholder="Título do projeto"
          />
          <select
            value={activeProject.format}
            onChange={(e) =>
              updateProject(activeProject.id, { format: e.target.value as Project['format'] })
            }
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#102EE0]/40"
          >
            {Object.entries(FORMAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={activeProject.author}
            onChange={(e) => updateProject(activeProject.id, { author: e.target.value })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#102EE0]/40"
            placeholder="Autor / Roteirista"
          />
          <textarea
            rows={3}
            value={activeProject.logline}
            onChange={(e) => updateProject(activeProject.id, { logline: e.target.value })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#102EE0]/40"
            placeholder="Logline do projeto..."
          />
        </div>
      )}

      {/* Theme & PWA Install */}
      <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <button
          type="button"
          onClick={() => setDarkMode((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
        >
          <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <PWAInstallButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FC] text-[#111827] dark:bg-[#0B0E17] dark:text-[#F3F4F8]">
      {/* Strict 3-Zone Top Bar */}
      <header className="h-15 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141824] px-4 lg:px-6 flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Clean Brand Logo + Single-line Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('screenplay');
          }}
          className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0"
        >
          <img
            src="/assets/aistudio/LD_LOGO_a27c8238.png"
            alt="Roteiro LD"
            className="w-8 h-8 rounded-lg object-contain shrink-0"
          />
          <span>Roteiro LD</span>
        </a>

        {/* Zone 2: 5 single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#102EE0] dark:border-[#4D6BFF] text-[#102EE0] dark:text-white font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] dark:hover:bg-[#1E3DF0] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Projeto
          </button>
        </div>
      </header>

      {/* Secondary Workspace Context Bar (below top bar) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#10141F] px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowSidebarMobile(true)}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141824] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            Projetos
          </button>

          {activeProject && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 truncate">
              <FolderKanban className="w-3.5 h-3.5 text-[#102EE0] dark:text-[#6B85FF] shrink-0 hidden sm:block" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {activeProject.title}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{FORMAT_LABELS[activeProject.format]}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setShowChatMobile(true);
              } else {
                setShowChatDesktop((v) => !v);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D62308] hover:bg-[#B51C05] dark:bg-[#E03419] dark:hover:bg-[#C92910] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            Assistente IA
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:block w-[260px] shrink-0">{sidebarContent}</aside>

        {/* Mobile Sidebar Drawer */}
        {showSidebarMobile && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setShowSidebarMobile(false)}
            />
            <div className="relative z-10 w-72 max-w-[85vw] h-full">
              <button
                type="button"
                onClick={() => setShowSidebarMobile(false)}
                className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
          {loadingWorkspace && !activeProject ? (
            <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400">
              Carregando estúdio Roteiro LD...
            </div>
          ) : !activeProject ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Crie um novo projeto para começar.</p>
            </div>
          ) : (
            <>
              {activeTab === 'screenplay' && (
                <ScreenplayEditor
                  project={activeProject}
                  scripts={projectScripts}
                  activeScript={activeScript}
                  characters={projectCharacters}
                  onSelectScript={(id) =>
                    setActiveScriptByProject((prev) => ({ ...prev, [activeProject.id]: id }))
                  }
                  onCreateScript={handleCreateScript}
                  onDeleteScript={(id) => deleteScript(activeProject.id, id)}
                  onSaveScript={(s) => saveScript(activeProject.id, s)}
                  onUpdateProjectStats={(sceneCount, pageCount) =>
                    updateProject(activeProject.id, { sceneCount, pageCount })
                  }
                />
              )}

              {activeTab === 'storyboard' && (
                <StoryboardWorkspace
                  projectId={activeProject.id}
                  projectTitle={activeProject.title}
                  ownerId={activeProject.ownerId}
                  activeScript={activeScript}
                  frames={projectFrames}
                  onSaveFrame={(f) => saveFrame(activeProject.id, f)}
                  onDeleteFrame={(fid) => deleteFrame(activeProject.id, fid)}
                  onInsertSceneToScript={(still) => {
                    if (!activeScript) return;
                    const ts = Date.now();
                    const newBlocks = [
                      ...activeScript.blocks,
                      {
                        id: `blk_${ts}_1`,
                        type: 'scene_heading' as const,
                        content: `INT./EXT. ${still.title.toUpperCase()} - CENA`,
                      },
                      {
                        id: `blk_${ts}_2`,
                        type: 'shot' as const,
                        content: `${still.shotSize.toUpperCase()} — ${still.cameraMovement} (${still.lens})`,
                      },
                      {
                        id: `blk_${ts}_3`,
                        type: 'action' as const,
                        content: `${still.sceneUsage} Iluminação de referência: ${still.lightingNote} (${still.filmReference}).`,
                      },
                    ];
                    saveScript(activeProject.id, {
                      ...activeScript,
                      blocks: newBlocks,
                    });
                    const sc = newBlocks.filter((b) => b.type === 'scene_heading').length;
                    const pg = Math.max(1, Math.ceil(newBlocks.length / 18));
                    updateProject(activeProject.id, { sceneCount: sc, pageCount: pg });
                  }}
                />
              )}

              {activeTab === 'storytelling' && (
                <StorytellingWorkspace
                  project={activeProject}
                  activeScript={activeScript}
                  beats={projectBeats}
                  characters={projectCharacters}
                  onUpdateProjectStructure={(structureType) =>
                    updateProject(activeProject.id, { structureType })
                  }
                  onSaveBeat={(b) => saveBeat(activeProject.id, b)}
                  onDeleteBeat={(bid) => deleteBeat(activeProject.id, bid)}
                  onSaveCharacter={(c) => saveCharacter(activeProject.id, c)}
                  onDeleteCharacter={(cid) => deleteCharacter(activeProject.id, cid)}
                />
              )}

              {activeTab === 'media' && (
                <MediaImportLab
                  project={activeProject}
                  assets={projectAssets}
                  onSaveAsset={(a) => saveAsset(activeProject.id, a)}
                  onDeleteAsset={(aid) => deleteAsset(activeProject.id, aid)}
                  onCreateScriptFromAI={async (scr) => {
                    const saved = await saveScript(activeProject.id, scr, true);
                    setActiveScriptByProject((prev) => ({ ...prev, [activeProject.id]: saved.id }));
                  }}
                  onAddFramesFromAI={(frames) => {
                    frames.forEach((f) => saveFrame(activeProject.id, f));
                  }}
                  onAddBeatsFromAI={(beats) => {
                    beats.forEach((b) => saveBeat(activeProject.id, b));
                  }}
                  onAddCharactersFromAI={(chars) => {
                    chars.forEach((c) => saveCharacter(activeProject.id, c));
                  }}
                  onNavigateToScreenplay={() => setActiveTab('screenplay')}
                />
              )}

              {activeTab === 'export' && (
                <ExportStudio
                  project={activeProject}
                  scripts={projectScripts}
                  frames={projectFrames}
                />
              )}
            </>
          )}
        </main>

        {/* Desktop Right AI Assistant Sidebar */}
        {showChatDesktop && activeProject && (
          <aside className="hidden lg:block w-[340px] shrink-0 h-[calc(100vh-6.25rem)] sticky top-0">
            <AIChatPanel
              project={activeProject}
              activeScript={activeScript}
              messages={projectChat}
              onSendMessageRecord={(msg) => addChatMessage(activeProject.id, msg)}
              onInsertBlockToScript={(text) => {
                if (!activeScript) return;
                saveScript(activeProject.id, {
                  ...activeScript,
                  blocks: [
                    ...activeScript.blocks,
                    { id: `blk_${Date.now()}`, type: 'action', content: text.slice(0, 3500) },
                  ],
                });
                setActiveTab('screenplay');
              }}
            />
          </aside>
        )}

        {/* Mobile AI Assistant Modal Drawer */}
        {showChatMobile && activeProject && (
          <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setShowChatMobile(false)}
            />
            <div className="relative z-10 w-full max-w-sm h-full">
              <AIChatPanel
                project={activeProject}
                activeScript={activeScript}
                messages={projectChat}
                onSendMessageRecord={(msg) => addChatMessage(activeProject.id, msg)}
                onInsertBlockToScript={(text) => {
                  if (!activeScript) return;
                  saveScript(activeProject.id, {
                    ...activeScript,
                    blocks: [
                      ...activeScript.blocks,
                      { id: `blk_${Date.now()}`, type: 'action', content: text.slice(0, 3500) },
                    ],
                  });
                  setShowChatMobile(false);
                  setActiveTab('screenplay');
                }}
                onCloseMobile={() => setShowChatMobile(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Compact Bottom Tab Bar (<= 56px, under 15% mobile viewport cap) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-13 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141824] flex items-center justify-around px-1">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-2 text-[11px] font-medium whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'text-[#102EE0] dark:text-[#7A92FF] font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateNewProject}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141824] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Novo Projeto no Roteiro LD
              </h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título do Projeto
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Sombra no Atlântico"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Formato
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as Project['format'])}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gênero
                  </label>
                  <input
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Autor / Roteirista
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Logline
                </label>
                <textarea
                  rows={3}
                  value={newLogline}
                  onChange={(e) => setNewLogline(e.target.value)}
                  placeholder="Resumo da premissa dramática em 1 ou 2 frases..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Criar Projeto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
