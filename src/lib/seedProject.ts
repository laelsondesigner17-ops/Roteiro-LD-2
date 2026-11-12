import type { LocalWorkspaceBundle } from './localStore';
import exteriorFrame from '../assets/images/storyboard_frame_exterior_1794512246147.jpg';
import interiorFrame from '../assets/images/storyboard_frame_interior_1794512246057.jpg';
import climaxFrame from '../assets/images/storyboard_frame_climax_1794512247279.jpg';

export function createStarterBundle(ownerId = 'local-guest'): LocalWorkspaceBundle {
  const projectId = 'proj_ultimo_sinal';
  const scriptId = 'scr_ep_01';

  return {
    projects: [
      {
        id: projectId,
        ownerId,
        title: 'O Último Sinal',
        logline:
          'Isolado em um farol atlântico durante uma tempestade solar, um operador de rádio capta uma transmissão vinda de um navio desaparecido há quarenta anos.',
        genre: 'Suspense / Ficção Atmosférica',
        format: 'curta',
        author: 'Estúdio Roteiro LD',
        structureType: 'three_act',
        sceneCount: 3,
        pageCount: 3,
      },
    ],
    scripts: {
      [projectId]: [
        {
          id: scriptId,
          projectId,
          ownerId,
          title: 'Roteiro Principal — Versão Diretor',
          episodeNumber: 1,
          synopsis: 'Abertura atmosférica e descoberta da frequência anômala no farol.',
          blocks: [
            {
              id: 'blk_1',
              type: 'scene_heading',
              content: 'EXT. PENHASCO DO FAROL - CREPÚSCULO',
            },
            {
              id: 'blk_2',
              type: 'action',
              content:
                'Ondas negras explodem contra a rocha basáltica. O farol solitário corta a neblina espessa com um feixe âmbar constante. O vento uiva pelas antenas metálicas.',
            },
            {
              id: 'blk_3',
              type: 'scene_heading',
              content: 'INT. SALA DE RÁDIO DO FAROL - NOITE',
            },
            {
              id: 'blk_4',
              type: 'action',
              content:
                'Chuva escorre pela escotilha circular. Sob a luz quente de uma luminária de latão, ARTHUR (52) ajusta os seletores de bronze de um receptor valvulado. Estática preenche a sala.',
            },
            {
              id: 'blk_5',
              type: 'character',
              content: 'ARTHUR',
            },
            {
              id: 'blk_6',
              type: 'parenthetical',
              content: '(baixinho, ajustando o dial)',
            },
            {
              id: 'blk_7',
              type: 'dialogue',
              content: 'Frequência sete-quatro... ninguém transmite nessa banda desde oitenta e seis.',
            },
            {
              id: 'blk_8',
              type: 'action',
              content:
                'O ponteiro do osciloscópio ganha vida própria em verde fosforescente. Uma voz feminina surge em meio ao ruído branco, límpida demais para a tempestade.',
            },
            {
              id: 'blk_9',
              type: 'character',
              content: 'HELENA (V.O.)',
            },
            {
              id: 'blk_10',
              type: 'dialogue',
              content: 'Farol da Barra... se ainda houver alguém acordado aí em cima, não apague a luz.',
            },
            {
              id: 'blk_11',
              type: 'transition',
              content: 'CORTE PARA:',
            },
          ],
        },
      ],
    },
    frames: {
      [projectId]: [
        {
          id: 'frm_01',
          projectId,
          ownerId,
          order: 1,
          sceneTitle: 'EXT. PENHASCO DO FAROL - CREPÚSCULO',
          shotSize: 'Plano Geral (PG)',
          cameraMovement: 'Drone / Travelling aéreo lento',
          lens: '24mm Anamórfica',
          durationSec: 8,
          action: 'Estabelecimento do farol isolado sob tempestade e feixe dourado cortando a névoa.',
          dialogueCue: 'SFX: Vento forte e rebentação grave do mar.',
          audioNotes: 'Sub-grave contínuo + sirene distante',
          imageUrl: exteriorFrame,
          aiAnalysis: 'Contraste frio/quente (azul ardósia vs feixe âmbar). Composição em regra dos terços reforça isolamento.',
        },
        {
          id: 'frm_02',
          projectId,
          ownerId,
          order: 2,
          sceneTitle: 'INT. SALA DE RÁDIO DO FAROL - NOITE',
          shotSize: 'Plano Médio (PM)',
          cameraMovement: 'Estática em tripé / leve push-in',
          lens: '35mm',
          durationSec: 12,
          action: 'Arthur sintoniza o receptor antigo ao lado da escotilha batida pela chuva.',
          dialogueCue: 'ARTHUR: "Frequência sete-quatro..."',
          audioNotes: 'Estática analógica em crescente + tique de relógio',
          imageUrl: interiorFrame,
          aiAnalysis: 'Iluminação prática de tungstênio cria chiaroscuro íntimo contra o azul frio da escotilha.',
        },
        {
          id: 'frm_03',
          projectId,
          ownerId,
          order: 3,
          sceneTitle: 'INT. SALA DE RÁDIO - DETALHE OSCILOSCÓPIO',
          shotSize: 'Plano Detalhe (PD)',
          cameraMovement: 'Macro estática / foco seletivo',
          lens: '85mm Macro',
          durationSec: 6,
          action: 'Dedo ajusta o potenciômetro enquanto a onda verde do sinal fantasma estabiliza.',
          dialogueCue: 'HELENA (V.O.): "...não apague a luz."',
          audioNotes: 'Voz filtrada por rádio valvulado + clique do gravador de fita',
          imageUrl: climaxFrame,
          aiAnalysis: 'Profundidade de campo rasa isola a forma de onda verde como ponto focal dramático.',
        },
      ],
    },
    beats: {
      [projectId]: [
        {
          id: 'beat_01',
          projectId,
          ownerId,
          order: 1,
          act: 'Ato I',
          title: 'Isolamento Metódico',
          summary: 'Arthur mantém o farol funcionando sozinho, preso a rituais analógicos.',
          emotionalArc: 'Melancolia contida',
          linkedScene: 'EXT. PENHASCO DO FAROL',
        },
        {
          id: 'beat_02',
          projectId,
          ownerId,
          order: 2,
          act: 'Ato I',
          title: 'O Chamado na Frequência Morta',
          summary: 'A tempestade magnética abre uma brecha e a voz de Helena pede socorro.',
          emotionalArc: 'Assombro / Urgência',
          linkedScene: 'INT. SALA DE RÁDIO',
        },
        {
          id: 'beat_03',
          projectId,
          ownerId,
          order: 3,
          act: 'Ato II',
          title: 'Rastreamento em Fita Magnética',
          summary: 'Arthur compara a gravação atual com os diários navais de 1986.',
          emotionalArc: 'Tensão crescente',
          linkedScene: 'INT. SALA DE RÁDIO - DETALHE',
        },
      ],
    },
    characters: {
      [projectId]: [
        {
          id: 'char_arthur',
          projectId,
          ownerId,
          name: 'ARTHUR',
          role: 'Protagonista',
          archetype: 'Guardião Solitário',
          motivation: 'Manter o farol aceso para reparar uma culpa do passado.',
          flaw: 'Incapaz de abandonar o passado ou pedir ajuda.',
          arc: 'De observador passivo a alguém que arrisca tudo para responder ao chamado.',
          voiceName: 'Charon',
          voiceStyle: 'Tom grave, pausado e introspectivo',
          imageUrl: interiorFrame,
        },
        {
          id: 'char_helena',
          projectId,
          ownerId,
          name: 'HELENA',
          role: 'Co-protagonista (Voz)',
          archetype: 'Mensageira do Desconhecido',
          motivation: 'Guiar o navio perdido antes que o sinal desapareça.',
          flaw: 'Presa entre duas temporalidades sem memória completa.',
          arc: 'Da fragilidade no rádio à lucidez salvadora.',
          voiceName: 'Kore',
          voiceStyle: 'Emotiva, urgente, levemente distante',
        },
      ],
    },
    assets: {
      [projectId]: [],
    },
    chatMessages: {
      [projectId]: [],
    },
  };
}
