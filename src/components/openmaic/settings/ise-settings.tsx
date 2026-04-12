
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
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Reset state when provider changes (derived state pattern)
  const [prevProviderId, setPrevProviderId] = useState(selectedProviderId);
  if (selectedProviderId !== prevProviderId) {
    setPrevProviderId(selectedProviderId);
    setShowApiKey(false);
    setTestStatus('idle');
    setTestMessage('');
  }

  /**
   * 通过 Web Crypto API 生成 HMAC-SHA256 签名
   */
  const hmacSha256Base64 = async (secret: string, message: string): Promise<string> => {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  /**
   * 生成讯飞 ISE 鉴权 WebSocket URL
   */
  const generateIflytekAuthUrl = async (
    apiKey: string,
    apiSecret: string,
  ): Promise<string> => {
    const host = 'ise-api.xfyun.cn';
    const path = '/v2/open-ise';
    const wsUrl = 'wss://ise-api.xfyun.cn/v2/open-ise';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    const signature = await hmacSha256Base64(apiSecret, signatureOrigin);

    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    return `${wsUrl}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
  };

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
        // 直接在前端通过 WebSocket 连接讯飞 ISE 来验证凭证
        const authUrl = await generateIflytekAuthUrl(apiKey, apiSecret);
        let resolved = false; // 标记测试是否已有结果

        const ws = new WebSocket(authUrl);
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            ws.close();
            setTestStatus('error');
            setTestMessage('连接超时（5秒），请检查网络环境');
          }
        }, 5000);

        ws.onopen = () => {
          // 连接成功，发送一个最小的 SSB 参数帧来验证 AppID
          const ssbFrame = {
            common: { app_id: appId },
            business: {
              sub: 'ise',
              ent: 'en_vip',
              category: 'read_word',
              cmd: 'ssb',
              text: '\uFEFFhello',
              tte: 'utf-8',
              aue: 'raw',
            },
            data: { status: 0, data: '' },
          };
          ws.send(JSON.stringify(ssbFrame));

          // 发送一个结束帧，告知服务端传输完毕
          const endFrame = {
            business: { cmd: 'auw', aus: 4, aue: 'raw' },
            data: { status: 2, data: '' },
          };
          ws.send(JSON.stringify(endFrame));
        };

        ws.onmessage = (event) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          try {
            const response = JSON.parse(event.data as string);
            ws.close();

            if (response.code === 0) {
              setTestStatus('success');
              setTestMessage('连接测试成功！讯飞 ISE 发音评测服务可用');
            } else {
              // 讯飞 API 返回了错误码
              const errMsg =
                response.message || response.desc || `错误码: ${response.code}`;
              setTestStatus('error');
              setTestMessage(`讯飞 API 返回错误: ${errMsg}`);
            }
          } catch {
            ws.close();
            setTestStatus('error');
            setTestMessage('解析响应失败，请检查配置');
          }
        };

        ws.onerror = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          setTestStatus('error');
          setTestMessage('WebSocket 连接失败，请检查 API Key 和 API Secret 是否正确');
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          // 如果还没有通过其他回调设置结果，且非正常关闭
          if (!resolved && event.code !== 1000) {
            resolved = true;
            setTestStatus('error');
            setTestMessage(
              `连接被关闭 (code: ${event.code})，请检查 API Key 和 API Secret 是否正确`,
            );
          }
        };
      } catch (error) {
        log.error('ISE connection test failed:', error);
        setTestStatus('error');
        setTestMessage('连接测试失败，请检查网络和配置');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
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
                placeholder={isServerConfigured ? t('settings.optionalOverride') : '请输入 App ID'}
                value={currentConfig.appId || ''}
                onChange={(e) =>
                  setISEProviderConfig(selectedProviderId, {
                    appId: e.target.value,
                  })
                }
                className="text-sm"
              />
            </div>

            {/* API Key (unified) */}
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
                    isServerConfigured ? t('settings.optionalOverride') : '请输入 API Key'
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
                  type={showApiKey ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={isServerConfigured ? t('settings.optionalOverride') : '请输入 API Secret'}
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
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label className="text-sm">Base URL</Label>
              <Input
                name="ise-base-url"
                type="url"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={
                  isServerConfigured ? t('settings.optionalOverride') : 'wss://ise-api.xfyun.cn/v2/open-ise'
                }
                value={currentConfig.baseUrl || ''}
                onChange={(e) =>
                  setISEProviderConfig(selectedProviderId, {
                    baseUrl: e.target.value,
                  })
                }
                className="text-sm"
              />
            </div>
          </div>
        </>
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
