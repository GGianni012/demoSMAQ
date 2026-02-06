require('dotenv').config();
const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mock Database
const mockUser = {
    id: 'socio_123',
    name: 'Sonia Santoro',
    balance: 1250,
    tier: 'Protector'
};

// Endpoint to generate Google Wallet Pass
app.post('/api/wallet/create-pass', async (req, res) => {
    console.log('Iniciando generación de pase...');

    try {
        let keyData;
        const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const issuerId = process.env.GOOGLE_ISSUER_ID;

        // Validación de variables de entorno con mensajes claros
        if (!envKey) {
            return res.status(400).json({
                success: false,
                message: 'Falta la variable GOOGLE_SERVICE_ACCOUNT_JSON en Vercel.'
            });
        }
        if (!issuerId || issuerId === 'REEMPLAZAR_CON_TU_ISSUER_ID') {
            return res.status(400).json({
                success: false,
                message: 'Falta la variable GOOGLE_ISSUER_ID en Vercel.'
            });
        }

        try {
            keyData = JSON.parse(envKey);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'El JSON de GOOGLE_SERVICE_ACCOUNT_JSON tiene un error de formato.',
                error: err.message
            });
        }

        if (!issuerId || issuerId === 'REEMPLAZAR_CON_TU_ISSUER_ID') {
            return res.json({
                success: false,
                message: 'Falta el Issuer ID. Por favor pegalo en el chat.'
            });
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
                            {
                                header: 'NIVEL',
                                body: mockUser.tier,
                                id: 'tier'
                            },
                            {
                                header: 'SALDO',
                                body: `${mockUser.balance} Ɖ`,
                                id: 'balance'
                            }
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

        console.log('JWT generado exitosamente.');
        res.json({ success: true, saveUrl });
    } catch (error) {
        console.error('Error generando JWT real:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Para desarrollo local
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Demo Smaqs Wallet corriendo en http://localhost:${PORT}`);
    });
}

// Para Vercel
module.exports = app;
