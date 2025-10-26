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
    """Obtiene los principales indicadores económicos desde mindicador.cl."""
    try:
        url = "https://mindicador.cl/api"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        # Formateamos los indicadores que nos interesan
        uf = data.get('uf', {}).get('valor', 0)
        dolar = data.get('dolar', {}).get('valor', 0)
        euro = data.get('euro', {}).get('valor', 0)
        utm = data.get('utm', {}).get('valor', 0)
        ipc_data = data.get('ipc', {})
        ipc_valor = ipc_data.get('valor', 0)
        # Formateamos la fecha del IPC para mostrar Mes/Año
        ipc_fecha_str = ipc_data.get('fecha', '')
        ipc_fecha = datetime.fromisoformat(ipc_fecha_str.replace('Z', '+00:00')).strftime('%m-%Y') if ipc_fecha_str else ''
        
        reporte = [
            f"💵 Dólar: ${formatear_con_separadores(dolar)}",
            f"🇪🇺 Euro: ${formatear_con_separadores(euro)}",
            f"🇨🇱 UF: ${formatear_con_separadores(uf)}",
            f"🇨🇱 UTM: ${formatear_con_separadores(utm)}",
            f"📈 IPC ({ipc_fecha}): {ipc_valor}%"
        ]
        return "\n".join(reporte)
    except (requests.RequestException, KeyError):
        return "No se pudieron obtener los indicadores económicos."

async def main():
    ahora = datetime.now()
    fecha = ahora.strftime("%d-%m-%Y")
    hora = ahora.strftime("%H:%M")
    print(f"Fecha: {fecha}")
    print(f"Hora: {hora}")
    
    print("\n--- 💰 Indicadores Económicos ---")
    print(obtener_indicadores())
    
    async with aiohttp.ClientSession() as session:
        valores_divisas = await obtener_valores_divisas(session)

        if valores_divisas:
            print("\n--- 🌎 Divisas a Peso Chileno ---")
            # Mostramos el dólar de Google como referencia
            print(f"💵 USD (Google): ${formatear_con_separadores(valores_divisas['💵 USD Google'])}")
            for divisa in ['🇦🇷💰', '🇵🇪💰', '🇧🇴💰', '🇨🇴💰', '🇯🇵💰']:
                if divisa in valores_divisas and valores_divisas[divisa]:
                    print(f"{divisa}: ${formatear_con_decimales(valores_divisas[divisa])}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Error en el script principal: {e}", file=sys.stderr)
