import sys
import socket
import whois
import ipapi
import requests
import io
import ssl
import threading
import re
import dns.resolver
import dns.reversename
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple, Optional

# Importación segura de Wappalyzer (opcional)
try:
    from Wappalyzer import Wappalyzer, WebPage
    WAPPALYZER_AVAILABLE = True
except ImportError:
    WAPPALYZER_AVAILABLE = False

socket.setdefaulttimeout(10)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Cabeceras para evitar bloqueos
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
}

# Configuración ampliada de puertos
COMMON_PORTS = {
    21: ("FTP", "Tráfico no cifrado.", "[!]"),
    22: ("SSH", "Acceso seguro.", "[OK]"),
    23: ("Telnet", "¡Protocolo inseguro! Debe cerrarse.", "[!!]"),
    25: ("SMTP", "Servidor de correo saliente.", "[OK]"),
    53: ("DNS", "Servidor de nombres de dominio.", "[OK]"),
    80: ("HTTP", "Tráfico web no cifrado.", "[!]"),
    110: ("POP3", "Correo entrante no cifrado.", "[!]"),
    143: ("IMAP", "Correo entrante no cifrado.", "[!]"),
    443: ("HTTPS", "Tráfico web seguro.", "[OK]"),
    465: ("SMTPS", "SMTP seguro (SSL).", "[OK]"),
    587: ("SMTP-Sub", "SMTP con STARTTLS.", "[OK]"),
    993: ("IMAPS", "IMAP seguro.", "[OK]"),
    995: ("POP3S", "POP3 seguro.", "[OK]"),
    3306: ("MySQL", "No debería estar expuesto a internet.", "[!!]"),
    3389: ("RDP", "Escritorio Remoto. Riesgo alto.", "[!]"),
    5432: ("PostgreSQL", "No debería estar expuesto.", "[!!]"),
    6379: ("Redis", "No debería estar expuesto.", "[!!]"),
    8080: ("HTTP-Alt", "Proxy o servidor alternativo.", "[OK]"),
    8443: ("HTTPS-Alt", "HTTPS alternativo.", "[OK]")
}

MAX_SUBDOMAINS = 15
PORT_SCAN_TIMEOUT = 1.0
MAX_THREADS = 10
DNS_TIMEOUT = 5

# DNSBL conocidas para verificar blacklists
DNSBL_SERVERS = [
    'zen.spamhaus.org',
    'bl.spamcop.net',
    'b.barracudacentral.org',
    'dnsbl.sorbs.net'
]

def is_valid_domain_or_ip(target: str) -> Tuple[bool, bool, Optional[str]]:
    """Valida si el target es un dominio o IP válido."""
    try:
        from ipaddress import ip_address
        ip_address(target)
        return True, True, None
    except ValueError:
        pass
    
    if '.' in target and len(target) > 3:
        if re.match(r'^[a-z0-9.-]+\.[a-z0-9-]+$', target, re.IGNORECASE):
            return True, False, None
    
    return False, False, f"'{target}' no es un dominio o IP válido."

