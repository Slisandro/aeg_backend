import Express, { Request, Response } from 'express';
import database from '../../../database';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import verifyRole from '../../auth/middleware/verify-role';

const router = Express.Router();

router.post("/create", async (req: Request, res: Response) => {
    const { username, password, role } = req.body;
    const userCreated = await database.collection("users").insertOne({
        username,
        password: await bcrypt.hash(password, 10),
        role
    })

    return res.status(201).json(userCreated)
})

router.get("/all", verifyRole("Admin"), async (req: Request, res: Response) => {
    const users = await database.collection("users").find().toArray();

    return res.status(200).json(users)
})


router.put("/:id", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, password } = req.body;

    const user = await database.collection("users").findOne({
        _id: new ObjectId(id)
    });

    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" })
    }

    await database.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: { username, password } });

    return res.status(200).json(
        await database.collection("users").findOne({
            _id: new ObjectId(id)
        })
    )
})

router.delete("/:id", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await database.collection("users").findOne({
        _id: new ObjectId(id)
    });

    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" })
    }

    await database.collection("users").deleteOne({
        _id: new ObjectId(id)
    });

    return res.status(200).json({
        message: "Usuario eliminado con éxito"
    })
})

export default router;