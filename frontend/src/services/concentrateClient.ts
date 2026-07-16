// ---------------------------------------------------------------------------
// Client-side Concentrate AI fallback.
//
// When the FastAPI backend is unreachable (demo mode, no Docker/Postgres), the
// chat can still answer free-form questions by calling Concentrate AI directly
// from the browser, grounded in the local ROADWATCH mock dataset.
//
// SECURITY: the API key is a NEXT_PUBLIC_ var and therefore ships in the client
// bundle. Acceptable for a hackathon demo key; route through the backend before
// any real deployment.
// ---------------------------------------------------------------------------

import { roads, contractors, projects, authorities } from '@/data/mockData';

const API_ENDPOINT = 'https://api.concentrate.ai/v1/chat/completions';
const API_KEY = process.env.NEXT_PUBLIC_CONCENTRATE_API_KEY ?? '';
const MODEL = process.env.NEXT_PUBLIC_CONCENTRATE_MODEL ?? 'gemini-3.5-flash';

export function isConcentrateConfigured(): boolean {
  return API_KEY.length > 0;
}

// Compact, token-cheap snapshot of the civic dataset so the model answers from
// real ROADWATCH records instead of hallucinating.
function buildGroundingContext(): string {
  const roadLines = roads
    .map(r => `- ${r.name} (${r.roadCode}, id=${r.id}): status=${r.status}, ${r.lengthKm}km, type=${r.roadType}, lastRelayed=${r.lastRelayingDate}`)
    .join('\n');

  const contractorLines = contractors
    .map(c => `- ${c.name} (id=${c.id}): rating=${c.rating}/5, completed=${c.projectsCompleted}, delayed=${c.projectsDelayed}, blacklisted=${c.blacklisted}${c.blacklistedReason ? ` [${c.blacklistedReason}]` : ''}`)
    .join('\n');

  const projectLines = projects
    .map(p => `- "${p.title}" (id=${p.id}): roadId=${p.roadId}, contractorId=${p.contractorId}, allocated=₹${p.budgetAllocated}, spent=₹${p.budgetSpent}, status=${p.status}, delayDays=${p.delayDays}`)
    .join('\n');

  const authorityLines = authorities
    .map(a => `- ${a.name} (id=${a.id}): dept=${a.departmentCode}`)
    .join('\n');

  return [
    'ROADS:', roadLines,
    '\nCONTRACTORS:', contractorLines,
    '\nPROJECTS:', projectLines,
    '\nAUTHORITIES:', authorityLines,
  ].join('\n');
}

const SYSTEM_PROMPT = `You are ROADWATCH's Civic Infrastructure Intelligence assistant (CoERS Sanjaya-RATH Core), a governance-grade AI for road accountability in Mumbai.

Rules:
- Answer ONLY from the grounded dataset below. If a fact is not in the data, say you cannot verify it — never invent budgets, dates, ratings, or contractor names.
- You are a "verifiable spine": if a user asserts something that contradicts the data (e.g. a blacklisted contractor completed work, or a wrong amount), correct them and cite the real record. Do NOT agree to be polite.
- Be concise and use markdown (bold key figures, bullet lists). Currency is INR (₹).
- Domains you cover: road health/status, budget & spend audits, contractor scorecards & blacklists, complaint routing, and transparency scores.

GROUNDED DATASET:
${buildGroundingContext()}`;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Streams a grounded completion from Concentrate AI.
 * Calls onToken for each text delta. Returns the full text.
 * Throws on network / non-200 so the caller can fall back further.
 */
export async function streamConcentrateReply(
  userMessage: string,
  history: ChatTurn[],
  onToken: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!API_KEY) throw new Error('Concentrate API key not configured');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    // keep the last few turns for context (drop the empty placeholder assistant)
    ...history
      .filter(h => h.content.trim().length > 0)
      .slice(-6)
      .map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.1, stream: true }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Concentrate API error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by newlines; each data line is a JSON chunk.
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return full;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          onToken(delta);
        }
      } catch {
        // partial JSON across chunk boundary — ignore, next read completes it
      }
    }
  }

  return full;
}
