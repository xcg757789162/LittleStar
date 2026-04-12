
import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/openmaic/ui/dialog';
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
import { Button } from '@/components/openmaic/ui/button';
import {
  X,
  Trash2,
  Box,
  Settings,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Search,
  Volume2,
  Mic,
} from 'lucide-react';
import { useI18n } from '@/lib/openmaic/hooks/use-i18n';
import { useSettingsStore } from '@/lib/openmaic/store/settings';
import { toast } from 'sonner';
import { type ProviderId } from '@/lib/openmaic/ai/providers';
import { PROVIDERS } from '@/lib/openmaic/ai/providers';
import { cn } from '@/lib/openmaic/utils';
import { getProviderTypeLabel } from './utils';
import { ProviderList } from './provider-list';
import { ProviderConfigPanel } from './provider-config-panel';
import { PDFSettings } from './pdf-settings';
import { PDF_PROVIDERS } from '@/lib/openmaic/pdf/constants';
import type { PDFProviderId } from '@/lib/openmaic/pdf/types';
import { ImageSettings } from './image-settings';
import { IMAGE_PROVIDERS } from '@/lib/openmaic/media/image-providers';
import type { ImageProviderId } from '@/lib/openmaic/media/types';
import { VideoSettings } from './video-settings';
import { VIDEO_PROVIDERS } from '@/lib/openmaic/media/video-providers';
import type { VideoProviderId } from '@/lib/openmaic/media/types';
import { TTSSettings } from './tts-settings';
import { TTS_PROVIDERS } from '@/lib/openmaic/audio/constants';
import type { TTSProviderId } from '@/lib/openmaic/audio/types';
import { ASRSettings } from './asr-settings';
import { ASR_PROVIDERS } from '@/lib/openmaic/audio/constants';
import type { ASRProviderId } from '@/lib/openmaic/audio/types';
import { ISESettings } from './ise-settings';
import { ISE_PROVIDERS } from '@/lib/openmaic/audio/ise-constants';
import type { ISEProviderId } from '@/lib/openmaic/audio/types';
import { WebSearchSettings } from './web-search-settings';
import { WEB_SEARCH_PROVIDERS } from '@/lib/openmaic/web-search/constants';
import type { WebSearchProviderId } from '@/lib/openmaic/web-search/types';
import { GeneralSettings } from './general-settings';
import { ModelEditDialog } from './model-edit-dialog';
import { AddProviderDialog, type NewProviderData } from './add-provider-dialog';
import type { SettingsSection, EditingModel } from '@/lib/openmaic/types/settings';
import { syncOpenMAICToChild } from '@/stores/openmaic/settings-reverse-sync';
import { syncSettingsToOpenMAIC } from '@/stores/openmaic/settings-sync';
import { useChildStore } from '@/stores/childStore';

