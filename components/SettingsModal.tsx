'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Key, 
  Globe, 
  Cpu, 
  Sliders, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  Download, 
  Upload, 
  Sparkles,
  Search,
  Plus,
  RefreshCw
} from 'lucide-react';
import { ApiConfig } from '@/types';
import { normalizeEndpoint, fetchEndpointModels } from '@/lib/stream-engine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export function SettingsModal(props: SettingsModalProps) {
  if (!props.isOpen) return null;
  return <SettingsModalContent {...props} />;
}

function SettingsModalContent({ onClose, config, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState<ApiConfig>(config);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Models List & Filtering State
  const [modelsList, setModelsList] = useState<string[]>(() => {
    if (config.modelsList && config.modelsList.length > 0) {
      return config.modelsList;
    }
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'o1',
      'o3-mini',
      'claude-3-5-sonnet',
      'deepseek-chat',
      'deepseek-reasoner',
      'meta-llama/llama-3.3-70b-instruct',
    ];
  });

  const [modelFilter, setModelFilter] = useState('');
  const [fetchingModels, setFetchingModels] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  const isMountedRef = useRef(true);
  const testAbortRef = useRef<AbortController | null>(null);
  const fetchModelsAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notifTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrlRef = useRef(formData.baseUrl);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (testAbortRef.current) {
        testAbortRef.current.abort();
      }
      if (fetchModelsAbortRef.current) {
        fetchModelsAbortRef.current.abort();
      }
      if (notifTimerRef.current) {
        clearTimeout(notifTimerRef.current);
      }
    };
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (notifTimerRef.current) {
      clearTimeout(notifTimerRef.current);
    }
    setNotification({ type, message });
    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Fetch models from /v1/models endpoint
  const handleFetchModels = useCallback(async (manual = true, targetUrl?: string) => {
    const url = (targetUrl || formData.baseUrl || '').trim();
    if (!url) {
      if (manual) showNotification('error', 'Por favor ingresa una Base URL válida.');
      return;
    }

    if (fetchModelsAbortRef.current) {
      fetchModelsAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchModelsAbortRef.current = controller;

    setFetchingModels(true);
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const fetched = await fetchEndpointModels(url, formData.apiKey, controller.signal);
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;

      if (fetched.length > 0) {
        setModelsList((prevList) => {
          const merged = Array.from(new Set([...fetched, ...prevList]));
          return merged;
        });
        setFormData((prev) => {
          const merged = Array.from(new Set([...fetched, ...(prev.modelsList || [])]));
          return {
            ...prev,
            modelsList: merged,
            model: prev.model || fetched[0],
          };
        });
        showNotification('success', `Se extrajeron ${fetched.length} modelos del endpoint automáticamente.`);
      } else {
        if (manual) {
          showNotification('error', 'El endpoint respondió pero no devolvió identificadores de modelo.');
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;
      if (controller.signal.aborted) {
        if (manual) showNotification('error', 'Tiempo de espera agotado al consultar modelos.');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Error al consultar modelos';
      if (manual) {
        showNotification(
          'error',
          msg.includes('Failed to fetch')
            ? 'No se pudieron consultar modelos por CORS o red. Puedes añadirlos con "+ Añadir".'
            : `Error en modelos: ${msg}`
        );
      }
    } finally {
      if (isMountedRef.current) {
        setFetchingModels(false);
      }
    }
  }, [formData.baseUrl, formData.apiKey]);

  // Auto-fetch models when baseUrl changes and has /v1 or local ports (debounced 900ms)
  useEffect(() => {
    const currentUrl = formData.baseUrl.trim();
    if (
      currentUrl &&
      currentUrl !== previousUrlRef.current &&
      (currentUrl.includes('/v1') || currentUrl.includes(':11434') || currentUrl.includes(':1234'))
    ) {
      previousUrlRef.current = currentUrl;
      const timer = setTimeout(() => {
        handleFetchModels(false, currentUrl);
      }, 900);
      return () => clearTimeout(timer);
    }
    previousUrlRef.current = currentUrl;
  }, [formData.baseUrl, handleFetchModels]);

  // Add custom model to list
  const handleAddCustomModel = (modelName?: string) => {
    const nameToAdd = (modelName || customModelInput).trim();
    if (!nameToAdd) return;

    if (!modelsList.includes(nameToAdd)) {
      const updated = [nameToAdd, ...modelsList];
      setModelsList(updated);
      setFormData((prev) => ({
        ...prev,
        model: nameToAdd,
        modelsList: updated,
      }));
      showNotification('success', `Modelo "${nameToAdd}" añadido a la lista.`);
    } else {
      setFormData((prev) => ({ ...prev, model: nameToAdd }));
      showNotification('success', `Modelo "${nameToAdd}" seleccionado.`);
    }
    setCustomModelInput('');
    setShowAddCustom(false);
  };

  // Remove model from list
  const handleRemoveModel = (modelToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = modelsList.filter((m) => m !== modelToRemove);
    setModelsList(updated);
    setFormData((prev) => ({
      ...prev,
      modelsList: updated,
      model: prev.model === modelToRemove ? (updated[0] || '') : prev.model,
    }));
  };

  // Filtered models
  const filteredModels = useMemo(() => {
    const query = modelFilter.trim().toLowerCase();
    if (!query) return modelsList;
    return modelsList.filter((m) => m.toLowerCase().includes(query));
  }, [modelsList, modelFilter]);

  const handleSave = () => {
    onSave({
      ...formData,
      modelsList,
    });
    onClose();
  };

  const handleExportJson = () => {
    try {
      const exportPayload = {
        provider: 'OpenAI Custom',
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
        model: formData.model,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        modelsList,
        exportedAt: new Date().toISOString(),
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openai_custom_api_config_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('success', 'Configuración de API exportada exitosamente.');
    } catch {
      showNotification('error', 'Error al exportar el archivo JSON.');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          throw new Error('No se pudo leer el archivo.');
        }

        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El JSON no contiene un objeto válido.');
        }

        let importedModels = modelsList;
        if (Array.isArray(parsed.modelsList) && parsed.modelsList.length > 0) {
          importedModels = Array.from(
            new Set([...parsed.modelsList.filter((m: unknown) => typeof m === 'string' && (m as string).trim())])
          );
        } else if (Array.isArray(parsed.models) && parsed.models.length > 0) {
          importedModels = Array.from(
            new Set([...parsed.models.filter((m: unknown) => typeof m === 'string' && (m as string).trim())])
          );
        }

        setModelsList(importedModels);

        const importedConfig: ApiConfig = {
          baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
            ? parsed.baseUrl.trim()
            : (typeof parsed.url === 'string' ? parsed.url.trim() : formData.baseUrl),
          apiKey: typeof parsed.apiKey === 'string' 
            ? parsed.apiKey.trim() 
            : (typeof parsed.key === 'string' ? parsed.key.trim() : formData.apiKey),
          model: typeof parsed.model === 'string' && parsed.model.trim()
            ? parsed.model.trim()
            : (typeof parsed.modelName === 'string' ? parsed.modelName.trim() : formData.model),
          temperature: Number.isFinite(Number(parsed.temperature))
            ? Math.max(0, Math.min(2, Number(parsed.temperature)))
            : formData.temperature,
          maxTokens: Number.isFinite(Number(parsed.maxTokens))
            ? Math.max(100, Math.min(65536, Number(parsed.maxTokens)))
            : formData.maxTokens,
          modelsList: importedModels,
        };

        setFormData(importedConfig);
        showNotification('success', 'Configuración de OpenAI Custom importada correctamente.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Archivo JSON inválido.';
        showNotification('error', msg);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleTestConnection = async () => {
    if (testAbortRef.current) {
      testAbortRef.current.abort();
    }
    const controller = new AbortController();
    testAbortRef.current = controller;

    setTesting(true);
    setTestResult(null);

    const endpoint = normalizeEndpoint(formData.baseUrl);
    const isLocal = formData.baseUrl.includes('localhost') || formData.baseUrl.includes('127.0.0.1');

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const startTime = performance.now();
      let res: Response;

      if (isLocal) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };
        if (formData.apiKey && formData.apiKey.trim().length > 0) {
          headers['Authorization'] = `Bearer ${formData.apiKey.trim()}`;
        }
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: formData.model || 'deepseek/deepseek-v4-flash',
            messages: [{ role: 'user', content: 'Ping. Reply with "pong" only.' }],
            max_tokens: 10,
          }),
          signal: controller.signal,
        });
      } else {
        // Use server-side proxy to completely bypass browser CORS
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint,
            baseUrl: formData.baseUrl,
            apiKey: formData.apiKey,
            model: formData.model || 'deepseek/deepseek-v4-flash',
            messages: [{ role: 'user', content: 'Ping' }],
            stream: true,
            max_tokens: 10,
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      if (!isMountedRef.current) return;

      if (!res.ok) {
        let errDesc = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const json = await res.json();
          if (json.error?.message) errDesc = json.error.message;
          else if (typeof json.error === 'string') errDesc = json.error;
        } catch {
          // Ignore
        }
        setTestResult({ success: false, message: errDesc });
      } else {
        if (res.body) {
          const reader = res.body.getReader();
          await reader.read().catch(() => {});
          reader.cancel().catch(() => {});
        }
        setTestResult({
          success: true,
          message: `Conexión exitosa en ${elapsed}ms. Modelo verificado.`,
        });
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;
      if (controller.signal.aborted) {
        setTestResult({
          success: false,
          message: 'Tiempo de espera agotado (10 segundos).',
        });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Error al conectar';
      setTestResult({
        success: false,
        message: msg,
      });
    } finally {
      if (isMountedRef.current) {
        setTesting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#151518] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              Configuración de API
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Proveedor Personalizado OpenAI Custom compatible con endpoints /v1.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`px-6 py-2 text-xs flex items-center gap-2 border-b ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Provider Tag: OpenAI Custom */}
          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>xKiro / OpenAI Custom</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    xKiro /v1
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Integración optimizada con xKiro (https://api.xkiro.com/v1) y endpoints /v1 compatibles.
                </p>
              </div>
            </div>

            {/* Import / Export JSON buttons */}
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJson}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-medium rounded-md text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                title="Importar configuración de API desde archivo JSON"
              >
                <Upload className="w-3 h-3" />
                <span className="hidden sm:inline">Importar</span> JSON
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2.5 py-1 text-xs font-medium rounded-md text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                title="Exportar configuración de API a archivo JSON"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Exportar</span> JSON
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                Base URL
              </label>
              {formData.baseUrl.includes('/v1') && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Formato /v1 detectado
                </span>
              )}
            </div>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-mono"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Al ingresar un endpoint con <code className="font-mono text-zinc-600 dark:text-zinc-400">/v1</code>, los modelos se consultan automáticamente.
            </p>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-500" />
                API Key
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1"
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-mono"
              />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Almacenada exclusivamente en el localStorage del navegador.
            </p>
          </div>

          {/* Model Identifier + Filtrador al lado del botón + Cargar modelos de /v1 */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                Identificador del Modelo Activo
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {modelsList.length} modelos en lista
              </span>
            </div>

            {/* Input directo del modelo activo */}
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="gpt-4o, claude-3-5-sonnet, deepseek-chat..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-mono"
            />

            {/* BARRA: Filtrador al lado del botón de cargar modelos y botón añadir modelo */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              {/* Filtrador */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="Filtrar modelos (ej. 4o, claude, deepseek)..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-sans"
                />
                {modelFilter && (
                  <button
                    type="button"
                    onClick={() => setModelFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="Limpiar filtro"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Botones de acción al lado del filtrador */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Botón Detectar / Cargar de /v1 */}
                <button
                  type="button"
                  onClick={() => handleFetchModels(true)}
                  disabled={fetchingModels}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Consultar /v1/models del endpoint y extraer modelos automáticamente"
                >
                  <RefreshCw className={`w-3 h-3 text-emerald-500 ${fetchingModels ? 'animate-spin' : ''}`} />
                  <span>{fetchingModels ? 'Extrayendo...' : 'Cargar de /v1'}</span>
                </button>

                {/* Botón Añadir Modelo a la lista */}
                <button
                  type="button"
                  onClick={() => setShowAddCustom(!showAddCustom)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors flex items-center gap-1"
                  title="Añadir un modelo personalizado a la lista"
                >
                  <Plus className="w-3 h-3" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* Input desplegable para añadir nuevo modelo custom */}
            {showAddCustom && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomModel();
                    }
                  }}
                  placeholder="Nombre o ID del modelo (ej. meta-llama/llama-3.3-70b-instruct)..."
                  className="flex-1 px-2.5 py-1 text-xs rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomModel()}
                  className="px-3 py-1 text-xs font-semibold rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustom(false);
                    setCustomModelInput('');
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Lista Filtrada de Modelos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-0.5">
                <span>
                  {modelFilter
                    ? `${filteredModels.length} de ${modelsList.length} modelos coinciden`
                    : `Modelos disponibles (${modelsList.length})`}
                </span>
                <span className="text-[10px] text-zinc-400">Clic para seleccionar</span>
              </div>

              <div className="max-h-36 overflow-y-auto p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-wrap gap-1.5 content-start">
                {filteredModels.length === 0 ? (
                  <div className="w-full py-3 text-center text-xs text-zinc-400">
                    No hay modelos que coincidan con &quot;{modelFilter}&quot;.
                    <button
                      type="button"
                      onClick={() => handleAddCustomModel(modelFilter)}
                      className="block mx-auto mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      + Añadir &quot;{modelFilter}&quot; como nuevo modelo
                    </button>
                  </div>
                ) : (
                  filteredModels.map((m) => {
                    const isSelected = formData.model.trim() === m.trim();
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData({ ...formData, model: m })}
                        className={`group px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-semibold'
                            : 'bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500'
                        }`}
                        title={`Seleccionar modelo ${m}`}
                      >
                        {isSelected && <Check className="w-3 h-3 shrink-0 text-emerald-400 dark:text-emerald-600" />}
                        <span className="truncate max-w-[220px]">{m}</span>
                        {modelsList.length > 1 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleRemoveModel(m, e)}
                            className={`opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity ml-0.5 p-0.5 rounded ${
                              isSelected
                                ? 'hover:bg-zinc-800 dark:hover:bg-zinc-200'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
                            }`}
                            title="Eliminar de la lista"
                          >
                            <X className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sliders: Temperature & Max Tokens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  Temperatura
                </span>
                <span className="font-mono text-zinc-500">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                <span>0.0 (Determinista)</span>
                <span>1.0 (Creativo)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                <span>Límite de Tokens</span>
                <span className="font-mono text-zinc-500">{formData.maxTokens || 'Sin límite'}</span>
              </div>
              <input
                type="number"
                min="100"
                max="65536"
                step="256"
                value={formData.maxTokens || 3000}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-2.5 py-1 text-xs rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Privacy statement banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Cliente Puro:</span> Transmisión directa navegador-servidor vía fetch. Tus claves y solicitudes no pasan por ningún intermediario.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 transition-colors flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
            Probar Conexión
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
