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
  onSelect: (providerId: ProviderId) => void;
  onAddProvider: () => void;
  width?: number;
}

export function ProviderList({
  providers,
  selectedProviderId,
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

  return (
    <div
      className="flex flex-shrink-0 flex-col border-r border-orange-100/70 bg-white/75 backdrop-blur-sm"
      style={{ width: width ?? 224 }}
    >
      <div className="border-b border-orange-100/70 px-5 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4">
          <div className="text-sm font-semibold text-slate-800">模型服务商</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            选择一个服务商，再配置 API Key、地址和模型列表。
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider.id)}
            className={cn(
              'group w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
              selectedProviderId === provider.id
                ? 'border-orange-200 bg-gradient-to-r from-orange-50 via-rose-50 to-white shadow-[0_10px_24px_rgba(249,115,22,0.12)]'
                : 'border-transparent bg-white/90 hover:border-orange-100 hover:bg-white hover:shadow-sm',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">
                  {getProviderDisplayName(provider)}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {provider.type ? `协议：${provider.type}` : '可配置提供商'}
                </p>
              </div>
              {provider.isServerConfigured && (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-100">
                  {t('settings.serverConfigured')}
                </span>
              )}
            </div>
          </button>
        ))}
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
