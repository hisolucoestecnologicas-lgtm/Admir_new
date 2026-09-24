import { MediaAsset, AIClusterGroup } from '../types';
import { withAIRetry, getSharedGenAI, GEMINI_MODEL } from './aiUtils';

export interface SingleImageAnalysisResult {
  description: string;
  suggestedTitle: string;
  tags: string[];
  sceneType: 'ceremony' | 'meeting' | 'conference' | 'award' | 'institutional_visit' | 'portrait' | 'group_photo' | 'document' | 'outdoor' | 'other';
  probableEventType: string;
  visibleText: string;
  visualContext: string;
  confidence: number;
}

export async function analyzeImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<SingleImageAnalysisResult> {
  const ai = getSharedGenAI();
  if (!ai) {
    return {
      description: `Fotografia institucional "${filename}" cadastrada no acervo.`,
      suggestedTitle: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      tags: ['institucional', 'admir', 'fotografia'],
      sceneType: 'other',
      probableEventType: 'Acervo Institucional',
      visibleText: '',
      visualContext: 'Sem análise remota do Gemini (Chave API não configurada).',
      confidence: 0.5,
    };
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const prompt = `Analise esta fotografia diplomática/humanitária da ADMIR (American Diplomatic Mission of International Relations) e retorne estritamente um JSON no seguinte formato:
{
  "description": "Descrição detalhada em português do Brasil da cena, atividade humanitária/diplomática e elementos visuais",
  "suggestedTitle": "Título conciso e formal para a foto",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "sceneType": "ceremony|meeting|conference|award|institutional_visit|portrait|group_photo|document|outdoor|other",
  "probableEventType": "Nome provável do evento ou missão (ex: Assembleia Geral, Missão de Paz, Entrega de Insumos, Reunião Bilateral)",
  "visibleText": "Texto legível extraído de banners, placas, credenciais, logotipos ou certificados visíveis na foto",
  "visualContext": "Resumo de elementos chave: cores do ambiente, presença de bandeiras, trajes, pódio, palco ou cenografia",
  "confidence": 0.95
}
NÃO invente nomes de pessoas. Foque no contexto institucional, diplomático e humanitário.`;

    const response = await withAIRetry(async () => {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      return result;
    }, 'MediaAnalysis');

    const text = response.text || '';
    const parsed = JSON.parse(text);

    return {
      description: parsed.description || `Fotografia "${filename}"`,
      suggestedTitle: parsed.suggestedTitle || filename,
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['admir', 'fotografia'],
      sceneType: parsed.sceneType || 'other',
      probableEventType: parsed.probableEventType || 'Acervo Institucional',
      visibleText: parsed.visibleText || '',
      visualContext: parsed.visualContext || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
    };
  } catch (err: any) {
    const errStr = String(err.message || err).toLowerCase();
    const isQuota = errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted') || errStr.includes('free_tier');
    console.error('[GeminiMediaAI] Error analyzing image:', err.message || err);

    if (isQuota) {
      throw err;
    }

    return {
      description: `Fotografia "${filename}" (Análise individual pendente).`,
      suggestedTitle: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      tags: ['admir', 'fotografia'],
      sceneType: 'other',
      probableEventType: 'Acervo Geral',
      visibleText: '',
      visualContext: `Falha temporária ao consultar Gemini: ${err.message || 'Erro desconhecido'}`,
      confidence: 0.4,
    };
  }
}

export async function clusterMediaAssetsWithGemini(assets: MediaAsset[]): Promise<AIClusterGroup[]> {
  if (assets.length === 0) return [];

  const ai = getSharedGenAI();

  // Algorithmic fallback if AI is unavailable or fails
  const fallbackClustering = (): AIClusterGroup[] => {
    const groupsMap = new Map<string, string[]>();
    assets.forEach((a) => {
      const key = a.aiProbableEventType || a.eventName || a.aiSceneType || 'Sessão Fotográfica Geral';
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(a.id);
    });

    const clusters: AIClusterGroup[] = [];
    let idx = 1;
    groupsMap.forEach((mediaIds, keyName) => {
      clusters.push({
        id: `cluster-group-${idx++}`,
        title: keyName,
        suggestedEventType: keyName,
        sceneType: 'mixed',
        confidence: 'MÉDIA',
        description: `Agrupamento automático contendo ${mediaIds.length} fotografias relacionadas a ${keyName}.`,
        mediaIds,
        visibleTexts: [],
        status: 'SUGGESTED',
      });
    });
    return clusters;
  };

  if (!ai) {
    return fallbackClustering();
  }

  try {
    const mediaSummaries = assets.map((a) => ({
      id: a.id,
      title: a.title || a.originalName,
      sceneType: a.aiSceneType || 'other',
      probableEvent: a.aiProbableEventType || a.eventName || '',
      tags: a.aiTags || a.tags || [],
      visibleText: a.aiVisibleText || '',
      description: a.aiDescription || '',
      createdAt: a.createdAt,
    }));

    const prompt = `Analise o seguinte conjunto de ${mediaSummaries.length} metadados de fotografias institucionais da ADMIR e agrupe-as em eventos/álbuns lógicos com base na proximidade temática, cenário, textos visíveis (banners/placas) e tipo de evento.

Retorne estritamente um JSON com a chave "clusters" contendo um array de objetos:
{
  "clusters": [
    {
      "id": "cluster-01",
      "title": "Nome do Evento/Álbum Sugerido (ex: Cúpula Humanitária de Genebra 2026)",
      "suggestedEventType": "Tipo do evento (ex: Cerimônia Oficial, Missão de Campo, Reunião Diplomática)",
      "sceneType": "Tipo de cena predominante (ex: ceremony, meeting, outdoor, portrait)",
      "confidence": "ALTA" | "MÉDIA" | "BAIXA",
      "description": "Breve justificativa do agrupamento",
      "mediaIds": ["id1", "id2", ...],
      "visibleTexts": ["Banners ou textos em comum"]
    }
  ]
}

Resumo dos Ativos:
${JSON.stringify(mediaSummaries, null, 2)}`;

    const response = await withAIRetry(async () => {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        },
      });
      return result;
    }, 'MediaClustering');

    const text = response.text || '';
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed.clusters) && parsed.clusters.length > 0) {
      return parsed.clusters.map((c: any, index: number) => ({
        id: c.id || `cluster-${index + 1}`,
        title: c.title || `Grupo de Mídias ${index + 1}`,
        suggestedEventType: c.suggestedEventType || 'Evento Institucional',
        sceneType: c.sceneType || 'other',
        confidence: c.confidence || 'ALTA',
        description: c.description || 'Agrupamento gerado por IA Gemini',
        mediaIds: Array.isArray(c.mediaIds) ? c.mediaIds : [],
        visibleTexts: Array.isArray(c.visibleTexts) ? c.visibleTexts : [],
        status: 'SUGGESTED',
      }));
    }

    return fallbackClustering();
  } catch (err) {
    console.error('[GeminiClusterAI] Error clustering assets:', err);
    return fallbackClustering();
  }
}
