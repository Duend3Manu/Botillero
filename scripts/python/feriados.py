# feriados.py
import sys
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from datetime import datetime
import io

# Configuración de la salida a UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

URL = "https://www.feriados.cl"

def obtener_proximos_feriados():
    """
    Navega a feriados.cl y extrae los próximos 5 feriados.
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(URL, wait_until='domcontentloaded')
            
            # Espera a que la lista de feriados esté visible
            page.wait_for_selector('ul.listado-feriados', timeout=20000)
            content = page.content()
            browser.close()

        soup = BeautifulSoup(content, 'html.parser')
        
        lista_feriados = soup.find('ul', class_='listado-feriados')
        if not lista_feriados:
            print("No se pudo encontrar la lista de feriados en la página.")
            return

        proximos_feriados = []
        today = datetime.now()
        
        for item in lista_feriados.find_all('li'):
            # El formato es "DD de Mes", necesitamos añadir el año
            fecha_str = item.find('span', class_='date').text.strip() + f" de {today.year}"
            # Convertimos la fecha a un objeto datetime
            # Necesitamos un mapeo simple de meses en español
            meses = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}
            for mes_es, mes_num in meses.items():
                if mes_es in fecha_str.lower():
                    fecha_str = fecha_str.lower().replace(mes_es, str(mes_num))
                    break
            
            # Formato esperado ahora: "DD de MM de YYYY"
            feriado_date = datetime.strptime(fecha_str, '%d de %m de %Y')

            if feriado_date.date() >= today.date():
                nombre = item.find('span', class_='title').text.strip()
                # Formateamos la fecha de salida de forma amigable
                dia_semana = item.find('span', class_='day').text.strip()
                proximos_feriados.append(f"- *{dia_semana} {fecha_str.split(' de ')[0]} de {fecha_str.split(' de ')[1].capitalize()}:* {nombre}")
        
        if len(proximos_feriados) > 0:
            print('🥳 *Próximos 5 feriados en Chilito:*\n')
            # Imprimimos solo los primeros 5 que encontramos
            for feriado in proximos_feriados[:5]:
                print(feriado)
        else:
            print('Ucha, parece que no quedan feriados este año.')

    except Exception as e:
        print(f"Error al obtener los feriados desde feriados.cl: {e}", file=sys.stderr)

if __name__ == "__main__":
    obtener_proximos_feriados()