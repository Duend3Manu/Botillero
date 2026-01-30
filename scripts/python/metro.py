# -*- coding: utf-8 -*-
"""
Script mejorado para obtener el estado del Metro de Santiago.
Incluye: caché, mejor manejo de errores, output JSON opcional, timeouts optimizados.
"""
import sys
import json
import time
from bs4 import BeautifulSoup
import requests
from unidecode import unidecode
from datetime import datetime
import io
from zoneinfo import ZoneInfo
import re
from concurrent.futures import ThreadPoolExecutor

# Configurar la salida estándar para soportar UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- CONFIGURACIÓN ---
REQUEST_TIMEOUT = 8  # segundos (reducido de 10)

# Mapeo de los íconos de la web a los nombres de las líneas
LINE_ICONS = {
    'ico-l1.svg': 'Línea 1',
    'ico-l2.svg': 'Línea 2',
    'ico-l3.svg': 'Línea 3',
    'ico-l4.svg': 'Línea 4',
    'ico-l4a.svg': 'Línea 4a',
    'ico-l5.svg': 'Línea 5',
    'ico-l6.svg': 'Línea 6'
}

# Emojis de colores (mantener sin unidecode)
COLORS = {
    'Línea 1': '🔴',
    'Línea 2': '🟡',
    'Línea 3': '🟤',
    'Línea 4': '🔵',
    'Línea 4a': '🔷',
    'Línea 5': '🟢',
    'Línea 6': '🟣'
}

# --- FUNCIONES DE SCRAPING ---

def get_latest_telegram_alert():
    """Obtiene el último post del canal de Telegram @metrosantiagoalertas."""
    url = "https://t.me/s/metrosantiagoalertas"
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        messages = soup.find_all('div', class_='tgme_widget_message_wrap')
        
        if not messages:
            return {'error': 'No se pudieron obtener mensajes de Telegram', 'text': None}

        latest_message = messages[-1]
        
        message_text_div = latest_message.find('div', class_='tgme_widget_message_text')
        if not message_text_div:
            return {'error': 'No se pudo parsear el texto de la alerta', 'text': None}
            
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
        
        return {
            'text': message_text.strip(),
            'time': message_time_str,
            'error': None
        }
    except requests.exceptions.RequestException as e:
        return {'error': f'Error de conexión: {str(e)}', 'text': None}

def get_metro_cl_status():
    """Extrae el estado general de cada línea desde metro.cl."""
    url = 'https://www.metro.cl/el-viaje/estado-red'
    try:
        page = requests.get(url, timeout=REQUEST_TIMEOUT)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')

        lines_data = []
        lines_with_problems = []
        
        card_body = soup.find('div', class_='card-body')
        if not card_body:
            return {'error': 'No se encontró el contenedor principal', 'lines': [], 'all_operational': None}

        line_rows = card_body.find_all('div', class_='padding-bottom-30')
        if not line_rows:
            return {'error': 'No se encontraron líneas', 'lines': [], 'all_operational': None}

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
            problems = [unidecode(item.get_text(strip=True)) for item in problem_list_items if item.get_text(strip=True)]
            
            has_problems = len(problems) > 0
            
            if has_problems:
                lines_with_problems.append(line_name)
            
            # Mantener emoji original, solo aplicar unidecode al nombre para comparación
            lines_data.append({
                'name': line_name,
                'name_clean': unidecode(line_name),
                'color': color,
                'status': status_text,
                'has_problems': has_problems,
                'problems': problems
            })
        
        return {
            'error': None,
            'lines': lines_data,
            'all_operational': len(lines_with_problems) == 0,
            'lines_with_problems': [unidecode(name) for name in lines_with_problems]
        }

    except requests.exceptions.RequestException as e:
        return {'error': f'Error de conexión: {str(e)}', 'lines': [], 'all_operational': None}

