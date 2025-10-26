# -*- coding: utf-8 -*-
import sys
from bs4 import BeautifulSoup
import requests
from unidecode import unidecode
from datetime import datetime
import io
from zoneinfo import ZoneInfo
import re

# Configurar la salida estándar para soportar UTF-8 (importante para emojis)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- DICCIONARIOS Y LISTAS DE CONFIGURACIÓN ---
LINES = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 4a', 'Línea 5', 'Línea 6']
STATUSES = {
    'estado1': 'Operativa',
    'estado4': 'Accesos Cerrados',
    'estado2': 'Estación Cerrada',
    'estado3': 'Estación Cerrada' # ¡NUEVO! Se añade el nuevo estado para estaciones cerradas.
}
COLORS = {
    'Línea 1': '🔴',
    'Línea 2': '🟡',
    'Línea 3': '🟤',
    'Línea 4': '🔵',
    'Línea 4a': '🔷',
    'Línea 5': '🟢',
    'Línea 6': '🟣'
}

# --- FUNCIONES ---

def get_latest_telegram_alert():
    """
    Obtiene el último post del canal de Telegram @metrosantiagoalertas.
    """
    url = "https://t.me/s/metrosantiagoalertas"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Encontrar todos los contenedores de mensajes
        messages = soup.find_all('div', class_='tgme_widget_message_wrap')
        
        if not messages:
            return "\n\nNo se pudo obtener la última alerta de Telegram."

        # El último mensaje en la página es el más reciente
        latest_message = messages[-1]
        
        # Extraer el texto del mensaje
        message_text_div = latest_message.find('div', class_='tgme_widget_message_text')
        if not message_text_div:
            return "\n\nNo se pudo parsear el texto de la alerta de Telegram."
            
        raw_text = message_text_div.get_text(separator='\n', strip=True)
        
        # Limpiamos el texto para que los emojis no queden en líneas separadas
        # y reemplazamos múltiples saltos de línea por uno solo.
        message_text = re.sub(r'\n+', '\n', raw_text).strip()

        # Extraer la hora del mensaje
        time_tag = latest_message.find('time', class_='time')
        message_time_str = ""
        if time_tag and 'datetime' in time_tag.attrs:
            try:
                # La fecha/hora viene en formato ISO (UTC)
                utc_time = datetime.fromisoformat(time_tag['datetime'])
                # La convertimos a la zona horaria de Chile
                santiago_time = utc_time.astimezone(ZoneInfo('America/Santiago'))
                message_time_str = santiago_time.strftime('%H:%M hrs')
            except (ValueError, KeyError):
                pass # Si hay error en el formato, no mostramos la hora.
        
        return f"--- 📢 *Última Alerta de Telegram* ({message_time_str}) ---\n_{message_text.strip()}_"
    except requests.exceptions.RequestException:
        return "\n\nNo se pudo conectar con el canal de alertas de Telegram."

def get_metro_cl_status():
    """
    Extrae y muestra el estado detallado de cada estación desde el sitio web de Metro.
    """
    report_lines = ["--- 🚇 *Estado de la Red* (metro.cl) ---"]
    url = 'https://www.metro.cl/el-viaje/estado-red'
    try:
        page = requests.get(url, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')
        
        all_operational = True
        all_problems = []
        lines_with_problems = set() # Usamos un set para evitar duplicados

        for line in LINES:
            line_result = soup.find('strong', string=line)
            
            if not line_result:
                report_lines.append(f"⚪️ {unidecode(line)}: No se encontró información.")
                continue
            
            station_results = line_result.find_next('ul').find_all('li')
            if not station_results:
                report_lines.append(f"⚪️ {unidecode(line)}: No se encontraron estaciones.")
                continue
            
            line_status = 'Operativa'
            problem_stations = []
            
            for station_result in station_results:
                station_name = station_result.text.strip()
                station_class = station_result['class'][0] if station_result.get('class') else ''
                station_status = STATUSES.get(station_class, 'Desconocido')
                
                if station_status in ['Accesos Cerrados', 'Estación Cerrada']:
                    problem_stations.append(f'{station_name} ({station_status})')
                    line_status = 'Con problemas'
            
            # Imprimir estado de la línea
            color = COLORS.get(line, '⚪️')
            report_lines.append(f'*{color} {unidecode(line)}:* {line_status}')
            if problem_stations:
                all_operational = False
                lines_with_problems.add(unidecode(line))
                for problem in problem_stations:
                    report_lines.append(f'  - {unidecode(problem)}')
                    all_problems.append(problem.split(' (')[0])
        
        # Imprimir resumen final
        report_lines.append("\n--- 📊 *Resumen General* ---")
        if all_operational:
            report_lines.append("✅ Toda la red se encuentra operativa.")
        else:
            report_lines.append(f"⚠️ Se reportan problemas en: *{', '.join(sorted(lines_with_problems))}*.")
        
        return "\n".join(report_lines)

    except requests.exceptions.RequestException as e:
        return f"Error al conectar con el sitio de Metro de Santiago: {e}"


def main():
    """Función principal que ejecuta los scrapers."""
    # Construimos el reporte completo
    final_report = ["🚇 *Estado del Metro de Santiago* 🚇\n"]
    metro_cl_report = get_metro_cl_status()
    telegram_alert_report = get_latest_telegram_alert()
    print(f"{final_report[0]}\n{telegram_alert_report}\n\n{metro_cl_report}")

if __name__ == '__main__':
    main()