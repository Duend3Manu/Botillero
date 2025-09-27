# partidos.py (Versión con filtro para todos los equipos chilenos)
import requests
from datetime import datetime, timedelta
import sys
import io
from dateutil.parser import isoparse
from zoneinfo import ZoneInfo
import locale

# --- CONFIGURACIÓN DE FECHA EN ESPAÑOL ---
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'es_CL.UTF-8')
    except locale.Error:
        print("Advertencia: No se pudo configurar el locale a español para las fechas.")

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Diccionario de ligas
LIGAS = {
    "🏆 Liga Chilena": "chi.1",
    "🇨🇱 Copa Chile": "chi.copa_chi",
    "🌎 Copa Sudamericana": "conmebol.sudamericana"
}

# Lista de equipos chilenos para filtrar en competencias internacionales
EQUIPOS_CHILENOS = [
    "Universidad de Chile", "Colo-Colo", "Universidad Católica", "Palestino",
    "Unión Española", "Audax Italiano", "Huachipato", "Everton", "Coquimbo Unido",
    "Cobresal", "O'Higgins"
]

ZONA_HORARIA_CHILE = ZoneInfo('America/Santiago')

def obtener_y_formatear_partidos(codigo_liga, fecha):
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{codigo_liga}/scoreboard?dates={fecha.strftime('%Y%m%d')}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        return []

    partidos_formateados = []
    for evento in data.get("events", []):
        try:
            equipos_data = evento["competitions"][0]["competitors"]
            equipo_local = equipos_data[0]["team"]["displayName"]
            equipo_visitante = equipos_data[1]["team"]["displayName"]
            estado_detalle = evento["status"]["type"]["shortDetail"]
            estado_tipo = evento["status"]["type"]["state"]

            if estado_tipo == "pre":
                hora_utc = isoparse(evento["date"])
                hora_chile = hora_utc.astimezone(ZONA_HORARIA_CHILE).strftime("%H:%M")
                partidos_formateados.append(f"🏟️ *{equipo_local}* vs *{equipo_visitante}* _({hora_chile})_")
            else:
                score_local = equipos_data[0].get("score", "0")
                score_visitante = equipos_data[1].get("score", "0")
                partidos_formateados.append(f"⚽ *{equipo_local}* {score_local} - {score_visitante} *{equipo_visitante}* _({estado_detalle})_")
        except (KeyError, IndexError):
            continue
    return partidos_formateados

def main():
    fecha_hoy = datetime.now(ZONA_HORARIA_CHILE)
    
    for nombre_liga, codigo in LIGAS.items():
        print(f"\n*{nombre_liga}*")
        
        partidos_de_hoy = obtener_y_formatear_partidos(codigo, fecha_hoy)
        
        # Filtro para equipos chilenos en Sudamericana
        if "Sudamericana" in nombre_liga:
            partidos_de_hoy = [p for p in partidos_de_hoy if any(team in p for team in EQUIPOS_CHILENOS)]

        if partidos_de_hoy:
            print(f"📅 Partidos para hoy, {fecha_hoy.strftime('%d-%m-%Y')}:")
            for partido in partidos_de_hoy:
                print(partido)
        else:
            if "Sudamericana" not in nombre_liga:
                print(f"🚫 No hay partidos programados para hoy.")

            encontrado_futuro = False
            for i in range(1, 8):
                fecha_futura = fecha_hoy + timedelta(days=i)
                partidos_futuros = obtener_y_formatear_partidos(codigo, fecha_futura)

                if "Sudamericana" in nombre_liga:
                    partidos_futuros = [p for p in partidos_futuros if any(team in p for team in EQUIPOS_CHILENOS)]

                if partidos_futuros:
                    print(f"📅 Próxima fecha: {fecha_futura.strftime('%A, %d de %B').capitalize()}")
                    for partido in partidos_futuros:
                        print(partido)
                    encontrado_futuro = True
                    break
            
            if not encontrado_futuro:
                if "Sudamericana" in nombre_liga:
                    # --- MENSAJE CORREGIDO ---
                    print(f"🚫 _Ningún equipo chileno tiene partidos en los próximos 7 días en esta competencia._")
                else:
                    print("🚫 _No se encontraron partidos en los próximos 7 días._")

if __name__ == "__main__":
    main()