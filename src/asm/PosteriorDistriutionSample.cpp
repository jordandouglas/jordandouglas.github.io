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

using namespace std;


PosteriorDistriutionSample::PosteriorDistriutionSample(int sampleNum){
	this->sampleNum = sampleNum;
	this->simulatedValues.resize(_numExperimentalObservations);
	this->currentObsNum = 0;
	this->chiSquared = 0;
	this->priorProb = 0;
	this->modelIndicator = "";
}	


void PosteriorDistriutionSample::setStateNumber(int sampleNum){
	this->sampleNum = sampleNum;
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


// Cache the simulated value, and use the simulated and observed values to update the chi squared test statistic
void PosteriorDistriutionSample::addSimulatedAndObservedValue(double simVal, double obsVal){

	if (this->currentObsNum >= this->simulatedValues.size()) return;
	this->simulatedValues.at(this->currentObsNum) = simVal;
	this->currentObsNum ++;


	// Calculate accumulative chi-squared
	this->chiSquared += pow(simVal - obsVal, 2) / simVal;

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


