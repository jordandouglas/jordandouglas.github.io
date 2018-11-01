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




#include "GelCalibrationSearch.h"
#include "Settings.h"


#include <algorithm>
#include <iostream>
#include <list>
#include <math.h> 


using namespace std;


int GelCalibrationSearch::fitID = 0;
vector<Parameter*> GelCalibrationSearch::calibrationObservations;
int GelCalibrationSearch::logEveryNStates = 1;
int GelCalibrationSearch::nTrials = 0;
vector<Parameter*> GelCalibrationSearch::parametersToEstimate;
int GelCalibrationSearch::nacceptances = 0;

PosteriorDistributionSample* GelCalibrationSearch::currentMCMCstate;
PosteriorDistributionSample* GelCalibrationSearch::proposalMCMCstate;

Parameter* GelCalibrationSearch::slope;
Parameter* GelCalibrationSearch::intercept;
Parameter* GelCalibrationSearch::sigma;



// Initialise MCMC for parameter search for a linear model for gel calibration
void GelCalibrationSearch::initMCMC(int fitID, vector<Parameter*> calibrationObservations, int nTrials, int logEveryNStates){
	
	
	cout << "Initialising inference" << endl; 
	GelCalibrationSearch::fitID = fitID;
	GelCalibrationSearch::calibrationObservations = calibrationObservations;
	GelCalibrationSearch::logEveryNStates = logEveryNStates;
	GelCalibrationSearch::nTrials = nTrials;

	// Create the parameters
	GelCalibrationSearch::intercept = new Parameter("intercept", false, "false", "Intercept", "Intercept parameter for gel calibation");
	GelCalibrationSearch::slope = new Parameter("slope", false, "false", "Slope", "Slope parameter for gel calibation");
	GelCalibrationSearch::sigma = new Parameter("sigma", false, "exclusive", "Sigma", "Standard deviation parameter for gel calibation");


	// Define priors
	GelCalibrationSearch::intercept->setDistributionParameter("normalMeanVal", 0)->setDistributionParameter("normalSdVal", 100)->setPriorDistribution("Normal");
	GelCalibrationSearch::slope->setDistributionParameter("normalMeanVal", 50000)->setDistributionParameter("normalSdVal", 20000)->setPriorDistribution("Normal");
	GelCalibrationSearch::sigma->setDistributionParameter("lognormalMeanVal", 3)->setDistributionParameter("lognormalSdVal", 1)->setPriorDistribution("Lognormal");



	// Sample from priors
	GelCalibrationSearch::parametersToEstimate.resize(3 + calibrationObservations.size());
	parametersToEstimate.at(0) = GelCalibrationSearch::intercept;
	parametersToEstimate.at(1) = GelCalibrationSearch::slope;
	parametersToEstimate.at(2) = GelCalibrationSearch::sigma;
	for (int i = 3; i < parametersToEstimate.size(); i ++) parametersToEstimate.at(i) = calibrationObservations.at(i-3);
	for (int i = 0; i < parametersToEstimate.size(); i ++) {
		parametersToEstimate.at(i)->sample();
	}


	// Initialise posterior distribution (and delete old one first)
	list<PosteriorDistributionSample*> posterior = Settings::getPosteriorDistributionByID(fitID);
	for (list<PosteriorDistributionSample*>::iterator it = posterior.begin(); it != posterior.end(); ++ it){
		delete (*it);
	}
	posterior.clear();
	_gelPosteriorDistributions[fitID] = posterior;



	GelCalibrationSearch::currentMCMCstate = new PosteriorDistributionSample(0, 0, false);



	// Calculate posterior of initial state
	GelCalibrationSearch::metropolisHastings(0, GelCalibrationSearch::currentMCMCstate, nullptr);
	GelCalibrationSearch::currentMCMCstate->printHeader(false);
	GelCalibrationSearch::currentMCMCstate->print(false);


	GelCalibrationSearch::nacceptances = 0;

	// Begin trials
	for (int n = 1; n <= GelCalibrationSearch::nTrials; n ++){
		


	}



}



