import sys
import phonenumbers
from phonenumbers import geocoder, carrier, timezone

def get_phone_info(phone_number):
    try:
        # Añadir el '+' si no está, es necesario para el parseo
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number

        parsed_number = phonenumbers.parse(phone_number, None)

        if not phonenumbers.is_valid_number(parsed_number):
            return {"error": "El número de teléfono no es válido."}

        country = geocoder.description_for_number(parsed_number, "es")
        carrier_name = carrier.name_for_number(parsed_number, "es")
        time_zones = timezone.time_zones_for_number(parsed_number)

        return {
            "number": phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
            "country": country or "Desconocido",
            "carrier": carrier_name or "Desconocido",
            "time_zones": list(time_zones) if time_zones else ["Desconocida"]
        }
    except Exception as e:
        return {"error": f"No se pudo procesar el número. Detalles: {e}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        info = get_phone_info(sys.argv[1])
        import json
        print(json.dumps(info, indent=4))