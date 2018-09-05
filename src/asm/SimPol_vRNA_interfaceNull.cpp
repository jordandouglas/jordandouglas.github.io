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


#include "SimPol_vRNA_interface.h"

#include <iostream>

float vRNA_MFE_value = 0;



void vRNA_init(const char* templateSequence){
}


float vRNA_compute_MFE(char* sequence, char* structure, int length){
	return 0;
}

float vRNA_compute_MFE_no_cache(char* sequence, char* structure, int length){
	return 0;
}

void vRNA_get_coordinates(char* structure, float* XY, int length){
}


float vRNA_eval(char* sequence, char* structure){
	return 0;
}	
