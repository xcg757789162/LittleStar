import { Bot, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import type { ProviderId } from '@/lib/openmaic/ai/providers';
import type { ProvidersConfig } from '@/lib/openmaic/types/settings';
import { ModelSelector } from './model-selector';

interface GeneralSettingsProps {
  activeProviderId: ProviderId;
  activeModelId: string;
  currentProviderName: string;
  currentModelName: string;
  providersConfig: ProvidersConfig;
  onModelChange: (providerId: ProviderId, modelId: string) => void;
}

export function GeneralSettings({
  activeProviderId,
  activeModelId,
  currentProviderName,
  currentModelName,
  providersConfig,
  onModelChange,
}: GeneralSettingsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 via-rose-50 to-sky-50 shadow-sm">
        <div className="border-b border-white/70 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-pink-400 text-white shadow-[0_12px_30px_rgba(249,115,22,0.18)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {t('settings.currentModelPanelTitle')}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t('settings.currentModelPanelDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[24px] bg-white/88 p-5 shadow-sm ring-1 ring-orange-100/80">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5" />
              {t('settings.currentlyUsing')}
            </div>

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t('settings.currentModelProvider')}
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-800">{currentProviderName}</div>
            </div>

            <div className="mt-5 rounded-[20px] border border-slate-100 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t('settings.currentModelId')}
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-800">{currentModelName}</div>
              {activeModelId && (
                <div className="mt-2 font-mono text-xs text-slate-500">{activeModelId}</div>
              )}
            </div>

          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/78 p-5 shadow-sm">
            <div className="mb-3">
              <div className="text-base font-semibold text-slate-800">{t('settings.activeModel')}</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t('settings.activeModelDescription')}
              </p>
            </div>
            <ModelSelector
              providerId={activeProviderId}
              modelId={activeModelId}
              onModelChange={onModelChange}
              providersConfig={providersConfig}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
