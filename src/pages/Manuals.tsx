import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, Upload, X, BookOpen, ShieldCheck, PlusCircle, Wrench, Download, ExternalLink, LoaderCircle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';
import { getMachines, createMachine, deleteMachine, updateMachine, getChecklistTemplateByModel, updateChecklistTemplate, uploadMachineImage, uploadMachineManual } from '../lib/supabaseApi';
import { cacheUploadedManual, fetchAndCacheManual, getCachedManual, getCachedManualMachineIds, isPdfManual } from '../lib/offlineManuals';

interface Machine {
  id: number;
  name: string;
  model: string;
  image_url: string | null;
  manual_url: string | null;
  description: string;
  quick_specs: string[]; // array de especificações
}

const DEFAULT_MANUAL_CATEGORIES = ['Caminhões', 'Tratores', 'Máquinas'];
const MANUAL_CATEGORIES_KEY = 'manuals-categories';
const MACHINE_CATEGORY_MAP_KEY = 'manuals-machine-category-map';

function normalizeCategoryLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

interface ManualViewerModalProps {
  machine: Machine;
  onClose: () => void;
  onCacheReady?: (machineId: number) => void;
}

function getManualFileName(machine: Machine, cachedName?: string | null) {
  if (cachedName) return cachedName;

  const manualUrl = String(machine.manual_url || '').trim();
  if (!manualUrl) return `${machine.model || machine.name || 'manual'}.pdf`;

  try {
    const parsed = new URL(manualUrl);
    return parsed.pathname.split('/').pop() || `${machine.model || machine.name || 'manual'}.pdf`;
  } catch {
    const parts = manualUrl.split('/');
    return parts[parts.length - 1] || `${machine.model || machine.name || 'manual'}.pdf`;
  }
}