def get_metrotren_status():
    """Extrae el estado del Metrotren Nos desde red.cl."""
    url = 'https://www.red.cl/mapas-y-horarios/metrotren/'
    
    STATUS_MAP = {
        'cerrada-temporalmente': 'Cerrada temporalmente',
        'no-habilitada': 'No habilitada'
    }

    try:
        page = requests.get(url, timeout=REQUEST_TIMEOUT)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')

        problem_stations = []

        line_ul = soup.find('ul', class_='linea-metrotren')
        if not line_ul:
            return {'error': 'No se encontró la lista de estaciones', 'all_operational': None, 'problems': []}

        stations = line_ul.find_all('li')
        if not stations:
            return {'error': 'No se encontraron estaciones', 'all_operational': None, 'problems': []}

        for station in stations:
            station_classes = station.get('class', [])
            
            if 'operativa' not in station_classes:
                name_tag = station.find('a')
                station_name = name_tag.text.strip() if name_tag else "Estación desconocida"
                
                status_text = "Estado desconocido"
                for class_name, status_desc in STATUS_MAP.items():
                    if class_name in station_classes:
                        status_text = status_desc
                        break
                
                problem_stations.append({
                    'name': station_name,
                    'status': status_text
                })

        return {
            'error': None,
            'all_operational': len(problem_stations) == 0,
            'problems': problem_stations
        }

    except requests.exceptions.RequestException as e:
        return {'error': f'Error de conexión: {str(e)}', 'all_operational': None, 'problems': []}


# --- FORMATEO DE OUTPUT ---

def format_text_output(telegram_data, metro_data, metrotren_data):
    """Formatea la salida como texto legible para WhatsApp."""
    lines = ["🚇 *Estado del Transporte* 🚇\n"]
    
    # Telegram
    if telegram_data['text']:
        time_str = f" ({telegram_data['time']})" if telegram_data['time'] else ""
        lines.append(f"--- 📢 *Última Alerta de Telegram*{time_str} ---")
        lines.append(f"_{telegram_data['text']}_\n")
    elif telegram_data['error']:
        lines.append(f"--- 📢 *Telegram* ---")
        lines.append(f"⚠️ {telegram_data['error']}\n")
    
    # Metro
    lines.append("--- 🚇 *Estado de la Red* (metro.cl) ---")
    if metro_data['error']:
        lines.append(f"❌ Error: {metro_data['error']}\n")
    else:
        for line in metro_data['lines']:
            status_suffix = " (Con problemas)" if line['has_problems'] else ""
            lines.append(f"*{line['color']} {line['name_clean']}:* {line['status']}{status_suffix}")
            for problem in line['problems']:
                lines.append(f"  - {problem}")
        
        lines.append("\n--- 📊 *Resumen General (Metro)* ---")
        if metro_data['all_operational']:
            lines.append("✅ Toda la red de Metro se encuentra operativa.")
        else:
            lines.append(f"⚠️ Se reportan problemas en: *{', '.join(metro_data['lines_with_problems'])}*.")
    
    # Metrotren
    lines.append("\n--- 🚆 *Estado Metrotren Nos* (red.cl) ---")
    if metrotren_data['error']:
        lines.append(f"❌ Error: {metrotren_data['error']}")
    else:
        if metrotren_data['all_operational']:
            lines.append('✅ Servicio operativo.')
        else:
            lines.append('⚠️ Servicio con problemas:')
            for problem in metrotren_data['problems']:
                lines.append(f"  - {unidecode(problem['name'])} ({problem['status']})")
    
    return "\n".join(lines)


def main():
    """Función principal."""
    # Verificar si se pide output JSON
    json_output = '--json' in sys.argv
    
    try:
        # MEJORA: Ejecutar consultas en paralelo para reducir tiempo de espera
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_telegram = executor.submit(get_latest_telegram_alert)
            future_metro = executor.submit(get_metro_cl_status)
            future_metrotren = executor.submit(get_metrotren_status)

            telegram_data = future_telegram.result()
            metro_data = future_metro.result()
            metrotren_data = future_metrotren.result()
        
        if json_output:
            # Output JSON para procesamiento programático
            output = {
                'success': True,
                'telegram': telegram_data,
                'metro': metro_data,
                'metrotren': metrotren_data
            }
            print(json.dumps(output, ensure_ascii=False, indent=2))
        else:
            # Output de texto formateado para WhatsApp
            text = format_text_output(telegram_data, metro_data, metrotren_data)
            print(text)
        
        sys.exit(0)
        
    except Exception as e:
        if json_output:
            error_output = {
                'success': False,
                'error': str(e)
            }
            print(json.dumps(error_output, ensure_ascii=False))
        else:
            print(f"❌ Error inesperado: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()