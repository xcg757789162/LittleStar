
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/openmaic/ui/button';
import { Input } from '@/components/openmaic/ui/input';
import { Label } from '@/components/openmaic/ui/label';
import { Checkbox } from '@/components/openmaic/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/openmaic/ui/alert-dialog';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Plus,
  Zap,
  Settings2,
  Trash2,
  Sparkles,
  Wrench,
  FileText,
  Send,
} from 'lucide-react';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import type { ProviderConfig } from '@/lib/openmaic/ai/providers';
import type { ProvidersConfig } from '@/lib/openmaic/types/settings';
import { formatContextWindow } from './utils';
import { cn } from '@/lib/openmaic/utils';

interface ProviderConfigPanelProps {
  provider: ProviderConfig;
  initialApiKey: string;
  initialBaseUrl: string;
  initialRequiresApiKey: boolean;
  providersConfig: ProvidersConfig;
  activeProviderId: string;
  activeModelId: string;
  activeProviderName: string;
  activeModelName: string;
  onSetActiveModel: (modelId: string) => void;
  onConfigChange: (apiKey: string, baseUrl: string, requiresApiKey: boolean) => void;
  onSave: () => void; // Auto-save on blur
  onEditModel: (index: number) => void;
  onDeleteModel: (index: number) => void;
  onAddModel: () => void;
  onResetToDefault?: () => void; // Reset provider to default configuration
  isBuiltIn: boolean; // To determine if reset button should be shown
}

