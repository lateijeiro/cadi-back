#!/bin/bash

API_URL="http://192.168.1.130:4000/api"

echo "🌱 Iniciando seed de datos de prueba..."
echo ""

# Verificar que el backend esté corriendo
echo "🔍 Verificando backend..."
if ! curl -s "$API_URL/health" > /dev/null; then
  echo "❌ Error: El backend no está corriendo en $API_URL"
  echo "   Por favor inicia el backend con: npm run dev"
  exit 1
fi
echo "✅ Backend está corriendo"
echo ""

# 1. Crear usuario ADMIN
echo "📝 Creando usuario Admin..."
ADMIN_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cadiapp.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "CadiApp",
    "phone": "+5491111111111",
    "role": "admin",
    "preferredLanguage": "es"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "⚠️  Admin ya existe, intentando login..."
  ADMIN_LOGIN=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@cadiapp.com","password":"admin123"}')
  ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: No se pudo obtener token de admin"
  exit 1
fi

echo "✅ Admin token obtenido"
echo ""

# 2. Crear Clubs
echo "🏌️  Creando clubs..."

CLUB1=$(curl -s -X POST $API_URL/clubs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Club de Golf Buenos Aires",
    "address": "Av. Libertador 2600, CABA",
    "city": "Buenos Aires",
    "province": "Buenos Aires",
    "phone": "+541143334444",
    "email": "info@clubbuenosaires.com"
  }')

CLUB1_ID=$(echo "$CLUB1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('_id', ''))")
if [ -z "$CLUB1_ID" ]; then
  echo "⚠️  Error creando Club 1, puede que ya exista"
else
  echo "✅ Club 1 creado: $CLUB1_ID"
fi

CLUB2=$(curl -s -X POST $API_URL/clubs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Olivos Golf Club",
    "address": "Ruta Panamericana Km 28, Olivos",
    "city": "Olivos",
    "province": "Buenos Aires",
    "phone": "+541147778888",
    "email": "info@olivosgolf.com"
  }')

CLUB2_ID=$(echo "$CLUB2" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('_id', ''))")
if [ -z "$CLUB2_ID" ]; then
  echo "⚠️  Error creando Club 2, puede que ya exista"
else
  echo "✅ Club 2 creado: $CLUB2_ID"
fi

CLUB3=$(curl -s -X POST $API_URL/clubs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Pilar Golf Club",
    "address": "Ruta 8 Km 60, Pilar",
    "city": "Pilar",
    "province": "Buenos Aires",
    "phone": "+542304555666",
    "email": "info@pilargolf.com"
  }')

CLUB3_ID=$(echo "$CLUB3" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('_id', ''))")
if [ -z "$CLUB3_ID" ]; then
  echo "⚠️  Error creando Club 3, puede que ya exista"
else
  echo "✅ Club 3 creado: $CLUB3_ID"
fi

# Si no se crearon clubs, intentar obtenerlos
if [ -z "$CLUB1_ID" ] || [ -z "$CLUB2_ID" ] || [ -z "$CLUB3_ID" ]; then
  echo "🔍 Obteniendo clubs existentes..."
  CLUBS=$(curl -s -X GET "$API_URL/clubs" -H "Authorization: Bearer $ADMIN_TOKEN")
  
  if [ -z "$CLUB1_ID" ]; then
    CLUB1_ID=$(echo "$CLUBS" | python3 -c "import sys, json; data=json.load(sys.stdin); clubs=data.get('data', []); print(clubs[0]['_id'] if len(clubs) > 0 else '')")
  fi
  if [ -z "$CLUB2_ID" ]; then
    CLUB2_ID=$(echo "$CLUBS" | python3 -c "import sys, json; data=json.load(sys.stdin); clubs=data.get('data', []); print(clubs[1]['_id'] if len(clubs) > 1 else '')")
  fi
  if [ -z "$CLUB3_ID" ]; then
    CLUB3_ID=$(echo "$CLUBS" | python3 -c "import sys, json; data=json.load(sys.stdin); clubs=data.get('data', []); print(clubs[2]['_id'] if len(clubs) > 2 else '')")
  fi
fi

echo ""

# 3. Crear usuarios Golfer
echo "⛳ Creando golfistas..."

# Golfer 1
GOLFER1=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lucas@test.com",
    "password": "123456",
    "firstName": "Lucas",
    "lastName": "Martinez",
    "phone": "+5491155557777",
    "role": "golfer",
    "preferredLanguage": "es"
  }')

GOLFER1_TOKEN=$(echo "$GOLFER1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$GOLFER1_TOKEN" ]; then
  GOLFER1_LOGIN=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"lucas@test.com","password":"123456"}')
  GOLFER1_TOKEN=$(echo "$GOLFER1_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")
fi

echo "✅ Golfer 1: Lucas Martinez"

# Completar perfil Golfer 1
curl -s -X PUT $API_URL/golfers/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GOLFER1_TOKEN" \
  -d "{
    \"homeClub\": \"$CLUB1_ID\",
    \"handicap\": 18
  }" > /dev/null

