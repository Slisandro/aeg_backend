import Express, { Request, Response } from 'express';
import database from '../../../database';
import { ObjectId } from 'mongodb';
import verifyRole from '../../auth/middleware/verify-role';

const router = Express.Router();

router.post("/create", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { name, rfc, representante } = req.body;
    const courseCreated = await database.collection("clients").insertOne({ name, rfc, representante })

    return res.status(201).json(courseCreated)
})

router.get("/all", async (req: Request, res: Response) => {
    const clients = await database.collection("clients").find().toArray();

    return res.status(200).json(clients)
})


router.put("/:id", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, rfc, representante } = req.body;

    const course = await database.collection("clients").findOne({
        _id: new ObjectId(id)
    });

    if (!course) {
        return res.status(404).json({ message: "Curso no encontrado" })
    }

    await database.collection("clients").updateOne({ _id: new ObjectId(id) }, { $set: { name, rfc, representante } });

    return res.status(200).json(
        await database.collection("clients").findOne({
            _id: new ObjectId(id)
        })
    )
})

router.delete("/:id", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { id } = req.params;

    const course = await database.collection("clients").findOne({
        _id: new ObjectId(id)
    });

    if (!course) {
        return res.status(404).json({ message: "Curso no encontrado" })
    }

    await database.collection("clients").deleteOne({
        _id: new ObjectId(id)
    });

    return res.status(200).json({
        message: "Cliente eliminado con éxito"
    })
})

export default router;