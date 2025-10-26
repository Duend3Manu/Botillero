# partidos.py (Versión con filtro de equipos chilenos corregido)
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

def obtener_y_formatear_partidos(codigo_liga, fecha, filtrar_chilenos=False):
    """
    Obtiene los partidos de una liga para una fecha específica.
    Si 'filtrar_chilenos' es True, solo devuelve partidos de equipos chilenos.
    """
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

            # --- LÓGICA DE FILTRADO MEJORADA ---
            # Si se activa el filtro, y ninguno de los dos equipos es chileno, saltamos al siguiente partido.
            if filtrar_chilenos and (equipo_local not in EQUIPOS_CHILENOS and equipo_visitante not in EQUIPOS_CHILENOS):
                continue

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
        
        es_internacional = "Sudamericana" in nombre_liga
        
        partidos_de_hoy = obtener_y_formatear_partidos(codigo, fecha_hoy, filtrar_chilenos=es_internacional)

        if partidos_de_hoy:
            print(f"📅 Partidos para hoy, {fecha_hoy.strftime('%d-%m-%Y')}:")
            for partido in partidos_de_hoy:
                print(partido)
        else:
            if not es_internacional:
                print(f"🚫 No hay partidos programados para hoy.")

            encontrado_futuro = False
            for i in range(1, 8):
                fecha_futura = fecha_hoy + timedelta(days=i)
                partidos_futuros = obtener_y_formatear_partidos(codigo, fecha_futura, filtrar_chilenos=es_internacional)

                if partidos_futuros:
                    print(f"📅 Próxima fecha: {fecha_futura.strftime('%A, %d de %B').capitalize()}")
                    for partido in partidos_futuros:
                        print(partido)
                    encontrado_futuro = True
                    break
            
            if not encontrado_futuro:
                if es_internacional:
                    print(f"🚫 _Ningún equipo chileno tiene partidos en los próximos 7 días en esta competencia._")
                else:
                    print("🚫 _No se encontraron partidos en los próximos 7 días._")

if __name__ == "__main__":
    main()