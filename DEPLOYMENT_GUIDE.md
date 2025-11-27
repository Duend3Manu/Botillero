# 🚀 Guía de Deployment - Mejoras de IA

## ✅ Checklist Pre-Deployment

Antes de subir los cambios, verifica:

- [ ] `GEMINI_API_KEY` está configurada en tu `.env`
- [ ] No hay errores en la consola
- [ ] Los archivos nuevos están creados
- [ ] Las importaciones están correctas

## 📦 Pasos de Instalación

### 1. Verifica Dependencias
```bash
npm list @google/generative-ai axios cheerio
```

Si falta alguna:
```bash
npm install @google/generative-ai axios cheerio
```

### 2. Configura tu .env
```bash
# Asegúrate de tener en .env:
GEMINI_API_KEY=tu_clave_aqui
```

### 3. Inicia el bot
```bash
node index.js
```

### 4. Prueba en WhatsApp
```
1. Envía: !metro
   → Debe mostrar estado + consejo (si hay problemas)

2. Comparte una URL en el grupo
   → Bot debe responder automáticamente con resumen

3. Usa: !resume https://ejemplo.com
   → Bot debe resumir la URL
```

## 🔍 Verificación de Logs

Busca estos logs para confirmar que todo funciona:

### Comando !metro
```
(Servicio Metro) -> Ejecutando metro.py...
(Metro Service) -> Analizando estado para generar consejo...
```

### Comando !resume o detección automática
```
(URL Summary) -> Resumiendo: https://...
```

### Cooldown activo
```
⏳ Calma las pasiones, espera X segundos...
```

## ⚙️ Troubleshooting

### Error: "La API Key de Gemini no está configurada"
**Solución:** 
1. Verifica que `GEMINI_API_KEY` esté en `.env`
2. No olvides recargar el bot después de cambiar `.env`

### Error: "No pude acceder a la URL"
**Solución:**
1. La URL es inválida o el sitio está bloqueado
2. Intenta con otra URL
3. Verifica conexión a internet

### Bot no responde a URLs automáticamente
**Solución:**
1. Verifica que hayas compartido una URL completa (`https://...`)
2. Revisa los logs para errores
3. Reinicia el bot

### Cooldown muy restrictivo
**Nota:** Es intencional (7 segundos) para mantener la API gratis. 
Puedes ajustar en `src/services/rate-limiter.service.js`:
```javascript
const AI_COOLDOWN_SECONDS = 7; // Cambia este valor
```

## 📊 Monitoreo de Uso

Para ver cuántas peticiones se hacen:

1. **Agrupa logs por tipo:**
```bash
# En la consola del bot
grep "(Metro)" botillero.log | wc -l
grep "(URL Summary)" botillero.log | wc -l
```

2. **Revisa el dashboard de Google:**
   - Accede a: https://makersuite.google.com/
   - Dashboard → Gemini API → Usage

## 🎯 Comandos Relacionados

Con estas mejoras, también puedes:

| Comando | Efecto | Cooldown |
|---------|--------|----------|
| `!ayuda [duda]` | Busca comando con IA | 7s |
| `!metro` | Metro + rutas alternas si hay problemas | 7s (solo si hay problemas) |
| `!resume [URL]` | Resume artículos | 7s |
| URLs en chat | Resume automático | 7s |

## 📞 Soporte Rápido

**Problema:** Bot no funciona
**Solución:** 
```bash
# 1. Reinicia
node index.js

# 2. Verifica .env
cat .env | grep GEMINI_API_KEY

# 3. Comprueba logs
# Busca errores específicos en la consola
```

---

**¡Deployment completado! 🎉**

Tu Botillero ahora tiene IA potente y económica integrada.
