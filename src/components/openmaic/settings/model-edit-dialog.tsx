
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/openmaic/ui/dialog';
import { Button } from '@/components/openmaic/ui/button';
import { Input } from '@/components/openmaic/ui/input';
import { Label } from '@/components/openmaic/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import type { EditingModel } from '@/lib/openmaic/types/settings';
import type { ProviderId } from '@/lib/openmaic/ai/providers';
import { cn } from '@/lib/openmaic/utils';

interface ModelEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingModel: EditingModel | null;
  setEditingModel: (model: EditingModel | null) => void;
  onSave: () => void;
  onAutoSave?: () => void; // Auto-save on blur
  providerId: ProviderId;
  apiKey: string;
  baseUrl?: string;
  providerType?: string;
  requiresApiKey?: boolean;
  isServerConfigured?: boolean;
}

export function ModelEditDialog({
  open,
  onOpenChange,
  editingModel,
  setEditingModel,
  onSave,
  onAutoSave,
  providerId,
  apiKey,
  baseUrl,
  providerType,
  requiresApiKey,
  isServerConfigured,
}: ModelEditDialogProps) {
  const { t } = useI18n();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Reset test status when dialog closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state when dialog closes
      setTestStatus('idle');

      setTestMessage('');
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setEditingModel(null);
  };

  const handleTestModel = useCallback(async () => {
    if (!editingModel) {
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      const response = await fetch('/api/verify-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          baseUrl,
          model: `${providerId}:${editingModel.model.id}`,
          providerType,
          requiresApiKey,
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
  }, [editingModel, apiKey, baseUrl, providerId, providerType, requiresApiKey, t]);

  if (!editingModel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[1200]"
        className="z-[1201] max-h-[90vh] overflow-hidden p-0 sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">
          {editingModel.modelIndex === null ? t('settings.addNewModel') : t('settings.editModel')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {editingModel.modelIndex === null
            ? t('settings.addNewModelDescription')
            : t('settings.editModelDescription')}
        </DialogDescription>
        <div className="max-h-[90vh] space-y-5 overflow-y-auto p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              {editingModel.modelIndex === null
                ? t('settings.addNewModel')
                : t('settings.editModel')}
            </h2>
          </div>

          {/* Model ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">{t('settings.modelId')}</Label>
            <Input
              placeholder={t('settings.modelIdPlaceholder')}
              value={editingModel.model.id}
              onChange={(e) => {
                const newId = e.target.value;
                const currentName = editingModel.model.name;
                const currentId = editingModel.model.id;

                // Auto-sync name if it's empty or matches the old ID
                const shouldSyncName = !currentName || currentName === currentId;

                setEditingModel({
                  ...editingModel,
                  model: {
                    ...editingModel.model,
                    id: newId,
                    name: shouldSyncName ? newId : currentName,
                  },
                });

                // Reset test status when model ID changes
                setTestStatus('idle');
                setTestMessage('');
              }}
              onBlur={() => onAutoSave?.()}
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label>{t('settings.modelName')}</Label>
            <Input
              placeholder={t('settings.modelNamePlaceholder')}
              value={editingModel.model.name}
              onChange={(e) =>
                setEditingModel({
                  ...editingModel,
                  model: { ...editingModel.model, name: e.target.value },
                })
              }
              onBlur={() => onAutoSave?.()}
            />
          </div>

          {/* Test Model */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-800">{t('settings.testModel')}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestModel}
                disabled={
                  !editingModel.model.id ||
                  testStatus === 'testing' ||
                  (requiresApiKey && !apiKey && !isServerConfigured)
                }
                className={cn(
                  'shadow-sm',
                  testStatus === 'success' && 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700',
                  testStatus === 'error' && 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700',
                )}
              >
                {testStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />}
                {testStatus === 'success' && <CheckCircle className="mr-2 h-4 w-4" />}
                {testStatus === 'error' && <XCircle className="mr-2 h-4 w-4" />}
                {testStatus === 'testing' ? t('settings.testing') : t('settings.testConnection')}
              </Button>
            </div>
            {testMessage && (
              <div
                className={cn(
                  'rounded-lg p-3 text-sm shadow-sm border',
                  testStatus === 'success' && 'bg-emerald-50 text-emerald-700 border-emerald-100',
                  testStatus === 'error' && 'bg-red-50 text-red-700 border-red-100',
                )}
              >
                <div className="flex items-start gap-2 flex-wrap">
                  {testStatus === 'success' && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />}
                  {testStatus === 'error' && <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />}
                  <p className="flex-1 break-words leading-relaxed">{testMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-2">
            <Button variant="outline" size="sm" onClick={handleClose} className="rounded-full px-5 text-slate-600">
              {t('settings.cancelEdit')}
            </Button>
            <Button size="sm" onClick={onSave} className="rounded-full px-5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
              {t('settings.saveModel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
