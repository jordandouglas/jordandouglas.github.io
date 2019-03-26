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


#include "../../../src/asm/Settings.h"
#include "../../../src/asm/State.h"
#include "../../../src/asm/Simulator.h"
#include "../../../src/asm/XMLparser.h"
#include "../../../src/asm/FreeEnergy.h"
#include "../../../src/asm/TranslocationRatesCache.h"
#include "../../../src/asm/Plots.h"
#include "../../../src/asm/MultipleSequenceAlignment.h"
#include "../../../src/asm/PauseSiteUtil.h"
#include "../../../src/asm/BayesClassifier.h"


#include <emscripten.h>
#include <iostream>
#include <string>
#include <vector>
#include <chrono>
#include <ctime>
#include <random>
#include <functional>
#include <thread>



using namespace std;



// Send a message to javascript
void messageFromWasmToJS(const string & msg) {
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	messageFromWasmToJS(msg);                                            
  	}, msg.c_str());
}


void messageFromWasmToJS(const string & msg, int msgID) {
	if (msgID == -1) return;
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	messageFromWasmToJS(msg, $1);                                       
  	}, msg.c_str(), msgID);
}



// Interface between javascript and cpp for webassembly
extern "C" {


	void EMSCRIPTEN_KEEPALIVE initGUI(bool isMobile){
        cout << "Initialising Pauser" << endl;
		_USING_GUI = true;
        _animationSpeed = "hidden";
        _PP_multipleSequenceAlignment = new MultipleSequenceAlignment();
        _GUI_PLOTS = new Plots();
        _NBC_classifier = new BayesClassifier();

	}



    // Get the number of trials being performed
    void EMSCRIPTEN_KEEPALIVE getNtrials(int msgID){
        messageFromWasmToJS("{'ntrials':" + to_string(ntrials_sim) + "}", msgID);
    }



    // Parse XML settings in string form
    void EMSCRIPTEN_KEEPALIVE loadSessionFromXML(char* XMLdata, int msgID){

        modelsToEstimate.clear();
        XMLparser::parseXMLFromString(XMLdata, _GUI_PLOTS);
        Settings::sampleAll();

        _currentStateGUI = new State(true, true);

        // Send the globals settings back to the DOM 
        string parametersJSON = "{" + Settings::toJSON() + "}";

        // Ensure that the sitewise plot is always displayed and the other plots are hidden
        _GUI_PLOTS->init();
        _GUI_PLOTS->hideAllPlots(true);
        _GUI_PLOTS->hideSitewisePlot(false); 
        _GUI_PLOTS->set_sendCopiedSequences(false);
        

        messageFromWasmToJS(parametersJSON, msgID);



    }


    // Instructs the animation / simulation to stop
    void EMSCRIPTEN_KEEPALIVE stopWebAssembly(int msgID){
        _GUI_STOP = true;
        cout << "STOPPING C++" << endl;
        messageFromWasmToJS("", msgID);
    }
    
    
    
    // Get the MSA and all of its predicted pause site locations
    void EMSCRIPTEN_KEEPALIVE getMSA(int msgID){
        messageFromWasmToJS(_PP_multipleSequenceAlignment->toJSON(), msgID);
    }
    
    
    
    // Parse NBC probabilities from a string (csv format)
    void EMSCRIPTEN_KEEPALIVE parseNBC(char* nbc, int msgID){

        // Parse each sequence in the multiple sequence alignment
        _NBC_classifier->loadFromString(string(nbc));
        vector<double> min_max = _NBC_classifier->get_min_max_evidence();
        _nbc_min_evidence = min_max.at(0);
        _nbc_max_evidence = min_max.at(1);
        _nbc_evidence_threshold = (_NBC_classifier->get_threshold() - _nbc_min_evidence) / (_nbc_max_evidence - _nbc_min_evidence);
        messageFromWasmToJS("{'_nbc_evidence_threshold':" + to_string(_nbc_evidence_threshold) +"}", msgID);

    }

    
    
    // Parse an MSA from a JSON string
    void EMSCRIPTEN_KEEPALIVE parseMSA(char* fasta, int msgID){

        _PP_multipleSequenceAlignment->clear();

        // Parse each sequence in the multiple sequence alignment
        string errorMsg = _PP_multipleSequenceAlignment->parseFromFasta(string(fasta));

        if (errorMsg != "")   messageFromWasmToJS("{'error':'" + errorMsg + "'}", msgID);
        else messageFromWasmToJS(_PP_multipleSequenceAlignment->toJSON(), msgID);


    }

    
    // Returns the classifier threshold values
    void EMSCRIPTEN_KEEPALIVE getThresholds(int msgID){
        
        string JSON = "{";
        JSON += "'simpolThreshold':" + to_string(_simpol_evidence_threshold) + ",";
        JSON += "'nbcThreshold':" + to_string(_nbc_evidence_threshold);
        JSON += "}";
        
        messageFromWasmToJS(JSON, msgID);
    }
    
    
    
    // Get the results of Pauser as a string to download into a .psr file
    void EMSCRIPTEN_KEEPALIVE getResultsFileString(int msgID){
        
        string JSON = "{";
        JSON += "'output':'" + _PP_multipleSequenceAlignment->getPauserAsString() + "'";
        JSON += "}";
        
        messageFromWasmToJS(JSON, msgID);
        
    }
    
    
    // Perform a ROC analysis to get AUC and points to plot on a ROC curve
    void EMSCRIPTEN_KEEPALIVE getROCanalysis(int msgID){
    
    
        string JSON = "{";
        if (_simpol_AUC_calculator != nullptr && _nbc_AUC_calculator != nullptr) {
        
            // SimPol
            JSON += "'simpol_AUC':" + to_string(1 - _simpol_AUC_calculator->get_chiSquared());
            if (_simpol_AUC_calculator->get_ROC_curve_JSON() != "") JSON += ",'simpol_ROC':" + _simpol_AUC_calculator->get_ROC_curve_JSON() + ",";
            
            // NBC
            JSON += ",'nbc_AUC':" + to_string(1 - _nbc_AUC_calculator->get_chiSquared());
            if (_nbc_AUC_calculator->get_ROC_curve_JSON() != "") JSON += ",'nbc_ROC':" + _nbc_AUC_calculator->get_ROC_curve_JSON();
            
            
        }
        JSON += "}";
        
        messageFromWasmToJS(JSON, msgID);
    
    
    }

    
    

    // Return a JSON string of the cumulatively calculated pause sites
    void EMSCRIPTEN_KEEPALIVE getPauserResults(int msgID){
        
        _PP_multipleSequenceAlignment->classify();
        
   
        
        string JSON = "{";
        JSON += "'sequences':" + _PP_multipleSequenceAlignment->toJSON();
        JSON += "}";

        messageFromWasmToJS(JSON, msgID);
    }
    
    
    
    
    // Update the threshold required for a site to be classified as a pause site by SimPol
    void EMSCRIPTEN_KEEPALIVE updateThreshold(char* classifier, double threshold, int msgID){
        
        string classifier_str = string(classifier);
        if (classifier_str == "simpol") _simpol_evidence_threshold = threshold;
        else if (classifier_str == "nbc") _nbc_evidence_threshold = threshold;
        
        cout << msgID << ": " <<  classifier << " threshold set to " << threshold << endl;
        
        string JSON = "{";
        JSON += "'simpolThreshold':" + to_string(_simpol_evidence_threshold) + ",";
        JSON += "'nbcThreshold':" + to_string(_nbc_evidence_threshold);
        JSON += "}";
        
        messageFromWasmToJS(JSON, msgID);
        
    }


    // Begin the PhyloPause simulations and return to js after a timeout (~1000ms) has been reached to check if user has requested to stop
    void EMSCRIPTEN_KEEPALIVE startPauser(int init, int msgID){


        if (init) {
            cout << "Intialising Pauser" << endl;
            if (_interfaceSimulator != nullptr) delete _interfaceSimulator;
            _interfaceSimulator = new Simulator(_GUI_PLOTS);
            _simpol_max_evidence = 0;
            _nbc_max_evidence = 0;
            if (_simpol_AUC_calculator != nullptr) delete _simpol_AUC_calculator;
            if (_nbc_AUC_calculator != nullptr) delete _nbc_AUC_calculator;
            _simpol_AUC_calculator = new PosteriorDistributionSample(0, 1, true);
            _nbc_AUC_calculator = new PosteriorDistributionSample(0, 1, true);
            _GUI_STOP = false;
        }
        

        // Check if told to stop
        if (_GUI_STOP){
            _GUI_STOP = false;
            _GUI_simulating = false;
            messageFromWasmToJS("{'stop':true}", msgID);
            return;
        }

       
        _GUI_simulating = true;

        // Start timer
        _interfaceSimulation_startTime = chrono::system_clock::now();
       

        // 1st element = nseqs complete, 
        // 2nd element = ntrials complete in this sequence
        // 3rd element = 1 if finished, 0 if not
        int result[3]; 
        
        
        // Perform simulations continuously and then send information back and pause once every 1000ms
        _PP_multipleSequenceAlignment->Pauser_GUI(_interfaceSimulator, _NBC_classifier, _simpol_AUC_calculator, _nbc_AUC_calculator, result);
        
        

        // C _NBC_classifier,
        string toReturnJSON = "{";
        int nseqs_complete = result[0];
        int ntrials_complete = result[1];
        bool toStop = result[2] == 1;

        // Sequence currently being simulated
        string currentSequenceProgress = _PP_multipleSequenceAlignment->getCurrentSequence();


        // Stop timer
        auto endTime = chrono::system_clock::now();
        chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
        double time = elapsed_seconds.count();

        // Return JSON string
        toReturnJSON += "'stop':" + string(toStop ?  "true" : "false") + ",";
        toReturnJSON += "'realTime':" + to_string(time) + ",";
        toReturnJSON += "'Ntot':" + to_string(ntrials_sim) + ",";
        toReturnJSON += "'nseqs_complete':" + to_string(nseqs_complete) + ",";
        toReturnJSON += "'currentSequenceProgress':'" + currentSequenceProgress + "',";
        toReturnJSON += "'ntrials_complete':" + to_string(ntrials_complete);
        toReturnJSON += "}";


        messageFromWasmToJS(toReturnJSON, msgID);
            
        
    }
    

    
}

