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


//#include "SimPol_bendit_interface.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <unistd.h>
#include <math.h>
#include <assert.h>
#include <getopt.h>
#include <sys/types.h>
#include <sys/wait.h>



void trinuc_curve_it(double *curve, double *bend, double *gc, char *seq, int seqlen, int rcurve, int rbend, const char *matrix);


/* Calculate the curvature of a DNA sequence using bend.it

	Calls a C module which contains code modified from bend.it described in:
		 Vlahovicek, Kristian, Laszlo Kajan, and Sandor Pongor. "DNA analysis servers: plot. it, bend. it, model. it and IS." Nucleic acids research 31.13 (2003): 3686-3687. 

 	 seq: DNA sequence to calculate the mean curvature for
	 curves: an array the same length as seq which will be populated with a windowed DNA curvatures over the sequence
	 scale: the model to use. Options: "Consensus", "Nucleosome", or "DNaseI"
	 cwindow: window size of curvature (defaults to 31 in the original software)

*/
void bendit_curvature(char* seq,  long seqlen, double* curve, double *bend, double *gc, const char* scale, int cwindow, int bwindow){


	trinuc_curve_it(curve, bend, gc, seq, seqlen, cwindow / 2, bwindow / 2, scale);
	/*
    if (!strcmp(scale, "DNaseI")) trinuc_curve_it(curve, bend, gc, seq, seqlen, cwindow / 2, bwindow / 2, scale);
    else if (!strcmp(scale, "Consensus")) trinuc_curve_it(curve, bend, gc, seq, seqlen, cwindow / 2, bwindow / 2, scale);
    else if (!strcmp(scale, "Nucleosome")) trinuc_curve_it(curve, bend, gc, seq, seqlen, cwindow / 2, bwindow / 2, scale);
    */


}
