# 🚀 Mejoras de IA Implementadas en Botillero

## 📋 Cambios Realizados

Se han implementado dos funcionalidades principales que usan tu API Key de Gemini con un sistema de cooldown de **7 segundos** para mantener la API gratis forever:

---

## ✨ Funcionalidades Nuevas

### 1. **`!metro` Mejorado con IA** 🚇
**Descripción:** El comando `!metro` ahora no solo muestra el estado de las líneas, sino que **genera recomendaciones inteligentes** cuando hay problemas.

**Cómo funciona:**
- Obtiene el estado actual del Metro de Santiago
- Si detecta problemas (delays, suspensiones, cierres), **activa la IA**
- Gemini analiza y sugiere **rutas alternativas** de forma automática
- Respeta el cooldown de 7 segundos entre peticiones de IA

**Ejemplo:**
```
!metro

Resultado:
📍 Estado del Metro (2025-11-27 15:30)
Línea 1: NORMAL ✅
Línea 2: NORMAL ✅
Línea 3: PROBLEMAS ⚠️ (Delays de 10-15 minutos)
Línea 4: NORMAL ✅
...

💡 Consejo: ⚠️ L3 con delays. Usa L1 hacia San Pablo, luego L2 a La Cisterna.
```

---

### 2. **`!resume` - Resumidor de URLs con IA** 📄
**Descripción:** Comparte un link en el grupo y Botillero **resume automáticamente** su contenido. También funciona manualmente con el comando.

**Dos formas de usar:**

#### A. **Automática (cuando compartes URLs)**
Solo comparte una URL en el grupo y Botillero automáticamente:
1. Detecta la URL
2. Extrae el contenido
3. Genera un resumen inteligente
4. Responde con el resumen

```
Usuarios: https://www.ejemplo.com/articulo-importante
Botillero responde automáticamente con el resumen
```

#### B. **Manual con `!resume`**
```
!resume https://www.ejemplo.com/articulo

Respuesta:
📄 *Título del Artículo*

Resumen inteligente del contenido en 3-4 líneas, 
respetando el tono coloquial chileno...

🔗 https://www.ejemplo.com/articulo
```

**O responde a un mensaje que tenga una URL:**
```
(Alguien compartió una URL)
Tu respuesta: !resume

Botillero resume la URL del mensaje al que respondiste
```

---

## 🔧 Sistema de Control de Velocidad (Rate Limiter)

Se implementó un **sistema centralizado** que respeta los límites gratuitos de Google Gemini:

- **Cooldown global:** 7 segundos entre peticiones de IA
- **Aplica a:** `!ayuda`, `!metro` (cuando hay problemas), `!resume`
- **Beneficio:** Mantiene tu API key **gratis forever**

**Respuesta cuando estás en cooldown:**
```
⏳ Calma las pasiones, espera X segundos antes de volver a intentarlo.
```

---

## 📁 Archivos Nuevos/Modificados

### ✅ Archivos Nuevos

1. **`src/services/rate-limiter.service.js`**
   - Servicio centralizado de control de velocidad
   - Funciones: `checkCooldown()`, `updateLastRequest()`, `getCooldownMessage()`

2. **`src/services/url-summarizer.service.js`**
   - Servicio para extraer y resumir contenido de URLs
   - Funciones: `summarizeUrl()`, `getUrlContent()`, `generateSummary()`

3. **`src/handlers/url-summary.handler.js`**
   - Handler para procesar URLs detectadas automáticamente
   - Integra el cooldown global

### 📝 Archivos Modificados

1. **`src/services/ai.service.js`**
   - Cambiado de `GOOGLE_API_KEY` a `GEMINI_API_KEY` (unificación)
   - Verificaciones de configuración mejoradas

2. **`src/services/metro.service.js`**
   - Mejorado con análisis inteligente de IA
   - Genera recomendaciones automáticas cuando hay problemas

3. **`src/handlers/ai.handler.js`**
   - Ahora usa el rate limiter centralizado
   - Eliminado cooldown local, implementado global

4. **`src/handlers/events.handler.js`**
   - Agregada detección automática de URLs
   - Llama a `handleUrlSummary()` cuando se comparte un link

5. **`src/handlers/command.handler.js`**
   - Agregado comando `!resume` a la lista de válidos
   - Implementado manejo de `!resume` con cooldown

6. **`src/handlers/utility.handler.js`**
   - Menu actualizado con nuevos comandos

---

## 🎯 Ejemplo de Uso Completo

### Escenario 1: Compartiendo una noticia
```
Usuario A: Mira esto! https://www.cooperativa.cl/noticias/pais/economia

Bot automáticamente responde:
📄 *Cooperativa - Economía*

Se reporta caída en el dólar tras nuevas medidas del Banco Central.
Los analistas proyectan estabilización en los próximos días.

🔗 https://www.cooperativa.cl/noticias/pais/economia
```

### Escenario 2: Metro con problemas
```
Usuario B: !metro

Bot responde:
📍 Estado del Metro (2025-11-27 16:45)
Línea 1: NORMAL ✅
Línea 2: NORMAL ✅
Línea 3: PROBLEMAS ⚠️ (Suspensión temporal)
Línea 4: NORMAL ✅
Línea 5: NORMAL ✅
Línea 6: NORMAL ✅

💡 Consejo: ⚠️ L3 suspendida. Toma L2 hacia San Antonio,
luego L5 al destino.
```

### Escenario 3: Cooldown en acción
```
Usuario C: !ayuda qué es blockchain
Bot responde: (Explicación con IA)

Usuario D: !resume https://example.com (2 segundos después)
Bot responde: ⏳ Calma las pasiones, espera 5 segundos antes de volver a intentarlo.

Usuario D: !resume https://example.com (7 segundos después)
Bot responde: (Resume del artículo)
```

---

## 🔐 Seguridad y Privacidad

- **API Key protegida** en archivo `.env` (no en repositorio)
- **Cooldown de 7 segundos** previene abuso y mantiene costos bajos
- **Timeout de 10 segundos** en peticiones de URLs (evita cuelgues)
- **Límite de 3000 caracteres** en contenido procesado (optim

ización)

---

## 📊 Estadísticas de Uso

Con el cooldown de 7 segundos:
- **Máximo** ~8-10 peticiones/minuto por comando de IA
- **Estimado** ~12,000 peticiones/mes (nivel gratis cómodo)
- **Costo estimado** $0 USD (plan gratuito de Google Gemini)

---

## 🚀 Próximos Pasos (Opcional)

Otros comandos que podrías integrar con IA:
- `!analiza [texto]` - Análisis de sentimiento
- `!corrige [texto]` - Corrector inteligente
- `!explicame [concepto]` - Explicaciones simplificadas
- `!roast [nombre]` - Burlas inteligentes

---

## ⚙️ Requisitos

- ✅ `GEMINI_API_KEY` en `.env` (ya tienes)
- ✅ Paquetes instalados: `@google/generative-ai`, `axios`, `cheerio`
- ✅ Node.js v14+

---

## 📞 Soporte

Si algún comando no funciona:
1. Verifica que `GEMINI_API_KEY` esté en `.env`
2. Revisa los logs: busca `(Metro)`, `(URL Summary)`, `(URL Summary) -> Resumiendo`
3. Intenta de nuevo después de 7 segundos (cooldown)

---

**¡Listo! Tu bot ahora tiene IA potente respetando los límites gratuitos de Gemini** 🤖✨