// Performs 1 trial or returns true if all trials are done
bool GelCalibrationSearch::perform_1_iteration(int n) {


	if (n > GelCalibrationSearch::nTrials) {
		return true;
	}


	if ((n == 1 || n % logEveryNStates == 0)){
		//cout << "Performing MCMC trial " << n << endl;
	}


	// Make proposal
	GelCalibrationSearch::makeProposal(parametersToEstimate);



	// Accept or reject
	proposalMCMCstate = new PosteriorDistributionSample(n, 0, false);
	bool accepted = GelCalibrationSearch::metropolisHastings(n, proposalMCMCstate, currentMCMCstate);



	// Accept
	if (accepted){
		
		nacceptances ++;
		//cout << "Accept" << endl;


		delete currentMCMCstate;
		currentMCMCstate = proposalMCMCstate;


		//currentMCMCstate->print(false);

		// Reset all parameters to make their new value final
		for (int i = 0; i < parametersToEstimate.size(); i ++) {
			parametersToEstimate.at(i)->acceptProposal();
		}
	}

	// If reject then restore parameters to those of the previous state
	// This code has no knowledge of which parameter was changed
	else{

		//cout << "Reject" << endl;



		delete proposalMCMCstate;
		proposalMCMCstate = currentMCMCstate;
		proposalMCMCstate->setStateNumber(n);


		// Revert all parameters to their cached previous values
		for (int i = 0; i < parametersToEstimate.size(); i ++) {
			parametersToEstimate.at(i)->rejectProposal();
		}

	}


	// Log
	if (n % logEveryNStates == 0){
		currentMCMCstate->print(false);


		if(_USING_GUI) {
			Settings::addToPosteriorDistribution(GelCalibrationSearch::fitID, currentMCMCstate->clone(true));
		}
	}


	return false;

}





void GelCalibrationSearch::makeProposal(vector<Parameter*> parametersToEstimate){

	// Determine how many parameters there are
	int nParams = parametersToEstimate.size();
	double runifNum = (int)(Settings::runif() * (nParams)); // Random integer in range [0, nParams-1]


	// Make proposal for one parameter
	for (int i = 0; i < parametersToEstimate.size(); i ++) {
		if (runifNum == i){
			parametersToEstimate.at(i)->makeProposal();
			return;
		}
	}

}



// Apply a trial and accept / reject the newly proposed parameters
// The PosteriorDistributionSample object parsed will be overwritten and populated with the appropriate details
// Returns true if accept, false if reject
// If the sampleNum is 0, it will always be accepted
bool GelCalibrationSearch::metropolisHastings(int sampleNum, PosteriorDistributionSample* proposal_MCMCState, PosteriorDistributionSample* this_MCMCState){
	
	

	if (calibrationObservations.size() == 0){
		cout << "Could not initialise experiment" << endl;
		exit(0);
	}


	// Cache the parameter values in posterior row object and calculate prior probability
	double logPrior = 0;
	for (int i = 0; i < parametersToEstimate.size(); i ++) {
		proposal_MCMCState->addParameterEstimate(parametersToEstimate.at(i)->getID(), parametersToEstimate.at(i)->getTrueVal());
		logPrior += parametersToEstimate.at(i)->calculateLogPrior();
	}
	proposal_MCMCState->set_logPriorProb(logPrior);



	// Calculate log likelihood
	double logLikelihood = 0;
	for (int obsNum = 0; obsNum < calibrationObservations.size(); obsNum ++) {

		Parameter* obs = calibrationObservations.at(obsNum);

		// length = slope / distance + intercept
		double estimatedTranscriptLength = GelCalibrationSearch::slope->getVal(true) / obs->getVal(true) + GelCalibrationSearch::intercept->getVal(true);

		//cout << "pixel: " << obs->getVal(true) << ", estimatedTranscriptLength: " << estimatedTranscriptLength << ", trueLength: " << obs->getDistributionParameterValue("fixedDistnVal") << endl;
		logLikelihood += GelCalibrationSearch::getLogLikelihood(obs->getDistributionParameterValue("fixedDistnVal"), estimatedTranscriptLength, GelCalibrationSearch::sigma->getVal(true));

	}
	proposal_MCMCState->set_logLikelihood(logLikelihood);



	// Cache posterior
	double logPosterior = logLikelihood + logPrior;
	proposal_MCMCState->set_logPosterior(logPosterior);

	//cout << "logPosterior " << logPosterior << endl;


	// Accept or reject using Metropolis-Hastings ratio 
	if (sampleNum > 0){
		double runifNum = Settings::runif();
		double priorRatio = exp(proposal_MCMCState->get_logPosterior() - this_MCMCState->get_logPosterior());

		// Reject
		if (runifNum > priorRatio){
			return false;
		}

	}


	return true;

}



double GelCalibrationSearch::getLogLikelihood(double trueTranscriptLength, double estimatedTranscriptLengthMu, double estimatedTranscriptLengthSigma){
	return log(Settings::getNormalDensity(trueTranscriptLength, estimatedTranscriptLengthMu, estimatedTranscriptLengthSigma, -INFINITY, INFINITY));
}



int GelCalibrationSearch::getCurrentStateNumber(){
	return GelCalibrationSearch::currentMCMCstate->getStateNumber();
}


double GelCalibrationSearch::getAcceptanceRate(){
	if (GelCalibrationSearch::getCurrentStateNumber() == 0) return 0;
	return (1.0 * GelCalibrationSearch::nacceptances/(GelCalibrationSearch::getCurrentStateNumber()));
}