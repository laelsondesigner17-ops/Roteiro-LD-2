import { useCallback, useEffect, useState } from 'react';
import { loadLocalWorkspace, saveLocalWorkspace, type LocalWorkspaceBundle } from '../lib/localStore';
import { createStarterBundle } from '../lib/seedProject';
import type {
  CharacterProfile,
  ChatMessage,
  ImportedAsset,
  Project,
  ScriptDocument,
  StoryboardFrame,
  StoryBeat,
} from '../types/studio';

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `id_${Date.now()}`;
}

export function useLocalWorkspace() {
  const [bundle, setBundle] = useState<LocalWorkspaceBundle>(() => createStarterBundle('local-guest'));
  const [activeProjectId, setActiveProjectId] = useState<string>('proj_ultimo_sinal');
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Load initial local workspace from IndexedDB
  useEffect(() => {
    let mounted = true;
    loadLocalWorkspace().then((saved) => {
      if (!mounted) return;
      if (saved && saved.projects.length > 0) {
        setBundle(saved);
        setActiveProjectId(saved.projects[0].id);
      } else {
        const starter = createStarterBundle('local-guest');
        setBundle(starter);
        saveLocalWorkspace(starter);
      }
      setHydrated(true);
      setLoadingWorkspace(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist locally whenever bundle updates (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveLocalWorkspace(bundle);
  }, [bundle, hydrated]);

  const createProject = useCallback(
    async (input: {
      title: string;
      logline: string;
      genre: string;
      format: Project['format'];
      author: string;
      structureType: Project['structureType'];
    }) => {
      const ownerId = 'local-guest';
      const id = cleanId(`proj_${Date.now()}`);
      const scriptId = cleanId(`scr_${Date.now()}`);
      const newProject: Project = {
        id,
        ownerId,
        title: input.title.slice(0, 160) || 'Novo Roteiro',
        logline: input.logline.slice(0, 1200),
        genre: input.genre.slice(0, 80),
        format: input.format,
        author: input.author.slice(0, 120),
        structureType: input.structureType,
        sceneCount: 1,
        pageCount: 1,
      };
      const firstScript: ScriptDocument = {
        id: scriptId,
        projectId: id,
        ownerId,
        title: 'Roteiro Principal',
        episodeNumber: 1,
        synopsis: input.logline.slice(0, 2000),
        blocks: [
          { id: `blk_${Date.now()}_1`, type: 'scene_heading', content: 'EXT. LOCAÇÃO INICIAL - DIA' },
          { id: `blk_${Date.now()}_2`, type: 'action', content: 'Descreva a ação de abertura aqui.' },
        ],
      };

      setBundle((prev) => ({
        ...prev,
        projects: [newProject, ...prev.projects],
        scripts: { ...prev.scripts, [id]: [firstScript] },
        frames: { ...prev.frames, [id]: [] },
        beats: { ...prev.beats, [id]: [] },
        characters: { ...prev.characters, [id]: [] },
        assets: { ...prev.assets, [id]: [] },
        chatMessages: { ...prev.chatMessages, [id]: [] },
      }));
      setActiveProjectId(id);
      return newProject;
    },
    []
  );

  const updateProject = useCallback(
    async (
      projectId: string,
      patch: Partial<
        Pick<
          Project,
          'title' | 'logline' | 'genre' | 'format' | 'author' | 'structureType' | 'sceneCount' | 'pageCount'
        >
      >
    ) => {
      setBundle((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
      }));
    },
    []
  );

  const saveScript = useCallback(async (projectId: string, script: ScriptDocument, _isNew = false) => {
    const safeScript: ScriptDocument = {
      id: cleanId(script.id),
      projectId,
      ownerId: 'local-guest',
      title: (script.title || 'Roteiro').slice(0, 160),
      episodeNumber: Math.max(1, Math.min(999, Math.round(script.episodeNumber || 1))),
      synopsis: (script.synopsis || '').slice(0, 2000),
      blocks: (script.blocks || []).slice(0, 500).map((b) => ({
        id: b.id || `blk_${Math.random().toString(36).slice(2, 8)}`,
        type: b.type || 'action',
        content: (b.content || '').slice(0, 4000),
      })),
    };

    setBundle((prev) => {
      const current = prev.scripts[projectId] || [];
      const exists = current.some((s) => s.id === safeScript.id);
      return {
        ...prev,
        scripts: {
          ...prev.scripts,
          [projectId]: exists ? current.map((s) => (s.id === safeScript.id ? safeScript : s)) : [...current, safeScript],
        },
      };
    });

    return safeScript;
  }, []);

  const deleteScript = useCallback(async (projectId: string, scriptId: string) => {
    setBundle((prev) => ({
      ...prev,
      scripts: {
        ...prev.scripts,
        [projectId]: (prev.scripts[projectId] || []).filter((s) => s.id !== scriptId),
      },
    }));
  }, []);

  const saveFrame = useCallback(async (projectId: string, frame: StoryboardFrame) => {
    const safeFrame: StoryboardFrame = {
      id: cleanId(frame.id),
      projectId,
      ownerId: 'local-guest',
      order: Math.max(0, Math.min(5000, Math.round(frame.order))),
      sceneTitle: (frame.sceneTitle || '').slice(0, 200),
      shotSize: (frame.shotSize || 'Plano Médio').slice(0, 60),
      cameraMovement: (frame.cameraMovement || 'Estática').slice(0, 80),
      lens: (frame.lens || '35mm').slice(0, 40),
      durationSec: Math.max(0, Math.min(3600, Number(frame.durationSec || 5))),
      action: (frame.action || '').slice(0, 2000),
      dialogueCue: (frame.dialogueCue || '').slice(0, 1000),
      audioNotes: (frame.audioNotes || '').slice(0, 1000),
      imageUrl: (frame.imageUrl || '').slice(0, 350000),
      aiAnalysis: (frame.aiAnalysis || '').slice(0, 4000),
    };

    setBundle((prev) => {
      const list = prev.frames[projectId] || [];
      const exists = list.some((f) => f.id === safeFrame.id);
      return {
        ...prev,
        frames: {
          ...prev.frames,
          [projectId]: exists ? list.map((f) => (f.id === safeFrame.id ? safeFrame : f)) : [...list, safeFrame],
        },
      };
    });
  }, []);

  const deleteFrame = useCallback(async (projectId: string, frameId: string) => {
    setBundle((prev) => ({
      ...prev,
      frames: {
        ...prev.frames,
        [projectId]: (prev.frames[projectId] || []).filter((f) => f.id !== frameId),
      },
    }));
  }, []);

  const saveBeat = useCallback(async (projectId: string, beat: StoryBeat) => {
    const safeBeat: StoryBeat = {
      id: cleanId(beat.id),
      projectId,
      ownerId: 'local-guest',
      order: Math.max(0, Math.min(500, Math.round(beat.order))),
      act: (beat.act || 'Ato I').slice(0, 60),
      title: (beat.title || 'Novo Beat').slice(0, 160),
      summary: (beat.summary || '').slice(0, 2000),
      emotionalArc: (beat.emotionalArc || '').slice(0, 120),
      linkedScene: (beat.linkedScene || '').slice(0, 160),
    };

    setBundle((prev) => {
      const list = prev.beats[projectId] || [];
      const exists = list.some((b) => b.id === safeBeat.id);
      return {
        ...prev,
        beats: {
          ...prev.beats,
          [projectId]: exists ? list.map((b) => (b.id === safeBeat.id ? safeBeat : b)) : [...list, safeBeat],
        },
      };
    });
  }, []);

  const deleteBeat = useCallback(async (projectId: string, beatId: string) => {
    setBundle((prev) => ({
      ...prev,
      beats: {
        ...prev.beats,
        [projectId]: (prev.beats[projectId] || []).filter((b) => b.id !== beatId),
      },
    }));
  }, []);

  const saveCharacter = useCallback(async (projectId: string, char: CharacterProfile) => {
    const safeChar: CharacterProfile = {
      id: cleanId(char.id),
      projectId,
      ownerId: 'local-guest',
      name: (char.name || 'PERSONAGEM').slice(0, 100),
      role: (char.role || 'Coadjuvante').slice(0, 80),
      archetype: (char.archetype || '').slice(0, 80),
      motivation: (char.motivation || '').slice(0, 1000),
      flaw: (char.flaw || '').slice(0, 1000),
      arc: (char.arc || '').slice(0, 1500),
      voiceName: char.voiceName || 'Kore',
      voiceStyle: (char.voiceStyle || '').slice(0, 240),
      imageUrl: (char.imageUrl || '').slice(0, 350000),
    };

    setBundle((prev) => {
      const list = prev.characters[projectId] || [];
      const exists = list.some((c) => c.id === safeChar.id);
      return {
        ...prev,
        characters: {
          ...prev.characters,
          [projectId]: exists ? list.map((c) => (c.id === safeChar.id ? safeChar : c)) : [...list, safeChar],
        },
      };
    });
  }, []);

  const deleteCharacter = useCallback(async (projectId: string, charId: string) => {
    setBundle((prev) => ({
      ...prev,
      characters: {
        ...prev.characters,
        [projectId]: (prev.characters[projectId] || []).filter((c) => c.id !== charId),
      },
    }));
  }, []);

  const saveAsset = useCallback(async (projectId: string, asset: ImportedAsset) => {
    const safeAsset: ImportedAsset = {
      id: cleanId(asset.id),
      projectId,
      ownerId: 'local-guest',
      fileName: (asset.fileName || 'arquivo').slice(0, 260),
      mimeType: (asset.mimeType || 'application/octet-stream').slice(0, 120),
      fileSize: Math.max(0, Math.round(asset.fileSize || 0)),
      mediaKind: asset.mediaKind || 'other',
      category: (asset.category || 'Material Bruto').slice(0, 80),
      tags: (asset.tags || []).slice(0, 20).map((t) => String(t).slice(0, 40)),
      summary: (asset.summary || '').slice(0, 4000),
      transcription: (asset.transcription || '').slice(0, 120000),
      extractedText: (asset.extractedText || '').slice(0, 120000),
      aiAnalysis: (asset.aiAnalysis || '').slice(0, 12000),
    };

    setBundle((prev) => {
      const list = prev.assets[projectId] || [];
      const exists = list.some((a) => a.id === safeAsset.id);
      return {
        ...prev,
        assets: {
          ...prev.assets,
          [projectId]: exists ? list.map((a) => (a.id === safeAsset.id ? safeAsset : a)) : [safeAsset, ...list],
        },
      };
    });
  }, []);

  const deleteAsset = useCallback(async (projectId: string, assetId: string) => {
    setBundle((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [projectId]: (prev.assets[projectId] || []).filter((a) => a.id !== assetId),
      },
    }));
  }, []);

  const addChatMessage = useCallback(async (projectId: string, msg: ChatMessage) => {
    const safeMsg: ChatMessage = {
      id: cleanId(msg.id),
      projectId,
      ownerId: 'local-guest',
      role: msg.role,
      persona: (msg.persona || 'showrunner').slice(0, 80),
      modelUsed: (msg.modelUsed || 'gemini-4-hydrogen').slice(0, 80),
      content: (msg.content || '...').slice(0, 40000),
    };

    setBundle((prev) => ({
      ...prev,
      chatMessages: {
        ...prev.chatMessages,
        [projectId]: [...(prev.chatMessages[projectId] || []), safeMsg],
      },
    }));
  }, []);

  return {
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
  };
}
