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

# Mapeo de los íconos de la web a los nombres de las líneas (para metro.cl)
LINE_ICONS = {
    'ico-l1.svg': 'Línea 1',
    'ico-l2.svg': 'Línea 2',
    'ico-l3.svg': 'Línea 3',
    'ico-l4.svg': 'Línea 4',
    'ico-l4a.svg': 'Línea 4a',
    'ico-l5.svg': 'Línea 5',
    'ico-l6.svg': 'Línea 6'
}

# Tus colores de emojis
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
    (Esta función no tiene cambios)
    """
    url = "https://t.me/s/metrosantiagoalertas"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        messages = soup.find_all('div', class_='tgme_widget_message_wrap')
        
        if not messages:
            return "\n\nNo se pudo obtener la última alerta de Telegram."

        latest_message = messages[-1]
        
        message_text_div = latest_message.find('div', class_='tgme_widget_message_text')
        if not message_text_div:
            return "\n\nNo se pudo parsear el texto de la alerta de Telegram."
            
        raw_text = message_text_div.get_text(separator='\n', strip=True)
        message_text = re.sub(r'\n+', '\n', raw_text).strip()

        time_tag = latest_message.find('time', class_='time')
        message_time_str = ""
        if time_tag and 'datetime' in time_tag.attrs:
            try:
                utc_time = datetime.fromisoformat(time_tag['datetime'])
                santiago_time = utc_time.astimezone(ZoneInfo('America/Santiago'))
                message_time_str = santiago_time.strftime('%H:%M hrs')
            except (ValueError, KeyError):
                pass 
        
        return f"--- 📢 *Última Alerta de Telegram* ({message_time_str}) ---\n_{message_text.strip()}_"
    except requests.exceptions.RequestException:
        return "\n\nNo se pudo conectar con el canal de alertas de Telegram."

def get_metro_cl_status():
    """
    Extrae y muestra el estado general de cada LÍNEA desde el sitio web de Metro.
    (Esta función no tiene cambios)
    """
    report_lines = ["--- 🚇 *Estado de la Red* (metro.cl) ---"]
    url = 'https://www.metro.cl/el-viaje/estado-red'
    try:
        page = requests.get(url, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')

        all_operational = True
        lines_with_problems = set() 
        
        card_body = soup.find('div', class_='card-body')
        if not card_body:
            return "Error: No se pudo encontrar el 'card-body' principal en la página."

        line_rows = card_body.find_all('div', class_='padding-bottom-30')
        if not line_rows:
             return "Error: No se encontraron filas de líneas ('padding-bottom-30')."

        for row in line_rows:
            line_info_col = row.find('div', class_='col-md-4')
            alerts_col = row.find('div', class_='col-md-8')

            if not line_info_col or not alerts_col:
                continue 

            line_name = "Línea Desconocida"
            line_img = line_info_col.find('img', src=re.compile(r'ico-l[0-9a-z]+\.svg'))
            if line_img and 'src' in line_img.attrs:
                icon_file = line_img['src'].split('/')[-1] 
                if icon_file in LINE_ICONS:
                    line_name = LINE_ICONS[icon_file]

            color = COLORS.get(line_name, '⚪️')

            status_text_tag = line_info_col.find('p', class_='h4')
            status_text = " ".join(status_text_tag.get_text(separator=' ').split()) if status_text_tag else "Estado no encontrado"

            problem_list_items = alerts_col.find_all('li')
            
            if not problem_list_items:
                report_lines.append(f'*{color} {unidecode(line_name)}:* {status_text}')
            else:
                all_operational = False
                lines_with_problems.add(unidecode(line_name))
                report_lines.append(f'*{color} {unidecode(line_name)}:* {status_text} (Con problemas)')
                
                for item in problem_list_items:
                    problem_text = item.get_text(strip=True)
                    if problem_text: 
                        report_lines.append(f'  - {unidecode(problem_text)}')
        
        report_lines.append("\n--- 📊 *Resumen General (Metro)* ---")
        if all_operational:
            report_lines.append("✅ Toda la red de Metro se encuentra operativa.")
        else:
            report_lines.append(f"⚠️ Se reportan problemas en: *{', '.join(sorted(lines_with_problems))}*.")
        
        return "\n".join(report_lines)

    except requests.exceptions.RequestException as e:
        return f"Error al conectar con el sitio de Metro de Santiago: {e}"

def get_metrotren_status():
    """
    NUEVA FUNCIÓN: Extrae y muestra el estado del Metrotren Nos desde red.cl.
    """
    report_lines = ["--- 🚆 *Estado Metrotren Nos* (red.cl) ---"]
    url = 'https://www.red.cl/mapas-y-horarios/metrotren/'
    
    # Mapeo de clases de estado de red.cl
    STATUS_MAP = {
        'cerrada-temporalmente': 'Cerrada temporalmente',
        'no-habilitada': 'No habilitada'
    }

    try:
        page = requests.get(url, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')

        all_operational = True
        problem_stations = []

        # Encontrar la lista de estaciones de Metrotren Nos
        line_ul = soup.find('ul', class_='linea-metrotren')
        if not line_ul:
            return "\n".join(report_lines + ["Error: No se encontró la lista 'linea-metrotren'."])

        stations = line_ul.find_all('li')
        if not stations:
            return "\n".join(report_lines + ["Error: No se encontraron estaciones 'li'."])

        for station in stations:
            station_classes = station.get('class', [])
            
            # Si la estación NO tiene la clase 'operativa', es un problema
            if 'operativa' not in station_classes:
                all_operational = False
                
                # Buscamos el nombre de la estación
                name_tag = station.find('a')
                station_name = name_tag.text.strip() if name_tag else "Estación desconocida"
                
                # Determinamos el tipo de problema
                status_text = "Estado desconocido"
                for class_name, status_desc in STATUS_MAP.items():
                    if class_name in station_classes:
                        status_text = status_desc
                        break
                
                problem_stations.append(f"{station_name} ({status_text})")

        # Construir el reporte para Metrotren
        if all_operational:
            report_lines.append('✅ Servicio operativo.')
        else:
            report_lines.append('⚠️ Servicio con problemas:')
            for problem in problem_stations:
                report_lines.append(f'  - {unidecode(problem)}')
        
        return "\n".join(report_lines)

    except requests.exceptions.RequestException as e:
        return "\n".join(report_lines + [f"Error al conectar con el sitio de Metrotren: {e}"])


def main():
    """Función principal que ejecuta los scrapers."""
    # Título general
    final_report = ["🚇 *Estado del Transporte* 🚇\n"]
    
    # Obtener todos los reportes
    telegram_alert_report = get_latest_telegram_alert()
    metro_cl_report = get_metro_cl_status()
    metrotren_report = get_metrotren_status() # <- Se agrega la nueva función
    
    # Imprimir el reporte consolidado
    print(f"{final_report[0]}\n{telegram_alert_report}\n\n{metro_cl_report}\n\n{metrotren_report}")

if __name__ == '__main__':
    main()