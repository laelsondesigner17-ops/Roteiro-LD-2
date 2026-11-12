import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import mammoth from 'mammoth';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const uploadDir = path.join(os.tmpdir(), 'roteiro-ld-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 80 * 1024 * 1024 },
});

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isQuotaOrAuthFallbackError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('403') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('paid') ||
    msg.includes('not found') ||
    msg.includes('404')
  );
}

function formatGeminiError(err: unknown, fallbackMessage: string): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Limite temporário de uso da IA atingido no plano gratuito. Aguarde alguns segundos e tente novamente.',
    };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message: 'Permissão recusada pela API Gemini. Verifique a chave configurada.',
    };
  }
  return { status: 500, message: msg || fallbackMessage };
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  fallbackModel: string,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  try {
    const res = await ai.models.generateContent({
      ...params,
      model: primaryModel,
    });
    return { response: res, modelUsed: primaryModel };
  } catch (err) {
    if (primaryModel !== fallbackModel && isQuotaOrAuthFallbackError(err)) {
      const fallbackConfig = { ...(params.config ?? {}) };
      if (primaryModel === 'gemini-4-carbon' && fallbackModel === 'gemini-4-hydrogen') {
        fallbackConfig.thinkingConfig = { thinkingLevel: 'XHIGH' as ThinkingLevel };
      }
      const res = await ai.models.generateContent({
        ...params,
        model: fallbackModel,
        config: fallbackConfig,
      });
      return { response: res, modelUsed: fallbackModel };
    }
    throw err;
  }
}

function inferMimeType(fileName: string, providedMime: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.fountain': 'text/plain',
    '.fdx': 'application/xml',
    '.srt': 'text/plain',
    '.vtt': 'text/vtt',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  if (map[ext]) return map[ext];
  if (providedMime && providedMime !== 'application/octet-stream') return providedMime;
  return 'application/octet-stream';
}

function classifyMediaKind(mimeType: string, fileName: string): 'video' | 'audio' | 'document' | 'image' | 'other' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  const ext = path.extname(fileName).toLowerCase();
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('wordprocessingml') ||
    mimeType.startsWith('text/') ||
    ['.pdf', '.docx', '.doc', '.txt', '.md', '.fountain', '.fdx', '.srt', '.vtt', '.rtf', '.csv', '.json'].includes(ext)
  ) {
    return 'document';
  }
  return 'other';
}

async function waitForFileActive(ai: GoogleGenAI, fileName: string) {
  for (let i = 0; i < 30; i++) {
    const info = await ai.files.get({ name: fileName });
    if (info.state === 'ACTIVE') return info;
    if (info.state === 'FAILED') {
      throw new Error('O processamento do arquivo de mídia falhou na API Gemini.');
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Tempo limite excedido aguardando processamento do arquivo.');
}

function extractGroundingSources(response: unknown): Array<{ title: string; uri: string }> {
  const resObj = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const chunks = resObj?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const sources: Array<{ title: string; uri: string }> = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        uri,
        title: chunk?.web?.title || uri,
      });
    }
  }
  return sources.slice(0, 8);
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'roteiro-ld-api' });
});

