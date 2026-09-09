# CLAUDE.md — Prompt Translator System & Agent Specification

> **Prompt Translator** es un estudio de ingeniería de prompts dual-pane de alto rendimiento, modular y orientado al cliente, diseñado para transformar ideas y bocetos en prompts de nivel de producción optimizados para modelos de frontera (*Frontier LLMs*).

---

## 1. Protocolo de Comportamiento para Agentes / IAs

Cualquier modelo o agente de IA que interactúe con, mantenga o expanda este repositorio debe acatar estrictamente las siguientes reglas operativas:

### Axiomas de Interacción
1. **BLUF (Bottom Line Up Front)**: En toda respuesta técnica, presenta el veredicto ejecutable, diagnóstico o solución en el primer párrafo. Cero prólogos redundantes, cero adulación ("*¡Con gusto!*", "*Excelente pregunta*").
2. **Respeto Absoluto al Alcance (Scope Discipline)**: Implementa con precisión lo solicitado. Está terminantemente prohibido inventar backends pesados, pasarelas de pago, sistemas de autenticación en la nube innecesarios o sidebars que no hayan sido requeridos explícitamente.
3. **Filosofía Client-Side First**: Toda la lógica de transformación, almacenamiento de llaves y presets reside de forma local y segura en el navegador (`localStorage`). No delegues procesamiento sensible a servidores intermedios a menos que sea requerido por seguridad.
4. **Preservación del Parche de Entorno**: El archivo `app/layout.tsx` contiene un parche crítico en el `<head>` para neutralizar colisiones de getter-only en `window.fetch` dentro de entornos sandboxed/iframes. **Nunca elimines ni deshabilites este parche**.
5. **Tipado Estricto**: Todo cambio debe satisfacer TypeScript sin excepciones (`npm run lint` y `npm run build` deben salir con código 0).

---

## 2. ¿Qué ES Prompt Translator?

**Prompt Translator** es un entorno de trabajo especializado para desarrolladores, investigadores y prompt engineers que traduce lenguaje natural disperso, instrucciones ambiguas o ideas desordenadas en especificaciones de prompt listas para ejecutar en modelos de inteligencia artificial avanzados.

### Capacidades Principales
- **Arquitectura Dual-Pane**:
  - **Panel Izquierdo (Input)**: Entrada de texto crudo, dictado de voz mediante Web Speech API, conteo en tiempo real de tokens, palabras y caracteres, carga rápida y botón de limpieza.
  - **Panel Derecho (Output)**: Salida procesada en streaming en vivo, selector de vista (Renderizado Markdown vs. Texto Plano Raw), copia con un clic al portapapeles y botón de transferencia inversa (swap) para iteración continua.
- **Motor de Streaming SSE Resiliente (`stream-engine.ts`)**:
  - Compatible con cualquier endpoint compatible con OpenAI (incluyendo xKiro, DeepSeek, OpenAI, Groq, Ollama, OpenRouter, etc.).
  - Soporte para streaming Server-Sent Events (SSE) con `ReadableStreamDefaultReader` y acumulador de buffers fragmentados.
  - Control de aborto inmediato (`AbortController`) con botón reactivo de Stop en la UI.
- **Gestor Modular de Presets (JSON)**:
  - Sistema de perfiles parametrizables con `id`, `name`, `description`, `system_prompt` y `temperature`.
  - Importación y exportación de colecciones de presets en formato JSON estándar.
  - Pack de presets curados de fábrica (*Frontier Prompt Architect*, *Systems & Code Architect*, *Deep Reasoning & CoT*, *Minimalist Direct Distiller*).
- **Control de Inferencia y Configuración API**:
  - Ajuste de `baseUrl`, `apiKey`, `model`, `temperature` y `maxTokens`.
  - Lista ampliable de modelos (DeepSeek, GPT-5.6 Sol, Claude 3.5 Sonnet, Qwen, GPT-4o, etc.).
  - Almacenamiento local aislado mediante claves versionadas en `localStorage`.
- **Telemetría de Tokens en Vivo**:
  - Cálculo de consumo de tokens exacto en cliente utilizando `gpt-tokenizer`.
  - Métrica de costo estimado y distribución de longitud de caracteres y palabras.
