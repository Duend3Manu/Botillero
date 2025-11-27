# Botillero 🤖🍷

Un bot de WhatsApp inteligente que mezcla humor, utilidades y **IA potente** para alegrar el grupo.  
Hecho con cariño por Manu.

## ✨ Características

- **🚇 Metro Inteligente**: Detecta problemas y sugiere rutas alternas con IA
- **📄 Resumidor de URLs**: Extrae y resume artículos automáticamente
- **⚙️ Servicios útiles**: Clima, feriados, farmacias, metro, sismos, buses, cortes de luz
- **⚽ Fútbol**: Tablas, partidos, clasificatorias
- **🎮 Entretenimiento**: Audios, stickers, chistes, horóscopos, cuentas regresivas
- **🧠 IA**: Ayuda con comandos y análisis inteligente usando Gemini
- **🔍 Búsquedas**: Wikipedia, Google, noticias, patentes, teléfonos, dominios
- **👀 Detección**: Edición y eliminación de mensajes
- **💰 Económico**: API gratis con cooldown de 7 segundos

## 📋 Requisitos

- Node.js 16+
- Python 3.x
- Cuenta de WhatsApp

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Obligatorias para funcionalidad completa
GEMINI_API_KEY=tu_api_key_aqui          # Para IA: !ayuda, !metro, !resume
WEATHER_API_KEY=tu_api_key_aqui         # Para comando !clima

# Opcionales
NOTIFICATION_PORT=3001                   # Puerto API notificaciones
NOTIFICATION_GROUP_ID=tu_grupo_id       # ID del grupo para notificaciones
PYTHON=python                           # Comando Python (python o python3)
```

**Obtén gratis:**
- Gemini API: https://makersuite.google.com/app/apikey
- Weather API: https://www.weatherapi.com/

## 💰 Costos

| Servicio | Peticiones/mes | Costo |
|----------|---|---|
| Gemini AI | ~12,000 | **$0** |
| Weather API | ~2,000 | **$0** |
| **TOTAL** | - | **$0 USD** |

*Con cooldown de 7 segundos entre peticiones de IA, el uso se mantiene dentro del plan gratuito indefinidamente.*

## 📦 Instalación

```bash
# Instalar dependencias Node.js
npm install

# Instalar dependencias Python
pip install -r requirements.txt

# Iniciar el bot
node index.js
```

## 🎮 Comandos Principales

Escribe `!menu` en WhatsApp para ver todos los comandos disponibles.

### ✨ Nuevos (Con IA)
- `!metro` - Estado del metro **+ recomendaciones de rutas alternas** si hay problemas
- `!resume [URL]` - **Resume artículos web** automáticamente
- Solo comparte una URL en el grupo y el bot la resume automáticamente

### Ejemplos de Uso
- `!clima santiago` - Consulta el clima
- `!far ñuñoa` - Farmacias de turno
- `!s` - Crear sticker (responde a imagen/video)
- `!audios` - Lista de audios disponibles
- `!ayuda [pregunta]` - Ayuda con IA

## 🛠️ Arquitectura

```
src/
├── handlers/     # Lógica de comandos
├── services/     # Servicios externos y Python
├── utils/        # Utilidades (DB, logger, etc)
├── platforms/    # Adaptadores de WhatsApp
└── config/       # Configuración
```

## 📚 Documentación

Para más información, consulta:

- **[IA_IMPROVEMENTS.md](./IA_IMPROVEMENTS.md)** - Guía completa de mejoras de IA
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Pasos para deployment
- **[EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)** - Resumen ejecutivo

## 📝 Logs

Los logs se guardan automáticamente en `bot.log` (rotación automática a 5MB).

---

**Versión**: 2.0 - Arquitectura Modular con IA

Última actualización: [commit a6b8372](https://github.com/Duend3Manu/Botillero/commit/a6b8372)
