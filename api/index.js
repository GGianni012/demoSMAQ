require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Mock Database
const mockUser = {
    id: 'socio_123',
    name: 'Sonia Santoro',
    balance: 1250,
    tier: 'Protector'
};

// Health check and root redirect
app.get('/api', (req, res) => {
    res.json({ status: 'API is running', version: '1.1' });
});

// Endpoint to generate Google Wallet Pass
app.post('/api/wallet/create-pass', async (req, res) => {
    console.log('Iniciando generación de pase...');

    try {
        const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const issuerId = process.env.GOOGLE_ISSUER_ID;

        if (!envKey) {
            return res.status(400).json({ success: false, message: 'Falta GOOGLE_SERVICE_ACCOUNT_JSON' });
        }
        if (!issuerId || issuerId.includes('REEMPLAZAR')) {
            return res.status(400).json({ success: false, message: 'Falta GOOGLE_ISSUER_ID' });
        }

        let keyData;
        try {
            keyData = JSON.parse(envKey);
        } catch (err) {
            return res.status(400).json({ success: false, message: 'JSON de credenciales inválido' });
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
                            sourceUri: { uri: `https://demo-smaq.vercel.app/logo.jpg` },
                            contentDescription: { defaultValue: { language: 'es', value: 'Aquilea 57 Logo' } }
                        },
                        hexBackgroundColor: '#0a0a0a',
                        textModulesData: [
                            { header: 'NIVEL', body: mockUser.tier, id: 'tier' },
                            { header: 'SALDO', body: `${mockUser.balance} Ɖ`, id: 'balance' }
                        ],
                        barcode: {
                            type: 'QR_CODE',
                            value: `AQ57_${mockUser.id}_${uuidv4()}`
                        }
                    }
                ]
            }
        };

        const token = jwt.sign(payload, keyData.private_key, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        res.json({ success: true, saveUrl });
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;
