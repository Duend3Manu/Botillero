# bencina.py

import requests
import sys
import json

# Asegura que stdout use UTF-8 incluso en Windows (evita UnicodeEncodeError)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def obtener_datos_bencina(comuna):
    try:
        url = "https://api.bencinaenlinea.cl/api/busqueda_estacion_filtro"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        datos = response.json()

        # --- MEJORA DE ROBUSTEZ ---
        # Se verifica que la respuesta de la API tenga la estructura esperada.
        if not isinstance(datos, dict) or "data" not in datos or not isinstance(datos["data"], list):
            # Si la API responde con algo inesperado, se devuelve un error claro.
            return {"error": "La API de Bencina en Línea devolvió una respuesta inesperada."}
        
        # Filtrar los datos localmente
        estaciones_encontradas = [
            estacion for estacion in datos["data"] 
            if isinstance(estacion, dict) and "comuna" in estacion and comuna.lower() in estacion["comuna"].lower()
        ]
        return estaciones_encontradas
        
    except requests.exceptions.Timeout:
        return {"error": f"El servidor de Bencina en Línea se demoró demasiado en responder (más de 30 segundos)."}
    except requests.exceptions.RequestException as e:
        return {"error": f"Error al conectar con la API de bencinas: {e}"}
    except json.JSONDecodeError:
        return {"error": "La API de Bencina en Línea no respondió con un formato válido."}
    except Exception as e:
        return {"error": f"Error inesperado en el script de Python: {e}"}

def imprimir_datos(estacion):
    resultado = []
    resultado.append(f"📍 Nombre: {estacion.get('direccion', 'N/A')}")
    resultado.append(f"🗺️ Mapa: https://www.google.com/maps/search/?api=1&query={estacion.get('latitud', '')},{estacion.get('longitud', '')}")
    resultado.append("⛽ Precios:")
    
    combustibles = estacion.get('combustibles', [])
    if not combustibles:
        resultado.append("  • No hay información de precios disponible.")
    else:
        for combustible in combustibles:
            try:
                precio_str = combustible.get('precio')
                if precio_str:
                    precio = f"${float(precio_str):,.0f}".replace(",",".") # Formato moneda chileno
                    unidad = combustible.get('unidad_cobro', '$/L').replace('$', '')
                    nombre = combustible.get('nombre_largo', 'Combustible')
                    resultado.append(f"  • {nombre}: {precio} x {unidad}")
            except (ValueError, TypeError):
                continue
    return "\n".join(resultado)

def main(comuna):
    datos_bencina = obtener_datos_bencina(comuna)

    if isinstance(datos_bencina, dict) and 'error' in datos_bencina:
        print(json.dumps(datos_bencina))
        return

    if datos_bencina:
        resultados_finales = [f"✅ Precios de bencina para *{comuna.title()}*:\n"]
        for estacion in datos_bencina:
            resultados_finales.append(imprimir_datos(estacion))
        
        # Une cada estación con una línea separadora
        print("\n" + ("-"*30 + "\n").join(resultados_finales))
    else:
        print(f"❌ No se encontraron estaciones de servicio para la comuna '{comuna}'.\n\n_Asegúrate de que el nombre esté bien escrito y no uses abreviaturas._")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No se proporcionó una comuna."}))
        sys.exit(1)
    
    comuna_input = " ".join(sys.argv[1:])
    main(comuna_input)

