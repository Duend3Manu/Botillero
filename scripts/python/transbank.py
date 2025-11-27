# -*- coding: utf-8 -*-
"""
Script mejorado para obtener estado de Transbank.
Incluye caché persistente en archivo y manejo robusto de errores.
"""
import sys
import requests
from bs4 import BeautifulSoup
import io
import json
import os
import time
import argparse

# Configurar salida UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuración
URL_TRANSBANK = 'https://status.transbankdevelopers.cl/'
# Archivo de caché en carpeta temp del proyecto
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'temp', 'transbank_cache.json')
CACHE_DURATION = 300  # 5 minutos

def load_cache():
    """Carga datos del caché si es válido."""
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Verificar validez del tiempo
            if time.time() - data.get('timestamp', 0) < CACHE_DURATION:
                return data.get('payload')
    except Exception:
        return None
    return None

def save_cache(payload):
    """Guarda datos en el caché."""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump({'timestamp': time.time(), 'payload': payload}, f, ensure_ascii=False)
    except Exception:
        pass # Ignorar errores de escritura en caché

def get_transbank_status():
    """Obtiene el estado de los servicios (con caché)."""
    # 1. Intentar cargar de caché
    cached_data = load_cache()
    if cached_data:
        return cached_data, True

    # 2. Si no hay caché, hacer scraping
    try:
        response = requests.get(URL_TRANSBANK, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        container = soup.find('div', class_='components-container')
        
        if not container:
            return {'error': 'No se encontró el contenedor de servicios'}, False

        services = container.find_all('div', class_='component-inner-container')
        if not services:
            return {'error': 'No se encontraron servicios listados'}, False

        status_map = {}
        for service in services:
            name_tag = service.find('span', class_='name')
            status_tag = service.find('span', class_='component-status')
            
            if name_tag and status_tag:
                name = name_tag.text.strip()
                status = status_tag.text.strip()
                status_map[name] = status
        
        if not status_map:
            return {'error': 'No se pudieron extraer los estados'}, False

        # Guardar en caché
        save_cache(status_map)
        return status_map, False

    except requests.exceptions.Timeout:
        return {'error': 'Timeout al conectar con Transbank'}, False
    except Exception as e:
        return {'error': f'Error: {str(e)}'}, False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--json', action='store_true', help='Output en formato JSON')
    args = parser.parse_args()

    data, from_cache = get_transbank_status()
    
    # Estructura de respuesta estandarizada
    response = {
        'success': 'error' not in data,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'from_cache': from_cache,
        'data': data
    }

    if args.json:
        print(json.dumps(response, ensure_ascii=False, indent=2))
    else:
        # Formato texto para WhatsApp (sin caracteres problemáticos)
        output = "*Estado de Servicios Transbank*\n\n"
        
        if 'error' in data:
            output += f"Error: {data['error']}"
        else:
            for service, status in data.items():
                status_indicator = "OK" if status == "Operational" else "PROBLEMAS"
                output += f"{service}: {status_indicator}\n"
            
            output += f"\nActualizado: {response['timestamp']}"
        
        print(output)

if __name__ == '__main__':
    main()