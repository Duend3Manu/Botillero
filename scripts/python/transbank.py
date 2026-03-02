# -*- coding: utf-8 -*-
"""
Script optimizado para obtener estado de Transbank.
Sin caché local (delegado a Node.js), con soporte de zona horaria y manejo de errores.
"""
import sys
import json
import requests
from bs4 import BeautifulSoup
import io
from datetime import datetime
from zoneinfo import ZoneInfo
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configurar salida UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuración
URL_TRANSBANK = 'https://status.transbankdevelopers.cl/'
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
SESSION.headers.update({'User-Agent': 'Botillero/2.0'})

def get_transbank_status():
    """Obtiene el estado de los servicios haciendo scraping."""
    try:
        response = SESSION.get(URL_TRANSBANK, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        container = soup.find('div', class_='components-container')

        if not container:
            raise Exception('No se encontró el contenedor de servicios')

        services = container.find_all('div', class_='component-inner-container')
        if not services:
            raise Exception('No se encontraron servicios listados')

        status_map = {}
        for service in services:
            name_tag = service.find('span', class_='name')
            status_tag = service.find('span', class_='component-status')

            if name_tag and status_tag:
                name = name_tag.text.strip()
                status = status_tag.text.strip()
                status_map[name] = status

        if not status_map:
            raise Exception('No se pudieron extraer los estados')

        return status_map

    except Exception as e:
        raise e

def main():
    try:
        json_output = '--json' in sys.argv
        data = get_transbank_status()
        
        if json_output:
            # Salida JSON pura para el monitoreo automático
            print(json.dumps(data, ensure_ascii=False))
            return

        # Formato texto para WhatsApp
        output = "*Estado de Servicios Transbank*\n\n"
        
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
            
            emoji_map = {
                'OK': '✅',
                'WARN': '⚠️',
                'DOWN': '❌',
                'MAINT': '🛠️',
                'UNKNOWN': '❓'
            }
            emoji = emoji_map.get(normalized, '❓')
            output += f"{emoji} {service}: {status}\n"

        # Fecha en hora de Chile
        now_chile = datetime.now(ZoneInfo('America/Santiago'))
        timestamp = now_chile.strftime('%Y-%m-%d %H:%M:%S')
        output += f"\nActualizado: {timestamp}"
        
        print(output)
        
    except Exception as e:
        # Imprimir error en stderr y salir con código 1 para que Node.js lo detecte
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()