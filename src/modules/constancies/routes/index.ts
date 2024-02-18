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

// download constancies file
router.get("/download/:invoice", async (req: Request, res: Response) => {
    const { invoice } = req.params;

    res.download(
        path.join(__dirname, "../files/folio-" + invoice + ".docx"),
        "folio-" + invoice + ".docx",
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

    // read the form data from the request body
    form.parse(req, (err: any, fields: any, files: any) => {
        // error read form data 
        if (err) {
            console.error("Error al cargar archivos:", err.message);
            return res.status(500).json({ error: "Error al leer archivo" });
        }
        // read excel file
        fs.readFile(files.archivoExcel[0].filepath, async (err, data) => {
            if (err) {
                console.error("Error al cargar archivos:", err.message);
                return res.status(500).json({ error: "Error al leer archivo" });
            }
            
            // get last number invoice
            const lastInvoice = await database.collection("invoice").findOne({ _id: new ObjectId("65cf8fa2fb856a03106e02ff") });
            let invoice = Number(lastInvoice?.number);

            const titleFile = fields.curso + "-" + fields.institucion + "-" + `${dia}-${mes}-${año}` ;

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
                    institucion: fields.institucion,
                    rfc: fields.rfc,
                    catalogo_ocupaciones: "11.2",
                    curso: fields.curso,
                    area_tematica: "2/7000",
                    inicio_curso: fields.inicio_curso,
                    fin_curso: fields.fin_curso,
                    duracion_hrs: fields.duracion_hrs,
                    representante: fields.representante,
                    fecha_emision: `${dia}-${mes}-${año}`,
                    nro_folio: invoice
                };

                // add user in users array
                users.push({
                    name: p.Nombre,
                    curp: p.Curp,
                    occupation: p["Posición"],
                    course: fields.curso,
                    invoice: invoice + 1,
                    init_date: fields.inicio_curso,
                    finish_date: fields.fin_curso,
                    duration: fields.duracion_hrs,
                    representative: fields.representante
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

            await database.collection("invoice").updateOne({ _id: new ObjectId("65cf8fa2fb856a03106e02ff") }, { $set: { number: invoice + 1 }})

            await merger.save("nodebuffer", async (data: any) => {
                return fs.writeFile(path.join(__dirname, "../files/" + titleFile + ".docx"), data, (err) => {
                    if (err) {
                        return res.status(500).json({ error: "Error al leer archivo" });
                    }
                });
            });

            await database.collection("constancies").insertMany(users);

            return res.status(201).json({
                message: "Archivo creado exitosamente",
                title: titleFile
            })
        })
    });
});

export default router;