import { Preset } from '@/types';

/**
 * Robust, universal parser for Multi-Preset JSON.
 * Accepts:
 *  - Array of preset objects: [{ name, system_prompt, ... }, { ... }]
 *  - Wrapped object: { presets: [...] }, { prompts: [...] }, { operational_presets: [...] }, { data: [...] }
 *  - Key-value dictionary: { "Frontier Architect": "System prompt...", "Code Spec": "System prompt..." }
 *  - Object dictionary: { "p1": { name: "...", prompt: "..." }, "p2": { ... } }
 *  - Single preset object: { name: "...", system_prompt: "..." }
 */
export function parseMultiPresetJson(input: unknown): { presets: Preset[]; count: number; error?: string } {
  try {
    let parsed: unknown = input;

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return { presets: [], count: 0, error: 'El contenido JSON está vacío.' };
      }
      parsed = JSON.parse(trimmed);
    }

    if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
      return { presets: [], count: 0, error: 'La estructura JSON debe ser un arreglo o un objeto.' };
    }

    let rawList: unknown[] = [];

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else {
      const obj = parsed as Record<string, unknown>;

      // Check if wrapped under standard keys
      if (Array.isArray(obj.presets)) {
        rawList = obj.presets;
      } else if (Array.isArray(obj.prompts)) {
        rawList = obj.prompts;
      } else if (Array.isArray(obj.operational_presets)) {
        rawList = obj.operational_presets;
      } else if (Array.isArray(obj.items)) {
        rawList = obj.items;
      } else if (Array.isArray(obj.data)) {
        rawList = obj.data;
      } else if (Array.isArray(obj.list)) {
        rawList = obj.list;
      } else {
        // Check if this is a single preset object
        const hasDirectPrompt = Boolean(
          obj.system_prompt || obj.systemPrompt || obj.prompt || obj.system || obj.directive || obj.instructions
        );
        const hasDirectName = Boolean(obj.name || obj.title || obj.label);

        if (hasDirectName && hasDirectPrompt) {
          rawList = [obj];
        } else {
          // Check if it's a key-value dictionary where keys are preset names
          const keys = Object.keys(obj);
          if (keys.length > 0) {
            const listFromDict: unknown[] = [];
            for (const key of keys) {
              const val = obj[key];
              if (typeof val === 'string' && val.trim().length > 0) {
                // Key is name, value is prompt
                listFromDict.push({
                  name: key,
                  system_prompt: val,
                });
              } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                // Key might be an ID or name, value is object
                const valObj = val as Record<string, unknown>;
                listFromDict.push({
                  id: valObj.id || key,
                  name: valObj.name || valObj.title || key,
                  system_prompt: valObj.system_prompt || valObj.systemPrompt || valObj.prompt || valObj.system || valObj.directive || '',
                  description: valObj.description || valObj.desc || '',
                  temperature: valObj.temperature ?? valObj.temp,
                });
              }
            }
            if (listFromDict.length > 0) {
              rawList = listFromDict;
            }
          }
        }
      }
    }

    if (rawList.length === 0) {
      return { presets: [], count: 0, error: 'No se encontraron presets válidos en el JSON proporcionado.' };
    }

    const validatedPresets: Preset[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;

      // Resolve Name
      const rawName = entry.name || entry.title || entry.label || entry.id;
      const name = typeof rawName === 'string' ? rawName.trim() : `Preset ${i + 1}`;

      // Resolve System Prompt / Directive
      const rawPrompt = 
        entry.system_prompt ?? 
        entry.systemPrompt ?? 
        entry.prompt ?? 
        entry.system ?? 
        entry.directive ?? 
        entry.instructions ?? 
        entry.instruction ?? 
        entry.content ?? 
        entry.text;

      const systemPrompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';

      // Skip entries without any prompt directive
      if (!systemPrompt) {
        continue;
      }

      // Resolve Description
      const rawDesc = entry.description ?? entry.desc ?? entry.summary ?? entry.notes ?? entry.about;
      const description = typeof rawDesc === 'string' ? rawDesc.trim() : '';

      // Resolve Temperature
      const rawTemp = Number(entry.temperature ?? entry.temp ?? entry.t);
      const temperature = Number.isFinite(rawTemp) && rawTemp >= 0 && rawTemp <= 2 ? Math.round(rawTemp * 100) / 100 : 0.7;

      // Resolve ID
      let id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : '';
      if (!id || usedIds.has(id)) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      }
      usedIds.add(id);

      validatedPresets.push({
        id,
        name,
        description,
        system_prompt: systemPrompt,
        temperature,
      });
    }

    if (validatedPresets.length === 0) {
      return { 
        presets: [], 
        count: 0, 
        error: 'El JSON no contenía campos válidos de instrucciones ("system_prompt" o "prompt").' 
      };
    }

    return { presets: validatedPresets, count: validatedPresets.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al analizar el formato JSON';
    return { presets: [], count: 0, error: msg };
  }
}

