import {Importer} from "./importer";
import * as fs from 'node:fs';
import {DB} from "../db";
import {Database} from "sqlite";
import {Organism} from "../organisms";

export class EssentialityImporter extends Importer {
    private get_essentiality(essentiality: string): number {
        switch (essentiality) {
            case "CSEGs":
                return 0.2;
            case "CEGs":
                return 0.8;
            default:
                console.error(`[IMPORT ESSENTIALITY]: Can not get essentiality from "${essentiality}"!`);
                return -1;
        }
    }

    private async delete_old_data(db: Database): Promise<void> {
        await db.run("delete from gene where essentialityScore != 0");
    }

    public async import_file(path: String): Promise<void> {
        if (!fs.existsSync(path as fs.PathLike)) {
            console.error("[IMPORT ESSENTIALITY]: The given file does not exist!");
            return;
        }

        let lines: string[] = fs.readFileSync(path as fs.PathOrFileDescriptor, "UTF8" as BufferEncoding).split(/\r?\n/);

        let i: number = 0;

        // Skip until header is done. Marked with ~~~~~~~~~
        while(lines[i][0] != '~') {
            i++;
        }
        i += 2; // Increment by two to skip the header end line (~~~~~) and the column names (gene,essentiality,ncbi_id,...)

        let db = await DB.getConnection();
        try {
            await DB.beginTransaction(db);

            let stmt = await db.prepare(
                "insert into gene (ncbiGeneId, ncbiGeneName, essentialityScore, organismId) values (?1, ?2, ?3, ?4)"
            );

            try {
                for (; i < lines.length; i++) {
                    let data: string[] = lines[i].split('\t');
                    let geneName: string = data[0];
                    let essentiality: number = this.get_essentiality(data[1]);
                    let ncbi_id: number = Number(data[2]);

                    // skip broken data
                    if (isNaN(ncbi_id) || essentiality == -1 || ncbi_id == 0 || data.length < 3) {
                        console.warn(`[IMPORT ESSENTIALITY]: Faulty data! (skipping): "${lines[i]}"`);
                        continue;
                    }

                    await stmt.bind({ 1: ncbi_id, 2: geneName, 3: essentiality, 4: Organism.HUMAN });
                    await stmt.run();
                    await stmt.reset();
                }
            } finally {
                await stmt.finalize();
            }

            await DB.commitTransaction(db);
        } catch (e) {
            console.error(e);
        } finally {
            await db.close();
        }
    }
}