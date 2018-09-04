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


#include "Settings.h"
#include "PosteriorDistributionSample.h"
#include "WasmMessenger.h"
#include "GelLaneData.h"

#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <regex>

using namespace std;


PosteriorDistributionSample::PosteriorDistributionSample(int sampleNum, int numExperimentalObservations, bool ABC){
	this->sampleNum = sampleNum;
	this->simulatedValues.resize(numExperimentalObservations);
	this->simulatedDensities.resize(numExperimentalObservations);
	this->currentObsNum = 0;
	this->logPriorProb = 1;
	this->modelIndicator = "";

	this->ABC = ABC;
	if (!this->ABC){
		this->logLikelihood = 0;
		this->logPosterior = 0;
	}else{
		this->chiSquared = 0;
	}
}	


// Clones the object (including the simulations if specified)
PosteriorDistributionSample* PosteriorDistributionSample::clone(bool copySimulations){
	
	PosteriorDistributionSample* copy = new PosteriorDistributionSample(this->sampleNum, this->simulatedValues.size(), this->ABC);
	copy->modelIndicator = this->modelIndicator;
	copy->logPriorProb = this->logPriorProb;
	copy->logPosterior = this->logPosterior;
	copy->logLikelihood = this->logLikelihood;


	// Copy parameters
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID = iter->first;
		double value = iter->second;
		copy->addParameterEstimate(paramID, value);
	}

	if (copySimulations) {

		// Copy simulated velocities
		copy->chiSquared = this->chiSquared;
		copy->currentObsNum = this->currentObsNum;
		for (int i = 0; i < this->simulatedValues.size(); i ++){
			copy->simulatedValues.at(i) = this->simulatedValues.at(i);
		}

		// Copy band densities
		for (int i = 0; i < this->simulatedDensities.size(); i ++){
			vector<double> the_copy(this->simulatedDensities.at(i));
			copy->simulatedDensities.at(i) = the_copy;
		}
	}


	return copy;

}

void PosteriorDistributionSample::setStateNumber(int sampleNum){
	this->sampleNum = sampleNum;
}

int PosteriorDistributionSample::getStateNumber(){
	return this->sampleNum;
}

double PosteriorDistributionSample::get_chiSquared(){
	return this->chiSquared;
}

void PosteriorDistributionSample::set_logPriorProb(double val){
	this->logPriorProb = val;
}

double PosteriorDistributionSample::get_logPriorProb(){
	return this->logPriorProb;
}

void PosteriorDistributionSample::set_logLikelihood(double val){
	this->logLikelihood = val;
}

double PosteriorDistributionSample::get_logLikelihood(){
	return this->logLikelihood;
}


void PosteriorDistributionSample::set_logPosterior(double val){
	this->logPosterior = val;
}

double PosteriorDistributionSample::get_logPosterior(){
	return this->logPosterior;
}


bool PosteriorDistributionSample::isABC(){
	return this->ABC;
}

void PosteriorDistributionSample::set_modelIndicator(string val){
	this->modelIndicator = val;
}

string PosteriorDistributionSample::get_modelIndicator(){
	return this->modelIndicator;
}

void PosteriorDistributionSample::addParameterEstimate(string paramID, double val){
	this->parameterEstimates[paramID] = val;
}


double PosteriorDistributionSample::getParameterEstimate(string paramID){
	return this->parameterEstimates[paramID];
}

// Gets a list of all parameters being estimated and returns as a list of strings
vector<string> PosteriorDistributionSample::getParameterNames(){

	// Get parameter names
	list<string> paramIDs; 
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID =  iter->first;
		paramIDs.push_back(paramID);
	}

	vector<string> paramIDs_vector{ std::begin(paramIDs), std::end(paramIDs) };
	return paramIDs_vector;

}


