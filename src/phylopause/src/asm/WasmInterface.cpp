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
        cout << "Initialising Simpol for PhyloPause" << endl;
		_USING_GUI = true;
        _animationSpeed = "hidden";
        _PP_multipleSequenceAlignment = new MultipleSequenceAlignment();

	}



    // Get the number of trials being performed
    void EMSCRIPTEN_KEEPALIVE getNtrials(int msgID){
        messageFromWasmToJS("{'ntrials':" + to_string(ntrials_sim) + "}", msgID);
    }



    // Parse XML settings in string form
    void EMSCRIPTEN_KEEPALIVE loadSessionFromXML(char* XMLdata, int msgID){

        modelsToEstimate.clear();
        XMLparser::parseXMLFromString(XMLdata);
        Settings::sampleAll();

        _currentStateGUI = new State(true, true);

        // Send the globals settings back to the DOM 
        string parametersJSON = "{" + Settings::toJSON() + "}";

        // Ensure that the sitewise plot is always displayed and the other plots are hidden
        Plots::init();
        Plots::hideAllPlots(true);
        Plots::hideSitewisePlot(false); 
        Plots::set_sendCopiedSequences(false);
        

        messageFromWasmToJS(parametersJSON, msgID);

        // Clean up
        free(XMLdata);

    }


    // Instructs the animation / simulation to stop
    void EMSCRIPTEN_KEEPALIVE stopWebAssembly(int msgID){
        _GUI_STOP = true;
        cout << "STOPPING C++" << endl;
        messageFromWasmToJS("", msgID);
    }

    // Parse an MSA from a JSON string
    void EMSCRIPTEN_KEEPALIVE parseMSA(char* fasta, int msgID){

        _PP_multipleSequenceAlignment->clear();

        // Parse each sequence in the multiple sequence alignment
        string errorMsg = _PP_multipleSequenceAlignment->parseFromFasta(string(fasta));

        if (errorMsg != "")   messageFromWasmToJS("{'error':'" + errorMsg + "'}", msgID);
        else messageFromWasmToJS(_PP_multipleSequenceAlignment->toJSON(), msgID);


    }



    // Return a JSON string of the cumulatively calculated pause sites
    void EMSCRIPTEN_KEEPALIVE getPauseSites(int msgID){

        string JSON = "{'evidence':[";
        vector<int> evidence = PauseSiteUtil::calculateEvidence(_PP_multipleSequenceAlignment);
        for(int i = 0; i < evidence.size(); i ++){
            JSON += to_string(evidence.at(i));
            if (i < evidence.size() - 1) JSON += ",";
        }


        JSON += "],'pauseSites':";
        JSON += _PP_multipleSequenceAlignment->pauseSites_toJSON();
        JSON += "}";



        messageFromWasmToJS(JSON, msgID);
    }




    // Begin the PhyloPause simulations and return to js after a timeout (~1000ms) has been reached to check if user has requested to stop
    void EMSCRIPTEN_KEEPALIVE startPhyloPause(int init, int msgID){


        if (init) {
            cout << "Intialising startPhyloPause" << endl;
            if (_interfaceSimulator != nullptr) delete _interfaceSimulator;
            _interfaceSimulator = new Simulator();
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
        _PP_multipleSequenceAlignment->PhyloPause(_interfaceSimulator, result);


        // Create JSON string
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

        // cout << "Plots data " << Plots::timeToCatalysisPerSite_toJSON() << endl;

        messageFromWasmToJS(toReturnJSON, msgID);
            
        
    }
    

}







