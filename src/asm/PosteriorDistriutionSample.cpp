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
#include "PosteriorDistriutionSample.h"
#include "WasmMessenger.h"


#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <regex>

using namespace std;


PosteriorDistriutionSample::PosteriorDistriutionSample(int sampleNum){
	this->sampleNum = sampleNum;
	this->simulatedValues.resize(_numExperimentalObservations);
	this->currentObsNum = 0;
	this->chiSquared = 0;
	this->priorProb = 0;
	this->modelIndicator = "";
}	


// Clones the object (including the simulations if specified)
PosteriorDistriutionSample* PosteriorDistriutionSample::clone(bool copySimulations){
	
	PosteriorDistriutionSample* copy = new PosteriorDistriutionSample(this->sampleNum);
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

void PosteriorDistriutionSample::setStateNumber(int sampleNum){
	this->sampleNum = sampleNum;
}

int PosteriorDistriutionSample::getStateNumber(){
	return this->sampleNum;
}

double PosteriorDistriutionSample::get_chiSquared(){
	return this->chiSquared;
}

void PosteriorDistriutionSample::set_logPriorProb(double val){
	this->priorProb = val;
}

double PosteriorDistriutionSample::get_logPriorProb(){
	return this->priorProb;
}


void PosteriorDistriutionSample::set_modelIndicator(string val){
	this->modelIndicator = val;
}

string PosteriorDistriutionSample::get_modelIndicator(){
	return this->modelIndicator;
}

void PosteriorDistriutionSample::addParameterEstimate(string paramID, double val){
	this->parameterEstimates[paramID] = val;
}


double PosteriorDistriutionSample::getParameterEstimate(string paramID){
	return this->parameterEstimates[paramID];
}

// Gets a list of all parameters being estimated and returns as a string
vector<string> PosteriorDistriutionSample::getParameterNames(){

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
void PosteriorDistriutionSample::addSimulatedAndObservedValue(double simVal, double obsVal){


	if (this->currentObsNum >= this->simulatedValues.size()) return;
	this->simulatedValues.at(this->currentObsNum) = simVal;
	this->currentObsNum ++;


	// Calculate accumulative chi-squared
	this->chiSquared += pow(simVal - obsVal, 2) / simVal;

	//Settings::print();
	//cout << "Simval " << simVal << "obsVal " << obsVal << " X2 " << this->chiSquared << endl;

}



// Prints the first row (ie. column names instead of values)
void PosteriorDistriutionSample::printHeader(bool toFile){


	// Send to javascript if using WASM
	string WASM_string = "";


	// Attempt to open up file if applicable. Do not append
	ofstream* logFile;
	if (toFile) {
		logFile = new ofstream(outputFilename);
		if (!logFile->is_open()) {
			cout << "Cannot open file " << outputFilename << endl;
			exit(0);
		}
	}

	if (isWASM) WASM_string += "State\t";
	else (toFile ? (*logFile) : cout) << "State\t";

	// Print model indicator
	if (this->modelIndicator != ""){
		if (isWASM) WASM_string += "Model\t";
		else (toFile ? (*logFile) : cout) << "Model\t";
	}

	// Print parameter names
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID =  iter->first;
		if (isWASM) WASM_string += paramID + "\t";
		else (toFile ? (*logFile) : cout) << paramID << "\t";
	}

	// Print 'V'N for each observation 
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += "V" + to_string(i+1) + "\t";
		else (toFile ? (*logFile) : cout) << "V" << (i+1) << "\t";
	}

	// Print prior and chi-squared
	if (isWASM) WASM_string += "logPrior\tchiSquared\n";
	else (toFile ? (*logFile) : cout) << "logPrior\tchiSquared" << endl;
	
	
	if (toFile) logFile->close();
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, false);
	}


}



void PosteriorDistriutionSample::print(bool toFile){

	// Print to 10 sf
	std::cout.precision(10);

	// Send to javascript if using WASM
	string WASM_string = "";

	
	// Attempt to open up file if applicable. Append to end of file
	ofstream logFile;
	if (toFile) {
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
	
	if (isWASM) WASM_string += to_string(this->sampleNum) + "\t";
	else (toFile ? logFile : cout) << this->sampleNum << "\t";

	// Print model indicator
	if (this->modelIndicator != "") {
		if (isWASM) WASM_string += this->modelIndicator + "\t";
		else (toFile ? logFile : cout) << this->modelIndicator << "\t";
		
	}

	// Print parameter values
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		double value = iter->second;
		if (isWASM) WASM_string += to_string(value) + "\t";
		else (toFile ? logFile : cout) << value << "\t";
	}
	
	// Print simulated values
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += to_string(simulatedValues.at(i)) + "\t";
		else (toFile ? logFile : cout) << simulatedValues.at(i) << "\t";
	}

	// Print prior and chi-squared values
	if (isWASM) WASM_string += to_string(this->priorProb) + "\t" + to_string(this->chiSquared) + "\n";
	else (toFile ? logFile : cout) << this->priorProb << "\t" << this->chiSquared << endl;
	
	
	if (toFile) logFile.close();
	
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, true);
	}

}


// Sets this state to the last state in the specified log file
void PosteriorDistriutionSample::loadFromLogFile(string filename){


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

        while(getline(logfile, line)) {
        	currentLine++;

        	// Parse this line
        	if (currentLine == numLines) {
        		parseFromLogFileLine(line, headerLineSplit);
        	}
        }

        logfile.close();

    }

}



void PosteriorDistriutionSample::parseFromLogFileLine(string stateLine, vector<string> headerLineSplit){

	regex velocityMatch("(V)([0-9]+)$");
	vector<string> splitLine = Settings::split(stateLine, '\t');

	int simulatedVal = 0;
	for (int i = 0; i < splitLine.size(); i ++){

		string header = headerLineSplit.at(i);
		string value = splitLine.at(i);

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
void PosteriorDistriutionSample::setParametersFromState(){
	

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



