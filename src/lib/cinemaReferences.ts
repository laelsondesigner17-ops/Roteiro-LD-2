import godfatherImg from '../assets/images/film_ref_godfather_chiaroscuro_1794514455351.jpg';
import bladeRunnerImg from '../assets/images/film_ref_bladerunner_silhouette_1794514455826.jpg';
import spaceSymmetryImg from '../assets/images/film_ref_space_symmetry_1794514456251.jpg';
import madMaxImg from '../assets/images/film_ref_madmax_tracking_1794514457249.jpg';
import cityOfGodImg from '../assets/images/film_ref_cityofgod_closeup_1794514457761.jpg';
import parasiteImg from '../assets/images/film_ref_parasite_architecture_1794514457477.jpg';
import vertigoImg from '../assets/images/film_ref_vertigo_stairs_1794514457251.jpg';
import cinemaDetailImg from '../assets/images/film_ref_cinema_detail_1794514458503.jpg';
import lighthouseExtImg from '../assets/images/storyboard_frame_exterior_1794512246147.jpg';
import radioIntImg from '../assets/images/storyboard_frame_interior_1794512246057.jpg';
import climaxImg from '../assets/images/storyboard_frame_climax_1794512247279.jpg';

export interface FilmStillReference {
  id: string;
  title: string;
  filmReference: string;
  category: 'Drama & Noir' | 'Ficção Científica' | 'Suspense' | 'Ação' | 'Detalhes & Inserts';
  shotSize: string;
  cameraMovement: string;
  lens: string;
  lightingNote: string;
  sceneUsage: string;
  imageUrl: string;
}

export interface ShotTypeExample {
  id: string;
  label: string;
  insertText: string;
  framingNote: string;
  description: string;
  imageUrl: string;
  objectPosition?: string;
}

export interface TransitionTypeExample {
  id: string;
  label: string;
  insertText: string;
  description: string;
  visualStyle: 'cut' | 'fade_in' | 'fade_out' | 'dissolve' | 'smash' | 'match' | 'wipe' | 'iris' | 'audio_bridge';
  fromImage: string;
  toImage: string;
}

