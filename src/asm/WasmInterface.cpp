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
#include "State.h"
#include "Simulator.h"
#include "XMLparser.h"
#include "TranslocationRatesCache.h"

#include <emscripten.h>
#include <iostream>
#include <string>
#include <vector>
#include <chrono>
#include <ctime>


using namespace std;



// Send a message to javascript
void messageFromWasmToJS(const string & msg) {
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	messageFromWasmToJS(msg);                                            
  	}, msg.c_str());
}


void messageFromWasmToJS(const string & msg, int msgID) {
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	messageFromWasmToJS(msg, $1);                                       
  	}, msg.c_str(), msgID);
}



// Interface between javascript and cpp for webassembly
extern "C" {

	void EMSCRIPTEN_KEEPALIVE stopWebAssembly(){
		stop = true;
	}


	// Parse XML settings in string form
	void EMSCRIPTEN_KEEPALIVE loadSessionFromXML(char* XMLdata, int msgID){

		// Reinitialise the model
		delete currentModel;
		currentModel = new Model();

		XMLparser::parseXMLFromString(XMLdata);
		Settings::sampleAll();
   	 	complementSequence = Settings::complementSeq(templateSequence, TemplateType.substr(2) == "RNA");

	    // Build the rates table
	   	TranslocationRatesCache::buildTranslocationRateTable(); 
	   	TranslocationRatesCache::buildBacktrackRateTable();

		// Send the globals settings back to the DOM 
		string parametersJSON = "{" + Settings::toJSON() + "}";
		messageFromWasmToJS(parametersJSON, msgID);

	}


	// Save the distribution and its arguments of a parameter (and samples it)
	void EMSCRIPTEN_KEEPALIVE saveParameterDistribution(char* paramID, char* distributionName, char* distributionArgNames, double* distributionArgValues, int nArgs) {

		Parameter* param = Settings::getParameterByName(string(paramID));
		if (param){
			param->setPriorDistribution(string(distributionName));

			vector<string> argNames = Settings::split(string(distributionArgNames), ','); // Split by , to get values
			for (int i = 0; i < nArgs; i ++) {
				string argName = argNames.at(i);
				double argVal = distributionArgValues[i];
				cout << string(paramID) << ": " << argName << " = " << argVal << endl;
				param->setDistributionParameter(argName, argVal);
			}

			param->sample();

		}
		
		

	}


	// Returns the value of a parameter
	double EMSCRIPTEN_KEEPALIVE getParameterValue(char* paramID) {

		Parameter* param = Settings::getParameterByName(string(paramID));
		if (param) return param->getVal();
		cout << "Cannot find parameter " << string(paramID) << "!" << endl;
		exit(0);
		return 0;

	}

	// Returns all information of all parameters in JSON format
	void EMSCRIPTEN_KEEPALIVE getAllParameters(int msgID){


		string parametersJSON = "{";

		for (int i = 0; i < Settings::paramList.size(); i ++){
			parametersJSON += Settings::paramList.at(i)->getJSON();
			if (i < Settings::paramList.size()-1) parametersJSON += ",";
		}

		parametersJSON += "}";
		messageFromWasmToJS(parametersJSON, msgID);
	}
	
	
	
	// Saves the current model settings
	
	void EMSCRIPTEN_KEEPALIVE setModelSettings(int msgID, char* modelSettingNames, char* modelSettingVals){
		
		vector<string> settings = Settings::split(string(modelSettingNames), ','); // Split by , to get values
		vector<string> values = Settings::split(string(modelSettingVals), ','); // Split by , to get values
		for (int i = 0; i < settings.size(); i ++) {
			string setting = settings.at(i);
			string val = values.at(i);
			//currentModel->setDistributionParameter(argName, val);
			
			if (setting == "allowBacktracking") currentModel->set_allowBacktracking(val == "true");
			else if (setting == "allowHypertranslocation") currentModel->set_allowHypertranslocation(val == "true");
			else if (setting == "allowInactivation") currentModel->set_allowInactivation(val == "true");
			else if (setting == "allowBacktrackWithoutInactivation") currentModel->set_allowBacktrackWithoutInactivation(val == "true");
			else if (setting == "allowGeometricCatalysis") currentModel->set_allowGeometricCatalysis(val == "true");
			else if (setting == "allowmRNAfolding") currentModel->set_allowmRNAfolding(val == "true");
			else if (setting == "allowMisincorporation") currentModel->set_allowMisincorporation(val == "true");
			else if (setting == "useFourNTPconcentrations") currentModel->set_useFourNTPconcentrations(val == "true");
			else if (setting == "NTPbindingNParams") currentModel->set_NTPbindingNParams(atoi(val.c_str()));
			else if (setting == "currentTranslocationModel") currentModel->set_currentTranslocationModel(val);
			else if (setting == "assumeBindingEquilibrium") currentModel->set_assumeBindingEquilibrium(val == "true");
			else if (setting == "assumeTranslocationEquilibrium") currentModel->set_assumeTranslocationEquilibrium(val == "true");
			
		}
		
		// Hide and show parameters
		Settings::updateParameterVisibilities();
		
		// Return the model settings
		string parametersJSON = "{" + currentModel->getJSON() + "}";

		//currentModel->print();


		messageFromWasmToJS(parametersJSON, msgID);
		
		
	}

	
	// Returns the current model settings
	
	void EMSCRIPTEN_KEEPALIVE getModelSettings(int msgID){
		string parametersJSON = "{" + currentModel->getJSON() + "}";
		messageFromWasmToJS(parametersJSON, msgID);
	}
	
	
	
	// Perform N simulations. Returns mean velocity and real time taken
	void EMSCRIPTEN_KEEPALIVE startTrials(int N, int msgID){
		
		
		stop = false;

		cout << "Starting " << N << endl;
		
		// Start timer
		auto startTime = chrono::system_clock::now();
		
		// Prepare for simulating
		Simulator* sim = new Simulator();
	   	State* initialState = new State(true);
	   	double velocity = sim->perform_N_Trials(N, initialState, true);
		
		
		// Stop timer
		auto endTime = chrono::system_clock::now();
		chrono::duration<double> elapsed_seconds = endTime-startTime;
		double time = elapsed_seconds.count();
		
		
		string toReturnJSON = "{meanVelocity:" + to_string(velocity) + ",realTime:" + to_string(time) + "}";
		messageFromWasmToJS(toReturnJSON, msgID);
		
		
	}
	



}








