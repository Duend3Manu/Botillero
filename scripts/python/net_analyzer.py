import sys
import socket
import whois
import dns.resolver
import ipapi
import requests
import io
import ssl
from datetime import datetime
from Wappalyzer import Wappalyzer, WebPage

socket.setdefaulttimeout(10)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_for_cdn(ip_address):
    """
    Verifica si la IP pertenece a un CDN conocido como Cloudflare.
    """
    try:
        print("DEBUG: Verificando si la IP pertenece a un CDN...", file=sys.stderr)
        geo_info = ipapi.location(ip=ip_address, output='json')
        isp = geo_info.get('org', '').lower()
        if 'cloudflare' in isp:
            return "🛡️ *Advertencia:* Este dominio está protegido por Cloudflare. El escaneo de puertos reflejará los servidores de Cloudflare, no el servidor de origen."
    except Exception:
        return None
    return None

def detailed_port_scan(ip_address):
    report = ["\n--- 🛡️ Escaneo de Puertos Comunes ---"]
    # Formato: Puerto: ("Servicio", "Consejo", "Nivel de Riesgo Emoji")
    common_ports = {
        21: ("FTP", "Tráfico no cifrado.", "⚠️"),
        22: ("SSH", "Acceso seguro.", "✅"),
        23: ("Telnet", "¡Protocolo inseguro! Debe cerrarse.", "🚨"),
        80: ("HTTP", "Tráfico web no cifrado.", "⚠️"),
        443: ("HTTPS", "Tráfico web seguro.", "✅"),
        3306: ("MySQL", "No debería estar expuesto a internet.", "🚨"),
        3389: ("RDP", "Escritorio Remoto. Riesgo alto si no está securizado.", "⚠️"),
        8080: ("HTTP-Proxy", "Proxy o servidor alternativo.", "✅")
    }
    open_ports_details = []
    
    for port, (service, advice, emoji) in common_ports.items():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            if sock.connect_ex((ip_address, port)) == 0:
                open_ports_details.append(f"{emoji} `{port}/{service}`: {advice}")

    if open_ports_details:
        report.extend(open_ports_details)
    else:
        report.append("✅ ¡Excelente! No se encontraron puertos de riesgo comunes abiertos.")
        
    return "\n".join(report)

def analyze_security_headers_and_ssl(domain):
    report = ["\n--- 🛡️ Cabeceras de Seguridad y SSL ---"]
    try:
        print(f"DEBUG: Obteniendo info de SSL y Cabeceras para {domain}...", file=sys.stderr)
        # Usamos requests.get para obtener todas las cabeceras
        response = requests.get(f"https://{domain}", timeout=5, allow_redirects=True)
        headers = response.headers
        report.append(f"Servidor Web: `{headers.get('Server', 'No identificado')}`")

        # Lista de cabeceras de seguridad a buscar
        security_headers = {
            "Strict-Transport-Security": "✅ Previene ataques Man-in-the-Middle.",
            "Content-Security-Policy": "✅ Ayuda a prevenir XSS.",
            "X-Frame-Options": "✅ Previene Clickjacking.",
            "X-Content-Type-Options": "✅ Previene ataques de tipo MIME."
        }
        
        found_headers = []
        for header, desc in security_headers.items():
            if header in headers:
                found_headers.append(f"  - `{header}`: {desc}")
        
        if found_headers:
            report.append("Cabeceras de Seguridad Encontradas:")
            report.extend(found_headers)
        else:
            report.append("⚠️ No se encontraron cabeceras de seguridad comunes.")

        # Análisis del certificado SSL
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443)) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                expire_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                days_left = (expire_date - datetime.now()).days
                report.append(f"Certificado SSL: Válido, expira en `{days_left}` días.")

    except ssl.SSLCertVerificationError:
        report.append("❌ Certificado SSL: Inválido o no confiable.")
    except Exception:
        report.append("⚠️ No se pudo obtener información de Cabeceras/SSL (posiblemente no usa HTTPS).")
    return "\n".join(report)

def detect_technologies(domain):
    report = ["\n--- 💻 Tecnologías Detectadas ---"]
    try:
        print(f"DEBUG: Detectando tecnologías para {domain}...", file=sys.stderr)
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(f"https://{domain}")
        technologies = wappalyzer.analyze(webpage)
        
        if technologies:
            # Formateamos solo las categorías principales
            tech_list = [f"`{tech}`" for tech in technologies]
            report.append(', '.join(tech_list))
        else:
            report.append("No se detectaron tecnologías específicas.")
    except Exception as e:
        # Simplificamos el mensaje de error para el reporte final
        report.append(f"⚠️ No se pudieron detectar tecnologías.")
        print(f"Wappalyzer error: {e}", file=sys.stderr)
    return "\n".join(report)


