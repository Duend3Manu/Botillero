import sys
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import csv
import io

# Configuración para la salida en UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = 'https://chile.as.com/resultados/futbol/chile/clasificacion/?omnil=mpal'

def main():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until='networkidle')
            
            # SELECTOR CORREGIDO: Esperamos por la etiqueta <table> con la clase 'tabla-datos'
            page.wait_for_selector('table.tabla-datos', timeout=20000)
            
            content = page.content()
            browser.close()

    except Exception as e:
        print(f"Error durante la navegación con Playwright: {e}")
        sys.exit()

    soup = BeautifulSoup(content, 'html.parser')
    tabla_de_datos = []

    try:
        # SELECTOR CORREGIDO: Buscamos la tabla con su nueva clase
        tabla_container = soup.find('table', class_='tabla-datos')
        
        for i, fila in enumerate(tabla_container.find('tbody').find_all('tr')):
            nombre_equipo_tag = fila.find('span', class_='nombre-equipo')
            puntos_tag = fila.find('td', class_='destacado')
            
            if nombre_equipo_tag and puntos_tag:
                # La posición ahora viene en la primera celda de la fila
                posicion_tag = fila.find('td')
                posicion = posicion_tag.text.strip() if posicion_tag else str(i + 1)
                
                equipo = nombre_equipo_tag.text.strip()
                puntos = puntos_tag.text.strip()
                tabla_de_datos.append([posicion, equipo, puntos])

    except AttributeError:
        print("Error: No se pudo encontrar la tabla incluso después de cargar la página.")
        sys.exit()

    # --- Guardado en CSV ---
    filename = "tabla.csv"
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Posicion', 'Equipo', 'Puntos'])
            writer.writerows(tabla_de_datos)
    except IOError as e:
        print(f"Error al escribir en el archivo {filename}: {e}")

    # --- Impresión en Consola ---
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

# --- Ejecutor del código ---
if __name__ == "__main__":
    main()