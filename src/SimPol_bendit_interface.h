
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




#ifndef SIMPOL_BENDIT_INTERFACE
#define SIMPOL_BENDIT_INTERFACE


#include <string>

using namespace std;


/* Calculate the curvature of a DNA sequence using bend.it
	 Vlahovicˇek, Kristian, Laszlo Kajan, and Sandor Pongor. "DNA analysis servers: plot. it, bend. it, model. it and IS." Nucleic acids research 31.13 (2003): 3686-3687. 

	 seq: DNA sequence to calculate the mean curvature for
	 curve: an array the same length as seq which will be populated with a windowed DNA curvatures over the sequence
	 scale: the model to use. Options: "Consensus", "Nucleosome", or "DNaseI"
	 cwindow: window size of curvature (defaults to 31 in the original software)

*/
extern "C" void bendit_curvature(char* seq,  long seqlen, double* curve, double *bend, double *gc, const char* scale, int cwindow, int bwindow);






#endif
