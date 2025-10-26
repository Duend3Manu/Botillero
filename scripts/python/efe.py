# -*- coding: utf-8 -*-
import sys
import io
from ntscraper import Nitter

# Configurar la salida estándar para soportar UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_latest_efe_tweet():
    """
    Obtiene el último tweet de la cuenta de EFE Trenes (@EFETrenes)
    usando una instancia de Nitter para evitar bloqueos de Twitter/X.
    """
    try:
        # --- MEJORA: Especificamos una lista de instancias de Nitter ---
        # Esto evita el error "Cannot choose from an empty sequence" si la librería no encuentra instancias activas.
        # --- MEJORA 2: Lista de instancias más robusta y actualizada ---
        instances = [
            "https://nitter.cz",
            "https://nitter.d420.de",
            "https://nitter.in.project-insanity.org",
            "https://nitter.net", # La dejamos por si vuelve
        ]
        scraper = Nitter(instances=instances, timeout=10) # Añadimos un timeout por instancia
        
        tweets = scraper.get_tweets('EFETrenes', mode='user', number=5)
        
        if not tweets or 'tweets' not in tweets or not tweets['tweets']:
            return "No se pudieron obtener tweets de @EFETrenes en este momento."

        # Buscamos el tweet más reciente que no sea un retweet y que contenga texto.
        for tweet in tweets['tweets']:
            if not tweet['is-retweet'] and tweet['text']:
                # Devolvemos el texto del primer tweet válido que encontremos.
                return tweet['text']
        
        return "No se encontraron tweets de estado recientes de @EFETrenes."

    except Exception as e:
        # Capturamos cualquier error durante el scraping.
        error_message = f"Ocurrió un error al intentar obtener el estado de EFE Trenes: {e}"
        print(error_message, file=sys.stderr)
        return error_message

if __name__ == "__main__":
    # El script ahora solo imprime el texto del último tweet.
    # La interpretación se hará en Node.js con Gemini.
    latest_status = get_latest_efe_tweet()
    print(latest_status)
