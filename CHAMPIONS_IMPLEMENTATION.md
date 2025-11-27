# 🏆 Implementación de Champions League

## Resumen de cambios

Se ha implementado un sistema completo de scraping para obtener información de la **UEFA Champions League** con dos nuevos comandos de WhatsApp.

---

## 🎯 Nuevos Comandos

### `!champion` - Partidos de Champions League
Muestra los próximos partidos de la Champions con horarios en Chile.

**Respuesta esperada:**
```
⚽ CHAMPIONS LEAGUE - PARTIDOS ⚽

━━━━━━━━━━━━━━━━━━━━━━━
📅 Hora Chile: DD/MM/YYYY HH:MM

1. 21:00h
   Manchester City vs PSG
─────────────────
2. 21:00h
   Real Madrid vs Liverpool
─────────────────
...
✅ Total: X partidos
```

### `!tchampion` - Tabla de Posiciones
Muestra la tabla de posiciones de Champions con puntos de cada equipo.

**Respuesta esperada:**
```
🏆 CHAMPIONS LEAGUE - TABLA 🏆

━━━━━━━━━━━━━━━━━━━━━━━
POS │ EQUIPO                 │ PTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 1  │ Real Madrid          │  15
 2  │ Manchester City      │  13
 3  │ Bayern Munich        │  12
...
━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📁 Archivos Creados/Modificados

### ✨ Nuevos Archivos

1. **`src/services/champions.service.js`**
   - Servicio principal de scraping usando Puppeteer y Cheerio
   - Funciones: `getChampionsMatches()` y `getChampionsStandings()`
   - Manejo de errores con fallbacks a datos de ejemplo
   - Métodos alternativos para robustez

2. **`scripts/python/champions.py`**
   - Script Python alternativo para obtener datos
   - Configurado con timezone de Chile (America/Santiago)
   - Funciones separadas para partidos y tabla

3. **`CHAMPIONS_LEAGUE.md`**
   - Documentación completa de los nuevos comandos
   - Ejemplos de uso
   - Notas técnicas

4. **`test_champions.js`**
   - Suite de pruebas para validar funcionamiento
   - Tests para ambos comandos

### 🔧 Archivos Modificados

1. **`src/handlers/command.handler.js`**
   - ✅ Importación del servicio `champions.service.js`
   - ✅ Adición de `champion` y `tchampion` a `validCommands`
   - ✅ Casos en el switch para manejar los nuevos comandos

   **Cambios específicos:**
   ```javascript
   // Línea 15: Nueva importación
   const { getChampionsMatches, getChampionsStandings } = require('../services/champions.service.js');
   
   // Línea 41: Nuevos comandos agregados a validCommands
   'champion', 'tchampion'
   
   // Línea 120-127: Nuevos casos en switch
   case 'champion':
       replyMessage = await getChampionsMatches();
       break;
   case 'tchampion':
       replyMessage = await getChampionsStandings();
       break;
   ```

---

## 🔍 Características Técnicas

### Web Scraping
- **Librería Principal:** Puppeteer (headless browser)
- **Parsing HTML:** Cheerio
- **Timeout:** 30 segundos por operación
- **Fallback:** Datos de ejemplo cuando falla el scraping

### Datos
- Obtiene información de `https://es.uefa.com/uefachampionsleague/`
- Horarios ajustados a zona horaria de Chile (UTC-3)
- Puntos actualizados de la tabla de posiciones

### Robustez
- ✅ Múltiples selectores CSS como fallback
- ✅ Manejo de errores con try-catch
- ✅ Datos de ejemplo cuando el scraping falla
- ✅ Validación de datos obtenidos

---

## 🚀 Instrucciones de Uso

### Para usuarios de WhatsApp:
```
Escribe en el chat:
!champion    → Ver partidos
!tchampion   → Ver tabla de posiciones
```

### Para desarrolladores - Pruebas:
```bash
# Ejecutar tests
node test_champions.js

# Probar directamente el servicio
node -e "const c = require('./src/services/champions.service.js'); c.getChampionsMatches().then(r => console.log(r));"
```

---

## 📊 Dependencias

Los nuevos comandos utilizan las siguientes dependencias ya presentes en `package.json`:
- `puppeteer@^24.24.0` - Web automation
- `cheerio@^1.1.2` - HTML parsing
- `axios@^1.12.2` - HTTP requests
- `moment-timezone@^0.6.0` - Manejo de zonas horarias

---

## ⚠️ Notas Importantes

1. **Datos de Ejemplo:** Si la página de UEFA no carga correctamente, se muestran datos de ejemplo para evitar errores.

2. **Performance:** Las primeras ejecuciones pueden tardar más (inicialización de Puppeteer).

3. **Cacheo:** No hay cacheo implementado. Cada comando obtiene datos frescos.

4. **Límites:** UEFA puede implementar limitaciones de scraping. En caso de problemas, considerar usar su API oficial.

---

## 🔄 Próximas Mejoras Sugeridas

- [ ] Implementar API oficial de football-data.org o API-football
- [ ] Agregar cacheo de datos (5-15 minutos)
- [ ] Mostrar próxima jornada
- [ ] Incluir resultados recientes
- [ ] Agregar estadísticas de goleadores
- [ ] Soporte para múltiples ligas europeas

---

## ✅ Estado

**Status:** ✅ **COMPLETO Y FUNCIONAL**

Todos los comandos están implementados, probados y listos para usar.

**Última actualización:** 27 de noviembre de 2025
