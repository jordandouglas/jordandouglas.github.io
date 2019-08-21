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


#include "BayesianCalculations.h"
#include "Settings.h"
#include "MCMC.h"
#include "SimulatorPthread.h"
#include "Simulator.h"
#include "Model.h"
#include "SitewiseSummary.h"
#include "MultipleSequenceAlignment.h"
#include "State.h"


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
vector<PosteriorDistributionSample*> BayesianCalculations::loadLogFile(string logFileName, double epsilon){

	
	ifstream logfile;
	string line = "";
    logfile.open(logFileName);
    list<PosteriorDistributionSample*> states;
    if(logfile.is_open()) {




		// Parse header
    	//getline(logfile, line);
    	while (line == "") getline(logfile, line);
    	vector<string> headerLineSplit = Settings::split(line, '\t');



    	// Iterate through states in logfile and build list of burnin states
    	vector<string> splitLine;
        while(getline(logfile, line)) {
        	
        	
        	if (line == "") continue;
            

        	// Parse state
          	PosteriorDistributionSample* state = new PosteriorDistributionSample(0, _numExperimentalObservations, true);
          	splitLine = Settings::split(line, '\t');
            if (splitLine.size() != headerLineSplit.size()) {
                cout << "ERROR: cannot parse line:\n" << line << endl;
                exit(0);
            }
        	state->parseFromLogFileLine(splitLine, headerLineSplit);

            //state->print(false);


        	// Check if X2 <= epsilon. If so then add to the list. 
        	if (state->get_chiSquared() <= epsilon){
        		states.push_back(state);
        	}

        	// If not then delete this state and also clear the list of states since we now know that burnin has not been achieved
        	else{
        		delete state;
        		states.clear();
        	}

        	splitLine.clear();

        }


        cout << states.size() << " states post-burnin (X2 <= " << epsilon << ")" << endl;
        logfile.close();




        vector<PosteriorDistributionSample*> states_vector{ std::begin(states), std::end(states) };
        
        /*
        if (states_vector.size() > 0){
            states_vector.at(0)->printHeader(false);
            states_vector.at(0)->print(false);
        }
        */
        
        
        headerLineSplit.clear();

        return states_vector;

   }

   else{
   		cout << "Cannot parse file " << logFileName << endl;
   		exit(0);
   }


}


