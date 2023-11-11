import {Organism} from "../organisms";

export abstract class Importer {
    public abstract import_file(path: String, organism?: Organism, dest?: Organism): Promise<void>;
}