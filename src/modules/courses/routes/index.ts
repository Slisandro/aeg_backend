import Express, { Request, Response } from 'express';
import database from '../../../database';
import { ObjectId } from 'mongodb';
import verifyRole from '../../auth/middleware/verify-role';

const router = Express.Router();

router.post("/create", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { name, duration } = req.body;
    const courseCreated = await database.collection("courses").insertOne({
        name,
        duration
    })

    return res.status(201).json(courseCreated)
})

router.get("/all", verifyRole("Admin"), async (req: Request, res: Response) => {
    const courses = await database.collection("courses").find().toArray();

    return res.status(200).json(courses)
})


router.put("/:id", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, duration } = req.body;

    const course = await database.collection("courses").findOne({
        _id: new ObjectId(id)
    });

    if (!course) {
        return res.status(404).json({ message: "Curso no encontrado" })
    }

    await database.collection("courses").updateOne({ _id: new ObjectId(id) }, { $set: { name, duration } });

    return res.status(200).json(
        await database.collection("courses").findOne({
            _id: new ObjectId(id)
        })
    )
})

router.delete("/:id", verifyRole("Admin"), async (req: Request, res: Response) => {
    const { id } = req.params;

    const course = await database.collection("courses").findOne({
        _id: new ObjectId(id)
    });

    if (!course) {
        return res.status(404).json({ message: "Curso no encontrado" })
    }

    await database.collection("courses").deleteOne({
        _id: new ObjectId(id)
    });

    return res.status(200).json({
        message: "Curso eliminado con éxito"
    })
})

export default router;