const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
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
        const issuerId = process.env.GOOGLE_ISSUER_ID;

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
            payload: {
                genericObjects: [
                    {
                        id: `${issuerId}.${mockUser.id}`,
                        classId: `${issuerId}.Smaqs_Member`,
                        genericType: 'GENERIC_TYPE_UNSPECIFIED',
                        cardTitle: { defaultValue: { language: 'es', value: 'AQUILEA 57' } },
                        header: { defaultValue: { language: 'es', value: 'SMAQS' } },
                        subheader: { defaultValue: { language: 'es', value: 'Saldo' } },
                        logo: {
                            sourceUri: { uri: `https://${req.get('host')}/logo.jpg` },
                            contentDescription: { defaultValue: { language: 'es', value: 'Aquilea 57 Logo' } }
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

        return res.json({ success: true, saveUrl });
    } catch (error) {
        console.error('CRITICAL API ERROR:', error.message);
        return res.status(500).json({ success: false, error: 'Internal Server Error', detail: error.message });
    }
});

module.exports = app;
