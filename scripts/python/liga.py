import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import sys

def scrapear_fecha_actual():
    url = "https://www.campeonatochileno.cl/ligas/copa-de-la-liga/"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        respuesta = requests.get(url, headers=headers)
        if respuesta.status_code != 200:
            print(json.dumps({"error": f"Error HTTP: {respuesta.status_code}"}))
            return
            
        soup = BeautifulSoup(respuesta.text, 'html.parser')
        
        # 1. Buscar TODAS las fechas (los contenedores de los slides)
        slides = soup.find_all('div', class_='anwp-fl-matchweek-slides__swiper-slide')
        
        if not slides:
            print(json.dumps({"error": "No se encontraron las fechas del torneo en el HTML."}))
            return

        slide_activo = None
        ahora = datetime.now()
        
        # 2. Encontrar la fecha actual basada en el tiempo real
        for slide in slides:
            partidos_slide = slide.find_all('div', class_='anwp-fl-game')
            if not partidos_slide:
                continue
                
            # Tomamos el último partido de esa fecha para saber cuándo termina la jornada
            ultimo_partido_iso = partidos_slide[-1].get('data-fl-game-datetime', '')
            if ultimo_partido_iso:
                # Extraer solo la parte "YYYY-MM-DDTHH:MM:SS" (cortamos la zona horaria para evitar problemas)
                fecha_str = ultimo_partido_iso[:19] 
                try:
                    ultimo_partido_dt = datetime.strptime(fecha_str, "%Y-%m-%dT%H:%M:%S")
                    
                    # Si el último partido de esta fecha es en el futuro (o hoy), ¡esta es la fecha activa!
                    if ultimo_partido_dt >= ahora:
                        slide_activo = slide
                        break
                except ValueError:
                    continue
        
        # Si ya pasó todo el torneo, por defecto mostramos la última fecha registrada
        if not slide_activo:
            slide_activo = slides[-1]
            
        titulo_fecha = slide_activo.find('div', class_='competition__stage-title').text.strip()
        partidos = slide_activo.find_all('div', class_='anwp-fl-game')
        
        datos_partidos = []
        
        # 3. Extraer los datos exactos de esa fecha ganadora
        for partido in partidos:
            try:
                local = partido.find('div', class_='match-slim__team-home-title').text.strip()
                visita = partido.find('div', class_='match-slim__team-away-title').text.strip()
                
                goles_local = partido.find('span', class_='match-slim__scores-home').text.strip()
                goles_visita = partido.find('span', class_='match-slim__scores-away').text.strip()
                
                if goles_local == "–" or goles_visita == "–":
                    resultado = "Por jugar"
                else:
                    resultado = f"{goles_local} - {goles_visita}"
                
                fecha_iso = partido.get('data-fl-game-datetime', '')
                if fecha_iso:
                    fecha_str_limpia = fecha_iso[:19]
                    fecha_obj = datetime.strptime(fecha_str_limpia, "%Y-%m-%dT%H:%M:%S")
                    fecha_str = fecha_obj.strftime('%d/%m a las %H:%M')
                else:
                    fecha_str = "Por definir"
                
                datos_partidos.append({
                    'fecha_hora': fecha_str,
                    'local': local,
                    'resultado': resultado,
                    'visita': visita
                })
            except AttributeError:
                continue
                
        # Empaquetar y enviar como JSON para Node.js
        salida = {
            "titulo": titulo_fecha,
            "partidos": datos_partidos
        }
        
        print(json.dumps(salida, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    # Necesario para no tener problemas de caracteres UTF-8 en Windows/PowerShell
    sys.stdout.reconfigure(encoding='utf-8')
    scrapear_fecha_actual()