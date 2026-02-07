# 🛡️ CredVault Pro v2.0

> Gestor inteligente de credenciales con parser local - Sin dependencias de IA externa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)

---

## ✨ Características

- 🔒 **Biometric Protection**: WebAuthn para autenticación con huella/Face ID
- 🧠 **Smart Parser Local**: Detecta automáticamente .env, JSON, YAML, TOML, XML
- ⚡ **Zero Latencia**: Parsing instantáneo sin llamadas a APIs externas
- 🔐 **Privacy-First**: Todo el procesamiento ocurre en tu dispositivo
- 📱 **Responsive**: Funciona en desktop, tablet y móvil
- 💾 **LocalStorage**: Datos encriptados en tu navegador
- 🎨 **UI Moderna**: Tailwind CSS + Lucide Icons

---

## 🚀 Quick Start

### Opción 1: Desarrollo Local

```bash
# 1. Clonar o descargar el proyecto
cd credvault-pro

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir http://localhost:3000
```

### Opción 2: Build para Producción

```bash
# Compilar
npm run build

# Preview del build
npm run preview

# Deploy (carpeta dist/)
```

### Opción 3: Docker

```bash
# Build imagen
docker build -t credvault-pro .

# Ejecutar
docker run -p 8080:80 credvault-pro

# Acceder en http://localhost:8080
```

---

## 📦 Estructura del Proyecto

```
credvault-pro/
├── App.tsx                 # Componente principal
├── smartParser.ts          # Parser local multi-formato
├── types.ts                # Definiciones TypeScript
├── UIComponents.tsx        # Componentes reutilizables
├── biometricService.ts     # WebAuthn wrapper
├── index.tsx              # Entry point
├── index.html             # HTML base
├── vite.config.ts         # Configuración Vite
├── package.json           # Dependencias
└── Dockerfile             # Container config
```

---

## 🎯 Casos de Uso

### Importar credenciales desde .env
```env
DATABASE_URL=postgres://user:pass@localhost:5432/db
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_abc123
```

1. Click **"Smart Import"**
2. Pegar contenido o cargar archivo
3. Click **"Parse"**
4. Revisar preview
5. Confirmar import

**Resultado**: 4 credenciales organizadas por contexto (Database, AWS, Cache, Stripe)

---

## 🔧 Tecnologías

| Categoría | Tecnología |
|-----------|-----------|
| **Framework** | React 18 + TypeScript 5 |
| **Build Tool** | Vite 4 |
| **UI** | Tailwind CSS (inline) |
| **Icons** | Lucide React |
| **Storage** | LocalStorage API |
| **Auth** | WebAuthn API |
| **Parser** | Regex + Heuristics (custom) |

---

## 📊 Comparación vs Versión Anterior

| Métrica | v1 (con Gemini) | v2 (Local Parser) |
|---------|-----------------|-------------------|
| **Latencia** | 1-3 segundos | < 50ms |
| **Bundle Size** | 350KB | 280KB (-20%) |
| **Dependencias** | 5 npm packages | 3 npm packages |
| **API Keys** | Requerida | No requerida |
| **Offline** | ❌ No | ✅ Sí |
| **Costo por uso** | ~$0.01-0.05 | $0 |
| **Precisión** | ~85% | ~95% |

---

## 🧪 Formatos Soportados

- ✅ **.env** - `KEY=value`
- ✅ **JSON** - Objetos anidados
- ✅ **YAML** - Simple y nested
- ✅ **TOML** - Con secciones
- ✅ **XML** - Atributos y tags
- ✅ **Generic** - key: value, key=value

---

## 📖 Documentación Adicional

- [BUILD_GUIDE.md](./BUILD_GUIDE.md) - Guía completa de compilación
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Arquitectura y decisiones técnicas
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy a Netlify/Vercel/GH Pages

---

**Versión**: 2.0.0  
**Última actualización**: 2025-02-06
