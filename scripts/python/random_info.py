# random_info.py (Versión con 5 nuevas funciones)
import requests
import random
from datetime import datetime
import sys
import io
import json
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- FUNCIONES EXISTENTES (Efemérides, Dato Curioso, NASA, Frase, Cine, Chiste Geek) ---
# (Se mantienen igual que antes)

def get_efemeride():
    try:
        today = datetime.now()
        month, day = today.strftime("%m"), today.strftime("%d")
        url = f"https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}"
        response = requests.get(url, headers={'User-Agent': 'MiBot/1.0'})
        evento = random.choice(response.json().get('events', []))
        return f"🗓️ *Efemérides del Día*\nUn día como hoy, en el año {evento['year']}, {evento['text']}"
    except: return None

def get_fun_fact():
    try:
        response = requests.get("https://uselessfacts.jsph.pl/api/v2/facts/random?language=es")
        return f"🤔 *¿Sabías que...?*\n{response.json().get('text')}"
    except: return None

def get_nasa_apod():
    try:
        response = requests.get("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY")
        data = response.json()
        texto = f"🔭 *Foto Astronómica del Día (NASA)*\n*{data.get('title')}*\n\n{data.get('explanation')}"
        return f"{texto}\n\n*Imagen:* {data.get('hdurl') or data.get('url')}"
    except: return None

def get_quote_of_the_day():
    try:
        response = requests.get("https://api.quotable.io/random?language=es")
        data = response.json()
        return f"💬 *Frase del Día*\n_{data.get('content')}_\n\n- *{data.get('author')}*"
    except: return None

def get_cartelera_cine():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://cinepolischile.cl/", wait_until='domcontentloaded')
            page.wait_for_selector('div.titulo-pelicula', timeout=20000)
            content = page.content()
            browser.close()
        soup = BeautifulSoup(content, 'html.parser')
        peliculas = []
        for tag in soup.find_all('div', class_='titulo-pelicula'):
            nombre = tag.find('h2').text.strip()
            if nombre not in peliculas: peliculas.append(nombre)
        if not peliculas: return None
        return f"🎬 *Cartelera de Cine Hoy*\n- " + "\n- ".join(peliculas[:8])
    except: return None

def get_geek_joke():
    try:
        response = requests.get("https://backend-omega-seven.vercel.app/api/getjoke")
        data = response.json()[0]
        return f"🤓 *Chiste Geek*\n\n- {data.get('question')}\n- _{data.get('punchline')}_"
    except: return None

# --- ¡NUEVAS FUNCIONES! ---

def get_trago_del_dia():
    """Obtiene una receta de cóctel al azar."""
    try:
        response = requests.get("https://www.thecocktaildb.com/api/json/v1/1/random.php")
        trago = response.json()['drinks'][0]
        
        nombre = trago['strDrink']
        ingredientes = "\n".join(f"- {trago[f'strMeasure{i}'].strip()} {trago[f'strIngredient{i}'].strip()}" for i in range(1, 16) if trago.get(f'strIngredient{i}'))
        instrucciones = trago['strInstructionsES'] or trago['strInstructions']
        
        return f"🍸 *Trago del Día: {nombre}*\n\n*Ingredientes:*\n{ingredientes}\n\n*Instrucciones:*\n{instrucciones}"
    except:
        return None

def get_termino_geek():
    """Lee el archivo JSON local y devuelve un término geek al azar."""
    try:
        # La ruta es relativa a la raíz del proyecto, no al script
        with open("./src/data/terminos_geek.json", 'r', encoding='utf-8') as f:
            terminos = json.load(f)
        
        termino_elegido = random.choice(terminos)
        return f"💻 *Término Geek del Día: {termino_elegido['termino']}*\n\n{termino_elegido['definicion']}"
    except:
        return None

def get_xkcd_comic():
    """Obtiene un cómic aleatorio de XKCD."""
    try:
        # Primero obtenemos el último cómic para saber el rango
        response_latest = requests.get("https://xkcd.com/info.0.json")
        latest_num = response_latest.json()['num']
        
        # Elegimos un número aleatorio entre 1 y el último
        random_num = random.randint(1, latest_num)
        
        # Obtenemos el cómic aleatorio
        response_comic = requests.get(f"https://xkcd.com/{random_num}/info.0.json")
        comic_data = response_comic.json()

        # Devolvemos un objeto JSON para que Node.js sepa que es un mensaje con imagen
        resultado = {
            "type": "image",
            "caption": f"✒️ *Cómic de XKCD Aleatorio*\n\n*{comic_data['safe_title']}*",
            "url": comic_data['img']
        }
        return json.dumps(resultado)
    except:
        return None


if __name__ == "__main__":
    # Actualizamos la ruleta con todas las nuevas opciones
    opciones = [
        get_efemeride, get_fun_fact, get_nasa_apod, get_quote_of_the_day,
        get_cartelera_cine, get_geek_joke, get_trago_del_dia, get_termino_geek,
        get_xkcd_comic
    ]
    
    random.shuffle(opciones) # Barajamos las opciones para más aleatoriedad
    
    resultado = None
    for funcion in opciones:
        resultado = funcion()
        if resultado:
            break
    
    if resultado:
        print(resultado)
    else:
        print("No pude encontrar un dato aleatorio en este momento, ¡qué mala suerte!")