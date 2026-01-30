#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script optimizado para obtener farmacias de turno usando la API del Minsal.
Reemplaza el scraping lento con Playwright por una consulta directa y rápida.
Uso: python farmacias.py <comuna>
"""

import sys
import json
import requests
import io
from unidecode import unidecode

# Configurar salida UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_URL = 'https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php'

def buscar_farmacias(comuna_busqueda):
    try:
        # 1. Obtener datos de la API oficial (mucho más rápido que scraping)
        response = requests.get(API_URL, timeout=10)
        response.raise_for_status()
        farmacias = response.json()
        
        # 2. Normalizar término de búsqueda
        busqueda_norm = unidecode(comuna_busqueda.lower().strip())
        
        resultados = []
        
        for f in farmacias:
            # La API devuelve campos como 'comuna_nombre', 'local_nombre', etc.
            comuna_api = unidecode(f.get('comuna_nombre', '').lower())
            
            if busqueda_norm in comuna_api:
                resultados.append({
                    'nombre': f.get('local_nombre', 'Farmacia'),
                    'direccion': f.get('local_direccion', 'Sin dirección'),
                    'telefono': f.get('local_telefono', ''),
                    'horario': f"{f.get('funcionamiento_hora_apertura', '')} - {f.get('funcionamiento_hora_cierre', '')}",
                    'lat': f.get('local_lat'),
                    'lng': f.get('local_lng')
                })
        
        if not resultados:
             return {
                'success': False,
                'message': f'No se encontraron farmacias de turno para la comuna "{comuna_busqueda}".'
            }

        return {
            'success': True,
            'comuna': comuna_busqueda,
            'farmacias': resultados[:10] # Limitar a 10
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'Error al consultar API Minsal: {str(e)}'
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'message': 'Debes especificar una comuna.'
        }, ensure_ascii=False))
        sys.exit(1)
    
    comuna = ' '.join(sys.argv[1:])
    resultado = buscar_farmacias(comuna)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