// Cache the simulated value, and use the simulated and observed values to update the chi squared test statistic
void PosteriorDistributionSample::addSimulatedAndObservedValue(SimulatorResultSummary* simulated, ExperimentalData* observed){



	if (this->currentObsNum >= this->simulatedValues.size()) return;
	

	// If time gel then compare distribution of lengths
	if (observed->getDataType() == "timeGel"){
		


		GelLaneData* currentLane = observed->getCurrentLane();


		// Sample a linear model
		list<PosteriorDistributionSample*> linearModelPosteriorDistribution = Settings::getPosteriorDistributionByID(observed->getID());
		if (linearModelPosteriorDistribution.size() == 0){
			cout << "Error: Gel " << observed->getID() << " has not been calibrated!" << endl;
			exit(0);
		}
		list<PosteriorDistributionSample*>::iterator posteriorIterator = linearModelPosteriorDistribution.begin();
		std::advance(posteriorIterator, int(Settings::runif() * linearModelPosteriorDistribution.size()));
		PosteriorDistributionSample* linearModel = (*posteriorIterator);



		//
		// Calculate the observed probability densities of length for this lane
		//

		// Create empty list of probability densities at each length
		vector<double> observedLengthProbabilityDensities(templateSequence.length());
		for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++) observedLengthProbabilityDensities.at(i) = 0;
		for (int i = 0; i < currentLane->getNumDensities(); i ++){


			// Turn each migration position into a length using the linear model
			double migrationPosition = currentLane->get_laneInterceptY() + i;
			int len = (int)std::round(linearModel->getParameterEstimate("slope") / migrationPosition + getParameterEstimate("intercept"));


			// If length is zero it won't show up on the gel
			if (len <= 0 || len > templateSequence.length()) continue; 


			// Calculate the band intensity from this migration distances. Longer molecules have more stain
			// We are assuming a linear releationship between transcript length and its contribution to intensity at its position 
			double density = currentLane->get_densityAt(i) / len;

			observedLengthProbabilityDensities.at(len-1) += density;


		}


		//
		// Calculate the simulated probability densities of length for this lane
		//

		// Create empty list of probability densities at each length
		vector<double> simulatedLengthProbabilityDensities(templateSequence.length());
		list<int> simulatedLengths = simulated->get_transcriptLengths();
		for (list<int>::iterator it = simulatedLengths.begin(); it != simulatedLengths.end(); ++it){

			int len = *it;

			// If length is zero it won't show up on the gel
			if (len == 0 || len > templateSequence.length()) continue; 


			// Calculate the band intensity from this migration distances. Longer molecules have more stain
			// We are assuming a linear releationship between transcript length and its contribution to intensity at its position 
			simulatedLengthProbabilityDensities.at(len-1) += len;
			

		}


		//
		// Normalise probability densities into range [0,1] (so not technically a probability distribution but proportional to one)
		//


		// Observed
		double minObsDensity = INFINITY;
		double maxObsDensity = 0;
		for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++){
			maxObsDensity = std::max(maxObsDensity, observedLengthProbabilityDensities.at(i)); 
			minObsDensity = std::min(minObsDensity, observedLengthProbabilityDensities.at(i));
		}

		if (maxObsDensity - minObsDensity > 0){
			for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++) observedLengthProbabilityDensities.at(i) = (observedLengthProbabilityDensities.at(i) - minObsDensity) / (maxObsDensity - minObsDensity);
		}

		else{
			for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++) observedLengthProbabilityDensities.at(i) = 0;
		}


		// Simulated
		double minSimDensity = INFINITY;
		double maxSimDensity = 0;
		for (int i = 0; i < simulatedLengthProbabilityDensities.size(); i ++){
			maxSimDensity = std::max(maxSimDensity, simulatedLengthProbabilityDensities.at(i)); 
			minSimDensity = std::min(minSimDensity, simulatedLengthProbabilityDensities.at(i));
		}

		if (maxSimDensity - minSimDensity > 0){
			for (int i = 0; i < simulatedLengthProbabilityDensities.size(); i ++) simulatedLengthProbabilityDensities.at(i) = (simulatedLengthProbabilityDensities.at(i) - minSimDensity) / (maxSimDensity - minSimDensity);
		}

		else{
			for (int i = 0; i < simulatedLengthProbabilityDensities.size(); i ++) simulatedLengthProbabilityDensities.at(i) = 0;
		}



	

		// Compute chi-squared in specified lag range. Lag refers to how far the observed is behind the simulated
		// Lag = 1:
		// Sim:		1	2	3	4	5
		// Obs:			1	2	3	4	5
		int minLag = -3;
		int maxLag = 3;
		//GelLaneData* currentLane = observed->getCurrentLane();
		double chiSqLane = 0;
		for (int lag = minLag; lag <= maxLag; lag++){

			// Compute X2 at current lag
			for (int i = max(lag, 0); i < min(observedLengthProbabilityDensities.size() + lag, observedLengthProbabilityDensities.size()); i ++){
				double simVal = simulatedLengthProbabilityDensities.at(i);
				double obsVal = observedLengthProbabilityDensities.at(i); //currentLane->get_densityAt(i-lag);


				// Calculate accumulative chi-squared. Want to ensure that 0/0 = 0 and not infinity
				double chiSqTop = pow(simVal - obsVal, 2);
				if (chiSqTop != 0) chiSqLane += chiSqTop; // / abs(simVal);

				//cout << "Comparing position s" << i << " with o" << (i-lag) << " | X2 = " << chiSqTop / simVal << endl; 
				

			}

		}



		this->simulatedDensities.at(this->currentObsNum) = simulatedLengthProbabilityDensities;
		this->simulatedValues.at(this->currentObsNum) = chiSqLane;
		this->chiSquared += chiSqLane;


	}

	else if (observed->getDataType() == "pauseEscape"){


		// Calculate observed probability of being at the current site at the current time (under the log-linear model fit to the original data)
		int pauseSite =  observed->get_pauseSite();
		//double Emax = observed->get_Emax();
		//double rate = log(2) / observed->get_t12();
		//double time = observed->getCurrentSettingX();
		double obsVal = observed->getObservation(); // Emax * exp(-time * rate);



		// Calculate simulated probability of being at the current site at the current time (by calculating the proportion of trancripts of the right length)
		double simVal = 0;
		list<int> simulatedLengths = simulated->get_transcriptLengths();
		for (list<int>::iterator it = simulatedLengths.begin(); it != simulatedLengths.end(); ++it){
			int len = *it;
			if (len == pauseSite) simVal++;
		}
		simVal = simVal / simulatedLengths.size();

		//cout << "t = " << observed->getCurrentSettingX() << "; simVal = " << simVal << "; obsVal = " << obsVal << endl;

		this->simulatedValues.at(this->currentObsNum) = simVal;

		this->chiSquared += pow(simVal - obsVal, 2);
		/*
		if (simVal == 0) this->chiSquared = INF;
		else {
			double chiSqTop = pow(simVal - obsVal, 2);
			if (chiSqTop != 0) this->chiSquared += chiSqTop / abs(simVal);
		}

		this->chiSquared = min(this->chiSquared, 1.0 * INF);
		*/

	}


	// Otherwise compare simulated and observed velocities
	else {
		
		
		double simVal = simulated->get_meanVelocity();
		double obsVal = observed->getObservation();

		this->simulatedValues.at(this->currentObsNum) = simVal;

		// Calculate accumulative chi-squared. Want to ensure that 0/0 = 0 and not infinity
		if (simVal == 0) this->chiSquared = INF;
		else {
			double chiSqTop = pow(simVal - obsVal, 2);
			if (chiSqTop != 0) this->chiSquared += chiSqTop / abs(simVal);
		}

		this->chiSquared = min(this->chiSquared, 1.0 * INF);

		//Settings::print();
		//cout << "Simval " << simVal << "; obsVal " << obsVal << "; X2 " << this->chiSquared << endl;

	}

	this->currentObsNum ++;


}



