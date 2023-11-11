import {EssentialityImporter} from "./importers/essentiality-importer";
import {SyntheticLethalityImporter} from "./importers/sl-importer";
import {Organism} from "./organisms";
import {OrthologImporter} from "./importers/ortho-importer";

(async () => {
   let ei: EssentialityImporter = new EssentialityImporter();
   let sl: SyntheticLethalityImporter = new SyntheticLethalityImporter();
   let po: OrthologImporter = new OrthologImporter();

   // Import essentiality
   await ei.import_file("../../datafiles/CSEGs_CEGs.txt");

   // Import synthetic lethalities
   await sl.import_file("../../datafiles/Fly_SL.csv", Organism.FLY);
   await sl.import_file("../../datafiles/Human_SL.csv", Organism.HUMAN);
   await sl.import_file("../../datafiles/Mouse_SL.csv", Organism.MOUSE);

   // import orthologs
   await po.import_file("../../datafiles/human-2-fly.txt", Organism.HUMAN, Organism.FLY);
   await po.import_file("../../datafiles/human-2-mouse.txt", Organism.HUMAN, Organism.MOUSE);
})();