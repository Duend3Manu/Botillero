import requests
import json

try:
    url = "https://mindicador.cl/api"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()
    print("Success!")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
