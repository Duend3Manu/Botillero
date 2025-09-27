# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import io

# Asegúrate de que la salida sea en UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

meses_a_numero = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sept': 9, 'oct': 10, 'nov': 11, 'dic': 12
}

dias_semana = {
    'L': 'Lunes', 'M': 'Martes', 'X': 'Miércoles', 'J': 'Jueves',
    'V': 'Viernes', 'S': 'Sábado', 'D': 'Domingo'
}

urlas = 'https://chile.as.com/resultados/futbol/chile/calendario/?omnil=mpal'
page = requests.get(urlas)

fecha_actual = datetime.now()

if page.status_code == 200:
    soup = BeautifulSoup(page.content, 'html.parser')
    jornadas_html = soup.find_all("div", {"class": "cont-modulo resultados"})
    
    jornadas_candidatas = []
    
    for jornada_html in jornadas_html:
        fecha_texto = jornada_html.find('h2').find('span').text.strip()
        try:
            # --- LÓGICA DE PARSEO A PRUEBA DE INCONSISTENCIAS ---
            partes = fecha_texto.lower().replace('.', '').split(' - ')
            
            # Revisa si la primera parte tiene solo el día (formato "DD - DD Mmm")
            if len(partes[0].split()) == 1 and partes[0].isdigit():
                dia_inicio_str = partes[0]
                # Tomamos el mes de la segunda parte
                mes_inicio_str = partes[1].split()[1]
            else: # Formato "DD Mmm - DD Mmm"
                dia_inicio_str, mes_inicio_str = partes[0].split()

            mes_inicio_num = meses_a_numero[mes_inicio_str]
            año_a_usar = fecha_actual.year
            
            fecha_inicio = datetime(año_a_usar, mes_inicio_num, int(dia_inicio_str))
            
            if fecha_inicio.date() <= fecha_actual.date():
                jornadas_candidatas.append(jornada_html)

        except (ValueError, IndexError, KeyError) as e:
            continue

    if jornadas_candidatas:
        jornada_actual = jornadas_candidatas[-1]
        
        titulo = jornada_actual.find('h2').find('a').text.strip()
        fecha_texto = jornada_actual.find('h2').find('span').text.strip()
        
        print(f"🏆 {titulo} 🏆")
        print(f"🗓️ {fecha_texto}\n")

        partidos = jornada_actual.find('tbody').find_all('tr')
        for partido in partidos:
            equipo_local = partido.find('td', {"class": "col-equipo-local"}).text.strip()
            resultado_tag = partido.find('td', {"class": "col-resultado"})
            equipo_visitante = partido.find('td', {"class": "col-equipo-visitante"}).text.strip()
            
            resultado = resultado_tag.text.strip()
            marcador = resultado if ' - ' in resultado else "vs"
            
            if marcador.replace(' ', '').replace('-', '').isdigit():
                 print(f"✅ {equipo_local} | {marcador} | {equipo_visitante}")
            else:
                dia_hora = resultado
                dia_letra = dia_hora[0] if dia_hora and not dia_hora[0].isdigit() else ""
                hora = dia_hora[1:] if dia_letra else dia_hora
                dia = dias_semana.get(dia_letra, "")
                print(f"⚽ {equipo_local} vs {equipo_visitante}\n   └─ {dia} {hora}")

        print("\n---------------------------------")
    else:
        print("No se encontró una jornada activa en la página.")

else:
    print(f"Error en request: {page.status_code}")