import {Importer} from "./importer";
import fs from "node:fs";
import {Organism} from "../organisms";
import {DB} from "../db";

export class SyntheticLethalityImporter extends Importer {
    public async import_file(path: String, organism: Organism): Promise<void> {
        if (!fs.existsSync(path as fs.PathLike)) {
            console.error("[IMPORT SL]: The given file does not exist!");
            return;
        }

        let lines: string[] = fs.readFileSync(path as fs.PathOrFileDescriptor, "UTF8" as BufferEncoding).split(/\r?\n/);

        let db = await DB.getConnection();
        try {
            await DB.beginTransaction(db);

            let insertGene = await db.prepare(
                "insert or ignore into gene (ncbiGeneId, ncbiGeneName, essentialityScore, organismId) values (?1, ?2, ?3, ?4)"
            );

            let insertSL = await db.prepare(
                "insert into syntheticLethality (ncbiGeneId1, ncbiGeneId2, statisticScore) values (?1, ?2, ?3)"
            );

            try {
                // skip headers => start at 1
                for (let i = 1; i < lines.length; i++) {
                    let data: string[] = lines[i].split(',');
                    let gene1Name: string = data[0];
                    let gene1Id: number = Number(data[1]);
                    let gene2Name: string = data[2];
                    let gene2Id: number = Number(data[3]);
                    let statisticsScore: number = Number(data[7]);

                    // skip broken data
                    if (isNaN(gene2Id) || isNaN(gene1Id) || data.length !== 8 || isNaN(statisticsScore)) {
                        console.warn(`[IMPORT SL]: Faulty data! (skipping): "${lines[i]}"`);
                        continue;
                    }

                    await insertGene.bind({ 1: gene1Id, 2: gene1Name, 3: 0, 4: organism });
                    await insertGene.run();
                    await insertGene.reset();

                    await insertGene.bind({ 1: gene2Id, 2: gene2Name, 3: 0, 4: organism });
                    await insertGene.run();
                    await insertGene.reset();

                    await insertSL.bind({ 1: gene1Id, 2: gene2Id, 3: statisticsScore});
                    await insertSL.run();
                    await insertSL.reset();
                }
            } finally {
                await insertGene.finalize();
                await  insertSL.finalize();
            }

            await DB.commitTransaction(db);
        } catch (e) {
            console.error(e);
        } finally {
            await db.close();
        }
    }
}