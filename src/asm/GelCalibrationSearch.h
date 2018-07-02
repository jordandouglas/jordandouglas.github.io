
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


#ifndef GELCALIBRATIONSEARCH_H
#define GELCALIBRATIONSEARCH_H

#include "PosteriorDistributionSample.h"
#include "Parameter.h"


#include <string>
#include <vector>


using namespace std;


// MCMC search engine for calibrating gel migration distances to a set of user-specified molecular weights  
class GelCalibrationSearch{


	static int fitID;
	static vector<Parameter*> calibrationObservations;
	static int logEveryNStates;
	static int nTrials;
	static vector<Parameter*> parametersToEstimate;
	static int nacceptances;

	// 2 states stored in memory
	static PosteriorDistributionSample* currentMCMCstate;
	static PosteriorDistributionSample* proposalMCMCstate;


	// Linear model parameters
	static Parameter* slope;
	static Parameter* intercept;
	static Parameter* sigma;


	static bool metropolisHastings(int sampleNum, PosteriorDistributionSample* this_MCMCState, PosteriorDistributionSample* prev_MCMCState);
	static double getLogLikelihood(double trueTranscriptLength, double estimatedTranscriptLengthMu, double estimatedTranscriptLengthSigma);
	static void makeProposal(vector<Parameter*> parametersToEstimate);

	public:
		
		static void initMCMC(int fitID, vector<Parameter*> calibrationObservations, int nTrials, int logEveryNTrials);
		static bool perform_1_iteration(int n);
		static int getCurrentStateNumber();
		static double getAcceptanceRate();

};


#endif