def analyze_nic_cl(domain, ip_address):
    report = [f"🔍 *Análisis para dominio chileno:* `{domain}` ({ip_address})\n"]
    
    # --- MEJORA: Añadimos la verificación de CDN ---
    cdn_warning = check_for_cdn(ip_address)
    if cdn_warning:
        report.append(cdn_warning)

    try:
        print(f"DEBUG: Consultando WHOIS para {domain} en NIC Chile...", file=sys.stderr)
        report.append("\n--- 🇨🇱 WHOIS (NIC Chile) ---")
        with socket.create_connection(("whois.nic.cl", 43)) as s:
            s.sendall((domain + "\r\n").encode())
            response = b""
            while True:
                data = s.recv(4096)
                if not data: break
                response += data
        
        text_response = response.decode('utf-8', errors='ignore')
        if "no existe" in text_response.lower():
             report.append(f"⚠️ El dominio `{domain}` no se encuentra registrado.")
        else:
            fecha_creacion = next((line.split(':', 1)[1].strip() for line in text_response.splitlines() if "Fecha de creación:" in line), "No disponible")
            fecha_expiracion = next((line.split(':', 1)[1].strip() for line in text_response.splitlines() if "Fecha de expiración:" in line), "No disponible")
            report.append(f"Creado: `{fecha_creacion}`\nExpira: `{fecha_expiracion}`")

    # --- MEJORA: Manejo de error de timeout más específico ---
    except socket.timeout:
        report.append("⚠️ La consulta a NIC Chile (`whois.nic.cl`) excedió el tiempo de espera. Puede ser un problema de red o un bloqueo en el puerto 43.")
    except Exception as e:
        report.append(f"⚠️ Error en la conexión a NIC Chile: {e}")
    
    # --- MEJORA: Añadimos los nuevos análisis ---
    report.append(analyze_security_headers_and_ssl(domain))
    report.append(detailed_port_scan(ip_address))
    report.append(detect_technologies(domain))
    report.append(find_subdomains(domain))
    return "\n".join(report)

# ... (La función analyze_international_domain y el resto del script se mantienen igual)
def analyze_international_domain(domain, ip_address):
    report = [f"🔍 *Análisis para:* `{domain}` ({ip_address})\n"]
    
    cdn_warning = check_for_cdn(ip_address)
    if cdn_warning:
        report.append(cdn_warning)
        
    try:
        print(f"DEBUG: Consultando WHOIS internacional para {domain}...", file=sys.stderr)
        report.append("\n--- 🌐 WHOIS (Internacional) ---")
        w = whois.whois(domain)
        if w.domain_name:
            creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date
            report.append(f"Creado: `{creation_date}`\nExpira: `{expiration_date}`")
        else:
            report.append(f"⚠️ No se encontró información WHOIS para `{domain}`.")
    except Exception as e:
        report.append(f"⚠️ La consulta WHOIS falló. El dominio puede no existir o el servidor está bloqueando la consulta.")
        print(f"WHOIS error: {e}", file=sys.stderr)

    # --- MEJORA: Añadimos los nuevos análisis ---
    report.append(analyze_security_headers_and_ssl(domain))
    report.append(detailed_port_scan(ip_address))
    report.append(detect_technologies(domain))
    report.append(find_subdomains(domain))
    return "\n".join(report)

def find_subdomains(domain):
    report = ["\n--- 🌐 Subdominios Encontrados (crt.sh) ---"]
    try:
        print(f"DEBUG: Buscando subdominios para {domain}...", file=sys.stderr)
        response = requests.get(f"https://crt.sh/?q=%.{domain}&output=json", timeout=10)
        response.raise_for_status()
        subdomains = set() # Usamos un set para evitar duplicados
        for entry in response.json():
            # Normalizamos a minúsculas y eliminamos espacios
            name_value = entry['name_value'].lower().strip()
            # crt.sh puede devolver múltiples líneas, nos quedamos con la primera
            subdomains.update(name.strip() for name in name_value.split('\n') if name.strip())
        
        if subdomains:
            # Filtramos para no mostrar el dominio principal ni wildcards
            filtered_subdomains = sorted([s for s in subdomains if s != domain and '*' not in s])
            if filtered_subdomains:
                report.append("Se encontraron los siguientes subdominios:")
                report.extend(f"- `{s}`" for s in filtered_subdomains[:10]) # Mostramos hasta 10
                if len(filtered_subdomains) > 10:
                    report.append("...y más.")
            else:
                report.append("No se encontraron subdominios adicionales.")
        else:
            report.append("No se encontraron subdominios.")
    except Exception as e:
        report.append(f"⚠️ No se pudo realizar la búsqueda de subdominios.")
        print(f"Subdomain search error: {e}", file=sys.stderr)
    return "\n".join(report)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python net_analyzer.py <dominio_o_ip>", file=sys.stderr)
        sys.exit(1)
    
    target = sys.argv[1].lower()
    
    try:
        print(f"DEBUG: Resolviendo IP para {target}...", file=sys.stderr)
        ip_address = socket.gethostbyname(target)
        
        if target.endswith('.cl'):
            full_report = analyze_nic_cl(target, ip_address)
        else:
            full_report = analyze_international_domain(target, ip_address)
            
        print(full_report)
        
    except socket.gaierror:
        print(f"❌ No se pudo resolver '{target}'. Verifica que el dominio o IP sea correcto.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}", file=sys.stderr)
        sys.exit(1)