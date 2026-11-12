export type ScreenplayBlockType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'shot';

export interface ScreenplayBlock {
  id: string;
  type: ScreenplayBlockType;
  content: string;
}

export type ProjectFormat = 'longa' | 'curta' | 'serie' | 'documentario' | 'comercial' | 'youtube';
export type StructureType = 'three_act' | 'heros_journey' | 'save_the_cat' | 'story_circle';
export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
export type MediaKind = 'video' | 'audio' | 'document' | 'image' | 'other';

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  logline: string;
  genre: string;
  format: ProjectFormat;
  author: string;
  structureType: StructureType;
  sceneCount: number;
  pageCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ScriptDocument {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  episodeNumber: number;
  synopsis: string;
  blocks: ScreenplayBlock[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StoryboardFrame {
  id: string;
  projectId: string;
  ownerId: string;
  order: number;
  sceneTitle: string;
  shotSize: string;
  cameraMovement: string;
  lens: string;
  durationSec: number;
  action: string;
  dialogueCue: string;
  audioNotes: string;
  imageUrl?: string;
  aiAnalysis?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StoryBeat {
  id: string;
  projectId: string;
  ownerId: string;
  order: number;
  act: string;
  title: string;
  summary: string;
  emotionalArc: string;
  linkedScene: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CharacterProfile {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  role: string;
  archetype: string;
  motivation: string;
  flaw: string;
  arc: string;
  voiceName: VoiceName;
  voiceStyle: string;
  imageUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ImportedAsset {
  id: string;
  projectId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  mediaKind: MediaKind;
  category: string;
  tags: string[];
  summary: string;
  transcription: string;
  extractedText: string;
  aiAnalysis: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  ownerId: string;
  role: 'user' | 'assistant';
  persona?: string;
  modelUsed?: string;
  content: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type WorkspaceTab = 'screenplay' | 'storyboard' | 'storytelling' | 'media' | 'export';

export const BLOCK_LABELS: Record<ScreenplayBlockType, string> = {
  scene_heading: 'Cabeçalho de Cena',
  action: 'Ação / Descrição',
  character: 'Personagem',
  parenthetical: 'Rubrica (Parênteses)',
  dialogue: 'Diálogo',
  transition: 'Transição',
  shot: 'Plano / Câmera',
};

export const FORMAT_LABELS: Record<ProjectFormat, string> = {
  longa: 'Longa-metragem',
  curta: 'Curta-metragem',
  serie: 'Série / Episódio',
  documentario: 'Documentário',
  comercial: 'Comercial / Campanha',
  youtube: 'Vídeo Digital / YouTube',
};

export const STRUCTURE_TEMPLATES: Record<
  StructureType,
  { label: string; beats: Array<{ act: string; title: string; summary: string; emotionalArc: string }> }
> = {
  three_act: {
    label: 'Estrutura em 3 Atos',
    beats: [
      { act: 'Ato I', title: 'Mundo Comum', summary: 'Apresentação do protagonista, rotina e equilíbrio inicial.', emotionalArc: 'Estabilidade / Tensão latente' },
      { act: 'Ato I', title: 'Incidente Incitante', summary: 'O evento que rompe a normalidade e lança a questão central.', emotionalArc: 'Curiosidade / Choque' },
      { act: 'Ato I', title: 'Ponto de Virada I', summary: 'O protagonista cruza o limiar sem volta rumo ao conflito.', emotionalArc: 'Determinação' },
      { act: 'Ato II', title: 'Ponto Médio (Midpoint)', summary: 'Reviravolta central que eleva os riscos de forma irreversível.', emotionalArc: 'Virada de poder' },
      { act: 'Ato II', title: 'Tudo Está Perdido', summary: 'Derrota aparente que força uma transformação interna.', emotionalArc: 'Crise profunda' },
      { act: 'Ato III', title: 'Clímax e Resolução', summary: 'Confronto final decisivo e nova ordem estabelecida.', emotionalArc: 'Catarse' },
    ],
  },
  heros_journey: {
    label: 'Jornada do Herói',
    beats: [
      { act: 'Partida', title: 'Chamado à Aventura', summary: 'Convite ou ameaça que exige ação fora da zona de conforto.', emotionalArc: 'Inquietação' },
      { act: 'Partida', title: 'Encontro com o Mentor', summary: 'Sabedoria, ferramenta ou conselho essencial antes da travessia.', emotionalArc: 'Preparação' },
      { act: 'Iniciação', title: 'Provas, Aliados e Inimigos', summary: 'Testes no novo mundo e formação de vínculos.', emotionalArc: 'Descoberta' },
      { act: 'Iniciação', title: 'Provação Suprema', summary: 'Morte simbólica e renascimento diante do maior medo.', emotionalArc: 'Clímax interno' },
      { act: 'Retorno', title: 'A Estrada de Volta & Elixir', summary: 'Retorno transformado com a lição ou conquista final.', emotionalArc: 'Plenitude' },
    ],
  },
  save_the_cat: {
    label: 'Save the Cat (Beat Sheet)',
    beats: [
      { act: 'Ato I', title: 'Imagem de Abertura & Tema', summary: 'Tom visual inicial e tese moral da história.', emotionalArc: 'Atmosfera' },
      { act: 'Ato I', title: 'Catalisador & Debate', summary: 'Evento disparador seguido pela hesitação do protagonista.', emotionalArc: 'Dúvida' },
      { act: 'Ato II', title: 'Diversão e Jogos', summary: 'Promessa da premissa explorada em cenas icônicas.', emotionalArc: 'Energia crescente' },
      { act: 'Ato II', title: 'Falsas Vitórias / Derrota', summary: 'Subida ilusória ou queda brusca antes da noite escura.', emotionalArc: 'Suspense' },
      { act: 'Ato III', title: 'Finale & Imagem Final', summary: 'Síntese do tema e espelho transformado da abertura.', emotionalArc: 'Resolução' },
    ],
  },
  story_circle: {
    label: 'Círculo Narrativo (8 Etapas)',
    beats: [
      { act: 'Ordem', title: '1. Você (Zona de Conforto)', summary: 'Quem é o personagem no ponto de partida.', emotionalArc: 'Familiaridade' },
      { act: 'Ordem', title: '2. Precisa (Desejo)', summary: 'Algo falta ou precisa ser conquistado.', emotionalArc: 'Anseio' },
      { act: 'Caos', title: '3. Vai (Cruzar Limiar)', summary: 'Entrada numa situação desconhecida.', emotionalArc: 'Apreensão' },
      { act: 'Caos', title: '4. Procura (Adaptação)', summary: 'Tentativas, erros e aprendizado prático.', emotionalArc: 'Tensão' },
      { act: 'Caos', title: '5. Encontra (Objetivo)', summary: 'Consegue o que queria — mas com um custo.', emotionalArc: 'Euforia breve' },
      { act: 'Caos', title: '6. Paga (Consequência)', summary: 'O preço real da escolha é cobrado.', emotionalArc: 'Sacrifício' },
      { act: 'Ordem', title: '7. Retorna & 8. Muda', summary: 'Volta ao mundo original profundamente transformado.', emotionalArc: 'Transformação' },
    ],
  },
};

export const VOICE_OPTIONS: Array<{ name: VoiceName; label: string; tone: string }> = [
  { name: 'Charon', label: 'Charon', tone: 'Grave, cinematográfico e introspectivo' },
  { name: 'Kore', label: 'Kore', tone: 'Natural, expressiva e articulada' },
  { name: 'Puck', label: 'Puck', tone: 'Ágil, energética e juvenil' },
  { name: 'Fenrir', label: 'Fenrir', tone: 'Intensa, dramática e firme' },
  { name: 'Zephyr', label: 'Zephyr', tone: 'Suave, narrativa e poética' },
];
