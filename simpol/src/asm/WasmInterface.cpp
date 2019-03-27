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
#include "../../../src/asm/Coordinates.h"
#include "../../../src/asm/SimPol_vRNA_interface.h"
#include "../../../src/asm/SimPol_bendit_interface.h"
#include "../../../src/asm/MCMC.h"
#include "../../../src/asm/BayesianCalculations.h"
#include "../../../src/asm/PosteriorDistributionSample.h"
#include "../../../src/asm/GelLaneData.h"
#include "../../../src/asm/GelCalibrationSearch.h"
#include "../../../src/asm/SimulatorPthread.h"



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
		_USING_GUI = true;
        _GUI_PLOTS = new Plots();
		//_currentStateGUI = new State(true, true);
	}


	// Returns a JSON string with all unrendered objects and removes these objects from the list
	void EMSCRIPTEN_KEEPALIVE getUnrenderedobjects(int msgID){
		string unrenderedObjectJSON = Coordinates::getUnrenderedObjectsJSON(true);
		messageFromWasmToJS(unrenderedObjectJSON, msgID);
	}


	/* 
	------------------  Reactions  -----------------
	*/


	// Returns the list of actions needed to transcribe 10 bases, and the animation speed
	void EMSCRIPTEN_KEEPALIVE getTranscriptionActions(int N, int msgID){

		_GUI_STOP = false;
		_applyingReactionsGUI = true;

		int animationSpeed = Coordinates::getAnimationTime();

		// Hidden mode
		if (animationSpeed == 0){
			_currentStateGUI->transcribe(N);
			messageFromWasmToJS("", msgID);
		}

		else{

			// Do not perform all the actions immediately (unless hidden mode).
			// Instead this function returns a list of actions to do. Then each action is
			// performed one at a time, and is rendered on the DOM in between subsequent actions
			list<int> actionsToDo = _currentStateGUI->getTranscribeActions(N);
			string actionsJSON = "{'actions':[";
			for (list<int>::iterator it= actionsToDo.begin(); it != actionsToDo.end(); ++it){
				actionsJSON += to_string(*it) + ",";
			}
			if (actionsJSON.substr(actionsJSON.length()-1, 1) == ",") actionsJSON = actionsJSON.substr(0, actionsJSON.length() - 1);
			actionsJSON += "],";

			// Get animation speed
			actionsJSON += "'animationTime':" + to_string(animationSpeed) + "}";

			messageFromWasmToJS(actionsJSON, msgID);

		}

		_applyingReactionsGUI = false;


	}


	// Returns the list of actions needed to transcribe 10 bases, and the animation speed
	void EMSCRIPTEN_KEEPALIVE getStutterActions(int N, int msgID){

		_GUI_STOP = false;
		_applyingReactionsGUI = true;

		int animationSpeed = Coordinates::getAnimationTime();

		// Hidden mode
		if (animationSpeed == 0){
			_currentStateGUI->stutter(N);
			messageFromWasmToJS("", msgID);
		}

		else{

			// Do not perform all the actions immediately (unless hidden mode).
			// Instead this function returns a list of actions to do. Then each action is
			// performed one at a time, and is rendered on the DOM in between subsequent actions
			list<int> actionsToDo = _currentStateGUI->getStutterActions(N);
			string actionsJSON = "{'actions':[";
			for (list<int>::iterator it= actionsToDo.begin(); it != actionsToDo.end(); ++it){
				actionsJSON += to_string(*it) + ",";
			}
			if (actionsJSON.substr(actionsJSON.length()-1, 1) == ",") actionsJSON = actionsJSON.substr(0, actionsJSON.length() - 1);
			actionsJSON += "],";

			// Get animation speed
			actionsJSON += "'animationTime':" + to_string(animationSpeed) + "}";

			messageFromWasmToJS(actionsJSON, msgID);

		}

		_applyingReactionsGUI = false;


	}





	// Apply the specified reaction
	bool EMSCRIPTEN_KEEPALIVE applyReaction(int reactionNumber){


		if (!_GUI_STOP){

			_applyingReactionsGUI = true;
			if (reactionNumber == 0) _currentStateGUI->backward();
			else if (reactionNumber == 1) _currentStateGUI->forward();
			else if (reactionNumber == 2) _currentStateGUI->releaseNTP();
			else if (reactionNumber == 3) _currentStateGUI->bindNTP();
			else if (reactionNumber == 4) _currentStateGUI->activate();
			else if (reactionNumber == 5) _currentStateGUI->deactivate();
			else if (reactionNumber == 6) _currentStateGUI->terminate();
			else if (reactionNumber == 7) _currentStateGUI->cleave();
			else if (reactionNumber == 8) _currentStateGUI->slipLeft(0);
			else if (reactionNumber == 9) _currentStateGUI->slipRight(0);
			_applyingReactionsGUI = false;

		}

		return _GUI_STOP || _currentStateGUI->isTerminated();

	}


	// Move the polymerase forwards
	void EMSCRIPTEN_KEEPALIVE translocateForward(int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->forward();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}

	// Move the polymerase backwards
	void EMSCRIPTEN_KEEPALIVE translocateBackwards(int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->backward();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}

	// Bind NTP or add it onto the chain if already bound
	void EMSCRIPTEN_KEEPALIVE bindOrCatalyseNTP(int msgID){
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->bindNTP();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Release NTP or remove it from the chain if already added
	void EMSCRIPTEN_KEEPALIVE releaseOrRemoveNTP(int msgID){
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->releaseNTP();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Activate the polymerase from its catalytically inactive state
	void EMSCRIPTEN_KEEPALIVE activatePolymerase(int msgID){
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->activate();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Deactivate the polymerase by putting it into a catalytically inactive state
	void EMSCRIPTEN_KEEPALIVE deactivatePolymerase(int msgID){
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->deactivate();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Cleave the 3' end of the nascent strand if backtracked
	void EMSCRIPTEN_KEEPALIVE cleaveNascentStrand(int msgID){
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->cleave();
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Form / diffuse / fuse / fissure / absorb bulge with id S to the left
	void EMSCRIPTEN_KEEPALIVE slipLeft(int S, int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->slipLeft(S);
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}

	// Form / diffuse / fuse / fissure / absorb bulge with id S to the right
	void EMSCRIPTEN_KEEPALIVE slipRight(int S, int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_GUI_user_applying_reaction = _applyingReactionsGUI = true;
		_currentStateGUI->slipRight(S);
		_GUI_user_applying_reaction = _applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}




	// Returns all data needed to draw the translocation arrow canvas
	void EMSCRIPTEN_KEEPALIVE getTranslocationCanvasData(int msgID){


		double kBck = _currentStateGUI->calculateBackwardRate(true, false);
		double kFwd = _currentStateGUI->calculateForwardRate(true, false);
		bool bckBtnActive = _currentStateGUI->getLeftTemplateBaseNumber() - bubbleLeft->getVal(true) - 1 > 2; // Do not allow backstepping if it will break the 3' bubble
		bool fwdBtnActive = _currentStateGUI->getLeftTemplateBaseNumber() < templateSequence.length(); // Do not going forward if beyond the end of the sequence
		string fwdBtnLabel = !_currentStateGUI->isTerminated() && _currentStateGUI->getLeftTemplateBaseNumber() >= _currentStateGUI->get_nascentLength() ? "Terminate" : "Forward";

		// Build the JSON string
		string translocationJSON = "{";
		translocationJSON += "'kBck':" + to_string(kBck) + ",";
		translocationJSON += "'kFwd':" + to_string(kFwd) + ",";
		translocationJSON += "'bckBtnActive':" + string(bckBtnActive ? "true" : "false") + ",";
		translocationJSON += "'fwdBtnActive':" + string(fwdBtnActive ? "true" : "false") + ",";
		translocationJSON += "'fwdBtnLabel':'" + fwdBtnLabel + "'";
		translocationJSON += "}";

		messageFromWasmToJS(translocationJSON, msgID);

	}


	// Returns all data needed to draw the NTP bind/release navigation canvas
	void EMSCRIPTEN_KEEPALIVE getNTPCanvasData(int msgID){

		// If the polymerase is post-translocated or hypertranslocated, then return the base to be transcribed next and the pair before it
		// Otherwise return the most recently transcribed base
		int deltaBase = _currentStateGUI->get_mRNAPosInActiveSite() <= 0 ? -1 : 0;
		string baseToAdd = "";
		if (deltaBase == 0) baseToAdd = _currentStateGUI->getNextBaseToAdd() != "" ? _currentStateGUI->getNextBaseToAdd() : Settings::complementSeq(templateSequence.substr(_currentStateGUI->get_nextTemplateBaseToCopy()-1, 1), PrimerType.substr(2) == "RNA");
		else baseToAdd = _currentStateGUI->get_NascentSequence().substr(_currentStateGUI->get_nascentLength() - 1, 1);

		// Build the JSON string
		string ntpJSON = "{";
		ntpJSON += "'NTPbound':" + string(_currentStateGUI->NTPbound() ? "true" : "false") + ",";
		ntpJSON += "'mRNAPosInActiveSite':" + to_string(_currentStateGUI->get_mRNAPosInActiveSite()) + ",";
		ntpJSON += "'baseToAdd':'" + baseToAdd + "',";
		ntpJSON += "'kBind':" + to_string(_currentStateGUI->calculateBindNTPrate(false)) + ",";
		ntpJSON += "'kRelease':" + to_string(_currentStateGUI->calculateReleaseNTPRate(false)) + ",";
		ntpJSON += "'kCat':" + to_string(_currentStateGUI->calculateCatalysisRate(false)) + ",";
		ntpJSON += "'templateBaseBeingCopied':'" + templateSequence.substr(_currentStateGUI->get_nextTemplateBaseToCopy() + deltaBase - 1, 1) + "',";
		ntpJSON += "'previousTemplateBase':'" + templateSequence.substr(_currentStateGUI->get_nextTemplateBaseToCopy() + deltaBase - 2, 1) + "',";
		ntpJSON += "'previousNascentBase':'" + _currentStateGUI->get_NascentSequence().substr(_currentStateGUI->get_nascentLength() + deltaBase - 1, 1) + "',";
		ntpJSON += "'terminated':" + string(_currentStateGUI->isTerminated() ? "true" : "false") + ",";
		ntpJSON += "'activated':" + string(_currentStateGUI->get_activated() ? "true" : "false");
		ntpJSON += "}";

		messageFromWasmToJS(ntpJSON, msgID);

	}


	// Returns all data needed to draw the activate/deactivate navigation canvas
	void EMSCRIPTEN_KEEPALIVE getDeactivationCanvasData(int msgID){

		string activationJSON = "{";
		activationJSON += "'NTPbound':" + string(_currentStateGUI->NTPbound() ? "true" : "false") + ",";
        
        bool operationApplicable = _currentStateGUI->get_mRNAPosInActiveSite() == 0;
        activationJSON += "'operationApplicable':" + string(operationApplicable ? "true" : "false") + ",";
        
		activationJSON += "'activated':" + string(_currentStateGUI->get_activated() ? "true" : "false") + ",";
		activationJSON += "'kA':" + to_string(_currentStateGUI->calculateActivateRate(false)) + ",";
		activationJSON += "'kU':" + to_string(_currentStateGUI->calculateDeactivateRate(false)) + ",";
		activationJSON += "'allowDeactivation':" + string(currentModel->get_allowInactivation() ? "true" : "false");
		activationJSON += "}";
		messageFromWasmToJS(activationJSON, msgID);

	}


	// Returns all data needed to draw the cleavage navigation canvas
	void EMSCRIPTEN_KEEPALIVE getCleavageCanvasData(int msgID){

		
		string activationJSON = "{";
		activationJSON += "'canCleave':" + string( (_currentStateGUI->get_mRNAPosInActiveSite() < 0 && (CleavageLimit->getVal(true) == 0|| _currentStateGUI->get_mRNAPosInActiveSite() >= -CleavageLimit->getVal(true)))  ? "true" : "false") + ",";
		activationJSON += "'kcleave':" + to_string(_currentStateGUI->calculateCleavageRate(false));
		activationJSON += "}";
		messageFromWasmToJS(activationJSON, msgID);

	}


	// Returns all data needed to draw the slippage navigation canvas
	void EMSCRIPTEN_KEEPALIVE getSlippageCanvasData(int S, int msgID){



		State* stateLeft = _currentStateGUI->clone();
		State* stateRight = _currentStateGUI->clone();
		stateLeft->slipLeft(S);
		stateRight->slipRight(S);

		// Return the 3 states, the 2 button names and the hybrid length
		//var toReturn = {stateMiddle: stateMiddle, stateLeft: stateLeft, stateRight:stateRight, 


		string slippageJSON = "{";
		slippageJSON += "'stateMiddle':" + _currentStateGUI->toJSON() + ",";
		slippageJSON += "'stateLeft':" + stateLeft->toJSON() + ",";
		slippageJSON += "'stateRight':" + stateRight->toJSON() + ",";
		slippageJSON += "'leftLabel':" + _currentStateGUI->getSlipLeftLabel(S) + ",";
		slippageJSON += "'rightLabel':" + _currentStateGUI->getSlipRightLabel(S) + ",";
		slippageJSON += "'hybridLen':" + to_string(hybridLen->getVal(true));
		slippageJSON += "}";



		messageFromWasmToJS(slippageJSON, msgID);

	}

 


	// Returns the trough and peak heights of the translocation energy landscape
	void EMSCRIPTEN_KEEPALIVE getTranslocationEnergyLandscape(int msgID){



		// 6 peaks and 7 troughs
		double slidingPeakHeights[6];
		double slidingTroughHeights[7];
		double maxHeight = 10000; // Infinity
		slidingPeakHeights[0] = maxHeight;
		slidingPeakHeights[1] = maxHeight;
		slidingPeakHeights[2] = maxHeight;
		slidingPeakHeights[3] = maxHeight;
		slidingPeakHeights[4] = maxHeight;
		slidingPeakHeights[5] = maxHeight;
		

		// Calculate force gradients. The current state will have change in energy energy due to force = 0
		double troughForceGradient = FAssist->getVal(true) * 1e-12 * 3.4  * 1e-10 / (_kBT); // Force x distance / kBT
		double forceGradientBck = (+FAssist->getVal(true) * 1e-12 * (3.4-barrierPos->getVal(true)) * 1e-10) / (_kBT);
		double forceGradientFwd = (-FAssist->getVal(true) * 1e-12 * (barrierPos->getVal(true)) * 1e-10) / (_kBT);


		// Energy and 2 surrounding peaks of current state
		slidingTroughHeights[3] = _currentStateGUI->calculateTranslocationFreeEnergy(false);
		slidingPeakHeights[2] = _currentStateGUI->calculateBackwardTranslocationFreeEnergyBarrier(false) + forceGradientBck;
		slidingPeakHeights[3] = _currentStateGUI->calculateForwardTranslocationFreeEnergyBarrier(false) + forceGradientFwd;



		// Go back as far as permitted
		if (slidingPeakHeights[2] < INF){
			

			State* stateClone = _currentStateGUI->clone();
			for (int i = 2; i >= 0; i --){

				stateClone->backward();
				slidingTroughHeights[i] = stateClone->calculateTranslocationFreeEnergy(false) + (troughForceGradient * (3-i));
				if (i > 0) {

					// Do not go backwards again if not permitted
					double backwardHill = stateClone->calculateBackwardTranslocationFreeEnergyBarrier(false);
					if (backwardHill >= INF) break;
					slidingPeakHeights[i-1] = backwardHill + forceGradientBck * (3-(i-1));

				}

			}
			delete stateClone;
		} else slidingPeakHeights[2] = maxHeight;


		// Go forward as far as permitted
		if (slidingPeakHeights[3] < INF){


			State* stateClone = _currentStateGUI->clone();
			for (int i = 4; i <= 6; i ++){

				stateClone->forward();
				slidingTroughHeights[i] = stateClone->calculateTranslocationFreeEnergy(false) + (troughForceGradient * (3-i));
				if (i < 6) {

					// Do not go forwards again if not permitted
					double forwardHill = stateClone->calculateForwardTranslocationFreeEnergyBarrier(false);
					if (forwardHill >= INF) break;
					slidingPeakHeights[i] = forwardHill + forceGradientFwd * ((i+1)-3);

				}

			}
			delete stateClone;
		} else slidingPeakHeights[3] = maxHeight;




		// Build JSON string. Troughs
		string landscapeJSON = "{";
		landscapeJSON += "'slidingTroughHeights':[";
		for (int i = 0; i <= 6; i ++) {
			landscapeJSON += to_string(slidingTroughHeights[i]);
			if (i < 6) landscapeJSON += ",";
		}
		landscapeJSON += "]";



		// Peaks
		landscapeJSON += ",'slidingPeakHeights':[";
		for (int i = 0; i <= 5; i ++) {
			landscapeJSON += to_string(slidingPeakHeights[i]);
			if (i < 5) landscapeJSON += ",";
		}
		landscapeJSON += "]";
		landscapeJSON += "}";
	


		messageFromWasmToJS(landscapeJSON, msgID);

	}


	
	
	// Toggle between displaying or not displaying the folded mRNA
	void EMSCRIPTEN_KEEPALIVE showFoldedRNA(bool showFolding, int msgID){

		_showRNAfold_GUI = showFolding;
		if (!showFolding) _currentStateGUI->unfold();


		messageFromWasmToJS("", msgID);
	}


	// Returns a JSON object containing how to fold the mRNA
	void EMSCRIPTEN_KEEPALIVE getMFESequenceBonds(int msgID){
		
		if (!_showRNAfold_GUI) {
			messageFromWasmToJS("", msgID);
			return;
		}
		
		_currentStateGUI->fold(true, true);

		messageFromWasmToJS("", msgID);
	}



	// Refresh the current state
	void EMSCRIPTEN_KEEPALIVE refresh(int msgID){


		// Must reset coordinates here if hidden because the state will not do so if hidden 
		if (_animationSpeed == "hidden") Coordinates::resetToInitialState();



		// Sample parameters
		Settings::sampleAll();


		// Reset state
		delete _currentStateGUI;
		_currentStateGUI = new State(true, true);

		// Refresh plot
		_GUI_PLOTS->refreshPlotData(_currentStateGUI);


		// Ensure that the current sequence's translocation rate cache is up to date
		currentSequence->initRateTable();
		currentSequence->initRNAunfoldingTable();


		messageFromWasmToJS("{'ID':'" + currentModel->getID()  + "'}", msgID);
	}



	// Instructs the animation / simulation to stop
	void EMSCRIPTEN_KEEPALIVE stopWebAssembly(int msgID){
		_GUI_STOP = true;
		cout << "STOPPING C++" << endl;
		messageFromWasmToJS("", msgID);
	}

	// User change the animation speed
	void EMSCRIPTEN_KEEPALIVE changeSpeed(char* speed, int msgID){

		
		// If speed was changed to hidden then delete all coordinate objects
		//if (string(speed) == "hidden" && _animationSpeed != "hidden") Coordinates::clearAllCoordinates();

		// If speed was change from hidden to visible then add all the objects back
		if (string(speed) != "hidden" && _animationSpeed == "hidden") Coordinates::generateAllCoordinates(_currentStateGUI);


		_animationSpeed = speed;
		messageFromWasmToJS("", msgID);

		free(speed);
	}


	// Get the speed (units of time)
	double EMSCRIPTEN_KEEPALIVE getAnimationTime(){
		return Coordinates::getAnimationTime();
	}



	// User selects which base to add next manually
	void EMSCRIPTEN_KEEPALIVE userSetNextBaseToAdd(char* ntpToAdd, int msgID){

		string ntpToAdd_str = string(ntpToAdd);
		if (ntpToAdd_str == "T" && PrimerType.substr(2) == "RNA") ntpToAdd_str = "U";
		else if (ntpToAdd_str == "U" && PrimerType.substr(2) == "DNA") ntpToAdd_str = "T";

		_currentStateGUI->setNextBaseToAdd(ntpToAdd_str);
		messageFromWasmToJS("", msgID);


	}



	// Gets the next base to add 
	void EMSCRIPTEN_KEEPALIVE getNextBaseToAdd(int msgID){

		// Build the JSON string
		string baseToAdd = _currentStateGUI->getNextBaseToAdd() != "" ? _currentStateGUI->getNextBaseToAdd() : Settings::complementSeq(templateSequence.substr(_currentStateGUI->get_nextTemplateBaseToCopy()-1, 1), PrimerType.substr(2) == "RNA");
		string baseToAddJSON = "{'NTPtoAdd':'" + baseToAdd + "'}";
		messageFromWasmToJS(baseToAddJSON, msgID);

	}


    
    
    
    // Parse XML settings as chunks
    void EMSCRIPTEN_KEEPALIVE loadSessionFromXML_chunk(char* XMLdata){
        //cout << "Received chunk" << endl; 
        chunk_string = chunk_string + string(XMLdata);
    }
    

	// Parse XML settings from all the previously parsed chunks
	void EMSCRIPTEN_KEEPALIVE loadSessionFromXML(int msgID){

		if (chunk_string == ""){
            cout << "Please upload XML in chunks first" << endl;
            messageFromWasmToJS("", msgID);
            return;
        }
	
		// Reinitialise the modeltimer_start
		//delete currentModel;
		//currentModel = new Model();
		modelsToEstimate.clear();
		
        
        // Parse XML
		XMLparser::parseXMLFromString(chunk_string.c_str(), _GUI_PLOTS);
        
		Settings::sampleAll();
		//Settings::initSequences();


		// Send the globals settings back to the DOM 
		string parametersJSON = "{" + Settings::toJSON() + "}";

		cout << "Finished parsing XML" << endl;
        chunk_string = "";

		messageFromWasmToJS(parametersJSON, msgID);



	}


	// Provides all information necessary to construct an XML string so the user can download the current session
	void EMSCRIPTEN_KEEPALIVE getSaveSessionData(int msgID){

		// Send the globals settings back to the DOM 
		string sessionJSON = "{";

		// Parameters
		sessionJSON += "'PHYSICAL_PARAMETERS':{";
		for (int i = 0; i < Settings::paramList.size(); i ++){
			sessionJSON += Settings::paramList.at(i)->toJSON();
			if (i < Settings::paramList.size()-1) sessionJSON += ",";
		}
		sessionJSON += "}";


		// Template sequence
		sessionJSON += ",'TEMPLATE_SEQUENCE':'" + templateSequence + "'";

		// Current polymerase
		sessionJSON += ",'POLYMERASE':'" + _currentPolymerase + "'";

		// Current model
		sessionJSON += ",'ELONGATION_MODEL':{" + currentModel->toJSON() + "}";
	

		sessionJSON += "}";
		messageFromWasmToJS(sessionJSON, msgID);
		
	}


	// Get the sequences saved to the model
	void EMSCRIPTEN_KEEPALIVE getSequences(int msgID){

		string parametersJSON = "{";

		// Iterate through all sequences
		for(std::map<string, Sequence*>::iterator iter = sequences.begin(); iter != sequences.end(); ++iter){
			string id = iter->first;
			Sequence* seq = iter->second;
			parametersJSON += seq->toJSON() + ",";
		}

		parametersJSON = parametersJSON.substr(0, parametersJSON.length()-1); // Remove final ,
		parametersJSON += "}";

		//cout << "Returning " << parametersJSON << endl;



		messageFromWasmToJS(parametersJSON, msgID);

	}


	// User enter their own sequence. Return whether or not it worked
	void EMSCRIPTEN_KEEPALIVE userInputSequence(char* newSeq, char* newTemplateType, char* newPrimerType, int inputSequenceIsNascent, int msgID){

		string seq = inputSequenceIsNascent == 1 ? Settings::complementSeq(string(newSeq), string(newTemplateType).substr(2) == "RNA") : string(newSeq);
		if (seq.length() < hybridLen->getVal(true) + 2) {
			messageFromWasmToJS("{'succ':false}", msgID);
			return;
		}
		Sequence* newSequence = new Sequence("$user", string(newTemplateType), string(newPrimerType), seq); 
		sequences["$user"] = newSequence;
		Settings::setSequence("$user");
		delete _currentStateGUI;
		_currentStateGUI = new State(true, true);
		_GUI_PLOTS->init(); // Reinitialise plot data every time sequence changes


		messageFromWasmToJS("{'succ':true}", msgID);






	}


	// Set the sequence to one in the list
	void EMSCRIPTEN_KEEPALIVE userSelectSequence(char* seqID, int msgID){
		bool succ = Settings::setSequence(string(seqID));
		if (!succ) cout << "Cannot find sequence " << seqID << "." << endl;
		else {
			delete _currentStateGUI;
			_currentStateGUI = new State(true, true);
			_GUI_PLOTS->init(); // Reinitialise plot data every time sequence changes

			cout << "done" << endl;
		}

		messageFromWasmToJS("", msgID);

      
	}


	// Returns a list of all polymerases and specifies which one is currently selected
	void EMSCRIPTEN_KEEPALIVE getPolymerases(int msgID){

		string JSON = "{'polymerases':{";
		for (int i = 0; i < _polymerases.size(); i ++){
			JSON += _polymerases.at(i)->toJSON();
			if (i < _polymerases.size()-1) JSON += ",";
		}
		JSON += "},'currentPolymerase':'" + _currentPolymerase + "'}";

		messageFromWasmToJS(JSON, msgID);

	}

	// Set the current polymerase to the one specified by the user (specified by ID)
	void EMSCRIPTEN_KEEPALIVE userChangePolymerase(char* polID, int msgID){

		Settings::activatePolymerase(polID);
		messageFromWasmToJS("{" + currentModel->toJSON() + "}", msgID);



	}




	// Save the distribution and its arguments of a parameter (and samples it)
	void EMSCRIPTEN_KEEPALIVE saveParameterDistribution(char* paramID, char* distributionName, char* distributionArgNames, double* distributionArgValues, int nArgs) {


		// Parameter is being changed -> revert to default model so it does not change the currently sampled model
		Settings::setModel("default");


		string paramID_s = string(paramID);
		if (paramID_s == "hybridLen" || paramID_s == "bubbleLeft" || paramID_s == "bubbleRight") _needToReinitiateAnimation = true;

		Parameter* param = Settings::getParameterByName(paramID_s);
		if (param){
			param->setPriorDistribution(string(distributionName));

			vector<string> argNames = Settings::split(string(distributionArgNames), ','); // Split by , to get values
			for (int i = 0; i < nArgs; i ++) {
				string argName = argNames.at(i);
				double argVal = distributionArgValues[i];
				cout << paramID_s << ": " << argName << " = " << argVal << endl;
				param->setDistributionParameter(argName, argVal);
			}

			argNames.clear();

			param->sample();


		}


	}


	// Returns the value of a parameter
	double EMSCRIPTEN_KEEPALIVE getParameterValue(char* paramID) {

		Parameter* param = Settings::getParameterByName(string(paramID));
		if (param) return param->getVal(true);
		cout << "Cannot find parameter " << string(paramID) << "!" << endl;
		exit(0);


		return 0;

	}

	// Calculate the DNA curvature
	void EMSCRIPTEN_KEEPALIVE bendDNA(int msgID) {


		string bendJSON = "{";
		string scale_str = "Consensus";
		const char* scale = scale_str.c_str();

		if (currentModel->get_allowDNAbending()) {


			// Upstream window
			if (_currentStateGUI->getLeftTemplateBaseNumber() - 12 - upstreamWindow->getVal(true) > 0){

				string upstreamSequence = templateSequence.substr(_currentStateGUI->getLeftTemplateBaseNumber() - upstreamWindow->getVal(true) - 6, upstreamWindow->getVal(true) + 11);
				char* seq = (char *) calloc(upstreamSequence.length()+1, sizeof(char));
				double* curve = (double *) calloc(upstreamSequence.length()+1, sizeof(double));
				double* bend = (double *) calloc(upstreamSequence.length()+1, sizeof(double));
				double* gc = (double *) calloc(upstreamSequence.length()+1, sizeof(double));
				strcpy(seq, upstreamSequence.c_str());



				bendit_curvature(seq, upstreamSequence.length(), curve, bend, gc, scale, upstreamWindow->getVal(true), upstreamWindow->getVal(true));


				string nextNum;
				bendJSON += "'upstreamCurve':[";
				for (int i = 0; i < upstreamSequence.length(); i ++){
					if (curve[i] >= 360) nextNum = "'inf'";
					else nextNum = to_string(curve[i]);
					bendJSON += nextNum;
					if (i < upstreamSequence.length() - 1) bendJSON += ",";
				}
				bendJSON += "],'upstreamBend':[";
				for (int i = 0; i < upstreamSequence.length(); i ++){
					if (bend[i] >= 100000) nextNum = "'inf'";
					else nextNum = to_string(bend[i]);
					bendJSON += nextNum;
					if (i < upstreamSequence.length() - 1) bendJSON += ",";
				}
				bendJSON += "],'upstreamSequence':'" + upstreamSequence + "',";


				free(curve);
				free(bend);
				free(gc);
				free(seq);

			}



			// Downstream window
			if (_currentStateGUI->getRightTemplateBaseNumber() + 12 + downstreamWindow->getVal(true) < templateSequence.length()){

				string downstreamSequence = templateSequence.substr(_currentStateGUI->getRightTemplateBaseNumber(), downstreamWindow->getVal(true) + 11);
				char* seq = (char *) calloc(downstreamSequence.length()+1, sizeof(char));
				double* curve = (double *) calloc(downstreamSequence.length()+1, sizeof(double));
				double* bend = (double *) calloc(downstreamSequence.length()+1, sizeof(double));
				double* gc = (double *) calloc(downstreamSequence.length()+1, sizeof(double));

				strcpy(seq, downstreamSequence.c_str());

				bendit_curvature(seq, downstreamSequence.length(), curve, bend, gc, scale, downstreamWindow->getVal(true), downstreamWindow->getVal(true));


				string nextNum;
				bendJSON += "'downstreamCurve':[";
				for (int i = 0; i < downstreamSequence.length(); i ++){
					if (curve[i] >= 360) nextNum = "'inf'";
					else nextNum = to_string(curve[i]);
					bendJSON += nextNum;
					if (i < downstreamSequence.length() - 1) bendJSON += ",";
				}
				bendJSON += "],'downstreamBend':[";
				for (int i = 0; i < downstreamSequence.length(); i ++){
					if (bend[i] >= 100000) nextNum = "'inf'";
					else nextNum = to_string(bend[i]);
					bendJSON += nextNum;
					if (i < downstreamSequence.length() - 1) bendJSON += ",";
				}
				bendJSON += "],'downstreamSequence':'" + downstreamSequence + "',";


				free(curve);
				free(bend);
				free(gc);
				free(seq);

			}



		}


		if (bendJSON.substr(bendJSON.length()-1, 1) == ",") bendJSON = bendJSON.substr(0, bendJSON.length() - 1);

		bendJSON += "}";


		messageFromWasmToJS(bendJSON, msgID);


	}


    void EMSCRIPTEN_KEEPALIVE setNThreads(int n){
        cout << "Setting nthreads to " << n << endl;
        N_THREADS = n;
        SimulatorPthread::init(); 
    }



	// Initialise ABC
	void EMSCRIPTEN_KEEPALIVE initABC(int msgID){


		cout << "Initialising ABC..." << endl;

		_GUI_STOP = false;
		_GUI_simulating = true;

		// Output string
		_ABCoutputToPrint.str("");
		_ABCoutputToPrint.clear();


		_GUI_PLOTS->prepareForABC();
		//Settings::print();
        
        if (inferenceMethod == "ABC"){
        
            cout << "Initialising R-ABC" << endl;
            MCMC::initMCMC(false, false);
            
        
        }
        
        else {
        
        
            cout << "Initialising MCMC-ABC" << endl;
        
    		// Initialise MCMC
    		MCMC::initMCMC(false, true);
        
        }
        
		_currentLoggedPosteriorDistributionID = 0;


		string toReturnJSON = "{'stop':" + string(_GUI_STOP ?  "true" : "false") + ",";
		toReturnJSON += "'acceptanceRate':0,";
		toReturnJSON += "'status':'" + MCMC::getStatus() + "',";
		toReturnJSON += "'epsilon':'" + to_string(MCMC::getEpsilon()) + "',";
		toReturnJSON += "'selectedPosteriorID':" + to_string(_currentLoggedPosteriorDistributionID) + ",";
		toReturnJSON += "'newLines':'" + _ABCoutputToPrint.str() + "'}";


		messageFromWasmToJS(toReturnJSON, msgID);


		cout << "Initialised ABC." << endl;


	}



	// Begin ABC with the specified settings
	void EMSCRIPTEN_KEEPALIVE resumeABC(int msgID){

		

		//Settings::print();

		// Start timer
		_interfaceSimulation_startTime = chrono::system_clock::now();

		// Output string
		_ABCoutputToPrint.str("");
		_ABCoutputToPrint.clear();



		// Stop when user presses stop button or when all trials completed
		bool stop = false;
        if (inferenceMethod == "ABC") stop = _GUI_posterior.size() >= ntrials_abc;
        else stop = MCMC::getPreviousStateNumber() > ntrials_abc || MCMC::get_hasFailedBurnin() || _GUI_STOP;
        int currentState = inferenceMethod == "ABC" ? _GUI_posterior.size() + 1 : MCMC::getPreviousStateNumber() + 1;
		_RUNNING_ABC = !stop;

		if (!stop){

			// Stop timer
			auto endTime = chrono::system_clock::now();
			chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
			double time = elapsed_seconds.count();

			//cout << "Starting trial " << inferenceMethod << ":" << currentState << endl;

			while(time < 1 && !stop) {
			
                    
                if (inferenceMethod == "ABC"){
                
                
                    currentState = _GUI_posterior.size() + 1;
                
                    Settings::sampleAll();

                    // Cache the parameter values in posterior row object
                    PosteriorDistributionSample* state = new PosteriorDistributionSample(currentState, _numExperimentalObservations, true);
                    for (list<Parameter*>::iterator it = MCMC::get_parametersToEstimate()->begin(); it != MCMC::get_parametersToEstimate()->end(); ++it){
                        //(*it)->print();
                        state->addParameterEstimate((*it)->getID(), (*it)->getTrueVal());
                    }
                    if (modelsToEstimate.size() > 1) state->set_modelIndicator(currentModel->getID());
                    state->set_logPriorProb(MCMC::calculateLogPriorProbability());
                
                    // Sample 1 R-ABC state
                    BayesianCalculations::perform_1_rejectionABC_iteration(state);
                    
                    // Keep the posterior distribution sorted by X2
                    Settings::sortedPush_posterior(_GUI_posterior, state);
                    if (currentState == 1) state->printHeader(false);
                    state->print(false);
                    

                    
                    stop = _GUI_posterior.size() >= ntrials_abc || _GUI_STOP;
                    
                }
                
                else {
                
                    // Perform 1 MCMC-ABC iteration
                    currentState = MCMC::getPreviousStateNumber() + 1;
                    MCMC::perform_1_iteration(currentState);
                    
                    stop = MCMC::getPreviousStateNumber() > ntrials_abc || MCMC::get_hasFailedBurnin() || _GUI_STOP;
                    
                }
            

				
				endTime = chrono::system_clock::now();
				elapsed_seconds = endTime - _interfaceSimulation_startTime;
				time = elapsed_seconds.count();

				


			}
            

		}
        
        
        // JSON string
        string toReturnJSON = "{'stop':" + string(stop ?  "true" : "false") + ",";
        
        // Update _RABC_quantile here (if epsilon is being used)
        if (inferenceMethod == "ABC"){
        
        
            if (_RABC_useEpsilon) {
        
                int nStatesLessThanEpsilon = 0;
                for (list<PosteriorDistributionSample*>::iterator it = _GUI_posterior.begin(); it != _GUI_posterior.end(); ++ it){
                    double chiSq_list = (*it)->get_chiSquared();
                    if (chiSq_list >= _RABC_epsilon){
                        break;
                    }else{
                        nStatesLessThanEpsilon ++;
                    }
                    
                }
                
                _RABC_quantile = 1.0 * nStatesLessThanEpsilon / _GUI_posterior.size();
            
            }
            
            
            
            // Return a list of accepted state numbers
            list<int> acceptedStateNumbers;
            if (_RABC_quantile > 0) {
                int n = 0;
                for (list<PosteriorDistributionSample*>::iterator it = _GUI_posterior.begin(); it != _GUI_posterior.end(); ++ it){
                
                    // Add the state to the list of accepted states
                    int stateNum = (*it)->getStateNumber();
                    acceptedStateNumbers.push_back(stateNum);
                    
                    // If have exceeded _RABC_quantile then break
                    n++;
                    if (n >= floor(_RABC_quantile * _GUI_posterior.size())) break;
                
                }
            }
            
            
            // List to string
            string acceptedStateNumbers_str = "";
            for (list<int>::iterator it = acceptedStateNumbers.begin(); it != acceptedStateNumbers.end(); ++ it){
                acceptedStateNumbers_str += to_string(*it) + ",";
            }
            if (acceptedStateNumbers_str.length() > 0 && acceptedStateNumbers_str.substr(acceptedStateNumbers_str.length()-1, 1) == ",") acceptedStateNumbers_str = acceptedStateNumbers_str.substr(0, acceptedStateNumbers_str.length() - 1);
            toReturnJSON += "'accepted':[" + acceptedStateNumbers_str + "],";
            
        
        }


		
		toReturnJSON += "'acceptanceRate':" + to_string(MCMC::getAcceptanceRate() * 100) + ",";
		toReturnJSON += "'status':'" + MCMC::getStatus() + "',";
		toReturnJSON += "'epsilon':'" + to_string(MCMC::getEpsilon()) + "',";
		toReturnJSON += "'newLines':'" + _ABCoutputToPrint.str() + "'}";


		messageFromWasmToJS(toReturnJSON, msgID);



	}
    
    
    
    // Change either the quantile or the value of epsilon of the R-ABC posterior distribution
    // Returns a list of integers corresponding to which state numbers are now in the posterior distribution
    // Assumes that the posterior distribution _GUI_posterior is sorted by X2
    void EMSCRIPTEN_KEEPALIVE update_RABC_epsilon(double value, int valueIsEpsilon, int msgID){
    
    
        string JSON = "{";
        string acceptedStateNumbers_str = "";
        list<int> acceptedStateNumbers;
        double epsilon, quantile;
        
        
        // Build a list of all states with X2 below epsilon='value'
        if (valueIsEpsilon){
            _RABC_useEpsilon = true;       
            epsilon = value;
            if (epsilon < 0) epsilon = 0;

            
            
            int nStatesLessThanEpsilon = 0;
            for (list<PosteriorDistributionSample*>::iterator it = _GUI_posterior.begin(); it != _GUI_posterior.end(); ++ it){
                double chiSq_list = (*it)->get_chiSquared();
                if (chiSq_list > epsilon){
                    break;
                }else{
                    int stateNum = (*it)->getStateNumber();
                    //Settings::sortedPush(acceptedStateNumbers, stateNum);
                    acceptedStateNumbers.push_back(stateNum);
                    nStatesLessThanEpsilon ++;
                }
                
            }
            
            
            // Calculate the quantile corresponding to epsilon
            quantile = 1.0 * nStatesLessThanEpsilon / _GUI_posterior.size();
        
        
        }
        
        
        // Build a list of all states whose X2 is in the top 'value' quantile
        else {
            _RABC_useEpsilon = false;  
            quantile = value;
            if (quantile < 0) quantile = 0;
            if (quantile > 1) quantile = 1;
            
            list<PosteriorDistributionSample*>::iterator it = _GUI_posterior.begin();
            
            if (quantile > 0) {
                int n = 0;
                for (it = it; it != _GUI_posterior.end(); ++ it){
                    
                    // If have exceeded quantile then break
                    n++;
                    if (n >= floor(quantile * _GUI_posterior.size())) break;
                    
                    
                    // Add the state to the list of accepted states
                    int stateNum = (*it)->getStateNumber();
                    acceptedStateNumbers.push_back(stateNum);
                    
                
                }
            }
            
            
            // Update epsilon
            epsilon = (*it)->get_chiSquared();
            
        
        }
        
        
       //cout << "epsilon = " << epsilon << " quantile = " << quantile << endl;
        
        
        // List to string
        for (list<int>::iterator it = acceptedStateNumbers.begin(); it != acceptedStateNumbers.end(); ++ it){
            acceptedStateNumbers_str += to_string(*it) + ",";
        }
        if (acceptedStateNumbers_str.length() > 0 && acceptedStateNumbers_str.substr(acceptedStateNumbers_str.length()-1, 1) == ",") acceptedStateNumbers_str = acceptedStateNumbers_str.substr(0, acceptedStateNumbers_str.length() - 1);
        
        _RABC_epsilon = epsilon;
        _RABC_quantile = quantile;
    
        // Return JSON
        JSON += "'epsilon':" + to_string(epsilon) + ",";
        JSON += "'quantile':" + to_string(quantile) + ",";
        JSON += "'accepted':[" + acceptedStateNumbers_str + "]";
        JSON += "}";
    
        messageFromWasmToJS(JSON, msgID);
    
    }


	// Get posterior distribution summary (geometric medians etc)
	void EMSCRIPTEN_KEEPALIVE getPosteriorSummaryData(int msgID){

		// Find the geometric median state
        int stopAt = inferenceMethod == "ABC" ? floor(_RABC_quantile * _GUI_posterior.size()) : _GUI_posterior.size();
        if (stopAt == 0) {
            messageFromWasmToJS("{}", msgID);
            return;
        }
        list<PosteriorDistributionSample*>::iterator finalElementIterator = _GUI_posterior.begin();
        std::advance(finalElementIterator, stopAt-1);
		vector<PosteriorDistributionSample*> GUI_posterior_vec{ std::begin(_GUI_posterior), finalElementIterator };

		// If no posterior distribution then return
		if (GUI_posterior_vec.size() == 0) {
			messageFromWasmToJS("{}", msgID);
			return;
		}

		PosteriorDistributionSample* geometricMedian = BayesianCalculations::getGeometricMedian(GUI_posterior_vec, false, false);



		// Convert to JSON
		string toReturnJSON = "{'state':" + to_string(geometricMedian->getStateNumber()) + ",";
		toReturnJSON += "'chiSquared':" + to_string(geometricMedian->get_chiSquared()) + ",";

		// Estimated model
		if (_sampleModels) toReturnJSON += "'model':'" + geometricMedian->get_modelIndicator() + "',";

		toReturnJSON += "'paramNamesAndMedians':{";


		// Iterate through each parameter in the geometric median
		for (int i = 0; i < geometricMedian->getParameterNames().size(); i++){
			string paramID = geometricMedian->getParameterNames().at(i);
			cout << "param " << paramID << endl;
			Parameter* param = Settings::getParameterByName(paramID);
			if (param == nullptr) continue;
			string name = param->getName();
			double val = geometricMedian->getParameterEstimate(paramID);

			toReturnJSON += "'" + paramID + "':{";
			toReturnJSON += "'name':'" + name + "',";
			toReturnJSON += "'estimate':" + to_string(val);
			toReturnJSON += "},";
		}


		if (toReturnJSON.substr(toReturnJSON.length()-1, 1) == ",") toReturnJSON = toReturnJSON.substr(0, toReturnJSON.length() - 1);
		toReturnJSON += "}}";


		messageFromWasmToJS(toReturnJSON, msgID);
		
	}


	// Get posterior distribution list
	void EMSCRIPTEN_KEEPALIVE getPosteriorDistribution(int msgID){

		string toReturnJSON = "{";
        if (inferenceMethod == "ABC") toReturnJSON += "'burnin':0,";
		if (inferenceMethod == "MCMC") toReturnJSON += "'burnin':" +  to_string( burnin < 0 ? MCMC::get_nStatesUntilBurnin() : floor(burnin / 100 * _GUI_posterior.size()) ) + ",";

		// Velocities and band densities
		toReturnJSON += "'posterior':[";
        int n = 0;
        int stopAt = inferenceMethod == "ABC" ? floor(_RABC_quantile * _GUI_posterior.size()) : _GUI_posterior.size();
		for (list<PosteriorDistributionSample*>::iterator it = _GUI_posterior.begin(); it != _GUI_posterior.end(); ++ it){
            n++;
            if (n >= stopAt) break;
			toReturnJSON += (*it)->toJSON() + ",";
		}
        
        //cout << "stop at " << stopAt << " _RABC_quantile " << _RABC_quantile << " n " << n << " toReturnJSON " << toReturnJSON << endl;
        
		if (toReturnJSON.length() && toReturnJSON.substr(toReturnJSON.length()-1, 1) == ",") toReturnJSON = toReturnJSON.substr(0, toReturnJSON.length() - 1);
		toReturnJSON += "]";



		toReturnJSON += "}";
		messageFromWasmToJS(toReturnJSON, msgID);

	}


	// Generate the full ABC output
	void EMSCRIPTEN_KEEPALIVE getABCoutput(int msgID, int posteriorDistributionID){

		// Output string
		_ABCoutputToPrint.str("");
		_ABCoutputToPrint.clear();


		list<PosteriorDistributionSample*> posterior = Settings::getPosteriorDistributionByID(posteriorDistributionID);
        
        
         
        // If R-ABC then sort the posterior distribution by X2
        if (inferenceMethod == "ABC"){
            cout << "Sorting posterior " << endl;
            Settings::sort_posterior(posterior);
        }
        
        

		posterior.front()->printHeader(false);
		for (list<PosteriorDistributionSample*>::iterator it = posterior.begin(); it != posterior.end(); ++ it){
			(*it)->print(false);
		}


		string toReturnJSON = "{'lines':'" + _ABCoutputToPrint.str() + "'}";

		messageFromWasmToJS(toReturnJSON, msgID);



	}
    
    
    // Upload the ABC posterior distribution in chunks
    void EMSCRIPTEN_KEEPALIVE uploadABC_chunk(char* tsvInput){
        //cout << "Received chunk" << endl; 
        chunk_string = chunk_string + string(tsvInput);
    }
    
    

	// Upload the ABC file
	void EMSCRIPTEN_KEEPALIVE uploadABC(int msgID){

    
        if (chunk_string == ""){
            cout << "Please upload ABC in chunks first" << endl;
            messageFromWasmToJS("", msgID);
            return;
        }
    
		cout << "wasm uploadABC ";
        cout << string(chunk_string).size() << endl;
		MCMC::initMCMC(true, inferenceMethod == "MCMC");
		
		vector<string> lines = Settings::split(chunk_string, '!');
        _currentLoggedPosteriorDistributionID = 0;
		bool success = false;
		vector<string> headerLineSplit;
		vector<string> lineSplit;
		if (lines.size() > 1) {


			// Get the header line
			int lineNum = 0;
			for (lineNum = 0; lineNum < lines.size(); lineNum ++){


				if (lines.at(lineNum) == "") continue;
				headerLineSplit = Settings::split(lines.at(lineNum), '&');
				break;

			}


			if (headerLineSplit.size() > 0) {

				// Will add all states to the posterior distribution list
				_GUI_posterior.clear();


				// All other lines 
				for (lineNum = lineNum + 1; lineNum < lines.size(); lineNum ++){



					if (lines.at(lineNum) == "") continue;

					PosteriorDistributionSample* state = new PosteriorDistributionSample(0, _numExperimentalObservations, true);
					lineSplit = Settings::split(lines.at(lineNum), '&');
	        		state->parseFromLogFileLine(lineSplit, headerLineSplit);
	        		_GUI_posterior.push_back(state);
	        		lineSplit.clear();

				}


				// Set the last state as the new MCMC state
				if (_GUI_posterior.size() > 1) {

					MCMC::setPreviousState(_GUI_posterior.back()->clone(true));
					success = true;
				}

			}

			headerLineSplit.clear();

        }

		string toReturnJSON = "{'success':" + string(success ? "true" : "false") + ",";
		toReturnJSON += "'inferenceMethod':'" + inferenceMethod + "',";
		toReturnJSON += "'acceptanceRate':0,";
		toReturnJSON += "'status':'" + MCMC::getStatus() + "',";
		toReturnJSON += "'epsilon':" + to_string(MCMC::getEpsilon());
		toReturnJSON += "}";


		// Notify the plots that ABC is in effect
		_GUI_PLOTS->prepareForABC();

		lines.clear();

		// Clear the output string
		_ABCoutputToPrint.str("");
		_ABCoutputToPrint.clear();
        chunk_string = "";
        

        
		messageFromWasmToJS(toReturnJSON, msgID);




	}



	/*
	// Add data for a single lane (easier to iterate through lanes in js than in c++)
	void EMSCRIPTEN_KEEPALIVE addGelLane(char* fitID, int laneNum, double time, char* densities){



		GelLaneData* newLane

		cout << "Received fitID: " << string(fitID) << ", laneNum: " << laneNum << endl;
		vector<string> densitiesVec = Settings::split(string(densities), ','); // Split by , to get values
		for (int i = 0; i < densitiesVec.size(); i ++){
			cout << densitiesVec.at(i) << ",";
		}
		cout << endl;

		//GelLaneData

		//messageFromWasmToJS("", msgID);
	}
	*/

	// Initialise MCMC to infer the parameters of the gel lanes (ie. build a linear model of MW vs migration distance)
	// Each datapoint in priors consists of (length of transcript, mean pixel value, sigma pixel value)
	void EMSCRIPTEN_KEEPALIVE initGelCalibration(int fitID, char* priors, int msgID){


		_GUI_STOP = false;

		// Output string
		_ABCoutputToPrint.str("");
		_ABCoutputToPrint.clear();


		cout << "Received priors " << string(priors) << endl;
		vector<string> priorsVec = Settings::split(string(priors), '|');
		vector<string> datapoints;
		free(priors);

		list<Parameter*> calibrationObservations;
		

		// Iterate through each datapoint
		for (int i = 0; i < priorsVec.size(); i ++){

			if (priorsVec.at(i).length() == 0) continue;

			// Get the 3 values for this datapoint
			datapoints = Settings::split(string(priorsVec.at(i)), ','); 

			if (datapoints.size() < 3) continue;


			int transcriptLength = stoi(datapoints.at(0));
			double pixelMu = stof(datapoints.at(1));
			double pixelSigma = stof(datapoints.at(2));


			// Will store in a parameter object since this is essentially a parameter. Also need to store the true transcript length. This is done hackily using the fixedDistnVal property
			Parameter* obs = new Parameter("len" + to_string(transcriptLength), false, "false", "Migration distance for l=" + to_string(transcriptLength),  "Migration distance for l=" + to_string(transcriptLength));
			obs->setDistributionParameter("fixedDistnVal", 1.0 * transcriptLength)->setDistributionParameter("normalMeanVal", pixelMu)->setDistributionParameter("normalSdVal", pixelSigma)->setPriorDistribution("Normal");
			obs->sample();
			calibrationObservations.push_back(obs);


			datapoints.clear();

		}
		priorsVec.clear();


		_currentLoggedPosteriorDistributionID = fitID;
		

		std::vector<Parameter*> calibrationsVector { std::begin(calibrationObservations), std::end(calibrationObservations) };
		GelCalibrationSearch::initMCMC(fitID, calibrationsVector, 1000000, 1000);


		// Ensure that a trace plot is showing this posterior distribution
		_GUI_PLOTS->setTracePlotPosteriorByID(fitID);



		string toReturnJSON = "{'stop':" + string(_GUI_STOP ?  "true" : "false") + ",";
		toReturnJSON += "'acceptanceRate':0,";
		toReturnJSON += "'selectedPosteriorID':" + to_string(_currentLoggedPosteriorDistributionID) + ",";
		toReturnJSON += "'lines':'" + _ABCoutputToPrint.str() + "'}";

		messageFromWasmToJS(toReturnJSON, msgID);

		cout << "Gel calibration initialised" << endl;



	}




	// Resume MCMC to infer the parameters of the gel lanes (ie. build a linear model of MW vs migration distance)
	void EMSCRIPTEN_KEEPALIVE resumeGelCalibration(int msgID){


		// Output string
		_ABCoutputToPrint.str("");
		_ABCoutputToPrint.clear();



		// Stop when user presses stop button or when all trials completed
		bool stop = _GUI_STOP;
		_RUNNING_ABC = !stop;


		// Stop timer
		_interfaceSimulation_startTime = chrono::system_clock::now();
		auto endTime = chrono::system_clock::now();
		chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
		double time = elapsed_seconds.count();



		while(time < 1 && !stop) {


		

			// Start MCMC and return to the DOM every 1000 ms
			stop = GelCalibrationSearch::perform_1_iteration(GelCalibrationSearch::getCurrentStateNumber() + 1) || _GUI_STOP;

			
			endTime = chrono::system_clock::now();
			elapsed_seconds = endTime - _interfaceSimulation_startTime;
			time = elapsed_seconds.count();


		}



		string toReturnJSON = "{'stop':" + string(stop ?  "true" : "false") + ",";
		toReturnJSON += "'acceptanceRate':" + to_string(GelCalibrationSearch::getAcceptanceRate() * 100) + ",";
		toReturnJSON += "'lines':'" + _ABCoutputToPrint.str() + "'}";


		messageFromWasmToJS(toReturnJSON, msgID);

	}




	// Returns the posterior distribution for calibrating this gel
	void EMSCRIPTEN_KEEPALIVE getGelPosteriorDistribution(int fitID, int msgID){


		list<PosteriorDistributionSample*> posterior = Settings::getPosteriorDistributionByID(fitID);

		string toReturnJSON = "{";
		//toReturnJSON += "'burnin':" + to_string( burnin < 0 ? MCMC::get_nStatesUntilBurnin() : floor(burnin / 100 * _GUI_posterior.size()) ) + ",";

		// Velocities and band densities
		toReturnJSON += "'posterior':[";
		for (list<PosteriorDistributionSample*>::iterator it = posterior.begin(); it != posterior.end(); ++ it){
			toReturnJSON += (*it)->toJSON() + ",";
		}
		if (toReturnJSON.substr(toReturnJSON.length()-1, 1) == ",") toReturnJSON = toReturnJSON.substr(0, toReturnJSON.length() - 1);
		toReturnJSON += "],";
		toReturnJSON += "'burnin':" + to_string(std::floor(posterior.size() * 0.1));
		toReturnJSON += "}";

		messageFromWasmToJS(toReturnJSON, msgID);


	}


	// Get all parameters in the specified posterior distribution. 0 = regular posterior distribution, 1,2,3, ... refer to gel calibrations
	void EMSCRIPTEN_KEEPALIVE getParametersInPosteriorDistribution(int id, int msgID){


		// Use default parameters if the posterior ID is -1 (ie. not a posterior)
		if (id == -1){
			string parametersJSON = "{";

			for (int i = 0; i < Settings::paramList.size(); i ++){
				parametersJSON += Settings::paramList.at(i)->toJSON();
				if (i < Settings::paramList.size()-1) parametersJSON += ",";
			}

			parametersJSON += "}";

			messageFromWasmToJS(parametersJSON, msgID);

		}

		else messageFromWasmToJS(BayesianCalculations::getParametersInPosteriorDistributionJSON(id), msgID);
	}


	// Set the current distribution
	void EMSCRIPTEN_KEEPALIVE setCurrentLoggedPosteriorDistributionID(int id, int msgID){
		cout << "Setting current posterior to " << id << endl;
		_currentLoggedPosteriorDistributionID = id;
		messageFromWasmToJS("{}", msgID);
	}



	// Return a list of all parameters which are being estimated in the posterior distribution
	void EMSCRIPTEN_KEEPALIVE getParametersWithPriors(int msgID){

		if (_GUI_posterior.size() > 0){

			// Likelihood MCMC
			if (!_GUI_posterior.front()->isABC()){

				string JSON = "{";

				JSON += "'logLikelihood':{'name':'Log Likelihood'},";
				JSON += "'logPosterior':{'name':'Log Posterior'}";
				JSON += "}";

				messageFromWasmToJS(JSON, msgID);
			}

			// ABC MCMC
			else{
				messageFromWasmToJS("{" + MCMC::parametersToEstimate_toJSON() + "}", msgID);
			}

		}

		else messageFromWasmToJS("{}", msgID);
		
	}


	// Change the burn-in
	void EMSCRIPTEN_KEEPALIVE update_burnin(double burnin_new, int msgID){
		burnin = burnin_new;
		messageFromWasmToJS("", msgID);
	}



	// Returns all information of all parameters in JSON format
	void EMSCRIPTEN_KEEPALIVE getAllParameters(int msgID){


		string parametersJSON = "{";

		parametersJSON += "'refreshDOM':" + string(_needToReinitiateAnimation ? "true" : "false") + ",";

		for (int i = 0; i < Settings::paramList.size(); i ++){
			parametersJSON += Settings::paramList.at(i)->toJSON();
			if (i < Settings::paramList.size()-1) parametersJSON += ",";
		}

		parametersJSON += "}";
		_needToReinitiateAnimation = false;
		messageFromWasmToJS(parametersJSON, msgID);
	}


	// Get the names of all posterior distributions
	void EMSCRIPTEN_KEEPALIVE getPosteriorDistributionNames(int msgID){

		string posteriorsJSON = "{";

		if (_GUI_posterior.size() > 0) posteriorsJSON += "'0':'SimPol ABC',";
		for (std::map<int, list<PosteriorDistributionSample*>>::iterator iter = _gelPosteriorDistributions.begin(); iter != _gelPosteriorDistributions.end(); ++iter){
			int id = iter->first;
			posteriorsJSON += "'" + to_string(id) + "':'Gel calibration " + to_string(id) + "',";
		}

		if (posteriorsJSON.substr(posteriorsJSON.length()-1, 1) == ",") posteriorsJSON = posteriorsJSON.substr(0, posteriorsJSON.length() - 1);
		posteriorsJSON += "}";


		messageFromWasmToJS(posteriorsJSON, msgID);
	}



	// Returns the length of the templaye
	void EMSCRIPTEN_KEEPALIVE getTemplateSequenceLength(int msgID){
		string lengthJSON = "{";
		lengthJSON += "'nbases':" + to_string(templateSequence.length());
		lengthJSON += "}";
		messageFromWasmToJS(lengthJSON, msgID);
	}

	
	
	// Saves the current model settings
	void EMSCRIPTEN_KEEPALIVE setModelSettings(int msgID, char* modelSettingNames, char* modelSettingVals){


		// User has made a change to the model -> revert to the default model (if models are being compared) 
		Settings::setModel("default");


		vector<string> settings = Settings::split(string(modelSettingNames), ','); // Split by , to get values
		vector<string> values = Settings::split(string(modelSettingVals), ','); // Split by , to get values
		for (int i = 0; i < settings.size(); i ++) {
			string setting = settings.at(i);
			string val = values.at(i);
			//currentModel->setDistributionParameter(argName, val);
			
			if (setting == "allowBacktracking") currentModel->set_allowBacktracking(val == "true");
			else if (setting == "allowHypertranslocation") currentModel->set_allowHypertranslocation(val == "true");
			else if (setting == "allowInactivation") currentModel->set_allowInactivation(val == "true");
			else if (setting == "allowGeometricCatalysis") currentModel->set_allowGeometricCatalysis(val == "true");
			else if (setting == "subtractMeanBarrierHeight") currentModel->set_subtractMeanBarrierHeight(val == "true");
			else if (setting == "allowDNAbending") currentModel->set_allowDNAbending(val == "true");
			else if (setting == "allowmRNAfolding") currentModel->set_allowmRNAfolding(val == "true");
			else if (setting == "allowMisincorporation") currentModel->set_allowMisincorporation(val == "true");
			else if (setting == "useFourNTPconcentrations") currentModel->set_useFourNTPconcentrations(val == "true");
			else if (setting == "NTPbindingNParams") currentModel->set_NTPbindingNParams(atoi(val.c_str()));
			else if (setting == "currentTranslocationModel") currentModel->set_currentTranslocationModel(val);
			else if (setting == "currentBacksteppingModel") currentModel->set_currentBacksteppingModel(val);
			else if (setting == "currentRNABlockadeModel") currentModel->set_currentRNABlockadeModel(val);
			else if (setting == "currentInactivationModel") currentModel->set_currentInactivationModel(val);
			else if (setting == "assumeBindingEquilibrium") currentModel->set_assumeBindingEquilibrium(val == "true");
			else if (setting == "assumeTranslocationEquilibrium") currentModel->set_assumeTranslocationEquilibrium(val == "true");
			
		}


		currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
		currentSequence->initRNAunfoldingTable();


		settings.clear();
		values.clear();

		// Hide and show parameters
		Settings::updateParameterVisibilities();
		
		// Return the model settings
		string parametersJSON = "{" + currentModel->toJSON() + "}";

		//currentModel->print();


		messageFromWasmToJS(parametersJSON, msgID);


		
		
	}

	
	// Returns the current model settings
	void EMSCRIPTEN_KEEPALIVE getModelSettings(int msgID){
		string parametersJSON = "{" + currentModel->toJSON() + "}";
		messageFromWasmToJS(parametersJSON, msgID);
	}


	// Gets all information necessary to plot rates onto the state diagram 
	void EMSCRIPTEN_KEEPALIVE getStateDiagramInfo(int msgID){


		string stateDiagramJSON = "{";


		State* stateToCalculateFor = _currentStateGUI->clone();

		// Current state
		stateDiagramJSON += "'NTPbound':" + string(stateToCalculateFor->NTPbound() ? "true" : "false") + ",";
		stateDiagramJSON += "'activated':" + string(stateToCalculateFor->get_activated() ? "true" : "false") + ",";
		stateDiagramJSON += "'mRNAPosInActiveSite':" + to_string(stateToCalculateFor->get_mRNAPosInActiveSite()) + ",";
		stateDiagramJSON += "'mRNALength':" + to_string(stateToCalculateFor->get_nascentLength()) + ",";


		// Calculate all rates for the state (from backtrack -2 to hypertranslocated +3) 
		if (stateToCalculateFor->NTPbound()) stateToCalculateFor->releaseNTP();
		



		// Get the state into backtracked (m = -2)
		for (int i = stateToCalculateFor->get_mRNAPosInActiveSite(); i > -2; i --){
            stateToCalculateFor->deactivate(); // Inactivate so we can backtrack
			stateToCalculateFor->backward();
		}
		for (int i = stateToCalculateFor->get_mRNAPosInActiveSite(); i < -2; i ++){
			stateToCalculateFor->forward();
		}


		// State m = -2
		stateDiagramJSON += "'k -2,-1':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From backtrack 2 to backtrack 1

		// State m = -1
		if (stateToCalculateFor->get_mRNAPosInActiveSite() == -2) stateToCalculateFor->forward();
		stateDiagramJSON += "'k -1,-2':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From backtrack 1 to backtrack 2
		stateDiagramJSON += "'k -1,0':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From backtrack 1 to pretranslocated


		// State m = 0
        if (stateToCalculateFor->get_mRNAPosInActiveSite() == -1) {
            stateToCalculateFor->forward();
            stateToCalculateFor->activate(); // Reactivate
        }
		double k_01 = stateToCalculateFor->calculateForwardRate(true, true);
		stateDiagramJSON += "'k 0,-1':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From pretranslocated to backtrack 1
		stateDiagramJSON += "'k 0,+1':" + to_string(currentModel->get_assumeTranslocationEquilibrium() ? 0 : stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From pretranslocated to posttranslocated



		// State m = 1
		if (stateToCalculateFor->get_mRNAPosInActiveSite() == 0) stateToCalculateFor->forward();
		double k_10 = stateToCalculateFor->calculateBackwardRate(true, true);
		stateDiagramJSON += "'k +1,0':" + to_string(currentModel->get_assumeTranslocationEquilibrium() ? 0 : stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From posttranslocated to pretranslocated
		stateDiagramJSON += "'k +1,+2':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From posttranslocated to hypertranslocated 1
		stateDiagramJSON += "'kbind':" + to_string(currentModel->get_assumeBindingEquilibrium() ? 0 : stateToCalculateFor->calculateBindNTPrate(true)) + ","; // Rate of binding NTP
		stateDiagramJSON += "'krelease':" + to_string(currentModel->get_assumeBindingEquilibrium() ? 0 : stateToCalculateFor->calculateReleaseNTPRate(true)) + ","; // Rate of releasing NTP
		stateDiagramJSON += "'kcat':" + to_string(stateToCalculateFor->calculateCatalysisRate(true)) + ","; // Rate of catalysis
        stateDiagramJSON += "'kcleave':" + to_string(stateToCalculateFor->calculateCleavageRate(true)) + ","; // Rate of cleavage
		stateDiagramJSON += "'KD':" + to_string(Kdiss->getVal(true)) + ","; // Dissociation constant
		stateDiagramJSON += "'Kt':" + to_string(k_10 == 0 || k_01 == 0 ? 0 : k_10 / k_01) + ","; // Translocation constant
		//cout << "k_10 " << k_10 << " k_01 " << k_01 << endl;



		// State m = 2
		if (stateToCalculateFor->get_mRNAPosInActiveSite() == 1) stateToCalculateFor->forward();
		stateDiagramJSON += "'k +2,+1':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From hypertranslocated 1 to posttranslocated
		stateDiagramJSON += "'k +2,+3':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From hypertranslocated 1 to hypertranslocated 2


		// State m = 3
		if (stateToCalculateFor->get_mRNAPosInActiveSite() == 2) stateToCalculateFor->forward();
		stateDiagramJSON += "'k +3,+2':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From hypertranslocated 2 to hypertranslocated 1


		stateDiagramJSON += "'kA':" + to_string(stateToCalculateFor->calculateActivateRate(true)) + ","; // Rate of activation
		stateDiagramJSON += "'kU':" + to_string(stateToCalculateFor->calculateDeactivateRate(true)); // Rate of ianctivation

		stateDiagramJSON += "}";


		delete stateToCalculateFor;
		messageFromWasmToJS(stateDiagramJSON, msgID);


	}


	// Returns the current model settings
	void EMSCRIPTEN_KEEPALIVE getParametersAndModelSettings(int msgID){
		string JSON = "{'params':{";

		for (int i = 0; i < Settings::paramList.size(); i ++){
			JSON += Settings::paramList.at(i)->toJSON();
			if (i < Settings::paramList.size()-1) JSON += ",";
		}

		JSON += "},'model':{" + currentModel->toJSON() + "}}";
		messageFromWasmToJS(JSON, msgID);
	}



	// Returns the current model settings in a compact and easy to read format
	void EMSCRIPTEN_KEEPALIVE getParametersAndModelSettings_compact(int msgID){
		string JSON = "{'parameters':{";

		for (int i = 0; i < Settings::paramList.size(); i ++){
			string paramJSON = Settings::paramList.at(i)->toJSON_compact();
			if (paramJSON != ""){
				JSON += paramJSON;
				if (i < Settings::paramList.size()-1) JSON += ",";
			}
		}

		JSON += "},'model':{" + currentModel->toJSON_compact() + "}}";
		messageFromWasmToJS(JSON, msgID);
	}



	// Inform the WASM whether the model should be sampled 
	void EMSCRIPTEN_KEEPALIVE userChangeModelSampling(int toSample, int msgID){

		if (toSample){
			_sampleModels = true;
			Settings::sampleModel();
		} 

		else {
			_sampleModels = false;
			Settings::setModel("default");

		}

		string modelSampledJSON = "{" + currentModel->toJSON()  + "}";
		messageFromWasmToJS(modelSampledJSON, msgID);
	}



	// Activates the currently selected model
	void EMSCRIPTEN_KEEPALIVE activateModel(int modelID, double modelWeight, char* modelDescription, int msgID){

		cout << "Activating model " << modelID << " and weight " << modelWeight << " to:" << modelDescription << endl;

		// If there are no models on the list to estimate, then add the current model to this list as the default model, and with weight 0
		if (modelsToEstimate.size() == 0){
			currentModel->setID("default");
			currentModel->setPriorProb(0);
			modelsToEstimate.push_back(currentModel);
		}


		string modelID_str = to_string(modelID);
		Settings::parseModel(modelID_str, modelWeight, string(modelDescription));

		// Activate this model
		//Settings::clearParameterHardcodings();
		Settings::setModel(modelID_str);
		//currentModel->activateModel();
		//Settings::updateParameterVisibilities();

		// Sample all parameters
		for (int i = 0; i < Settings::paramList.size(); i ++){
			Settings::paramList.at(i)->sample();
		}

		messageFromWasmToJS("", msgID);


	}



	// Load in all the models
	void EMSCRIPTEN_KEEPALIVE sendModels(char* modelIDs, char* modelWeights, char* modelDescription, int msgID){



		// If there are no models on the list to estimate, then add the current model to this list as the default model, and with weight 0
		if (modelsToEstimate.size() == 0){
			currentModel->setID("default");
			currentModel->setPriorProb(0);
			modelsToEstimate.push_back(currentModel);
		}


		// Split the model details into tokens
		vector<string> modelIDs_tokens = Settings::split(modelIDs, '|');
		vector<string> modelWeights_tokens = Settings::split(modelWeights, '|');
		vector<string> modelDescription_tokens = Settings::split(modelDescription, '|');

		if (modelIDs_tokens.size() != modelWeights_tokens.size() || modelIDs_tokens.size() != modelDescription_tokens.size() || modelIDs_tokens.size() != modelDescription_tokens.size()){
			cout << "Model parsing error!" << endl;
			messageFromWasmToJS("", msgID);
		}




		// Parse all the models
		for (int i = 0; i < modelIDs_tokens.size(); i ++){



			string modelID = modelIDs_tokens.at(i);
			double modelWeight = stof(modelWeights_tokens.at(i));
			string modelDescription = modelDescription_tokens.at(i);

			// Parse the model and save it in the list of models
			Settings::parseModel(modelID, modelWeight, modelDescription);

		}


		modelIDs_tokens.clear();
		modelWeights_tokens.clear();
		modelDescription_tokens.clear();



		//if (currentModel == nullptr) Settings::setModel("default");


		// Update the settings to reflect that of the currently selected model
		Settings::clearParameterHardcodings();
		currentModel->activateModel();
		Settings::updateParameterVisibilities();



		// Sample all parameters
		for (int i = 0; i < Settings::paramList.size(); i ++){
			Settings::paramList.at(i)->sample();
		}


		messageFromWasmToJS("", msgID);





	}




	// Returns a JSON string with all the information about the models being estimated
	void EMSCRIPTEN_KEEPALIVE getEstimatedModels(int msgID){



		// If there are no models on the list to estimate return the empty string
		// Otherwise return a string containing a list of all models
		string models_JSON = "{'models':[";


		// Iterate through all models to estimate (except for the default model)
		for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
			if ((*it)->getID() == "default") continue;
			models_JSON += "{" + (*it)->toJSON() + "},";
		} 
			
		if (models_JSON.substr(models_JSON.length()-1, 1) == ",") models_JSON = models_JSON.substr(0, models_JSON.length() - 1);
		models_JSON += "]}";
		messageFromWasmToJS(models_JSON, msgID);

	}



	
	// Perform N simulations
	// Returns mean velocity, real time taken and remaining number of trials to go
	// Returns to the js webworker periodically depending on speed mode
	void EMSCRIPTEN_KEEPALIVE startTrials(int N, int msgID){
		
		
		_GUI_STOP = false;
		_GUI_simulating = true;
		bool toStop = false;
		
		cout << "Starting " << N << endl;

		
		// Start timer
		_interfaceSimulation_startTime = chrono::system_clock::now();
		
		// Prepare for simulating
		_interfaceSimulator = new Simulator(_GUI_PLOTS);
        
        SimulatorResultSummary* gui_summary = new SimulatorResultSummary(N);
		_interfaceSimulator->initialise_GUI_simulation(gui_summary, 1000);


		// Create JSON string
		string toReturnJSON = "{";
	   	

	   	// Hidden mode (perform simulations continuously and then send information back and pause once every 1000ms
	   	if (_animationSpeed == "hidden"){

	   		double result[3];
		   	_interfaceSimulator->perform_N_Trials_and_stop_GUI(result);

		   	double velocity = result[0];
			double NtrialsComplete = result[1];
			toStop = result[2] == 1;

			string velocity_str = to_string(velocity) == "-nan" || to_string(velocity) == "nan" ? to_string(0) : to_string(velocity);

			// Return JSON string
			toReturnJSON += "'meanVelocity':" + velocity_str + ",'N':" + to_string(NtrialsComplete) + ",";
		}


		// Animated mode: sample a single action, return the action and then come back to do the next one
		else {

			// Perform a single action
			list<int> actionsToDo = _interfaceSimulator->sample_action_GUI();


			// Get the number of completed trials
			toReturnJSON += "'N':" + to_string(_interfaceSimulator->getNtrialsCompleted_GUI()) + ",";

			// Add the list of actions to do
			toReturnJSON += "'actions':[";
			for (list<int>::iterator i = actionsToDo.begin(); i != actionsToDo.end(); ++i){
				toReturnJSON += to_string(*i) + ",";
			}

			if (toReturnJSON.substr(toReturnJSON.length()-1, 1) == ",") toReturnJSON = toReturnJSON.substr(0, toReturnJSON.length() - 1);
			toReturnJSON += "],";

			toStop = actionsToDo.size() == 0 || _interfaceSimulator->getNtrialsCompleted_GUI() >= _interfaceSimulator->getNtrialsTotal_GUI();

		}


		// Get relevant plot data string (if all plots are invisible etc. then this string should be {})
		//string plotsJSON = _GUI_PLOTS->getPlotDataAsJSON();


		// Stop timer
		auto endTime = chrono::system_clock::now();
		chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
		double time = elapsed_seconds.count();


		toReturnJSON += "'animationTime':" + to_string(Coordinates::getAnimationTime()) + ",";
		//toReturnJSON += "'plots':" + plotsJSON + ",";
		toReturnJSON += "'stop':" + string(toStop ?  "true" : "false") + ",";
		toReturnJSON += "'realTime':" + to_string(time) + ",";
		toReturnJSON += "'currentModelID':'" + currentModel->getID() + "'";


		toReturnJSON += "}";
		messageFromWasmToJS(toReturnJSON, msgID);


			
		
	}
	
	
	// Resumes the simulations that were created in StartTrials
	// Returns mean velocity, real time taken and remaining number of trials to go
	// Returns to the js webworker periodically depending on speed mode
	void EMSCRIPTEN_KEEPALIVE resumeTrials(int msgID){
		

		_GUI_simulating = true;

		// Check if told to stop
		if (_GUI_STOP){
			string plotsJSON = _GUI_PLOTS->getPlotDataAsJSON();
			string toReturnJSON = "{'stop':true, 'plots':" + plotsJSON + "}";
			_GUI_STOP = false;
			_GUI_simulating = false;
			messageFromWasmToJS(toReturnJSON, msgID);
			delete _interfaceSimulator;
			return;
		}

		// Start timer
		_interfaceSimulation_startTime = chrono::system_clock::now();
		bool toStop = false;
		

		// Create JSON string
		string toReturnJSON = "{";
	   	

	   	// Hidden mode (perform simulations continuously and then send information back and pause once every 1000ms
	   	// Resume
	   	if (_animationSpeed == "hidden"){

	   		double result[3];
		   	_interfaceSimulator->resume_trials_GUI(result);

		   	double velocity = result[0];
			double NtrialsComplete = result[1];
			toStop = result[2] == 1;


			// Return JSON string
			string velocity_str = to_string(velocity) == "-nan" || to_string(velocity) == "nan" ? to_string(0) : to_string(velocity);
			toReturnJSON += "'meanVelocity':" + velocity_str + ",'N':" + to_string(NtrialsComplete) + ",";
		}


		// Animated mode: sample a single action, return the action and then come back to do the next one
		else {


			// Perform a single action
			list<int> actionsToDo = _interfaceSimulator->sample_action_GUI();



			// Get the number of completed trials
			toReturnJSON += "'N':" + to_string(_interfaceSimulator->getNtrialsCompleted_GUI()) + ",";

			// Add the list of actions to do
			toReturnJSON += "'actions':[";
			for (list<int>::iterator i = actionsToDo.begin(); i != actionsToDo.end(); ++i){
				toReturnJSON += to_string(*i) + ",";
			}

			if (toReturnJSON.substr(toReturnJSON.length()-1, 1) == ",") toReturnJSON = toReturnJSON.substr(0, toReturnJSON.length() - 1);
			toReturnJSON += "],";

			toStop = actionsToDo.size() == 0 ||  _interfaceSimulator->getNtrialsCompleted_GUI() >= _interfaceSimulator->getNtrialsTotal_GUI();

		}


		// Get relevant plot data string (if all plots are invisible etc. then this string should be {})
		//string plotsJSON = _GUI_PLOTS->getPlotDataAsJSON();


		// Stop timer
		auto endTime = chrono::system_clock::now();
		chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
		double time = elapsed_seconds.count();


		// Return string
		toReturnJSON += "'animationTime':" + to_string(Coordinates::getAnimationTime()) + ",";
		//toReturnJSON += "'plots':" + plotsJSON + ",";
		toReturnJSON += "'stop':" + string(toStop ?  "true" : "false") + ",";
		toReturnJSON += "'realTime':" + to_string(time) + ",";
		toReturnJSON += "'currentModelID':'" + currentModel->getID() + "'";
		toReturnJSON += "}";
		messageFromWasmToJS(toReturnJSON, msgID);

		
	}


	// Return any unsent plot data as well as the plot display settings
	void EMSCRIPTEN_KEEPALIVE getPlotData(int msgID){
		string JSON = _GUI_PLOTS->getPlotDataAsJSON();
		messageFromWasmToJS(JSON, msgID);
	}


	// User selects which plot should be displayed in a certain plot slot
	void EMSCRIPTEN_KEEPALIVE userSelectPlot(int plotNum, char* value, int deleteData, int msgID){

		_GUI_PLOTS->userSelectPlot(plotNum, string(value), deleteData == 1);
		string plotsJSON = _GUI_PLOTS->getPlotDataAsJSON();
		messageFromWasmToJS(plotsJSON, msgID);



	}


	// User saves plot settings for a given plot
	void EMSCRIPTEN_KEEPALIVE savePlotSettings(int plotNum, char* values_str, int msgID){
		
		_GUI_PLOTS->savePlotSettings(plotNum, string(values_str));
		string plotsJSON = _GUI_PLOTS->getPlotDataAsJSON();
		messageFromWasmToJS(plotsJSON, msgID);

      
	}




	// Show or hide the sitewise plot
	void EMSCRIPTEN_KEEPALIVE showSitewisePlot(int hidden){
		_GUI_PLOTS->hideSitewisePlot(hidden == 1);
	}

	// User shows or hides all plots
	void EMSCRIPTEN_KEEPALIVE showPlots(int hidden){
		_GUI_PLOTS->hideAllPlots(hidden == 1);
	}



	// Returns an object which contains the sizes of each object in the cache that can be cleared
	void EMSCRIPTEN_KEEPALIVE getCacheSizes(int msgID){
		string cacheSizeJSON = _GUI_PLOTS->getCacheSizeJSON();
		messageFromWasmToJS(cacheSizeJSON, msgID);
	}


	// Delete the specified plot data (ie. clear the cache) 
	void EMSCRIPTEN_KEEPALIVE deletePlots(bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata, bool sequences_cleardata, int msgID){
    
    
        cout << "deletePlot 1" << endl;
		_GUI_PLOTS->deletePlotData(_currentStateGUI, distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, sequences_cleardata);
        
        cout << "deletePlot 2" << endl;
		if (ABC_cleardata){
			MCMC::cleanup();
		}
        cout << "deletePlot 3" << endl;
		string plotsJSON = _GUI_PLOTS->getPlotDataAsJSON();
		messageFromWasmToJS(plotsJSON, msgID);
	}




	// Calculates the mean translocation equilibrium constant, and mean rates of going forward and backwards, and Gibbs energy of transition state
	void EMSCRIPTEN_KEEPALIVE calculateMeanTranslocationEquilibriumConstant(int msgID){

		double results[4];
		FreeEnergy::calculateMeanTranslocationEquilibriumConstant(results);

		// Build JSON string
		string parametersJSON = "{";
		parametersJSON += "'meanEquilibriumConstant':" + to_string(results[0]) + ",";
		parametersJSON += "'meanEquilibriumConstantFwdOverBck':" + to_string(results[1]) + ",";
		parametersJSON += "'meanForwardRate':" + to_string(results[2]) + ",";
		parametersJSON += "'meanBackwardsRate':" + to_string(results[3]) + ",";


		// Gibbs energy of transition state
		double meanBarrierHeight = currentSequence->getMeanTranslocationBarrierHeight() + DGtaudag->getVal(true);
		parametersJSON += "'meanBarrierHeight':" + to_string(meanBarrierHeight);
		parametersJSON += "}";
		messageFromWasmToJS(parametersJSON, msgID);

	}







	
	// **********************
	//   NODE.JS FUNCTIONS
	// **********************
	
	
	// Set the input file name for subsequent use by main()
	void EMSCRIPTEN_KEEPALIVE setInputFilename(char* filename){
		_inputXMLfilename = string(filename);
	}
	
	// Set the output file name for subsequent use by main()
	void EMSCRIPTEN_KEEPALIVE set_outputFilename(char* filename){
		_outputFilename = string(filename);
	}
	

	



}







