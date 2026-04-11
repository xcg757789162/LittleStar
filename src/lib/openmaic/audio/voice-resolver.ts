import type { TTSProviderId } from '@/lib/openmaic/audio/types';
import type { AgentConfig } from '@/lib/openmaic/orchestration/registry/types';
import { TTS_PROVIDERS } from '@/lib/openmaic/audio/constants';

export interface ResolvedVoice {
  providerId: TTSProviderId;
  modelId?: string;
  voiceId: string;
}

/**
 * Resolve the TTS provider + voice for an agent.
 * 1. If agent has voiceConfig and the voice is still valid, use it
 * 2. Otherwise, use the first available provider + deterministic voice by index
 */
export function resolveAgentVoice(
  agent: AgentConfig,
  agentIndex: number,
  availableProviders: ProviderWithVoices[],
): ResolvedVoice {
  // Agent-specific config
  if (agent.voiceConfig) {
    // Browser-native voices are dynamic (not in static registry), so skip validation
    if (agent.voiceConfig.providerId === 'browser-native-tts') {
      return {
        providerId: agent.voiceConfig.providerId,
        modelId: agent.voiceConfig.modelId,
        voiceId: agent.voiceConfig.voiceId,
      };
    }
    const list = getServerVoiceList(agent.voiceConfig.providerId);
    if (list.includes(agent.voiceConfig.voiceId)) {
      return {
        providerId: agent.voiceConfig.providerId,
        modelId: agent.voiceConfig.modelId,
        voiceId: agent.voiceConfig.voiceId,
      };
    }
  }

  // Fallback: first available provider, deterministic voice
  if (availableProviders.length > 0) {
    const first = availableProviders[0];
    return {
      providerId: first.providerId,
      voiceId: first.voices[agentIndex % first.voices.length].id,
    };
  }

  return { providerId: 'browser-native-tts', voiceId: 'default' };
}

/**
 * Get the list of voice IDs for a TTS provider.
 * For browser-native-tts, returns empty (browser voices are dynamic).
 */
export function getServerVoiceList(providerId: TTSProviderId): string[] {
  if (providerId === 'browser-native-tts') return [];
  const provider = TTS_PROVIDERS[providerId];
  if (!provider) return [];
  return provider.voices.map((v) => v.id);
}

export interface ModelVoiceGroup {
  modelId: string;
  modelName: string;
  voices: Array<{ id: string; name: string }>;
}

export interface ProviderWithVoices {
  providerId: TTSProviderId;
  providerName: string;
  voices: Array<{ id: string; name: string }>; // keep for backward compat
  modelGroups: ModelVoiceGroup[]; // voices grouped by model
}

/**
 * Get all available providers and their voices for the voice picker UI.
 * A provider is available if it has an API key or is server-configured.
 * Browser-native-tts is excluded (no static voice list).
 */
export function getAvailableProvidersWithVoices(
  ttsProvidersConfig: Record<
    string,
    { apiKey?: string; enabled?: boolean; isServerConfigured?: boolean }
  >,
): ProviderWithVoices[] {
  const result: ProviderWithVoices[] = [];

  for (const [id, config] of Object.entries(TTS_PROVIDERS)) {
    const providerId = id as TTSProviderId;
    if (providerId === 'browser-native-tts') continue;
    if (config.voices.length === 0) continue;

    const providerConfig = ttsProvidersConfig[providerId];
    const hasApiKey = providerConfig?.apiKey && providerConfig.apiKey.trim().length > 0;
    const isServerConfigured = providerConfig?.isServerConfigured === true;

    if (hasApiKey || isServerConfigured) {
      const allVoices = config.voices.map((v) => ({ id: v.id, name: v.name }));

      // Build model groups
      const modelGroups: ModelVoiceGroup[] = [];
      if (config.models.length > 0) {
        for (const model of config.models) {
          const compatibleVoices = config.voices
            .filter((v) => !v.compatibleModels || v.compatibleModels.includes(model.id))
            .map((v) => ({ id: v.id, name: v.name }));
          modelGroups.push({
            modelId: model.id,
            modelName: model.name,
            voices: compatibleVoices,
          });
        }
      } else {
        // Provider has no model concept (Azure, Browser Native, Doubao)
        modelGroups.push({
          modelId: '',
          modelName: config.name,
          voices: allVoices,
        });
      }

      result.push({
        providerId,
        providerName: config.name,
        voices: allVoices,
        modelGroups,
      });
    }
  }

  return result;
}

/**
 * Maximum number of representative voices to show per provider in the picker UI.
 */
const MAX_REPRESENTATIVE_VOICES = 10;

/**
 * Get representative voices for the currently selected TTS provider.
 * Returns a single ProviderWithVoices entry with at most MAX_REPRESENTATIVE_VOICES voices,
 * prioritizing: English voices first, then Chinese, capped at the limit.
 *
 * For providers with models (OpenAI, Qwen, ElevenLabs, MiniMax), only the default
 * or first model's compatible voices are used to keep the list short.
 *
 * If the provider is browser-native-tts or has no voices, returns null.
 */
export function getCurrentProviderVoices(
  ttsProviderId: TTSProviderId,
  fallbackProviderId?: TTSProviderId,
): ProviderWithVoices | null {
  const effectiveProviderId =
    ttsProviderId === 'browser-native-tts' && fallbackProviderId
      ? fallbackProviderId
      : ttsProviderId;

  if (effectiveProviderId === 'browser-native-tts') return null;
  const config = TTS_PROVIDERS[effectiveProviderId];
  if (!config || config.voices.length === 0) return null;

  // Pick the default model (or first model) to filter compatible voices
  const targetModelId = config.defaultModelId || (config.models.length > 0 ? config.models[0].id : '');
  const compatibleVoices = targetModelId
    ? config.voices.filter((v) => !v.compatibleModels || v.compatibleModels.includes(targetModelId))
    : config.voices;

  // Sort: English first → Chinese → other languages
  const sorted = [...compatibleVoices].sort((a, b) => {
    const langA = (a.language || '').toLowerCase();
    const langB = (b.language || '').toLowerCase();
    const scoreA = langA.startsWith('en') ? 0 : (langA.startsWith('zh') || langA.startsWith('cmn')) ? 1 : 2;
    const scoreB = langB.startsWith('en') ? 0 : (langB.startsWith('zh') || langB.startsWith('cmn')) ? 1 : 2;
    return scoreA - scoreB;
  });

  const selected = sorted.slice(0, MAX_REPRESENTATIVE_VOICES);
  const voices = selected.map((v) => ({ id: v.id, name: v.name }));

  const targetModel = config.models.find((m) => m.id === targetModelId);
  const modelGroups: ModelVoiceGroup[] = [{
    modelId: targetModelId,
    modelName: targetModel?.name || config.name,
    voices,
  }];

  return {
    providerId: effectiveProviderId,
    providerName: config.name,
    voices,
    modelGroups,
  };
}

/**
 * Find a voice display name across all providers.
 */
export function findVoiceDisplayName(providerId: TTSProviderId, voiceId: string): string {
  const provider = TTS_PROVIDERS[providerId];
  if (!provider) return voiceId;
  const voice = provider.voices.find((v) => v.id === voiceId);
  return voice?.name ?? voiceId;
}
