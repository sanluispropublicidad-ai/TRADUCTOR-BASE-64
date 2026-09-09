'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
  FileJson,
  Layers,
  Copy,
  CopyPlus,
  RefreshCw,
  Info
} from 'lucide-react';
import { Preset } from '@/types';
import { OPTIONAL_STARTER_PRESETS } from '@/lib/storage';
import { 
  parseMultiPresetJson, 
  generateSampleMultiPresetJson, 
  formatPresetsToJson 
} from '@/lib/presets-parser';

function createUniquePresetId(prefix = 'preset'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: Preset[];
  activePresetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onSavePresets: (presets: Preset[]) => void;
  initialTab?: 'list' | 'json' | 'batch';
}

type TabType = 'list' | 'json' | 'batch';

export function PresetManagerModal({
  isOpen,
  onClose,
  presets,
  activePresetId,
  onSelectPreset,
  onSavePresets,
  initialTab = 'list',
}: PresetManagerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Multi-Preset JSON Editor state
  const [jsonText, setJsonText] = useState<string>('');

  // Batch Creator state (multiple presets in parallel)
  const [batchRows, setBatchRows] = useState<Array<{
    name: string;
    description: string;
    system_prompt: string;
    temperature: number;
  }>>([
    { name: '', description: '', system_prompt: '', temperature: 0.7 },
    { name: '', description: '', system_prompt: '', temperature: 0.7 },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notifTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial tab and json text when opened without setState-in-effect
  const [prevOpenState, setPrevOpenState] = useState(isOpen);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (isOpen !== prevOpenState || (isOpen && initialTab !== prevInitialTab)) {
    setPrevOpenState(isOpen);
    setPrevInitialTab(initialTab);
    if (isOpen) {
      setActiveTab(initialTab);
      setEditingPreset(null);
      setIsCreatingSingle(false);
      if (presets.length > 0) {
        setJsonText(formatPresetsToJson(presets));
      } else {
        setJsonText('[\n  \n]');
      }
    }
  }

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) {
        clearTimeout(notifTimerRef.current);
      }
    };
  }, []);

  // Real-time JSON validation
  const jsonValidation = useMemo(() => {
    if (!jsonText.trim() || jsonText.trim() === '[]') {
      return { isValid: true, count: 0, error: undefined, presets: [] };
    }
    const res = parseMultiPresetJson(jsonText);
    return {
      isValid: !res.error && res.count > 0,
      count: res.count,
      error: res.error,
      presets: res.presets,
    };
  }, [jsonText]);

  if (!isOpen) return null;

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    if (notifTimerRef.current) {
      clearTimeout(notifTimerRef.current);
    }
    setNotification({ type, message });
    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // --- Single Preset Actions ---
  const handleCreateNewSingle = () => {
    const newPreset: Preset = {
      id: createUniquePresetId('preset'),
      name: 'Nuevo Preset',
      description: 'Instrucciones operativas para el modelo',
      system_prompt: 'Eres un arquitecto de prompts. Optimiza el siguiente texto para modelos de frontera.',
      temperature: 0.7,
    };
    setEditingPreset(newPreset);
    setIsCreatingSingle(true);
  };

  const handleSaveSingleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset) return;

    if (!editingPreset.name.trim()) {
      showNotification('error', 'El nombre del preset es obligatorio.');
      return;
    }

    if (!editingPreset.system_prompt.trim()) {
      showNotification('error', 'La directiva del sistema es obligatoria.');
      return;
    }

    const safeTemp = Math.max(0, Math.min(2, editingPreset.temperature));
    const finalizedPreset: Preset = {
      ...editingPreset,
      name: editingPreset.name.trim(),
      description: editingPreset.description.trim(),
      system_prompt: editingPreset.system_prompt.trim(),
      temperature: safeTemp,
    };

    let updatedList: Preset[];
    if (isCreatingSingle) {
      updatedList = [...presets, finalizedPreset];
      onSelectPreset(finalizedPreset.id);
    } else {
      updatedList = presets.map((p) => (p.id === finalizedPreset.id ? finalizedPreset : p));
    }

    onSavePresets(updatedList);
    setJsonText(formatPresetsToJson(updatedList));
    setEditingPreset(null);
    setIsCreatingSingle(false);
    showNotification('success', isCreatingSingle ? 'Preset creado exitosamente' : 'Preset actualizado');
  };

  const handleDeletePreset = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    onSavePresets(updated);
    setJsonText(formatPresetsToJson(updated));
    if (activePresetId === id) {
      onSelectPreset(updated.length > 0 ? updated[0].id : null);
    }
    showNotification('success', 'Preset eliminado');
  };

  const handleDuplicatePreset = (preset: Preset, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cloned: Preset = {
      ...preset,
      id: createUniquePresetId('preset'),
      name: `${preset.name} (Copia)`,
    };
    const updated = [...presets, cloned];
    onSavePresets(updated);
    setJsonText(formatPresetsToJson(updated));
    showNotification('success', `Duplicado como "${cloned.name}"`);
  };

  // --- Multi-Preset JSON Actions ---
  const handleApplyJsonReplace = () => {
    const result = parseMultiPresetJson(jsonText);
    if (result.error || result.presets.length === 0) {
      showNotification('error', result.error || 'No se pudieron extraer presets válidos.');
      return;
    }

    onSavePresets(result.presets);
    onSelectPreset(result.presets[0].id);
    showNotification('success', `✓ ${result.presets.length} presets cargados y guardados con éxito desde el JSON.`);
    setActiveTab('list');
  };

  const handleApplyJsonMerge = () => {
    const result = parseMultiPresetJson(jsonText);
    if (result.error || result.presets.length === 0) {
      showNotification('error', result.error || 'No se pudieron extraer presets válidos.');
      return;
    }

    const mergedMap = new Map<string, Preset>();
    presets.forEach((p) => mergedMap.set(p.id, p));

    result.presets.forEach((p) => {
      let id = p.id;
      if (mergedMap.has(id)) {
        id = createUniquePresetId('preset');
      }
      mergedMap.set(id, { ...p, id });
    });

    const final = Array.from(mergedMap.values());
    onSavePresets(final);
    if (!activePresetId && final.length > 0) {
      onSelectPreset(final[0].id);
    }
    showNotification('success', `✓ ${result.presets.length} presets fusionados. Total: ${final.length} presets.`);
    setActiveTab('list');
  };

  const handleLoadSampleTemplate = () => {
    const sample = generateSampleMultiPresetJson();
    setJsonText(sample);
    showNotification('info', 'Plantilla multi-preset insertada en el editor. Haz clic en "Cargar / Reemplazar" para aplicarla.');
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
      showNotification('success', 'JSON copiado al portapapeles');
    } catch {
      showNotification('error', 'No se pudo copiar al portapapeles');
    }
  };

  const handleExportJSONFile = () => {
    try {
      const textToExport = jsonText.trim() ? jsonText : formatPresetsToJson(presets);
      const blob = new Blob([textToExport], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `operational_presets_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('success', 'Archivo JSON multi-preset descargado con éxito.');
    } catch {
      showNotification('error', 'Error al descargar el archivo JSON');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          throw new Error('No se pudo leer el contenido del archivo.');
        }

        const res = parseMultiPresetJson(text);
        if (res.error || res.presets.length === 0) {
          throw new Error(res.error || 'El archivo no contiene una lista de presets válida.');
        }

        // Put into editor
        setJsonText(text);
        // Automatically ask or load
        onSavePresets(res.presets);
        onSelectPreset(res.presets[0].id);
        showNotification('success', `✓ Archivo cargado con éxito: ${res.presets.length} presets importados.`);
        setActiveTab('list');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo JSON';
        showNotification('error', msg);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleLoadStarters = () => {
    onSavePresets(OPTIONAL_STARTER_PRESETS);
    onSelectPreset(OPTIONAL_STARTER_PRESETS[0].id);
    setJsonText(formatPresetsToJson(OPTIONAL_STARTER_PRESETS));
    showNotification('success', '✓ Pack inicial cargado (4 presets de arquitectura de prompts).');
    setActiveTab('list');
  };

  // --- Batch Creator Actions ---
  const handleAddBatchRow = () => {
    setBatchRows([...batchRows, { name: '', description: '', system_prompt: '', temperature: 0.7 }]);
  };

  const handleRemoveBatchRow = (index: number) => {
    if (batchRows.length <= 1) {
      setBatchRows([{ name: '', description: '', system_prompt: '', temperature: 0.7 }]);
      return;
    }
    setBatchRows(batchRows.filter((_, i) => i !== index));
  };

  const handleBatchRowChange = (index: number, field: string, val: unknown) => {
    setBatchRows(
      batchRows.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [field]: val };
      })
    );
  };

  const handleSaveBatchAll = () => {
    const validRows = batchRows.filter((r) => r.name.trim().length > 0 && r.system_prompt.trim().length > 0);
    if (validRows.length === 0) {
      showNotification('error', 'Ingresa al menos un preset con nombre y directiva para guardar.');
      return;
    }

    const newPresets: Preset[] = validRows.map((r) => ({
      id: createUniquePresetId('preset'),
      name: r.name.trim(),
      description: r.description.trim(),
      system_prompt: r.system_prompt.trim(),
      temperature: Math.max(0, Math.min(2, r.temperature)),
    }));

    const combined = [...presets, ...newPresets];
    onSavePresets(combined);
    setJsonText(formatPresetsToJson(combined));
    onSelectPreset(newPresets[0].id);
    showNotification('success', `✓ ${newPresets.length} presets creados y agregados exitosamente.`);
    setActiveTab('list');
  };

  const handleConvertBatchToJson = () => {
    const validRows = batchRows.filter((r) => r.name.trim().length > 0 || r.system_prompt.trim().length > 0);
    const presetsObj = validRows.map((r, i) => ({
      id: `preset-${i + 1}`,
      name: r.name.trim() || `Preset ${i + 1}`,
      description: r.description.trim(),
      system_prompt: r.system_prompt.trim(),
      temperature: r.temperature,
    }));
    setJsonText(JSON.stringify(presetsObj, null, 2));
    setActiveTab('json');
    showNotification('info', 'Lote convertido a formato JSON.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-[#141416] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Operational Presets & Prompts Studio
                {presets.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {presets.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gestiona y carga múltiples directivas operativas en un solo archivo JSON unificado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Tabs Bar */}
        {!editingPreset && (
          <div className="px-5 sm:px-6 pt-3 pb-0 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Presets Guardados</span>
                <span className="text-[10px] opacity-70 font-mono">({presets.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('json');
                  if (presets.length > 0 && (!jsonText.trim() || jsonText === '[\n  \n]')) {
                    setJsonText(formatPresetsToJson(presets));
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'json'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <FileJson className="w-3.5 h-3.5 text-blue-500" />
                <span>Editor JSON (Un Solo Archivo)</span>
                {jsonValidation.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {jsonValidation.count}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('batch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'batch'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Crear Varios (Lote)</span>
              </button>
            </div>

            {activeTab === 'list' && (
              <button
                type="button"
                onClick={handleCreateNewSingle}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Preset</span>
              </button>
            )}
          </div>
        )}

        {/* Notifications Bar */}
        {notification && (
          <div
            className={`px-5 sm:px-6 py-2 text-xs flex items-center gap-2 border-b animate-in fade-in duration-150 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium'
                : notification.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 font-medium'
            }`}
          >
            {notification.type === 'success' && <Check className="w-3.5 h-3.5 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {notification.type === 'info' && <Info className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{notification.message}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {editingPreset ? (
            /* --- Single Edit / Create Form --- */
            <form onSubmit={handleSaveSingleForm} className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  {isCreatingSingle ? 'Crear Nuevo Preset' : 'Editar Preset'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setIsCreatingSingle(false);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre del Preset
                </label>
                <input
                  type="text"
                  required
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  placeholder="ej. Arquitecto de Prompts de Frontera"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Descripción Corta
                </label>
                <input
                  type="text"
                  value={editingPreset.description}
                  onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
                  placeholder="Resumen del estilo y propósito del preset"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Directiva del Sistema (System Prompt)
                </label>
                <textarea
                  required
                  rows={8}
                  value={editingPreset.system_prompt}
                  onChange={(e) => setEditingPreset({ ...editingPreset, system_prompt: e.target.value })}
                  placeholder="Instrucciones directas que gobernarán el motor de traducción..."
                  className="w-full px-3 py-2.5 text-xs md:text-sm font-mono leading-relaxed rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  <span>Temperatura Operativa</span>
                  <span className="font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 rounded">
                    {editingPreset.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={editingPreset.temperature}
                  onChange={(e) =>
                    setEditingPreset({ ...editingPreset, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setIsCreatingSingle(false);
                  }}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
                >
                  {isCreatingSingle ? 'Agregar Preset' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          ) : activeTab === 'json' ? (
            /* --- Tab 2: Universal Multi-Preset JSON Editor --- */
            <div className="space-y-4">
              {/* Context Banner */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 flex items-start gap-3">
                <FileJson className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                    Carga múltiples presets en un solo archivo o bloque JSON
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    No necesitas un archivo JSON por cada prompt. Pega un arreglo completo <code className="font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 py-0.5 rounded">[{`{...}`}, {`{...}`}]</code>, un objeto con <code className="font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 py-0.5 rounded">&quot;presets&quot;: [...]</code> o un diccionario <code className="font-mono bg-black/[0.04] dark:bg-white/[0.06] px-1 py-0.5 rounded">{`{ "Nombre": "Prompt..." }`}</code>.
                  </p>
                </div>
              </div>

              {/* JSON Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {jsonValidation.isValid && jsonValidation.count > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5" />
                      {jsonValidation.count} preset(s) listos para cargar
                    </span>
                  ) : jsonValidation.error ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {jsonValidation.error}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Editor vacío: escribe o pega tu JSON de presets.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLoadSampleTemplate}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] transition-colors flex items-center gap-1"
                    title="Insertar plantilla JSON con 4 presets de ejemplo"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Plantilla Ejemplo
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] transition-colors flex items-center gap-1"
                    title="Copiar JSON al portapapeles"
                  >
                    {copiedJson ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedJson ? 'Copiado' : 'Copiar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (presets.length > 0) {
                        setJsonText(formatPresetsToJson(presets));
                        showNotification('info', 'Editor sincronizado con los presets actuales.');
                      }
                    }}
                    className="px-2 py-1 text-xs rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    title="Restablecer al listado actual"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* JSON Textarea Editor */}
              <div className="relative">
                <textarea
                  rows={13}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "name": "Mi Primer Preset",\n    "description": "Descripción",\n    "system_prompt": "Eres un asistente...",\n    "temperature": 0.7\n  },\n  {\n    "name": "Segundo Preset",\n    "system_prompt": "Instrucción...",\n    "temperature": 0.5\n  }\n]`}
                  className="w-full px-3.5 py-3 text-xs md:text-sm font-mono leading-relaxed rounded-xl bg-zinc-50 dark:bg-[#0c0c0e] border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-y"
                  spellCheck={false}
                />
              </div>

              {/* Primary Action Buttons for JSON */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJSONFile}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .json
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Subir .json
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyJsonMerge}
                    disabled={!jsonValidation.isValid || jsonValidation.count === 0}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-800 dark:text-zinc-200 bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title="Añade los presets del JSON sin borrar los que ya existen"
                  >
                    Fusionar con Existentes
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyJsonReplace}
                    disabled={!jsonValidation.isValid || jsonValidation.count === 0}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none shadow-xs transition-opacity flex items-center gap-1.5"
                    title="Reemplaza todos los presets actuales con los de este JSON"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Cargar y Reemplazar Todo ({jsonValidation.count})
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'batch' ? (
            /* --- Tab 3: Batch Creator (Crear Varios Presets a la vez) --- */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Creador Rápido en Lote
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Crea múltiples presets simultáneamente sin abrir formularios individuales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBatchRow}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-zinc-800 dark:text-zinc-200 border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Fila
                </button>
              </div>

              <div className="space-y-3">
                {batchRows.map((row, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-500">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBatchRow(idx)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          placeholder="Nombre del preset (ej. Traductor Técnico)"
                          value={row.name}
                          onChange={(e) => handleBatchRowChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-800/90 border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Descripción breve (opcional)"
                          value={row.description}
                          onChange={(e) => handleBatchRowChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-800/90 border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        placeholder="Directiva / System Prompt para este preset..."
                        value={row.system_prompt}
                        onChange={(e) => handleBatchRowChange(idx, 'system_prompt', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-zinc-800/90 border border-black/[0.08] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleConvertBatchToJson}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] flex items-center gap-1.5"
                >
                  <FileJson className="w-3.5 h-3.5 text-blue-500" />
                  Ver como JSON
                </button>

                <button
                  type="button"
                  onClick={handleSaveBatchAll}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar Todos en la App
                </button>
              </div>
            </div>
          ) : (
            /* --- Tab 1: Saved Presets List --- */
            <div className="space-y-4">
              {presets.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/20">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    No presets configured
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                    Puedes cargar todos tus presets juntos en un solo JSON, crear varios en lote o cargar el paquete inicial con 4 presets de ingeniería de prompts.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setJsonText(generateSampleMultiPresetJson());
                        setActiveTab('json');
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5 shadow-xs"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      Cargar JSON Multi-Preset
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadStarters}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Cargar Starter Pack Pro
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateNewSingle}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Crear Individual
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {presets.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-zinc-100/90 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-500 ring-1 ring-zinc-400 dark:ring-zinc-500 shadow-xs'
                            : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-black/[0.06] dark:border-white/[0.06] hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                                Activo
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
                              T: {preset.temperature}
                            </span>
                          </div>
                          {preset.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                              {preset.description}
                            </p>
                          )}
                          <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                            {preset.system_prompt}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => handleDuplicatePreset(preset, e)}
                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            title="Duplicar preset"
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPreset(preset);
                              setIsCreatingSingle(false);
                            }}
                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            title="Editar preset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors"
                            title="Eliminar preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar Archivo JSON
            </button>

            <button
              type="button"
              onClick={handleExportJSONFile}
              disabled={presets.length === 0 && !jsonText.trim()}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Todo en 1 JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'json' && !editingPreset && (
              <button
                type="button"
                onClick={() => {
                  setJsonText(formatPresetsToJson(presets));
                  setActiveTab('json');
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-blue-500" />
                <span>Ver JSON Completo</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
