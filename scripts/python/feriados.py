# feriados.py (Versión final con scraping de tabla)
import sys
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from datetime import datetime
import io
import locale

# Configuración de la salida a UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# Configuración de locale para leer fechas en español
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    locale.setlocale(locale.LC_TIME, 'es_CL.UTF-8')


URL = "https://www.feriados.cl"

def obtener_proximos_feriados():
    """
    Navega a feriados.cl y extrae los próximos 5 feriados desde la tabla.
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(URL, wait_until='domcontentloaded')
            
            # Esperamos a que la primera fila de la tabla sea visible
            page.wait_for_selector('tbody tr', timeout=20000)
            content = page.content()
            browser.close()

        soup = BeautifulSoup(content, 'html.parser')
        
        # Seleccionamos el cuerpo de la tabla
        tabla_body = soup.find('tbody')
        if not tabla_body:
            print("No se pudo encontrar la tabla de feriados en la página.")
            return

        proximos_feriados = []
        today = datetime.now()
        
        # Iteramos por cada fila (<tr>) de la tabla
        for fila in tabla_body.find_all('tr'):
            celdas = fila.find_all('td')
            if len(celdas) < 2:
                continue

            # La fecha está en la primera celda, el nombre en la segunda
            fecha_texto = celdas[0].text.strip()
            nombre = celdas[1].text.strip()
            
            try:
                # El formato es "Día, DD de Mes". Añadimos el año para convertir.
                feriado_date = datetime.strptime(f"{fecha_texto} de {today.year}", '%A, %d de %B de %Y')
                
                if feriado_date.date() >= today.date():
                    # Formateamos la fecha para la salida final
                    dia_semana_y_fecha = fecha_texto.split(', ')[-1] # "DD de Mes"
                    proximos_feriados.append(f"- *{feriado_date.strftime('%A').capitalize()} {dia_semana_y_fecha}:* {nombre}")
            
            except ValueError:
                # Si una fila no tiene un formato de fecha válido, la ignoramos
                continue
        
        if len(proximos_feriados) > 0:
            print('🥳 *Próximos 5 feriados en Chilito:*\n')
            for feriado in proximos_feriados[:5]:
                print(feriado)
        else:
            print('Ucha, parece que no quedan feriados este año.')

    except Exception as e:
        print(f"Error al obtener los feriados desde feriados.cl: {e}", file=sys.stderr)

if __name__ == "__main__":
    obtener_proximos_feriados()