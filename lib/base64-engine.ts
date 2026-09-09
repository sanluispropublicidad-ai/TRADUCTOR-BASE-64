/**
 * Motor de alta eficiencia para codificación y decodificación Base64 con soporte UTF-8.
 * Diseñado específicamente para procesar textos masivos sin desbordar la pila de llamadas (call stack)
 * ni bloquear el navegador.
 */

export interface Base64Options {
  urlSafe?: boolean;
  lineWrap?: 0 | 64 | 76;
}

export interface DecodeResult {
  success: boolean;
  text: string;
  error?: string;
  bytesCount: number;
}

/**
 * Codifica texto UTF-8 a Base64 en fragmentos (chunks) seguros de 32KB.
 */
export function textToBase64(text: string, options: Base64Options = {}): string {
  if (!text) return '';

  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32768 bytes por bloque para evitar desbordar String.fromCharCode

  let binary = '';
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, sub as unknown as number[]);
  }

  let base64 = btoa(binary);

  if (options.urlSafe) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  if (options.lineWrap && options.lineWrap > 0) {
    const wrap = options.lineWrap;
    const parts: string[] = [];
    for (let i = 0; i < base64.length; i += wrap) {
      parts.push(base64.slice(i, i + wrap));
    }
    base64 = parts.join('\n');
  }

  return base64;
}

/**
 * Decodifica Base64 a texto UTF-8 validado.
 * Admite entradas con saltos de línea, espacios, y variantes URL-safe.
 */
export function base64ToText(input: string): DecodeResult {
  if (!input || !input.trim()) {
    return { success: true, text: '', bytesCount: 0 };
  }

  try {
    // Normalizar: remover saltos de línea, tabulaciones y espacios en blanco
    let cleaned = input.replace(/[\r\n\t ]+/g, '');

    // Convertir de URL-Safe a estándar si es necesario
    cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

    // Reparar padding '=' si falta
    const mod4 = cleaned.length % 4;
    if (mod4 === 2) {
      cleaned += '==';
    } else if (mod4 === 3) {
      cleaned += '=';
    } else if (mod4 === 1) {
      return {
        success: false,
        text: '',
        error: 'Longitud de Base64 inválida (no puede tener residuo de 1 byte).',
        bytesCount: 0,
      };
    }

    // Decodificar binario con atob
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decodificar bytes UTF-8
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const text = decoder.decode(bytes);

    return {
      success: true,
      text,
      bytesCount: len,
    };
  } catch (err: unknown) {
    let errorMsg = 'El contenido no es un Base64 válido.';
    if (err instanceof TypeError || (err instanceof Error && err.name === 'InvalidCharacterError')) {
      errorMsg = 'Caracteres inválidos detectados para formato Base64.';
    } else if (err instanceof Error) {
      errorMsg = `Error de decodificación UTF-8: ${err.message}`;
    }
    return {
      success: false,
      text: '',
      error: errorMsg,
      bytesCount: 0,
    };
  }
}

/**
 * Formatea cantidades de bytes a formato legible (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calcula el peso real en bytes de una cadena UTF-8.
 */
export function getUtf8ByteLength(str: string): number {
  return new Blob([str]).size;
}
