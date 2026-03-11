// Codigo para sacar cancion, artista y nivel de popularidad de archivo JSON para servicio de streaming tidal

import json

# 1. Cargamos el archivo que subiste
nombre_archivo = 'mi_mix.json' 

with open(nombre_archivo, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 2. Navegamos por la estructura de Tidal (Rows -> Modules -> PagedList -> Items)
try:
    # Buscamos en los módulos el que tenga la lista de tracks
    items = []
    for row in data['rows']:
        for module in row['modules']:
            if 'pagedList' in module:
                items = module['pagedList']['items']
                break
    
    print(f"✅ ¡Éxito! Encontré {len(items)} canciones en tu mix: {data['title']}\n")
    print("Copia y pégame esto:\n")
    print("-" * 50)

    # 3. Formateamos la salida para que sea ligera y me la puedas mandar
    for i, item in enumerate(items, 1):
        titulo = item.get('title')
        artistas = ", ".join([a['name'] for a in item.get('artists', [])])
        popularidad = item.get('popularity', 'N/A')
        
        # Solo imprimimos lo esencial para no saturar el chat
        print(f"{i}. {titulo} - {artistas} ({popularidad}%)")

except Exception as e:
    print(f"❌ Error al procesar: {e}. Asegúrate de que el JSON esté completo.")