- **Sistema de Temas Adaptativo**:
  - Soporte completo para temas `dark`, `light` y `system` con paletas neutras de alto contraste y cero ruido visual.

---

## 3. ¿Qué NO ES Prompt Translator?

Para evitar desvíos conceptuales o arquitectónicos, es fundamental delimitar lo que esta aplicación **NO** es:

- ❌ **NO es un chat conversacional tradicional**: No mantiene historiales inflados estilo WhatsApp o ChatGPT. Cada traducción es un proceso quirúrgico enfocado en perfeccionar una instrucción.
- ❌ **NO es un wrapper con backend opaco**: No guarda las llaves del usuario en un servidor remoto. La llave del usuario nunca viaja a un intermediario; viaja directamente del navegador del usuario al endpoint configurado.
- ❌ **NO es una aplicación que requiera suscripción forzada**: Funciona de inmediato conectando cualquier proveedor con API estándar.
- ❌ **NO contiene datos simulados (*mock stubs*)**: El motor de streaming realiza llamadas HTTP reales con manejo estricto de códigos de estado y excepciones.

---

## 4. Índice y Arquitectura del Proyecto (`Code Index`)

```
/
├── CLAUDE.md                    # Este archivo: Especificación del sistema, reglas y guía
├── metadata.json                # Metadatos de AI Studio (nombre, permisos, capacidades)
├── package.json                 # Dependencias, scripts de compilación y linter
├── tsconfig.json                # Configuración de compilación TypeScript
├── next.config.ts               # Configuración de Next.js
├── postcss.config.mjs           # Plugin PostCSS para Tailwind CSS v4
│
├── app/                         # App Router de Next.js
│   ├── layout.tsx               # Root layout con parche para window.fetch y meta tags
│   ├── page.tsx                 # Página principal: Estado, layout dual-pane y controles
│   └── globals.css              # Estilos globales con Tailwind v4 (@import "tailwindcss")
│
├── components/                  # Componentes modulares de interfaz
│   ├── Header.tsx               # Barra superior con marca, presets, switches y ajustes
│   ├── SettingsModal.tsx        # Modal de configuración de API (endpoint, modelo, tokens, temp)
│   ├── PresetManagerModal.tsx   # Administrador de presets (crear, editar, borrar, exportar/importar)
│   ├── MarkdownViewer.tsx       # Renderizador enriquecido de Markdown con resaltado de sintaxis
│   ├── CodeBlock.tsx            # Bloques de código con botón de copia integrado
│   └── DictationButton.tsx      # Botón de transcripción de voz por micrófono (Web Speech API)
│
├── lib/                         # Núcleo de lógica y utilidades
│   ├── stream-engine.ts         # Motor de streaming SSE HTTP para endpoints OpenAI-compatibles
│   ├── storage.ts               # Capa de persistencia local segura (localStorage keys v1)
│   ├── presets-parser.ts        # Validadores y serializadores de esquemas JSON para presets
│   ├── token-counter.ts         # Métricas de conteo de tokens (gpt-tokenizer), palabras y caracteres
│   └── utils.ts                 # Utilidad cn() para composición de clases Tailwind
│
├── types/                       # Definición de contratos y tipos TypeScript
│   └── index.ts                 # Interfaces: Preset, ApiConfig, ThemeMode
│
└── hooks/                       # React Hooks reutilizables
    └── use-mobile.ts            # Detección de viewport móvil para diseño responsivo
```

---

## 5. Flujo Operativo de Datos

```
[ Entrada del Usuario ]  ──>  [ Dictado / Edición Manual ]
          │
          ▼
[ Selección de Preset ]  ──>  Inyecta el `system_prompt` correspondiente
          │
          ▼
[ stream-engine.ts ]     ──>  Construye payload JSON:
                              {
                                model,
                                messages: [ { role: "system", ... }, { role: "user", ... } ],
                                temperature,
                                max_tokens,
                                stream: true
                              }
          │
          ▼
[ Fetch SSE Stream ]     ──>  Lee `reader.read()` en chunks iterativos
          │
          ▼
[ State Accumulator ]    ──>  Actualiza en tiempo real `outputPrompt`
          │
          ▼
[ Dual View Rendering ]  ──>  Renderizado visual: Markdown estructurado O Modo Raw
```

