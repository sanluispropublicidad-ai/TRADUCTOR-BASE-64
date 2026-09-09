'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  Upload, 
  ClipboardPaste, 
  AlertCircle, 
  Binary, 
  FileText, 
  Sparkles, 
  FileCode2,
  SlidersHorizontal
} from 'lucide-react';
import { Header } from '@/components/Header';
import { ThemeMode } from '@/types';
import { 
  subscribeTheme, 
  getThemeSnapshot, 
  getThemeServerSnapshot, 
  saveTheme 
} from '@/lib/storage';
import { 
  textToBase64, 
  base64ToText, 
  formatBytes, 
  getUtf8ByteLength 
} from '@/lib/base64-engine';

export default function Base64TranslatorPage() {
  const theme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  // Modo: 'encode' (Texto -> Base64) o 'decode' (Base64 -> Texto)
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  // Contenido de entrada
  const [inputText, setInputText] = useState('');

  // Opciones de codificación
  const [urlSafe, setUrlSafe] = useState(false);
  const [lineWrap, setLineWrap] = useState<0 | 64 | 76>(0);

  // Estados visuales y de interacción
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar tema oscuro con document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    saveTheme(next);
  };

  // Conversión principal reactiva y pura mediante useMemo (sin efectos secundarios ni renders en cascada)
  const { outputText, errorMessage } = React.useMemo(() => {
    if (!inputText) {
      return { outputText: '', errorMessage: null };
    }

    if (mode === 'encode') {
      try {
        const result = textToBase64(inputText, { urlSafe, lineWrap });
        return { outputText: result, errorMessage: null };
      } catch (err: unknown) {
        return {
          outputText: '',
          errorMessage: err instanceof Error ? err.message : 'Error al codificar en Base64',
        };
      }
    } else {
      const result = base64ToText(inputText);
      if (result.success) {
        return { outputText: result.text, errorMessage: null };
      } else {
        return {
          outputText: '',
          errorMessage: result.error || 'La entrada no es una cadena Base64 válida.',
        };
      }
    }
  }, [inputText, mode, urlSafe, lineWrap]);

  // Cambiar dirección de traducción
  const handleToggleMode = () => {
    const nextMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(nextMode);
  };

  // Intercambiar paneles (Swap: Salida pasa a ser la nueva Entrada)
  const handleSwap = () => {
    if (!outputText && !inputText) return;
    const newIn = outputText;
    const newMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    setInputText(newIn);
  };

  // Copiar salida al portapapeles
  const handleCopy = async () => {
    if (!outputText) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(outputText);
      } else {
        // Fallback clásico
        const ta = document.createElement('textarea');
        ta.value = outputText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si falla permiso de portapapeles
      setCopied(false);
    }
  };

  // Pegar directo desde el portapapeles
  const handlePaste = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setInputText(clipText);
        }
      } else {
        textareaRef.current?.focus();
      }
    } catch {
      textareaRef.current?.focus();
    }
  };

  // Descargar el resultado como archivo (.txt o .b64)
  const handleDownload = () => {
    if (!outputText) return;
    const extension = mode === 'encode' ? 'b64' : 'txt';
    const filename = `resultado_${mode}_${Date.now()}.${extension}`;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Carga de archivos masivos (.txt, .b64, .json, .log, etc.)
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop sobre el área de entrada
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Limpiar todo
  const handleClear = () => {
    setInputText('');
  };

  // Cargar ejemplo rápido
  const handleLoadExample = () => {
    if (mode === 'encode') {
      setInputText(
        `¡Hola mundo!\nEste es un texto de prueba para el traductor nativo a Base64.\nSoporta caracteres especiales (ñ, á, é, í, ó, ú), símbolos y emojis: ⚡🚀✨.\nPuedes pegar textos de miles de líneas sin cortes ni límites.`
      );
    } else {
      // Ejemplo codificado
      setInputText(
        `wqFIb2xhIG11bmRvIQpFc3RlIGVzIHVuIHRleHRvIGRlIHBydWViYSBwYXJhIGVsIHRyYWR1Y3RvciBuYXRpdm8gYSBCYXNlNjQuClNvcG9ydGEgY2FyYWN0ZXJlcyBlc3BlY2lhbGVzIChrw7EsIMO6LCDDocK1LCBzw7MpLCBzw61tYm9sb3MgeSBlbW9qaXM6IOKaoeKaguKctC4K`
      );
    }
  };

  // Métricas computadas
  const inputChars = inputText.length;
  const inputBytes = getUtf8ByteLength(inputText);
  const inputLines = inputText ? inputText.split('\n').length : 0;

  const outputChars = outputText.length;
  const outputBytes = getUtf8ByteLength(outputText);
  const outputLines = outputText ? outputText.split('\n').length : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FB] dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header
        mode={mode}
        onToggleMode={handleToggleMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onReset={handleClear}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Barra superior de herramientas y configuración rápida */}
        <section 
          id="toolbar-section"
          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#141417] border border-black/[0.06] dark:border-white/[0.08] shadow-xs"
        >
          {/* Selector de modo principal */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1">
              Dirección:
            </span>
            <div className="inline-flex rounded-xl p-0.5 bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60">
              <button
                type="button"
                id="btn-mode-encode"
                onClick={() => setMode('encode')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'encode'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                Texto ➔ Base64
              </button>
              <button
                type="button"
                id="btn-mode-decode"
                onClick={() => setMode('decode')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'decode'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                Base64 ➔ Texto
              </button>
            </div>

            <button
              type="button"
              id="btn-swap-panels"
              onClick={handleSwap}
              title="Invertir entrada y salida"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Invertir</span>
            </button>
          </div>

          {/* Opciones de formato (URL-Safe y Línea) */}
          <div className="flex flex-wrap items-center gap-3">
            {mode === 'encode' && (
              <>
                {/* Switch URL Safe */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    id="checkbox-url-safe"
                    checked={urlSafe}
                    onChange={(e) => setUrlSafe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                  />
                  <span>URL-Safe (- y _)</span>
                </label>

                {/* Salto de línea para Base64 */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <select
                    id="select-line-wrap"
                    value={lineWrap}
                    onChange={(e) => setLineWrap(Number(e.target.value) as 0 | 64 | 76)}
                    className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={0}>Línea continua (Sin saltos)</option>
                    <option value={64}>64 caracteres (PEM estándar)</option>
                    <option value={76}>76 caracteres (MIME estándar)</option>
                  </select>
                </div>
              </>
            )}

            {/* Cargar ejemplo rápido */}
            <button
              type="button"
              id="btn-load-example"
              onClick={handleLoadExample}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Ejemplo</span>
            </button>
          </div>
        </section>

        {/* Paneles duales: Entrada y Salida */}
        <section 
          id="dual-pane-workspace"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 items-stretch"
        >
          {/* Panel Izquierdo: Entrada */}
          <div 
            id="input-pane"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col rounded-2xl bg-white dark:bg-[#141417] border ${
              dragActive 
                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                : 'border-black/[0.06] dark:border-white/[0.08]'
            } shadow-xs transition-all overflow-hidden`}
          >
            {/* Encabezado de Entrada */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2">
                {mode === 'encode' ? (
                  <FileText className="w-4 h-4 text-blue-500" />
                ) : (
                  <Binary className="w-4 h-4 text-purple-500" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  {mode === 'encode' ? 'Texto Plano (Entrada)' : 'Código Base64 (Entrada)'}
                </span>
              </div>

              {/* Botones de acción rápida de entrada */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="btn-paste-clipboard"
                  onClick={handlePaste}
                  title="Pegar desde el portapapeles"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Pegar</span>
                </button>

                {/* Subir archivo */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".txt,.b64,.json,.log,.md,.xml,.csv,.html"
                />
                <button
                  type="button"
                  id="btn-upload-file"
                  onClick={() => fileInputRef.current?.click()}
                  title="Subir archivo de texto o Base64"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Archivo</span>
                </button>

                {/* Limpiar */}
                {inputText && (
                  <button
                    type="button"
                    id="btn-clear-input"
                    onClick={handleClear}
                    title="Limpiar entrada"
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Textarea de Entrada */}
            <div className="relative flex-1 min-h-[360px] lg:min-h-[480px] p-3 flex flex-col">
              <textarea
                ref={textareaRef}
                id="input-text-area"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  mode === 'encode'
                    ? 'Pega o escribe aquí cualquier texto, código, archivo o contenido extenso...'
                    : 'Pega aquí la cadena en Base64 para decodificar...'
                }
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none"
              />

              {/* Overlay cuando se arrastra un archivo */}
              {dragActive && (
                <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-blue-500 rounded-xl pointer-events-none">
                  <Upload className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Suelta el archivo aquí para cargarlo directamente
                  </p>
                </div>
              )}
            </div>

            {/* Pie de estadísticas de Entrada */}
            <div className="px-4 py-2.5 border-t border-black/[0.04] dark:border-white/[0.06] bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              <div className="flex items-center gap-3">
                <span>{inputChars.toLocaleString()} caracteres</span>
                <span>•</span>
                <span>{formatBytes(inputBytes)}</span>
                <span>•</span>
                <span>{inputLines} líneas</span>
              </div>
              <div className="text-zinc-400">
                {inputText.length > 500000 ? '⚡ Texto masivo cargado' : 'UTF-8 Nativo'}
              </div>
            </div>
          </div>

          {/* Panel Derecho: Salida */}
          <div 
            id="output-pane"
            className="flex flex-col rounded-2xl bg-white dark:bg-[#141417] border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden"
          >
            {/* Encabezado de Salida */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2">
                {mode === 'encode' ? (
                  <Binary className="w-4 h-4 text-purple-500" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  {mode === 'encode' ? 'Resultado Base64 (Salida)' : 'Texto Decodificado (Salida)'}
                </span>
              </div>

              {/* Botones de acción de Salida */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="btn-copy-output"
                  onClick={handleCopy}
                  disabled={!outputText}
                  title="Copiar resultado al portapapeles"
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : outputText
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white active:scale-95'
                      : 'opacity-40 cursor-not-allowed bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-download-output"
                  onClick={handleDownload}
                  disabled={!outputText}
                  title="Descargar como archivo"
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                    outputText
                      ? 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                      : 'opacity-40 cursor-not-allowed text-zinc-400'
                  }`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Textarea de Salida / Visualizador */}
            <div className="relative flex-1 min-h-[360px] lg:min-h-[480px] p-3 flex flex-col bg-zinc-50/20 dark:bg-black/20">
              {errorMessage ? (
                <div 
                  id="decode-error-banner"
                  className="m-auto max-w-md w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-xs"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Error de formato Base64</p>
                    <p>{errorMessage}</p>
                    <p className="text-[11px] text-red-500/80 mt-1">
                      Verifica que la cadena no tenga caracteres ajenos al alfabeto Base64 o que no esté truncada.
                    </p>
                  </div>
                </div>
              ) : (
                <textarea
                  id="output-text-area"
                  readOnly
                  value={outputText}
                  placeholder={
                    mode === 'encode'
                      ? 'El código Base64 generado aparecerá aquí al instante...'
                      : 'El texto original decodificado aparecerá aquí...'
                  }
                  className="w-full flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none"
                />
              )}
            </div>

            {/* Pie de estadísticas de Salida */}
            <div className="px-4 py-2.5 border-t border-black/[0.04] dark:border-white/[0.06] bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              <div className="flex items-center gap-3">
                <span>{outputChars.toLocaleString()} caracteres</span>
                <span>•</span>
                <span>{formatBytes(outputBytes)}</span>
                <span>•</span>
                <span>{outputLines} líneas</span>
              </div>
              <div className="text-zinc-400">
                {mode === 'encode' && inputBytes > 0 && (
                  <span>
                    Expansión Base64: +{Math.round(((outputBytes - inputBytes) / inputBytes) * 100)}%
                  </span>
                )}
                {mode === 'decode' && outputBytes > 0 && (
                  <span className="text-emerald-500">Decodificado OK</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Barra de información rápida sobre comandos y Python */}
        <section 
          id="info-terminal-helpers"
          className="p-4 rounded-2xl bg-white dark:bg-[#141417] border border-black/[0.06] dark:border-white/[0.08] shadow-xs text-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileCode2 className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
              Equivalencias en Terminal y Python para textos en archivos
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-blue-500 font-semibold block mb-1 font-sans">En Terminal (Linux / macOS):</span>
              <p className="text-zinc-800 dark:text-zinc-200 select-all">
                base64 -w 0 archivo.txt &gt; salida.b64
              </p>
              <p className="text-zinc-800 dark:text-zinc-200 select-all mt-1">
                base64 -d salida.b64 &gt; original.txt
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-purple-500 font-semibold block mb-1 font-sans">En Python (Textos grandes UTF-8):</span>
              <p className="text-zinc-800 dark:text-zinc-200 select-all">
                python3 -c &quot;import base64, pathlib; pathlib.Path(&apos;out.b64&apos;).write_bytes(base64.b64encode(pathlib.Path(&apos;in.txt&apos;).read_bytes()))&quot;
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
