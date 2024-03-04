import Express, { Request, Response } from 'express';
import database from '../../../database';
import { compareSync } from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Express.Router();

router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = await database.collection("users").findOne({ username });

    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" })
    }

    const comparePassword = compareSync(password, user?.password);

    if (comparePassword) {
        const payload = {
            ...user,
            exp: Math.floor((Date.now() + (4 * 60 * 60 * 1000)) / 1000)
        };

        const secretKey = "AEG_SECRET_KEY";

        const token = jwt.sign(payload, secretKey);

        return res.status(200).json({ message: "Ingreso exitoso", token: token, role: user.role });
    } else {
        return res.status(401).json({ message: "Contraseña incorrecta" })
    }
})

export default router;