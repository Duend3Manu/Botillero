# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import sys
from unidecode import unidecode
import io

# Forzar la salida a UTF-8 para evitar UnicodeEncodeError en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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
            
            # --- LÓGICA DE PARSEO MEJORADA ---
            # El sitio ahora incluye toda la info en el primer párrafo.
            descripcion_completa = parrafos[0].text.strip() if len(parrafos) > 0 else ""
            
            palabra_clave = "No disponible"
            numero = "No disponible"
            color = "No disponible"
            
            # Buscamos los datos en el texto y los extraemos.
            if "PALABRA CLAVE:" in descripcion_completa:
                palabra_clave = descripcion_completa.split("PALABRA CLAVE:")[1].split("NÚMEROS DE SUERTE:")[0].strip()
            if "NÚMEROS DE SUERTE:" in descripcion_completa:
                numero = descripcion_completa.split("NÚMEROS DE SUERTE:")[1].split("COLOR:")[0].strip()
            if "COLOR:" in descripcion_completa:
                color = descripcion_completa.split("COLOR:")[1].strip()

            # Limpiamos la descripción para no mostrar los datos duplicados.
            descripcion = descripcion_completa.split("PALABRA CLAVE:")[0].strip()
            if not descripcion: # Si la descripción queda vacía, usamos el texto completo.
                descripcion = descripcion_completa

            imagen_url = s.find("img")["src"] if s.find("img") else "no_image"
            nombre_signo_normalizado = unidecode(nombre_signo.lower())
            datos_signos[nombre_signo_normalizado] = {
                "descripcion": descripcion,
                "palabra": palabra_clave,
                "numero": numero,
                "color": color,
                "imagen": imagen_url
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
            print(f"🖼️ {horoscopo['imagen']}") # Añadimos la URL de la imagen al final
        else:
            print(horoscopo)