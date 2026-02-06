require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function createPassWithRestAPI() {
    try {
        const keyPath = path.join(__dirname, 'key.json');
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        const issuerId = process.env.GOOGLE_ISSUER_ID;

        console.log('🔧 Creando pase via REST API...\n');
        console.log(`Issuer ID: ${issuerId}`);
        console.log(`Service Account: ${keyData.client_email}\n`);

        // Autenticar
        const auth = new google.auth.GoogleAuth({
            credentials: keyData,
            scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        });

        const client = await auth.getClient();
        const walletobjects = google.walletobjects({
            version: 'v1',
            auth: client
        });

        // Datos del usuario mock
        const mockUser = {
            id: 'socio_123',
            name: 'Sonia Santoro',
            balance: 1250,
            tier: 'Protector'
        };

        // Crear el objeto
        const objectId = `${issuerId}.AQ57_${Date.now()}`;
        const passObject = {
            id: objectId,
            classId: `${issuerId}.Smaqs_Member`,
            state: 'ACTIVE',
            heroImage: {
                sourceUri: {
                    uri: 'https://farm4.staticflickr.com/3723/11177041115_6e6a3b6f49_o.jpg'
                },
                contentDescription: {
                    defaultValue: { language: 'es', value: 'Aquilea 57' }
                }
            },
            cardTitle: {
                defaultValue: { language: 'es', value: 'AQUILEA 57' }
            },
            header: {
                defaultValue: { language: 'es', value: mockUser.name }
            },
            subheader: {
                defaultValue: { language: 'es', value: mockUser.tier }
            },
            logo: {
                sourceUri: {
                    uri: 'https://farm4.staticflickr.com/3723/11177041115_6e6a3b6f49_o.jpg'
                },
                contentDescription: {
                    defaultValue: { language: 'es', value: 'Logo' }
                }
            },
            hexBackgroundColor: '#1a1a2e',
            textModulesData: [
                { header: 'SALDO', body: `${mockUser.balance} SMAQS`, id: 'balance' },
                { header: 'NIVEL', body: mockUser.tier, id: 'tier' }
            ],
            barcode: {
                type: 'QR_CODE',
                value: `AQ57_${mockUser.id}_${crypto.randomUUID()}`
            }
        };

        console.log('📝 Objeto a crear:');
        console.log(JSON.stringify(passObject, null, 2));
        console.log('\n');

        // Intentar crear el objeto
        console.log('⏳ Creando objeto en Google Wallet...\n');

        try {
            const result = await walletobjects.genericobject.insert({
                requestBody: passObject
            });

            console.log('✅ ¡Objeto creado exitosamente!');
            console.log('ID:', result.data.id);
            console.log('\n');

            // Generar URL para agregar a wallet
            const saveUrl = `https://pay.google.com/gp/v/save/${objectId}`;
            console.log('🔗 URL para agregar a Google Wallet:');
            console.log(saveUrl);
            console.log('\n');

            // También mostrar el link directo con el object ID
            console.log('📱 El usuario puede agregar el pase desde:');
            console.log(`https://wallet.google.com/passes/${objectId}`);

            return { success: true, objectId, result: result.data };

        } catch (insertError) {
            console.error('❌ Error creando objeto:');
            console.error('Código:', insertError.response?.status);
            console.error('Mensaje:', insertError.message);

            if (insertError.response?.data) {
                console.error('\nDetalles del error:');
                console.error(JSON.stringify(insertError.response.data, null, 2));
            }

            return { success: false, error: insertError.message };
        }

    } catch (error) {
        console.error('💥 Error fatal:', error.message);
        return { success: false, error: error.message };
    }
}

createPassWithRestAPI();
