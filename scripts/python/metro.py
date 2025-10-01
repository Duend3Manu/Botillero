# -*- coding: utf-8 -*-
import sys
from bs4 import BeautifulSoup
import requests
from unidecode import unidecode
import io

# Configurar la salida estándar para soportar UTF-8 (importante para emojis)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- DICCIONARIOS Y LISTAS DE CONFIGURACIÓN ---
LINES = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 4a', 'Línea 5', 'Línea 6']
STATUSES = {
    'estado1': 'Operativa',
    'estado4': 'Accesos Cerrados',
    'estado2': 'Estación Cerrada'
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

def get_metrotren_status():
    """
    Extrae y muestra el estado de los servicios de EFE (Metrotren).
    """
    print("--- 🚆 Estado de Trenes (EFE) ---\n")
    url = 'https://www.efe.cl/estado-de-la-red/'
    try:
        page = requests.get(url, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')
        servicios = soup.select('div.flex.justify-between.items-center.p-4.rounded-lg.mb-4')
        if not servicios:
            print("No se pudo encontrar la información de estado de EFE.")
            return
        for servicio in servicios:
            nombre_tag = servicio.find('h3')
            estado_tag = servicio.find('p')
            if nombre_tag and estado_tag:
                nombre = nombre_tag.text.strip()
                estado = estado_tag.text.strip()
                if 'nos' in nombre.lower() or 'rancagua' in nombre.lower():
                    print(f"{nombre}: {estado}")
    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con el sitio de EFE: {e}")
    print("\n" + "-"*40)

def get_telegram_status():
    """
    Extrae y muestra la información del post de Telegram.
    Esta función se conecta a la URL pública del post y busca el texto del mensaje.
    """
    telegram_url = 'https://t.me/metrosantiago/4'
    print("--- 📢 Información General (Telegram) ---\n")
    try:
        page = requests.get(telegram_url, timeout=10)
        page.raise_for_status()  # Lanza un error si la solicitud falla (ej. 404, 500)
        soup = BeautifulSoup(page.content, 'html.parser')
        
        # El texto del mensaje está dentro de un div con la clase 'tgme_widget_message_text'
        message_div = soup.find('div', class_='tgme_widget_message_text')
        
        if message_div:
            # Usamos get_text con un separador para mantener los saltos de línea
            message_text = message_div.get_text(separator='\n', strip=True)
            print(unidecode(message_text))
        else:
            print("No se pudo encontrar el mensaje en el post de Telegram.")
            
    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con Telegram: {e}")
    
    print("\n" + "-"*40)


def get_metro_cl_status():
    """
    Extrae y muestra el estado detallado de cada estación desde el sitio web de Metro.
    """
    print("\n--- 🚇 Estado Detallado por Estación (metro.cl) ---\n")
    url = 'https://www.metro.cl/el-viaje/estado-red'
    try:
        page = requests.get(url, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')
        
        all_operational = True
        all_problems = []

        for line in LINES:
            line_result = soup.find('strong', string=line)
            
            if not line_result:
                print(f"No se encontró información para {line}.")
                continue
            
            station_results = line_result.find_next('ul').find_all('li')
            if not station_results:
                print(f"No se encontraron estaciones para {line}.")
                continue
            
            line_status = 'Operativa'
            problem_stations = []
            
            for station_result in station_results:
                station_name = station_result.text.strip()
                station_class = station_result['class'][0] if station_result.get('class') else ''
                station_status = STATUSES.get(station_class, 'Desconocido')
                
                if station_status in ['Accesos Cerrados', 'Estación Cerrada Temporalmente']:
                    problem_stations.append(f'{station_name} ({station_status})')
                    line_status = 'Con problemas'
            
            # Imprimir estado de la línea
            color = COLORS.get(line, '⚪️')
            print(f'{color} {unidecode(line)}: {line_status}')
            if problem_stations:
                all_operational = False
                for problem in problem_stations:
                    print(f'   - {unidecode(problem)}')
                    all_problems.append(problem.split(' (')[0])
        
        # Imprimir resumen final
        print("\n--- 📊 Resumen (metro.cl) ---")
        if all_operational:
            print("\n✅ Toda la red del metro está operativa.")
        else:
            print(f"\n⚠️ Problemas detectados en las estaciones: {', '.join(sorted(list(set(all_problems))))}.")
            print("   Para más detalles, revisa el Twitter oficial: https://twitter.com/metrodesantiago")

    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con el sitio de Metro de Santiago: {e}")


def main():
    """Función principal que ejecuta los scrapers."""
    get_metrotren_status()
    # get_telegram_status() # Descomentar si se quiere volver a usar
    get_metro_cl_status()

if __name__ == '__main__':
    main()