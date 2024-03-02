import { MongoClient, ServerApiVersion } from 'mongodb';

const client = new MongoClient(
    "mongodb+srv://AEG_ADMIN:actualidadenguarderia@cluster0.2nbw9ij.mongodb.net/?retryWrites=true&w=majority",
    {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

const instanceDb = () => client.db(process.env.ENVIROMENT === "testing" ? "aeg_test" : "aeg_production")

export default instanceDb();