import sys
import codecs
from bs4 import BeautifulSoup
import requests
import pandas as pd

# Configurar la codificación de caracteres de la consola a UTF-8
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

url = 'https://chile.as.com/resultados/futbol/chile/clasificacion/?omnil=mpal'

try:
    page = requests.get(url)
    page.raise_for_status()  # Lanza una excepción si la solicitud no fue exitosa
except requests.RequestException as e:
    print(f"Error al acceder a la página: {e}")
    sys.exit()

soup = BeautifulSoup(page.content, 'html.parser')

# Extraer los equipos y puntos
try:
    eq = soup.find_all('span', class_='nombre-equipo')
    equipos = [i.text.strip() for i in eq[:16]]

    pt = soup.find_all('td', class_='destacado')
    puntos = [i.text.strip() for i in pt[:16]]
except AttributeError as e:
    print(f"Error al extraer datos de la página: {e}")
    sys.exit()

# Verificar que todas las listas tienen la misma longitud
if len(equipos) != len(puntos):
    raise ValueError("Las listas de equipos y puntos no tienen la misma longitud")

# Crear DataFrame
df = pd.DataFrame({
    'Posición': list(range(1, 17)),
    'Equipo': equipos,
    'Puntos': puntos,
})

# Reducción del tamaño de las columnas para adaptar a pantalla de WhatsApp
df['Equipo'] = df['Equipo'].str.slice(0, 20)  # Limitar longitud del equipo
df['Puntos'] = df['Puntos'].str.slice(0, 6)   # Limitar longitud de puntos

# Especificar el nombre fijo del archivo CSV
filename = "tabla.csv"  # Nombre fijo para el archivo CSV

# Guardar tabla en archivo CSV
df.to_csv(filename, index=False, encoding='utf-8')

# Función para formatear cada fila para que no exceda 34 caracteres
def format_row(pos, equipo, puntos):
    # Alinear la posición a la izquierda con 2 caracteres, el equipo a la izquierda con 20 caracteres, y los puntos a la derecha con 6 caracteres
    return f"{pos:<2} {equipo:<20} {puntos:>6}"

# Imprimir tabla con líneas separadoras y posición
print('------------------------------')
for index, row in df.iterrows():
    print(format_row(row['Posición'], row['Equipo'], row['Puntos']))
print('------------------------------')
