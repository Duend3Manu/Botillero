# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
from unidecode import unidecode
import sys

# Diccionario de banderas
banderas = {
    'Argentina': '🇦🇷',
    'Colombia': '🇨🇴',
    'Uruguay': '🇺🇾',
    'Ecuador': '🇪🇨',
    'Brasil': '🇧🇷',
    'Venezuela': '🇻🇪',
    'Paraguay': '🇵🇾',
    'Bolivia': '🇧🇴',
    'Chile': '🇨🇱',
    'Peru': '🇵🇪'  # Cambia 'Perú' por 'Peru'
}

# Configura la codificación de salida para la consola
sys.stdout.reconfigure(encoding='utf-8')

def obtener_datos_jornada(url, fechas_buscadas):
    try:
        page = requests.get(url)
        page.raise_for_status()  # Lanza un error para códigos de estado HTTP 4xx/5xx

        soup = BeautifulSoup(page.content, 'html.parser')
        jornadas = soup.select(".cont-modulo.resultados")
        
        for jornada in jornadas:
            fecha_jornada = jornada.select_one('h2 span').text.strip()
            if fecha_jornada in fechas_buscadas:
                imprimir_jornada(jornada, fecha_jornada)
    except requests.RequestException as e:
        print(f"Error en request: {e}")
    except Exception as e:
        print(f"Error en BeautifulSoup: {e}")

def imprimir_jornada(jornada, fecha_jornada):
    print('---------------------------------')
    titulo = jornada.select_one('h2 a').text.strip()
    jornada_num = titulo.split()[-1]  # Suponiendo que el número de jornada está al final del título
    print(f'Jornada {unidecode(jornada_num)} : {unidecode(fecha_jornada)}')
    print('---------------------------------')
    
    partidos = jornada.select('tbody tr')
    for partido in partidos:
        equipo_local = unidecode(partido.select_one('.col-equipo-local').text.strip())
        resultado = unidecode(partido.select_one('.col-resultado').text.strip())
        equipo_visitante = unidecode(partido.select_one('.col-equipo-visitante').text.strip())
        
        # Añade las banderas correspondientes
        bandera_local = banderas.get(unidecode(equipo_local), '')  # Asegúrate de usar 'unidecode'
        bandera_visitante = banderas.get(unidecode(equipo_visitante), '')  # Asegúrate de usar 'unidecode'
        
        print(f"{bandera_local} {equipo_local} {resultado} {equipo_visitante} {bandera_visitante}")
        print()
        
    print('---------------------------------')

# URL y fechas a buscar
urlas = 'https://chile.as.com/resultados/futbol/clasificacion_mundial_sudamerica/calendario/?omnil=mpal'
fechas_buscadas = ['04 Sept.']

# Ejecuta la función principal
obtener_datos_jornada(urlas, fechas_buscadas)
