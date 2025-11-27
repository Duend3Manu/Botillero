# Botillero Xiaomi 🤖🍷

Un bot de WhatsApp que mezcla humor, signos, audios y utilidades para alegrar el grupo.  
Hecho con cariño por Manu.

## 🚀 Características

- **Comandos de utilidad**: Clima, feriados, farmacias, metro, sismos, buses, cortes de luz
- **Fútbol**: Tablas, partidos, clasificatorias
- **Entretenimiento**: Audios, stickers, chistes, horóscopos, cuentas regresivas
- **IA**: Ayuda con comandos usando Gemini AI
- **Búsquedas**: Wikipedia, Google, noticias, patentes, teléfonos, dominios
- **Detección**: Edición y eliminación de mensajes

## 📋 Requisitos

- Node.js 16+
- Python 3.x
- Cuenta de WhatsApp

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Obligatorias para funcionalidad completa
GEMINI_API_KEY=tu_api_key_aqui          # Para comando !ayuda (IA)
WEATHER_API_KEY=tu_api_key_aqui         # Para comando !clima

# Opcionales
NOTIFICATION_PORT=3001                   # Puerto API notificaciones
NOTIFICATION_GROUP_ID=tu_grupo_id       # ID del grupo para notificaciones
PYTHON=python                           # Comando Python (python o python3)
```

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

### Algunos ejemplos:
- `!clima santiago` - Consulta el clima
- `!metro` - Estado del metro
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

## 📝 Logs

Los logs se guardan automáticamente en `bot.log` (rotación automática a 5MB).

---

**Versión**: 2.0 - Arquitectura Modular
