require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function verifyWalletClass() {
    try {
        // Cargar credenciales
        const keyPath = path.join(__dirname, 'key.json');
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        const issuerId = process.env.GOOGLE_ISSUER_ID;

        console.log('🔍 Verificando configuración de Google Wallet...\n');
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

        // Intentar listar todas las clases genéricas
        console.log('📋 Listando clases genéricas...\n');
        try {
            const classList = await walletobjects.genericclass.list({
                issuerId: issuerId
            });

            if (classList.data.resources && classList.data.resources.length > 0) {
                console.log('✅ Clases encontradas:');
                classList.data.resources.forEach((cls, idx) => {
                    console.log(`\n${idx + 1}. ID: ${cls.id}`);
                    console.log(`   Tipo: ${cls.classTemplateInfo?.cardTemplateOverride?.cardRowTemplateInfos?.[0]?.twoItems?.startItem?.firstValue?.fields?.[0]?.fieldPath || 'N/A'}`);
                    console.log(`   Estado: ${cls.reviewStatus || 'N/A'}`);
                });
            } else {
                console.log('⚠️  No se encontraron clases genéricas.');
            }
        } catch (listError) {
            console.error('❌ Error listando clases:', listError.message);
            if (listError.response) {
                console.error('Detalles:', JSON.stringify(listError.response.data, null, 2));
            }
        }

        // Intentar obtener la clase específica
        const classId = `${issuerId}.Smaqs_Member`;
        console.log(`\n\n🔍 Verificando clase específica: ${classId}\n`);

        try {
            const classData = await walletobjects.genericclass.get({
                resourceId: classId
            });

            console.log('✅ Clase encontrada!');
            console.log('Detalles:', JSON.stringify(classData.data, null, 2));
        } catch (getError) {
            console.error('❌ Error obteniendo clase específica:', getError.message);
            if (getError.response) {
                console.error('Código de error:', getError.response.status);
                console.error('Detalles:', JSON.stringify(getError.response.data, null, 2));
            }

            // Si la clase no existe, mostrar cómo crearla
            if (getError.response?.status === 404) {
                console.log('\n\n💡 La clase no existe. Ejecuta el siguiente comando para crearla:');
                console.log('node create-class.js');
            }
        }

    } catch (error) {
        console.error('💥 Error fatal:', error.message);
        console.error(error.stack);
    }
}

verifyWalletClass();
