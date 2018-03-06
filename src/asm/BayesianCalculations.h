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


#ifndef BAYESIANCALCULATIONS_H
#define BAYESIANCALCULATIONS_H



#include "PosteriorDistriutionSample.h"
#include <string>
#include <vector>
#include <list>

using namespace std;

// Contains information on a set of experimental observations
class BayesianCalculations{


	public:
		static vector<PosteriorDistriutionSample*> loadLogFile(string outputFilename, double epsilon);
		static PosteriorDistriutionSample* printGeometricMedian(vector<PosteriorDistriutionSample*> states);
		static void sampleFromPosterior(vector<PosteriorDistriutionSample*> posteriorDistribution);
		static void printModelFrequencies(vector<PosteriorDistriutionSample*> posteriorDistribution);
};

#endif