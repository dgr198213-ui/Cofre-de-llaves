# Guía de Despliegue - CredVault Pro v2

## Setup Rápido

```bash
# 1. Instalar dependencias (sin @google/genai)
npm install

# 2. Iniciar desarrollo
npm run dev

# 3. Build para producción
npm run build
```

## Estructura del Proyecto

```
credvault-pro/
├── App.tsx                 # Componente principal (actualizado)
├── smartParser.ts          # Parser local (NUEVO - reemplaza geminiService)
├── types.ts                # Type definitions
├── UIComponents.tsx        # Button, Input, Modal
├── biometricService.ts     # WebAuthn API wrapper
├── index.tsx              # Entry point
├── index.html             # HTML base
└── package.json           # Sin dependencia de Gemini
```

## Cambios Críticos vs Versión Anterior

### ❌ Eliminado
```typescript
// geminiService.ts - YA NO SE USA
import { GoogleGenAI } from "@google/genai";
```

### ✅ Agregado
```typescript
// smartParser.ts - NUEVO
export class SmartCredentialParser {
  static parse(text: string): SmartParseResult[]
}
```

### 🔄 Actualizado en App.tsx
```typescript
// ANTES
import { parseCredentialsWithAI } from './services/geminiService';
const results = await parseCredentialsWithAI(importText);

// AHORA
import { parseCredentials } from './smartParser';
const results = parseCredentials(importText, false);
```

## Verificación Post-Despliegue

### 1. Bundle Size
```bash
npm run build
# Antes: ~350KB (con Gemini SDK)
# Ahora: ~280KB (70KB menos)
```

### 2. Test Manual
```
1. Abrir app
2. Click "Smart Import"
3. Pegar este .env:
   ```
   DATABASE_URL=postgres://localhost:5432/db
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   REDIS_URL=redis://localhost:6379
   ```
4. Click "Parse"
5. Verificar:
   ✓ Parsing instantáneo (< 100ms)
   ✓ 3 credenciales detectadas
   ✓ AppNames inferidos: Database, AWS, Cache
   ✓ Preview antes de import
```

### 3. Performance Check
```javascript
// Abrir DevTools Console
const testEnv = `
DATABASE_URL=postgres://localhost
API_KEY=xyz123
REDIS_HOST=127.0.0.1
`.repeat(100);

console.time('parse');
parseCredentials(testEnv);
console.timeEnd('parse');
// Target: < 50ms para 100 credenciales
```

## Rollback (si es necesario)

Si necesitas volver a Gemini:
```bash
npm install @google/genai
git checkout HEAD~1 -- services/geminiService.ts App.tsx
```

## Deployment Targets

### Netlify / Vercel
```bash
# Build command
npm run build

# Publish directory
dist/
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## Variables de Entorno

**IMPORTANTE**: Ya no se requiere `API_KEY` para Gemini

```env
# .env (opcional - para futuras features)
VITE_APP_NAME=CredVault Pro
VITE_VERSION=2.0.0
```

## Troubleshooting

### Error: "parseCredentials is not defined"
- **Causa**: Import incorrecto
- **Fix**: Verificar que `smartParser.ts` esté en la raíz del proyecto

### Parser no detecta credenciales
- **Causa**: Formato no reconocido
- **Fix**: Revisar logs en `SmartCredentialParser.detectFormat()`
- **Formatos soportados**: .env, JSON, YAML, TOML, XML

### Build falla con "Cannot find module '@google/genai'"
- **Causa**: Cache de node_modules viejo
- **Fix**: 
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Contacto de Soporte

Para issues técnicos, revisar:
1. `IMPROVEMENTS.md` - Arquitectura del parser
2. `smartParser.ts` - Comentarios inline sobre cada formato

---

**Versión**: 2.0.0  
**Última actualización**: 2025-02-06  
**Breaking changes**: Eliminación de dependencia Gemini AI
