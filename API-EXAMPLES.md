# CadiApp API - Ejemplos de Uso

## Tabla de Contenidos
1. [Autenticación](#autenticación)
2. [Perfil de Golfista](#perfil-de-golfista)
3. [Perfil de Caddie](#perfil-de-caddie)
4. [Búsqueda de Caddies](#búsqueda-de-caddies)
5. [Reservas (Bookings)](#reservas-bookings)
6. [Clubes](#clubes)
7. [Pagos (Payments)](#pagos-payments)
8. [Administración](#administración)

## Autenticación

### 1. Registrar Golfista

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "email": "golfer@example.com",
    "password": "password123",
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "+54911234567",
    "role": "golfer",
    "preferredLanguage": "es"
  }'
```

### 2. Registrar Caddie

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "email": "caddie@example.com",
    "password": "password123",
    "firstName": "Carlos",
    "lastName": "González",
    "phone": "+54911234567",
    "role": "caddie",
    "preferredLanguage": "es"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "email": "golfer@example.com",
    "password": "password123"
  }'
```

**Respuesta:**
```json
{
  "status": "éxito",
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "...",
      "email": "golfer@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "golfer",
      "preferredLanguage": "es"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 4. Obtener Usuario Actual (requiere autenticación)

```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Accept-Language: es"
```

## Soporte Multiidioma

### Español (default)
```bash
curl http://localhost:4000/api/health
```

### Inglés
```bash
curl -H "Accept-Language: en" http://localhost:4000/api/health
```

### Header personalizado
```bash
curl -H "X-App-Language: en" http://localhost:4000/api/health
```

---

## Perfil de Golfista

### 1. Obtener mi perfil de golfista

```bash
curl -X GET http://localhost:4000/api/golfers/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 2. Actualizar mi perfil de golfista

```bash
curl -X PUT http://localhost:4000/api/golfers/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "homeClub": "Club de Golf Buenos Aires",
    "handicap": 18
  }'
```

### 3. Ver perfil de un golfista específico

```bash
curl -X GET http://localhost:4000/api/golfers/GOLFER_ID \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 4. Listar todos los golfistas (paginado)

```bash
curl -X GET "http://localhost:4000/api/golfers?page=1&limit=10" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## Perfil de Caddie

### 1. Crear mi perfil de caddie

```bash
curl -X POST http://localhost:4000/api/caddies/me \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Content-Type: application/json" \
  -d '{
    "dni": "12345678",
    "photo": "https://cloudinary.com/photo.jpg",
    "experience": "10 años de experiencia en golf profesional",
    "category": "1ra",
    "clubs": ["CLUB_ID_1", "CLUB_ID_2"],
    "suggestedRate": 5000
  }'
```

### 2. Obtener mi perfil de caddie

```bash
curl -X GET http://localhost:4000/api/caddies/me \
  -H "Authorization: Bearer TU_TOKEN_CADDIE"
```

### 3. Actualizar mi perfil de caddie

```bash
curl -X PUT http://localhost:4000/api/caddies/me \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Content-Type: application/json" \
  -d '{
    "experience": "12 años de experiencia",
    "category": "1ra",
    "suggestedRate": 6000
  }'
```

### 4. Actualizar mi disponibilidad (fechas específicas)

**Nota:** Usa este endpoint para excepciones o fechas específicas (ej: "25 de diciembre no estoy disponible").

```bash
curl -X PUT http://localhost:4000/api/caddies/me/availability \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Content-Type: application/json" \
  -d '{
    "availability": [
      {
        "clubId": "674c4930a9e6f1a2b3c4d5e6",
        "date": "2025-12-15",
        "timeSlots": ["09:00-12:00", "12:00-15:00"]
      },
      {
        "clubId": "674c4930a9e6f1a2b3c4d5e6",
        "date": "2025-12-16",
        "timeSlots": ["09:00-12:00", "15:00-18:00"]
      }
    ]
  }'
```

### 5. Actualizar disponibilidad recurrente (semanal)

**Nota:** Define tu disponibilidad semanal (ej: "todos los lunes de 9-18 en el Club A"). El sistema automáticamente excluye los horarios con reservas existentes cuando un golfista busca caddies.

```bash
curl -X PUT http://localhost:4000/api/caddies/me/recurring-availability \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "recurringAvailability": [
      {
        "clubId": "674c4930a9e6f1a2b3c4d5e6",
        "dayOfWeek": 1,
        "timeSlots": ["09:00-12:00", "14:00-18:00"]
      },
      {
        "clubId": "674c4930a9e6f1a2b3c4d5e6",
        "dayOfWeek": 3,
        "timeSlots": ["09:00-12:00"]
      }
    ]
  }'
```

**Días de la semana:**
- 0 = Domingo
- 1 = Lunes  
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado

### 7. Ver perfil de un caddie específico

```bash
curl -X GET http://localhost:4000/api/caddies/CADDIE_ID \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 8. Listar todos los caddies (paginado)

```bash
# Todos los caddies
curl -X GET "http://localhost:4000/api/caddies?page=1&limit=10" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# Solo caddies aprobados
curl -X GET "http://localhost:4000/api/caddies?page=1&limit=10&status=approved" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## Búsqueda de Caddies

### Buscar caddies disponibles

**Nota:** Este endpoint busca caddies que:
1. Tengan disponibilidad específica en la fecha solicitada O disponibilidad recurrente para ese día de la semana
2. NO tengan reservas PENDING o ACCEPTED en ese horario (se excluyen automáticamente)

```bash
curl -X GET "http://localhost:4000/api/caddies/search?clubId=674c4930a9e6f1a2b3c4d5e6&date=2025-12-15&timeSlot=09:00-12:00" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Accept-Language: es"
```

**Parámetros requeridos:**
- `clubId`: ID del club
- `date`: Fecha en formato YYYY-MM-DD
- `timeSlot`: Franja horaria en formato HH:MM-HH:MM (ej: `09:00-12:00`, `12:00-15:00`, `15:00-18:00`)

---

## Administración

### 1. Aprobar caddie (solo admin)

```bash
curl -X PUT http://localhost:4000/api/caddies/CADDIE_ID/approve \
  -H "Authorization: Bearer TU_TOKEN_ADMIN"
```

### 2. Rechazar caddie (solo admin)

```bash
curl -X PUT http://localhost:4000/api/caddies/CADDIE_ID/reject \
  -H "Authorization: Bearer TU_TOKEN_ADMIN"
```

---

## Reservas (Bookings)

### 1. Crear una reserva (solo golfer)

```bash
curl -X POST http://localhost:4000/api/bookings \
  -H "Authorization: Bearer TU_TOKEN_GOLFER" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "caddieId": "674c4930a9e6f1a2b3c4d5e7",
    "clubId": "674c4930a9e6f1a2b3c4d5e6",
    "date": "2025-12-20",
    "timeSlot": "09:00-12:00"
  }'
```

**Respuesta:**
```json
{
  "message": "Reserva creada exitosamente",
  "data": {
    "_id": "674c4930a9e6f1a2b3c4d5e8",
    "golferId": "674c4930a9e6f1a2b3c4d5e9",
    "caddieId": "674c4930a9e6f1a2b3c4d5e7",
    "clubId": "674c4930a9e6f1a2b3c4d5e6",
    "date": "2025-12-20T00:00:00.000Z",
    "timeSlot": "09:00-12:00",
    "status": "pending",
    "createdAt": "2025-12-13T10:00:00.000Z"
  }
}
```

### 2. Obtener mis reservas

**Como golfer:**
```bash
curl -X GET http://localhost:4000/api/bookings/me \
  -H "Authorization: Bearer TU_TOKEN_GOLFER"
```

**Como caddie:**
```bash
curl -X GET http://localhost:4000/api/bookings/me \
  -H "Authorization: Bearer TU_TOKEN_CADDIE"
```

### 3. Obtener una reserva específica

```bash
curl -X GET http://localhost:4000/api/bookings/BOOKING_ID \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 4. Aceptar una reserva (solo caddie)

```bash
curl -X PUT http://localhost:4000/api/bookings/BOOKING_ID/accept \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Accept-Language: es"
```

**Nota:** Al aceptar la reserva, se genera automáticamente un código QR escaneable (imagen en formato Data URL base64) que contiene los datos de la reserva.

**Respuesta:**
```json
{
  "message": "Reserva aceptada",
  "data": {
    "_id": "674c4930a9e6f1a2b3c4d5e8",
    "status": "accepted",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    ...
  }
}
```

**El código QR contiene:**
- ID de la reserva
- IDs de caddie, golfer y club
- Fecha y horario
- Timestamp de generación

El golfer puede mostrar esta imagen QR desde la app móvil y el caddie puede escanearla para iniciar el servicio.

### 5. Iniciar servicio con QR (solo caddie)

```bash
curl -X POST http://localhost:4000/api/bookings/BOOKING_ID/start \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "qrData": "{\"bookingId\":\"674c4930a9e6f1a2b3c4d5e8\",\"caddieId\":\"674c4930a9e6f1a2b3c4d5e7\",\"golferId\":\"674c4930a9e6f1a2b3c4d5e9\",\"clubId\":\"674c4930a9e6f1a2b3c4d5e6\",\"date\":\"2025-12-20\",\"startTime\":\"09:00\",\"endTime\":\"12:00\",\"timestamp\":1734089450000}"
  }'
```

**Validaciones:**
- El booking debe existir y estar en estado `accepted`
- El `bookingId` en el QR debe coincidir con el ID del endpoint
- El `caddieId` en el QR debe coincidir con el caddie que escanea
- La fecha en el QR debe estar dentro de ±1 día de la fecha de la reserva
- Solo el caddie asignado puede iniciar el servicio

**Respuesta exitosa:**
```json
{
  "message": "Servicio iniciado exitosamente",
  "data": {
    "_id": "674c4930a9e6f1a2b3c4d5e8",
    "status": "in-progress",
    ...
  }
}
```

**Errores posibles:**
```json
{
  "error": "Código QR inválido"  // QR no es JSON válido
}
```
```json
{
  "error": "El código QR no corresponde a esta reserva"  // bookingId no coincide
}
```
```json
{
  "error": "El código QR no corresponde a este caddie"  // caddieId no coincide
}
```
```json
{
  "error": "El código QR no corresponde a la fecha de esta reserva"  // fecha fuera del rango
}
```
```json
{
  "error": "La reserva debe estar en estado aceptado"  // status inválido
}
```

### 6. Rechazar una reserva (solo caddie)

```bash
curl -X PUT http://localhost:4000/api/bookings/BOOKING_ID/reject \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Accept-Language: es"
```

### 7. Completar una reserva (solo caddie)

```bash
curl -X PUT http://localhost:4000/api/bookings/BOOKING_ID/complete \
  -H "Authorization: Bearer TU_TOKEN_CADDIE" \
  -H "Accept-Language: es"
```

**Validaciones:**
- Solo el caddie asignado puede completar el servicio
- El booking debe estar en estado `accepted` o `in-progress`
- Cambia el estado a `completed`

**Nota:** Solo se puede completar una reserva que está en estado "accepted".

### 7. Cancelar una reserva (golfer o caddie)

```bash
curl -X PUT http://localhost:4000/api/bookings/BOOKING_ID/cancel \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Accept-Language: es"
```

**Nota:** Tanto el golfer como el caddie pueden cancelar la reserva si está en estado "pending" o "accepted".

### 8. Calificar una reserva (solo golfer)

```bash
curl -X PUT http://localhost:4000/api/bookings/BOOKING_ID/rate \
  -H "Authorization: Bearer TU_TOKEN_GOLFER" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "rating": 5,
    "review": "Excelente servicio, muy profesional"
  }'
```

**Nota:** Solo se puede calificar una reserva completada. Rating debe ser entre 1 y 5.

---

## Clubes

### 1. Crear un club (solo admin)

```bash
curl -X POST http://localhost:4000/api/clubs \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "name": "Jockey Club Argentino",
    "address": "Av. Márquez 1700",
    "city": "San Isidro",
    "province": "Buenos Aires",
    "phone": "+54111234567",
    "email": "info@jockeyclub.com.ar"
  }'
```

**Respuesta:**
```json
{
  "message": "Club creado exitosamente",
  "data": {
    "_id": "674c4930a9e6f1a2b3c4d5e6",
    "name": "Jockey Club Argentino",
    "address": "Av. Márquez 1700",
    "city": "San Isidro",
    "province": "Buenos Aires",
    "phone": "+54111234567",
    "email": "info@jockeyclub.com.ar",
    "createdAt": "2025-12-13T10:00:00.000Z",
    "updatedAt": "2025-12-13T10:00:00.000Z"
  }
}
```

### 2. Listar todos los clubes (paginado)

```bash
# Listar todos los clubes
curl -X GET "http://localhost:4000/api/clubs?page=1&limit=10" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# Sin paginación (default: página 1, 10 por página)
curl -X GET http://localhost:4000/api/clubs \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta:**
```json
{
  "clubs": [
    {
      "_id": "674c4930a9e6f1a2b3c4d5e6",
      "name": "Jockey Club Argentino",
      "address": "Av. Márquez 1700",
      "city": "San Isidro",
      "province": "Buenos Aires"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 3. Obtener un club específico

```bash
curl -X GET http://localhost:4000/api/clubs/CLUB_ID \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 4. Actualizar un club (solo admin)

```bash
curl -X PUT http://localhost:4000/api/clubs/CLUB_ID \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "name": "Jockey Club Argentino - Sede Principal",
    "phone": "+54111234999"
  }'
```

**Nota:** Solo se actualizan los campos enviados en el body.

### 5. Eliminar un club (solo admin)

```bash
curl -X DELETE http://localhost:4000/api/clubs/CLUB_ID \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Accept-Language: es"
```

**Respuesta:**
```json
{
  "message": "Club eliminado exitosamente"
}
```

---

## Pagos (Payments)

### 1. Crear preferencia de pago para una reserva

**Nota:** Este endpoint genera una preferencia de pago en MercadoPago. El pago se puede crear una vez que la reserva está ACCEPTED.

```bash
curl -X POST http://localhost:4000/api/payments/BOOKING_ID \
  -H "Authorization: Bearer TU_TOKEN_GOLFER" \
  -H "Accept-Language: es"
```

**Respuesta:**
```json
{
  "message": "Preferencia de pago creada exitosamente",
  "data": {
    "payment": {
      "_id": "674c4930a9e6f1a2b3c4d5ea",
      "bookingId": "674c4930a9e6f1a2b3c4d5e8",
      "golferId": "674c4930a9e6f1a2b3c4d5e9",
      "caddieId": "674c4930a9e6f1a2b3c4d5e7",
      "amount": 5000,
      "commission": 500,
      "caddieAmount": 4500,
      "status": "pending",
      "mercadopagoId": "1234567890-abc-def",
      "createdAt": "2025-12-13T10:00:00.000Z"
    },
    "preferenceId": "1234567890-abc-def",
    "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abc-def"
  }
}
```

**Comisiones:**
- La plataforma cobra 10% de comisión por defecto (configurable)
- `amount`: Monto total sugerido por el caddie
- `commission`: Comisión de la plataforma
- `caddieAmount`: Monto que recibe el caddie después de comisión

### 2. Obtener información de pago por reserva

```bash
curl -X GET http://localhost:4000/api/payments/booking/BOOKING_ID \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 3. Webhook de MercadoPago

**Nota:** Este endpoint es llamado automáticamente por MercadoPago cuando hay actualizaciones en el pago. No requiere autenticación.

```bash
curl -X POST http://localhost:4000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "action": "payment.updated",
    "data": {
      "id": "1234567890",
      "status": "approved"
    },
    "external_reference": "674c4930a9e6f1a2b3c4d5ea"
  }'
```

### 4. Obtener pagos pendientes de liquidación (solo admin)

```bash
curl -X GET http://localhost:4000/api/payments/pending-liquidations \
  -H "Authorization: Bearer TU_TOKEN_ADMIN"
```

**Respuesta:**
```json
{
  "data": [
    {
      "_id": "674c4930a9e6f1a2b3c4d5ea",
      "bookingId": {...},
      "caddieId": {...},
      "amount": 5000,
      "commission": 500,
      "caddieAmount": 4500,
      "status": "completed",
      "paidAt": "2025-12-13T10:00:00.000Z",
      "liquidatedAt": null
    }
  ]
}
```

### 5. Marcar pago como liquidado (solo admin)

```bash
curl -X PUT http://localhost:4000/api/payments/PAYMENT_ID/liquidate \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Accept-Language: es"
```

**Nota:** Esto marca el pago como liquidado al caddie. Se debe hacer después de transferir el dinero al caddie.

---

## Roles Disponibles

- `golfer`: Golfista
- `caddie`: Caddie
- `admin`: Administrador

## Estados

### Estados de Caddie
- `pending`: Pendiente de aprobación
- `approved`: Aprobado
- `rejected`: Rechazado

### Estados de Reserva
- `pending`: Pendiente
- `accepted`: Aceptada
- `rejected`: Rechazada
- `completed`: Completada
- `cancelled`: Cancelada

## Notas

- Todos los endpoints devuelven respuestas en el idioma solicitado
- El token JWT expira en 7 días
- Las contraseñas se hashean con bcrypt
- MongoDB debe estar configurado para registro/login
