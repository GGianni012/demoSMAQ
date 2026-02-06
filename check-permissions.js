require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function checkPermissions() {
    try {
        const keyPath = path.join(__dirname, 'key.json');
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        const issuerId = process.env.GOOGLE_ISSUER_ID;

        console.log('🔐 Verificando permisos de la Service Account...\n');
        console.log(`Service Account: ${keyData.client_email}`);
        console.log(`Issuer ID: ${issuerId}\n`);

        const auth = new google.auth.GoogleAuth({
            credentials: keyData,
            scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        });

        const client = await auth.getClient();
        const walletobjects = google.walletobjects({
            version: 'v1',
            auth: client
        });

        console.log('📝 Intentando listar permisos del Issuer...\n');

        try {
            // Intentar obtener información del issuer
            const issuerInfo = await walletobjects.permissions.list({
                resourceId: issuerId
            });

            console.log('✅ Permisos obtenidos:');
            console.log(JSON.stringify(issuerInfo.data, null, 2));
        } catch (permissionError) {
            console.error('❌ Error obteniendo permisos:', permissionError.message);

            if (permissionError.response?.status === 403) {
                console.log('\n⚠️  ERROR 403: ACCESO DENEGADO');
                console.log('\n📖 Esto confirma que la Service Account NO tiene permisos.');
                console.log('\n✅ SOLUCIÓN:');
                console.log('1. Ve a https://pay.google.com/business/console');
                console.log('2. Asegúrate de estar logueado con: amorina.cinebar@gmail.com');
                console.log('3. Ve a Settings → Users');
                console.log(`4. Agrega: ${keyData.client_email}`);
                console.log('5. Rol: Developer\n');
            }
        }

        // Intentar crear un objeto de prueba para verificar permisos
        console.log('\n🧪 Intentando crear un objeto de prueba...\n');

        try {
            const testObjectId = `${issuerId}.TEST_${Date.now()}`;
            const testObject = {
                id: testObjectId,
                classId: `${issuerId}.Smaqs_Member`,
                state: 'ACTIVE',
                heroImage: {
                    sourceUri: {
                        uri: 'https://storage.googleapis.com/wallet-ux-samples/hero-image.png'
                    }
                }
            };

            await walletobjects.genericobject.insert({
                requestBody: testObject
            });

            console.log('✅ Objeto de prueba creado exitosamente!');
            console.log('✅ Los permisos están correctos.\n');

            // Eliminar el objeto de prueba
            await walletobjects.genericobject.patch({
                resourceId: testObjectId,
                requestBody: { state: 'INACTIVE' }
            });
            console.log('🗑️  Objeto de prueba eliminado.\n');

        } catch (createError) {
            console.error('❌ Error creando objeto:', createError.message);

            if (createError.response) {
                console.error('Código:', createError.response.status);
                console.error('Detalles:', JSON.stringify(createError.response.data, null, 2));
            }

            if (createError.response?.status === 403) {
                console.log('\n⚠️  CONFIRMADO: La Service Account NO tiene permisos de escritura.');
            }
        }

    } catch (error) {
        console.error('💥 Error fatal:', error.message);
    }
}

checkPermissions();
