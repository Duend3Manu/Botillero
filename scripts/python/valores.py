import asyncio
import aiohttp
from bs4 import BeautifulSoup
import sys
import requests
from datetime import datetime

# Establecer la codificación de la salida estándar a UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Limitar el número de solicitudes simultáneas
MAX_CONCURRENT_REQUESTS = 5

def obtener_santoral():
    url = "https://api.boostr.cl/santorales/hoy.json"
    headers = {"accept": "application/json"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if 'data' in data and len(data['data']) > 0:
            return data['data'][0]  # Obtenemos solo el primer nombre
        else:
            return "No se encontró el santoral en la respuesta"
    else:
        return "No se pudo obtener el santoral"

async def obtener_html(session, url):
    try:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.text()
            else:
                print(f"No se pudo acceder a la página {url}", file=sys.stderr)
                return None
    except Exception as e:
        print(f"Error al obtener HTML desde {url}: {e}", file=sys.stderr)
        return None

async def obtener_valor_google(session, url, semaphore):
    async with semaphore:
        html = await obtener_html(session, url)
        if html:
            soup = BeautifulSoup(html, 'html.parser')
            div_valor = soup.find('div', class_='YMlKec fxKbKc')
            if div_valor:
                return div_valor.text.strip().replace(",", "")
        return None

async def obtener_valores_divisas(session):
    urls = {
        '💵 USD Google': 'https://www.google.com/finance/quote/USD-CLP',
        '🇪🇺💶': 'https://www.google.com/finance/quote/EUR-CLP',
        '🇦🇷💰': 'https://www.google.com/finance/quote/ARS-CLP',
        '🇵🇪💰': 'https://www.google.com/finance/quote/PEN-CLP',
        '🇧🇴💰': 'https://www.google.com/finance/quote/BOB-CLP',
        '🇨🇴💰': 'https://www.google.com/finance/quote/COP-CLP',
        '🇯🇵💰': 'https://www.google.com/finance/quote/JPY-CLP',
    }
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    tareas = [obtener_valor_google(session, url, semaphore) for url in urls.values()]
    resultados = await asyncio.gather(*tareas)
    return dict(zip(urls.keys(), resultados))

def formatear_con_separadores(valor):
    return "{:,}".format(int(float(valor))).replace(",", ".")

def formatear_con_decimales(valor):
    return "{:,.2f}".format(float(valor)).replace(",", ".")

def obtener_indicadores():
    url = "https://api.boostr.cl/economy/indicators.json"
    headers = {"accept": "application/json"}
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        if data['status'] == 'success':
            indicadores = data['data']
            
            print(f"💵 USD: ${formatear_con_separadores(indicadores['dolar']['value'])}")
            print(f"🇨🇱 UF: ${formatear_con_separadores(indicadores['uf']['value'])}")
            print(f"🇪🇺💶: €{formatear_con_separadores(indicadores['euro']['value'])}")
            print(f"🇨🇱 UTM: ${formatear_con_separadores(indicadores['utm']['value'])}")
            print(f"🇨🇱 IPC ({indicadores['ipc']['date'][5:7]}-{indicadores['ipc']['date'][:4]}): {indicadores['ipc']['value']}%")
        else:
            print("Error: No se pudo obtener los indicadores.")
    else:
        print("Error: No se pudo conectar con la API.")

async def main():
    santoral = obtener_santoral()
    ahora = datetime.now()
    fecha = ahora.strftime("%d-%m-%Y")
    hora = ahora.strftime("%H:%M")
    print(f"Fecha: {fecha}")
    print(f"Hora: {hora}")
    print(f"Santoral: {santoral}\n")

    obtener_indicadores()
    
    async with aiohttp.ClientSession() as session:
        valores_divisas = await obtener_valores_divisas(session)

        if valores_divisas:
            print(f"💵 USD Google : ${formatear_con_separadores(valores_divisas['💵 USD Google'])}")
            print("\n---- Otras monedas a peso ----")
            for divisa in ['🇦🇷💰', '🇵🇪💰', '🇧🇴💰', '🇨🇴💰', '🇯🇵💰']:
                if divisa in valores_divisas and valores_divisas[divisa]:
                    print(f"{divisa} : ${formatear_con_decimales(valores_divisas[divisa])}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Error en el script principal: {e}", file=sys.stderr)
