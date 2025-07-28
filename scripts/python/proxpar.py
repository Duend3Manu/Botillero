# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup

# Asegúrate de que la salida sea en UTF-8
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Diccionario para convertir letras a días de la semana
dias_semana = {
    'L': 'Lunes',
    'M': 'Martes',
    'X': 'Miércoles',
    'J': 'Jueves',
    'V': 'Viernes',
    'S': 'Sábado',
    'D': 'Domingo'
}

urlas = 'https://chile.as.com/resultados/futbol/chile/calendario/?omnil=mpal'
page = requests.get(urlas)

fechas_buscadas = ['18 Jul. - 07 Sept.']

if page.status_code == 200:
    soup = BeautifulSoup(page.content, 'html.parser')
    jornadas = soup.findAll("div", {"class": "cont-modulo resultados"})
    
    for jornada in jornadas:
        fechaJornada = jornada.find('h2').find('span').text.strip()
        if fechaJornada in fechas_buscadas:
            titulo = jornada.find('h2').find('a').text.strip()
            print(f"--{titulo}--")
            print(fechaJornada)
            print("---------------------------------\n")

            partidos = jornada.find('tbody').find_all('tr')
            for partido in partidos:
                equipo_local = partido.find('td', {"class": "col-equipo-local"}).text.strip()
                resultado_tag = partido.find('td', {"class": "col-resultado"})
                equipo_visitante = partido.find('td', {"class": "col-equipo-visitante"}).text.strip()

                resultado = resultado_tag.text.strip()
                if ' - ' in resultado:
                    marcador = resultado
                else:
                    marcador = " - "
                
                # Detectar día y hora
                if resultado_tag.has_attr('class'):
                    clases = resultado_tag['class']
                    if 'comenzado' in clases:
                        dia_hora = "En juego"
                    else:
                        dia_hora = resultado
                else:
                    dia_hora = resultado

                partes_resultado = marcador.split()
                dia_letra = dia_hora[0] if dia_hora else ""
                hora = dia_hora[1:] if dia_hora else ""
                dia = dias_semana.get(dia_letra, "")

                # Ajuste de formato de impresión
                if dia and hora:
                    print(f"{equipo_local} |{dia} {hora}| {equipo_visitante}\n")
                else:
                    print(f"{equipo_local} |{marcador}| {equipo_visitante}\n")

            print("---------------------------------\n")
else:
    print(f"Error en request: {page.status_code}")
