const API_BASE = 'http://localhost:8000/api/v1';

interface TranslationResult {
  translatedText: string;
  detectedSourceLang: string;
  confidence: number;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto'
): Promise<TranslationResult> {
  try {
    const resp = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      return {
        translatedText: text,
        detectedSourceLang: sourceLang,
        confidence: 0,
      };
    }
    return resp.json();
  } catch {
    return {
      translatedText: text,
      detectedSourceLang: sourceLang,
      confidence: 0,
    };
  }
}

export async function translateBatch(
  strings: string[],
  targetLang: string,
  sourceLang: string = 'auto'
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  for (const s of strings) {
    const result = await translateText(s, targetLang, sourceLang);
    results[s] = result.translatedText;
  }
  return results;
}

const transliterationMap: Record<string, string> = {
  'hi': 'Hindi',
  'mr': 'Marathi',
  'bn': 'Bengali',
  'te': 'Telugu',
  'ta': 'Tamil',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'gu': 'Gujarati',
  'pa': 'Punjabi',
};

export function getLanguageName(code: string): string {
  if (code.length === 5) {
    const lang = code.split('-')[0];
    return transliterationMap[lang] || code;
  }
  return transliterationMap[code] || code;
}

export function supportsOfflineTranslation(locale: string): boolean {
  const lang = locale.split('-')[0];
  return ['en', 'hi', 'mr'].includes(lang);
}
