# spotify.py (Versión final con la playlist correcta "Botillero")
import os
import sys
import json
import random
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import io

# Configuración de la salida a UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Cargar las variables del archivo .env
load_dotenv()

# --- Carga de Credenciales ---
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
# --- ID de tu Playlist "Botillero" ---
PLAYLIST_ID = '0CFuMybe6s70wJ1Jj3f90j' 

def obtener_cancion_aleatoria():
    """
    Se conecta a Spotify, lee una playlist y devuelve una canción al azar.
    """
    if not CLIENT_ID or not CLIENT_SECRET:
        return None

    try:
        auth_manager = SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
        sp = spotipy.Spotify(auth_manager=auth_manager)

        results = sp.playlist_tracks(PLAYLIST_ID)
        tracks = results['items']
        
        if not tracks:
            return None

        # Filtramos para asegurarnos de que la canción tenga información válida
        tracks_validos = [t['track'] for t in tracks if t['track'] and t['track']['external_urls']['spotify']]
        if not tracks_validos:
            return None

        track = random.choice(tracks_validos)
        
        nombre_cancion = track['name']
        artistas = ', '.join(artist['name'] for artist in track['artists'])
        url_cancion = track['external_urls']['spotify']
        imagen_url = track['album']['images'][1]['url'] if len(track['album']['images']) > 1 else track['album']['images'][0]['url']

        resultado = {
            "nombre": nombre_cancion,
            "artistas": artistas,
            "url": url_cancion,
            "imagen": imagen_url
        }
        
        return json.dumps(resultado, ensure_ascii=False)

    except Exception as e:
        return None

if __name__ == "__main__":
    cancion = obtener_cancion_aleatoria()
    if cancion:
        print(cancion)