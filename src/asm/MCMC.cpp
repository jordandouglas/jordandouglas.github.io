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


#include "MCMC.h"

#include "State.h"
#include "Model.h"
#include "Parameter.h"
#include "SimulatorPthread.h"
#include "Settings.h"
#include "SimulatorResultSummary.h"



#include <iostream>
#include <list>
#include <math.h> 
#include <thread>

using namespace std;


list<ExperimentalData*>::iterator MCMC::currentExperiment;
list<Parameter*> MCMC::parametersToEstimate;
bool MCMC::hasAchievedBurnin;
bool MCMC::hasAchievedPreBurnin;
bool MCMC::hasFailedBurnin;
bool MCMC::initialised;
double MCMC::epsilon = 0;

int MCMC::nacceptances = 0;
int MCMC::nTrialsUntilBurnin = 0;
int MCMC::initialStateNum = 0;
int MCMC::nStatesUntilBurnin = -1;


PosteriorDistributionSample* MCMC::previousMCMCstate;
PosteriorDistributionSample* MCMC::currentMCMCstate;


void MCMC::initMCMC(bool uploadingLogFile){


	if (MCMC::initialised) return;

	_RUNNING_ABC = true;

	cout << "\nInitialising MCMC..." << endl;
	bool printToFile = outputFilename != "";


	// Reset GUI list of posterior distribution samples
	if(_USING_GUI) _GUI_posterior.clear();


	// Sample parameters and model
	Settings::sampleAll();

	// Build a list of parameters which need to be estimated
	MCMC::parametersToEstimate.clear();
	MCMC::hasAchievedBurnin = false;
	MCMC::hasAchievedPreBurnin = false;
	MCMC::hasFailedBurnin = false;

	MCMC::tryToEstimateParameter(hybridLen);
	MCMC::tryToEstimateParameter(bubbleLeft);
	MCMC::tryToEstimateParameter(bubbleRight);
	MCMC::tryToEstimateParameter(GDagSlide);
	MCMC::tryToEstimateParameter(DGPost);
	MCMC::tryToEstimateParameter(deltaGDaggerBacktrack);
	MCMC::tryToEstimateParameter(barrierPos);
	MCMC::tryToEstimateParameter(kCat);
	MCMC::tryToEstimateParameter(Kdiss);
	MCMC::tryToEstimateParameter(RateBind);
	MCMC::tryToEstimateParameter(RateActivate);
	MCMC::tryToEstimateParameter(RateDeactivate);
	MCMC::tryToEstimateParameter(RateCleave);
	MCMC::tryToEstimateParameter(CleavageLimit);


	// 2 states stored in memory
	MCMC::previousMCMCstate = new PosteriorDistributionSample(0, _numExperimentalObservations, true);
	// MCMC::currentMCMCstate = new PosteriorDistributionSample(0);



	// Load initial state from file
	if (_resumeFromLogfile){
		MCMC::previousMCMCstate->loadFromLogFile(outputFilename);
		MCMC::previousMCMCstate->setParametersFromState();
	}


	// Otherwise perform the first MCMC trial on the initial state
	else if (!uploadingLogFile){

		MCMC::metropolisHastings(0, MCMC::previousMCMCstate, nullptr);
		MCMC::previousMCMCstate->printHeader(printToFile);
		MCMC::previousMCMCstate->print(printToFile);

	}



	if(_USING_GUI && !uploadingLogFile) _GUI_posterior.push_back(MCMC::previousMCMCstate->clone(true));


	cout << "Estimating the following " << parametersToEstimate.size() << " parameters:" << endl;
	for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
		(*it)->print();
	}
	cout << endl;


	MCMC::nacceptances = 0;
	MCMC::nTrialsUntilBurnin = 0;
	MCMC::nStatesUntilBurnin = -1;


	// Intialise epsilon to the initial threshold value
	if (!uploadingLogFile){
		MCMC::initialStateNum = MCMC::previousMCMCstate->getStateNumber() + 1;
		MCMC::epsilon = max(_chiSqthreshold_0 * pow(_chiSqthreshold_gamma, MCMC::initialStateNum-1), _chiSqthreshold_min);
	}

	MCMC::initialised = true;


}

bool MCMC::isInitialised() {
	return MCMC::initialised;
}

