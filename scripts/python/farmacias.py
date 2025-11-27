#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para obtener farmacias de turno desde el sitio del Minsal usando Playwright
Uso: python farmacias.py <comuna>
"""

import sys
import json
from playwright.sync_api import sync_playwright
import time

def buscar_farmacias(comuna_busqueda):
    """
    Busca farmacias de turno en una comuna específica usando scraping con Playwright
    """
    with sync_playwright() as p:
        try:
            # Lanzar navegador en modo headless
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Navegar a la página
            page.goto('https://seremienlinea.minsal.cl/asdigital/index.php?mfarmacias', timeout=30000)
            
            # Esperar a que cargue el dropdown de región
            page.wait_for_selector('#region', timeout=10000)
            
            # Obtener todas las regiones disponibles
            regiones = page.eval_on_selector_all('#region option', 
                '''options => options.map(opt => ({
                    texto: opt.textContent.trim(),
                    valor: opt.value
                }))''')
            
            # Filtrar opciones vacías
            regiones = [r for r in regiones if r['valor']]
            
            # Mapeo común de comunas a regiones para optimizar búsqueda
            comunas_metropolitanas = ['santiago', 'providencia', 'las condes', 'ñuñoa', 'independencia', 
                                       'la florida', 'maipú', 'puente alto', 'san miguel', 'recoleta']
            
            comuna_busqueda_lower = comuna_busqueda.lower()
            
            # Determinar región a buscar primero
            region_inicio = None
            if any(c in comuna_busqueda_lower for c in comunas_metropolitanas):
                # Buscar región metropolitana
                for r in regiones:
                    if 'metropolitana' in r['texto'].lower():
                        region_inicio = r
                        break
            
            # Si no se identificó región específica, usar Metropolitana por defecto
            if not region_inicio and len(regiones) > 0:
                for r in regiones:
                    if 'metropolitana' in r['texto'].lower():
                        region_inicio = r
                        break
                if not region_inicio:
                    region_inicio = regiones[0]  # Usar primera región como fallback
            
            comuna_encontrada = None
            
            # Intentar buscar en la región seleccionada
            if region_inicio:
                page.select_option('#region', region_inicio['valor'])
                time.sleep(2)  # Esperar a que se carguen las comunas
                
                # Obtener comunas disponibles
                page.wait_for_selector('#comuna', timeout=5000)
                opciones_comunas = page.eval_on_selector_all('#comuna option',
                    '''options => options.map(opt => ({
                        texto: opt.textContent.trim(),
                        valor: opt.value
                    }))''')
                
                opciones_comunas = [opt for opt in opciones_comunas if opt['valor']]
                
                # Buscar la comuna
                for opt in opciones_comunas:
                    if comuna_busqueda_lower in opt['texto'].lower():
                        comuna_encontrada = opt
                        break
            
           # Si no se encontró, intentar con otras regiones
            if not comuna_encontrada:
                for region in regiones:
                    if region_inicio and region['valor'] == region_inicio['valor']:
                        continue  # Ya probamos esta
                    
                    page.select_option('#region', region['valor'])
                    time.sleep(2)
                    
                    try:
                        opciones_comunas = page.eval_on_selector_all('#comuna option',
                            '''options => options.map(opt => ({
                                texto: opt.textContent.trim(),
                                valor: opt.value
                            }))''')
                        
                        opciones_comunas = [opt for opt in opciones_comunas if opt['valor']]
                        
                        for opt in opciones_comunas:
                            if comuna_busqueda_lower in opt['texto'].lower():
                                comuna_encontrada = opt
                                break
                        
                        if comuna_encontrada:
                            break
                    except:
                        continue
            
            if not comuna_encontrada:
                # No se encontró la comuna
                comunas_disponibles = [opt['texto'] for opt in opciones_comunas[:30]] if 'opciones_comunas' in locals() else []
                browser.close()
                return {
                    'success': False,
                    'message': f'No se encontró la comuna "{comuna_busqueda}"',
                    'comunas_disponibles': comunas_disponibles
                }
            
            # Seleccionar la comuna encontrada
            page.select_option('#comuna', comuna_encontrada['valor'])
            
            # Esperar más tiempo para que se carguen los resultados
            print(f"Comuna '{comuna_encontrada['texto']}' seleccionada, esperando resultados...", file=sys.stderr)
            time.sleep(5)  # Aumentado a 5 segundos
            
            # Intentar capturar screenshot para debugging (opcional)
            try:
                page.screenshot(path='farmacia_debug.png')
                print("Screenshot capturado: farmacia_debug.png", file=sys.stderr)
            except:
                pass
            
            # Método 1: Intentar extraer usando selectores Bootstrap/Cards
            farmacias_data = []
            
            try:
                # Esperar a que aparezcan elementos de resultado
                page.wait_for_selector('.card, .resultado, [class*="farmacia"], .list-group-item', timeout=8000)
                print("Elementos de resultados detectados", file=sys.stderr)
            except:
                print("No se detectaron elementos de resultados con selectores estándar", file=sys.stderr)
            
            # Intentar extraer con JavaScript más agresivo
            farmacias_data = page.evaluate('''() => {
                const results = [];
                
                // Método 1: Buscar cards
                let cards = document.querySelectorAll('.card');
                console.log('Cards encontrados:', cards.length);
                
                if (cards.length > 0) {
                    cards.forEach(card => {
                        const nombre = card.querySelector('h5, h4, h3, .card-title, [class*="nombre"], .nombre')?.textContent?.trim();
                        const direccion = card.querySelector('.card-text, [class*="direccion"], .direccion')?.textContent?.trim();
                        
                        const allText = card.innerText || card.textContent;
                        let telefono = '';
                        let horario = '';
                        
                        // Buscar teléfono
                        const telMatch = allText.match(/(?:Tel[ée]fono|Fono):?\s*([+\d\s-]+)/i);
                        if (telMatch) telefono = telMatch[1].trim();
                        
                        // Buscar horario
                        const horMatch = allText.match(/(?:Horario|Abierto):?\s*([\d:]+\s*-\s*[\d:]+)/i);
                        if (horMatch) horario = horMatch[1].trim();
                        
                        if (nombre) {
                            results.push({
                                nombre: nombre,
                                direccion: direccion || '',
                                telefono: telefono,
                                horario: horario
                            });
                        }
                    });
                }
                
                // Método 2: Si no hay cards, buscar en lista o tabla
                if (results.length === 0) {
                    const items = document.querySelectorAll('.list-group-item, tr, .resultado, [class*="item"]');
                    console.log('Items alternativos encontrados:', items.length);
                    
                    items.forEach(item => {
                        const text = item.innerText || item.textContent;
                        if (text && text.length > 10) {
                            // Intentar extraer nombre (generalmente la primera línea o texto más grande)
                            const lines = text.split('\\n').filter(l => l.trim());
                            const nombre = lines[0] || '';
                            
                            results.push({
                                nombre: nombre,
                                direccion: lines[1] || '',
                                telefono: lines.find(l => l.includes('Tel') || l.includes('Fono')) || '',
                                horario: lines.find(l => l.includes(':') && l.includes('-')) || ''
                            });
                        }
                    });
                }
                
                // Método 3: Buscar markers o elementos de mapa
                if (results.length === 0) {
                    const markers = document.querySelectorAll('[class*="marker"], [class*="popup"]');
                    console.log('Markers de mapa encontrados:', markers.length);
                    
                    markers.forEach(marker => {
                        const text = marker.innerText || marker.textContent;
                        if (text && text.trim()) {
                            results.push({
                                nombre: text.trim().split('\\n')[0],
                                direccion: '',
                                telefono: '',
                                horario: ''
                            });
                        }
                    });
                }
                
                console.log('Total resultados extraídos:', results.length);
                return results.filter(r => r.nombre && r.nombre.length > 2);
            }''')
            
            print(f"Farmacias extraídas: {len(farmacias_data)}", file=sys.stderr)
            
            browser.close()
            
            if not farmacias_data or len(farmacias_data) == 0:
                return {
                    'success': False,
                    'message': f'No se encontraron farmacias de turno en {comuna_encontrada["texto"]}. Es posible que no haya farmacias de turno actualmente o que la página tenga un formato diferente.'
                }
            
            return {
                'success': True,
                'comuna': comuna_encontrada['texto'],
                'farmacias': farmacias_data[:10]  # Máximo 10 farmacias
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Error al consultar farmacias: {str(e)}'
            }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'message': 'Debes especificar una comuna. Ejemplo: python farmacias.py providencia'
        }, ensure_ascii=False))
        sys.exit(1)
    
    comuna = ' '.join(sys.argv[1:])
    resultado = buscar_farmacias(comuna)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