def analyze_dns_records(domain: str) -> str:
    """Analiza registros DNS completos del dominio."""
    report = ["\n--- DNS RECORDS ---"]
    
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = DNS_TIMEOUT
        resolver.lifetime = DNS_TIMEOUT
        
        # Registros A (IPv4)
        try:
            a_records = resolver.resolve(domain, 'A')
            ips = [str(r) for r in a_records]
            report.append(f"*A (IPv4):* `{', '.join(ips)}`")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
        
        # Registros AAAA (IPv6)
        try:
            aaaa_records = resolver.resolve(domain, 'AAAA')
            ipv6s = [str(r) for r in aaaa_records]
            report.append(f"*AAAA (IPv6):* `{', '.join(ipv6s[:2])}`")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
        
        # Registros MX (Mail Exchange)
        try:
            mx_records = resolver.resolve(domain, 'MX')
            mxs = [f"{r.preference} {str(r.exchange)}" for r in sorted(mx_records, key=lambda x: x.preference)]
            report.append(f"*MX (Email):* `{', '.join(mxs[:3])}`")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            report.append("*MX:* No configurado")
        
        # Registros TXT (SPF, DKIM, DMARC)
        try:
            txt_records = resolver.resolve(domain, 'TXT')
            for txt in txt_records:
                txt_str = str(txt).replace('"', '')
                if 'v=spf' in txt_str.lower():
                    report.append(f"*SPF:* `{txt_str[:80]}`")
                elif 'v=dmarc' in txt_str.lower():
                    report.append(f"*DMARC:* `{txt_str[:80]}`")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
        
        # Registros NS (Nameservers)
        try:
            ns_records = resolver.resolve(domain, 'NS')
            nameservers = [str(r) for r in ns_records]
            report.append(f"*NS:* `{', '.join(nameservers[:3])}`")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
        
        # Registro SOA
        try:
            soa_record = resolver.resolve(domain, 'SOA')[0]
            report.append(f"*SOA (Primary):* `{str(soa_record.mname)}`")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
            
    except Exception as e:
        report.append(f"[!] Error en análisis DNS: {str(e)[:80]}")
    
    return "\n".join(report) if len(report) > 1 else "\n--- DNS RECORDS ---\n[!] No se pudieron obtener registros DNS"

def get_geolocation_info(ip_address: str) -> str:
    """Obtiene información detallada de geolocalización."""
    report = ["\n--- GEOLOCATION ---"]
    
    try:
        geo_info = ipapi.location(ip=ip_address, output='json')
        
        if geo_info:
            country = geo_info.get('country_name', 'N/A')
            city = geo_info.get('city', 'N/A')
            region = geo_info.get('region', 'N/A')
            postal = geo_info.get('postal', 'N/A')
            isp = geo_info.get('org', 'N/A')
            asn = geo_info.get('asn', 'N/A')
            
            report.append(f"*Ubicación:* {city}, {region}, {country}")
            if postal != 'N/A':
                report.append(f"*Código Postal:* `{postal}`")
            report.append(f"*ISP/Org:* `{isp}`")
            if asn != 'N/A':
                report.append(f"*ASN:* `{asn}`")
            
            # Detectar CDN
            if 'cloudflare' in isp.lower():
                report.append("[SHIELD] *CDN:* Cloudflare detectado")
            elif 'amazon' in isp.lower() or 'aws' in isp.lower():
                report.append("[CLOUD] *Hosting:* Amazon AWS")
            elif 'google' in isp.lower():
                report.append("[CLOUD] *Hosting:* Google Cloud")
            elif 'microsoft' in isp.lower() or 'azure' in isp.lower():
                report.append("[CLOUD] *Hosting:* Microsoft Azure")
                
    except Exception as e:
        report.append(f"[!] Error en geolocalización: {str(e)[:50]}")
    
    return "\n".join(report)

def check_blacklists(ip_address: str) -> str:
    """Verifica si la IP está en listas negras de SPAM."""
    report = ["\n--- BLACKLIST CHECK ---"]
    blacklisted = []
    
    try:
        # Invertir IP para consultas DNSBL (ej: 1.2.3.4 -> 4.3.2.1)
        reversed_ip = '.'.join(reversed(ip_address.split('.')))
        
        for dnsbl in DNSBL_SERVERS:
            try:
                query = f"{reversed_ip}.{dnsbl}"
                socket.gethostbyname(query)
                blacklisted.append(dnsbl)
            except socket.gaierror:
                # No está en la lista negra (lo esperado)
                pass
            except Exception:
                pass
        
        if blacklisted:
            report.append(f"[!!] *IP en {len(blacklisted)} blacklist(s):* `{', '.join(blacklisted)}`")
        else:
            report.append("[OK] IP limpia - No está en blacklists conocidas")
            
    except Exception as e:
        report.append(f"[!] Error verificando blacklists: {str(e)[:50]}")
    
    return "\n".join(report)