// 1. Universal Media & Document Import + AI Transcription & Auto-Organization
app.post('/api/media/import', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    return;
  }

  let uploadedGeminiFileName: string | null = null;
  try {
    const ai = getAI();
    const originalName = req.body.originalName || file.originalname || 'arquivo';
    const mimeType = inferMimeType(originalName, file.mimetype);
    const mediaKind = classifyMediaKind(mimeType, originalName);

    let transcription = '';
    let extractedText = '';
    let aiAnalysis = '';
    let category = 'Material Bruto';
    let tags: string[] = [];
    let summary = '';

    const ext = path.extname(originalName).toLowerCase();

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: file.path });
      extractedText = result.value.trim();
    } else if (
      mimeType.startsWith('text/') ||
      ['.txt', '.md', '.fountain', '.fdx', '.srt', '.vtt', '.csv', '.json'].includes(ext)
    ) {
      extractedText = fs.readFileSync(file.path, 'utf-8').trim();
    } else if (mediaKind === 'audio') {
      const fileSize = file.size;
      let audioPart: { inlineData: { mimeType: string; data: string } } | { fileData: { fileUri: string; mimeType: string } };
      if (fileSize <= 4 * 1024 * 1024) {
        const b64 = fs.readFileSync(file.path).toString('base64');
        audioPart = { inlineData: { mimeType, data: b64 } };
      } else {
        const uploaded = await ai.files.upload({ file: file.path, config: { mimeType } });
        uploadedGeminiFileName = uploaded.name ?? null;
        const activeFile = uploaded.name ? await waitForFileActive(ai, uploaded.name) : uploaded;
        audioPart = { fileData: { fileUri: activeFile.uri ?? '', mimeType: activeFile.mimeType ?? mimeType } };
      }

      const transRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: 'Transcreva este áudio com máxima precisão. Preserve o idioma falado, identifique mudanças de locutor (ex: Locutor 1, Locutor 2) quando houver e insira marcações temporais aproximadas [MM:SS].',
            },
          ],
        },
      });
      transcription = (transRes.text ?? '').trim();
    } else if (mediaKind === 'video') {
      let videoPart: { inlineData: { mimeType: string; data: string } } | { fileData: { fileUri: string; mimeType: string } };
      if (file.size <= 5 * 1024 * 1024) {
        const b64 = fs.readFileSync(file.path).toString('base64');
        videoPart = { inlineData: { mimeType, data: b64 } };
      } else {
        const uploaded = await ai.files.upload({ file: file.path, config: { mimeType } });
        uploadedGeminiFileName = uploaded.name ?? null;
        const activeFile = uploaded.name ? await waitForFileActive(ai, uploaded.name) : uploaded;
        videoPart = { fileData: { fileUri: activeFile.uri ?? '', mimeType: activeFile.mimeType ?? mimeType } };
      }

      const videoRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            videoPart,
            {
              text: 'Analise este vídeo completo: 1) Transcreva com alta precisão todas as falas e diálogos com timestamps [MM:SS]. 2) Descreva os principais planos visuais, ações, cenários e clima cinematográfico para servir de base para roteiro e storyboard.',
            },
          ],
        },
      });
      const fullOut = (videoRes.text ?? '').trim();
      transcription = fullOut;
      aiAnalysis = fullOut.slice(0, 8000);
    } else if (mimeType === 'application/pdf' || mediaKind === 'image') {
      let docPart: { inlineData: { mimeType: string; data: string } } | { fileData: { fileUri: string; mimeType: string } };
      if (file.size <= 6 * 1024 * 1024) {
        const b64 = fs.readFileSync(file.path).toString('base64');
        docPart = { inlineData: { mimeType, data: b64 } };
      } else {
        const uploaded = await ai.files.upload({ file: file.path, config: { mimeType } });
        uploadedGeminiFileName = uploaded.name ?? null;
        const activeFile = uploaded.name ? await waitForFileActive(ai, uploaded.name) : uploaded;
        docPart = { fileData: { fileUri: activeFile.uri ?? '', mimeType: activeFile.mimeType ?? mimeType } };
      }

      const promptText =
        mediaKind === 'image'
          ? 'Analise esta imagem como Diretor de Fotografia e Roteirista: descreva composição, enquadramento, iluminação, paleta de cores, sujeitos, emoção e sugira como pode virar uma cena de roteiro.'
          : 'Extraia integralmente o texto e a estrutura deste documento PDF, preservando títulos, diálogos e seções importantes.';

      const { response: docRes } = await generateWithModelFallback(
        ai,
        mediaKind === 'image' ? 'gemini-4-argon' : 'gemini-4-hydrogen',
        'gemini-4-hydrogen',
        {
          contents: { parts: [docPart, { text: promptText }] },
        }
      );

      const content = (docRes.text ?? '').trim();
      if (mediaKind === 'image') {
        aiAnalysis = content;
      } else {
        extractedText = content;
      }
    }

    // Automatic AI Organization (Category, Tags, Summary, Creative Angles)
    const sourceCorpus = (transcription || extractedText || aiAnalysis || `Arquivo: ${originalName} (${mimeType})`).slice(0, 28000);
    const orgRes = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Você é o arquivista-chefe de um estúdio de cinema e roteiro (Roteiro LD).
