# partidos.py
import requests
from datetime import datetime, timedelta
import sys
import io
from zoneinfo import ZoneInfo

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Diccionario de ligas
LIGAS = {
    "🏆 Liga Chilena": "chi.1",
    "🇨🇱 Copa Chile": "chi.copa_chi"
}

ZONA_HORARIA_CHILE = ZoneInfo('America/Santiago')

# Traducción manual para no depender del sistema operativo (locale)
DIAS_SEMANA = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"}
MESES = {1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"}

def formatear_fecha(dt):
    """Formatea fecha en español sin depender de locale."""
    dia = DIAS_SEMANA[dt.weekday()]
    mes = MESES[dt.month]
    return f"{dia}, {dt.day} de {mes}"

def obtener_y_formatear_partidos(codigo_liga, fecha):
    """
    Obtiene los partidos de una liga para una fecha específica.
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

            estado_detalle = evento["status"]["type"]["shortDetail"]
            estado_tipo = evento["status"]["type"]["state"]

            if estado_tipo == "pre":
                # Parseo manual ISO8601 para evitar dependencia de dateutil
                hora_utc = datetime.fromisoformat(evento["date"].replace('Z', '+00:00'))
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

        if partidos_de_hoy:
            print(f"📅 Partidos para hoy, {fecha_hoy.strftime('%d-%m-%Y')}:")
            for partido in partidos_de_hoy:
                print(partido)
        else:
            print(f"🚫 No hay partidos programados para hoy.")

            encontrado_futuro = False
            for i in range(1, 8):
                fecha_futura = fecha_hoy + timedelta(days=i)
                partidos_futuros = obtener_y_formatear_partidos(codigo, fecha_futura)

                if partidos_futuros:
                    print(f"📅 Próxima fecha: {formatear_fecha(fecha_futura)}")
                    for partido in partidos_futuros:
                        print(partido)
                    encontrado_futuro = True
                    break
            
            if not encontrado_futuro:
                print("🚫 _No se encontraron partidos en los próximos 7 días._")

if __name__ == "__main__":
    main()