echo "  ✓ Perfil completado"

# Golfer 2
GOLFER2=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana.garcia@golf.com",
    "password": "123456",
    "firstName": "Ana",
    "lastName": "Garcia",
    "phone": "+5491166668888",
    "role": "golfer",
    "preferredLanguage": "es"
  }')

GOLFER2_TOKEN=$(echo "$GOLFER2" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$GOLFER2_TOKEN" ]; then
  GOLFER2_LOGIN=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ana.garcia@golf.com","password":"123456"}')
  GOLFER2_TOKEN=$(echo "$GOLFER2_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")
fi

echo "✅ Golfer 2: Ana Garcia"

# Completar perfil Golfer 2
curl -s -X PUT $API_URL/golfers/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GOLFER2_TOKEN" \
  -d "{
    \"homeClub\": \"$CLUB2_ID\",
    \"handicap\": 24
  }" > /dev/null

echo "  ✓ Perfil completado"

echo ""

# 4. Crear usuarios Caddie
echo "👤 Creando caddies..."

# Caddie 1
CADDIE1=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos.gomez@caddie.com",
    "password": "123456",
    "firstName": "Carlos",
    "lastName": "Gomez",
    "phone": "+5491122223333",
    "role": "caddie",
    "preferredLanguage": "es"
  }')

CADDIE1_TOKEN=$(echo "$CADDIE1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$CADDIE1_TOKEN" ]; then
  CADDIE1_LOGIN=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"carlos.gomez@caddie.com","password":"123456"}')
  CADDIE1_TOKEN=$(echo "$CADDIE1_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")
fi

echo "✅ Caddie 1: Carlos Gomez"

# Verificar si ya tiene perfil
CHECK_PROFILE=$(curl -s -X GET $API_URL/caddies/me \
  -H "Authorization: Bearer $CADDIE1_TOKEN")

HAS_PROFILE=$(echo "$CHECK_PROFILE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('yes' if 'data' in data and data['data'] else 'no')" 2>/dev/null)

if [ "$HAS_PROFILE" = "no" ]; then
  # Completar perfil Caddie 1
  curl -s -X POST $API_URL/caddies/me \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CADDIE1_TOKEN" \
    -d "{
      \"dni\": \"12345678\",
      \"experience\": \"5 años de experiencia en torneos profesionales\",
      \"category\": \"1ra\",
      \"clubs\": [\"$CLUB1_ID\", \"$CLUB2_ID\"],
      \"suggestedRate\": 5000
    }" > /dev/null
  echo "  ✓ Perfil completado"
else
  echo "  ⚠️  Perfil ya existe"
fi

# Caddie 2
CADDIE2=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.fernandez@caddie.com",
    "password": "123456",
    "firstName": "Maria",
    "lastName": "Fernandez",
    "phone": "+5491133334444",
    "role": "caddie",
    "preferredLanguage": "es"
  }')

CADDIE2_TOKEN=$(echo "$CADDIE2" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$CADDIE2_TOKEN" ]; then
  CADDIE2_LOGIN=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"maria.fernandez@caddie.com","password":"123456"}')
  CADDIE2_TOKEN=$(echo "$CADDIE2_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")
fi

echo "✅ Caddie 2: Maria Fernandez"

# Verificar si ya tiene perfil
CHECK_PROFILE=$(curl -s -X GET $API_URL/caddies/me \
  -H "Authorization: Bearer $CADDIE2_TOKEN")

HAS_PROFILE=$(echo "$CHECK_PROFILE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('yes' if 'data' in data and data['data'] else 'no')" 2>/dev/null)

if [ "$HAS_PROFILE" = "no" ]; then
  # Completar perfil Caddie 2
  curl -s -X POST $API_URL/caddies/me \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CADDIE2_TOKEN" \
    -d "{
      \"dni\": \"23456789\",
      \"experience\": \"3 años de experiencia, especializada en clases para principiantes\",
      \"category\": \"2da\",
      \"clubs\": [\"$CLUB2_ID\", \"$CLUB3_ID\"],
      \"suggestedRate\": 3500
    }" > /dev/null
  echo "  ✓ Perfil completado"
else
  echo "  ⚠️  Perfil ya existe"
fi

# Caddie 3
CADDIE3=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@caddie.com",
    "password": "123456",
    "firstName": "Juan",
    "lastName": "Perez",
    "phone": "+5491144445555",
    "role": "caddie",
    "preferredLanguage": "es"
  }')

