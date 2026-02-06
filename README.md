# Smaqs Wallet Demo - Aquilea 57

Esta demo muestra cómo integrar un sistema de tokens internos (Smaqs) con Google Wallet utilizando **Generic Passes**.

## Estructura del Proyecto
- `server.js`: Servidor Node.js que genera los links firmados (JWT) para Google Wallet.
- `public/`: Contiene el frontend de la demo con el balance y el botón de integración.
- `logo.jpg`: La imagen proporcionada por el usuario como identidad visual.

## Requisitos para Producción
1. **Google Pay Console:** Registrarse como desarrollador y crear una cuenta de emisor (Issuer Account).
2. **Generic Pass Class:** Crear una clase para los miembros de Aquilea 57.
3. **Credenciales:** Generar una Service Account en Google Cloud con permisos de "Google Wallet API".

## Configuración Local
1. `npm install`
2. Copia `.env.example` a `.env` y completa con tus credenciales si deseas una integración real.
3. `node server.js`
4. Abre `http://localhost:3001`

## Funcionamiento en Modo Demo
Si no se configuran las credenciales en el `.env`, al hacer clic en "Add to Google Wallet" el sistema mostrará un mensaje informativo simulando el flujo de creación del pase.