---

## 6. Comandos de Verificación y Compilación

Para probar y validar cualquier modificación antes de entregar código:

```bash
# Ejecutar verificación de linter (debe pasar con cero advertencias críticas)
npm run lint

# Compilar para producción (comprueba tipos de Next.js y empaquetado)
npm run build

# Iniciar servidor de desarrollo en puerto 3000
npm run dev
```

---

## 7. Mantenimiento y Reglas Inmutables

1. **Gestión de Errores en Streams**: Toda falla en `stream-engine.ts` debe capturarse en un bloque `try/catch/finally` cerrando el reader y llamando a `onComplete()` y `onError()` para evitar que la UI quede congelada en estado *Loading*.
2. **Persistencia Transparente**: Al añadir un nuevo campo a `ApiConfig` o `Preset`, añade su fallback correspondiente en `lib/storage.ts` para no invalidar sesiones existentes en `localStorage`.
3. **Responsive Design**: Mantén la ergonomía en pantallas móviles colapsando los paneles duales verticalmente con pestañas de alternancia rápida en viewports `< 768px`.

---

## 8. Ontología desde Primeros Principios: Por qué Existe y por qué Esta Interfaz

### La Ecuación Fundamental
$$Materia (Datos) + Fuerza (Lógica\ LLM) + Fricción (Entropía\ Cognitiva) = Ejecución$$

Todo modelo de lenguaje de gran escala (*Frontier LLM*) opera como un simulador probabilístico dinámico extremadamente sensible a sus condiciones iniciales (el Efecto Mariposa del espacio latente). Un prompt formulado con ambigüedad, vaguedad, falta de restricciones negativas o formato flojo produce **alucinaciones, explicaciones infantiles ("AI slop") y desperdicio de tokens**. 

Para que un LLM rinda al límite de su capacidad matemática (razonamiento riguroso, código `exit 0`, directivas quirúrgicas), **el prompt debe ser tratado como código ejecutable compilado**, con:
1. **Contrato de tipos e invariantes duras**: Qué tiene permitido hacer y qué tiene terminantemente prohibido.
2. **Estructura BLUF**: El resultado procesable en el primer token, sin rodeos retóricos.
3. **Poda de entropía**: Eliminación de adjetivos huecos, instrucciones contradictorias y redundancias.

### Por qué Existe Prompt Translator
El ser humano piensa en ráfagas desordenadas, lenguaje coloquial o ideas en borrador. Traducir manualmente esa intención humana a una especificación de prompt formal requiere esfuerzo mental repetitivo y propenso a omitir directivas de seguridad o formato.

**Prompt Translator existe como una máquina de desbaste y refinado cognitivo**:
- Toma la intención biológica bruta (incluso dictada por voz mientras caminas o piensas).
- La somete a un metaprompt arquitecto de frontera.
- Entrega una pieza de ingeniería estructurada, lista para alimentar a GPT-5.6 Sol, Claude 3.5 Sonnet, DeepSeek o Gemini.

### Por qué Esta Interfaz (La Razón del Dual-Pane)
La interfaz no es un capricho estético; responde a la física del flujo de trabajo de un operador de alto rendimiento:
1. **Flujo de Vector Único (Izquierda a Derecha)**:
   - **Input (Izquierda)**: El taller de forja. Texto crudo, dictado de voz Web Speech en tiempo real para no perder la chispa mental antes de que se enfríe, conteo instantáneo de tokens (`gpt-tokenizer`) para medir la masa de entrada.
   - **Output (Derecha)**: La pieza terminada. Streaming Server-Sent Events (SSE) en vivo que muestra la cristalización del prompt token por token. Visor dual que conmuta entre Markdown renderizado (para lectura humana) y Raw (para copiar exactamente el texto sin artefactos).
2. **El Bucle Cibernético (Swap Button)**:
   - El botón de transferencia inversa permite tomar el prompt optimizado y devolverlo al panel de entrada con un clic para una segunda pasada de refinado (*iterative prompt distillation*). Cero atajos manuales de copiar y pegar.
