import { Button } from '@/components/openmaic/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/openmaic/utils';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import type { ProviderId, ProviderConfig } from '@/lib/openmaic/ai/providers';

interface ProviderWithServerInfo extends ProviderConfig {
  isServerConfigured?: boolean;
}

interface ProviderListProps {
  providers: ProviderWithServerInfo[];
  selectedProviderId: ProviderId;
  activeProviderId: ProviderId;
  activeProviderName: string;
  activeModelName: string;
  onSelect: (providerId: ProviderId) => void;
  onAddProvider: () => void;
  width?: number;
}

export function ProviderList({
  providers,
  selectedProviderId,
  activeProviderId,
  activeProviderName,
  activeModelName,
  onSelect,
  onAddProvider,
  width,
}: ProviderListProps) {
  const { t } = useI18n();

  const getProviderDisplayName = (provider: ProviderConfig) => {
    const translationKey = `settings.providerNames.${provider.id}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : provider.name;
  };

  const getProviderProtocolLabel = (provider: ProviderConfig) => {
    if (provider.type === 'openai') return 'OpenAI 协议';
    if (provider.type === 'anthropic') return 'Anthropic 协议';
    if (provider.type === 'google') return 'Google 协议';
    return '可配置';
  };

  return (
    <div
      className="flex flex-shrink-0 flex-col border-r border-orange-100/70 bg-white/75 backdrop-blur-sm"
      style={{ width: width ?? 224 }}
    >
      <div className="border-b border-orange-100/70 px-5 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-white p-3.5 shadow-sm ring-1 ring-orange-100/70">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
            {t('settings.currentActiveSummary')}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{activeProviderName}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{activeModelName}</div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {t('settings.providerListDescription')}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {providers.map((provider) => {
          const isViewing = selectedProviderId === provider.id;
          const isActiveProvider = activeProviderId === provider.id;

          return (
            <button
              key={provider.id}
              onClick={() => onSelect(provider.id)}
              className={cn(
                'group w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                isViewing
                  ? 'border-orange-200 bg-gradient-to-r from-orange-50 via-rose-50 to-white shadow-[0_10px_24px_rgba(249,115,22,0.12)]'
                  : 'border-transparent bg-white/90 hover:border-orange-100 hover:bg-white hover:shadow-sm',
                isActiveProvider && 'ring-1 ring-emerald-100',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {getProviderDisplayName(provider)}
                    </div>
                    {isActiveProvider && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-100">
                        {t('settings.activeProviderStatus')}
                      </span>
                    )}
                    {isViewing && !isActiveProvider && (
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-100">
                        {t('settings.viewingProvider')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">
                    {getProviderProtocolLabel(provider)}
                  </p>
                </div>
                {provider.isServerConfigured && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-100">
                    {t('settings.serverConfigured')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-orange-100/70 p-4">
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-full gap-1.5 rounded-2xl border-orange-200 bg-white hover:bg-orange-50"
          onClick={onAddProvider}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('settings.addProviderButton')}
        </Button>
      </div>
    </div>
  );
}
