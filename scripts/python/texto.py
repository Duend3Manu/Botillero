# texto.py
import sys
from PIL import Image, ImageDraw, ImageFont
import textwrap

def agregar_texto_transparente(ruta_imagen, texto_arriba, texto_abajo):
    try:
        # --- Cargar la imagen base ---
        img_base = Image.open(ruta_imagen).convert("RGBA")
        ancho, alto = img_base.size

        # --- Crear una capa transparente para el texto ---
        capa_texto = Image.new("RGBA", img_base.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(capa_texto)

        # --- Configuración de la fuente ---
        # Usamos Arial, que es estándar en Windows.
        ruta_fuente = "C:/Windows/Fonts/arialbd.ttf" # Arial Bold
        tamaño_fuente = int(alto / 12)
        font = ImageFont.truetype(ruta_fuente, tamaño_fuente)
        
        # Color del texto: blanco con ~70% de opacidad (180 de 255)
        color_texto = (255, 255, 255, 230)

        # --- Dibujar Texto de Arriba ---
        lineas_arriba = textwrap.wrap(texto_arriba, width=25)
        y_texto = 15
        for linea in lineas_arriba:
            bbox = draw.textbbox((0, 0), linea, font=font)
            ancho_texto = bbox[2] - bbox[0]
            x_texto = (ancho - ancho_texto) / 2
            draw.text((x_texto, y_texto), linea, font=font, fill=color_texto)
            y_texto += tamaño_fuente + 5

        # --- Dibujar Texto de Abajo ---
        lineas_abajo = textwrap.wrap(texto_abajo, width=25)
        y_texto = alto - (tamaño_fuente + 15) * len(lineas_abajo)
        for linea in lineas_abajo:
            bbox = draw.textbbox((0, 0), linea, font=font)
            ancho_texto = bbox[2] - bbox[0]
            x_texto = (ancho - ancho_texto) / 2
            draw.text((x_texto, y_texto), linea, font=font, fill=color_texto)
            y_texto += tamaño_fuente + 5

        # --- Combinar la imagen base con la capa de texto ---
        img_final = Image.alpha_composite(img_base, capa_texto)

        # --- Guardar la imagen ---
        ruta_salida = ruta_imagen.replace(".jpeg", "_texto.png").replace(".jpg", "_texto.png")
        img_final.convert("RGB").save(ruta_salida, "JPEG") # Guardamos como JPEG para compatibilidad
        
        print(ruta_salida)

    except Exception as e:
        print(f"Error agregando texto: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    image_path = sys.argv[1]
    top_text = sys.argv[2]
    bottom_text = sys.argv[3]
    agregar_texto_transparente(image_path, top_text, bottom_text)