// Prints the first row (ie. column names instead of values)
void PosteriorDistributionSample::printHeader(bool toFile){


	// Send to javascript if using WASM
	string WASM_string = "";

	// Using ampersand instead of tab and exclaimation mark instead of new line when sending to the DOMS
	string gapUnit = _USING_GUI && !toFile ? "&" : "\t";
	string endLine = _USING_GUI && !toFile ? "!" : "\n";


	// Attempt to open up file if applicable. Do not append
	ofstream* logFile;
	if (toFile && !_USING_GUI) {
		logFile = new ofstream(outputFilename);
		if (!logFile->is_open()) {
			cout << "Cannot open file " << outputFilename << endl;
			exit(0);
		}
	}

	if (isWASM) WASM_string += "State\t";
	else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << "State" << gapUnit;

	// Print model indicator
	if (this->modelIndicator != ""){
		if (isWASM) WASM_string += "Model" + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) :  cout) << "Model" << gapUnit;
	}

	// Print parameter names
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID =  iter->first;
		if (paramID.substr(0,3) == "len") continue; // HACK: Don't print the transcript length variables since we want to integrate over them
		if (isWASM) WASM_string += paramID + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << paramID << gapUnit;
	}

	// Print 'V'N for each observation 
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += "V" + to_string(i+1) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) :  cout) << "V" << (i+1) << gapUnit;
	}

	// Print prior and either (likelihood and posterior) OR (chi-squared)
	string priorStr = "";
	priorStr += "logPrior" + gapUnit;
	if (!this->ABC){
		priorStr += "logLikelih" + gapUnit + "logPosteri" + endLine;
	}
	else priorStr += "chiSquared" + endLine;

	(_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << priorStr;
	
	
	if (toFile && !_USING_GUI) logFile->close();
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, false);
	}


}