function ManualViewerModal({ machine, onClose, onCacheReady }: ManualViewerModalProps) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [downloadSrc, setDownloadSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [canRenderInline, setCanRenderInline] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState(getManualFileName(machine));

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadManual = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setViewerSrc(null);
      setDownloadSrc(machine.manual_url || null);

      const cachedManual = await getCachedManual(machine.id);
      const manualIsPdf = isPdfManual(machine.manual_url, cachedManual?.mime_type || null);
      setFileName(getManualFileName(machine, cachedManual?.file_name || null));

      if (cachedManual && manualIsPdf) {
        objectUrl = URL.createObjectURL(cachedManual.blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setViewerSrc(objectUrl);
        setDownloadSrc(objectUrl);
        setCanRenderInline(true);
        setIsCached(true);
        setIsLoading(false);
        return;
      }

      if (!machine.manual_url) {
        setErrorMessage('Este equipamento ainda não possui manual cadastrado.');
        setIsLoading(false);
        return;
      }

      if (!manualIsPdf) {
        setCanRenderInline(false);
        setIsCached(Boolean(cachedManual));
        setErrorMessage('Leitura dentro do site com cache offline está disponível para PDF. Para DOC ou DOCX, prefira converter o manual para PDF.');
        setIsLoading(false);
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorMessage('Este manual ainda não foi salvo offline neste dispositivo. Conecte-se uma vez para fazer o download local.');
        setIsLoading(false);
        return;
      }

      try {
        const downloaded = await fetchAndCacheManual(machine.id, machine.manual_url);
        objectUrl = URL.createObjectURL(downloaded.blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setViewerSrc(objectUrl);
        setDownloadSrc(objectUrl);
        setCanRenderInline(true);
        setIsCached(true);
        onCacheReady?.(machine.id);
      } catch (error) {
        console.error(error);
        setViewerSrc(machine.manual_url);
        setDownloadSrc(machine.manual_url);
        setCanRenderInline(true);
        setIsCached(false);
        setErrorMessage('Não foi possível salvar o manual offline agora. Exibindo a versão online enquanto houver conexão.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadManual();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [machine, onCacheReady]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        onClick={(event) => event.stopPropagation()}
        className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:rounded-[28px]"
      >
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{machine.name}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{machine.model}</span>
                {isCached && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Download size={12} /> Offline pronto
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">{fileName}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {machine.manual_url && (
                <a
                  href={machine.manual_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ExternalLink size={16} /> Abrir externo
                </a>
              )}

              {downloadSrc && (
                <a
                  href={downloadSrc}
                  download={fileName}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download size={16} /> Baixar
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                aria-label="Fechar visualizador"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 px-3 py-3 sm:px-5 sm:py-5">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {typeof navigator !== 'undefined' && !navigator.onLine ? <WifiOff size={18} className="mt-0.5 shrink-0" /> : <BookOpen size={18} className="mt-0.5 shrink-0" />}
                <p>{errorMessage}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex min-h-[50vh] flex-1 items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <LoaderCircle size={28} className="animate-spin" />
                  <p className="text-sm font-medium">Preparando manual para leitura...</p>
                </div>
              </div>
            ) : canRenderInline && viewerSrc ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <iframe
                  src={viewerSrc}
                  title={`Manual ${machine.name}`}
                  className="h-[68dvh] w-full sm:h-[72dvh]"
                />
              </div>
            ) : (
              <div className="flex min-h-[48vh] flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
                <FileText size={34} className="mb-3 text-slate-400" />
                <h4 className="text-lg font-semibold text-slate-800">Visualização interna indisponível para este formato</h4>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                  PDFs podem ser lidos dentro do site e ficam salvos offline neste dispositivo após o primeiro acesso.
                  Para DOC ou DOCX, use o botão externo ou envie o manual em PDF.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {machine.manual_url && (
                    <a
                      href={machine.manual_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      <ExternalLink size={16} /> Abrir arquivo
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Manuals() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'administrador';
  const [machines, setMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [isSavingMachine, setIsSavingMachine] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editMachineDraft, setEditMachineDraft] = useState({
    name: '',
    model: '',
    description: '',
    quickSpecs: ''
  });
  const [newMachine, setNewMachine] = useState({
    name: '',
    model: '',
    description: '',
    quickSpecs: [] as string[],
    imageFile: null as File | null
  });
  const [newMachineCategory, setNewMachineCategory] = useState('');
  const [editMachineCategory, setEditMachineCategory] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [manualCategories, setManualCategories] = useState<string[]>(DEFAULT_MANUAL_CATEGORIES);
  const [machineCategoryMap, setMachineCategoryMap] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<{category: string, items: string[]}[]>([]);
  const [viewerMachine, setViewerMachine] = useState<Machine | null>(null);
  const [cachedManualMachineIds, setCachedManualMachineIds] = useState<number[]>([]);

  const getMachineCategory = (machineId: number) => machineCategoryMap[String(machineId)] || '';
  const machineHasOfflineManual = (machineId: number) => cachedManualMachineIds.includes(machineId);

  const refreshCachedManuals = async () => {
    const ids = await getCachedManualMachineIds();
    setCachedManualMachineIds(ids);
  };

  const upsertMachineCategory = (machineId: number, category: string) => {
    const normalized = normalizeCategoryLabel(category);
    setMachineCategoryMap((prev) => {
      const next = { ...prev };
      if (!normalized) {
        delete next[String(machineId)];
      } else {
        next[String(machineId)] = normalized;
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MACHINE_CATEGORY_MAP_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const removeMachineCategory = (machineId: number) => {
    setMachineCategoryMap((prev) => {
      const next = { ...prev };
      delete next[String(machineId)];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MACHINE_CATEGORY_MAP_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const addManualCategory = () => {
    const normalized = normalizeCategoryLabel(categoryDraft);
    if (!normalized) {
      toast.error('Informe um nome de categoria.');
      return;
    }

    const alreadyExists = manualCategories.some(
      (category) => category.toLowerCase() === normalized.toLowerCase()
    );

    if (alreadyExists) {
      toast.warning('Essa categoria já existe.');
      return;
    }

    const next = [...manualCategories, normalized];
    setManualCategories(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_CATEGORIES_KEY, JSON.stringify(next));
    }
    setCategoryDraft('');
    toast.success('Categoria adicionada com sucesso.');
  };

  const removeManualCategory = (categoryToRemove: string) => {
    const nextCategories = manualCategories.filter((category) => category !== categoryToRemove);
    setManualCategories(nextCategories);

    if (selectedCategoryFilter === categoryToRemove) {
      setSelectedCategoryFilter('all');
    }
    if (newMachineCategory === categoryToRemove) {
      setNewMachineCategory('');
    }
    if (editMachineCategory === categoryToRemove) {
      setEditMachineCategory('');
    }

    setMachineCategoryMap((prev) => {
      const nextMap: Record<string, string> = {};
      for (const [machineId, category] of Object.entries(prev as Record<string, string>)) {
        if (category !== categoryToRemove) {
          nextMap[machineId] = category;
        }
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MACHINE_CATEGORY_MAP_KEY, JSON.stringify(nextMap));
      }
      return nextMap;
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_CATEGORIES_KEY, JSON.stringify(nextCategories));
    }

    toast.info('Categoria removida.');
  };

  const parseQuickSpecs = (quickSpecs: Machine['quick_specs']) => {
    try {
      if (Array.isArray(quickSpecs)) {
        return quickSpecs;
      }
      if (typeof quickSpecs === 'string') {
        const parsed = JSON.parse(quickSpecs);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  };

  const loadImageElement = (file: File) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Não foi possível carregar a imagem.'));
      };
      image.src = objectUrl;
    });
  };

  const cropAndOptimizeImage = async (file: File): Promise<File> => {
    const image = await loadImageElement(file);

    const targetWidth = 1280;
    const targetHeight = 720;
    const targetRatio = targetWidth / targetHeight;
    const sourceRatio = image.width / image.height;

    let sx = 0;
    let sy = 0;
    let sWidth = image.width;
    let sHeight = image.height;

    if (sourceRatio > targetRatio) {
      sWidth = image.height * targetRatio;
      sx = (image.width - sWidth) / 2;
    } else {
      sHeight = image.width / targetRatio;
      sy = (image.height - sHeight) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Falha ao preparar a imagem.');
    }

    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9);
    });

    if (!blob) {
      throw new Error('Falha ao otimizar a imagem.');
    }

    const safeBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    return new File([blob], `${safeBaseName}.jpg`, { type: 'image/jpeg' });
  };

  useEffect(() => {
    loadMachines();
    void refreshCachedManuals();

    const storedCategories = readJsonStorage<string[]>(MANUAL_CATEGORIES_KEY, []);
    const normalizedStored = Array.isArray(storedCategories)
      ? storedCategories
          .map((item) => normalizeCategoryLabel(String(item || '')))
          .filter(Boolean)
      : [];

    const mergedCategories = Array.from(new Set([...DEFAULT_MANUAL_CATEGORIES, ...normalizedStored]));
    setManualCategories(mergedCategories);

    const storedMap = readJsonStorage<Record<string, string>>(MACHINE_CATEGORY_MAP_KEY, {});
    const normalizedMap: Record<string, string> = {};
    for (const [machineId, category] of Object.entries(storedMap || {})) {
      const normalized = normalizeCategoryLabel(String(category || ''));
      if (normalized) {
        normalizedMap[machineId] = normalized;
      }
    }
    setMachineCategoryMap(normalizedMap);
  }, []);

  const loadMachines = async () => {
    const data = await getMachines();
    setMachines(data);
  };

  useEffect(() => {
    if (selectedMachine && isChecklistModalOpen) {
      loadChecklistTemplate();
    }
  }, [selectedMachine, isChecklistModalOpen]);

  useEffect(() => {
    if (!selectedMachine) return;
    const specs = parseQuickSpecs(selectedMachine.quick_specs);
    setEditMachineDraft({
      name: selectedMachine.name || '',
      model: selectedMachine.model || '',
      description: selectedMachine.description || '',
      quickSpecs: specs.join('\n')
    });
    setEditMachineCategory(getMachineCategory(selectedMachine.id));
    setIsEditingMachine(false);
    setEditImageFile(null);
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }
    setEditImagePreview(null);
  }, [selectedMachine]);

  const loadChecklistTemplate = async () => {
    if (!selectedMachine) return;
    const template = await getChecklistTemplateByModel(selectedMachine.model);
    if (template) {
      setChecklistItems(template.items || []);
    } else {
      setChecklistItems([]);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      e.target.value = '';
      return;
    }

    try {
      const processedFile = await cropAndOptimizeImage(file);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setNewMachine({ ...newMachine, imageFile: processedFile });
      setImagePreview(URL.createObjectURL(processedFile));
      toast.info('Imagem ajustada automaticamente para padrão 16:9.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível processar a imagem selecionada.');
    } finally {
      e.target.value = '';
    }
  };

  const handleQuickSpecsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
    setNewMachine({ ...newMachine, quickSpecs: lines });
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = null;
      
      // Upload image if provided
      if (newMachine.imageFile) {
        imageUrl = await uploadMachineImage(0, newMachine.imageFile); // Using 0 as temp ID
      }

      // Create machine in Supabase
      const machineData = {
        name: newMachine.name,
        model: newMachine.model,
        description: newMachine.description,
        quick_specs: JSON.stringify(newMachine.quickSpecs),
        image_url: imageUrl,
        manual_url: null
      };

      const result = await createMachine(machineData as any);
      
      if (result) {
        if (newMachineCategory) {
          upsertMachineCategory(result.id, newMachineCategory);
        }
        loadMachines();
        setIsMachineModalOpen(false);
        setNewMachine({ name: '', model: '', description: '', quickSpecs: [], imageFile: null });
        setNewMachineCategory('');
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        toast.success('Equipamento cadastrado com sucesso!');
      } else {
        toast.error('Erro ao cadastrar equipamento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cadastrar equipamento.');
    }
  };

  const handleDeleteMachine = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento? Todos os dados associados serão perdidos.')) return;
    try {
      const success = await deleteMachine(id);
      if (success) {
        loadMachines();
        removeMachineCategory(id);
        setSelectedMachine(null);
        toast.success('Equipamento excluído com sucesso!');
      } else {
        toast.error('Erro ao excluir equipamento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir equipamento.');
    }
  };

  const handleSaveChecklist = async () => {
    if (!selectedMachine) return;
    try {
      const result = await updateChecklistTemplate(selectedMachine.model, checklistItems);
      if (result) {
        setIsChecklistModalOpen(false);
        toast.success('Checklist atualizado com sucesso!');
      } else {
        toast.error('Erro ao atualizar checklist.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar checklist.');
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      e.target.value = '';
      return;
    }

    const maxImageSizeMb = 10;
    if (file.size > maxImageSizeMb * 1024 * 1024) {
      toast.error(`Imagem muito grande. Limite de ${maxImageSizeMb}MB.`);
      e.target.value = '';
      return;
    }

    void (async () => {
      try {
        const processedFile = await cropAndOptimizeImage(file);
        if (editImagePreview) {
          URL.revokeObjectURL(editImagePreview);
        }
        setEditImageFile(processedFile);
        setEditImagePreview(URL.createObjectURL(processedFile));
        toast.info('Imagem ajustada automaticamente para padrão 16:9.');
      } catch (err) {
        console.error(err);
        toast.error('Não foi possível processar a imagem selecionada.');
      } finally {
        e.target.value = '';
      }
    })();
  };

  const handleSaveMachineDetails = async () => {
    if (!selectedMachine) return;

    const name = editMachineDraft.name.trim();
    const model = editMachineDraft.model.trim();
    const description = editMachineDraft.description.trim();
    const quickSpecs = editMachineDraft.quickSpecs
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!name) {
      toast.error('Nome do equipamento é obrigatório.');
      return;
    }

    if (!model) {
      toast.error('Modelo do equipamento é obrigatório.');
      return;
    }

    setIsSavingMachine(true);
    try {
      let nextImageUrl = selectedMachine.image_url;
      if (editImageFile) {
        const uploadedImage = await uploadMachineImage(selectedMachine.id, editImageFile);
        if (!uploadedImage) {
          toast.error('Não foi possível enviar a nova imagem.');
          return;
        }
        nextImageUrl = uploadedImage;
      }

      const updated = await updateMachine(selectedMachine.id, {
        name,
        model,
        description,
        quick_specs: quickSpecs,
        image_url: nextImageUrl,
      } as any);

      if (!updated) {
        toast.error('Não foi possível salvar os dados do equipamento.');
        return;
      }

      upsertMachineCategory(selectedMachine.id, editMachineCategory);

      await loadMachines();
      setSelectedMachine({
        ...selectedMachine,
        name,
        model,
        description,
        quick_specs: quickSpecs as any,
        image_url: nextImageUrl,
      });
      setIsEditingMachine(false);
      setEditImageFile(null);
      setEditImagePreview(null);
      toast.success('Dados do equipamento atualizados com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar alterações do equipamento.');
    } finally {
      setIsSavingMachine(false);
    }
  };

  const handleUploadManual = async (e: React.ChangeEvent<HTMLInputElement>, machineId: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato inválido. Envie PDF, DOC ou DOCX.');
      e.target.value = '';
      return;
    }

    const maxSizeMb = 15;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Limite de ${maxSizeMb}MB.`);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const manualUrl = await uploadMachineManual(machineId, file);
      
      if (manualUrl) {
        const updatedMachine = await updateMachine(machineId, { manual_url: manualUrl } as any);
        if (!updatedMachine) {
          toast.warning('Manual enviado, mas não foi possível salvar o link no equipamento.');
          return;
        }
        
        await loadMachines();
        if (selectedMachine && selectedMachine.id === machineId) {
          setSelectedMachine({ ...selectedMachine, manual_url: manualUrl });
        }

        if (isPdfManual(manualUrl, file.type)) {
          await cacheUploadedManual(machineId, file, manualUrl);
          await refreshCachedManuals();
          toast.success('Manual enviado com sucesso e disponível offline neste dispositivo!');
        } else {
          toast.success('Manual enviado com sucesso! Para leitura offline ou online dentro do site, prefira PDF.');
        }
      } else {
        toast.error('Erro ao enviar manual. Verifique o bucket de storage "machines" e permissões de upload.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar manual.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch =
      machine.name.toLowerCase().includes(search.toLowerCase()) ||
      machine.model.toLowerCase().includes(search.toLowerCase());
    const machineCategory = getMachineCategory(machine.id);
    const matchesCategory =
      selectedCategoryFilter === 'all' || machineCategory === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const withManualCount = machines.filter((machine) => Boolean(machine.manual_url)).length;
  const withoutManualCount = Math.max(0, machines.length - withManualCount);

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manuais Técnicos</h2>
            <p className="text-slate-500">
              {isAdmin
                ? 'Gerencie equipamentos, manuais e documentação técnica em um único painel.'
                : 'Encontre rapidamente o manual correto para o equipamento em campo.'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsMachineModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <PlusCircle size={18} /> Novo Equipamento
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Equipamentos</p>
            <p className="text-2xl font-bold text-slate-900">{machines.length}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Com Manual</p>
            <p className="text-2xl font-bold text-emerald-700">{withManualCount}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Sem Manual</p>
            <p className="text-2xl font-bold text-amber-700">{withoutManualCount}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 mb-4 flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 text-emerald-300" />
            <div>
              <p className="font-semibold">Painel do Administrador</p>
              <p className="text-sm text-slate-300">Dica: priorize os equipamentos "Sem Manual" para reduzir dúvidas operacionais em campo.</p>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">Categorias de Filtro (Admin)</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                placeholder="Ex: Escadas"
                className="flex-1 p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
              />
              <button
                type="button"
                onClick={addManualCategory}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium"
              >
                Adicionar Categoria
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {manualCategories.map((category) => (
                <span key={category} className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-sm">
                  {category}
                  <button
                    type="button"
                    onClick={() => removeManualCategory(category)}
                    className="text-red-500 hover:text-red-700"
                    title="Remover categoria"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou modelo do equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="w-full sm:w-72">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="all">Todas as categorias</option>
                {manualCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-slate-500">
              Exibindo {filteredMachines.length} de {machines.length} equipamentos
            </div>
          </div>
        </div>
      </div>

      {filteredMachines.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center mb-6">
          <BookOpen size={34} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-800">Nenhum equipamento encontrado</h3>
          <p className="text-slate-500 mt-1">Tente ajustar a busca para localizar o manual correto.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMachines.map((machine) => (
          <motion.div
            key={machine.id}
            layoutId={`card-${machine.id}`}
            onClick={() => setSelectedMachine(machine)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-slate-100"
          >
            <div className="aspect-video bg-slate-100 relative overflow-hidden">
              <img 
                src={machine.image_url || 'https://picsum.photos/400/300'} 
                alt={machine.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white font-medium text-sm">Ver detalhes</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 truncate">{machine.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{machine.model}</p>
              {getMachineCategory(machine.id) && (
                <p className="text-xs font-medium text-indigo-700 bg-indigo-50 inline-flex px-2 py-1 rounded-md mb-3">
                  {getMachineCategory(machine.id)}
                </p>
              )}
              
              <div className="flex items-center justify-between gap-2 text-xs font-medium">
                {machine.manual_url ? (
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <FileText size={12} /> Manual Disponível
                  </span>
                ) : (
                  <span className="text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                    Sem manual
                  </span>
                )}

                {machine.manual_url ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerMachine(machine);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md"
                  >
                    Abrir
                  </button>
                ) : (
                  <span className="text-slate-400">Detalhes</span>
                )}
              </div>

              {machineHasOfflineManual(machine.id) && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <Download size={12} /> Disponível offline
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de criação de equipamento */}
      <AnimatePresence>
        {isMachineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Novo Equipamento</h3>
              <form onSubmit={handleCreateMachine} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={newMachine.name}
                    onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    required
                    value={newMachine.model}
                    onChange={e => setNewMachine({ ...newMachine, model: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select
                    value={newMachineCategory}
                    onChange={(e) => setNewMachineCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                  >
                    <option value="">Sem categoria</option>
                    {manualCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto do Equipamento</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={newMachine.description}
                    onChange={e => setNewMachine({ ...newMachine, description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especificações Rápidas (uma por linha)</label>
                  <textarea
                    value={newMachine.quickSpecs.join('\n')}
                    onChange={handleQuickSpecsChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    rows={4}
                    placeholder="Ex: Motor Diesel&#10;Hidráulica de Alta Pressão&#10;Cabine Climatizada"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMachineModalOpen(false);
                      setNewMachine({ name: '', model: '', description: '', quickSpecs: [], imageFile: null });
                      setNewMachineCategory('');
                      if (imagePreview) {
                        URL.revokeObjectURL(imagePreview);
                      }
                      setImagePreview(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de detalhes do equipamento */}
      <AnimatePresence>
        {selectedMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMachine(null)}>
            <motion.div 
              layoutId={`card-${selectedMachine.id}`}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-48 sm:h-64 bg-slate-100">
                <img 
                  src={editImagePreview || selectedMachine.image_url || 'https://picsum.photos/400/300'} 
                  alt={selectedMachine.name}
                  className="w-full h-full object-cover"
                />
                {isAdmin && isEditingMachine && (
                  <div className="absolute left-3 bottom-3">
                    <label className="bg-white/90 hover:bg-white text-slate-800 text-sm font-medium px-3 py-2 rounded-lg shadow cursor-pointer inline-flex items-center gap-2">
                      <Upload size={14} /> Trocar Foto
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditImageChange}
                        disabled={isSavingMachine}
                      />
                    </label>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedMachine(null)}
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {isEditingMachine ? editMachineDraft.name || 'Editar Equipamento' : selectedMachine.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-slate-500">
                      <span className="bg-slate-100 px-3 py-1 rounded-full">
                        {isEditingMachine ? editMachineDraft.model || 'Modelo' : selectedMachine.model}
                      </span>
                      {!!getMachineCategory(selectedMachine.id) && (
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">
                          {getMachineCategory(selectedMachine.id)}
                        </span>
                      )}
                      <span>Atualizado em: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      {!isEditingMachine ? (
                        <button
                          onClick={() => setIsEditingMachine(true)}
                          className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          Editar Dados
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const specs = parseQuickSpecs(selectedMachine.quick_specs);
                              setEditMachineDraft({
                                name: selectedMachine.name || '',
                                model: selectedMachine.model || '',
                                description: selectedMachine.description || '',
                                quickSpecs: specs.join('\n'),
                              });
                              setEditImageFile(null);
                              if (editImagePreview) {
                                URL.revokeObjectURL(editImagePreview);
                              }
                              setEditImagePreview(null);
                              setEditMachineCategory(getMachineCategory(selectedMachine.id));
                              setIsEditingMachine(false);
                            }}
                            className="text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-sm font-medium"
                            disabled={isSavingMachine}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveMachineDetails}
                            className="text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg text-sm font-medium"
                            disabled={isSavingMachine}
                          >
                            {isSavingMachine ? 'Salvando...' : 'Salvar'}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDeleteMachine(selectedMachine.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Excluir Equipamento"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="prose prose-slate max-w-none mb-8">
                  {isEditingMachine ? (
                    <div className="not-prose space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                          <input
                            type="text"
                            value={editMachineDraft.name}
                            onChange={(e) => setEditMachineDraft((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                          <input
                            type="text"
                            value={editMachineDraft.model}
                            onChange={(e) => setEditMachineDraft((prev) => ({ ...prev, model: e.target.value }))}
                            className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                          <select
                            value={editMachineCategory}
                            onChange={(e) => setEditMachineCategory(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                          >
                            <option value="">Sem categoria</option>
                            {manualCategories.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea
                          value={editMachineDraft.description}
                          onChange={(e) => setEditMachineDraft((prev) => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Especificações rápidas (uma por linha)</label>
                        <textarea
                          value={editMachineDraft.quickSpecs}
                          onChange={(e) => setEditMachineDraft((prev) => ({ ...prev, quickSpecs: e.target.value }))}
                          rows={5}
                          className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-lg font-semibold text-slate-800 mb-2">Descrição do Equipamento</h4>
                      <p className="text-slate-600 leading-relaxed">
                        {selectedMachine.description}
                      </p>

                      <h4 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Especificações Rápidas</h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                        {selectedMachine.quick_specs ? (() => {
                          const specs = parseQuickSpecs(selectedMachine.quick_specs);
                          return specs.length > 0 ? (
                            specs.map((spec, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> {spec}
                              </li>
                            ))
                          ) : (
                            <li className="col-span-2 text-slate-400">Nenhuma especificação</li>
                          );
                        })() : (
                          <li className="text-slate-400">Nenhuma especificação cadastrada.</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
                  <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 flex items-center gap-2">
                    <Wrench size={16} className="text-slate-500" />
                    {isAdmin
                      ? 'Área administrativa: faça upload de novos manuais e mantenha o catálogo atualizado.'
                      : 'Fluxo intuitivo: abra o manual com um clique e consulte em campo.'}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {selectedMachine.manual_url ? (
                      <button
                        type="button"
                        onClick={() => setViewerMachine(selectedMachine)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
                      >
                        <FileText size={20} />
                        Ler Manual no Site
                      </button>
                    ) : (
                      <button disabled className="flex-1 bg-slate-100 text-slate-400 font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                        <FileText size={20} />
                        Manual Indisponível
                      </button>
                    )}

                    {isAdmin && (
                      <label className={`flex-1 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-600 font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload size={20} />
                        {isUploading ? 'Enviando...' : 'Upload Novo Manual'}
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx" 
                          className="hidden" 
                          onChange={(e) => handleUploadManual(e, selectedMachine.id)}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={() => setIsChecklistModalOpen(true)}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileText size={20} /> Editar Template de Checklist
                    </button>
                  )}

                  {selectedMachine.manual_url && machineHasOfflineManual(selectedMachine.id) && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                      Este manual já está salvo offline neste dispositivo.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerMachine && (
          <ManualViewerModal
            machine={viewerMachine}
            onClose={() => setViewerMachine(null)}
            onCacheReady={(machineId) => {
              setCachedManualMachineIds((prev) => (prev.includes(machineId) ? prev : [...prev, machineId]));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMachine && isChecklistModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Template de Checklist</h3>
                  <p className="text-sm text-slate-500">{selectedMachine.name} - {selectedMachine.model}</p>
                </div>
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {checklistItems.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
                      <input
                        type="text"
                        value={category.category}
                        onChange={(e) => {
                          const next = [...checklistItems];
                          next[categoryIndex] = {
                            ...next[categoryIndex],
                            category: e.target.value,
                          };
                          setChecklistItems(next);
                        }}
                        placeholder="Nome da categoria"
                        className="flex-1 p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                      />
                      <button
                        onClick={() => {
                          setChecklistItems((prev) => prev.filter((_, idx) => idx !== categoryIndex));
                        }}
                        className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
                      >
                        Remover Categoria
                      </button>
                    </div>

                    <div className="space-y-2">
                      {category.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const next = [...checklistItems];
                              const nextItems = [...next[categoryIndex].items];
                              nextItems[itemIndex] = e.target.value;
                              next[categoryIndex] = {
                                ...next[categoryIndex],
                                items: nextItems,
                              };
                              setChecklistItems(next);
                            }}
                            placeholder="Item do checklist"
                            className="flex-1 p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-200 outline-none"
                          />
                          <button
                            onClick={() => {
                              const next = [...checklistItems];
                              next[categoryIndex] = {
                                ...next[categoryIndex],
                                items: next[categoryIndex].items.filter((_, idx) => idx !== itemIndex),
                              };
                              setChecklistItems(next);
                            }}
                            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const next = [...checklistItems];
                        next[categoryIndex] = {
                          ...next[categoryIndex],
                          items: [...next[categoryIndex].items, ''],
                        };
                        setChecklistItems(next);
                      }}
                      className="mt-3 text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800"
                    >
                      Adicionar Item
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setChecklistItems((prev) => [...prev, { category: '', items: [''] }])}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg"
                >
                  Nova Categoria
                </button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChecklist}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg"
                >
                  Salvar Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}