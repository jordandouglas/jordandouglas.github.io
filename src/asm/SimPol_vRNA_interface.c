/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SimPol.

    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/


//#include "SimPol_vRNA_interface.h"
#include "ViennaRNA/mfe.h"
#include "ViennaRNA/utils.h"
#include "ViennaRNA/plot_structure.h"
#include "ViennaRNA/structure_utils.h"
#include "ViennaRNA/gquad.h"
#include "ViennaRNA/plot_layouts.h"
#include "ViennaRNA/naview.h"
#include "ViennaRNA/eval.h"

#include <string.h>
#include <limits.h>
#include <stdlib.h>


const double vRNA_RT = 0.6156;
float vRNA_MFE_value = 0;
vrna_md_t md; // Model details
vrna_fold_compound_t* vc; // Contains information on the sequence and the DP matrices


// Initialise the ViennaRNA suite for RNA folding
void vRNA_init(const char* nascentSequence){



	// Initialise the model details
	vrna_md_defaults_gquad(1);
	set_model_details(&md);

	// Clean up
    if (vc) vrna_fold_compound_free(vc);

	// Allocate memory to fold the entire sequence (unless inserts have taken place)
	vc = vrna_fold_compound(nascentSequence, &md, 1);


	// Default all entries in the DP matrices to infinity so that we know they have not yet been set
	// Modified from the code in dp_matrices.c -> mfe_matrices_alloc_default()
	int i;
	int n, m;
	n = m = vc->length;
	int size          = ((n + 1) * (m + 2)) / 2;
 	int lin_size      = n + 2;

 	if (vc->matrices->evaluated) for (i = 0; i < size; i ++) vc->matrices->evaluated[i] = 0;
	if (vc->matrices->f5) for (i = 0; i < lin_size; i ++) vc->matrices->f5[i] = INF;
	if (vc->matrices->f3) for (i = 0; i < lin_size; i ++) vc->matrices->f3[i] = INF;
	if (vc->matrices->fc) for (i = 0; i < lin_size; i ++) vc->matrices->fc[i] = INF;
	if (vc->matrices->c) for (i = 0; i < size; i ++) vc->matrices->c[i] = INF;
	if (vc->matrices->fML) for (i = 0; i < size; i ++) vc->matrices->fML[i] = INF;
	if (vc->matrices->fM1) for (i = 0; i < size; i ++) vc->matrices->fM1[i] = INF;
	if (vc->matrices->fM2) for (i = 0; i < lin_size; i ++) vc->matrices->fM2[i] = INF;



}

// Calls the ViennaRNA suite written in C and returns the MFE structure
// External variable vRNA_MFE_value will contain the free energy
// Dynamic programming data structures in vRNA will persist between subsequent calls of this function
float vRNA_compute_MFE(char* sequence, char* structure, int length){


	// Convert the string sequence into a vrna_fold_compound_t object
	//vrna_fold_compound_t *vc = vrna_fold_compound(sequence, &md, 1);


	// Set the length and sequence of vc to the current sequence
	vc->length    = length;
  	vc->sequence  = strdup(sequence);



	//if (structureGlobal) free(structureGlobal);
	//char* structure = (char *) vrna_alloc(sizeof(char) * (length+1));


	// Compute MFE structure
	vRNA_MFE_value = (double) vrna_mfe(vc, structure) / vRNA_RT;


	//free(sequence);


	return vRNA_MFE_value;
	
}


// Calls the ViennaRNA suite written in C and returns the MFE structure
// Will not make use of any cached DP structures
float vRNA_compute_MFE_no_cache(char* sequence, char* structure, int length){




	// Allocate memory to fold the current sequence
	vrna_fold_compound_t*  vc_temp = vrna_fold_compound(sequence, &md, 1);

	// Set the length and sequence of vc to the current sequence
	vc_temp->length    = length;
  	vc_temp->sequence  = strdup(sequence);


	// Default all entries in the DP matrices to infinity so that we know they have not yet been set
	// Modified from the code in dp_matrices.c -> mfe_matrices_alloc_default()
	int i;
	int n, m;
	n = m = vc_temp->length;
	int size          = ((n + 1) * (m + 2)) / 2;
 	int lin_size      = n + 2;


 	if (vc->matrices->evaluated) for (i = 0; i < size; i ++) vc->matrices->evaluated[i] = 0;
	if (vc_temp->matrices->f5) for (i = 0; i < lin_size; i ++) vc_temp->matrices->f5[i] = INF;
	if (vc_temp->matrices->f3) for (i = 0; i < lin_size; i ++) vc_temp->matrices->f3[i] = INF;
	if (vc_temp->matrices->fc) for (i = 0; i < lin_size; i ++) vc_temp->matrices->fc[i] = INF;
	if (vc_temp->matrices->c) for (i = 0; i < size; i ++) vc_temp->matrices->c[i] = INF;
	if (vc_temp->matrices->fML) for (i = 0; i < size; i ++) vc_temp->matrices->fML[i] = INF;
	if (vc_temp->matrices->fM1) for (i = 0; i < size; i ++) vc_temp->matrices->fM1[i] = INF;
	if (vc_temp->matrices->fM2) for (i = 0; i < lin_size; i ++) vc_temp->matrices->fM2[i] = INF;


	// Compute MFE structure
	vRNA_MFE_value = (double) vrna_mfe(vc_temp, structure) / vRNA_RT;


	//free(sequence);


	// Clean up
    vrna_fold_compound_free(vc_temp);


	return vRNA_MFE_value;
	
}






// Returns coordinates to position each RNA base on a plot. Modified from code in plot_structure.c -> vrna_file_PS_rnaplot_a()
// Returns a float array XY where the first (length+1) are the X coordinates and the second (length+1) are the Y coordinates
void vRNA_get_coordinates(char* structure, float* XY, int length){


	
	//float  xmin, xmax, ymin, ymax;
	int    i;
	int    ee, gb, ge, Lg, l[3];
	float *X, *Y;


	short* pair_table_g = vrna_ptable(structure);


	ge=0;
	while ((ee = parse_gquad(structure + ge, &Lg, l)) > 0) {
		ge += ee;
		gb = ge - Lg*4 - l[0] - l[1] - l[2] + 1;

		// Add pseudo-base pair encoding gquad
		for (i=0; i < Lg; i++) {
			pair_table_g[ge-i] = gb+i;
			pair_table_g[gb+i] = ge-i;
		}
	} 


	X = (float *) vrna_alloc((length+1)*sizeof(float));
	Y = (float *) vrna_alloc((length+1)*sizeof(float));


	i = naview_xy_coordinates(pair_table_g, X, Y);

	for (i = 0; i < length; i++) {
		XY[i] = X[i];
		XY[i+length] = Y[i];
	}

	// Clean-up
	free(l);
	free(pair_table_g);
	free(X); 
	free(Y);

}



// Returns the Gibbs energy of the specified structure and sequence (equivalent to RNAeval)
float vRNA_eval(char* sequence, char* structure){


	// Allocate memory to fold the current sequence
	vrna_fold_compound_t*  vc = vrna_fold_compound(sequence, &md, 1);
	float energy = vrna_eval_structure_v(vc, structure, 0, NULL);

	// Clean up
    vrna_fold_compound_free(vc);

	return energy / vRNA_RT;
}	