/**
 * Resolves the ordered, deduplicated list of Gemini model IDs to attempt.
 *
 * - When an explicit modelName is passed (e.g. in unit tests), only that model is used.
 * - Otherwise uses `process.env[primaryEnvKey]` (or `defaultModel`) followed by any
 *   comma-separated fallback models configured in `GEMINI_FALLBACK_MODELS`.
 */
export function resolveGeminiModelChain(
  explicitModelName: string | undefined,
  primaryEnvKey: 'GEMINI_MODEL' | 'GEMINI_DAMAGE_MODEL',
  defaultModel: string,
): string[] {
  if (explicitModelName?.trim()) {
    return [explicitModelName.trim()];
  }

  const primary = process.env[primaryEnvKey]?.trim() || defaultModel;
  const fallbackRaw = process.env.GEMINI_FALLBACK_MODELS || '';
  const fallbacks = fallbackRaw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const chain: string[] = [];
  for (const m of [primary, ...fallbacks]) {
    if (!seen.has(m)) {
      seen.add(m);
      chain.push(m);
    }
  }
  return chain;
}

export function getGeminiRuntimeStatus() {
  const configured = Boolean(process.env.GEMINI_API_KEY?.trim());
  const chatModels = resolveGeminiModelChain(undefined, 'GEMINI_MODEL', 'gemini-3.5-flash-lite');
  const damageModels = resolveGeminiModelChain(
    undefined,
    'GEMINI_DAMAGE_MODEL',
    chatModels[0] || 'gemini-3.5-flash-lite',
  );
  return {
    configured,
    model: chatModels[0],
    damageModel: damageModels[0],
    fallbackModels: chatModels.slice(1),
  };
}