Analise o material importado abaixo e organize-o automaticamente.
Nome do arquivo: ${originalName}
Tipo de mídia: ${mediaKind} (${mimeType})
Conteúdo extraído/transcrito:
${sourceCorpus}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Categoria editorial curta em português (ex: Entrevista / Áudio, Roteiro Base, Referência Visual, Pesquisa & Documento, Cena Bruta, Trilha & Som).',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Até 6 palavras-chave úteis para busca (personagens, locais, temas).',
            },
            summary: {
              type: Type.STRING,
              description: 'Resumo executivo objetivo em 2-4 frases em português.',
            },
            creativeInsights: {
              type: Type.STRING,
              description: 'Sugestões práticas de como explorar este material em roteiro, storyboard ou storytelling.',
            },
          },
        },
      },
    });

    try {
      const parsed = JSON.parse((orgRes.text ?? '{}').trim());
      category = parsed.category || category;
      tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
      summary = parsed.summary || '';
      if (!aiAnalysis && parsed.creativeInsights) {
        aiAnalysis = parsed.creativeInsights;
      } else if (parsed.creativeInsights) {
        aiAnalysis = `${aiAnalysis}\n\nPotencial Narrativo:\n${parsed.creativeInsights}`;
      }
    } catch {
      summary = (orgRes.text ?? '').slice(0, 1200);
    }

    res.json({
      fileName: originalName,
      mimeType,
      fileSize: file.size,
      mediaKind,
      category: category.slice(0, 80),
      tags,
      summary: summary.slice(0, 4000),
      transcription: transcription.slice(0, 115000),
      extractedText: extractedText.slice(0, 115000),
      aiAnalysis: aiAnalysis.slice(0, 11500),
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao processar arquivo importado.',
    });
  } finally {
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch {
      // ignore cleanup
    }
    if (uploadedGeminiFileName) {
      try {
        const ai = getAI();
        await ai.files.delete({ name: uploadedGeminiFileName });
      } catch {
        // ignore cleanup
      }
    }
  }
});

