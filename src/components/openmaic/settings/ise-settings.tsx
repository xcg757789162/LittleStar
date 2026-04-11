
import { useState } from 'react';
import { Label } from '@/components/openmaic/ui/label';
import { Input } from '@/components/openmaic/ui/input';
import { Button } from '@/components/openmaic/ui/button';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import { useSettingsStore } from '@/lib/openmaic/store/settings';
import { ISE_PROVIDERS } from '@/lib/openmaic/audio/ise-constants';
import type { ISEProviderId } from '@/lib/openmaic/audio/types';
import { CheckCircle2, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/openmaic/utils';
import { createLogger } from '@/lib/openmaic/logger';

const log = createLogger('ISESettings');

interface ISESettingsProps {
  selectedProviderId: ISEProviderId;
}

export function ISESettings({ selectedProviderId }: ISESettingsProps) {
  const { t } = useI18n();

  const iseProvidersConfig = useSettingsStore((state) => state.iseProvidersConfig);
  const setISEProviderConfig = useSettingsStore((state) => state.setISEProviderConfig);

  const iseProvider = ISE_PROVIDERS[selectedProviderId] ?? ISE_PROVIDERS['text-match-fallback'];
  const isServerConfigured = !!iseProvidersConfig[selectedProviderId]?.isServerConfigured;
  const currentConfig = iseProvidersConfig[selectedProviderId] || {};

  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Reset state when provider changes (derived state pattern)
  const [prevProviderId, setPrevProviderId] = useState(selectedProviderId);
  if (selectedProviderId !== prevProviderId) {
    setPrevProviderId(selectedProviderId);
    setShowApiKey(false);
    setShowApiSecret(false);
    setTestStatus('idle');
    setTestMessage('');
  }

  const handleTestConnection = async () => {
    if (selectedProviderId === 'text-match-fallback') {
      setTestStatus('success');
      setTestMessage('文本匹配模式无需配置，可直接使用');
      return;
    }

    // For iFlytek ISE, verify required fields are present
    if (selectedProviderId === 'iflytek-ise') {
      const { appId, apiKey, apiSecret } = currentConfig;
      if (!appId?.trim() || !apiKey?.trim() || !apiSecret?.trim()) {
        setTestStatus('error');
        setTestMessage('请填写完整的 App ID、API Key 和 API Secret');
        return;
      }

      setTestStatus('testing');
      setTestMessage('');

      try {
        // TODO: Implement actual ISE connection test API
        const response = await fetch('/api/ise/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: selectedProviderId,
            appId,
            apiKey,
            apiSecret,
          }),
        });

        if (response.ok) {
          setTestStatus('success');
          setTestMessage('连接测试成功，发音评测服务可用');
        } else {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          setTestStatus('error');
          setTestMessage(errorData.details || errorData.error || '连接测试失败');
        }
      } catch (error) {
        log.error('ISE connection test failed:', error);
        setTestStatus('error');
        setTestMessage('连接测试失败，请检查网络和配置');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Provider Description */}
      {iseProvider.description && (
        <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
          {iseProvider.description}
        </div>
      )}

      {/* Server-configured notice */}
      {isServerConfigured && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-sm text-blue-700 dark:text-blue-300">
          {t('settings.serverConfiguredNotice')}
        </div>
      )}

      {/* iFlytek Configuration */}
      {selectedProviderId === 'iflytek-ise' && (
        <>
          <div className="space-y-4">
            {/* App ID */}
            <div className="space-y-2">
              <Label className="text-sm">App ID</Label>
              <Input
                name="ise-app-id"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={
                  isServerConfigured ? t('settings.optionalOverride') : '请输入讯飞 App ID'
                }
                value={currentConfig.appId || ''}
                onChange={(e) =>
                  setISEProviderConfig(selectedProviderId, {
                    appId: e.target.value,
                  })
                }
                className="font-mono text-sm"
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-sm">API Key</Label>
              <div className="relative">
                <Input
                  name="ise-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={
                    isServerConfigured ? t('settings.optionalOverride') : '请输入讯飞 API Key'
                  }
                  value={currentConfig.apiKey || ''}
                  onChange={(e) =>
                    setISEProviderConfig(selectedProviderId, {
                      apiKey: e.target.value,
                    })
                  }
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* API Secret */}
            <div className="space-y-2">
              <Label className="text-sm">API Secret</Label>
              <div className="relative">
                <Input
                  name="ise-api-secret"
                  type={showApiSecret ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={
                    isServerConfigured ? t('settings.optionalOverride') : '请输入讯飞 API Secret'
                  }
                  value={currentConfig.apiSecret || ''}
                  onChange={(e) =>
                    setISEProviderConfig(selectedProviderId, {
                      apiSecret: e.target.value,
                    })
                  }
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Help Link */}
          <p className="text-xs text-muted-foreground">
            获取密钥：
            <a
              href="https://console.xfyun.cn/services/ise"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              讯飞开放平台控制台
            </a>
          </p>
        </>
      )}

      {/* Text Match Fallback Info */}
      {selectedProviderId === 'text-match-fallback' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
              ⚠️ 免费模式说明
            </h4>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
              <li>使用语音识别（ASR）将用户发音转为文本</li>
              <li>通过文本相似度算法计算发音得分</li>
              <li>无法提供音素级别的详细评测反馈</li>
              <li>评测精度低于专业 ISE 服务</li>
            </ul>
          </div>
        </div>
      )}

      {/* Test Connection */}
      <div className="space-y-2">
        <Label className="text-sm">连接测试</Label>
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={
              testStatus === 'testing' ||
              (selectedProviderId === 'iflytek-ise' &&
                !isServerConfigured &&
                (!currentConfig.appId?.trim() ||
                  !currentConfig.apiKey?.trim() ||
                  !currentConfig.apiSecret?.trim()))
            }
            className="gap-2"
          >
            {testStatus === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                测试中...
              </>
            ) : (
              '测试连接'
            )}
          </Button>
        </div>
      </div>

      {testMessage && (
        <div
          className={cn(
            'rounded-lg p-3 text-sm overflow-hidden',
            testStatus === 'success' &&
              'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800',
            testStatus === 'error' &&
              'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
          )}
        >
          <div className="flex items-start gap-2 min-w-0">
            {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
            {testStatus === 'error' && <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <p className="flex-1 min-w-0 break-all">{testMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
