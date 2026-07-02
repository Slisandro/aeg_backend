import dotenv from "dotenv";
import express, { Express } from "express";
import cors from 'cors';
import bodyParser from 'body-parser';
import database from './database'; // Importa la función

import authRouter from './modules/auth/routes';
import clientsRouter from './modules/clients/routes';
import constanciesRouter from './modules/constancies/routes';
import usersRouter from './modules/users/routes';
import coursesRouter from './modules/courses/routes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors({
    origin: ["https://aeg-frontend.vercel.app", "http://localhost:5173"],
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    credentials: true
}));

app.use("/auth", authRouter);
app.use("/clients", clientsRouter);
app.use("/constancies", constanciesRouter);
app.use("/users", usersRouter);
app.use("/courses", coursesRouter);

// Conectar a MongoDB ANTES de iniciar el servidor
const startServer = async () => {
    try {
        await database.connect(); // Si usas la Opción 2
        // O const db = await getDb(); // Si usas la Opción 1
        
        app.listen(port, () => {
            console.log(`[server]: Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();