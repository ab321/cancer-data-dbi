drop table syntheticLethality;
drop table predictedOrtholog;
drop table gene;
drop table organism;

create table if not exists organism (
    organismId integer,
    organismName text,
    constraint pk_organism primary key (organismId)
);

create table if not exists gene (
    ncbiGeneId integer,
    ncbiGeneName text,
    essentialityScore real,
    organismId integer,
    constraint pk_gene primary key (ncbiGeneid),
    constraint fk_gene_organism foreign key (organismId) references organism (organismId)
);

create table if not exists predictedOrtholog (
    ncbiGeneId1 integer,
    ncbiGeneId2 integer,
    constraint pk_predictedOrtholog primary key(ncbiGeneId1, ncbiGeneId2),
    constraint fk_predictedOrhtolog_firstGene foreign key (ncbiGeneId1) references gene (ncbiGeneId),
    constraint fk_predictedOrhtolog_secondGene foreign key (ncbiGeneId1) references gene (ncbiGeneId)
);

create table if not exists syntheticLethality (
    ncbiGeneId1 integer,
    ncbiGeneId2 integer,
    statisticScore real,
    constraint pk_syntheticLethality primary key(ncbiGeneId1, ncbiGeneId2),
    constraint fk_syntheticLethality_firstGene foreign key (ncbiGeneId1) references gene (ncbiGeneId),
    constraint fk_syntheticLethality_secondGene foreign key (ncbiGeneId1) references gene (ncbiGeneId)
)