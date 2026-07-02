import Express, { Request, Response } from 'express';
import formidable from 'formidable';
import fs from 'fs';
import { mkdir } from 'fs/promises';
// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import DocxTemplater from 'docxtemplater';
// @ts-ignore
import DocxMerger from 'docx-merger';
// @ts-ignore
import XLSX from 'xlsx';
import path from 'path';
import database, { getDb } from '../../../database';
import { ObjectId } from 'mongodb';

const router = Express.Router();

const createFilesFolder = async () => {
    try {
        await mkdir(path.join(__dirname, "../files"));
    } catch (e) {
        console.debug("La carpeta ya existe")
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

// create constancies  
router.post("/create", async (req: Request, res: Response) => {
    const form = formidable({});
    const database = await getDb();

    try {
        form.parse(req, async (err: any, fields: any, files: any) => {
            if (err) {
                console.debug("Error al parsear archivo:", err);
                return res.status(400).json({ error: "Error al procesar el archivo" });
            }

            try {
                if (!files || !files.archivoExcel) {
                    return res.status(400).json({ error: "No se encontró el archivo Excel" });
                }

                const data = await fs.promises.readFile(files.archivoExcel[0].filepath);

                const lastInvoice = await database.collection("invoice").findOne({ 
                    _id: new ObjectId("65cf8fa2fb856a03106e02ff") 
                });
                let invoice = Number(lastInvoice?.number) || 1;

                const fecha = new Date();
                const dia = fecha.getDate().toString().padStart(2, '0');
                const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
                const año = fecha.getFullYear();

                const titleFile = fields.curso[0] + "-" + fields.institucion[0] + "-" + `${dia}_${mes}_${año}`;

                console.log("📄 Título del archivo:", titleFile);

                const workbook = XLSX.read(data);
                console.log("📋 Hojas disponibles:", workbook.SheetNames);
                
                if (!workbook.Sheets["Participantes"]) {
                    return res.status(400).json({ 
                        error: "La hoja 'Participantes' no existe en el Excel",
                        sheets: workbook.SheetNames 
                    });
                }

                const sheet = workbook.Sheets["Participantes"];
                const participantsData = XLSX.utils.sheet_to_json(sheet) as { Nombre: string; Curp: string; "Posición": string }[];
                
                console.log(`👥 Participantes encontrados: ${participantsData.length}`);

                if (participantsData.length === 0) {
                    return res.status(400).json({ 
                        error: "No se encontraron participantes en la hoja 'Participantes'"
                    });
                }

                const template = fs.readFileSync(path.join(__dirname, "../template/constancia.docx"));

                // Almacenar cada documento como binario para docx-merger
                const mergedDocs: string[] = [];
                const users: any[] = [];

                const fechaInicio = new Date(fields.inicio_curso[0]);
                const fechaFin = new Date(fields.fin_curso[0]);

                const ano_inicio = fechaInicio.getFullYear();
                const mes_inicio = fechaInicio.getMonth() + 1;
                const dia_inicio = fechaInicio.getDate().toString().padStart(2, '0');

                const ano_fin = fechaFin.getFullYear();
                const mes_fin = fechaFin.getMonth() + 1;
                const dia_fin = fechaFin.getDate().toString().padStart(2, '0');

                for (const p of participantsData) {
                    console.log(`📝 Procesando: ${p.Nombre}`);
                    
                    if (!p.Nombre || !p.Curp) {
                        console.warn(`⚠️ Participante sin Nombre o Curp:`, p);
                        continue;
                    }

                    const zip = new PizZip(template);
                    const doc = new DocxTemplater(zip);
                    
                    const user = {
                        nombre: p.Nombre,
                        curp: p.Curp,
                        posicion: p["Posición"] || "",
                        institucion: fields.institucion[0],
                        rfc: fields.rfc[0],
                        catalogo_ocupaciones: fields.catalogo_ocupaciones[0],
                        curso: fields.curso[0],
                        area_tematica: fields.area_tematica[0],
                        ano_inicio,
                        mes_inicio,
                        dia_inicio,
                        ano_fin,
                        mes_fin,
                        dia_fin,
                        duracion_hrs: fields.duracion_hrs[0],
                        representante: fields.representante[0],
                        invoice
                    };

                    users.push({
                        name: p.Nombre,
                        curp: p.Curp,
                        occupation: p["Posición"] || "",
                        course: fields.curso[0],
                        invoice: invoice,
                        init_date: fields.inicio_curso[0],
                        finish_date: fields.fin_curso[0],
                        duration: fields.duracion_hrs[0],
                        representative: fields.representante[0],
                        institution: fields.institucion[0]
                    });

                    doc.render(user);
                    console.log(`📝 Datos inyectados para ${p.Nombre}:`, user);
                    invoice = invoice + 1;

                    const docBuf = doc.getZip().generate({
                        type: "nodebuffer",
                        compression: "DEFLATE",
                    });

                    
                    // docx-merger en este proyecto espera contenido binario (string)
                    mergedDocs.push(docBuf.toString("binary"));
                    
                    console.log(`📦 Tamaño del buffer generado: ${docBuf.length} bytes`);
                    console.log(`✅ Documento generado para: ${p.Nombre}`);
                }

                console.log(`📦 Total de documentos generados: ${mergedDocs.length}`);

                if (mergedDocs.length === 0) {
                    return res.status(400).json({ 
                        error: "No se pudo generar ningún documento"
                    });
                }

                const merger: any = new DocxMerger({
                    style: 'default',
                    pageBreak: true
                }, mergedDocs);

                const outputPath = path.join(__dirname, "../files/" + titleFile + ".docx");
                
                const filesDir = path.join(__dirname, "../files");
                if (!fs.existsSync(filesDir)) {
                    fs.mkdirSync(filesDir, { recursive: true });
                }

                // ✅ Guardar el documento final
                await new Promise((resolve, reject) => {
                    merger.save("nodebuffer", (data: any) => {
                        if (!data) {
                            reject(new Error("No se generó data"));
                            return;
                        }
                        fs.writeFile(outputPath, data, (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(true);
                            }
                        });
                    });
                });

                console.log(`✅ Documento final creado: ${titleFile}.docx`);

                // Limpiar carpeta temporal despues de generar el documento final.
                const tempDir = path.join(__dirname, "../temp");
                try {
                    if (fs.existsSync(tempDir)) {
                        const tempItems = await fs.promises.readdir(tempDir);
                        await Promise.all(
                            tempItems.map((item) =>
                                fs.promises.rm(path.join(tempDir, item), { recursive: true, force: true })
                            )
                        );
                        console.log("🧹 Carpeta temp limpiada correctamente");
                    }
                } catch (tempError) {
                    console.warn("⚠️ No se pudo limpiar la carpeta temp:", tempError);
                }

                // Actualizar invoice
                await database.collection("invoice").updateOne(
                    { _id: new ObjectId("65cf8fa2fb856a03106e02ff") }, 
                    { $set: { number: invoice } }
                );

                if (users.length > 0) {
                    await database.collection("constancies").insertMany(users);
                }

                console.log("✅ Proceso completado exitosamente");

                return res.status(201).json({
                    message: "Archivo creado exitosamente",
                    title: titleFile,
                    participants: users.length,
                    filePath: outputPath
                });

            } catch (error) {
                console.error("❌ Error en procesamiento:", error);
                return res.status(500).json({ 
                    error: "Error al procesar los documentos",
                    details: (error as Error).message 
                });
            }
        });
    } catch (e) {
        console.error("❌ Error general:", e);
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post("/search", async (req: Request, res: Response) => {
    const { value } = req.body;
    const database = await getDb();
    const query = { invoice: { $eq: Number(value) } };
    // { curp: { $eq: value }} 
    const data = await database.collection("constancies").find(query).toArray();

    if (data) {
        return res.status(200).json(data)
    } else {
        return res.status(404).json({ data: [], message: "No hay datos" })
    }
})

router.get('/', async (req: Request, res: Response) => {
    const database = await getDb();
    const data = database.collection("constancies")
    const a = await data.find().toArray();
    res.json(a);
})

export default router;