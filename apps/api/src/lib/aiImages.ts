import fs from 'node:fs/promises';
import path from 'node:path';
import type { Drama } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../prisma.js';
import { serializeDrama } from './drama.js';

export type AiVisualKind = 'poster' | 'hero';

type GenerateOptions = {
  dramaId: string;
  kind: AiVisualKind;
  customPrompt?: string;
};

function ensureOpenAiKey() {
  if (!config.openai.apiKey) {
    throw new Error('未配置 OPENAI_API_KEY，无法调用服务端 AI 生图。可以先运行 npm run generate:demo-assets -- --fallback-only --all --force 批量生成本地 PNG demo 素材。');
  }
}

function uploadUrl(folder: string, filename: string) {
  return `${config.publicBaseUrl.replace(/\/+$/, '')}/uploads/${folder}/${filename}`;
}

function safeFilePart(value: string) {
  return value.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'drama';
}

function buildPrompt(drama: Drama, kind: AiVisualKind, customPrompt?: string) {
  const savedPrompt = kind === 'poster' ? drama.aiPosterPrompt : drama.aiHeroPrompt;
  if (customPrompt?.trim()) return customPrompt.trim();
  if (savedPrompt?.trim()) return savedPrompt.trim();

  const ratioText = kind === 'poster' ? 'vertical 9:16 streaming poster' : 'wide cinematic 16:9 hero background';
  const composition =
    kind === 'poster'
      ? 'central abstract protagonist silhouette, strong title-safe dark lower area, premium vertical short-drama poster'
      : 'right-side large protagonist silhouette, dramatic depth, left side clean dark negative space for title and CTA';

  return [
    `Create an original ${ratioText} for a fictional Chinese short-drama website.`,
    `Drama title: ${drama.title}. Subtitle: ${drama.subtitle || ''}.`,
    `Theme: ${drama.theme}; background: ${drama.background}; category: ${drama.category}; audience: ${drama.audience}.`,
    drama.visualTone ? `Visual tone: ${drama.visualTone}.` : '',
    `Story: ${drama.description.slice(0, 240)}.`,
    composition,
    'Dark immersive entertainment style, orange-red accent glow, cinematic lighting, shallow depth of field.',
    'No real actors, no celebrity likeness, no existing IP, no platform logo, no readable text, no copyrighted material.',
  ]
    .filter(Boolean)
    .join(' ');
}

async function callOpenAiImage(prompt: string, kind: AiVisualKind) {
  ensureOpenAiKey();
  const size = kind === 'poster' ? '1024x1536' : '1536x1024';
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openai.imageModel,
      prompt,
      size,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI 生图失败：${response.status} ${detail.slice(0, 500)}`);
  }

  const json = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, 'base64');

  const imageUrl = json.data?.[0]?.url;
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`图片下载失败：${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error('OpenAI 返回结果中没有图片数据。');
}

export async function generateDramaVisual({ dramaId, kind, customPrompt }: GenerateOptions) {
  const drama = await prisma.drama.findUnique({ where: { id: dramaId } });
  if (!drama) throw new Error('剧目不存在');

  const prompt = buildPrompt(drama, kind, customPrompt);
  const image = await callOpenAiImage(prompt, kind);
  const folder = kind === 'poster' ? 'posters' : 'hero';
  const targetDir = path.join(config.uploadsDir, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${Date.now()}-${safeFilePart(drama.title)}-${kind}.png`;
  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, image);

  const url = uploadUrl(folder, filename);
  const updateData = kind === 'poster' ? { posterUrl: url } : { coverUrl: url };
  const updatedDrama = await prisma.drama.update({
    where: { id: drama.id },
    data: updateData,
    include: { episodes: true },
  });

  return {
    kind,
    url,
    filename,
    prompt,
    drama: serializeDrama(updatedDrama),
  };
}