// Reverse-initialisation
void MCMC::cleanup(){


	// Reset GUI list of posterior distribution samples
	for (list<PosteriorDistributionSample*>::iterator it = _GUI_posterior.begin(); it != _GUI_posterior.end(); ++it){
		delete *it;
	}
	if(_USING_GUI) _GUI_posterior.clear();

	MCMC::initialised = false;
	delete previousMCMCstate;
	delete currentMCMCstate;


	MCMC::parametersToEstimate.clear();
	MCMC::hasAchievedBurnin = false;
	MCMC::hasAchievedPreBurnin = false;
	MCMC::hasFailedBurnin = false;
	MCMC::epsilon = 0;
	MCMC::nacceptances = 0;
	MCMC::nTrialsUntilBurnin = 0;
	MCMC::nStatesUntilBurnin = -1;
	MCMC::initialStateNum = 0;

	
}


void MCMC::beginMCMC(){


	_RUNNING_ABC = true;


	//Settings::print();
	for (int n = MCMC::initialStateNum; n <= ntrials_abc; n ++){
		MCMC::perform_1_iteration(n);
	}


	_RUNNING_ABC = false;

}




void MCMC::perform_1_iteration(int n){

	if ((n == MCMC::initialStateNum || n % logEvery == 0) && !_USING_GUI){
		cout << "Performing MCMC trial " << n << "; epsilon = " << MCMC::epsilon << "; Acceptance rate = " << ((double)MCMC::nacceptances/(n - MCMC::nTrialsUntilBurnin - MCMC::initialStateNum + 1)) <<  endl;
	}


	// Update threshold epsilon
	if (MCMC::epsilon > _chiSqthreshold_min){
		MCMC::epsilon = max(MCMC::epsilon * _chiSqthreshold_gamma, _chiSqthreshold_min);
	}


	// If almost at epsilon then switch to the large number of tests per datapoint
	if (!MCMC::hasAchievedPreBurnin && MCMC::epsilon <= _chiSqthreshold_min * 2){
		MCMC::hasAchievedPreBurnin = true;
		cout << "------- Pre-burn-in reached. Number of trials per datapoint = " << testsPerData << " -------" << endl;
	}
	
	
	// See if burnin has been achieved. Once it has, print it out in console and reset the acceptance rate
	if (!MCMC::hasAchievedBurnin && MCMC::epsilon <= _chiSqthreshold_min && MCMC::previousMCMCstate->get_chiSquared() <= MCMC::epsilon){
		MCMC::hasAchievedBurnin = true;
		MCMC::nTrialsUntilBurnin = n - MCMC::initialStateNum + 1;
		MCMC::nacceptances = 0;
		cout << "------- Burn-in achieved. Resetting acceptance rate. -------" << endl;
	}
	
	
	// Temp HACK: if burnin has not been achieved but it should have then exit
	if (!MCMC::hasAchievedBurnin && MCMC::epsilon <= _chiSqthreshold_min && MCMC::previousMCMCstate->get_chiSquared() > MCMC::epsilon){
		
		// Wait 500 states after convergence has failed until exiting
		double cutoff = log(_chiSqthreshold_min / _chiSqthreshold_0) / log(_chiSqthreshold_gamma) + 500;
		if (n > cutoff){
			MCMC::hasFailedBurnin = true;
			cout << "------- Burn-in failed. Exiting now. -------" << endl;
			if (!_USING_GUI) exit(0);
		}
	}
	


	// Make proposal and alter the parameters to those of the new state
	makeProposal();



	// Accept or reject
	MCMC::currentMCMCstate = new PosteriorDistributionSample(n, _numExperimentalObservations, true);
	bool accepted = MCMC::metropolisHastings(n, MCMC::currentMCMCstate, MCMC::previousMCMCstate);

	//currentMCMCstate->print(false);



	// Accept
	if (accepted){
		
		MCMC::nacceptances ++;
		//cout << "Accept" << endl;


		delete MCMC::previousMCMCstate;
		MCMC::previousMCMCstate = MCMC::currentMCMCstate;



		//currentMCMCstate->print(false);

		// Reset all parameters to make their new value final
		for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
			(*it)->acceptProposal();
		}
	}

	// If reject then restore parameters to those of the previous state
	// This code has no knowledge of which parameter was changed
	else{

		//cout << "Reject" << endl;



		delete MCMC::currentMCMCstate;
		MCMC::currentMCMCstate = MCMC::previousMCMCstate;
		MCMC::currentMCMCstate->setStateNumber(n);
		if (_sampleModels) Settings::setModel(MCMC::currentMCMCstate->get_modelIndicator());



		// Revert all parameters to their cached previous values
		for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
			(*it)->rejectProposal();
		}
		currentModel->activateModel();

	}


	// Log
	if (n % logEvery == 0){
		MCMC::currentMCMCstate->print(outputFilename != "");
		if(_USING_GUI) {
			_GUI_posterior.push_back(MCMC::currentMCMCstate->clone(true));
			if (MCMC::hasAchievedBurnin && MCMC::nStatesUntilBurnin == -1) MCMC::nStatesUntilBurnin = _GUI_posterior.size() - 1;
		}
	}

}





