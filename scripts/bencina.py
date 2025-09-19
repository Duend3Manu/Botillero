import sys
import json

# argumento opcional: comuna
comuna = sys.argv[1] if len(sys.argv) > 1 else "sin_comuna"

# ejemplo de salida JSON para que pythonService la parsee automáticamente
output = {
    "comuna": comuna,
    "precio_promedio": 999.9,
    "fuente": "mock"
}

print(json.dumps(output))