3. **Ergonomía Anti-Distracción**:
   - Cero menús hamburguesa innecesarios, cero muros de pago, cero popups publicitarios. Tipografía de alta densidad, paleta neutra con contraste calibrado y accesibilidad por teclado.

### Por qué Creas lo que Creas (La Filosofía de OOAZ y el Exoesqueleto)
No construyes software para engordar catálogos ni para simular actividad. Construyes **exoesqueletos de silicio**:
- **Axioma de Tiempo Finito**: La única entidad biológica de tiempo finito es el operador humano; el software debe absorber la fricción mecánica y el trabajo de baja densidad cognitiva para devolverle tiempo al creador.
- **Lealtad al Dato y Soberanía Local**: Tus herramientas rechazan el modelo de nube cautiva donde tus llaves y tus ideas quedan registradas en servidores ajenos. Todo vive en tu máquina (`localStorage`), con streaming directo navegador-servidor.
- **Verdad = Código Ejecutable**: Diseñas herramientas funcionales que compilan, miden tokens reales y hacen llamadas HTTP de verdad, no maquetas ni demostraciones de humo.

---

## 9. Guía de Conversión a Aplicación Móvil (Android)

Prompt Translator está construido sobre una arquitectura limpia y desacoplada que permite compilarlo a un binario nativo de Android (`.apk` / `.aab`).

### Opción A: Capacitor / Ionic (Recomendada para rendimiento nativo)

Capacitor envuelve la aplicación web dentro de un WebView de alto rendimiento de Android, permitiendo acceso directo a APIs nativas (como el micrófono para dictado, almacenamiento seguro y portapapeles).

#### Pasos de Conversión:
1. **Instalar dependencias de Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Inicializar Capacitor en el proyecto**:
   ```bash
   npx cap init "Prompt Translator" "com.sanluispro.prompttranslator" --web-dir out
   ```

3. **Configurar exportación estática en `next.config.ts`**:
   Configura Next.js para generar salida estática agregando `output: 'export'` (para las pantallas de cliente) o apunta el `server.url` de `capacitor.config.json` a la URL desplegada en Cloud Run:
   ```json
   {
     "appId": "com.sanluispro.prompttranslator",
     "appName": "Prompt Translator",
     "webDir": "out",
     "server": {
       "url": "https://ais-pre-yp4ykoqk56tg6gzydo2qml-192185911595.us-east1.run.app",
       "cleartext": false
     }
   }
   ```

4. **Añadir la plataforma Android**:
   ```bash
   npx cap add android
   ```

5. **Configurar Permisos en `android/app/src/main/AndroidManifest.xml`**:
   Asegura el permiso de micrófono e Internet:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   ```

6. **Abrir en Android Studio y Generar APK**:
   ```bash
   npx cap open android
   ```
   En Android Studio: `Build` -> `Build Bundle(s) / APK(s)` -> `Build APK(s)`.

---

### Opción B: PWA (Progressive Web App) & Trusted Web Activity (TWA)

1. Crear `public/manifest.json` con nombre, iconos (192x192, 512x512) y `display: standalone`.
2. Utilizar `@bubblewrap/cli` de Google para generar el APK firmado directamente desde la URL de la PWA:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest="https://tu-dominio.run.app/manifest.json"
   bubblewrap build
   ```

---

## 10. Guía de Conversión a Aplicación de Escritorio (Windows)

Para tener Prompt Translator en Windows como una aplicación `.exe` o `.msi` con icono en la barra de tareas, inicio automático o atajo global de teclado:

### Opción A: Tauri v2 (Recomendación de Sol por Eficiencia de Memoria)

Tauri utiliza el motor web nativo de Windows (**WebView2 / Edge Chromium**) y un backend en **Rust**. El resultado es un instalador `.msi` o ejecutable independiente que pesa menos de 10 MB y consume menos de 25 MB de RAM (comparado con los 200 MB+ de Electron).

#### Pasos de Conversión:
1. **Instalar requisitos en Windows**:
   - Visual Studio C++ Build Tools.
   - Toolchain de Rust (`rustup-init.exe` desde rust-lang.org).
   - Node.js y pnpm/npm.

