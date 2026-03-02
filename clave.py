import random
import string

# Conjunto de caracteres: A-Z y 0-9
caracteres = string.ascii_uppercase + string.digits

def generar_codigo():
    return ''.join(random.choices(caracteres, k=6))

# Generar 100 códigos y mostrarlos en pantalla
cantidad = 100
codigos = [generar_codigo() for _ in range(cantidad)]

for codigo in codigos:
    print(codigo)
