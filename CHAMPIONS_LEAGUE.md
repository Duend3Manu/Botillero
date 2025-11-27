# Champions League - Nuevos Comandos

## Descripción
Se han agregado dos nuevos comandos para obtener información de la UEFA Champions League con datos actualizados.

## Comandos

### 1. `!champion` - Partidos de Champions League
Muestra los próximos partidos de la Champions League con horarios en Chile.

**Uso:**
```
!champion
```

**Ejemplo de respuesta:**
```
⚽ CHAMPIONS LEAGUE - PARTIDOS ⚽

━━━━━━━━━━━━━━━━━━━━━━━
📅 Hora Chile: 27/11/2025 01:46

1. 21:00h
   Manchester City vs PSG
─────────────────
2. 21:00h
   Real Madrid vs Liverpool
─────────────────
3. 20:45h
   Bayern Munich vs Napoli
─────────────────
4. 20:45h
   Inter Milan vs Barcelona
─────────────────

✅ Total: 4 partidos
```

### 2. `!tchampion` - Tabla de Posiciones
Muestra la tabla de posiciones de la Champions League con los puntos que tiene cada equipo.

**Uso:**
```
!tchampion
```

**Ejemplo de respuesta:**
```
🏆 CHAMPIONS LEAGUE - TABLA 🏆

━━━━━━━━━━━━━━━━━━━━━━━
POS │ EQUIPO                 │ PTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 1  │ Real Madrid          │  15
 2  │ Manchester City      │  13
 3  │ Bayern Munich        │  12
 4  │ PSG                  │  11
 5  │ Liverpool            │  10
 6  │ Inter Milan          │   9
 7  │ Barcelona            │   8
 8  │ Napoli               │   7
━━━━━━━━━━━━━━━━━━━━━━━
```

## Características
- ✅ Horarios mostrados en zona horaria de Chile
- ✅ Información en tiempo real desde UEFA
- ✅ Tabla de posiciones con puntos de cada equipo
- ✅ Datos formateados de manera clara y legible

## Notas técnicas
- Los comandos utilizan web scraping con Puppeteer y Cheerio
- Los datos se actualizan cada vez que se ejecuta el comando
- En caso de que la página no cargue correctamente, se muestran datos de ejemplo

## Archivos modificados
- `src/services/champions.service.js` - Servicio principal de scraping
- `src/handlers/command.handler.js` - Integración de los comandos
- `scripts/python/champions.py` - Script Python alternativo

## Próximas mejoras
- [ ] Integración con API de football-data.org para datos más precisos
- [ ] Añadir jornada actual y próxima
- [ ] Mostrar resultados recientes
- [ ] Estadísticas de goleadores