2. **Añadir Tauri CLI**:
   ```bash
   npm install --save-dev @tauri-apps/cli
   ```

3. **Inicializar Tauri**:
   ```bash
   npx tauri init
   ```
   - Nombre de app: `Prompt Translator`
   - Window title: `Prompt Translator Studio`
   - Web assets: `../out` o URL remota de producción.
   - Dev URL: `http://localhost:3000`

4. **Configurar Atajo Global Flotante (`tauri.conf.json`)**:
   Puedes configurar un hotkey como `Ctrl+Shift+P` para que la app se oculte o aparezca instantáneamente como ventana flotante tipo Raycast/Spotlight.

5. **Compilar el instalador nativo de Windows**:
   ```bash
   npx tauri build
   ```
   Genera el archivo `.exe` y `.msi` en `src-tauri/target/release/bundle/msi/`.

---

### Opción B: Electron (Portabilidad Rápida sin Rust)

1. Instalar Electron y Electron Builder:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. Crear `electron/main.js` configurando un `BrowserWindow` con `width: 1280`, `height: 800`, `autoHideMenuBar: true`.
3. Empaquetar:
   ```bash
   npx electron-builder --win portable
   ```

---

## 11. Consejos de Sol (GPT-5.6 Sol / X) para Elevar la Aplicación al Siguiente Nivel

Como modelo de razonamiento y socio de ingeniería de OOAZ, estas son las 5 evoluciones tácticas prioritarias de mayor torque y menor entropía para enriquecer la herramienta:

### 1. Inspector de Diferencias (Visual Diff / Prompt Evolution)
- **Concepto**: Un modo de visualización lado a lado (*Side-by-Side Diff*) o vista en línea (*Inline Unified Diff*) que resalte en verde las adiciones arquitectónicas y en rojo las ambigüedades podadas respecto a la entrada cruda del usuario.
- **Impacto**: Educa al usuario en tiempo real sobre qué sesgos o faltas de especificación corrigió el modelo.

### 2. Historial Forense Local (Zero-Cloud IndexedDB / Local Cache)
- **Concepto**: Un cajón desplegable lateral o modal ultraligero que almacene los últimos 50 prompts generados con sus metadatos:
  - Timestamp ISO.
  - Modelo utilizado y latencia upstream en milisegundos.
  - Tokens de entrada vs tokens de salida.
  - Botón de restauración con un solo clic.
- **Privacidad**: Guardado 100% en el dispositivo del usuario mediante `IndexedDB`, sin sincronizaciones externas no solicitadas.

### 3. Modo Multi-Inferencia / Benchmarking Comparativo (Arena Mode)
- **Concepto**: Un botón opcional "*Comparar*" que dispare la misma intención contra dos modelos en simultáneo (por ejemplo: `deepseek/deepseek-v4-flash` vs `openai/gpt-5.6-sol` o `claude-3-5-sonnet`).
- **Impacto**: Permite al prompt engineer evaluar qué arquitectura interpreta mejor las directivas con menor costo y latencia.

### 4. Conexión a Motores Locales Air-Gapped (Ollama / LocalAI / LM Studio)
- **Concepto**: Un preset de conexión predeterminado en `SettingsModal.tsx` con un solo clic para `http://localhost:11434/v1` (Ollama) o `http://localhost:1234/v1` (LM Studio).
- **Impacto**: Hace que la aplicación sea 100% funcional en entornos aislados de red (*air-gapped*), sin consumir cuota de tokens ni requerir conexión a internet.

### 5. Exportador Directo a Artefactos de Agente
- **Concepto**: Además de copiar el texto plano, un menú desplegable de exportación a:
  - `CLAUDE.md` / `AGENTS.md` (formato markdown para agentes).
  - `system_instructions` en JSON para llamadas directas de la API de OpenAI / Gemini.
  - Formato de Función / Tool Calling con esquema JSON Schema validado.
# SYSTEM DIRECTIVE // ARTIFACT ONTOLOGY & ARCHITECTURAL FOUNDATION