export function ProviderConfigPanel({
  provider,
  initialApiKey,
  initialBaseUrl,
  initialRequiresApiKey,
  providersConfig,
  activeProviderId,
  activeModelId,
  activeProviderName,
  activeModelName,
  onSetActiveModel,
  onConfigChange,
  onSave,
  onEditModel,
  onDeleteModel,
  onAddModel,
  onResetToDefault,
  isBuiltIn,
}: ProviderConfigPanelProps) {
  const { t } = useI18n();

  // Local state for this provider
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [requiresApiKey, setRequiresApiKey] = useState(initialRequiresApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Update local state when provider changes or initial values change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync local state from props on provider change
    setApiKey(initialApiKey);

    setBaseUrl(initialBaseUrl);

    setRequiresApiKey(initialRequiresApiKey);

    setTestStatus('idle');

    setTestMessage('');
  }, [provider.id, initialApiKey, initialBaseUrl, initialRequiresApiKey]);

  // Notify parent of changes
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    onConfigChange(key, baseUrl, requiresApiKey);
  };

  const handleBaseUrlChange = (url: string) => {
    setBaseUrl(url);
    onConfigChange(apiKey, url, requiresApiKey);
  };

  const handleRequiresApiKeyChange = (requires: boolean) => {
    setRequiresApiKey(requires);
    onConfigChange(apiKey, baseUrl, requires);
  };

  const handleTestApi = useCallback(async () => {
    setTestStatus('testing');
    setTestMessage('');

    const availableModels = providersConfig[provider.id]?.models || [];

    if (availableModels.length === 0) {
      setTestStatus('error');
      setTestMessage(t('settings.noModelsAvailable') || 'No models available for testing');
      return;
    }

    const testModelId =
      activeProviderId === provider.id && availableModels.some((model) => model.id === activeModelId)
        ? activeModelId
        : availableModels[0].id;

    try {
      const response = await fetch('/api/verify-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          baseUrl,
          model: `${provider.id}:${testModelId}`,
          providerType: provider.type,
          requiresApiKey: requiresApiKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestStatus('success');
        setTestMessage(t('settings.connectionSuccess'));
      } else {
        setTestStatus('error');
        setTestMessage(data.error || t('settings.connectionFailed'));
      }
    } catch (_error) {
      setTestStatus('error');
      setTestMessage(t('settings.connectionFailed'));
    }
  }, [
    activeModelId,
    activeProviderId,
    apiKey,
    baseUrl,
    provider.id,
    provider.type,
    requiresApiKey,
    providersConfig,
    t,
  ]);

  const models = providersConfig[provider.id]?.models || [];
  const isServerConfigured = providersConfig[provider.id]?.isServerConfigured;
  const isManagingActiveProvider = activeProviderId === provider.id;
  const activeModelLabel = activeModelName || activeModelId || t('settings.selectModel');

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="rounded-[24px] border border-orange-100 bg-gradient-to-br from-orange-50 via-rose-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
              {t('settings.currentActiveSummary')}
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-800">{activeProviderName}</div>
            <div className="mt-1 break-all text-sm text-slate-500">{activeModelLabel}</div>
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1',
              isManagingActiveProvider
                ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                : 'bg-orange-50 text-orange-600 ring-orange-100',
            )}
          >
            {isManagingActiveProvider
              ? t('settings.activeProviderStatus')
              : t('settings.viewingProvider')}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isManagingActiveProvider
            ? t('settings.activeProviderManaged')
            : t('settings.providerSwitchHelper', {
                provider: activeProviderName,
                model: activeModelLabel,
              })}
        </p>
      </section>

      {/* Server-configured notice */}
      {isServerConfigured && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-sm text-blue-700 dark:text-blue-300">
          {t('settings.serverConfiguredNotice')}
        </div>
      )}

      {/* API Key */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-700">{t('settings.apiSecret')}</Label>
          {isServerConfigured && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-600 ring-1 ring-sky-100">
              服务端已配 · 可选覆盖
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              name={`llm-api-key-${provider.id}`}
              type={showApiKey ? 'text' : 'password'}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={isServerConfigured ? t('settings.optionalOverride') : 'sk-...'}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              onBlur={onSave}
              disabled={!requiresApiKey && !isServerConfigured}
              className="h-9 rounded-xl pr-9"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              disabled={!requiresApiKey}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestApi}
            disabled={
              testStatus === 'testing' || (requiresApiKey && !apiKey && !isServerConfigured)
            }
            className="h-9 gap-1.5 rounded-xl border-orange-200 bg-white px-4 font-semibold text-orange-600 shadow-sm hover:bg-orange-50 hover:shadow-md transition-all"
          >
            {testStatus === 'testing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                {t('settings.testConnection')}
              </>
            )}
          </Button>
        </div>
        {testMessage && (
          <div
            className={cn(
              'rounded-lg p-3 text-sm overflow-hidden',
              testStatus === 'success' && 'bg-green-50 text-green-700 border border-green-200',
              testStatus === 'error' && 'bg-red-50 text-red-700 border border-red-200',
            )}
          >
            <div className="flex items-start gap-2 min-w-0">
              {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
              {testStatus === 'error' && <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <p className="flex-1 min-w-0 break-all">{testMessage}</p>
            </div>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`requires-api-key-${provider.id}`}
            checked={requiresApiKey}
            onCheckedChange={(checked) => {
              handleRequiresApiKeyChange(checked as boolean);
              onSave();
            }}
          />
          <label
            htmlFor={`requires-api-key-${provider.id}`}
            className="text-sm cursor-pointer text-muted-foreground"
          >
            {t('settings.requiresApiKey')}
          </label>
        </div>
      </div>

      {/* API Host */}
      <div className="space-y-2">
        <Label>{t('settings.apiHost')}</Label>
        <Input
          name={`llm-base-url-${provider.id}`}
          type="url"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={provider.defaultBaseUrl || 'https://api.example.com/v1'}
          value={baseUrl}
          onChange={(e) => handleBaseUrlChange(e.target.value)}
          onBlur={onSave}
          className="h-8"
        />
        {(() => {
          const effectiveBaseUrl = baseUrl || provider.defaultBaseUrl || '';
          if (!effectiveBaseUrl) return null;

          // Generate endpoint path based on provider type
          let endpointPath = '';
          switch (provider.type) {
            case 'openai':
              endpointPath = '/chat/completions';
              break;
            case 'anthropic':
              endpointPath = '/messages';
              break;
            case 'google':
              endpointPath = '/models/[model]';
              break;
            default:
              endpointPath = '';
          }

          const fullUrl = effectiveBaseUrl + endpointPath;

          return (
            <p className="text-xs text-muted-foreground break-all">
              {t('settings.requestUrl')}: {fullUrl}
            </p>
          );
        })()}
      </div>

      {/* Models - No selection state, just list for management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-base">{t('settings.models')}</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {isBuiltIn && onResetToDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('settings.reset')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onAddModel} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t('settings.addNewModel')}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.modelsManagementDescription')}</p>
        <p className="text-xs leading-5 text-slate-500">{t('settings.modelSelectorHint')}</p>

        <div className="space-y-2">
          {models.map((model, index) => {
            const isActive = activeProviderId === provider.id && activeModelId === model.id;
            return (
              <div
                key={model.id}
                className={cn(
                  'rounded-2xl border p-4 transition-all duration-200',
                  isActive
                    ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30 shadow-[0_4px_16px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100'
                    : 'border-slate-100 bg-white hover:border-orange-100 hover:shadow-sm',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-slate-800">{model.name}</div>
                      {isActive && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t('settings.currentlyUsing')}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {/* Capabilities as readable tags */}
                      {model.capabilities?.vision && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600 ring-1 ring-violet-100" title={t('settings.capabilities.vision')}>
                          <Sparkles className="h-3 w-3" />
                          视觉
                        </span>
                      )}
                      {model.capabilities?.tools && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 ring-1 ring-blue-100" title={t('settings.capabilities.tools')}>
                          <Wrench className="h-3 w-3" />
                          工具
                        </span>
                      )}
                      {model.capabilities?.streaming && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600 ring-1 ring-amber-100" title={t('settings.capabilities.streaming')}>
                          <Zap className="h-3 w-3" />
                          流式
                        </span>
                      )}
                      {/* Context Window - human readable */}
                      {model.contextWindow && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100" title="上下文窗口大小">
                          <FileText className="h-3 w-3" />
                          上下文 {formatContextWindow(model.contextWindow)}
                        </span>
                      )}
                      {/* Output Window - human readable */}
                      {model.outputWindow && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100" title="最大输出长度">
                          <Send className="h-3 w-3" />
                          输出 {formatContextWindow(model.outputWindow)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions - larger click targets */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl border-orange-200 bg-gradient-to-r from-orange-50 to-white px-4 text-xs font-semibold text-orange-600 shadow-sm hover:bg-orange-100 hover:text-orange-700 hover:shadow-md transition-all"
                        onClick={() => onSetActiveModel(model.id)}
                      >
                        {t('settings.setAsActiveModel')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-xl p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      onClick={() => onEditModel(index)}
                      title={t('settings.editModel')}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-xl p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                      onClick={() => onDeleteModel(index)}
                      title={t('settings.deleteModel')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent overlayClassName="z-[1200]" className="z-[1201]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.resetToDefault')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.resetConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.cancelEdit')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowResetDialog(false);
                onResetToDefault?.();
              }}
            >
              {t('settings.confirmReset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