export const FILM_STILL_BANK: FilmStillReference[] = [
  {
    id: 'ref_godfather',
    title: 'Escritório Chiaroscuro & Persiana',
    filmReference: 'Inspiração: O Poderoso Chefão / Cinema Noir',
    category: 'Drama & Noir',
    shotSize: 'Plano Médio (PM)',
    cameraMovement: 'Estática em tripé',
    lens: '35mm',
    lightingNote: 'Luz quente pontual de abajur contra sombras marcadas de persiana (alto contraste).',
    sceneUsage: 'Interrogatórios, negociações tensas, decisões de poder em ambiente fechado.',
    imageUrl: godfatherImg,
  },
  {
    id: 'ref_bladerunner',
    title: 'Silhueta na Metrópole Neon',
    filmReference: 'Inspiração: Blade Runner 2049',
    category: 'Ficção Científica',
    shotSize: 'Grande Plano Geral (GPG)',
    cameraMovement: 'Estática em tripé',
    lens: '24mm',
    lightingNote: 'Bruma atmosférica com contraste complementar âmbar e azul noturno sob chuva.',
    sceneUsage: 'Plano de estabelecimento urbano, solidão do protagonista diante da cidade.',
    imageUrl: bladeRunnerImg,
  },
  {
    id: 'ref_space_symmetry',
    title: 'Corredor de Simetria Central',
    filmReference: 'Inspiração: 2001 — Uma Odisseia no Espaço',
    category: 'Ficção Científica',
    shotSize: 'Plano Geral (PG)',
    cameraMovement: 'Travelling / Dolly',
    lens: '18mm',
    lightingNote: 'Luz branca clínica difusa em painéis geométricos com ponto de fuga vermelho.',
    sceneUsage: 'Jornada espacial, sensação de controle tecnológico ou tensão silenciosa.',
    imageUrl: spaceSymmetryImg,
  },
  {
    id: 'ref_madmax',
    title: 'Perseguição no Deserto em Alta Energia',
    filmReference: 'Inspiração: Mad Max — Estrada da Fúria',
    category: 'Ação',
    shotSize: 'Plano Conjunto (PC)',
    cameraMovement: 'Travelling / Dolly',
    lens: '28mm',
    lightingNote: 'Sol alto saturado em ocre/laranja com poeira suspensa criando profundidade.',
    sceneUsage: 'Fugas motorizadas, perseguições em campo aberto e clímax de ação.',
    imageUrl: madMaxImg,
  },
  {
    id: 'ref_cityofgod',
    title: 'Retrato Expressivo na Hora Dourada',
    filmReference: 'Inspiração: Cidade de Deus / Realismo Brasileiro',
    category: 'Drama & Noir',
    shotSize: 'Close-up (CU)',
    cameraMovement: 'Câmera na Mão',
    lens: '85mm',
    lightingNote: 'Contraluz dourado de fim de tarde com fundo urbano em desfoque suave.',
    sceneUsage: 'Virada emocional do personagem, dilema íntimo em comunidade ou rua viva.',
    imageUrl: cityOfGodImg,
  },
  {
    id: 'ref_parasite',
    title: 'Profundidade de Campo Arquitetônica',
    filmReference: 'Inspiração: Parasita',
    category: 'Suspense',
    shotSize: 'Plano Conjunto (PC)',
    cameraMovement: 'Panorâmica (Pan)',
    lens: '35mm',
    lightingNote: 'Hora azul fria contrastando com interiores mornos e linhas arquitetônicas rígidas.',
    sceneUsage: 'Separação social entre personagens no mesmo quadro, vigilância discreta.',
    imageUrl: parasiteImg,
  },
  {
    id: 'ref_vertigo',
    title: 'Escadaria em Plongée Vertiginoso',
    filmReference: 'Inspiração: Um Corpo que Cai (Vertigo)',
    category: 'Suspense',
    shotSize: 'Vista Aérea / Drone',
    cameraMovement: 'Tilt (Vertical)',
    lens: '24mm',
    lightingNote: 'Luz fria superior recortando degraus em espiral com sombras dramáticas.',
    sceneUsage: 'Perseguição em altura, vertigem psicológica, queda iminente ou fuga.',
    imageUrl: vertigoImg,
  },
  {
    id: 'ref_detail',
    title: 'Relógio de Bolso & Carta (Insert)',
    filmReference: 'Inspiração: Drama de Época & Mistério',
    category: 'Detalhes & Inserts',
    shotSize: 'Plano Detalhe (PD)',
    cameraMovement: 'Estática em tripé',
    lens: '100mm',
    lightingNote: 'Tungstênio intimista sobre mesa molhada pela chuva com bokeh quente.',
    sceneUsage: 'Pista narrativa silenciosa, contagem de tempo, revelação de texto sem fala.',
    imageUrl: cinemaDetailImg,
  },
  {
    id: 'ref_lighthouse_ext',
    title: 'Farol Isolado na Tempestade',
    filmReference: 'Inspiração: O Farol / Suspense Costeiro',
    category: 'Suspense',
    shotSize: 'Grande Plano Geral (GPG)',
    cameraMovement: 'Grua / Drone',
    lens: '24mm',
    lightingNote: 'Crepúsculo frio com feixe de luz quente atravessando neblina densa.',
    sceneUsage: 'Abertura atmosférica de isolamento, chegada a locação remota.',
    imageUrl: lighthouseExtImg,
  },
  {
    id: 'ref_radio_int',
    title: 'Cabine de Rádio Noturna',
    filmReference: 'Inspiração: Contato / Thriller de Transmissão',
    category: 'Suspense',
    shotSize: 'Plano Médio (PM)',
    cameraMovement: 'Travelling / Dolly',
    lens: '35mm',
    lightingNote: 'Luz prática dos medidores do equipamento iluminando o rosto do operador.',
    sceneUsage: 'Descoberta de sinal misterioso, investigação solitária à noite.',
    imageUrl: radioIntImg,
  },
  {
    id: 'ref_climax',
    title: 'Confronto sob Luz Dramática',
    filmReference: 'Inspiração: Cinema de Suspense Moderno',
    category: 'Drama & Noir',
    shotSize: 'Primeiro Plano (PP)',
    cameraMovement: 'Steadicam / Seguimento',
    lens: '50mm',
    lightingNote: 'Recorte lateral dramático separando o personagem da penumbra.',
    sceneUsage: 'Momento de decisão no clímax, confronto cara a cara.',
    imageUrl: climaxImg,
  },
];

