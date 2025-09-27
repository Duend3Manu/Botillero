# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import sys
from unidecode import unidecode
sys.stdout.reconfigure(encoding='utf-8')

# Diccionario de emojis para cada signo zodiacal
emojis_signos = {
    "aries": "♈️",
    "tauro": "♉️",
    "geminis": "♊️",
    "cancer": "♋️",
    "leo": "♌️",
    "virgo": "♍️",
    "libra": "♎️",
    "escorpio": "♏️",
    "sagitario": "♐️",
    "capricornio": "♑️",
    "acuario": "♒️",
    "piscis": "♓️"
}

def obtener_horoscopo(signo_buscar):
    url = "https://www.pudahuel.cl/horoscopo/"

    try:
        response = requests.get(url)
        response.raise_for_status()  # Lanza un error si la solicitud no es exitosa
    except requests.RequestException as e:
        return f"Error al realizar la solicitud: {e}"
    
    try:
        soup = BeautifulSoup(response.content, "html.parser")
        signos = soup.find_all("div", class_="signo")  # Cambiamos la clase a "signo"
        
        datos_signos = {}

        for s in signos:
            nombre_signo = s.find("h2").text.strip() if s.find("h2") else "Nombre no disponible"
            descripcion_completa = s.find_all("p")
            
            descripcion = descripcion_completa[0].text.strip() if len(descripcion_completa) > 0 else "Descripción no disponible"
            extra_info = descripcion_completa[1].text.strip() if len(descripcion_completa) > 1 else ""
            
            palabra, numero, color = "Palabra no disponible", "Número no disponible", "Color no disponible"

            if extra_info:
                for parte in extra_info.split("\n"):
                    if "PALABRA" in parte:
                        palabra = parte.split(": ")[1].strip()
                    elif "NÚMERO" in parte:
                        numero = parte.split(": ")[1].strip()
                    elif "COLOR" in parte:
                        color = parte.split(": ")[1].strip()
            
            nombre_signo_normalizado = unidecode(nombre_signo.lower())
            datos_signos[nombre_signo_normalizado] = {
                "descripcion": descripcion,
                "palabra": palabra,
                "numero": numero,
                "color": color
            }
    except Exception as e:
        return f"Error al procesar la página: {e}"

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
            # Agregar el emoji del signo
            emoji_signo = emojis_signos.get(unidecode(signo.lower()), "")
            print("=" * 50)
            print(f"Signo {signo.capitalize()} {emoji_signo}")
            print(f"⏺Descripción: {horoscopo['descripcion']}")
            print(f"⏺PALABRA: {horoscopo['palabra']}")
            print(f"⏺NÚMERO: {horoscopo['numero']}")
            print(f"⏺COLOR: {horoscopo['color']}")
            print("=" * 50)
        else:
            print(horoscopo)
