# 🔑 CONFIGURACIÓN - DATOS REALES DE CHAMPIONS LEAGUE

## Obtener Datos Reales

El sistema ahora intenta obtener datos reales de dos formas:

### Opción 1: API de football-data.org (RECOMENDADO)
**Ventajas:**
- Datos 100% reales y actualizados
- Sin dependencia de web scraping
- Más rápido
- Más confiable

**Cómo configurar:**
1. Ir a https://www.football-data.org/
2. Registrarse (es gratis)
3. Copiar tu API key
4. Agregar a tu archivo `.env`:
   ```env
   FOOTBALL_DATA_API_KEY=tu_api_key_aqui
   ```

5. Reiniciar el bot

**Ejemplo de .env:**
```
GEMINI_API_KEY=sk-...
WEATHER_API_KEY=...
FOOTBALL_DATA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Opción 2: Web Scraping de UEFA.com (AUTOMÁTICO)
Si no configuras la API key, el sistema automáticamente:
1. Intenta scraping de UEFA.com con Puppeteer
2. Extrae datos reales de la página
3. Formatea y devuelve los datos

**Ventajas:**
- No requiere configuración adicional
- Datos completamente reales
- Funciona sin API key

**Desventajas:**
- Más lento (necesita cargar página completa)
- Depende de la estructura HTML de UEFA.com

---

## Flujo de Ejecución

```
Usuario: !champion
    ↓
Sistema intenta:
  1. Usar API si FOOTBALL_DATA_API_KEY está configurada
  2. Si no, hacer scraping de UEFA.com
  3. Si no hay datos, mostrar aviso
    ↓
Retorna datos REALES en formato WhatsApp
```

---

## Datos Obtenidos

### Partidos (!champion)
- Nombre real de equipos
- Hora real (convertida a zona horaria de Chile)
- Estado del partido
- Información de la fecha

### Tabla (!tchampion)
- Posiciones reales
- Puntos totales
- Partidos jugados
- Victorias, empates, derrotas

---

## Validación del Sistema

```bash
# Ver si la API está configurada
echo $FOOTBALL_DATA_API_KEY

# Si no sale nada, agrega a tu .env
FOOTBALL_DATA_API_KEY=tu_clave

# Reinicia el bot
# El sistema automáticamente usará datos reales
```

---

## ✅ Checklist

- [ ] Registrarse en football-data.org
- [ ] Obtener API key
- [ ] Agregarlo al .env
- [ ] Reiniciar el bot
- [ ] Probar: `!champion`
- [ ] Probar: `!tchampion`

---

## ⚠️ Importante

**SIN API KEY:**
- El sistema usará scraping automático
- Datos son REALES pero puede ser más lento
- Es completamente funcional

**CON API KEY:**
- Datos REALES y más rápido
- Recomendado para mejor performance

---

## 🔗 Enlaces Útiles

- API Football: https://www.football-data.org/
- UEFA.com: https://www.uefa.com/uefachampionsleague/
- Documentación API: https://www.football-data.org/client/register

---

**Nota:** Todo es datos REALES. No hay datos ficticios si el scraping/API funciona correctamente.