export const SHOT_TYPE_EXAMPLES: ShotTypeExample[] = [
  {
    id: 'gpg',
    label: 'Grande Plano Geral (GPG)',
    insertText: 'GRANDE PLANO GERAL — ',
    framingNote: 'Paisagem domina · Escala épica',
    description: 'Mostra todo o ambiente ou cidade e situa o espectador no espaço.',
    imageUrl: bladeRunnerImg,
  },
  {
    id: 'pg',
    label: 'Plano Geral (PG)',
    insertText: 'PLANO GERAL — ',
    framingNote: 'Cenário completo + sujeito',
    description: 'Exibe o cenário inteiro e a posição clara dos personagens na cena.',
    imageUrl: spaceSymmetryImg,
  },
  {
    id: 'pc',
    label: 'Plano Conjunto (PC)',
    insertText: 'PLANO CONJUNTO — ',
    framingNote: 'Grupo ou ação ampla',
    description: 'Enquadra dois ou mais personagens interagindo no ambiente.',
    imageUrl: parasiteImg,
  },
  {
    id: 'pa',
    label: 'Plano Americano (PA)',
    insertText: 'PLANO AMERICANO — ',
    framingNote: 'Acima do joelho até a cabeça',
    description: 'Clássico de ação e diálogo em pé, valorizando postura e mãos.',
    imageUrl: madMaxImg,
  },
  {
    id: 'pm',
    label: 'Plano Médio (PM)',
    insertText: 'PLANO MÉDIO — ',
    framingNote: 'Da cintura para cima',
    description: 'Equilibra expressão corporal, mãos sobre a mesa e rosto.',
    imageUrl: godfatherImg,
  },
  {
    id: 'pp',
    label: 'Primeiro Plano (PP)',
    insertText: 'PRIMEIRO PLANO — ',
    framingNote: 'Do peito até a cabeça',
    description: 'Aproxima o drama e destaca intenção e reação em diálogos.',
    imageUrl: climaxImg,
  },
  {
    id: 'cu',
    label: 'Close-up (CU)',
    insertText: 'CLOSE-UP — ',
    framingNote: 'Rosto preenche o quadro',
    description: 'Foco total na emoção, olhar e microexpressões do personagem.',
    imageUrl: cityOfGodImg,
  },
  {
    id: 'pd',
    label: 'Plano Detalhe (PD)',
    insertText: 'PLANO DETALHE — ',
    framingNote: 'Objeto ou pista isolada',
    description: 'Destaca um objeto crucial (relógio, carta, chave, arma, tela).',
    imageUrl: cinemaDetailImg,
  },
  {
    id: 'plongee',
    label: 'Plongée (Vista de Cima)',
    insertText: 'PLANO EM PLONGÉE — ',
    framingNote: 'Câmera de cima para baixo',
    description: 'Transmite vulnerabilidade, vertigem ou vigilância sobre a cena.',
    imageUrl: vertigoImg,
  },
  {
    id: 'contraplongee',
    label: 'Contra-Plongée',
    insertText: 'CONTRA-PLONGÉE — ',
    framingNote: 'Câmera de baixo para cima',
    description: 'Engrandece o personagem ou veículo, transmitindo força e imponência.',
    imageUrl: lighthouseExtImg,
  },
];

export const TRANSITION_TYPE_EXAMPLES: TransitionTypeExample[] = [
  {
    id: 'cut',
    label: 'Corte Seco (CUT TO:)',
    insertText: 'CUT TO:',
    description: 'Mudança instantânea de um plano ou cena para outro. Ritmo direto e ágil.',
    visualStyle: 'cut',
    fromImage: godfatherImg,
    toImage: cinemaDetailImg,
  },
  {
    id: 'fade_in',
    label: 'Abertura em Preto (FADE IN:)',
    insertText: 'FADE IN:',
    description: 'A tela preta se ilumina gradualmente revelando a primeira imagem do filme.',
    visualStyle: 'fade_in',
    fromImage: bladeRunnerImg,
    toImage: bladeRunnerImg,
  },
  {
    id: 'fade_out',
    label: 'Escurecimento (FADE OUT.)',
    insertText: 'FADE OUT.',
    description: 'A imagem escurece até o preto total para encerrar um ato ou o roteiro.',
    visualStyle: 'fade_out',
    fromImage: lighthouseExtImg,
    toImage: lighthouseExtImg,
  },
  {
    id: 'dissolve',
    label: 'Fusão (DISSOLVE TO:)',
    insertText: 'DISSOLVE TO:',
    description: 'Uma imagem desaparece suavemente enquanto a próxima surge por cima (passagem de tempo).',
    visualStyle: 'dissolve',
    fromImage: cityOfGodImg,
    toImage: bladeRunnerImg,
  },
  {
    id: 'match_cut',
    label: 'Corte de Rima (MATCH CUT TO:)',
    insertText: 'MATCH CUT TO:',
    description: 'Conecta dois planos por semelhança visual de forma, movimento ou objeto.',
    visualStyle: 'match',
    fromImage: vertigoImg,
    toImage: spaceSymmetryImg,
  },
  {
    id: 'smash_cut',
    label: 'Corte Brusco (SMASH CUT TO:)',
    insertText: 'SMASH CUT TO:',
    description: 'Corte abrupto de grande contraste (ex: silêncio total para explosão ou grito).',
    visualStyle: 'smash',
    fromImage: radioIntImg,
    toImage: madMaxImg,
  },
  {
    id: 'wipe',
    label: 'Varredura (WIPE TO:)',
    insertText: 'WIPE TO:',
    description: 'A nova cena empurra ou varre a anterior pela lateral da tela.',
    visualStyle: 'wipe',
    fromImage: parasiteImg,
    toImage: madMaxImg,
  },
  {
    id: 'iris',
    label: 'Íris (IRIS OUT:)',
    insertText: 'IRIS OUT:',
    description: 'Círculo de foco fecha sobre um detalhe ou personagem, estilo clássico/homenagem.',
    visualStyle: 'iris',
    fromImage: godfatherImg,
    toImage: godfatherImg,
  },
  {
    id: 'audio_bridge',
    label: 'Ponte Sonora (J-CUT / L-CUT)',
    insertText: 'J-CUT (ÁUDIO ANTECIPA A CENA):',
    description: 'O som da próxima cena entra antes da imagem (J-Cut) ou continua após o corte (L-Cut).',
    visualStyle: 'audio_bridge',
    fromImage: cinemaDetailImg,
    toImage: climaxImg,
  },
];
