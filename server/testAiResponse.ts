export function parseAnalyzerResponse(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  for (const candidate of [cleaned, cleaned.replace(/,\s*([}\]])/g, '$1')]) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Try the next safe normalization. Never execute or evaluate model text.
    }
  }
  return null;
}