// Looks at the parameters to estimate (and model indicator?) and chooses one uniformly at random to change
// Will also change the global parameters
void MCMC::makeProposal(){


	// Determine how many parameters there are
	int nParams = parametersToEstimate.size();
	int nParamsIncludingModelIndicator = _sampleModels ? nParams + 1 : nParams;
	double runifNum = (int)(Settings::runif() * (nParamsIncludingModelIndicator)); // Random integer in range [0, nParamsIncludingModelIndicator-1]

	// Change the model indicator
	if (runifNum >= nParams){
		Settings::sampleModel();
	}

	else {


		// Make proposal for one parameter. If a parameter has 2 instances then it has double the chance of being selected
		int index = 0;
		for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
	
			if (runifNum == index){
				(*it)->makeProposal();
				break;
			}
			index ++;

		}

		// Update the global settings to apply the parameters in this model
		currentModel->activateModel();

	}

}




// Apply a trial and accept / reject the newly proposed parameters
// The PosteriorDistributionSample object parsed will be overwritten and populated with the appropriate details
// Returns true if accept, false if reject
// If the sampleNum is 0, it will always be accepted
bool MCMC::metropolisHastings(int sampleNum, PosteriorDistributionSample* this_MCMCState, PosteriorDistributionSample* prev_MCMCState){
	
	

	if (!MCMC::resetExperiment()){
		cout << "Could not initialise experiment" << endl;
		exit(0);
	}



	// Cache the parameter values in posterior row object
	for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
		this_MCMCState->addParameterEstimate((*it)->getID(), (*it)->getTrueVal());
	}
	if (_sampleModels) this_MCMCState->set_modelIndicator(currentModel->getID());



	// Calculate prior probability
	this_MCMCState->set_logPriorProb(MCMC::calculateLogPriorProbability());


	// Efficiency: sample from the Metropolis prior-ratio now instead of after the simulation. If rejected then don't bother simulating
	if (sampleNum > 0){
		double runifNum = Settings::runif();
		double priorRatio = exp(this_MCMCState->get_logPriorProb() - prev_MCMCState->get_logPriorProb());

		// Reject
		if (runifNum > priorRatio){
			return false;
		}

		// Otherwise perform simulation to determine whether to accept

	}

	// Iterate through all experimental settings and perform simulations at each setting. The velocities/densities generated are cached in the posterior object

	// Run simulations and stop if it exceeds threshold (unless this is the first trial)
	int ntrialsPerDatapoint = MCMC::getNTrials();
	SimulatorResultSummary* simulationResults = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);



	this_MCMCState->addSimulatedAndObservedValue(simulationResults, (*currentExperiment));
	simulationResults->clear();
	delete simulationResults;

	if (this_MCMCState->get_chiSquared() > MCMC::epsilon && sampleNum > 0) {
		return false;
	}


	while (MCMC::nextExperiment()){


		// Run simulations and stop if it exceeds threshold (unless this is the first trial)
		ntrialsPerDatapoint = MCMC::getNTrials();
		simulationResults = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
		this_MCMCState->addSimulatedAndObservedValue(simulationResults, (*currentExperiment));

		simulationResults->clear();
		delete simulationResults;

		if (this_MCMCState->get_chiSquared() > MCMC::epsilon && sampleNum > 0) {
			return false;
		}

	}


	// Exceeds threshold -> reject
	if (this_MCMCState->get_chiSquared() > MCMC::epsilon && sampleNum > 0) return false;


	return true;

}


// Sees if this parameter should be estimated or not and if so adds to "parametersToEstimate"
void MCMC::tryToEstimateParameter(Parameter* param){

	if (param->get_isMetaParameter()){
		for (int i = 0; i < param->getNumberInstances(); i++){
			MCMC::tryToEstimateParameter(param->getParameterInstances().at(i));
		}
	}

	else if (param->getPriorDistributionName() != "Fixed") parametersToEstimate.push_back(param);

}

// Calculates the log prior probability of the current model/parameters
double MCMC::calculateLogPriorProbability(){

	double logPrior = 0;

	 
	// Model prior
	if (_sampleModels){

		// Calculate model weight sum
		double weightSum = 0;
		for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
			weightSum += (*it)->getPriorProb();
		}


		logPrior += log(currentModel->getPriorProb() / weightSum);

	}


	// Parameter priors
	for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
		logPrior += (*it)->calculateLogPrior();
	}
	return logPrior;

}