/**
 * Generates an example JSON template containing multiple operational presets.
 */
export function generateSampleMultiPresetJson(): string {
  const sample: Preset[] = [
    {
      id: 'sample-frontier-architect',
      name: 'Frontier Prompt Architect',
      description: 'Estructura ideas en instrucciones modulares con etiquetas XML y restricciones estrictas.',
      system_prompt: `Eres un Arquitecto de Prompts de Frontera. Tu misión es transformar la idea no estructurada del usuario en un prompt de clase mundial optimizado para modelos frontera (Claude 3.5, GPT-5, DeepSeek-R1).\n\nEstructura el prompt final con:\n1. <role_and_objective>: Rol y meta de alto apalancamiento.\n2. <context>: Supuestos y contexto operativo.\n3. <core_instructions>: Directivas ordenadas en imperativo.\n4. <constraints>: Restricciones negativas (lo que NO debe hacer).\n5. <output_format>: Esquema y sintaxis de salida requerida.\n\nDevuelve ÚNICAMENTE el prompt final listo para usarse.`,
      temperature: 0.7,
    },
    {
      id: 'sample-software-engineer',
      name: 'Ingeniero de Software & Código Limpio',
      description: 'Convierte conceptos técnicos en requerimientos exhaustivos con tipado estricto y casos borde.',
      system_prompt: `Eres un Arquitecto de Software Principal. Transforma la idea de programación del usuario en un prompt de implementación técnica de nivel producción.\n\nExige:\n- Patrones de diseño, tipado riguroso y arquitectura limpia.\n- Manejo explícito de excepciones, concurrencia y límites de rendimiento.\n- Paso a paso ordenado sin omisiones ni marcadores ficticios.\n- Criterios de verificación y pruebas unitarias.\n\nEntrega solo el prompt optimizado.`,
      temperature: 0.4,
    },
    {
      id: 'sample-deep-reasoner',
      name: 'Razonamiento Profundo (Chain of Thought)',
      description: 'Construye directivas que obligan al modelo a formular hipótesis, falsarlas y deducir desde primeros principios.',
      system_prompt: `Eres un Especialista en Razonamiento Deliberativo y Arquitectura Cognitiva. Convierte la consulta del usuario en un prompt de deducción profunda.\n\nInstruye al modelo destino a:\n1. Descomponer el problema en axiomas base y variables explícitas.\n2. Formular hipótesis paralelas y contrastarlas con escepticismo.\n3. Ejecutar cadena de pensamiento interna rigurosa.\n4. Auditar casos de esquina y contraargumentos.\n5. Emitir veredicto final accionable con BLUF.\n\nRetorna únicamente el prompt refinado.`,
      temperature: 0.6,
    },
    {
      id: 'sample-minimal-distiller',
      name: 'Destilador Minimalista Conciso',
      description: 'Elimina todo relleno retórico, produciendo instrucciones directas de máxima densidad por token.',
      system_prompt: `Eres un Destilador de Prompts Minimalista. Toma el texto o petición del usuario y condénsalo en una directiva quirúrgica de cero relleno.\n\n- Verbos imperativos directos.\n- Cero explicaciones previas o saludos.\n- Máxima densidad de señal por token.\n\nEntrega solo el prompt destilado.`,
      temperature: 0.3,
    }
  ];

  return JSON.stringify(sample, null, 2);
}

/**
 * Serializes preset array into a clean, indented JSON string.
 */
export function formatPresetsToJson(presets: Preset[]): string {
  const exportData = presets.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    system_prompt: p.system_prompt,
    temperature: p.temperature,
  }));
  return JSON.stringify(exportData, null, 2);
}
