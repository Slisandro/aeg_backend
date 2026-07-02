import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

// Usar la cadena de conexión directa
const DIRECT_URI = process.env.DIRECT_URI

const client = new MongoClient(
    DIRECT_URI,
    {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    }
);

// Conectar y obtener la base de datos
export const getDb = async () => {
    try {
        await client.connect();
        const dbName = process.env.ENVIRONMENT === "testing" ? "aeg_testing" : "aeg_production";
        console.log(`✅ Conectado a MongoDB: ${dbName}`);
        return client.db(dbName);
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        throw error;
    }
};

export const getDbSync = () => {
    const dbName = process.env.ENVIRONMENT === "testing" ? "aeg_testing" : "aeg_production";
    return client.db(dbName);
};

export default client;
