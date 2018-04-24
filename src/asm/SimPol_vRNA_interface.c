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


const double vRNA_RT = 0.6156;
float vRNA_MFE_value = 0;
vrna_md_t md;


// Initialise the ViennaRNA suite for RNA folding
void vRNA_init(){
	set_model_details(&md);

}

// Calls the ViennaRNA suite written in C and returns the MFE structure
// External variable vRNA_MFE_value will contain the free energy
// Dynamic programming data structures in vRNA will persist between subsequent calls of this function
char* vRNA_compute_MFE(const char* sequence){


	// Convert the string sequence into a vrna_fold_compound_t object
	vrna_fold_compound_t *vc = vrna_fold_compound(sequence, &md, 1);

		
	int length = vc->length;
	char* structure = (char *) vrna_alloc(sizeof(char) * (length+1));


	// Compute MFE structure
	vRNA_MFE_value = (double) vrna_mfe(vc, structure) / vRNA_RT;

	// Clean up
    vrna_fold_compound_free(vc);

	return structure;
	//return min_en;
	
}