CADDIE3_TOKEN=$(echo "$CADDIE3" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$CADDIE3_TOKEN" ]; then
  CADDIE3_LOGIN=$(curl -s -X POST $API_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"juan.perez@caddie.com","password":"123456"}')
  CADDIE3_TOKEN=$(echo "$CADDIE3_LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")
fi

echo "✅ Caddie 3: Juan Perez"

# Verificar si ya tiene perfil
CHECK_PROFILE=$(curl -s -X GET $API_URL/caddies/me \
  -H "Authorization: Bearer $CADDIE3_TOKEN")

HAS_PROFILE=$(echo "$CHECK_PROFILE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('yes' if 'data' in data and data['data'] else 'no')" 2>/dev/null)

if [ "$HAS_PROFILE" = "no" ]; then
  # Completar perfil Caddie 3
  curl -s -X POST $API_URL/caddies/me \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CADDIE3_TOKEN" \
    -d "{
      \"dni\": \"34567890\",
      \"experience\": \"Caddie junior con 1 año de experiencia\",
      \"category\": \"3ra\",
      \"clubs\": [\"$CLUB1_ID\", \"$CLUB3_ID\"],
      \"suggestedRate\": 2500
    }" > /dev/null
  echo "  ✓ Perfil completado"
else
  echo "  ⚠️  Perfil ya existe"
fi
echo ""

# 5. Aprobar Caddies (como admin)
echo "✅ Aprobando caddies..."

# Obtener lista de caddies pendientes
CADDIES=$(curl -s -X GET "$API_URL/caddies?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

# Extraer IDs y aprobar
echo "$CADDIES" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'data' in data and isinstance(data['data'], list):
        for caddie in data['data']:
            print(caddie.get('_id', ''))
except:
    pass
" | while read CADDIE_ID; do
  if [ ! -z "$CADDIE_ID" ]; then
    curl -s -X PATCH "$API_URL/caddies/$CADDIE_ID/approve" \
      -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    echo "  ✓ Aprobado: $CADDIE_ID"
  fi
done
echo ""

# 6. Configurar disponibilidad (solo si tenemos IDs de clubs)
echo "📅 Configurando disponibilidad..."

if [ -z "$CLUB1_ID" ] || [ -z "$CLUB2_ID" ] || [ -z "$CLUB3_ID" ]; then
  echo "⚠️  Saltando configuración de disponibilidad (faltan IDs de clubs)"
else
  # Disponibilidad Caddie 1
  curl -s -X PUT $API_URL/caddies/me/recurring-availability \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CADDIE1_TOKEN" \
    -d "{
      \"recurringAvailability\": [
        {
          \"clubId\": \"$CLUB1_ID\",
          \"dayOfWeek\": 1,
          \"timeSlots\": [\"09:00-12:00\", \"12:00-15:00\"]
        },
        {
          \"clubId\": \"$CLUB1_ID\",
          \"dayOfWeek\": 3,
          \"timeSlots\": [\"09:00-12:00\", \"15:00-18:00\"]
        },
        {
          \"clubId\": \"$CLUB2_ID\",
          \"dayOfWeek\": 6,
          \"timeSlots\": [\"09:00-12:00\", \"12:00-15:00\", \"15:00-18:00\"]
        }
      ]
    }" > /dev/null

  echo "✅ Disponibilidad Caddie 1 configurada"

  # Disponibilidad Caddie 2
  curl -s -X PUT $API_URL/caddies/me/recurring-availability \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CADDIE2_TOKEN" \
    -d "{
      \"recurringAvailability\": [
        {
          \"clubId\": \"$CLUB2_ID\",
          \"dayOfWeek\": 2,
          \"timeSlots\": [\"12:00-15:00\", \"15:00-18:00\"]
        },
        {
          \"clubId\": \"$CLUB3_ID\",
          \"dayOfWeek\": 5,
          \"timeSlots\": [\"09:00-12:00\", \"12:00-15:00\"]
        }
      ]
    }" > /dev/null

  echo "✅ Disponibilidad Caddie 2 configurada"

  # Disponibilidad Caddie 3
  curl -s -X PUT $API_URL/caddies/me/recurring-availability \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CADDIE3_TOKEN" \
    -d "{
      \"recurringAvailability\": [
        {
          \"clubId\": \"$CLUB1_ID\",
          \"dayOfWeek\": 0,
          \"timeSlots\": [\"09:00-12:00\"]
        },
        {
          \"clubId\": \"$CLUB3_ID\",
          \"dayOfWeek\": 4,
          \"timeSlots\": [\"15:00-18:00\"]
        }
      ]
    }" > /dev/null

  echo "✅ Disponibilidad Caddie 3 configurada"
fi

echo ""
echo "🎉 ¡Seed completado exitosamente!"
echo ""
echo "📊 Resumen de datos creados:"
echo "  • 1 Admin: admin@cadiapp.com / admin123"
echo "  • 3 Clubs"
echo "  • 2 Golfistas:"
echo "    - Lucas Martinez - lucas@test.com / 123456"
echo "    - Ana Garcia - ana.garcia@golf.com / 123456"
echo "  • 3 Caddies aprobados:"
echo "    - Carlos Gomez (1ra) - carlos.gomez@caddie.com / 123456"
echo "    - Maria Fernandez (2da) - maria.fernandez@caddie.com / 123456"
echo "    - Juan Perez (3ra) - juan.perez@caddie.com / 123456"
echo ""
echo "✨ Ya puedes empezar a probar la app!"
