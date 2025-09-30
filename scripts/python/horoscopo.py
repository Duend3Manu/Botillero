# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import sys
from unidecode import unidecode

# Se mantiene tu diccionario de emojis
emojis_signos = {
    "aries": "♈️", "tauro": "♉️", "geminis": "♊️", "cancer": "♋️", "leo": "♌️", 
    "virgo": "♍️", "libra": "♎️", "escorpio": "♏️", "sagitario": "♐️", 
    "capricornio": "♑️", "acuario": "♒️", "piscis": "♓️"
}

def obtener_horoscopo(signo_buscar):
    url = "https://www.pudahuel.cl/horoscopo/"
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        return f"Error al conectar con la página de horóscopo: {e}"
    
    try:
        soup = BeautifulSoup(response.content, "html.parser")
        signos_divs = soup.find_all("div", class_="signo")
        
        datos_signos = {}

        for s in signos_divs:
            nombre_signo = s.find("h2").text.strip()
            parrafos = s.find_all("p")
            
            descripcion = parrafos[0].text.strip() if len(parrafos) > 0 else "Descripción no disponible"
            extra_info_raw = parrafos[1].text.strip() if len(parrafos) > 1 else ""
            
            # Extraemos la información clave de la segunda parte
            palabra_clave = "No disponible"
            numero = "No disponible"
            color = "No disponible"
            
            for linea in extra_info_raw.split('\n'):
                if "PALABRA CLAVE:" in linea:
                    palabra_clave = linea.split("PALABRA CLAVE:")[1].strip()
                elif "NÚMEROS DE SUERTE:" in linea:
                    numero = linea.split("NÚMEROS DE SUERTE:")[1].strip()
                elif "COLOR:" in linea:
                    color = linea.split("COLOR:")[1].strip()

            nombre_signo_normalizado = unidecode(nombre_signo.lower())
            datos_signos[nombre_signo_normalizado] = {
                "descripcion": descripcion,
                "palabra": palabra_clave,
                "numero": numero,
                "color": color
            }

    except Exception as e:
        return f"Error al procesar los datos de la página: {e}"

    signo_normalizado = unidecode(signo_buscar.lower())
    if signo_normalizado in datos_signos:
        return datos_signos[signo_normalizado]
    else:
        return "Signo no encontrado."

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopo.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo(signo)
        
        if isinstance(horoscopo, dict):
            emoji_signo = emojis_signos.get(unidecode(signo.lower()), "")
            
            # --- NUEVO FORMATO DE SALIDA PARA WHATSAPP ---
            print(f"*{signo.capitalize()}* {emoji_signo}\n")
            print(f"{horoscopo['descripcion']}\n")
            print(f"📖 *Palabra Clave:* {horoscopo['palabra']}")
            print(f"🔢 *Número de Suerte:* {horoscopo['numero']}")
            print(f"🎨 *Color:* {horoscopo['color']}")
        else:
            print(horoscopo)