def analyze_robots_and_sitemap(domain: str) -> str:
    """Analiza robots.txt y sitemap.xml del dominio."""
    report = ["\n--- ROBOTS.TXT & SITEMAP ---"]
    
    # Analizar robots.txt
    try:
        robots_url = f"https://{domain}/robots.txt"
        response = requests.get(robots_url, headers=HEADERS, timeout=5, verify=False)
        
        if response.status_code == 200:
            content = response.text
            lines = content.split('\n')[:15]  # Primeras 15 líneas
            
            disallows = [line.split(':')[1].strip() for line in lines if line.lower().startswith('disallow:')]
            sitemaps = [line.split(':',  1)[1].strip() for line in lines if line.lower().startswith('sitemap:')]
            
            if disallows:
                report.append(f"*Robots.txt:* Encontrado ({len(disallows)} reglas Disallow)")
            else:
                report.append("*Robots.txt:* Encontrado (sin restricciones)")
            
            if sitemaps:
                report.append(f"*Sitemaps:* `{sitemaps[0]}`")
        else:
            report.append("*Robots.txt:* No encontrado")
    except:
        report.append("*Robots.txt:* No accesible")
    
    # Analizar sitemap.xml
    try:
        sitemap_url = f"https://{domain}/sitemap.xml"
        response = requests.get(sitemap_url, headers=HEADERS, timeout=5, verify=False)
        
        if response.status_code == 200:
            # Contar URLs en el sitemap
            url_count = response.text.count('<url>')
            if url_count > 0:
                report.append(f"*Sitemap.xml:* {url_count} URLs indexadas")
            else:
                report.append("*Sitemap.xml:* Encontrado (index de sitemaps)")
        else:
            report.append("*Sitemap.xml:* No encontrado")
    except:
        pass
    
    return "\n".join(report)

def analyze_http_performance(domain: str) -> Dict[str, any]:
    """Analiza rendimiento HTTP del dominio."""
    report = ["\n--- HTTP PERFORMANCE ---"]
    
    try:
        import time
        start_time = time.time()
        
        response = requests.get(f"https://{domain}", headers=HEADERS, timeout=10, allow_redirects=True, verify=False)
        
        load_time = time.time() - start_time
        status_code = response.status_code
        content_length = len(response.content)
        
        # Analizar compresión
        encoding = response.headers.get('Content-Encoding', 'none')
        compressed = encoding.lower() in ['gzip', 'br', 'deflate']
        
        # Estado
        if status_code == 200:
            report.append(f"*Status:* [OK] `{status_code}` - Carga: `{load_time:.2f}s`")
        else:
            report.append(f"*Status:* [!] `{status_code}`")
        
        report.append(f"*Tamaño:* `{content_length / 1024:.1f} KB`")
        
        if compressed:
            report.append(f"*Compresión:* [OK] `{encoding.upper()}`")
        else:
            report.append("*Compresión:* [!] No habilitada")
        
        # Redirecciones
        if response.history:
            report.append(f"*Redirecciones:* `{len(response.history)}` saltos")
            
    except requests.exceptions.Timeout:
        report.append("[!] Timeout - Servidor responde lento (\u003e10s)")
    except requests.exceptions.SSLError:
        # Intentar HTTP
        try:
            response = requests.get(f"http://{domain}", headers=HEADERS, timeout=10)
            report.append(f"[!] HTTPS no disponible, HTTP: `{response.status_code}`")
        except:
            report.append("[X] No se pudo conectar")
    except Exception as e:
        report.append(f"[!] Error: {str(e)[:60]}")
    
    return "\n".join(report)