void PosteriorDistributionSample::print(bool toFile){

	// Print to 10 sf
	std::cout.precision(10);

	// Send to javascript if using WASM
	string WASM_string = "";

	// Using ampersand instead of tab and exclaimation mark instead of new line when sending to the DOMS
	string gapUnit = _USING_GUI && !toFile ? "&" : "\t";
	string endLine = _USING_GUI && !toFile ? "!" : "\n";

	
	// Attempt to open up file if applicable. Append to end of file
	ofstream logFile;
	if (toFile && !_USING_GUI) {
		//logFile = new ofstream(outputFilename);
		logFile.open(outputFilename, ios_base::app);
		if (!logFile.is_open()) {
			cout << "Cannot open file " << outputFilename << endl;
			exit(0);
		}
		logFile.precision(10);
		logFile.setf(ios::fixed);
		logFile.setf(ios::showpoint); 
	}
	
	if (isWASM) WASM_string += to_string(this->sampleNum) + gapUnit;
	else (_USING_GUI ? _ABCoutputToPrint : toFile ? logFile  : cout) << this->sampleNum << gapUnit;

	// Print model indicator
	if (this->modelIndicator != "") {
		if (isWASM) WASM_string += this->modelIndicator + gapUnit;
		else ( _USING_GUI ? _ABCoutputToPrint :toFile ? logFile  : cout) << this->modelIndicator << gapUnit;
		
	}

	// Print parameter values
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID = iter->first;
		if (paramID.substr(0,3) == "len") continue; // HACK: Don't print the transcript length variables since we want to integrate over them
		double value = iter->second;
		if (isWASM) WASM_string += to_string(value) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? logFile  :  cout) << value << gapUnit;
	}
	
	// Print simulated values
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += to_string(simulatedValues.at(i)) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint :toFile ? logFile  : cout) << simulatedValues.at(i) << gapUnit;
	}


	// Print prior and either (likelihood and posterior) OR (chi-squared)
	string priorStr = "";
	priorStr += to_string(this->logPriorProb) + gapUnit;
	if (!this->ABC){
		priorStr += to_string(this->logLikelihood)  + gapUnit + to_string(this->logPosterior)  + endLine;
	}
	else priorStr += to_string(this->chiSquared)  + endLine;

	(_USING_GUI ? _ABCoutputToPrint : toFile ? logFile : cout) << priorStr;
	
	
	if (toFile && !_USING_GUI) logFile.close();
	
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, true);
	}

}



string PosteriorDistributionSample::toJSON(){

	string JSON = "{";

	if (this->ABC){


		// Simulated values
		JSON += "'simulatedValues':[";
		for (int i = 0; i < this->simulatedValues.size(); i ++){
			JSON += to_string(this->simulatedValues.at(i)) + ",";
		}
		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);

		JSON += "],";


		//if (this->simulatedDensities.size() > 0) cout << "this->simulatedDensities.size() " << this->simulatedDensities.size() << " this->simulatedDensities.at(0).size() " << this->simulatedDensities.at(0).size() << endl;

		// Simulated bands
		JSON += "'simulatedDensities':[";
		for (int i = 0; i < this->simulatedDensities.size(); i ++){
			JSON += "[";
			for (int j = 0; j < this->simulatedDensities.at(i).size(); j ++){
				JSON += to_string(this->simulatedDensities.at(i).at(j)) + ",";
			}
			if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
			JSON += "],";

		}
		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
		JSON += "]";



	}else{


		// Print parameter values
		for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
			string paramID = iter->first;
			double value = iter->second;
			JSON += "'" + paramID + "':" + to_string(value) + ",";
		}

		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);


	}


	JSON += "}";
	return JSON;

}


