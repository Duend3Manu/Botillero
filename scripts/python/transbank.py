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
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import tempfile

# Configurar salida UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuración
URL_TRANSBANK = 'https://status.transbankdevelopers.cl/'
# Archivo de caché en carpeta temp del proyecto
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'temp', 'transbank_cache.json')
CACHE_DURATION = 300  # 5 minutos
# Requests session con reintentos
SESSION = requests.Session()
RETRY_STRAT = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "POST"]
)
ADAPTER = HTTPAdapter(max_retries=RETRY_STRAT)
SESSION.mount("https://", ADAPTER)
SESSION.mount("http://", ADAPTER)
SESSION.headers.update({'User-Agent': 'Botillero/1.0'})

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
        # Escribir de forma atómica
        dirpath = os.path.dirname(CACHE_FILE)
        fd, tmp_path = tempfile.mkstemp(dir=dirpath)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as tmpf:
                json.dump({'timestamp': time.time(), 'payload': payload}, tmpf, ensure_ascii=False)
            os.replace(tmp_path, CACHE_FILE)
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    except Exception:
        pass # Ignorar errores de escritura en caché

def get_transbank_status(force_refresh=False):
    """Obtiene el estado de los servicios (con caché)."""
    # 1. Intentar cargar de caché
    if not force_refresh:
        cached_data = load_cache()
        if cached_data:
            return cached_data, True

    # 2. Si no hay caché, hacer scraping usando Session con reintentos
    try:
        response = SESSION.get(URL_TRANSBANK, timeout=10)
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
    except requests.exceptions.RequestException as e:
        return {'error': f'Error en la conexión: {str(e)}'}, False
    except Exception as e:
        return {'error': f'Error: {str(e)}'}, False

def main():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument('--json', action='store_true', help='Output en formato JSON')
        parser.add_argument('--force-refresh', action='store_true', help='Ignorar caché y forzar refresco')
        args = parser.parse_args()

        data, from_cache = get_transbank_status(force_refresh=args.force_refresh)
        
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
                if not data:
                    output += "No hay servicios listados o no se pudo conectar.\n"
                else:
                    # Normalizar estados comunes
                    for service, status in data.items():
                        normalized = {
                            'Operational': 'OK',
                            'Degraded Performance': 'WARN',
                            'Partial Outage': 'WARN',
                            'Major Outage': 'DOWN',
                            'Under Maintenance': 'MAINT',
                            'Investigating': 'WARN'
                        }.get(status, 'UNKNOWN')
                        # Emoji indicators: ✅ = ok, ❌ = down/problem, ⚠️ = warning, 🛠️ = maintenance, ❓ = unknown
                        emoji_map = {
                            'OK': '✅',
                            'WARN': '⚠️',
                            'DOWN': '❌',
                            'MAINT': '🛠️',
                            'UNKNOWN': '❓'
                        }
                        emoji = emoji_map.get(normalized, '❓')
                        # Mostrar: [emoji] Nombre del servicio: estado original
                        output += f"{emoji} {service}: {status}\n"

                output += f"\nActualizado: {response['timestamp']}"
            
            print(output)
            sys.stdout.flush()
    except Exception as e:
        print(f"Error en main: {str(e)}")
        sys.stdout.flush()

if __name__ == '__main__':
    main()