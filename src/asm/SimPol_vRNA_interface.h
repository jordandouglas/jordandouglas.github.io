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




#ifndef SIMPOL_VRNA_INTERFACE
#define SIMPOL_VRNA_INTERFACE


#include <string>

using namespace std;


// Initialise the ViennaRNA suite for RNA folding. Call this everytime the sequence changes
extern "C" void vRNA_init(const char* nascentSequence);

// Contains the MFE of the most recently calculated MFE structure
extern "C" float vRNA_MFE_value;

// Calls the ViennaRNA suite written in C and returns the MFE structure
extern "C" float vRNA_compute_MFE(char* sequence, char* structure);

// Returns coordinates to position each RNA base on a plot
extern "C"  float* vRNA_get_coordinates(const char* structure);




#endif