// Sets this state to the last state in the specified log file
void PosteriorDistributionSample::loadFromLogFile(string filename){


	// Get the last line in the logfile
	ifstream logfile;
	string line;
    logfile.open(filename);
    if(logfile.is_open()) {

    	// Get number of lines
    	int numLines = 0;
    	vector<string> headerLineSplit;
    	bool headerParsed = false;
        while(getline(logfile, line)) {

        	if (line == "" || line == "\n") break;
        	numLines++;

        	// Parse first line
        	if (!headerParsed){
        		headerParsed = true;
        		headerLineSplit = Settings::split(line, '\t');
        	}


        }


        // Get last line and parse it
        logfile.clear();
		logfile.seekg(0, ios::beg);
        int currentLine = 0;

        vector<string> splitLine;
        while(getline(logfile, line)) {
        	currentLine++;

        	// Parse this line
        	if (currentLine == numLines) {
        		splitLine = Settings::split(line, '\t');
        		parseFromLogFileLine(splitLine, headerLineSplit);
        		splitLine.clear();
        	}
        }

        logfile.close();
        headerLineSplit.clear();

    }

}



void PosteriorDistributionSample::parseFromLogFileLine(vector<string> splitLine, vector<string> headerLineSplit){

	regex velocityMatch("(V)([0-9]+)$");

	int simulatedVal = 0;
	//cout << headerLineSplit.size() << "," << splitLine.size() << endl;

	for (int i = 0; i < headerLineSplit.size(); i ++){

		string header = headerLineSplit.at(i);
		string value = splitLine.at(i);

		//cout << "i = " << i << endl;
		//cout << header << " = " << value << endl;
		//cout << "i = " << i << ":" << headerLineSplit.at(54) << " header = " << header << endl;

		if (header == "State") this->setStateNumber(stoi(value));
		else if (header == "Model") this->set_modelIndicator(value);
		else if (header == "logPrior") this->logPriorProb = stof(value);
		else if (header == "chiSquared") this->chiSquared = stof(value);
		else if (std::regex_match (header, velocityMatch)) {
			simulatedValues.at(simulatedVal) = stof(value); // Parse velocity
			simulatedVal++;
		}
		else {
			this->addParameterEstimate(header, stof(value)); // Parse parameter
		}
	}


}



// Update global settings to the parameters etc. specified by this state
void PosteriorDistributionSample::setParametersFromState(){
	

	// Set the parameters
	regex instanceMatch("(.+)(instance[0-9]+)(.+)");
	for(map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++iter){
		string paramID =  iter->first;
		double value = iter->second;


		// If parameter has multiple instances then need to do one at a time
		if (regex_match (paramID, instanceMatch)){

			// Convert PARAMID(instancex) into string paramID = PARAMID and int instanceNum = x
			vector<string> splitLine = Settings::split(paramID, '(');
			paramID = splitLine.at(0);
			string instanceNum_str = splitLine.at(1).substr(8); // Remove "instance"
			int instanceNum = stoi(instanceNum_str.substr(0, instanceNum_str.size()-1)); // Remove ")"
			splitLine.clear();

			Parameter* param = Settings::getParameterByName(paramID);
			if (param != nullptr){
				param->getParameterFromMetaParameter(instanceNum)->setVal(value);
			}

			else {
				cout << "ERROR: Cannot find parameter " << paramID << endl;
				exit(0);
			}

		}


		// Single instance
		else{

			Parameter* param = Settings::getParameterByName(paramID);
			if (param != nullptr){
				param->setVal(value);
			}

		

			else {
				cout << "ERROR: Cannot find parameter " << paramID << endl;
				exit(0);
			}

		}


	}

	// Set model number
	Settings::setModel(this->get_modelIndicator());


	// Update the global settings to apply the parameters in this model
	Settings::clearParameterHardcodings();
	currentModel->activateModel();



}


