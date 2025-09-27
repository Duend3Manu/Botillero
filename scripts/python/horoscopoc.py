# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

def obtener_horoscopo_chino(signo_buscar):
    url = "https://www.elhoroscopochino.com.ar/horoscopo-chino-de-hoy"

    # Realizamos la solicitud GET a la página
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")

    # Encontramos todas las divisiones que contienen la información de cada signo
    signos = soup.find_all("div", class_="card-body")

    # Creamos un diccionario para almacenar los datos de cada signo
    datos_signos = {}

    # Iteramos sobre cada signo para extraer la información
    for signo in signos:
        nombre_signo = signo.find("h3", class_="card-title").text.strip().split(" ")[0]
        fecha = signo.find("h3", class_="card-title").small.text.strip()
        descripcion = signo.find("p", class_="card-text").text.strip()
        datos_signos[nombre_signo.lower()] = {
            "fecha": fecha,
            "descripcion": descripcion
        }

    if signo_buscar.lower() in datos_signos:
        return datos_signos[signo_buscar.lower()]
    else:
        return "Signo no encontrado."

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopoc.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo_chino(signo)
        if isinstance(horoscopo, dict):
            print(signo.capitalize())
            print("Fecha:", horoscopo["fecha"])
            print("Descripción:", horoscopo["descripcion"])
            print("="*50)
        else:
            print(horoscopo)