// 1B. Live Web Research / URL Import with Google Search & URL Context Grounding
app.post('/api/media/import-url', async (req, res) => {
  try {
    const { urlOrTopic } = req.body as { urlOrTopic?: string };
    const input = (urlOrTopic || '').trim();
    if (!input) {
      res.status(400).json({ error: 'Informe uma URL ou tema para pesquisar na internet.' });
      return;
    }

    const ai = getAI();
    const isUrl = /^https?:\/\//i.test(input);
    const tools = isUrl ? [{ urlContext: {} }, { googleSearch: {} }] : [{ googleSearch: {} }];

    const { response: researchRes } = await generateWithModelFallback(
      ai,
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      {
        contents: isUrl
          ? `Acesse e leia o conteúdo da URL ${input}. Extraia todos os fatos relevantes, citações, contexto histórico/técnico, descrições visuais e pontos dramáticos em português para servir de material-fonte a um roteiro.`
          : `Pesquise na internet em fontes confiáveis sobre: "${input}". Compile um dossiê completo para roteiristas e documentaristas em português, incluindo fatos verificados, datas, personagens reais ou arquétipos, detalhes sensoriais/visuais de locação e ganchos narrativos.`,
        config: {
          tools,
        },
      }
    );

    const sources = extractGroundingSources(researchRes);
    const sourcesText =
      sources.length > 0
        ? `\n\nFontes consultadas na web:\n${sources.map((s) => `- ${s.title}: ${s.uri}`).join('\n')}`
        : '';
    const extractedText = `${(researchRes.text ?? '').trim()}${sourcesText}`.trim();

    let title = isUrl ? input.replace(/^https?:\/\//, '').slice(0, 60) : `Pesquisa: ${input.slice(0, 50)}`;
    let category = 'Pesquisa Web';
    let tags: string[] = ['internet', 'pesquisa'];
    let summary = extractedText.slice(0, 400);
    let aiAnalysis = '';

    try {
      const orgRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Organize este material pesquisado da web para o estúdio Roteiro LD.\nConsulta: ${input}\nConteúdo:\n${extractedText.slice(0, 26000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Título curto do dossiê/link (até 60 caracteres).' },
              category: { type: Type.STRING, description: 'Categoria curta (ex: Pesquisa Web, Referência Documental).' },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING, description: 'Resumo objetivo em 2-4 frases.' },
              creativeInsights: { type: Type.STRING, description: 'Como usar esta pesquisa em cenas e diálogos.' },
            },
          },
        },
      });
      const parsed = JSON.parse((orgRes.text ?? '{}').trim());
      if (parsed.title) title = parsed.title;
      if (parsed.category) category = parsed.category;
      if (Array.isArray(parsed.tags) && parsed.tags.length > 0) tags = parsed.tags.slice(0, 6);
      if (parsed.summary) summary = parsed.summary;
      if (parsed.creativeInsights) aiAnalysis = parsed.creativeInsights;
    } catch {
      // keep fallback metadata so grounded research still succeeds on rate limits
    }

    res.json({
      fileName: title.slice(0, 200),
      mimeType: 'text/uri-list',
      fileSize: Buffer.byteLength(extractedText, 'utf-8'),
      mediaKind: 'document',
      category: category.slice(0, 80),
      tags,
      summary: summary.slice(0, 4000),
      transcription: '',
      extractedText: extractedText.slice(0, 115000),
      aiAnalysis: aiAnalysis.slice(0, 11500),
      sources,
    });
  } catch (err) {
    console.error('URL import error:', err);
    const formatted = formatGeminiError(err, 'Erro ao pesquisar ou importar link da web.');
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 2. Synthesize 1 or Multiple Scripts + Storyboard + Beats from Imported Files
app.post('/api/ai/synthesize-scripts', async (req, res) => {
  try {
    const { files, mode, creativePrompt, projectTitle } = req.body as {
      files: Array<{ fileName: string; category: string; summary: string; transcription: string; extractedText: string; aiAnalysis: string }>;
      mode: 'single' | 'multiple' | 'documentary' | 'storyboard_focus';
      creativePrompt?: string;
      projectTitle?: string;
    };

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Selecione pelo menos um arquivo importado para gerar roteiros.' });
      return;
    }

    const ai = getAI();
    const corpus = files
      .map(
        (f, i) =>
          `=== ARQUIVO ${i + 1}: ${f.fileName} (${f.category}) ===\nResumo: ${f.summary}\nConteúdo/Transcrição:\n${(
            f.transcription ||
            f.extractedText ||
            f.aiAnalysis ||
            ''
          ).slice(0, 18000)}`
      )
      .join('\n\n');

    const modeInstruction =
      mode === 'multiple'
        ? 'Crie MÚLTIPLOS roteiros/episódios distintos (entre 2 e 4 episódios ou variações), explorando diferentes ângulos dos arquivos importados.'
        : mode === 'documentary'
          ? 'Crie um roteiro documental estruturado que entrelaça depoimentos transcritos, narração em off e imagens de cobertura (B-roll).'
          : mode === 'storyboard_focus'
            ? 'Crie um roteiro altamente visual com forte detalhamento de planos cinematográficos para storyboard.'
            : 'Crie UM roteiro único e coeso que sintetiza e explora os elementos mais ricos de cada arquivo importado.';

    const { response, modelUsed } = await generateWithModelFallback(
      ai,
      'gemini-4-hydrogen',
      'gemini-4-hydrogen',
      {
        contents: `Projeto: ${projectTitle || 'Novo Projeto'}
Objetivo: ${modeInstruction}
Direção do roteirista: ${creativePrompt || 'Explore o potencial dramático, visual e informativo de cada arquivo mantendo fidelidade às fontes.'}

MATERIAIS IMPORTADOS:
${corpus}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction:
            'Você é um Showrunner e Roteirista Sênior. Gere roteiros profissionais em português no padrão cinematográfico (blocos: scene_heading, action, character, parenthetical, dialogue, transition), além de frames iniciais de storyboard, beats de storytelling e personagens extraídos.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rationale: { type: Type.STRING, description: 'Explicação breve de como cada arquivo foi explorado na criação.' },
              scripts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    episodeNumber: { type: Type.INTEGER },
                    synopsis: { type: Type.STRING },
                    blocks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: {
                            type: Type.STRING,
                            description: 'Um de: scene_heading, action, character, parenthetical, dialogue, transition',
                          },
                          content: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
              },
              frames: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneTitle: { type: Type.STRING },
                    shotSize: { type: Type.STRING },
                    cameraMovement: { type: Type.STRING },
                    lens: { type: Type.STRING },
                    durationSec: { type: Type.NUMBER },
                    action: { type: Type.STRING },
                    dialogueCue: { type: Type.STRING },
                  },
                },
              },
              beats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    act: { type: Type.STRING },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    emotionalArc: { type: Type.STRING },
                  },
                },
              },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    motivation: { type: Type.STRING },
                    voiceName: { type: Type.STRING, description: 'Um de: Puck, Charon, Kore, Fenrir, Zephyr' },
                  },
                },
              },
            },
          },
        },
      }
    );

    const data = JSON.parse((response.text ?? '{}').trim());
    res.json({ ...data, modelUsed });
  } catch (err) {
    console.error('Synthesize error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao sintetizar roteiro.' });
  }
});

// 3. Improve Long Text Structure & Writing Style Suggestions
app.post('/api/ai/improve-text', async (req, res) => {
  try {
    const { text, styleGoal, instructions } = req.body as {
      text: string;
      styleGoal: string;
      instructions?: string;
    };

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Forneça um texto ou cenas para aprimorar.' });
      return;
    }

    const ai = getAI();
    const { response, modelUsed } = await generateWithModelFallback(
      ai,
      'gemini-4-hydrogen',
      'gemini-4-hydrogen',
      {
        contents: `Estilo/Objetivo desejado: ${styleGoal}
Instruções adicionais: ${instructions || 'Melhore a clareza dramática, subtexto nos diálogos, ritmo visual e formatação cinematográfica.'}

TEXTO ORIGINAL:
${text.slice(0, 45000)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction:
            'Você é um Script Doctor premiado. Analise textos longos, identifique gargalos de ritmo/estrutura, proponha sugestões concretas de estilo de escrita e entregue uma versão reestruturada em blocos profissionais de roteiro.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagnosis: { type: Type.STRING, description: 'Diagnóstico estrutural do texto longo (ritmo, clareza, conflito).' },
              styleSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Lista de 3 a 6 sugestões práticas de estilo de escrita e subtexto.',
              },
              improvedBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      }
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ ...parsed, modelUsed });
  } catch (err) {
    console.error('Improve text error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao aprimorar texto.' });
  }
});

