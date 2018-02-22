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


#ifndef MCMC_H
#define MCMC_H

#include "ExperimentalData.h"
#include "Parameter.h"
#include "Simulator.h"
#include "PosteriorDistriutionSample.h"

#include <list>
#include <string>
using namespace std;

class MCMC{

	static list<ExperimentalData>::iterator currentExperiment;
	static list<Parameter*> parametersToEstimate;
	static bool estimatingModel;
	static double epsilon; // The current chi-squared threshold
	static bool hasAchievedBurnin;
	static bool hasAchievedPreBurnin;

	static void makeProposal();
	static bool metropolisHastings(int sampleNum, PosteriorDistriutionSample* thisMCMCState, PosteriorDistriutionSample* prevMCMCState);
	static double calculateLogPriorProbability();
	static void tryToEstimateParameter(Parameter* param);


	public:


		static void beginMCMC();

		// Experimental data
		static bool resetExperiment();
		static bool nextExperiment();
		static double getExperimentalVelocity();
		static int getNTrials();
		static int getNTrialsPostBurnin();
		

};




#endif