def detect_technologies_advanced(domain: str, response_headers: dict = None) -> str:
    """Detección avanzada de tecnologías sin Wappalyzer."""
    report = ["\n--- TECHNOLOGIES ---"]
    technologies = []
    
    # Si tenemos Wappalyzer, usarlo
    if WAPPALYZER_AVAILABLE:
        try:
            wappalyzer = Wappalyzer.latest()
            webpage = WebPage.new_from_url(f"https://{domain}", timeout=5)
            techs = wappalyzer.analyze(webpage)
            if techs:
                technologies.extend(sorted(techs)[:10])
        except:
            pass
    
    # Detección manual si no hay Wappalyzer o para complementar
    if response_headers:
        server = response_headers.get('Server', '')
        powered_by = response_headers.get('X-Powered-By', '')
        
        if server:
            technologies.append(f"Server: {server}")
        if powered_by:
            technologies.append(f"Powered-By: {powered_by}")
    
    # Intentar detectar por contenido HTML
    try:
        response = requests.get(f"https://{domain}", headers=HEADERS, timeout=5, verify=False)
        html = response.text.lower()
        
        # Detectar CMS/Frameworks comunes
        if 'wp-content' in html or 'wordpress' in html:
            technologies.append("WordPress")
        if 'joomla' in html:
            technologies.append("Joomla")
        if 'drupal' in html:
            technologies.append("Drupal")
        if 'react' in html or 'reactdom' in html:
            technologies.append("React")
        if 'vue' in html or 'vuejs' in html:
            technologies.append("Vue.js")
        if 'angular' in html:
            technologies.append("Angular")
        if 'bootstrap' in html:
            technologies.append("Bootstrap")
        if 'jquery' in html:
            technologies.append("jQuery")
            
    except:
        pass
    
    if technologies:
        unique_techs = list(set(technologies))[:15]
        report.append(", ".join(f"`{tech}`" for tech in unique_techs))
    else:
        report.append("No se detectaron tecnologías específicas")
    
    return "\n".join(report)

def scan_single_port(ip_address: str, port: int) -> Optional[Tuple]:
    """Escanea un puerto individual."""
    service, advice, emoji = COMMON_PORTS.get(port, (f"Port {port}", "Servicio desconocido.", "❓"))
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(PORT_SCAN_TIMEOUT)
            if sock.connect_ex((ip_address, port)) == 0:
                return (port, service, advice, emoji)
    except (socket.timeout, socket.error):
        pass
    return None

def detailed_port_scan(ip_address: str) -> str:
    """Escanea puertos comunes usando threading."""
    report = ["\n--- PORT SCAN ---"]
    open_ports_details = []
    
    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = {executor.submit(scan_single_port, ip_address, port): port for port in COMMON_PORTS.keys()}
        
        for future in as_completed(futures):
            result = future.result()
            if result:
                port, service, advice, marker = result
                open_ports_details.append((port, f"{marker} `{port}/{service}`: {advice}"))
    
    if open_ports_details:
        # Ordenar por número de puerto
        sorted_ports = sorted(open_ports_details, key=lambda x: x[0])
        report.extend([detail for _, detail in sorted_ports])
    else:
        report.append("[OK] No se encontraron puertos de riesgo abiertos")
        
    return "\n".join(report)

def analyze_security_headers_and_ssl(domain: str) -> Tuple[str, dict]:
    """Analiza cabeceras de seguridad y certificado SSL/TLS."""
    report = ["\n--- SSL/SECURITY ---"]
    response_headers = {}
    
    try:
        response = requests.get(f"https://{domain}", headers=HEADERS, timeout=5, allow_redirects=True, verify=False)
        response_headers = response.headers
        
        server = response_headers.get('Server', 'No identificado')
        report.append(f"*Servidor:* `{server}`")

        # Cabeceras de seguridad
        security_headers = {
            "Strict-Transport-Security": "[OK] HSTS habilitado",
            "Content-Security-Policy": "[OK] CSP configurado",
            "X-Frame-Options": "[OK] Clickjacking protection",
            "X-Content-Type-Options": "[OK] MIME-sniffing protection"
        }
        
        found_count = sum(1 for header in security_headers.keys() if header in response_headers)
        
        if found_count > 0:
            report.append(f"*Headers Seguridad:* {found_count}/4 configurados")
        else:
            report.append("[!] Sin headers de seguridad")

        # Certificado SSL
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    expire_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_left = (expire_date - datetime.now()).days
                    
                    if days_left > 30:
                        report.append(f"*SSL:* [OK] Válido ({days_left} días restantes)")
                    else:
                        report.append(f"*SSL:* [!] Expira pronto ({days_left} días)")
                        
        except ssl.SSLCertVerificationError:
            report.append("*SSL:* [X] Certificado inválido")
        except:
            pass

    except requests.exceptions.SSLError:
        report.append("[!] HTTPS no disponible o SSL inválido")
    except requests.exceptions.Timeout:
        report.append("[!] Timeout al conectar")
    except Exception as e:
        report.append(f"[!] Error: {str(e)[:60]}")
    
    return "\n".join(report), response_headers

