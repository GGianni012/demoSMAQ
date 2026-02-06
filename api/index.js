const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
// Versión 1.3 - Configuración correcta con Issuer ID numérico
app.use(express.json());

// Mock Database
const mockUser = {
    id: 'socio_123',
    name: 'Sonia Santoro',
    balance: 1250,
    tier: 'Protector'
};

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Endpoint to generate Google Wallet Pass
app.post('/api/wallet/create-pass', async (req, res) => {
    console.log('API: Iniciando generación de pase...');

    try {
        const issuerId = process.env.GOOGLE_ISSUER_ID ? process.env.GOOGLE_ISSUER_ID.trim() : null;

        // Validar Issuer ID
        if (!issuerId || issuerId.includes('REEMPLAZAR')) {
            return res.status(400).json({
                success: false,
                message: 'Configuración incompleta: falta Issuer ID válido en .env'
            });
        }

        // Cargar credenciales (desde env var en producción, o key.json en desarrollo)
        let keyData;
        try {
            const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

            if (envKey) {
                // Producción (Vercel): leer desde variable de entorno
                console.log('Usando credenciales desde env var');
                keyData = JSON.parse(envKey);
            } else {
                // Desarrollo local: leer desde archivo key.json
                console.log('Usando credenciales desde key.json');
                const keyPath = path.join(__dirname, '..', 'key.json');
                const keyFile = fs.readFileSync(keyPath, 'utf8');
                keyData = JSON.parse(keyFile);
            }
        } catch (err) {
            console.error('Error cargando credenciales:', err.message);
            return res.status(400).json({
                success: false,
                message: 'Error cargando credenciales. Verifica configuración.',
                detail: err.message
            });
        }

        const payload = {
            iss: keyData.client_email,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            origins: ['https://demo-smaq.vercel.app', 'http://localhost:3001'],
            payload: {
                genericObjects: [
                    {
                        // ID objeto: emisor.identificador_unico (Google agrega el prefijo automáticamente)
                        id: `${issuerId}.AQ57_${Date.now()}`,
                        // classId: SOLO el nombre de la clase, sin prefijo de Issuer ID
                        // Google Wallet API agrega el prefijo automáticamente en modo JWT
                        classId: `${issuerId}.Smaqs_Member`,
                        genericType: 'GENERIC_TYPE_UNSPECIFIED',
                        cardTitle: { defaultValue: { language: 'es', value: 'AQUILEA 57' } },
                        header: { defaultValue: { language: 'es', value: 'SMAQS' } },
                        subheader: { defaultValue: { language: 'es', value: 'Saldo' } },
                        logo: {
                            sourceUri: { uri: 'https://storage.googleapis.com/wallet-ux-samples/logos/wallet-logo.png' },
                            contentDescription: { defaultValue: { language: 'es', value: 'Logo' } }
                        },
                        hexBackgroundColor: '#0a0a0a',
                        textModulesData: [
                            { header: 'NIVEL', body: mockUser.tier, id: 'tier' },
                            { header: 'SALDO', body: `${mockUser.balance} Ɖ`, id: 'balance' }
                        ],
                        barcode: {
                            type: 'QR_CODE',
                            value: `AQ57_${mockUser.id}_${crypto.randomUUID()}`
                        }
                    }
                ]
            }
        };

        const token = jwt.sign(payload, keyData.private_key, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return res.json({ success: true, saveUrl, debugToken: token, debugPayload: payload });
    } catch (error) {
        console.error('CRITICAL API ERROR:', error.message);
        return res.status(500).json({ success: false, error: 'Internal Server Error', detail: error.message });
    }
});

module.exports = app;
