import { useState, useCallback } from 'react';
import { Label } from '@/components/openmaic/ui/label';
import { Input } from '@/components/openmaic/ui/input';
import { Button } from '@/components/openmaic/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/openmaic/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle, Bot, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import { clearDatabase } from '@/lib/openmaic/utils/database';
import { toast } from 'sonner';
import { createLogger } from '@/lib/openmaic/logger';
import type { ProviderId } from '@/lib/openmaic/ai/providers';
import type { ProvidersConfig } from '@/lib/openmaic/types/settings';
import { ModelSelector } from './model-selector';

const log = createLogger('GeneralSettings');

interface GeneralSettingsProps {
  activeProviderId: ProviderId;
  activeModelId: string;
  currentProviderName: string;
  currentModelName: string;
  providersConfig: ProvidersConfig;
  onModelChange: (providerId: ProviderId, modelId: string) => void;
  onManualAddModel: () => void;
  onOpenProviderManager: () => void;
}

export function GeneralSettings({
  activeProviderId,
  activeModelId,
  currentProviderName,
  currentModelName,
  providersConfig,
  onModelChange,
  onManualAddModel,
  onOpenProviderManager,
}: GeneralSettingsProps) {
  const { t } = useI18n();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [clearing, setClearing] = useState(false);

  const confirmPhrase = t('settings.clearCacheConfirmPhrase');
  const isConfirmValid = confirmInput === confirmPhrase;

  const handleClearCache = useCallback(async () => {
    if (!isConfirmValid) return;
    setClearing(true);
    try {
      await clearDatabase();
      localStorage.clear();
      sessionStorage.clear();

      toast.success(t('settings.clearCacheSuccess'));

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      log.error('Failed to clear cache:', error);
      toast.error(t('settings.clearCacheFailed'));
      setClearing(false);
    }
  }, [isConfirmValid, t]);

  const clearCacheItems =
    t('settings.clearCacheConfirmItems').split('、').length > 1
      ? t('settings.clearCacheConfirmItems').split('、')
      : t('settings.clearCacheConfirmItems').split(', ');

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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-orange-100 bg-orange-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
                  {t('settings.switchGuideTitle')}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t('settings.switchGuideDescription')}
                </p>
              </div>
              <div className="rounded-[20px] border border-sky-100 bg-sky-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-500">
                  {t('settings.switchScopeTitle')}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t('settings.switchScopeDescription')}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.18)] hover:from-orange-500 hover:to-pink-500"
                onClick={onManualAddModel}
              >
                {t('settings.manualAddModel')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-orange-200 bg-white hover:bg-orange-50"
                onClick={onOpenProviderManager}
              >
                {t('settings.manageProviders')}
              </Button>
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

      <section className="relative overflow-hidden rounded-[24px] border border-red-200/60 bg-red-50/70 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              currentColor 10px,
              currentColor 11px
            )`,
          }}
        />

        <div className="relative space-y-4 p-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-red-100 p-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-600">{t('settings.dangerZone')}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t('settings.clearCacheDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-[20px] border border-white/70 bg-white/85 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{t('settings.clearCache')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t('settings.clearCacheDescription')}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => {
                setConfirmInput('');
                setShowClearDialog(true);
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t('settings.clearCache')}
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog
        open={showClearDialog}
        onOpenChange={(open) => {
          if (!clearing) {
            setShowClearDialog(open);
            if (!open) setConfirmInput('');
          }
        }}
      >
        <AlertDialogContent overlayClassName="z-[1200]" className="z-[1201]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('settings.clearCacheConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t('settings.clearCacheConfirmDescription')}</p>
                <ul className="ml-1 space-y-1.5">
                  {clearCacheItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/60" />
                      {item.trim()}
                    </li>
                  ))}
                </ul>
                <div className="pt-1">
                  <Label className="text-xs font-medium text-foreground">
                    {t('settings.clearCacheConfirmInput')}
                  </Label>
                  <Input
                    className="mt-1.5 h-10 text-sm"
                    placeholder={confirmPhrase}
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isConfirmValid) {
                        handleClearCache();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>{t('common.cancel')}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!isConfirmValid || clearing}
              onClick={handleClearCache}
            >
              {clearing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              {t('settings.clearCacheButton')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
