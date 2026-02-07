/**
 * Smart Local Parser - Sin dependencias de AI externa
 * Cubre formatos: .env, JSON, YAML, TOML, key=value, XML config
 */

import { SmartParseResult } from './types';

interface ParserConfig {
  inferAppName?: boolean;
  strictMode?: boolean;
}

export class SmartCredentialParser {
  private static readonly ENV_PATTERN = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/gm;
  private static readonly KEY_VALUE_PATTERN = /["']?([a-zA-Z_][\w.-]*)["']?\s*[:=]\s*["']?([^\n"']+)["']?/g;
  private static readonly JSON_PATTERN = /"([^"]+)"\s*:\s*"([^"]+)"/g;
  
  // Detectores de contexto para inferir appName
  private static readonly APP_CONTEXTS = [
    { patterns: [/aws|amazon/i, /bucket|s3|lambda/i], name: 'AWS' },
    { patterns: [/azure|microsoft/i], name: 'Azure' },
    { patterns: [/gcp|google.cloud/i, /firebase/i], name: 'GCP' },
    { patterns: [/stripe|payment/i], name: 'Stripe' },
    { patterns: [/sendgrid|mail|smtp/i], name: 'Email' },
    { patterns: [/postgres|pg|database|db/i, /mysql|mariadb/i], name: 'Database' },
    { patterns: [/redis|cache/i], name: 'Cache' },
    { patterns: [/jwt|auth|oauth|secret/i], name: 'Auth' },
    { patterns: [/api[_-]?key|token/i], name: 'API' },
    { patterns: [/slack|discord|webhook/i], name: 'Integrations' },
  ];

  /**
   * Parse inteligente multi-formato
   */
  static parse(text: string, config: ParserConfig = {}): SmartParseResult[] {
    const { inferAppName = true, strictMode = false } = config;
    
    // Limpieza inicial
    const cleaned = this.preprocess(text);
    
    // Detectar formato automáticamente
    const format = this.detectFormat(cleaned);
    
    let results: SmartParseResult[] = [];
    
    switch (format) {
      case 'env':
        results = this.parseEnv(cleaned);
        break;
      case 'json':
        results = this.parseJSON(cleaned);
        break;
      case 'yaml':
        results = this.parseYAML(cleaned);
        break;
      case 'xml':
        results = this.parseXML(cleaned);
        break;
      case 'toml':
        results = this.parseTOML(cleaned);
        break;
      default:
        results = this.parseFallback(cleaned);
    }
    
    // Post-procesamiento
    results = this.deduplicate(results);
    
    if (inferAppName) {
      results = this.inferAppNames(results, cleaned);
    }
    
    if (strictMode) {
      results = this.validateResults(results);
    }
    
    return results;
  }

  /**
   * Preprocesar texto: eliminar comentarios, normalizar espacios
   */
  private static preprocess(text: string): string {
    return text
      .split('\n')
      .map(line => {
        // Eliminar comentarios
        const commentIdx = line.search(/(?<!["'])[#;]/);
        return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
      })
      .filter(line => line.trim().length > 0)
      .join('\n')
      .trim();
  }

  /**
   * Detectar formato automáticamente
   */
  private static detectFormat(text: string): string {
    const firstChar = text.trim()[0];
    
    if (firstChar === '{' || firstChar === '[') {
      try {
        JSON.parse(text);
        return 'json';
      } catch {
        return 'unknown';
      }
    }
    
    if (firstChar === '<') return 'xml';
    if (text.includes('---') || /^\w+:\s*$/m.test(text)) return 'yaml';
    if (/^\[[\w.]+\]$/m.test(text)) return 'toml';
    if (this.ENV_PATTERN.test(text)) return 'env';
    
    return 'unknown';
  }

  /**
   * Parser .ENV
   */
  private static parseEnv(text: string): SmartParseResult[] {
    const results: SmartParseResult[] = [];
    const matches = text.matchAll(this.ENV_PATTERN);
    
    for (const match of matches) {
      const [, key, rawValue] = match;
      const value = this.cleanValue(rawValue);
      
      if (key && value) {
        results.push({ key, value });
      }
    }
    
    return results;
  }

  /**
   * Parser JSON
   */
  private static parseJSON(text: string): SmartParseResult[] {
    try {
      const obj = JSON.parse(text);
      return this.flattenObject(obj);
    } catch {
      // Fallback a regex si JSON inválido
      const results: SmartParseResult[] = [];
      const matches = text.matchAll(this.JSON_PATTERN);
      
      for (const match of matches) {
        const [, key, value] = match;
        if (key && value) {
          results.push({ key, value });
        }
      }
      
      return results;
    }
  }

  /**
   * Parser YAML simplificado
   */
  private static parseYAML(text: string): SmartParseResult[] {
    const results: SmartParseResult[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*([a-zA-Z_][\w.-]*)\s*:\s*(.+)$/);
      if (match) {
        const [, key, rawValue] = match;
        const value = this.cleanValue(rawValue);
        if (value && !value.startsWith('|') && !value.startsWith('>')) {
          results.push({ key, value });
        }
      }
    }
    
    return results;
  }

  /**
   * Parser XML para config files
   */
  private static parseXML(text: string): SmartParseResult[] {
    const results: SmartParseResult[] = [];
    const attrPattern = /(\w+)\s*=\s*["']([^"']+)["']/g;
    const tagPattern = /<(\w+)>([^<]+)<\/\1>/g;
    
    // Atributos
    let match;
    while ((match = attrPattern.exec(text)) !== null) {
      results.push({ key: match[1], value: match[2] });
    }
    
    // Tags simples
    while ((match = tagPattern.exec(text)) !== null) {
      const value = match[2].trim();
      if (value && !value.includes('<')) {
        results.push({ key: match[1], value });
      }
    }
    
    return results;
  }

  /**
   * Parser TOML
   */
  private static parseTOML(text: string): SmartParseResult[] {
    const results: SmartParseResult[] = [];
    const lines = text.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      // Secciones [section]
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        continue;
      }
      
      // Key = value
      const kvMatch = line.match(/^([a-zA-Z_][\w.-]*)\s*=\s*(.+)$/);
      if (kvMatch) {
        const key = currentSection ? `${currentSection}.${kvMatch[1]}` : kvMatch[1];
        const value = this.cleanValue(kvMatch[2]);
        results.push({ key, value });
      }
    }
    
    return results;
  }

  /**
   * Parser genérico para texto no estructurado
   */
  private static parseFallback(text: string): SmartParseResult[] {
    const results: SmartParseResult[] = [];
    const matches = text.matchAll(this.KEY_VALUE_PATTERN);
    
    for (const match of matches) {
      const [, key, rawValue] = match;
      const value = this.cleanValue(rawValue);
      
      // Filtrar ruido (líneas con muchas palabras no son credenciales)
      if (key && value && value.split(/\s+/).length <= 5) {
        results.push({ key, value });
      }
    }
    
    return results;
  }

  /**
   * Limpia valores: comillas, espacios, etc.
   */
  private static cleanValue(value: string): string {
    return value
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '')
      .trim();
  }

  /**
   * Aplana objeto JSON anidado
   */
  private static flattenObject(obj: any, prefix = ''): SmartParseResult[] {
    const results: SmartParseResult[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        results.push(...this.flattenObject(value, fullKey));
      } else if (typeof value === 'string' || typeof value === 'number') {
        results.push({ key: fullKey, value: String(value) });
      }
    }
    
    return results;
  }

