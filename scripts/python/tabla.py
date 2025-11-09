import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import csv
import io

# Configuración para la salida en UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = 'https://chile.as.com/resultados/futbol/chile/clasificacion/?omnil=mpal'

# Cabecera de un navegador real para evitar ser detectado como un bot
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

def main():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            
            context = browser.new_context(
                user_agent=USER_AGENT,
                viewport={'width': 1920, 'height': 1080}
            )
            page = context.new_page()
            
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            
            # --- CAMBIO CLAVE: Esperamos la nueva tabla ---

            # La nueva clase de la tabla es 'a_tb'
            page.wait_for_selector('table.a_tb', timeout=45000)
            
            content = page.content()
            browser.close()

    except PlaywrightTimeoutError as e:
        print("\n-------------------------------------------------------------")
        print("ERROR DE TIMEOUT: No se pudo cargar la página o encontrar la tabla a tiempo.")
        print(f"Detalles del error: {e}")
        print("-------------------------------------------------------------")
        sys.exit()
    except Exception as e:
        print(f"\nOcurrió un error inesperado con Playwright: {e}")
        sys.exit()

    # --- LÓGICA DE PARSEO ACTUALIZADA ---
    soup = BeautifulSoup(content, 'html.parser')
    tabla_de_datos = []

    try:
        # 1. Buscamos la nueva tabla con clase 'a_tb'
        tabla_container = soup.find('table', class_='a_tb')
        
        # 2. Iteramos por cada fila <tr> en el <tbody>
        for fila in tabla_container.find('tbody').find_all('tr'):
            
            # La Posición y el Equipo están en el 'th' (header de la fila)
            th_tag = fila.find('th', scope='row')
            
            # Los Puntos están en el primer 'td' (celda de datos)
            # Buscamos la celda que es 'col col1' y tiene la clase '--bd' (bold)
            puntos_tag = fila.find('td', class_='--bd')

            if th_tag and puntos_tag:
                # 3. Extraemos la posición
                posicion_tag = th_tag.find('span', class_='a_tb_ps')
                
                # 4. Extraemos el nombre del equipo
                # (usamos '_hidden-xs' que es el nombre largo)
                nombre_equipo_tag = th_tag.find('span', class_='_hidden-xs')
                
                # Fallback por si no encuentra el nombre largo, usa la abreviatura
                if not nombre_equipo_tag:
                    nombre_equipo_tag = th_tag.find('abbr')

                if nombre_equipo_tag and posicion_tag:
                    posicion = posicion_tag.text.strip()
                    equipo = nombre_equipo_tag.text.strip()
                    puntos = puntos_tag.text.strip()
                    tabla_de_datos.append([posicion, equipo, puntos])

    except AttributeError as e:
        print(f"Error: Se cargó la página, pero no se pudo encontrar la estructura de la tabla esperada: {e}")
        sys.exit()

    # --- (Tu lógica de guardado e impresión se mantiene igual) ---
    filename = "tabla_as_com.csv"
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Posicion', 'Equipo', 'Puntos'])
            writer.writerows(tabla_de_datos)
    except IOError as e:
        print(f"Error al escribir en el archivo {filename}: {e}")

    def format_row(pos, equipo, puntos):
        equipo_corto = (equipo[:18] + '..') if len(equipo) > 20 else equipo
        return f"{str(pos):<3} {equipo_corto:<20} {puntos:>5}"

    if not tabla_de_datos:
        print("No se encontraron datos de equipos.")
    else:
        print('-------------------------------')
        print(format_row('Pos', 'Equipo', 'Pts'))
        print('-------------------------------')
        for fila in tabla_de_datos:
            print(format_row(fila[0], fila[1], fila[2]))
        print('-------------------------------')

if __name__ == "__main__":
    main()