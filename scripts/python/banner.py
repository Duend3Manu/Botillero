# banner.py
import sys
from PIL import Image, ImageDraw, ImageFont
import textwrap
import os # Importamos os
from datetime import datetime # Importamos datetime

# --- CONFIGURACIÓN DE ESTILOS (CORREGIDA CON TUS NOMBRES DE ARCHIVO) ---
ESTILOS = {
    "vengadores": {"fuente": "Vengadores.ttf", "color_relleno": (237, 28, 36), "color_borde": (0, 0, 0)},
    "shrek": {"fuente": "Sherk.ttf", "color_relleno": (126, 161, 33), "color_borde": (44, 64, 29)},
    "mario": {"fuente": "Mario.ttf", "color_relleno": (255, 255, 255), "color_borde": (0, 0, 0)},
    "nintendo": {"fuente": "Nintendo.ttf", "color_relleno": (231, 0, 18), "color_borde": (140, 140, 140)},
    "sega": {"fuente": "Sega.TTF", "color_relleno": (0, 133, 198), "color_borde": (255, 255, 255)},
    "potter": {"fuente": "HarryP.TTF", "color_relleno": (240, 240, 240), "color_borde": (50, 50, 50)},
    "starwars": {"fuente": "Star.ttf", "color_relleno": (255, 232, 31), "color_borde": (0, 0, 0)},
    "disney": {"fuente": "Disney.ttf", "color_relleno": (255, 255, 255), "color_borde": (25, 67, 119)},
    # "pixel": {"fuente": "Pixel.ttf", "color_relleno": (255, 255, 255), "color_borde": (0, 0, 0)} # Si quieres usar pixel, descomenta y usa el comando !banner pixel
}

# --- CÁLCULO DINÁMICO DE LA RUTA DE FUENTES ---
# Esto hace que el script funcione sin importar dónde esté la carpeta del bot.
script_dir = os.path.dirname(os.path.abspath(__file__)) # Directorio del script actual
project_root = os.path.dirname(os.path.dirname(script_dir)) # Sube dos niveles para llegar a la raíz del proyecto
RUTA_FUENTES = os.path.join(project_root, "assets", "fonts") + os.sep # Ruta correcta: C:\bots\Telegram Bot\assets\fonts\

def crear_banner(estilo, texto_principal):
    try:
        config = ESTILOS.get(estilo.lower())
        if not config:
            disponibles = ", ".join(ESTILOS.keys())
            print(f"Estilo no encontrado. Disponibles: {disponibles}", file=sys.stderr)
            sys.exit(1)

        # --- Configuración de la imagen ---
        ancho_img, alto_img = 1200, 400
        img = Image.new("RGBA", (ancho_img, alto_img), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # --- Configuración de la fuente ---
        ruta_fuente = RUTA_FUENTES + config["fuente"]
        tamaño_fuente = 150
        font = ImageFont.truetype(ruta_fuente, tamaño_fuente)

        while font.getbbox(texto_principal.upper())[2] > ancho_img * 0.9 and tamaño_fuente > 20:
            tamaño_fuente -= 5
            font = ImageFont.truetype(ruta_fuente, tamaño_fuente)

        # --- Función para dibujar texto con borde ---
        def dibujar_texto_con_borde(pos, texto, fuente, draw, relleno, borde):
            x, y = pos
            grosor_borde = int(tamaño_fuente / 30)
            draw.text((x-grosor_borde, y-grosor_borde), texto, font=fuente, fill=borde)
            draw.text((x+grosor_borde, y-grosor_borde), texto, font=fuente, fill=borde)
            draw.text((x-grosor_borde, y+grosor_borde), texto, font=fuente, fill=borde)
            draw.text((x+grosor_borde, y+grosor_borde), texto, font=fuente, fill=borde)
            draw.text(pos, texto, font=fuente, fill=relleno)

        # --- Posicionar y dibujar ---
        bbox = draw.textbbox((0, 0), texto_principal.upper(), font=font)
        ancho_texto = bbox[2] - bbox[0]
        alto_texto = bbox[3] - bbox[1]
        x_texto = (ancho_img - ancho_texto) / 2
        y_texto = (alto_img - alto_texto) / 2
        
        dibujar_texto_con_borde((x_texto, y_texto), texto_principal.upper(), font, draw, config["color_relleno"], config["color_borde"])
        
        # --- Guardar imagen ---
        ruta_salida = os.path.join(os.path.expanduser("~"), "AppData", "Local", "Temp", f"banner_temp_{datetime.now().timestamp()}.png")
        img.save(ruta_salida, "PNG")
        print(ruta_salida)

    except Exception as e:
        print(f"Error creando banner: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    estilo_arg = sys.argv[1]
    # Unimos todos los argumentos después del estilo para formar el texto completo
    texto_arg = " ".join(sys.argv[2:])
    crear_banner(estilo_arg, texto_arg)