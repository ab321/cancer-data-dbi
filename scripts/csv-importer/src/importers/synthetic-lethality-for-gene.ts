import { Database } from "sqlite";
import { DB } from "../db";

async function retrieveSyntheticLethalityForGene(vGeneId: number): Promise<void> {
    let db: Database | null = null;
    try {
        db = await DB.getConnection();

        // Erstellen einer temporären Tabelle für die Ergebnisse
        await db.run(`
            DROP TABLE IF EXISTS TempSyntheticLethalityForGene;
            CREATE TABLE TempSyntheticLethalityForGene AS
            SELECT
                po.gene_id_1 AS gene_id_1_human,
                po.gene_id_2 AS gene_id_2_human,
                sl.statisticScore AS synthetic_lethality_score
            FROM PredictedOrtholog po
            JOIN SyntheticLethality sl ON po.gene_id_1 = sl.gene_id_1 AND po.gene_id_2 = sl.gene_id_2
            WHERE po.gene_id_1 = ? OR po.gene_id_2 = ?;
        `, vGeneId, vGeneId);

        // Anzeigen der Ergebnisse
        const results = await db.all(`
            SELECT * FROM TempSyntheticLethalityForGene
            ORDER BY synthetic_lethality_score DESC;
        `);

        console.log(results);
    } catch (error) {
        console.error(error);
    } finally {
        if (db) {
            await db.close();
        }
    }
}

// Beispielaufruf mit Gene-ID 123
retrieveSyntheticLethalityForGene(123);
