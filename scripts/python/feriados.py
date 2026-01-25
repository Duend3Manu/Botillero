# feriados.py - Obtiene los 5 próximos feriados desde feriados.cl
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
    try:
        locale.setlocale(locale.LC_TIME, 'es_CL.UTF-8')
    except locale.Error:
        pass  # Ignorar si no se puede establecer el locale

URL = "https://www.feriados.cl"

# Mapeo de meses en español a números
MESES_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
}

def parse_fecha(fecha_texto):
    """
    Convierte un texto de fecha como "lunes, 23 de septiembre" a datetime.
    Automáticamente ajusta el año si la fecha ya pasó.
    """
    try:
        today = datetime.now()
        partes = fecha_texto.lower().split(', ')
        
        if len(partes) != 2:
            return None
        
        dia_y_mes = partes[1].strip()
        # Extraer día y mes: "23 de septiembre"
        componentes = dia_y_mes.split(' de ')
        if len(componentes) != 2:
            return None
        
        dia = int(componentes[0])
        mes_texto = componentes[1].strip()
        
        # Obtener el número del mes
        mes = MESES_MAP.get(mes_texto.lower())
        if mes is None:
            return None
        
        # Crear la fecha con el año actual
        feriado_date = datetime(today.year, mes, dia)
        
        # Si la fecha ya pasó este año, intentar con el próximo año
        if feriado_date.date() < today.date():
            feriado_date = datetime(today.year + 1, mes, dia)
        
        return feriado_date
    except (ValueError, IndexError):
        return None

def obtener_proximos_feriados():
    """
    Navega a feriados.cl y extrae los próximos 5 feriados desde la tabla.
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Establecer un timeout más generoso
            page.goto(URL, wait_until='domcontentloaded', timeout=30000)
            
            # Esperamos a que aparezca la tabla
            page.wait_for_selector('tbody tr', timeout=25000)
            content = page.content()
            browser.close()

        soup = BeautifulSoup(content, 'html.parser')
        
        # Seleccionamos el cuerpo de la tabla
        tabla_body = soup.find('tbody')
        if not tabla_body:
            print("⚠️ No se encontró la tabla de feriados. Intenta más tarde.")
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
            
            # Parsear la fecha
            feriado_date = parse_fecha(fecha_texto)
            
            if feriado_date and feriado_date.date() >= today.date():
                # Formateamos la fecha de manera legible
                fecha_formateada = feriado_date.strftime('%d de %B').lower()
                dia_semana = feriado_date.strftime('%A').capitalize()
                
                # Calcular días restantes
                dias_restantes = (feriado_date.date() - today.date()).days
                
                if dias_restantes == 0:
                    marcador = "🔴 Hoy"
                elif dias_restantes == 1:
                    marcador = "⏰ Mañana"
                else:
                    marcador = f"📅 En {dias_restantes} días"
                
                proximos_feriados.append({
                    'fecha': feriado_date,
                    'nombre': nombre,
                    'dia_semana': dia_semana,
                    'fecha_text': fecha_formateada,
                    'dias_restantes': dias_restantes,
                    'marcador': marcador
                })
        
        # Ordenar por fecha y obtener los 5 próximos
        proximos_feriados.sort(key=lambda x: x['fecha'])
        proximos_feriados = proximos_feriados[:5]
        
        if len(proximos_feriados) > 0:
            print('🥳 *Próximos feriados en Chile:*\n')
            for i, feriado in enumerate(proximos_feriados, 1):
                output = f"{i}. *{feriado['nombre']}*\n"
                output += f"   {feriado['dia_semana'].capitalize()}, {feriado['fecha_text']}\n"
                output += f"   {feriado['marcador']}"
                print(output)
        else:
            print('🎉 Ucha, parece que no quedan feriados este año. ¡Que descanses!')

    except Exception as e:
        print(f"⚠️ Error al obtener los feriados: {str(e)}", file=sys.stderr)

if __name__ == "__main__":
    obtener_proximos_feriados()