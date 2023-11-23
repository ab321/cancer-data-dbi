import {SynLet} from "./model/SynLet";
import {DB} from "./db";
import {Database} from "sqlite";
import {Organism} from "./model/Organism";
import {Ortholog} from "./model/Ortholog";
import {Gene} from "./model/Gene";
import {Result} from "./model/Result";

async function getSynLet(ncbi_id: number, db: Database): Promise<SynLet[]> {
    const stmt = await db.prepare(
        "SELECT * FROM syntheticLethality where ncbiGeneId1 = ?1 or ncbiGeneId2 = ?1 ORDER BY statisticScore DESC"
    );

    return (await stmt.all<SynLet[]>(ncbi_id))!;
}

async function buildResults(synLets: { geneId: number; score: number; }[], inputGeneEssentialityScore: number, db: Database): Promise<Result[]> {
    let results: Result[] = [];

    let stmt= await db.prepare(`
        SELECT * FROM gene WHERE ncbiGeneId in (${synLets.map(sl => sl.geneId).join(",")})
        ORDER BY essentialityScore DESC 
    `);

    let genes: Gene[] = await stmt.all<Gene[]>();

    for (let gene of genes) {
        results.push({
            ncbiGeneId: gene.ncbiGeneId,
            ncbiGeneName: gene.ncbiGeneName,
            score: (1 - inputGeneEssentialityScore) * (1 - gene.essentialityScore) * synLets.find(sl => sl.geneId == gene.ncbiGeneId)!.score
        });
    }

    results.sort((a1, a2) => a2.score - a1.score);

    return results;
}

function prettyPrintResult(result: Result[], limit: number): void {
    console.table(result.slice(0, limit));
}

async function remap(ncbi_id: number, target_organism: Organism, db: Database): Promise<Gene[]> {
    let target_ncbi_ids: Ortholog[] = (await db.all<Ortholog[]>(
    `SELECT po.ncbiGeneId1,  po.ncbiGeneId2
            FROM predictedOrtholog po
            WHERE (ncbiGeneId1 = ?1 or ncbiGeneId2 = ?1)
                AND ?2 in (SELECT organismId FROM gene where ncbiGeneId = po.ncbiGeneId1 or ncbiGeneId = po.ncbiGeneId2);
        `,
        { 1: ncbi_id, 2: target_organism }
    ))!;

    let result_genes: Gene[] = [];

    for (let target_id of target_ncbi_ids) {
        if (target_id.ncbiGeneId1 != ncbi_id) {
            result_genes.push((await db.get<Gene>(`
                SELECT * FROM gene WHERE ncbiGeneId = ?1
            `, target_id.ncbiGeneId1))!);
        } else {
            result_genes.push((await db.get<Gene>(`
                SELECT * FROM gene WHERE ncbiGeneId = ?1
            `, target_id.ncbiGeneId2))!);
        }
    }

    return result_genes;
}

async function getEssentialityScore(ncbiId: number, db: Database): Promise<number> {
    return (await db.get<{ essentialityScore: number; }>("SELECT essentialityScore FROM gene where ncbiGeneId = ?1", ncbiId))!.essentialityScore;
}

(async () => {
    const OUTPUT_LIMIT: number = 5;
    let args = process.argv.splice(2);

    if (args.length != 1) {
        console.error("Please provide an ncbi_id for a human gene!");
        return -1;
    }

    let ncbi_input_id: number = Number(args[0]);

    if (isNaN(ncbi_input_id)) {
        console.error("Invalid ncbi_id!");
        return -1;
    }

    let db = await DB.getConnection();
    let input_essentiality_score: number = await getEssentialityScore(ncbi_input_id, db);

    console.log("Searching synlets for HUMAN");
    let humanSynLets: SynLet[] = await getSynLet(ncbi_input_id, db);
    let humanResults: Result[] = await buildResults(humanSynLets.map(
        sl => <{ geneId: number; score: number; }>{
            geneId: sl.ncbiGeneId1 == ncbi_input_id ? sl.ncbiGeneId2 : sl.ncbiGeneId1,
            score: sl.statisticScore
        }
    ), input_essentiality_score, db);

    if (humanResults.length != 0) {
        console.log("Showing top 5 HUMAN synlet Results");
        prettyPrintResult(humanResults, OUTPUT_LIMIT);
    } else {
        console.log("No HUMAN synlets found");
    }

    for(let organism of [Organism.MOUSE, Organism.FLY]) {
        console.log(`Remapping to ${Organism[organism]}...`);
        let organismGenes = await remap(ncbi_input_id, organism, db);

        if (organismGenes.length != 0) {
            console.log(`Equivalent ${Organism[organism]} Gene(s)`);
            console.table(organismGenes);
        } else {
            console.log("No equivalent genes found");
        }

        for (let gene of organismGenes) {
            let organismSynLets = (await getSynLet(gene.ncbiGeneId, db))
                .sort((sl1, sl2) => sl2.statisticScore - sl1.statisticScore);

            if (organismSynLets.length != 0) {
                console.log(`Top 5 synlets for ${gene.ncbiGeneId}(${gene.ncbiGeneName})`);
                console.table(organismSynLets.slice(0, OUTPUT_LIMIT));

                console.log("Remap back to HUMAN");
                for (let synlet of organismSynLets) {
                    let important_gene = synlet.ncbiGeneId1 == gene.ncbiGeneId ? synlet.ncbiGeneId2 : synlet.ncbiGeneId1;
                    let human_equivalents: Gene[] = await remap(important_gene, Organism.HUMAN, db);
                    let human_results: Result[] = await buildResults(human_equivalents.map(g => <{ geneId: number; score: number; }>{
                        geneId: g.ncbiGeneId,
                        score: synlet.statisticScore
                    }), input_essentiality_score, db);

                    if (human_results.length != 0) {
                        console.log(`Equivalent HUMAN genes to ${Organism[organism]}(${important_gene})`)
                        prettyPrintResult(human_results, human_results.length + 1);
                    } else {
                        console.log(`Unable to map ${Organism[organism]}(${important_gene}) back to HUMAN`);
                    }
                }
            } else {
                console.log(`No synlets found for ${gene.ncbiGeneId}(${gene.ncbiGeneName})`)
            }
        }
    }
})();