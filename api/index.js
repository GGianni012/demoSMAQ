const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
// Versión 1.2 - Forzando redespacho técnico
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
        const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const issuerId = process.env.GOOGLE_ISSUER_ID ? process.env.GOOGLE_ISSUER_ID.trim() : null;

        // Validaciones súper básicas
        if (!envKey) {
            return res.status(400).json({ success: false, message: 'Configuración incompleta: falta credencial.' });
        }
        if (!issuerId || issuerId.includes('REEMPLAZAR')) {
            return res.status(400).json({ success: false, message: 'Configuración incompleta: falta Issuer ID.' });
        }

        let keyData;
        try {
            keyData = JSON.parse(envKey);
        } catch (err) {
            return res.status(400).json({ success: false, message: 'Error en formato de credencial.' });
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
                        // ID: emisor.identificador_unico
                        id: `${issuerId}.AQ57_${Date.now()}`,
                        // Google internamente le pone el prefijo del Issuer ID aunque en la consola solo veas el nombre corto
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
