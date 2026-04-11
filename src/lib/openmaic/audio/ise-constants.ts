/**
 * ISE (Intelligent Speech Evaluation) Provider Constants
 *
 * Registry of all pronunciation assessment providers with their metadata.
 * Client-safe file, can be imported in both client and server components.
 *
 * Currently Supported ISE Providers:
 * - iFlytek ISE (https://www.xfyun.cn/services/ise)
 * - Text Match Fallback (local, no API required)
 *
 * Future Provider Support (extensible):
 * - Tencent ISE (https://cloud.tencent.com/product/soe)
 * - Azure Pronunciation Assessment
 */

import type { ISEProviderId, ISEProviderConfig } from './types';

/**
 * ISE Provider Registry
 *
 * Central registry for all ISE providers.
 * Keep in sync with ISEProviderId type definition.
 */
export const ISE_PROVIDERS: Record<ISEProviderId, ISEProviderConfig> = {
  'iflytek-ise': {
    id: 'iflytek-ise',
    name: '讯飞口语评测',
    requiresApiKey: true,
    description: '专业级发音评测，支持单词、句子、段落评测，返回详细的发音评分和音素级反馈',
    icon: '/logos/iflytek.svg',
    configFields: [
      {
        key: 'appId',
        label: 'App ID',
        type: 'text',
        placeholder: '请输入讯飞 App ID',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: '请输入讯飞 API Key',
      },
      {
        key: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        placeholder: '请输入讯飞 API Secret',
      },
    ],
  },

  'text-match-fallback': {
    id: 'text-match-fallback',
    name: '文本匹配（免费）',
    requiresApiKey: false,
    description: '基于 ASR 转文本后进行文本相似度匹配，无需额外配置，但评测精度较低',
    icon: '/logos/browser.svg',
  },
};

/**
 * Get all available ISE providers
 */
export function getAllISEProviders(): ISEProviderConfig[] {
  return Object.values(ISE_PROVIDERS);
}

/**
 * Get ISE provider by ID
 */
export function getISEProvider(providerId: ISEProviderId): ISEProviderConfig | undefined {
  return ISE_PROVIDERS[providerId];
}

/**
 * Default ISE provider when no selection is made
 */
export const DEFAULT_ISE_PROVIDER: ISEProviderId = 'text-match-fallback';