// Apply the settings described in experiment 1 observation 1 to the current model settings 
bool MCMC::resetExperiment(){

	
	if (experiments.size() == 0) return false;
	currentExperiment = experiments.begin();

	// Apply settings
	Settings::clearParameterHardcodings();
	currentModel->activateModel();
	(*currentExperiment)->reset();

	return true;


}


// Move onto the next experimental setting. If the current experiment has run out of observations then move onto next experiment
bool MCMC::nextExperiment(){

	// Attempt to apply the settings of the next observation in the current experiment
	Settings::clearParameterHardcodings();
	currentModel->activateModel();
	if ((*currentExperiment)->next()) {
		//cout << "Next setting" << endl;
		//Settings::print();
		return true;
	}

	// If fails then move onto next experiment
	++currentExperiment;
	if (currentExperiment == experiments.end()) return false;

	(*currentExperiment)->reset();

	//cout << "Next experiment" << endl;
	//Settings::print();

	return true;
}



// Returns the velocity of the current experiment
double MCMC::getExperimentalVelocity(){
	return (*currentExperiment)->getObservation();
}



// Returns the number of trials to perform for the current experimrnt
int MCMC::getNTrials(){

	if ((*currentExperiment)->getNTrials() != 0) return (*currentExperiment)->getNTrials();

	// Run a different number of trials pre- and post- pre-burnin
	return MCMC::hasAchievedPreBurnin || _testsPerData_preburnin < 0 ? testsPerData : _testsPerData_preburnin; 

}


// Returns the number of trials to perform for the current experimrnt
int MCMC::getNTrialsPostBurnin(){

	if ((*currentExperiment)->getNTrials() != 0) return (*currentExperiment)->getNTrials();
	return testsPerData; 

}

double MCMC::getAcceptanceRate(){
	return ((double)MCMC::nacceptances/((MCMC::getPreviousStateNumber()+1) - MCMC::nTrialsUntilBurnin - MCMC::initialStateNum + 1));
}



int MCMC::getPreviousStateNumber(){
	return MCMC::previousMCMCstate->getStateNumber();
}


bool MCMC::get_hasFailedBurnin(){
	return MCMC::hasFailedBurnin;
}

string MCMC::getStatus(){

	if (MCMC::hasFailedBurnin) return "Convergence failed.";
	if (MCMC::hasAchievedBurnin) return "Convergence achieved.";
	if (MCMC::hasAchievedPreBurnin) return "Approaching convergence.";
	return "Searching.";

}

double MCMC::getEpsilon(){
	return MCMC::epsilon;
}


void MCMC::setPreviousState(PosteriorDistributionSample* state){

	MCMC::previousMCMCstate = state;
	MCMC::epsilon = max(_chiSqthreshold_0 * pow(_chiSqthreshold_gamma, state->getStateNumber()), _chiSqthreshold_min);



	double cutoff = log(_chiSqthreshold_min / _chiSqthreshold_0) / log(_chiSqthreshold_gamma) + 500;


	// Check if burnin has been achieved
	if (MCMC::epsilon <= _chiSqthreshold_min && MCMC::previousMCMCstate->get_chiSquared() <= MCMC::epsilon) MCMC::hasAchievedBurnin = true;


	// Check if burnin has failed
	else if (state->getStateNumber() > cutoff) MCMC::hasFailedBurnin = true;
	

	// Check if pre-burnin has been achieved
	if (MCMC::epsilon <= _chiSqthreshold_min * 2) MCMC::hasAchievedPreBurnin = true;


	// The state where convergence was achieved
	if (MCMC::hasAchievedBurnin) MCMC::nStatesUntilBurnin = ceil(cutoff - 500) / logEvery;


}


int MCMC::get_nStatesUntilBurnin(){
	return MCMC::nStatesUntilBurnin;
}


ExperimentalData* MCMC::getCurrentExperiment(){
	return (*currentExperiment);
}


// Return a JSON string of all parameters being estimated
string MCMC::parametersToEstimate_toJSON(){

	string JSON = "";
	for (list<Parameter*>::iterator it = MCMC::parametersToEstimate.begin(); it != MCMC::parametersToEstimate.end(); ++it) {
		JSON += (*it)->toJSON() + ",";
	}
	if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
	return JSON;

}


void MCMC::activatePreviousState() {
	MCMC::previousMCMCstate->setParametersFromState();
}