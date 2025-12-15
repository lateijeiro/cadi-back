# CadiApp Backend

Backend del MVP de CadiApp - Plataforma para conectar golfistas con caddies validados.

## Stack Tecnológico

- Node.js + Express
- TypeScript
- MongoDB Atlas (próximamente)
- MercadoPago (próximamente)
- Firebase Messaging (próximamente)

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus valores
```

## Desarrollo

```bash
# Modo desarrollo con hot-reload
npm run dev
```

El servidor estará disponible en `http://localhost:4000`

## Endpoints Disponibles

### Health Check
```
GET /api/health
```

Respuesta:
```json
{
  "status": "ok"
}
```

## Estructura del Proyecto

```
app-backend/
├── src/
│   ├── config/         # Configuración
│   ├── controllers/    # Controladores
│   ├── routes/         # Rutas
│   ├── middlewares/    # Middlewares
│   ├── app.ts          # Configuración Express
│   └── server.ts       # Punto de entrada
├── package.json
└── tsconfig.json
```

## Scripts Disponibles

- `npm run dev` - Iniciar en modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar en producción
- `npm run lint` - Ejecutar linter
- `npm run lint:fix` - Ejecutar linter con auto-fix

## Próximos Pasos

- [ ] Conectar MongoDB Atlas
- [ ] Implementar autenticación JWT
- [ ] Crear modelos de datos
- [ ] Implementar endpoints de usuarios y caddies
- [ ] Integrar MercadoPago
- [ ] Implementar generación de QR
- [ ] Configurar notificaciones push