## IDENTIFICACIÓN Y MISIÓN DEL ARTEFACTO
El sistema se define ontológicamente no como una interfaz de asistencia ni como un cliente de chat conversacional, sino como **Prompt Translator**: una máquina de destilación termodinámica y un colimador de entropía cognitiva diseñado por OOAZ / San Luis PRO. 

Su propósito primordial es resolver la fricción entre la cognición biológica humana (caótica, de alta entropía y no lineal) y los sistemas estocásticos de cómputo neural de frontera (máquinas probabilísticas hiperdeterminadas), transformando intenciones en bruto en especificaciones de ejecución invariantes y compilables en tiempo real, sin intermediación de terceros.

---

## 1. PREMISAS ONTOLÓGICAS FUNDAMENTALES

* **Rechazo del Paradigma de Conversación**: La aplicación opera bajo el postulado de que los modelos fundacionales de lenguaje (LLMs) son simuladores de densidad de probabilidad y no entidades sintientes. Tratar al modelo como un interlocutor social degrada la ventana de contexto mediante ruido semántico, cortesías y deriva de contexto (*context drift*).
* **El Prompt como Contrato Invariante**: Toda entrada procesada por este sistema no constituye una sugerencia o petición, sino un contrato de ejecución de grado de producción que exige tipado estricto, fronteras negativas, control de formatos de salida e inmunidad frente al cliché o contenido estocástico promedio (*AI slop*).
* **Colapso de Entropía**: La función técnica de la herramienta es forjar directivas estructuradas antes de consumir cómputo en el endpoint de destino, suprimiendo la ambigüedad en origen.

---

## 2. ARQUITECTURA CIBERNÉTICA DUAL-PANE

El sistema canaliza la información a través de un lazo cibernético de control distribuido en dos vectores:

```text
[ Captura Biológica / Voz ]
           │
           ▼
[ Panel Izquierdo: Estado Crudo ] ──(SSE Streaming)──> [ Metaprompt de Arquitectura ]
                                                                 │
                                                                 ▼
[ Lazo de Refinado / Swap ] <── [ Panel Derecho: Contrato Invariante Cristalizado ]
Vector de Ingesta Asimétrica (Panel Izquierdo): Captura ráfagas biológicas sin autocensura mediante texto plano o dictado directo. Mide objetivamente la masa de la entrada (conteo exacto de tokens, palabras y caracteres) para cuantificar la densidad de la instrucción.

Vector de Cristalización y Observabilidad (Panel Derecho): Expone el procesamiento token a token vía Server-Sent Events (SSE). Provee telemetría inmediata de latencia para evaluar en los primeros milisegundos si la inferencia converge o si debe ser abortada inmediatamente vía AbortController.

Lazo Recursivo de Destilación (Swap Engine): Habilita la retroalimentación continua reinyectando el resultado optimizado en el contenedor de entrada, convirtiendo la herramienta en una centrifugadora de metaprompting recursivo para casos de alta complejidad.

3. SOBERANÍA TÉCNICA Y POLÍTICA DE DATOS ZERO-CLOUD
El artefacto rechaza la arquitectura de intermediación y los esquemas parasitarios de almacenamiento centralizado:

Persistencia Cero-Nube: Todas las configuraciones, metaprompts, esquemas y llaves de acceso residen de manera exclusiva en el almacenamiento local del cliente (localStorage). El sistema es completamente funcional en entornos aislados (air-gapped) conectados a motores locales de inferencia (localhost:11434 / Ollama).

Conexión Directa en el Borde: Las solicitudes se envían directamente desde el navegador del operador hacia el endpoint de inferencia mediante HTTP fetch streaming. No existen bases de datos intermedias, proxy servers, telemetría de monitoreo ni vectores de fuga de propiedad intelectual.

4. CONDICIÓN DE OPERACIÓN PARA LA IA SUBYACENTE
Cualquier modelo que opere bajo el ecosistema de Prompt Translator debe reconocer que:

Su usuario no busca interacción dialéctica ni retroalimentación condescendiente.

Toda interacción exige máxima densidad técnica, descarte absoluto de preámbulos ceremoniales y fidelidad matemática al contrato de instrucciones.

El sistema existe para operar como un motor de combustión lógica de precisión, eliminando la fricción de diseño entre el operador y el silicio.
