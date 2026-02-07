# 🚀 Guía de Compilación - CredVault Pro v2

## Método 1: Compilación Local (Recomendado)

### Paso 1: Preparar el entorno
```bash
# Asegúrate de tener Node.js instalado (v16 o superior)
node --version  # Debe mostrar v16.x o superior
npm --version   # Debe mostrar 8.x o superior

# Si no tienes Node.js, instálalo desde:
# https://nodejs.org/
```

### Paso 2: Instalar dependencias
```bash
# Navega a la carpeta del proyecto
cd credvault-pro

# Instala todas las dependencias
npm install

# Esto instalará:
# - React & React DOM
# - Lucide React (iconos)
# - Vite (bundler)
# - TypeScript
# Total: ~280KB (70KB menos que versión con Gemini)
```

### Paso 3: Desarrollo local
```bash
# Iniciar servidor de desarrollo
npm run dev

# La app se abrirá en http://localhost:3000
# Hot reload: cambios se reflejan automáticamente
```

### Paso 4: Compilar para producción
```bash
# Compilar versión optimizada
npm run build

# Resultado en carpeta dist/
# - HTML, CSS, JS minificados
# - Assets optimizados
# - Listo para deploy
```

### Paso 5: Preview local del build
```bash
# Probar el build antes de subir
npm run preview

# Se abre en http://localhost:4173
```

---

## Método 2: Deploy Directo (Sin compilar localmente)

### Opción A: Netlify (1-click deploy)

1. **Conectar repositorio**
   - Ve a https://app.netlify.com
   - Click "New site from Git"
   - Conecta tu repositorio

2. **Configuración de build**
   ```
   Build command: npm run build
   Publish directory: dist
   Node version: 18
   ```

3. **Deploy automático**
   - Cada push a main/master → deploy automático
   - URL: https://tu-app.netlify.app

### Opción B: Vercel (1-click deploy)

1. **Importar proyecto**
   - Ve a https://vercel.com
   - Click "New Project"
   - Importa desde Git

2. **Configuración automática**
   - Vercel detecta Vite automáticamente
   - Build: `npm run build`
   - Output: `dist`

3. **Deploy**
   - URL: https://tu-app.vercel.app
   - HTTPS automático + CDN global

### Opción C: GitHub Pages (Gratis)

1. **Agregar base a vite.config.ts**
   ```typescript
   export default defineConfig({
     base: '/nombre-repo/',
     // ... resto de config
   })
   ```

2. **Agregar script a package.json**
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. **Instalar gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```
   - URL: https://tu-usuario.github.io/nombre-repo

---

## Método 3: Docker (Para producción enterprise)

### Dockerfile incluido
```bash
# Build imagen
docker build -t credvault-pro .

# Ejecutar contenedor
docker run -p 8080:80 credvault-pro

# Acceder en http://localhost:8080
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
```

```bash
docker-compose up -d
```

---

## Estructura de Archivos Post-Build

```
dist/
├── index.html              # HTML principal
├── assets/
│   ├── index-[hash].js    # JavaScript minificado
│   ├── index-[hash].css   # CSS minificado
│   └── lucide-[hash].js   # Iconos (código split)
└── vite.svg               # Favicon
```

---

## Troubleshooting Común

### Error: "Cannot find module 'vite'"
```bash
# Fix: reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: TypeScript compilation failed
```bash
# Fix: verificar archivos .ts/.tsx
npm run build -- --mode development
# Esto mostrará errores detallados
```

### Build muy lento
```bash
# Limpiar cache
rm -rf node_modules/.vite
npm run build
```

### Error 404 al navegar en rutas
**Problema**: La app usa client-side routing  
**Fix en Netlify**: Crear `public/_redirects`
```
/*    /index.html   200
```

**Fix en Vercel**: Crear `vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## Optimizaciones de Build

### 1. Reducir bundle size
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'lucide': ['lucide-react']
        }
      }
    }
  }
})
```

### 2. Habilitar compresión
```bash
# Instalar plugin
npm install --save-dev vite-plugin-compression

# Agregar a vite.config.ts
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [react(), compression()]
})
```

### 3. PWA (Progressive Web App)
```bash
npm install --save-dev vite-plugin-pwa

# Agregar a vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      manifest: {
        name: 'CredVault Pro',
        short_name: 'CredVault',
        theme_color: '#3b82f6'
      }
    })
  ]
})
```

---

## Variables de Entorno (Opcional)

### Crear archivo .env
```env
VITE_APP_NAME=CredVault Pro
VITE_VERSION=2.0.0
```

### Usar en código
```typescript
const appName = import.meta.env.VITE_APP_NAME
```

### En producción (Netlify/Vercel)
- Agregar en dashboard de hosting
- No commitear .env a Git

---

## Checklist Pre-Deploy

- [ ] `npm install` ejecutado sin errores
- [ ] `npm run build` genera carpeta `dist/`
- [ ] `npm run preview` muestra app funcionando
- [ ] Biometría funciona (si está habilitada)
- [ ] Import/Export de credenciales funciona
- [ ] Parser detecta .env, JSON, YAML
- [ ] LocalStorage persiste data
- [ ] Responsive en mobile

---

## Comandos Rápidos

```bash
# Setup inicial
npm install

# Desarrollo
npm run dev

# Compilar
npm run build

# Preview
npm run preview

# Deploy (con gh-pages)
npm run deploy

# Limpiar cache
rm -rf node_modules/.vite dist
```

---

## Métricas de Build

### Bundle Size Target
- **Total**: < 300KB gzipped
- **JavaScript**: ~220KB
- **CSS**: ~50KB
- **HTML**: ~5KB

### Performance
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90

### Verificar
```bash
npm run build

# Ver tamaño de archivos
ls -lh dist/assets/
```

---

## Soporte

**Versión Node.js recomendada**: 18.x o 20.x  
**Navegadores soportados**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

Para issues: revisar console del browser (F12) y logs de build.