// Calculate and print number of times each model appears in the posterior distribution 
void BayesianCalculations::printModelFrequencies(vector<PosteriorDistributionSample*> posteriorDistribution){

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
void BayesianCalculations::printMarginalGeometricMedians(vector<PosteriorDistributionSample*> states){

	

	if (modelsToEstimate.size()) {


		for (deque<Model*>::iterator model = modelsToEstimate.begin(); model != modelsToEstimate.end(); ++model){

			// Compile a list of states which use this model
			list<PosteriorDistributionSample*> statesThisModel;
			for (int j = 0; j < states.size(); j++) {
				if (states.at(j)->get_modelIndicator() == (*model)->getID()) statesThisModel.push_back(states.at(j));
			}


			if (statesThisModel.size() == 0) continue;


			// Convert list into vector
			vector<PosteriorDistributionSample*> statesThisModel_vector{ std::begin(statesThisModel), std::end(statesThisModel) };


			// Print geometric median
			cout << "\n------ Calculating geometric median for Model " << (*model)->getID() << "------" << endl;
			BayesianCalculations::getGeometricMedian(statesThisModel_vector, true, false);
			cout << "------------------------------------------------------\n" << endl;

		}


	}


}



// Calculate and print geometric median for each parameter. If print is true then will print
PosteriorDistributionSample* BayesianCalculations::getGeometricMedian(vector<PosteriorDistributionSample*> states, bool print, bool printBanners){



	if (print & printBanners) cout << "\n------ Calculating geometric median ------" << endl;

	if (states.size() == 0){
		cout << "Cannot calculate geometric median for 0 states" << endl;
		return nullptr;
	}

	if (print) cout << "Number of states: " << states.size() << endl;

	// Get list of parameters
	vector<string> paramIDs = states.at(0)->getParameterNames();


	// Normalise each parameter into a z-score
	vector<PosteriorDistributionSample*> normalisedStates(states.size());
	for (int j = 0; j < states.size(); j++) normalisedStates.at(j) = states.at(j)->clone(true);


	for (int i = 0; i < paramIDs.size(); i ++){

		string paramID = paramIDs.at(i);
		
		
		// If integer, then use Hamming distance instead
		if (Settings::getParameterByName(paramID)->isInteger()) {
			continue;
		}

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
        double zscore;
		for (int j = 0; j < normalisedStates.size(); j++) {
			zscore = (normalisedStates.at(j)->getParameterEstimate(paramID) - mean) / sd;
			normalisedStates.at(j)->addParameterEstimate(paramID, zscore);
		}

	}


	// Calculate the euclidean distance between all pairs of samples
	double** euclideanDistances = new double*[normalisedStates.size()];
    PosteriorDistributionSample* state_j;
    PosteriorDistributionSample* state_k;
	for (int j = 0; j < states.size(); j++) euclideanDistances[j] = new double[normalisedStates.size()];

	// For each state j
	for (int j = 0; j < states.size(); j++) {
		state_j = normalisedStates.at(j);

		// For each state k>j
		for (int k = j+1; k < states.size(); k++) {
			state_k = normalisedStates.at(k);

			// For each parameter
			double distance = 0;
			for (int i = 0; i < paramIDs.size(); i ++){
				string paramID = paramIDs.at(i);
				
				// If integer, then use Hamming distance instead
				if (Settings::getParameterByName(paramID)->isInteger()) {
					distance += state_j->getParameterEstimate(paramID) == state_k->getParameterEstimate(paramID) ? 0 : 1;
				}
				
				// Continuous
				else distance += pow(state_j->getParameterEstimate(paramID) - state_k->getParameterEstimate(paramID), 2);
		 	} 

		 	// Cache euclidean distance
		 	distance = std::sqrt(distance);
			euclideanDistances[j][k] = distance;
			euclideanDistances[k][j] = distance;
            
            
            //state_j->clear();
            //state_k->clear();
            
           
            //delete state_k;

		}
        
        
        //delete state_j;

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
	PosteriorDistributionSample* geometricMedian = states.at(stateWithShortestDistance);

	if (print) {
		cout << "The geometric median is state " <<  geometricMedian->getStateNumber() << endl;
		if (geometricMedian->get_modelIndicator() != "") cout << "Model " << geometricMedian->get_modelIndicator() << endl;
		for (int i = 0; i < paramIDs.size(); i ++){
			string paramID = paramIDs.at(i);
			cout << paramID << " = " <<  geometricMedian->getParameterEstimate(paramID) << endl;
		}
		cout << "logPrior = " << geometricMedian->get_logPriorProb() << endl;
		cout << "X2 = " << geometricMedian->get_chiSquared() << endl;
		cout << "Mean (z-score normalised) Euclidean distance to all other states = " << meanDistance << endl;
	}
	//geometricMedian->print(false);


	if (print && printBanners) cout << "-------------------------------------------\n" << endl;


	return geometricMedian;

}




// Simulate N trials times under each experimental setting. If posteriorDistribution is not parsed then will sample from the prior
void BayesianCalculations::sampleFromPosterior(vector<PosteriorDistributionSample*> posteriorDistribution){


	bool samplingFromPosterior = posteriorDistribution.size() > 0;
	cout << "Sampling new data " << ntrials_sim << " times...\n" << endl;
    
    string ROCoutputfile = "";
	if (_outputFilename != "") {
    
    
        cout << "Printing results to " << _outputFilename << endl;
    
        // Check if any of the experiments are using a ROC analysis
        bool ROCanalysis = false;
        for (list<ExperimentalData*>::iterator it = experiments.begin(); it != experiments.end(); ++it){
            if ((*it)->doingROCanalysis()){
                ROCanalysis = true;
                break;
            }
        }
        
        if (ROCanalysis) {
    
            vector<string> fileNameSplit = Settings::split(_outputFilename, '.');
            if (fileNameSplit.size() == 1) ROCoutputfile = _outputFilename + "_ROC";
            else {
            
                for (int i = 0; i < fileNameSplit.size()-1; i ++){
                    ROCoutputfile += fileNameSplit.at(i);
                    if (i < fileNameSplit.size() - 2) ROCoutputfile += ".";
                }
                ROCoutputfile += "_ROC." + fileNameSplit.at(fileNameSplit.size() - 1);
            
            }
            
            cout << "Printing ROC analysis results to " << ROCoutputfile << endl;
            
        }
        
        
    }
    
    if (!samplingFromPosterior) {
        cout << "Initialising R-ABC" << endl;
        MCMC::initMCMC(false, false);
    }
    
    
	// Perform N trials
	for (int n = 1; n <= ntrials_sim; n ++){


		PosteriorDistributionSample* state = new PosteriorDistributionSample(n, _numExperimentalObservations, true);

		// Sample parameters from posterior distribution
		if (samplingFromPosterior) {

			int stateToSample = std::floor(Settings::runif() * posteriorDistribution.size());
			PosteriorDistributionSample* posteriorSample = posteriorDistribution.at(stateToSample);
			posteriorSample->setParametersFromState();

			// Clone the state but not the simulation results
			delete state;
			state = posteriorSample->clone(false);
			state->setStateNumber(n);


		}

		// Sample parameters from prior. Only report the values of parameters which have prior distributions
		else {
        
            
        
			Settings::sampleAll();
            
            // Cache the estimated parameter value in posterior row object
            for (list<Parameter*>::iterator it = MCMC::get_parametersToEstimate()->begin(); it != MCMC::get_parametersToEstimate()->end(); ++it){
                //(*it)->print();
                state->addParameterEstimate((*it)->getID(), (*it)->getTrueVal());
            }
            if (modelsToEstimate.size() > 1) state->set_modelIndicator(currentModel->getID());
            state->set_logPriorProb(MCMC::calculateLogPriorProbability());
            

		}
        
        
        if (n == 1) state->printHeader(_outputFilename != "");
        
        perform_1_rejectionABC_iteration(state);
        
        state->print(_outputFilename != "");
        delete state;
		

  

		

	}

}



// Samples a single state from posterior distribution using ABC. 
// Provide a state populated with parameters, and it will be returned post-simulation
void BayesianCalculations::perform_1_rejectionABC_iteration(PosteriorDistributionSample* state){


    //cout << "Current model " << currentModel->getID() << " | " << currentModel->toJSON() << endl;

    if (!MCMC::resetExperiment()){
        cout << "Could not initialise experiment" << endl;
        exit(0);
    }

    // Run simulations under each experimental setting
    int ntrialsPerDatapoint = MCMC::getNTrialsPostBurnin();


    SimulatorResultSummary* simulationResults = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
    state->addSimulatedAndObservedValue(simulationResults, MCMC::getCurrentExperiment());
    
    
    simulationResults->clear();
    delete simulationResults;

    while (MCMC::nextExperiment()){

        // Run simulations and stop if it exceeds threshold (unless this is the first trial)
        ntrialsPerDatapoint = MCMC::getNTrialsPostBurnin();
        simulationResults = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
        state->addSimulatedAndObservedValue(simulationResults, MCMC::getCurrentExperiment());
        
        
        simulationResults->clear();
        delete simulationResults;

    }
    
    
    // Finished all experiments. Calculate the AUC of this state (if evaluating pause sites)
    state->calculateAUC(false, false);




}



// Returns the GUI posterior distribution in a format where it can be printed on a heatmap
list<ParameterHeatmapData*> BayesianCalculations::getPosteriorDistributionAsHeatmap(int id){


	list<PosteriorDistributionSample*> posteriorDistribution = Settings::getPosteriorDistributionByID(id);
    
    
    // Subset the posterior distribution if using R-ABC
    if (inferenceMethod == "ABC"){
    
        int n = 0;
        int stopAt = floor(_RABC_quantile * posteriorDistribution.size());
        
        if (stopAt == 0) posteriorDistribution.clear();
        else {
            list<PosteriorDistributionSample*> temp;
            for (list<PosteriorDistributionSample*>::iterator it = posteriorDistribution.begin(); it != posteriorDistribution.end(); ++ it){
                n++;
                if (n <= stopAt) temp.push_back(*it);
                else break;
            }
            posteriorDistribution = temp;
            
        }
        
    
    }
    


	// The posterior distribution is stored as rows, while the heatmap is stored as columns
	list<ParameterHeatmapData*> heatMapData;
	if (posteriorDistribution.size() == 0) return heatMapData;


	// One heatmap object for each parameter in the posterior + chiSq + prior + histogram probability
	heatMapData.push_back(new ParameterHeatmapData("probability", "Probability density"));
	heatMapData.push_back(new ParameterHeatmapData("logPrior", "Log Prior"));

	if (!posteriorDistribution.front()->isABC()){
		heatMapData.push_back(new ParameterHeatmapData("logLikelihood", "Log Likelihood"));
		heatMapData.push_back(new ParameterHeatmapData("logPosterior", "Log Posterior"));
	}else{
		heatMapData.push_back(new ParameterHeatmapData("chiSq", "Distance rho", "Distance \u03C1"));
	}
	heatMapData.push_back(new ParameterHeatmapData("state", "State"));
	for (int i = 0; i < posteriorDistribution.front()->getParameterNames().size(); i++){
		string paramID = posteriorDistribution.front()->getParameterNames().at(i);
		Parameter* param = Settings::getParameterByName(paramID);

		string paramName;
		string paramLatexName = "";
		if (param == nullptr) {
			if (paramID == "slope") paramName = "Slope";
			else if (paramID == "intercept") paramName = "Intercept";
			else if (paramID == "sigma") {
				paramName = "Variance";
				paramLatexName = "\u03C3^{2}";
			}
			else continue;
		}

		else {
			paramName = param->getName();
			paramLatexName = param->getLatexName();
		}

		heatMapData.push_back(new ParameterHeatmapData(paramID, paramName, paramLatexName));
	}


	// Iterate through each column and populate it with estimates from the rows
	for (list<ParameterHeatmapData*>::iterator col = heatMapData.begin(); col != heatMapData.end(); ++col){

		string paramID = (*col)->getID();
		if (paramID == "probability") continue;


		for (list<PosteriorDistributionSample*>::iterator row = posteriorDistribution.begin(); row != posteriorDistribution.end(); ++row){

			if (paramID == "chiSq") (*col)->addValue( (*row)->get_chiSquared() );
			else if (paramID == "logPrior") (*col)->addValue( (*row)->get_logPriorProb() );
			else if (paramID == "logLikelihood") (*col)->addValue( (*row)->get_logLikelihood() );
			else if (paramID == "logPosterior") (*col)->addValue( (*row)->get_logPosterior() );
			else if (paramID == "state") (*col)->addValue( (*row)->getStateNumber() );
			else (*col)->addValue( (*row)->getParameterEstimate(paramID) );
		}

	}


	return heatMapData;

}







// Returns a JSON string of all variables in the posterior distribution
string BayesianCalculations::getParametersInPosteriorDistributionJSON(int id){


	list<PosteriorDistributionSample*> posteriorDistribution = Settings::getPosteriorDistributionByID(id);


	if (posteriorDistribution.size() > 0){

		string JSON = "{";


		if (!posteriorDistribution.front()->isABC()){
			JSON += "'logPosterior':{'name':'Log Posterior'},";
			JSON += "'logLikelihood':{'name':'Log Likelihood'},";
		}else{
			JSON += "'chiSq':{'name':'Rho distance'},";
		}
		JSON += "'logPrior':{'name':'Log Prior'},";


		// Parameters
		for (int i = 0; i < posteriorDistribution.front()->getParameterNames().size(); i++){
			string paramID = posteriorDistribution.front()->getParameterNames().at(i);
			Parameter* param = Settings::getParameterByName(paramID);
			if (param == nullptr) {
				string paramName;
				if (paramID == "slope") paramName = "Slope";
				else if (paramID == "intercept") paramName = "Intercept";
				else if (paramID == "sigma") paramName = "Variance";
				else continue;

				JSON += "'" + paramID + "':{'name':'" + paramName + "'},";

			}

			else {
				JSON += param->toJSON() + ",";
			}

		}

		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);

		JSON += "}";

		return JSON;

	}
	else return "{}";

}




/* Performs a sitewise summary and prints to the specified file. Summary contains:

        - Probability of the polymerase being ratcheted forward into elongation by an upstream RNA blockade
        - Probability of a hypertranslocation-induced arrest
        
 Where the probabilities are obtained by summing up the number of times the event occurs and dividing by N trials
      
*/      
void BayesianCalculations::performSitewiseSummary(vector<PosteriorDistributionSample*> posteriorDistribution, string fastaInFile, string outputFileName){


    cout << "performSitewiseSummary" << endl;
    
    
    
    
    // Open the file. Do not append
    ofstream* outfile;
    outfile = new ofstream(outputFileName);
    if (!outfile->is_open()) {
        cout << "Cannot open file " << outputFileName << endl;
        exit(0);
    }
    


    // Loads the multiple sequence alignment
    MultipleSequenceAlignment* sequences = new MultipleSequenceAlignment();
    string errorMsg = sequences->parseFromFastaFile(fastaInFile);
    if (errorMsg != "") {
        cout << errorMsg << endl;
        exit(1);
    }
    cout << "Alignment successfully parsed." << endl;
    

    
    SitewiseSummary* sitewiseSummary;
    for (int i = 0; i < sequences->get_nseqs(); i ++){
    
    
        // Initialise summary object
        Sequence* currentSeq = sequences->getSequenceAtIndex(i);
        sitewiseSummary = new SitewiseSummary(currentSeq);
        Settings::setSequence(currentSeq);
    
    
        // Initialise simulator
        Simulator* simulator = new Simulator(sitewiseSummary);
        SimulatorResultSummary* result = new SimulatorResultSummary(1);
        State* initialState = new State(true, true);
        
        
        cout << "Performing " << ntrials_sim << " simulations on " << currentSeq->getID() << endl;
    
        // Perform N simualtions on this sequence
        for (int trial = 0; trial < ntrials_sim; trial ++){
        
        
            // Sample from posterior distribution
            if (posteriorDistribution.size() > 0) {
                int stateToSample = std::floor(Settings::runif() * posteriorDistribution.size());
                PosteriorDistributionSample* posteriorSample = posteriorDistribution.at(stateToSample);
                posteriorSample->setParametersFromState();
            }

            // Sample from prior distribution
            else {
                Settings::sampleAll();
            }
            
            
           // cout << hybridLen->getVal(true) << endl;
            
            
            // Ensure that the current sequence's translocation rate cache is up to date
            currentSeq->initRateTable(); 
            currentSeq->initRNAunfoldingTable();
            
            
            // Perform 1 trial
            sitewiseSummary->nextTrial();
            simulator->perform_N_Trials(result, initialState, false);
        
        
        }
        
   
        // Print probabilities to file
        vector<double> ratchetProbs = sitewiseSummary->get_ratchet_prob();
        vector<double> arrestProbs = sitewiseSummary->get_RNA_arrest_prob();
        (*outfile) << currentSeq->getID() << endl;
        
        // Ratchet probabilities
        for (int i = 0; i < ratchetProbs.size(); i ++){
            (*outfile) << ratchetProbs.at(i);
            if (i < ratchetProbs.size() - 1) (*outfile) << ",";
        }
        (*outfile) << endl;
        
        
        // Arrest probabilities
        for (int i = 0; i < arrestProbs.size(); i ++){
            (*outfile) << arrestProbs.at(i);
            if (i < arrestProbs.size() - 1) (*outfile) << ",";
        }
        (*outfile) << endl;
        
        currentSeq->deconstructRateTable();
        sitewiseSummary->clear();
    
    }
    
     

    outfile->close();
     

}