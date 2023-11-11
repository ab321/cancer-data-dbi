import {Importer} from "./importer";
import {Organism} from "../organisms";
import fs from "node:fs";
import {DB} from "../db";

export class OrthologImporter extends Importer {
    async import_file(path: String, source: Organism, dest: Organism): Promise<void> {
        if (!fs.existsSync(path as fs.PathLike)) {
            console.error("[IMPORT ORTHO]: The given file does not exist!");
            return;
        }

        let lines: string[] = fs.readFileSync(path as fs.PathOrFileDescriptor, "UTF8" as BufferEncoding).split(/\r?\n/);

        let db = await DB.getConnection();
        try {
            await DB.beginTransaction(db);

            let insertGene = await db.prepare(
                "insert or ignore into gene (ncbiGeneId, ncbiGeneName, essentialityScore, organismId) values (?1, ?2, ?3, ?4)"
            );

            let insertOrtholog = await db.prepare(
                "insert or ignore into predictedOrtholog (ncbiGeneId1, ncbiGeneId2) values (?1, ?2)"
            );

            try {
                for (let i= 0; i < lines.length; i++) {
                    let data: string[] = lines[i].split('\t');
                    let gene1Id: number = Number(data[0]);
                    let gene2Id: number = Number(data[1]);

                    if (isNaN(gene1Id) || isNaN(gene2Id)) {
                        console.warn(`[IMPORT ORTHO]: Faulty data! (skipping): "${lines[i]}"`);
                        continue;
                    }

                    await insertGene.bind({ 1: gene1Id, 2: 'n/A', 3: 0, 4: source });
                    await insertGene.run();
                    await insertGene.reset();

                    await insertGene.bind({ 1: gene2Id, 2: 'n/A', 3: 0, 4: dest });
                    await insertGene.run();
                    await insertGene.reset();

                    await insertOrtholog.bind({ 1: gene1Id, 2: gene2Id });
                    await insertOrtholog.run();
                    await insertOrtholog.reset();
                }
            } finally {
                await insertGene.finalize();
                await insertOrtholog.finalize();
            }

            await DB.commitTransaction(db);
        } catch (e) {
            console.error(e);
        } finally {
            await db.close();
        }
    }
}