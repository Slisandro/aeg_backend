import dotenv from "dotenv";
// @ts-ignore
import express, { Express } from "express";
import cors from 'cors';
// @ts-ignore
import bodyParser from 'body-parser';

import authRouter from './modules/auth/routes';
import clientsRouter from './modules/clients/routes';
import constanciesRouter from './modules/constancies/routes';
import usersRouter from './modules/users/routes';
import coursesRouter from './modules/courses/routes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
<<<<<<< HEAD
app.use(cors({
    origin: ["https://aeg-frontend.vercel.app", "http://localhost:5173"],
=======
app.use(cors({    
    origin: "https://aeg-frontend.vercel.app",
>>>>>>> 7600add8505363b1db6c644b94b80834a87b520b
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    credentials: true
}));

app.use("/auth", authRouter);
app.use("/clients", clientsRouter);
app.use("/constancies", constanciesRouter);
app.use("/users", usersRouter);
app.use("/courses", coursesRouter);

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