// ─── Provider List Column (reusable) ───
function ProviderListColumn<T extends string>({
  providers,
  configs,
  selectedId,
  activeId,
  onSelect,
  width,
  t,
}: {
  providers: Array<{ id: T; name: string; icon?: string }>;
  configs: Record<string, { isServerConfigured?: boolean }>;
  selectedId: T;
  activeId?: T;
  onSelect: (id: T) => void;
  width: number;
  t: (key: string) => string;
}) {
  return (
    <div
      className="flex-shrink-0 flex flex-col border-r border-orange-100/70 bg-white/70 backdrop-blur-sm"
      style={{ width }}
    >
      <div className="border-b border-orange-100/70 px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 via-white to-orange-50 p-3">
          <div className="text-sm font-semibold text-slate-800">可选服务</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">点击切换当前使用的服务。</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {providers.map((provider) => {
          const isSelected = selectedId === provider.id;
          const isActive = activeId === provider.id;
          return (
            <button
              key={provider.id}
              onClick={() => onSelect(provider.id)}
              className={cn(
                'w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200',
                isSelected
                  ? 'border-orange-200 bg-gradient-to-r from-orange-50 via-rose-50 to-white shadow-[0_10px_24px_rgba(249,115,22,0.10)]'
                  : 'border-transparent bg-white/80 hover:border-orange-100 hover:bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm font-semibold text-slate-800">{provider.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600 ring-1 ring-orange-200">
                      当前使用
                    </span>
                  )}
                  {configs[provider.id]?.isServerConfigured && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-100">
                      {t('settings.serverConfigured')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helper: get TTS/ASR provider display name ───
function getTTSProviderName(providerId: TTSProviderId, t: (key: string) => string): string {
  const names: Record<TTSProviderId, string> = {
    'openai-tts': t('settings.providerOpenAITTS'),
    'azure-tts': t('settings.providerAzureTTS'),
    'glm-tts': t('settings.providerGLMTTS'),
    'qwen-tts': t('settings.providerQwenTTS'),
    'doubao-tts': t('settings.providerDoubaoTTS'),
    'elevenlabs-tts': t('settings.providerElevenLabsTTS'),
    'minimax-tts': t('settings.providerMiniMaxTTS'),
    'browser-native-tts': t('settings.providerBrowserNativeTTS'),
  };
  return names[providerId];
}

function getASRProviderName(providerId: ASRProviderId, t: (key: string) => string): string {
  const names: Record<ASRProviderId, string> = {
    'openai-whisper': t('settings.providerOpenAIWhisper'),
    'browser-native': t('settings.providerBrowserNative'),
    'qwen-asr': t('settings.providerQwenASR'),
  };
  return names[providerId];
}

function getISEProviderName(providerId: ISEProviderId): string {
  return ISE_PROVIDERS[providerId]?.name || providerId;
}

function getProviderDisplayName(providerId: string, fallbackName: string, t: (key: string) => string) {
  const translationKey = `settings.providerNames.${providerId}`;
  const translated = t(translationKey);
  return translated !== translationKey ? translated : fallbackName;
}

function getSectionSummary(section: SettingsSection): string {
  switch (section) {
    case 'providers':
      return '先配置课堂最核心的大模型服务，决定对话、推理和生成的基础能力。';
    case 'image':
      return '给课堂、绘本和任务生成插图。常用服务配好后就能直接出图。';
    case 'video':
      return '把故事、课堂内容或创作任务生成短视频。';
    case 'tts':
      return '让老师和同学开口说话，决定发音、音色和语速。';
    case 'asr':
      return '默认推荐浏览器原生语音识别，直接可用；只有切换到高精度服务时才需要单独配置 Key。';
    case 'ise':
      return '用于发音评测、口语打分和跟读反馈。';
    case 'pdf':
      return '给 AI 解析 PDF 资料，适合导入课件或讲义。';
    case 'web-search':
      return '为 AI 提供联网搜索能力，补充实时信息。';
    case 'general':
      return '先确认课堂当前真正使用的模型，也可以在这里直接切换或手动添加模型 ID。';
    default:
      return '';
  }
}

// ─── Image/Video provider name helpers ───
const IMAGE_PROVIDER_NAMES: Record<ImageProviderId, string> = {
  seedream: 'providerSeedream',
  'qwen-image': 'providerQwenImage',
  'nano-banana': 'providerNanoBanana',
  'minimax-image': 'providerMiniMaxImage',
  'grok-image': 'providerGrokImage',
};

const IMAGE_PROVIDER_ICONS: Record<ImageProviderId, string> = {
  seedream: '/logos/doubao.svg',
  'qwen-image': '/logos/bailian.svg',
  'nano-banana': '/logos/gemini.svg',
  'minimax-image': '/logos/minimax.svg',
  'grok-image': '/logos/grok.svg',
};

const VIDEO_PROVIDER_NAMES: Record<VideoProviderId, string> = {
  seedance: 'providerSeedance',
  kling: 'providerKling',
  veo: 'providerVeo',
  sora: 'providerSora',
  'minimax-video': 'providerMiniMaxVideo',
  'grok-video': 'providerGrokVideo',
};

const VIDEO_PROVIDER_ICONS: Record<VideoProviderId, string> = {
  seedance: '/logos/doubao.svg',
  kling: '/logos/kling.svg',
  veo: '/logos/gemini.svg',
  sora: '/logos/openai.svg',
  'minimax-video': '/logos/minimax.svg',
  'grok-video': '/logos/grok.svg',
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: SettingsSection;
}

export function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const { t } = useI18n();

  // 正向同步标记：确保 Dialog 打开时只触发一次 DB → Store 同步
  const hasSyncedOnOpen = useRef(false);

  // === 关键修复：Dialog 打开时，从数据库正向同步到 OpenMAIC Store ===
  // 解决「换浏览器看不到已保存配置」的核心 Bug：
  // 新浏览器的 localStorage 为空 → OpenMAIC Store 用默认空值初始化
  // 如果不在 Dialog 打开时先从 DB 加载，Dialog 显示的就是空值，
  // 关闭时反向同步还会把空值覆盖到 DB，导致已有配置丢失。
  useEffect(() => {
    if (open && !hasSyncedOnOpen.current) {
      hasSyncedOnOpen.current = true;
      const currentChild = useChildStore.getState().currentChild;
      if (currentChild?.settings) {
        console.log('[SettingsDialog] 📥 打开时正向同步 DB → Store, child:', currentChild.id);
        syncSettingsToOpenMAIC(currentChild.settings);
      }
    }
    if (!open) {
      hasSyncedOnOpen.current = false;
    }
  }, [open]);

  // 包装 onOpenChange，在关闭时自动反向同步到数据库
  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // 关闭弹窗时，将 OpenMAIC Settings Store 反向同步到数据库
      syncOpenMAICToChild().then((ok) => {
        if (ok) {
          console.log('[SettingsDialog] ✅ 设置已反向同步到数据库')
        }
      }).catch((err) => {
        console.error('[SettingsDialog] ❌ 反向同步失败:', err)
      })
    }
  }, [onOpenChange]);

  // Get settings from store
  const activeProviderId = useSettingsStore((state) => state.providerId);
  const activeModelId = useSettingsStore((state) => state.modelId);
  const providersConfig = useSettingsStore((state) => state.providersConfig);
  const pdfProviderId = useSettingsStore((state) => state.pdfProviderId);
  const pdfProvidersConfig = useSettingsStore((state) => state.pdfProvidersConfig);
  const webSearchProviderId = useSettingsStore((state) => state.webSearchProviderId);
  const webSearchProvidersConfig = useSettingsStore((state) => state.webSearchProvidersConfig);
  const imageProviderId = useSettingsStore((state) => state.imageProviderId);
  const imageProvidersConfig = useSettingsStore((state) => state.imageProvidersConfig);
  const videoProviderId = useSettingsStore((state) => state.videoProviderId);
  const videoProvidersConfig = useSettingsStore((state) => state.videoProvidersConfig);
  const ttsProviderId = useSettingsStore((state) => state.ttsProviderId);
  const ttsProvidersConfig = useSettingsStore((state) => state.ttsProvidersConfig);
  const asrProviderId = useSettingsStore((state) => state.asrProviderId);
  const asrProvidersConfig = useSettingsStore((state) => state.asrProvidersConfig);
  const iseProviderId = useSettingsStore((state) => state.iseProviderId);
  const iseProvidersConfig = useSettingsStore((state) => state.iseProvidersConfig);

  // Store actions
  const setModel = useSettingsStore((state) => state.setModel);
  const setProviderConfig = useSettingsStore((state) => state.setProviderConfig);
  const setProvidersConfig = useSettingsStore((state) => state.setProvidersConfig);
  const setTTSProvider = useSettingsStore((state) => state.setTTSProvider);
  const setASRProvider = useSettingsStore((state) => state.setASRProvider);
  const setISEProvider = useSettingsStore((state) => state.setISEProvider);
  const setImageProvider = useSettingsStore((state) => state.setImageProvider);
  const setVideoProvider = useSettingsStore((state) => state.setVideoProvider);
  const setPDFProvider = useSettingsStore((state) => state.setPDFProvider);
  const setWebSearchProvider = useSettingsStore((state) => state.setWebSearchProvider);

  // Navigation
  const [activeSection, setActiveSection] = useState<SettingsSection>('providers');
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(activeProviderId);
  const [selectedPdfProviderId, setSelectedPdfProviderId] = useState<PDFProviderId>(pdfProviderId);
  const [selectedWebSearchProviderId, setSelectedWebSearchProviderId] =
    useState<WebSearchProviderId>(webSearchProviderId);
  const [selectedImageProviderId, setSelectedImageProviderId] =
    useState<ImageProviderId>(imageProviderId);
  const [selectedVideoProviderId, setSelectedVideoProviderId] =
    useState<VideoProviderId>(videoProviderId);
  // Navigate to initialSection when dialog opens
  useEffect(() => {
    if (open && initialSection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync section from prop when dialog opens
      setActiveSection(initialSection);
    }
  }, [open, initialSection]);

  useEffect(() => {
    setSelectedProviderId(activeProviderId);
  }, [activeProviderId]);

  // Model editing state
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);

  // Provider deletion confirmation
  const [providerToDelete, setProviderToDelete] = useState<ProviderId | null>(null);

  // Add provider dialog
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Resizable column widths
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const [providerListWidth, setProviderListWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{
    target: 'sidebar' | 'providerList';
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, target: 'sidebar' | 'providerList') => {
      e.preventDefault();
      const startWidth = target === 'sidebar' ? sidebarWidth : providerListWidth;
      resizeRef.current = { target, startX: e.clientX, startWidth };
      setIsResizing(true);
    },
    [sidebarWidth, providerListWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { target, startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(120, Math.min(360, startWidth + delta));
      if (target === 'sidebar') {
        setSidebarWidth(newWidth);
      } else {
        setProviderListWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleSave = () => {
    handleOpenChange(false);
  };

  const handleProviderSelect = (pid: ProviderId) => {
    setSelectedProviderId(pid);
  };

  const handleProviderConfigChange = (
    pid: ProviderId,
    apiKey: string,
    baseUrl: string,
    requiresApiKey: boolean,
  ) => {
    setProviderConfig(pid, {
      apiKey,
      baseUrl,
      requiresApiKey,
    });
  };

  const handleProviderConfigSave = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const selectedProvider = providersConfig[selectedProviderId]
    ? {
        id: selectedProviderId,
        name: providersConfig[selectedProviderId].name,
        type: providersConfig[selectedProviderId].type,
        defaultBaseUrl: providersConfig[selectedProviderId].defaultBaseUrl,
        icon: providersConfig[selectedProviderId].icon,
        requiresApiKey: providersConfig[selectedProviderId].requiresApiKey,
        models: providersConfig[selectedProviderId].models,
      }
    : undefined;

  const activeProviderConfig = providersConfig[activeProviderId];
  const activeModelInfo = activeProviderConfig?.models?.find((model) => model.id === activeModelId);
  const currentProviderName = activeProviderConfig
    ? getProviderDisplayName(activeProviderId, activeProviderConfig.name, t)
    : activeProviderId;
  const currentModelName = activeModelInfo?.name || activeModelId || t('settings.selectModel');

  const getFallbackActiveSelection = (config: typeof providersConfig, preferredProviderId?: ProviderId) => {
    const pickFirstModel = (providerId: ProviderId | undefined) => {
      if (!providerId) return null;
      const modelId = config[providerId]?.models?.[0]?.id;
      return modelId ? { providerId, modelId } : null;
    };

    const preferredSelection = pickFirstModel(preferredProviderId);
    if (preferredSelection) return preferredSelection;

    for (const [providerId, providerConfig] of Object.entries(config) as Array<
      [ProviderId, (typeof providersConfig)[ProviderId]]
    >) {
      const modelId = providerConfig.models[0]?.id;
      if (modelId) {
        return { providerId, modelId };
      }
    }

    return null;
  };

  const handleModelChange = (providerId: ProviderId, modelId: string) => {
    setModel(providerId, modelId);
    setSelectedProviderId(providerId);
    handleProviderConfigSave();
  };

  const openAddModelDialog = (providerId: ProviderId) => {
    setSelectedProviderId(providerId);
    setEditingModel({
      providerId,
      modelIndex: null,
      model: {
        id: '',
        name: '',
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
        },
      },
    });
    setShowModelDialog(true);
  };

  // Handle model editing
  const handleEditModel = (pid: ProviderId, modelIndex: number) => {
    const allModels = providersConfig[pid]?.models || [];
    setEditingModel({
      providerId: pid,
      modelIndex,
      model: { ...allModels[modelIndex] },
    });
    setShowModelDialog(true);
  };

  const handleAddModel = () => {
    openAddModelDialog(selectedProviderId);
  };

  const handleDeleteModel = (pid: ProviderId, modelIndex: number) => {
    const currentModels = providersConfig[pid]?.models || [];
    const deletedModel = currentModels[modelIndex];
    const newModels = currentModels.filter((_, i) => i !== modelIndex);
    const nextConfig = {
      ...providersConfig,
      [pid]: {
        ...providersConfig[pid],
        models: newModels,
      },
    };

    setProviderConfig(pid, { models: newModels });

    if (activeProviderId === pid && deletedModel?.id === activeModelId) {
      const fallbackSelection = getFallbackActiveSelection(nextConfig, pid);
      if (fallbackSelection) {
        setModel(fallbackSelection.providerId, fallbackSelection.modelId);
        setSelectedProviderId(fallbackSelection.providerId);
      }
    }
  };

  const handleAutoSaveModel = () => {
    if (!editingModel) return;
    const { providerId: pid, modelIndex, model } = editingModel;
    if (!model.id.trim()) return;
    const currentModels = providersConfig[pid]?.models || [];
    let newModels: typeof currentModels;
    let newModelIndex = modelIndex;

    if (modelIndex === null) {
      const existingIndex = currentModels.findIndex((m) => m.id === model.id);
      if (existingIndex >= 0) {
        newModels = [...currentModels];
        newModels[existingIndex] = model;
        newModelIndex = existingIndex;
      } else {
        newModels = [...currentModels, model];
        newModelIndex = newModels.length - 1;
      }
      setProviderConfig(pid, { models: newModels });
      setEditingModel({ ...editingModel, modelIndex: newModelIndex });
    } else {
      newModels = [...currentModels];
      newModels[modelIndex] = model;
      setProviderConfig(pid, { models: newModels });
    }
  };

  const handleSaveModel = () => {
    if (!editingModel) return;
    const { providerId: pid, modelIndex, model } = editingModel;
    if (!model.id.trim()) {
      toast.error(t('settings.modelIdRequired'));
      return;
    }
    const currentModels = providersConfig[pid]?.models || [];
    let newModels: typeof currentModels;
    if (modelIndex === null) {
      newModels = [...currentModels, model];
    } else {
      newModels = [...currentModels];
      newModels[modelIndex] = model;
    }
    setProviderConfig(pid, { models: newModels });
    setShowModelDialog(false);
    setEditingModel(null);
  };

  // Handle provider management
  const handleAddProvider = (providerData: NewProviderData) => {
    if (!providerData.name.trim()) {
      toast.error(t('settings.providerNameRequired'));
      return;
    }
    const newProviderId = `custom-${Date.now()}` as ProviderId;
    const updatedConfig = {
      ...providersConfig,
      [newProviderId]: {
        apiKey: '',
        baseUrl: '',
        models: [],
        name: providerData.name,
        type: providerData.type,
        defaultBaseUrl: providerData.baseUrl || undefined,
        icon: providerData.icon || undefined,
        requiresApiKey: providerData.requiresApiKey,
        isBuiltIn: false,
      },
    };
    setProvidersConfig(updatedConfig);
    setShowAddProviderDialog(false);
    setSelectedProviderId(newProviderId);
  };

  const handleDeleteProvider = (pid: ProviderId) => {
    if (providersConfig[pid]?.isBuiltIn) {
      toast.error(t('settings.cannotDeleteBuiltIn'));
      return;
    }
    setProviderToDelete(pid);
  };

  const confirmDeleteProvider = () => {
    if (!providerToDelete) return;
    const pid = providerToDelete;
    const updatedConfig = { ...providersConfig };
    delete updatedConfig[pid];
    setProvidersConfig(updatedConfig);
    if (selectedProviderId === pid) {
      const firstRemainingPid = Object.keys(updatedConfig)[0] as ProviderId | undefined;
      setSelectedProviderId(firstRemainingPid || 'openai');
    }
    if (activeProviderId === pid) {
      const firstRemainingPid = Object.keys(updatedConfig)[0] as ProviderId | undefined;
      const firstModel = firstRemainingPid
        ? updatedConfig[firstRemainingPid]?.serverModels?.[0] ||
          updatedConfig[firstRemainingPid]?.models?.[0]?.id
        : undefined;
      if (firstRemainingPid && firstModel) {
        setModel(firstRemainingPid, firstModel);
      } else {
        setModel('openai' as ProviderId, 'gpt-4o-mini');
      }
    }
    setProviderToDelete(null);
  };

  const handleResetProvider = (pid: ProviderId) => {
    const provider = PROVIDERS[pid];
    if (!provider) return;

    const resetModels = [...provider.models];
    const nextConfig = {
      ...providersConfig,
      [pid]: {
        ...providersConfig[pid],
        models: resetModels,
      },
    };

    setProviderConfig(pid, { models: resetModels });

    if (activeProviderId === pid && !resetModels.some((model) => model.id === activeModelId)) {
      const fallbackSelection = getFallbackActiveSelection(nextConfig, pid);
      if (fallbackSelection) {
        setModel(fallbackSelection.providerId, fallbackSelection.modelId);
        setSelectedProviderId(fallbackSelection.providerId);
      }
    }

    toast.success(t('settings.resetSuccess'));
  };

  // Get all providers from providersConfig
  const allProviders = Object.entries(providersConfig).map(([id, config]) => ({
    id: id as ProviderId,
    name: config.name,
    type: config.type,
    defaultBaseUrl: config.defaultBaseUrl,
    icon: config.icon,
    requiresApiKey: config.requiresApiKey,
    models: config.models,
    isServerConfigured: config.isServerConfigured,
  }));

  const sectionItems = [
    {
      id: 'providers' as SettingsSection,
      label: t('settings.providers'),
      subtitle: '先配对话模型',
      icon: Box,
    },
    {
      id: 'image' as SettingsSection,
      label: t('settings.imageSettings'),
      subtitle: '课堂插图生成',
      icon: ImageIcon,
    },
    {
      id: 'video' as SettingsSection,
      label: t('settings.videoSettings'),
      subtitle: '故事视频生成',
      icon: Film,
    },
    {
      id: 'tts' as SettingsSection,
      label: t('settings.ttsSettings'),
      subtitle: '老师开口说话',
      icon: Volume2,
    },
    {
      id: 'asr' as SettingsSection,
      label: t('settings.asrSettings'),
      subtitle: '默认免配置可用',
      icon: Mic,
    },
    {
      id: 'ise' as SettingsSection,
      label: '发音评测',
      subtitle: '口语打分反馈',
      icon: Mic,
    },
    {
      id: 'pdf' as SettingsSection,
      label: t('settings.pdfSettings'),
      subtitle: '解析 PDF 资料',
      icon: FileText,
    },
    {
      id: 'web-search' as SettingsSection,
      label: t('settings.webSearchSettings'),
      subtitle: '联网搜索信息',
      icon: Search,
    },
    {
      id: 'general' as SettingsSection,
      label: t('settings.activeModel'),
      subtitle: '查看并切换当前模型',
      icon: Settings,
    },
  ];

  const activeSectionItem = sectionItems.find((item) => item.id === activeSection) ?? sectionItems[0];
  const ActiveSectionIcon = activeSectionItem.icon;

  // Get header content based on section
  const getHeaderContent = () => {
    switch (activeSection) {
      case 'general':
        return <h2 className="text-lg font-semibold">{t('settings.activeModel')}</h2>;
      case 'providers':
        if (selectedProvider) {
          return (
            <div>
              <h2 className="text-lg font-semibold">
                {getProviderDisplayName(selectedProvider.id, selectedProvider.name, t)}
              </h2>
              <p className="text-xs text-muted-foreground">
                {getProviderTypeLabel(selectedProvider.type, t)}
              </p>
            </div>
          );
        }
        return null;
      case 'pdf': {
        const pdfProvider = PDF_PROVIDERS[selectedPdfProviderId];
        if (!pdfProvider) return null;
        return <h2 className="text-lg font-semibold">{pdfProvider.name}</h2>;
      }
      case 'web-search': {
        const wsProvider = WEB_SEARCH_PROVIDERS[selectedWebSearchProviderId];
        if (!wsProvider) return null;
        return <h2 className="text-lg font-semibold">{wsProvider.name}</h2>;
      }
      case 'image': {
        const imgProvider = IMAGE_PROVIDERS[selectedImageProviderId];
        return (
          <h2 className="text-lg font-semibold">
            {t(`settings.${IMAGE_PROVIDER_NAMES[selectedImageProviderId]}`) || imgProvider?.name}
          </h2>
        );
      }
      case 'video': {
        const vidProvider = VIDEO_PROVIDERS[selectedVideoProviderId];
        return (
          <h2 className="text-lg font-semibold">
            {t(`settings.${VIDEO_PROVIDER_NAMES[selectedVideoProviderId]}`) || vidProvider?.name}
          </h2>
        );
      }
      case 'tts':
        return <h2 className="text-lg font-semibold">{getTTSProviderName(ttsProviderId, t)}</h2>;
      case 'asr':
        return <h2 className="text-lg font-semibold">{getASRProviderName(asrProviderId, t)}</h2>;
      case 'ise':
        return <h2 className="text-lg font-semibold">{getISEProviderName(iseProviderId)}</h2>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[1101] block h-[90vh] w-[min(1400px,98vw)] max-w-[98vw] gap-0 overflow-hidden rounded-[32px] border border-white/70 bg-[#fffaf6] p-0 shadow-[0_30px_120px_rgba(15,23,42,0.18)]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t('settings.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('settings.description')}</DialogDescription>
        <div className="flex h-full overflow-hidden bg-gradient-to-br from-orange-50 via-rose-50 to-sky-50">
          {/* Left Sidebar - Navigation */}
          <div
            className="flex-shrink-0 border-r border-orange-100/80 bg-white/70 p-3 backdrop-blur-sm"
            style={{ width: sidebarWidth }}
          >
            <div className="mb-3 rounded-[24px] border border-orange-100 bg-gradient-to-br from-orange-100 via-amber-50 to-white p-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 text-white shadow-sm">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800">AI 设置</div>
                  <p className="text-[11px] leading-4 text-slate-400">配置模型与语音能力</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto pb-2">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'group w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200',
                      isActive
                        ? 'border-orange-200 bg-gradient-to-r from-orange-50 via-rose-50 to-white shadow-[0_10px_24px_rgba(249,115,22,0.10)]'
                        : 'border-transparent bg-white/70 hover:border-orange-100 hover:bg-white',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition-colors',
                          isActive
                            ? 'bg-gradient-to-br from-orange-400 to-pink-400 text-white ring-orange-200'
                            : 'bg-slate-50 text-slate-500 ring-slate-200/70 group-hover:bg-orange-50 group-hover:text-orange-500',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{item.label}</div>
                        <div className="mt-1 truncate text-[11px] text-slate-500">{item.subtitle}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar resize handle */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'sidebar')}
            className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
          >
            <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
          </div>

          {/* Middle - Provider List (only shown for provider-based sections) */}
          {activeSection === 'providers' && (
            <>
              <ProviderList
                providers={allProviders}
                selectedProviderId={selectedProviderId}
                activeProviderId={activeProviderId}
                activeProviderName={currentProviderName}
                activeModelName={currentModelName}
                onSelect={handleProviderSelect}
                onAddProvider={() => setShowAddProviderDialog(true)}
                width={providerListWidth}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'pdf' && (
            <>
              <ProviderListColumn
                providers={Object.values(PDF_PROVIDERS)}
                configs={pdfProvidersConfig}
                selectedId={selectedPdfProviderId}
                activeId={pdfProviderId}
                onSelect={(id: PDFProviderId) => {
                  setSelectedPdfProviderId(id);
                  setPDFProvider(id);
                }}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'web-search' && (
            <>
              <ProviderListColumn
                providers={Object.values(WEB_SEARCH_PROVIDERS)}
                configs={webSearchProvidersConfig}
                selectedId={selectedWebSearchProviderId}
                activeId={webSearchProviderId}
                onSelect={(id: WebSearchProviderId) => {
                  setSelectedWebSearchProviderId(id);
                  setWebSearchProvider(id);
                }}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'image' && (
            <>
              <ProviderListColumn
                providers={Object.values(IMAGE_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: t(`settings.${IMAGE_PROVIDER_NAMES[p.id]}`) || p.name,
                  icon: IMAGE_PROVIDER_ICONS[p.id],
                }))}
                configs={imageProvidersConfig}
                selectedId={selectedImageProviderId}
                activeId={imageProviderId}
                onSelect={(id: ImageProviderId) => {
                  setSelectedImageProviderId(id);
                  setImageProvider(id);
                }}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'video' && (
            <>
              <ProviderListColumn
                providers={Object.values(VIDEO_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: t(`settings.${VIDEO_PROVIDER_NAMES[p.id]}`) || p.name,
                  icon: VIDEO_PROVIDER_ICONS[p.id],
                }))}
                configs={videoProvidersConfig}
                selectedId={selectedVideoProviderId}
                activeId={videoProviderId}
                onSelect={(id: VideoProviderId) => {
                  setSelectedVideoProviderId(id);
                  setVideoProvider(id);
                }}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'tts' && (
            <>
              <ProviderListColumn
                providers={Object.values(TTS_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: getTTSProviderName(p.id, t),
                  icon: p.icon,
                }))}
                configs={ttsProvidersConfig}
                selectedId={ttsProviderId}
                activeId={ttsProviderId}
                onSelect={setTTSProvider}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'asr' && (
            <>
              <ProviderListColumn
                providers={Object.values(ASR_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: getASRProviderName(p.id, t),
                  icon: p.icon,
                }))}
                configs={asrProvidersConfig}
                selectedId={asrProviderId}
                activeId={asrProviderId}
                onSelect={setASRProvider}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {activeSection === 'ise' && (
            <>
              <ProviderListColumn
                providers={Object.values(ISE_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: p.name,
                  icon: p.icon,
                }))}
                configs={iseProvidersConfig}
                selectedId={iseProviderId}
                activeId={iseProviderId}
                onSelect={setISEProvider}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="w-px h-full bg-border group-hover:bg-primary/50 transition-colors" />
              </div>
            </>
          )}

          {/* Right - Configuration Panel */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-orange-100/80 bg-white/75 px-6 py-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-pink-400 text-white shadow-[0_12px_30px_rgba(249,115,22,0.18)]">
                    <ActiveSectionIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-600 ring-1 ring-orange-100">
                        {activeSectionItem.label}
                      </span>
                      {activeSection === 'asr' && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-100">
                          默认免 Key
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center gap-3 text-slate-800">{getHeaderContent()}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{getSectionSummary(activeSection)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {activeSection === 'providers' &&
                    !providersConfig[selectedProviderId]?.isBuiltIn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-2xl px-3 text-destructive hover:bg-red-50 hover:text-destructive"
                        onClick={() => handleDeleteProvider(selectedProviderId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-2xl hover:bg-slate-100"
                    onClick={() => handleOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Section summary removed - already shown in header */}

              {activeSection === 'general' && (
                <GeneralSettings
                  activeProviderId={activeProviderId}
                  activeModelId={activeModelId}
                  currentProviderName={currentProviderName}
                  currentModelName={currentModelName}
                  providersConfig={providersConfig}
                  onModelChange={setModel}
                />
              )}

              {activeSection === 'providers' && selectedProvider && (
                <ProviderConfigPanel
                  provider={selectedProvider}
                  activeProviderId={activeProviderId}
                  activeModelId={activeModelId}
                  activeProviderName={currentProviderName}
                  activeModelName={currentModelName}
                  onSetActiveModel={(modelId) => setModel(selectedProviderId, modelId)}
                  initialApiKey={providersConfig[selectedProviderId]?.apiKey || ''}
                  initialBaseUrl={providersConfig[selectedProviderId]?.baseUrl || ''}
                  initialRequiresApiKey={
                    providersConfig[selectedProviderId]?.requiresApiKey ?? true
                  }
                  providersConfig={providersConfig}
                  onConfigChange={(apiKey, baseUrl, requiresApiKey) =>
                    handleProviderConfigChange(selectedProviderId, apiKey, baseUrl, requiresApiKey)
                  }
                  onSave={handleProviderConfigSave}
                  onEditModel={(index) => handleEditModel(selectedProviderId, index)}
                  onDeleteModel={(index) => handleDeleteModel(selectedProviderId, index)}
                  onAddModel={handleAddModel}
                  onResetToDefault={() => handleResetProvider(selectedProviderId)}
                  isBuiltIn={providersConfig[selectedProviderId]?.isBuiltIn ?? true}
                />
              )}

              {activeSection === 'pdf' && (
                <PDFSettings selectedProviderId={selectedPdfProviderId} />
              )}
              {activeSection === 'web-search' && (
                <WebSearchSettings selectedProviderId={selectedWebSearchProviderId} />
              )}
              {activeSection === 'image' && (
                <ImageSettings selectedProviderId={selectedImageProviderId} />
              )}
              {activeSection === 'video' && (
                <VideoSettings selectedProviderId={selectedVideoProviderId} />
              )}
              {activeSection === 'tts' && <TTSSettings selectedProviderId={ttsProviderId} />}
              {activeSection === 'asr' && <ASRSettings selectedProviderId={asrProviderId} />}
              {activeSection === 'ise' && <ISESettings selectedProviderId={iseProviderId} />}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-orange-100/80 bg-white/80 px-6 py-3.5 backdrop-blur-sm">
              <div className="flex min-h-6 items-center gap-2 text-sm">
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-600 ring-1 ring-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{t('settings.saveSuccess')}</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-red-500 ring-1 ring-red-100">
                    <XCircle className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{t('settings.saveFailed')}</span>
                  </div>
                )}
                {saveStatus === 'idle' && (
                  <span className="text-xs text-slate-400">💡 {t('settings.autoSaveHint')}</span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  size="sm"
                  className="h-9 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 px-6 text-white shadow-[0_10px_24px_rgba(249,115,22,0.18)] hover:from-orange-500 hover:to-pink-500"
                  onClick={handleSave}
                >
                  ✓ {t('settings.done')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Edit Model Dialog */}
      <ModelEditDialog
        open={showModelDialog}
        onOpenChange={setShowModelDialog}
        editingModel={editingModel}
        setEditingModel={setEditingModel}
        onSave={handleSaveModel}
        onAutoSave={handleAutoSaveModel}
        providerId={selectedProviderId}
        apiKey={providersConfig[selectedProviderId]?.apiKey || ''}
        baseUrl={providersConfig[selectedProviderId]?.baseUrl}
        providerType={providersConfig[selectedProviderId]?.type}
        requiresApiKey={providersConfig[selectedProviderId]?.requiresApiKey}
        isServerConfigured={providersConfig[selectedProviderId]?.isServerConfigured}
      />

      {/* Add Provider Dialog */}
      <AddProviderDialog
        open={showAddProviderDialog}
        onOpenChange={setShowAddProviderDialog}
        onAdd={handleAddProvider}
      />

      {/* Delete Provider Confirmation */}
      <AlertDialog
        open={providerToDelete !== null}
        onOpenChange={(open) => !open && setProviderToDelete(null)}
      >
        <AlertDialogContent overlayClassName="z-[1200]" className="z-[1201]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteProvider')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteProviderConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.cancelEdit')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProvider}>
              {t('settings.deleteProvider')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