  /**
   * Deduplica resultados por key
   */
  private static deduplicate(results: SmartParseResult[]): SmartParseResult[] {
    const seen = new Map<string, SmartParseResult>();
    
    for (const result of results) {
      if (!seen.has(result.key)) {
        seen.set(result.key, result);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Infiere appName basado en contexto
   */
  private static inferAppNames(results: SmartParseResult[], originalText: string): SmartParseResult[] {
    const lowerText = originalText.toLowerCase();
    
    return results.map(result => {
      // Ya tiene appName
      if (result.appName) return result;
      
      const lowerKey = result.key.toLowerCase();
      const lowerValue = result.value.toLowerCase();
      
      // Buscar en contextos predefinidos
      for (const context of this.APP_CONTEXTS) {
        const matches = context.patterns.some(pattern => 
          pattern.test(lowerKey) || 
          pattern.test(lowerValue) || 
          pattern.test(lowerText)
        );
        
        if (matches) {
          return { ...result, appName: context.name };
        }
      }
      
      // Extraer de prefijos (e.g., AWS_ACCESS_KEY → AWS)
      const prefixMatch = result.key.match(/^([A-Z]+)_/);
      if (prefixMatch && prefixMatch[1].length >= 2) {
        return { ...result, appName: prefixMatch[1] };
      }
      
      return { ...result, appName: 'General' };
    });
  }

  /**
   * Validación estricta
   */
  private static validateResults(results: SmartParseResult[]): SmartParseResult[] {
    return results.filter(result => {
      // Key debe ser válido
      if (!/^[a-zA-Z_][\w.-]*$/.test(result.key)) return false;
      
      // Value no debe estar vacío
      if (!result.value || result.value.length < 2) return false;
      
      // Evitar ruido obvio
      const lowerKey = result.key.toLowerCase();
      const noisyWords = ['example', 'test', 'dummy', 'placeholder', 'todo'];
      if (noisyWords.some(word => lowerKey.includes(word))) return false;
      
      return true;
    });
  }
}

/**
 * Helper function para uso directo
 */
export function parseCredentials(text: string, strict = false): SmartParseResult[] {
  return SmartCredentialParser.parse(text, { 
    inferAppName: true, 
    strictMode: strict 
  });
}
