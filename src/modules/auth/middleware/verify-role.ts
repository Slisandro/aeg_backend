import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';

function verifyRole(requiredRole: string) {
    return function (req: Request, res: Response, next: NextFunction) {
        const token = req.headers['authorization'];

        if (!token) {
            return res.status(401).send('No se ha proporcionado un token');
        }

        jwt.verify(token, "AEG_SECRET_KEY", (err: any, decoded: any) => {
            if (err) {
                return res.status(401).json({ message: 'Token inválido' });
            }

            const userRole = decoded.role;

            if (userRole !== requiredRole) {
                return res.status(403).send('Acceso denegado');
            }

            next();
        });
    };
}

export default verifyRole;