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

#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <regex>

using namespace std;


PosteriorDistributionSample::PosteriorDistributionSample(int sampleNum){
	this->sampleNum = sampleNum;
	this->simulatedValues.resize(_numExperimentalObservations);
	this->currentObsNum = 0;
	this->chiSquared = 0;
	this->priorProb = 0;
	this->modelIndicator = "";
}	


// Clones the object (including the simulations if specified)
PosteriorDistributionSample* PosteriorDistributionSample::clone(bool copySimulations){
	
	PosteriorDistributionSample* copy = new PosteriorDistributionSample(this->sampleNum);
	copy->modelIndicator = this->modelIndicator;
	copy->priorProb = this->priorProb;



	// Copy parameters
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID = iter->first;
		double value = iter->second;
		copy->addParameterEstimate(paramID, value);
	}

	// Copy simulated velocities
	if (copySimulations) {
		copy->chiSquared = this->chiSquared;
		copy->currentObsNum = this->currentObsNum;
		for (int i = 0; i < this->simulatedValues.size(); i ++){
			copy->simulatedValues.at(i) = this->simulatedValues.at(i);
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
	this->priorProb = val;
}

double PosteriorDistributionSample::get_logPriorProb(){
	return this->priorProb;
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

// Gets a list of all parameters being estimated and returns as a string
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
void PosteriorDistributionSample::addSimulatedAndObservedValue(double simVal, double obsVal){


	if (this->currentObsNum >= this->simulatedValues.size()) return;
	this->simulatedValues.at(this->currentObsNum) = simVal;
	this->currentObsNum ++;


	// Calculate accumulative chi-squared
	this->chiSquared += pow(simVal - obsVal, 2) / simVal;

	//Settings::print();
	//cout << "Simval " << simVal << "; obsVal " << obsVal << "; X2 " << this->chiSquared << endl;

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
		if (isWASM) WASM_string += paramID + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << paramID << gapUnit;
	}

	// Print 'V'N for each observation 
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += "V" + to_string(i+1) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) :  cout) << "V" << (i+1) << gapUnit;
	}

	// Print prior and chi-squared
	if (isWASM) WASM_string += "logPrior" + gapUnit + "chiSquared\n";
	else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << "logPrior" + gapUnit + "chiSquared" + endLine;
	
	
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
		double value = iter->second;
		if (isWASM) WASM_string += to_string(value) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? logFile  :  cout) << value << gapUnit;
	}
	
	// Print simulated values
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += to_string(simulatedValues.at(i)) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint :toFile ? logFile  : cout) << simulatedValues.at(i) << gapUnit;
	}

	// Print prior and chi-squared values
	if (isWASM) WASM_string += to_string(this->priorProb) + gapUnit + to_string(this->chiSquared) + "\n";
	else (_USING_GUI ? _ABCoutputToPrint : toFile ? logFile  : cout) << this->priorProb << gapUnit << this->chiSquared << endLine;
	
	
	if (toFile && !_USING_GUI) logFile.close();
	
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, true);
	}

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
        	}
        }

        logfile.close();

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
		else if (header == "logPrior") this->priorProb = stof(value);
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