// 3B. Continue Screenplay Scene with AI (1-Click Writer's Block Breaker)
app.post('/api/ai/continue-scene', async (req, res) => {
  try {
    const { projectTitle, logline, format, recentBlocks, characterNames } = req.body as {
      projectTitle?: string;
      logline?: string;
      format?: string;
      recentBlocks: Array<{ type: string; content: string }>;
      characterNames?: string[];
    };

    const ai = getAI();
    const contextLines = (recentBlocks || [])
      .slice(-18)
      .map((b) => `[${b.type.toUpperCase()}] ${b.content}`)
      .join('\n');

    const { response } = await generateWithModelFallback(
      ai,
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      {
        contents: `Projeto: ${projectTitle || 'Roteiro'} (${format || 'curta'})
Logline: ${logline || 'Não informada'}
Personagens conhecidos: ${(characterNames || []).join(', ') || 'Definir conforme contexto'}

ÚLTIMOS BLOCOS DO ROTEIRO:
${contextLines || '[SCENE_HEADING] INT. INÍCIO - DIA'}

Escreva os próximos 5 a 8 blocos dando continuidade orgânica, visual e dramática à cena.`,
        config: {
          systemInstruction:
            'Você é um roteirista profissional. Continue a cena mantendo o tom, subtexto e formatação cinematográfica em português (blocos válidos: scene_heading, action, character, parenthetical, dialogue, transition, shot). Não repita os blocos já escritos.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      }
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ blocks: parsed.blocks || [] });
  } catch (err) {
    console.error('Continue scene error:', err);
    const formatted = formatGeminiError(err, 'Erro ao continuar cena.');
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 3C. Break Down Active Screenplay into Storyboard Shots (IA)
app.post('/api/ai/script-to-storyboard', async (req, res) => {
  try {
    const { projectTitle, scriptTitle, blocks } = req.body as {
      projectTitle?: string;
      scriptTitle?: string;
      blocks: Array<{ type: string; content: string }>;
    };

    if (!blocks || blocks.length === 0) {
      res.status(400).json({ error: 'Escreva algumas cenas no roteiro antes de gerar a decupagem.' });
      return;
    }

    const ai = getAI();
    const scriptText = blocks
      .slice(0, 80)
      .map((b) => `[${b.type.toUpperCase()}] ${b.content}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Projeto: ${projectTitle || 'Roteiro'}
Episódio/Roteiro: ${scriptTitle || 'Principal'}

ROTEIRO:
${scriptText}

Crie uma decupagem visual de storyboard com 5 a 8 planos cinematográficos essenciais que cubram as cenas principais.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction:
          'Você é um Diretor de Fotografia sênior. Converta as cenas do roteiro em planos visuais precisos para storyboard em português.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frames: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneTitle: { type: Type.STRING },
                  shotSize: {
                    type: Type.STRING,
                    description: 'Ex: Plano Geral (PG), Plano Médio (PM), Primeiro Plano (PP), Close-up (CU), Detalhe (ECU), Plano Americano (PA)',
                  },
                  cameraMovement: {
                    type: Type.STRING,
                    description: 'Ex: Estática em tripé, Travelling lateral, Dolly-in lento, Câmera na mão, Panorâmica, Drone / Aéreo',
                  },
                  lens: { type: Type.STRING, description: 'Ex: 24mm, 35mm, 50mm, 85mm' },
                  durationSec: { type: Type.NUMBER },
                  action: { type: Type.STRING },
                  dialogueCue: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const frames = parsed.frames || [];
    res.json({ frames, shots: frames });
  } catch (err) {
    console.error('Script to storyboard error:', err);
    const formatted = formatGeminiError(err, 'Erro ao decupar roteiro.');
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 3D. Generate Custom Narrative Beats (with Optional Google Search Grounding)
app.post('/api/ai/generate-beats', async (req, res) => {
  try {
    const { projectTitle, format, genre, logline, structureType, scriptSummary, useWebSearch } = req.body as {
      projectTitle?: string;
      format?: string;
      genre?: string;
      logline?: string;
      structureType?: string;
      scriptSummary?: string;
      useWebSearch?: boolean;
    };

    const ai = getAI();
    let webContext = '';
    if (useWebSearch && (projectTitle || logline)) {
      try {
        const searchRes = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Pesquise brevemente referências reais, fatos ou convenções narrativas que enriqueçam a escaleta de um projeto "${format || 'cinema'}" (${genre || 'drama'}) chamado "${projectTitle || ''}" com premissa: "${logline || ''}".`,
          config: { tools: [{ googleSearch: {} }] },
        });
        webContext = (searchRes.text ?? '').slice(0, 3500);
      } catch {
        // continue without web grounding if search fails
      }
    }

    const { response } = await generateWithModelFallback(
      ai,
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      {
        contents: `Projeto: ${projectTitle || 'Novo Roteiro'}
Formato: ${format || 'curta'} | Gênero: ${genre || 'Drama'}
Estrutura escolhida: ${structureType || 'three_act'}
Logline: ${logline || 'História original a desenvolver'}
Roteiro atual (resumo): ${(scriptSummary || '').slice(0, 4000)}
${webContext ? `Pesquisa web de apoio:\n${webContext}` : ''}

Gere de 5 a 7 beats dramáticos personalizados seguindo exatamente a estrutura "${structureType || 'three_act'}".`,
        config: {
          systemInstruction:
            'Você é um Showrunner especialista em arquitetura narrativa. Gere beats claros, acionáveis e com arco emocional definido em português.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              beats: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    act: { type: Type.STRING },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    emotionalArc: { type: Type.STRING },
                    linkedScene: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      }
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ beats: parsed.beats || [] });
  } catch (err) {
    console.error('Generate beats error:', err);
    const formatted = formatGeminiError(err, 'Erro ao gerar escaleta com IA.');
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// 4. Image Understanding for Storyboard / Reference Photos (gemini-4-argon with fallback)
app.post('/api/ai/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, contextPrompt } = req.body as {
      imageBase64: string;
      mimeType: string;
      contextPrompt?: string;
    };

    if (!imageBase64) {
      res.status(400).json({ error: 'Imagem não fornecida.' });
      return;
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const ai = getAI();

    const { response, modelUsed } = await generateWithModelFallback(
      ai,
      'gemini-4-argon',
      'gemini-4-hydrogen',
      {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `Analise esta imagem como Diretor de Fotografia para Storyboard e Roteiro. ${
                contextPrompt ? `Contexto da cena: ${contextPrompt}` : ''
              }`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sceneHeading: { type: Type.STRING, description: 'Cabeçalho sugerido (ex: EXT. FAROL COSTEIRO - CREPÚSCULO).' },
              shotSize: { type: Type.STRING, description: 'Enquadramento sugerido (ex: Plano Geral, Plano Médio, Close-up).' },
              cameraMovement: { type: Type.STRING, description: 'Movimento de câmera sugerido (ex: Estática, Travelling lento).' },
              lens: { type: Type.STRING, description: 'Lente sugerida (ex: 35mm, 50mm, 85mm).' },
              visualAnalysis: { type: Type.STRING, description: 'Análise de iluminação, paleta, atmosfera e composição em português.' },
              actionDescription: { type: Type.STRING, description: 'Descrição cinematográfica pronta para bloco de Ação no roteiro.' },
            },
          },
        },
      }
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({ ...parsed, modelUsed });
  } catch (err) {
    console.error('Image analysis error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao analisar imagem.' });
  }
});

