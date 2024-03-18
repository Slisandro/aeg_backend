import Express, { Request, Response } from 'express';
import formidable from 'formidable';
import fs from 'fs';
// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import DocxTemplater from 'docxtemplater';
// @ts-ignore
import DocxMerger from 'docx-merger';
// @ts-ignore
import XLSX from 'xlsx';
import path from 'path';
import database from '../../../database';
import { ObjectId } from 'mongodb';

const router = Express.Router();

const createFilesFolder = () => {
    try {
        fs.mkdir(path.join(__dirname, "../files"), (err) => {
            if (err) {
                console.error("Error creando directorio:", err);
                return;
            }
    
            console.debug("Directorio creado exitosamente");
        });
    } catch(e) {
        console.debug("Carpeta creada")
    }
};

createFilesFolder();

// get all files
router.get("/all", async (req: Request, res: Response) => {
    try {
        fs.readdir(path.join(__dirname, "../files"), (err, files) => {
            if (err) {
                console.debug("Error al leer archivos: ", err);
            }

            if (!files.length) {
                return res.status(404).json({ message: "No hay archivos aún" })
            }

            const allFiles: { id: string, name: string, institution: string, date: string }[] = [];

            files.forEach(f => {
                const sanitizeName = f.slice(0, f.length - 5);
                const [name, institution, date] = sanitizeName.split("-");

                const partsDate = date.split("_");
                const formatDate = partsDate.join("/");

                allFiles.push({
                    id: f,
                    name,
                    institution,
                    date: formatDate
                })
            });

            return res.status(200).json({ files: allFiles })
        })
    } catch (e) {
        console.debug(e);
        return res.status(404).json({ message: "No hay archivos aún" })
    }
})

// download constancies file
router.get("/download/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    res.download(
        path.join(__dirname, "../files/" + id),
        id,
        (err: any) => console.log({ err })
    );
})

// format date 
const fecha = new Date();
const dia = fecha.getDate().toString().padStart(2, "0");
const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
const año = fecha.getFullYear();

// create constancies  
router.post("/create", async (req: Request, res: Response) => {
    const form = formidable({});

    try {
        // read the form data from the request body
        form.parse(req, (err: any, fields: any, files: any) => {
            // error read form data 
            if (err) {
                console.debug("Error al parsear archivo:", err);
            }
            // read excel file
            fs.readFile(files.archivoExcel[0].filepath, async (err, data) => {
                if (err) {
                    console.debug("Error al leer archivo:", err);
                }

                // get last number invoice
                const lastInvoice = await database.collection("invoice").findOne({ _id: new ObjectId("65cf8fa2fb856a03106e02ff") });
                let invoice = Number(lastInvoice?.number);

                const titleFile = fields.curso + "-" + fields.institucion + "-" + `${dia}_${mes}_${año}`;

                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets["Participantes"];
                const participantsData = XLSX.utils.sheet_to_json(sheet);
                // read template .docx
                const template = fs.readFileSync(path.join(__dirname, "../template/constancia.docx"));

                const buffers: string[] = [];
                const users: any[] = [];

                // for each user
                participantsData.forEach(async (p: any) => {
                    const zip = new PizZip(template);
                    const doc = new DocxTemplater(zip);
                    const user = {
                        nombre: p.Nombre,
                        curp: p.Curp,
                        posicion: p["Posición"],
                        institucion: fields.institucion[0],
                        rfc: fields.rfc[0],
                        catalogo_ocupaciones: fields.catalogo_ocupaciones[0],
                        curso: fields.curso[0],
                        area_tematica: fields.area_tematica[0],
                        inicio_curso: fields.inicio_curso[0],
                        fin_curso: fields.fin_curso[0],
                        duracion_hrs: fields.duracion_hrs[0],
                        representante: fields.representante[0],
                        fecha_emision: `${dia}-${mes}-${año}`,
                        nro_folio: invoice
                    };

                    // add user in users array
                    users.push({
                        name: p.Nombre,
                        curp: p.Curp,
                        occupation: p["Posición"],
                        course: fields.curso[0],
                        invoice: invoice,
                        init_date: fields.inicio_curso[0],
                        finish_date: fields.fin_curso[0],
                        duration: fields.duracion_hrs[0],
                        representative: fields.representante[0],
                        institution: fields.institucion[0]
                    });

                    // replace in template
                    doc.render(user);

                    // increment invoice
                    invoice = invoice + 1;

                    const docBuf = doc.getZip().generate({
                        type: "nodebuffer",
                        compression: "DEFLATE",
                    })

                    // add template for buffers array
                    buffers.push(docBuf.toString("binary"));
                })

                const merger: any | null = new DocxMerger({ style: "" }, buffers);

                await database.collection("invoice").updateOne({ _id: new ObjectId("65cf8fa2fb856a03106e02ff") }, { $set: { number: invoice } })

                await merger.save("nodebuffer", async (data: any) => fs.writeFile(path.join(__dirname, "../files/" + titleFile + ".docx"), data, (err) => {
                    if (err) {
                        console.debug("Error al crear archivo", err)
                    }
                }));

                await database.collection("constancies").insertMany(users);

                return res.status(201).json({
                    message: "Archivo creado exitosamente",
                    title: titleFile
                })
            })
        });
    } catch (e) {
        res.status(500).json(e);
    }
});

router.post("/search", async (req: Request, res: Response) => {
    const { type, value } = req.body;
    const query = type === "FOLIO" ? { invoice: { $eq: Number(value) } } : { curp: { $eq: value } };
    const data = await database.collection("constancies").find(query).toArray();

    if (data) {
        return res.status(200).json(data)
    } else {
        return res.status(404).json({ data: [], message: "No hay datos" })
    }
})

export default router;