def find_subdomains(domain: str) -> str:
    """Busca subdominios usando crt.sh."""
    report = ["\n--- SUBDOMAINS (crt.sh) ---"]
    
    try:
        response = requests.get(f"https://crt.sh/?q=%.{domain}&output=json", headers=HEADERS, timeout=10)
        response.raise_for_status()
        subdomains = set()
        
        for entry in response.json():
            name_value = entry.get('name_value', '').lower().strip()
            subdomains.update(name.strip() for name in name_value.split('\n') if name.strip())
        
        filtered_subdomains = sorted([s for s in subdomains if s != domain and '*' not in s])
        
        if filtered_subdomains:
            displayed = filtered_subdomains[:MAX_SUBDOMAINS]
            report.append(f"Encontrados: `{len(filtered_subdomains)}` (mostrando {len(displayed)})")
            report.extend(f"- `{s}`" for s in displayed)
            if len(filtered_subdomains) > MAX_SUBDOMAINS:
                report.append(f"_... y {len(filtered_subdomains) - MAX_SUBDOMAINS} más_")
        else:
            report.append("No se encontraron subdominios")
            
    except requests.exceptions.Timeout:
        report.append("[!] Timeout en búsqueda")
    except:
        report.append("[!] Error en búsqueda")
        
    return "\n".join(report)

def analyze_domain_complete(domain: str, ip_address: str) -> str:
    """Análisis completo mejorado de un dominio."""
    report = [f"[SEARCH] *Análisis de:* `{domain}` ({ip_address})\n"]
    
    # 1. Geolocalización mejorada
    report.append(get_geolocation_info(ip_address))
    
    # 2. DNS Records completos
    report.append(analyze_dns_records(domain))
    
    # 3. Blacklist check
    report.append(check_blacklists(ip_address))
    
    # 4. Performance HTTP
    report.append(analyze_http_performance(domain))
    
    # 5. SSL y Security Headers
    ssl_report, headers = analyze_security_headers_and_ssl(domain)
    report.append(ssl_report)
    
    # 6. Detección de tecnologías
    report.append(detect_technologies_advanced(domain, headers))
    
    # 7. Robots.txt y Sitemap
    report.append(analyze_robots_and_sitemap(domain))
    
    # 8. Port Scan
    report.append(detailed_port_scan(ip_address))
    
    # 9. Subdominios
    report.append(find_subdomains(domain))
    
    return "\n".join(report)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python net_analyzer.py <dominio_o_ip>", file=sys.stderr)
        sys.exit(1)
    
    target = sys.argv[1].lower().strip()
    
    # Validar entrada
    es_valido, es_ip, error = is_valid_domain_or_ip(target)
    if not es_valido:
        print(f"[ERROR] {error}")
        sys.exit(1)
    
    try:
        # Resolver IP si es dominio
        if not es_ip:
            ip_address_str = socket.gethostbyname(target)
        else:
            ip_address_str = target
            try:
                target = socket.gethostbyaddr(target)[0]
            except socket.herror:
                pass
        
        # Ejecutar análisis completo
        full_report = analyze_domain_complete(target, ip_address_str)
        print(full_report)
        
    except socket.gaierror:
        print(f"[ERROR] No se pudo resolver '{target}'")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {str(e)[:150]}")
        sys.exit(1)