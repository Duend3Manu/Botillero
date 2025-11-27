# 🚀 Quick Start - Botillero IA

## ⚡ Inicio en 5 Minutos

### 1. Clonar
```bash
git clone https://github.com/Duend3Manu/Botillero.git
cd Botillero
```

### 2. Instalar
```bash
npm install
cp .env.example .env
# Edita .env y agrega GEMINI_API_KEY
```

### 3. Ejecutar
```bash
node index.js
# Escanea el QR con WhatsApp
```

### 4. ¡Listo!
```
!metro          → Estado del metro + rutas inteligentes
!resume [URL]   → Resume artículos
!menu           → Ver todos los comandos
```

---

## 🎯 Nuevas Funciones

### Metro Inteligente
```
Usuario: !metro
Bot: 📍 Metro Normal ✅
     L3: PROBLEMAS ⚠️
     
     💡 Consejo: Usa L2 + L5
```

### Resumidor de URLs
```
Usuario: https://ejemplo.com
Bot: 📄 Resumen automático...

Usuario: !resume https://ejemplo.com
Bot: 📄 Resumen manual...
```

---

## 💡 Cooldown Explicado

- **7 segundos** entre peticiones de IA
- Mantiene API **completamente gratis**
- Válido para: `!ayuda`, `!metro`, `!resume`

```
Usuario 1: !metro (activado)
Usuario 2: !resume (espera 5 seg)
Usuario 3: !resume (espera 2 seg) ← ⏳ "Calma, espera..."
```

---

## 📁 Estructura Clave

```
src/
├── handlers/
│   ├── url-summary.handler.js       ← URLs automáticas
│   └── command.handler.js            ← !resume command
│
├── services/
│   ├── rate-limiter.service.js      ← Control de velocidad
│   ├── url-summarizer.service.js    ← Extractor de URLs
│   └── metro.service.js              ← Metro + IA
```

---

## 🔧 Troubleshooting

| Problema | Solución |
|----------|----------|
| Bot no responde | Escanea QR de nuevo |
| Error API Key | Verifica `.env` tiene `GEMINI_API_KEY` |
| URLs no resumen | Instala: `npm install cheerio` |
| Rate limit | Espera 7 segundos |

---

## 💰 Gratis Forever

```
Gemini:  $0/mes (12,000 peticiones)
Weather: $0/mes (2,000 peticiones)
Total:   $0/mes ✅
```

---

## 📚 Docs Completas

- [IA_IMPROVEMENTS.md](./IA_IMPROVEMENTS.md) - Detalles
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deploy
- [README.md](./README.md) - Principal

---

**¡Enjoy! 🎉**