// 5. Screenplay Text-to-Speech using gemini-3.8-flash-tts
app.post('/api/ai/tts', async (req, res) => {
  try {
    const { mode, text, voiceName, style, dialogueLines } = req.body as {
      mode: 'single' | 'dual';
      text?: string;
      voiceName?: string;
      style?: string;
      dialogueLines?: Array<{ speaker: string; voiceName: string; style?: string; text: string }>;
    };

    const ai = getAI();

    if (mode === 'dual' && Array.isArray(dialogueLines) && dialogueLines.length >= 2) {
      // multiSpeakerVoiceConfig requires exactly 2 speakerVoiceConfigs
      const distinctSpeakers: Array<{ speaker: string; voiceName: string }> = [];
      for (const line of dialogueLines) {
        if (!distinctSpeakers.some((s) => s.speaker === line.speaker)) {
          distinctSpeakers.push({
            speaker: line.speaker,
            voiceName: line.voiceName || (distinctSpeakers.length === 0 ? 'Charon' : 'Kore'),
          });
        }
        if (distinctSpeakers.length === 2) break;
      }
      if (distinctSpeakers.length === 1) {
        distinctSpeakers.push({ speaker: 'Narrador', voiceName: 'Kore' });
      }

      const allowedSpeakerSet = new Set(distinctSpeakers.map((s) => s.speaker));
      const parts = dialogueLines.slice(0, 12).map((line) => {
        const mappedSpeaker = allowedSpeakerSet.has(line.speaker) ? line.speaker : distinctSpeakers[1].speaker;
        return {
          text: `${mappedSpeaker}: ${line.text}`,
          speechMetadata: {
            speaker: mappedSpeaker,
            style: line.style || 'Dramatic cinema voice acting in natural Brazilian Portuguese',
          },
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: distinctSpeakers.map((s) => ({
                speaker: s.speaker,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: s.voiceName },
                },
              })),
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        res.status(500).json({ error: 'Não foi possível gerar áudio para o diálogo.' });
        return;
      }
      res.json({ audioBase64, mimeType: 'audio/wav', modelUsed: 'gemini-3.8-flash-tts' });
      return;
    }

    const singleText = (text || '').trim();
    if (!singleText) {
      res.status(400).json({ error: 'Texto vazio para leitura em voz alta.' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: singleText.slice(0, 4000),
              speechMetadata: {
                style: style || 'Expressive, clear cinematic table-read narration in Portuguese',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      res.status(500).json({ error: 'Não foi possível gerar o áudio TTS.' });
      return;
    }
    res.json({ audioBase64, mimeType: 'audio/wav', modelUsed: 'gemini-3.8-flash-tts' });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro no serviço de voz TTS.' });
  }
});

// 6. Multi-turn Gemini Chatbot with Specialized Director/Writer Roles + Google Search & URL Grounding
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { history, message, persona, modelPreference, projectContext, useWebSearch = true } = req.body as {
      history: Array<{ role: 'user' | 'model'; text: string }>;
      message: string;
      persona: 'showrunner' | 'script_doctor' | 'cinematographer' | 'fast_assistant';
      modelPreference?: 'gemini-4-carbon' | 'gemini-4-argon' | 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
      projectContext?: string;
      useWebSearch?: boolean;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Mensagem vazia.' });
      return;
    }

    const personaSystemPrompts: Record<string, string> = {
      showrunner:
        'Você é um Showrunner e Roteirista Chefe experiente. Ajuda com arcos narrativos, escaletas, viradas de ato, coerência temática e construção de personagens em português.',
      script_doctor:
        'Você é um Script Doctor cirúrgico. Analisa cenas longas, corta gorduras, fortalece subtexto em diálogos e sugere reescritas com tensão dramática.',
      cinematographer:
        'Você é um Diretor de Fotografia e Supervisor de Storyboard. Sugere enquadramentos, lentes, iluminação, bloqueio de câmera e decupagem visual.',
      fast_assistant:
        'Você é um Assistente de Sala de Roteiro ágil e objetivo. Responde rapidamente com sinônimos, nomes, rubricas curtas, loglines e ideias imediatas.',
    };

    const defaultModelMap: Record<string, string> = {
      showrunner: 'gemini-4-carbon',
      script_doctor: 'gemini-4-hydrogen',
      cinematographer: 'gemini-4-argon',
      fast_assistant: 'gemini-3.1-flash-lite',
    };

    const chosenModel = modelPreference || defaultModelMap[persona] || 'gemini-4-hydrogen';
    const hasUrls = /https?:\/\/[^\s]+/i.test(message);
    const systemInstruction = `${personaSystemPrompts[persona] || personaSystemPrompts.showrunner}${
      useWebSearch
        ? '\nVocê tem acesso à internet via Google Search (e leitura de URLs). Sempre que fatos reais, datas, locações, profissões ou links forem relevantes, consulte a web para garantir precisão.'
        : ''
    }\n\nCONTEXTO DO PROJETO ATUAL:\n${(projectContext || 'Nenhum projeto carregado').slice(0, 12000)}`;

    const ai = getAI();

    const formattedHistory = (history || []).slice(-16).map((h) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    const runChatWithModel = async (modelId: string, withTools: boolean) => {
      const chatTools = withTools
        ? hasUrls
          ? [{ googleSearch: {} }, { urlContext: {} }]
          : [{ googleSearch: {} }]
        : undefined;

      const chat = ai.chats.create({
        model: modelId,
        history: formattedHistory,
        config: {
          systemInstruction,
          ...(chatTools ? { tools: chatTools } : {}),
          ...(modelId === 'gemini-4-hydrogen' && chosenModel === 'gemini-4-carbon'
            ? { thinkingConfig: { thinkingLevel: 'XHIGH' as ThinkingLevel } }
            : {}),
        },
      });
      const response = await chat.sendMessage({ message });
      const sources = withTools ? extractGroundingSources(response) : [];
      return { reply: (response.text ?? '').trim(), modelUsed: modelId, sources };
    };

    try {
      const result = await runChatWithModel(chosenModel, Boolean(useWebSearch));
      res.json(result);
    } catch (err) {
      const fallback = chosenModel === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      if (chosenModel !== fallback && isQuotaOrAuthFallbackError(err)) {
        try {
          const result = await runChatWithModel(fallback, Boolean(useWebSearch));
          res.json(result);
          return;
        } catch {
          if (useWebSearch) {
            const resultNoTools = await runChatWithModel(fallback, false);
            res.json(resultNoTools);
            return;
          }
        }
      }
      if (useWebSearch) {
        try {
          const resultNoTools = await runChatWithModel(fallback, false);
          res.json(resultNoTools);
          return;
        } catch {
          // fall through to main error handler
        }
      }
      throw err;
    }
  } catch (err) {
    console.error('Chat error:', err);
    const formatted = formatGeminiError(err, 'Erro ao conversar com o assistente.');
    res.status(formatted.status).json({ error: formatted.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Roteiro LD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
