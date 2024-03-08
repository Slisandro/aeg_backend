import dotenv from "dotenv";
// @ts-ignore
import express, { Express } from "express";
import cors from 'cors';
// @ts-ignore
import bodyParser from 'body-parser';

import authRouter from './modules/auth/routes';
// import constanciesHakTekRouter from './modules/haktek/routes';
import constanciesRouter from './modules/constancies/routes';
import usersRouter from './modules/users/routes';
import coursesRouter from './modules/courses/routes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors({
    origin: "https://aeg-frontend.vercel.app",
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    credentials: true
}));

app.use("/auth", authRouter);
// app.use("/constancies-haktek", constanciesHakTekRouter);
app.use("/constancies", constanciesRouter);
app.use("/users", usersRouter);
app.use("/courses", coursesRouter);

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});