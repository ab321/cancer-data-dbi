SELECT ncbiGeneId
FROM gene og
WHERE organismId = 0
  AND (SELECT COUNT(*) FROM predictedOrtholog pO JOIN gene g ON (g.ncbiGeneId in (pO.ncbiGeneId1, pO.ncbiGeneId2))
                                                 JOIN syntheticLethality sL on (ncbiGeneId in (sL.ncbiGeneId1, sL.ncbiGeneId2))
       WHERE og.ncbiGeneId in (pO.ncbiGeneId1, pO.ncbiGeneId2) AND organismId = 2) != 0
  AND (SELECT COUNT(*) FROM predictedOrtholog pO JOIN gene g ON (g.ncbiGeneId in (pO.ncbiGeneId1, pO.ncbiGeneId2))
                                                 JOIN syntheticLethality sL on (ncbiGeneId in (sL.ncbiGeneId1, sL.ncbiGeneId2))
       WHERE og.ncbiGeneId in (pO.ncbiGeneId1, pO.ncbiGeneId2) AND organismId = 1) != 0;