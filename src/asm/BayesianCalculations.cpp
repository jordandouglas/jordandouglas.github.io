﻿/* 
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


#include "BayesianCalculations.h"
#include "Settings.h"
#include "MCMC.h"
#include "SimulatorPthread.h"
#include "Model.h"

#include <iostream>
#include <vector>
#include <list>
#include <string>
#include <fstream>
#include <sstream>
#include <regex>
#include <map>


using namespace std;


// Loads all states in the logfile (post-burnin only)
vector<PosteriorDistriutionSample*> BayesianCalculations::loadLogFile(string logFileName, double epsilon){

	
	ifstream logfile;
	string line;
    logfile.open(logFileName);
    list<PosteriorDistriutionSample*> states;
    if(logfile.is_open()) {

    	
		// Parse header
    	getline(logfile, line);
    	vector<string> headerLineSplit = Settings::split(line, '\t');

    	//cout << "line: " << line << endl;
    	//for (int i = 0; i < headerLineSplit.size(); i ++) cout << headerLineSplit.at(i) << endl;
    	//cout << headerLineSplit.at(54) << endl;

    	// Iterate through states in logfile and build list of burnin states
        while(getline(logfile, line)) {


        	if (line == "") continue;

        	// Parse state
          	PosteriorDistriutionSample* state = new PosteriorDistriutionSample(0);
        	state->parseFromLogFileLine(line, headerLineSplit);




        	// Check if X2 <= epsilon. If so then add to the list. 
        	if (state->get_chiSquared() <= epsilon){
        		states.push_back(state);
        	}

        	// If not then delete this state and also clear the list of states since we now know that burnin has not been achieved
        	else{
        		delete state;
        		states.clear();
        	}

        }


        cout << states.size() << " states post-burnin (X2 <= " << epsilon << ")" << endl;
        logfile.close();






        vector<PosteriorDistriutionSample*> states_vector{ std::begin(states), std::end(states) };

        states_vector.at(5)->printHeader(false);
        states_vector.at(5)->print(false);

        return states_vector;

   }

   else{
   		cout << "Cannot parse file " << logFileName << endl;
   		exit(0);
   }


}


// Calculate and print number of times each model appears in the posterior distribution 
void BayesianCalculations::printModelFrequencies(vector<PosteriorDistriutionSample*> posteriorDistribution){

	if (modelsToEstimate.size()) {


		cout << "\n------ Calculating model posterior probabilities ------" << endl;

		// Count the number of times each model appears
		map<string,int> modelFrequencies;
		for (int i = 0; i < posteriorDistribution.size(); i++) {
			string modelID = posteriorDistribution.at(i)->get_modelIndicator();
			modelFrequencies[modelID] ++;
		}

		// Print
		for(std::map<string, int>::iterator iter = modelFrequencies.begin(); iter != modelFrequencies.end(); ++iter){
			string k =  iter->first;
			int v = iter->second;

			cout << "P(M = " << k << "|D) = " << (double(v) /  double(posteriorDistribution.size())) << endl;

		}

		cout << "-------------------------------------------------------\n" << endl;

	}

}


// Partition the posterior distribution into models and calculate the geometric median for each
void BayesianCalculations::printMarginalGeometricMedians(vector<PosteriorDistriutionSample*> states){

	

	if (modelsToEstimate.size()) {


		for (list<Model>::iterator model = modelsToEstimate.begin(); model != modelsToEstimate.end(); ++model){

			// Compile a list of states which use this model
			list<PosteriorDistriutionSample*> statesThisModel;
			for (int j = 0; j < states.size(); j++) {
				if (states.at(j)->get_modelIndicator() == (*model).getID()) statesThisModel.push_back(states.at(j));
			}


			if (statesThisModel.size() == 0) continue;


			// Convert list into vector
			vector<PosteriorDistriutionSample*> statesThisModel_vector{ std::begin(statesThisModel), std::end(statesThisModel) };


			// Print geometric median
			cout << "\n------ Calculating geometric median for Model " << (*model).getID() << "------" << endl;
			BayesianCalculations::printGeometricMedian(statesThisModel_vector, false);
			cout << "------------------------------------------------------\n" << endl;

		}


	}


}



// Calculate and print geometric median for each parameter
PosteriorDistriutionSample* BayesianCalculations::printGeometricMedian(vector<PosteriorDistriutionSample*> states, bool printBanners){

	if (printBanners) cout << "\n------ Calculating geometric median ------" << endl;

	if (states.size() == 0){
		cout << "Cannot calculate geometric median for 0 states" << endl;
		return nullptr;
	}

	cout << "Number of states: " << states.size() << endl;

	// Get list of parameters
	vector<string> paramIDs = states.at(0)->getParameterNames();


	// Normalise each parameter into a z-score
	vector<PosteriorDistriutionSample*> normalisedStates(states.size());
	for (int j = 0; j < states.size(); j++) normalisedStates.at(j) = states.at(j)->clone(true);


	for (int i = 0; i < paramIDs.size(); i ++){

		string paramID = paramIDs.at(i);

		// Calculate mean
		double mean = 0;
		for (int j = 0; j < normalisedStates.size(); j++) mean += normalisedStates.at(j)->getParameterEstimate(paramID);
		mean /= normalisedStates.size();


		// Calculate sd
		double sd = 0;
		for (int j = 0; j < normalisedStates.size(); j++) sd += std::pow(normalisedStates.at(j)->getParameterEstimate(paramID) - mean, 2);
		sd = std::sqrt(sd / normalisedStates.size());
		if (sd == 0) sd = 1;
		//cout << paramID << ": mean = " << mean << ", sd = " << sd  << endl;


		// Normalise into z-scores
		for (int j = 0; j < normalisedStates.size(); j++) {
			double zscore = (normalisedStates.at(j)->getParameterEstimate(paramID) - mean) / sd;
			normalisedStates.at(j)->addParameterEstimate(paramID, zscore);
		}

	}


	// Calculate the euclidean distance between all pairs of samples
	double** euclideanDistances = new double*[normalisedStates.size()];
	for (int j = 0; j < states.size(); j++) euclideanDistances[j] = new double[normalisedStates.size()];

	// For each state j
	for (int j = 0; j < states.size(); j++) {
		PosteriorDistriutionSample* state_j = normalisedStates.at(j);

		// For each state k>j
		for (int k = j+1; k < states.size(); k++) {
			PosteriorDistriutionSample* state_k = normalisedStates.at(k);

			// For each parameter
			double distance = 0;
			for (int i = 0; i < paramIDs.size(); i ++){
				string paramID = paramIDs.at(i);
				distance += pow(state_j->getParameterEstimate(paramID) - state_k->getParameterEstimate(paramID), 2);
		 	} 

		 	// Cache euclidean distance
		 	distance = std::sqrt(distance);
			euclideanDistances[j][k] = distance;
			euclideanDistances[k][j] = distance;

		}

	}


	// Find the state which has the smallest total Euclidean distance to all other points
	double smallestDistance = INFINITY;
	int stateWithShortestDistance = -1;
	for (int j = 0; j < states.size(); j++) {

		// Compute total distance
		double totalDistance = 0;
		for (int k = 0; k < states.size(); k++) totalDistance += euclideanDistances[j][k];

		//cout << "Distance = " << totalDistance << endl;

		if (totalDistance < smallestDistance){
			smallestDistance = totalDistance;
			stateWithShortestDistance = j;
		}

	}
	double meanDistance = smallestDistance / states.size();


	// Print out the (unnormalised) state which has the shortest distance. This state is the geometric median
	PosteriorDistriutionSample* geometricMedian = states.at(stateWithShortestDistance);

	cout << "The geometric median is state " <<  geometricMedian->getStateNumber() << endl;
	if (geometricMedian->get_modelIndicator() != "") cout << "Model " << geometricMedian->get_modelIndicator() << endl;
	for (int i = 0; i < paramIDs.size(); i ++){
		string paramID = paramIDs.at(i);
		cout << paramID << " = " <<  geometricMedian->getParameterEstimate(paramID) << endl;
	}
	cout << "logPrior = " << geometricMedian->get_logPriorProb() << endl;
	cout << "X2 = " << geometricMedian->get_chiSquared() << endl;
	cout << "Mean (z-score normalised) Euclidean distance to all other states = " << meanDistance << endl;

	//geometricMedian->print(false);


	if (printBanners) cout << "-------------------------------------------\n" << endl;


	return geometricMedian;

}




// Simulate N trials times under each experimental setting. If posteriorDistribution is not parsed then will sample from the prior
void BayesianCalculations::sampleFromPosterior(vector<PosteriorDistriutionSample*> posteriorDistribution){


	bool samplingFromPosterior = posteriorDistribution.size() > 0;
	cout << "Sampling new data " << ntrials_sim << " times...\n" << endl;

	if (outputFilename != "") cout << "Printing results to " << outputFilename << endl;

	// Perform N trials
	for (int n = 1; n <= ntrials_sim; n ++){


		PosteriorDistriutionSample* state = new PosteriorDistriutionSample(n);

		// Sample parameters from posterior distribution
		if (samplingFromPosterior) {

			int stateToSample = std::floor(Settings::runif() * posteriorDistribution.size());
			PosteriorDistriutionSample* posteriorSample = posteriorDistribution.at(stateToSample);
			posteriorSample->setParametersFromState();

			// Clone the state but not the simulation results
			delete state;
			state = posteriorSample->clone(false);
			state->setStateNumber(n);


		}

		// Sample parameters from prior
		else {

			Settings::sampleAll();

			// Cache the parameter values in posterior row object
			for (int i = 0; i < Settings::paramList.size(); i ++){
				Parameter* param = Settings::paramList.at(i);
				state->addParameterEstimate(param->getID(), param->getTrueVal());
			}
			if (modelsToEstimate.size()) state->set_modelIndicator(currentModel->getID());


		}

		if (n == 1) state->printHeader(outputFilename != "");



		if (!MCMC::resetExperiment()){
			cout << "Could not initialise experiment" << endl;
			exit(0);
		}

		// Run simulations under each experimental setting
		int ntrialsPerDatapoint = MCMC::getNTrialsPostBurnin();


		double simulatedVelocity = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
		state->addSimulatedAndObservedValue(simulatedVelocity, MCMC::getExperimentalVelocity());


		while (MCMC::nextExperiment()){

			// Run simulations and stop if it exceeds threshold (unless this is the first trial)
			ntrialsPerDatapoint = MCMC::getNTrialsPostBurnin();
			simulatedVelocity = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
			state->addSimulatedAndObservedValue(simulatedVelocity, MCMC::getExperimentalVelocity());

		}


		state->print(outputFilename != "");
		delete state;

	}

}






