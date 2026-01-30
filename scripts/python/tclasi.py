import sys
import requests
from bs4 import BeautifulSoup
import io
from unidecode import unidecode

# Configurar salida UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# URL genérica que suele redirigir a la edición actual
URL = 'https://chile.as.com/resultados/futbol/clasificacion_mundial_sudamerica/clasificacion/'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

BANDERAS = {
    'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Uruguay': '🇺🇾', 'Ecuador': '🇪🇨',
    'Brasil': '🇧🇷', 'Venezuela': '🇻🇪', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴',
    'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Perú': '🇵🇪'
}

def main():
    try:
        response = requests.get(URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Intentar encontrar la tabla con selectores comunes de AS
        tabla = soup.find('table', class_='tabla-datos')
        if not tabla:
            tabla = soup.find('table', class_='a_tb') # Selector nuevo diseño
            
        if not tabla:
            print("Error: No se encontró la tabla de posiciones.")
            return

        equipos_data = []
        tbody = tabla.find('tbody')
        
        if not tbody:
             print("Error: Tabla sin contenido.")
             return

        for i, row in enumerate(tbody.find_all('tr')):
            # Nombre equipo
            nombre_tag = row.find('span', class_='nombre-equipo')
            if not nombre_tag:
                nombre_tag = row.find('span', class_='a_tb_n')
            
            # Puntos
            puntos_tag = row.find('td', class_='destacado')
            if not puntos_tag:
                puntos_tag = row.find('td', class_='--bd')

            if nombre_tag and puntos_tag:
                nombre = nombre_tag.text.strip()
                puntos = puntos_tag.text.strip()
                
                # Buscar bandera
                nombre_clean = unidecode(nombre)
                bandera = "🏳️"
                for pais, flag in BANDERAS.items():
                    if pais in nombre_clean or nombre_clean in pais:
                        bandera = flag
                        break
                
                equipos_data.append({'pos': i + 1, 'equipo': nombre, 'bandera': bandera, 'puntos': puntos})

        if not equipos_data:
            print("No se pudieron extraer datos.")
            return

        print("🏆 *Clasificatorias Sudamericanas* 🏆\n")
        print(f"`{'#':<2} {'Equipo':<12} {'Pts':>3}`")
        print("`--------------------`")
        
        for e in equipos_data:
            nombre_corto = e['equipo'][:12] # Truncar para que quepa en celular
            linea = f"{e['pos']:<2} {nombre_corto:<12} {e['puntos']:>3}"
            print(f"`{e['bandera']} {linea}`")
            
            if e['pos'] == 6: print("`--------------------` (Repechaje)")
            elif e['pos'] == 7: print("`--------------------` (Eliminados)")

    except Exception as e:
        print(f"Error al obtener la tabla: {e}")

if __name__ == "__main__":
    main()
