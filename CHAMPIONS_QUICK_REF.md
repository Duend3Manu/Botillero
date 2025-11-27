# 🏆 Champions League - Quick Reference

## Comandos Disponibles

| Comando | Descripción | Respuesta |
|---------|-------------|-----------|
| `!champion` | Partidos de Champions League | Lista de próximos partidos con horarios en Chile |
| `!tchampion` | Tabla de posiciones | Top 8 equipos con sus puntos |

---

## Ejemplos de Uso

### Obtener Partidos
```
Usuario: !champion
Bot: ⚽ CHAMPIONS LEAGUE - PARTIDOS ⚽
    📅 Hora Chile: 27/11/2025 01:47
    1. 21:00h - Manchester City vs PSG
    2. 21:00h - Real Madrid vs Liverpool
    3. 20:45h - Bayern Munich vs Napoli
    4. 20:45h - Inter Milan vs Barcelona
```

### Obtener Tabla
```
Usuario: !tchampion
Bot: 🏆 CHAMPIONS LEAGUE - TABLA 🏆
    POS │ EQUIPO          │ PTS
    ─────────────────────────────
     1  │ Real Madrid     │  15
     2  │ Manchester City │  13
     3  │ Bayern Munich   │  12
     4  │ PSG             │  11
     5  │ Liverpool       │  10
     6  │ Inter Milan     │   9
     7  │ Barcelona       │   8
     8  │ Napoli          │   7
```

---

## Información Técnica

**Ubicación de comandos:** `src/handlers/command.handler.js`
**Servicio:** `src/services/champions.service.js`
**Métodos de scraping:** Puppeteer + Cheerio

---

## Funcionalidades

✅ Horarios en zona horaria de Chile
✅ Información en tiempo real desde UEFA.com
✅ Tabla con puntos actualizados
✅ Fallback a datos de ejemplo si falla el scraping
✅ Formato limpio y legible

---

## Requisitos

- Node.js 14+
- Puppeteer instalado
- Cheerio instalado
- Conexión a internet para scraping

