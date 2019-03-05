#!/bin/bash -e

echo "Building vRNA..."


gcc -c -Wall -fPIC dist_vars.c ../SimPol_vRNA_interface.c data_structures.c part_func.c read_epars.c treedist.c energy_par.c inverse.c ProfileDist.c RNAstruct.c utils.c mfe.c fold.c naview.c stringdist.c params.c subopt.c list.c Lfold.c cofold.c part_func_co.c ProfileAln.c duplex.c alifold.c alipfold.c aln_util.c LPfold.c string_utils.c part_func_up.c ribo.c findpath.c convert_epars.c MEA.c aliLfold.c mm.c 2Dfold.c 2Dpfold.c plex_functions.c ali_plex.c c_plex.c plex.c snofold.c snoop.c move_set.c gquad.c eval.c constraints.c ligand.c perturbation_fold.c centroid.c structure_utils.c model.c file_formats.c dp_matrices.c exterior_loops.c hairpin_loops.c interior_loops.c multibranch_loops.c boltzmann_sampling.c constraints_SHAPE.c constraints_hard.c constraints_soft.c alphabet.c equilibrium_probs.c file_formats_msa.c plot_structure.c plot_layouts.c &



wait
echo "Creating vRNA library..."


gcc -shared -o libViennaRNA.so dist_vars.o SimPol_vRNA_interface.o data_structures.o part_func.o read_epars.o treedist.o energy_par.o inverse.o ProfileDist.o RNAstruct.o utils.o mfe.o fold.o naview.o stringdist.o params.o subopt.o list.o Lfold.o cofold.o part_func_co.o ProfileAln.o duplex.o alifold.o alipfold.o aln_util.o LPfold.o string_utils.o part_func_up.o ribo.o findpath.o convert_epars.o MEA.o aliLfold.o mm.o 2Dfold.o 2Dpfold.o plex_functions.o ali_plex.o c_plex.o plex.o snofold.o snoop.o move_set.o gquad.o eval.o constraints.o ligand.o perturbation_fold.o centroid.o structure_utils.o model.o file_formats.o dp_matrices.o exterior_loops.o hairpin_loops.o interior_loops.o multibranch_loops.o boltzmann_sampling.o constraints_SHAPE.o constraints_hard.o constraints_soft.o alphabet.o equilibrium_probs.o file_formats_msa.o plot_structure.o plot_layouts.o




echo "Done!"
