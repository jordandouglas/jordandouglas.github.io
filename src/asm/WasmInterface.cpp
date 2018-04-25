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
#include "FreeEnergy.h"
#include "TranslocationRatesCache.h"
#include "Plots.h"
#include "Coordinates.h"




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
		_applyingReactionsGUI = true;
		_currentStateGUI->forward();
		_applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}

	// Move the polymerase backwards
	void EMSCRIPTEN_KEEPALIVE translocateBackwards(int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_applyingReactionsGUI = true;
		_currentStateGUI->backward();
		_applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}

	// Bind NTP or add it onto the chain if already bound
	void EMSCRIPTEN_KEEPALIVE bindOrCatalyseNTP(int msgID){
		_applyingReactionsGUI = true;
		_currentStateGUI->bindNTP();
		_applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Release NTP or remove it from the chain if already added
	void EMSCRIPTEN_KEEPALIVE releaseOrRemoveNTP(int msgID){
		_applyingReactionsGUI = true;
		_currentStateGUI->releaseNTP();
		_applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Activate the polymerase from its catalytically inactive state
	void EMSCRIPTEN_KEEPALIVE activatePolymerase(int msgID){
		_applyingReactionsGUI = true;
		_currentStateGUI->activate();
		_applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Deactivate the polymerase by putting it into a catalytically inactive state
	void EMSCRIPTEN_KEEPALIVE deactivatePolymerase(int msgID){
		_applyingReactionsGUI = true;
		_currentStateGUI->deactivate();
		_applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Cleave the 3' end of the nascent strand if backtracked
	void EMSCRIPTEN_KEEPALIVE cleaveNascentStrand(int msgID){
		_applyingReactionsGUI = true;
		_currentStateGUI->cleave();
		_applyingReactionsGUI = false;
		messageFromWasmToJS("", msgID);
	}

	// Form / diffuse / fuse / fissure / absorb bulge with id S to the left
	void EMSCRIPTEN_KEEPALIVE slipLeft(int S, int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_applyingReactionsGUI = true;
		_currentStateGUI->slipLeft(S);
		_applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}

	// Form / diffuse / fuse / fissure / absorb bulge with id S to the right
	void EMSCRIPTEN_KEEPALIVE slipRight(int S, int msgID){
		if (_slippageLandscapesToSendToDOM != nullptr) delete _slippageLandscapesToSendToDOM;
		_slippageLandscapesToSendToDOM = new SlippageLandscapes();
		_applyingReactionsGUI = true;
		_currentStateGUI->slipRight(S);
		_applyingReactionsGUI = false;
		messageFromWasmToJS(_slippageLandscapesToSendToDOM->toJSON(), msgID);
	}




	// Returns all data needed to draw the translocation arrow canvas
	void EMSCRIPTEN_KEEPALIVE getTranslocationCanvasData(int msgID){


		double kBck = _currentStateGUI->calculateBackwardRate(true, false);
		double kFwd = _currentStateGUI->calculateForwardRate(true, false);
		bool bckBtnActive = _currentStateGUI->getLeftTemplateBaseNumber() - bubbleLeft->getVal() - 1 > 2; // Do not allow backstepping if it will break the 3' bubble
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
		activationJSON += "'canCleave':" + string(_currentStateGUI->get_mRNAPosInActiveSite() < 0 ? "true" : "false") + ",";
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
		slippageJSON += "'hybridLen':" + to_string(hybridLen->getVal());
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
		double troughForceGradient = FAssist->getVal() * 1e-12 * 3.4  * 1e-10 / (_kBT); // Force x distance / kBT
		double forceGradientBck = (+FAssist->getVal() * 1e-12 * (3.4-barrierPos->getVal()) * 1e-10) / (_kBT);
		double forceGradientFwd = (-FAssist->getVal() * 1e-12 * (barrierPos->getVal()) * 1e-10) / (_kBT);


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
		messageFromWasmToJS("", msgID);
	}


	// Returns a JSON object containing how to fold the mRNA
	void EMSCRIPTEN_KEEPALIVE getMFESequenceBonds(int msgID){
		
		if (!_showRNAfold_GUI) {
			messageFromWasmToJS("", msgID);
			return;
		}
		
		auto timeStart = chrono::system_clock::now();
		string foldJSON = _currentStateGUI->fold();
		auto timeStop = chrono::system_clock::now();


		chrono::duration<double> elapsed_seconds = timeStop - timeStart;
		double time = elapsed_seconds.count();

		cout << "Time to fold mRNA " << time << "s" << endl;

		messageFromWasmToJS(foldJSON, msgID);
	}



	// Refresh the current state
	void EMSCRIPTEN_KEEPALIVE refresh(int msgID){

		// Reset state
		delete _currentStateGUI;
		_currentStateGUI = new State(true, true);


		// Sample parameters
		Settings::sampleAll();

		// Refresh plot
		Plots::refreshPlotData(_currentStateGUI);


		// Ensure that the current sequence's translocation rate cache is up to date
		currentSequence->initRateTable();


		messageFromWasmToJS("", msgID);
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




	// Parse XML settings in string form
	void EMSCRIPTEN_KEEPALIVE loadSessionFromXML(char* XMLdata, int msgID){

		Settings::init();
	
		// Reinitialise the modeltimer_start
		delete currentModel;
		currentModel = new Model();
		
		XMLparser::parseXMLFromString(XMLdata);
		Settings::sampleAll();
		Settings::initSequences();

		// Send the globals settings back to the DOM 
		string parametersJSON = "{" + Settings::toJSON() + "}";
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
	int EMSCRIPTEN_KEEPALIVE userInputSequence(char* newSeq, char* newTemplateType, char* newPrimerType, int inputSequenceIsNascent, int msgID){

		string seq = inputSequenceIsNascent == 1 ? Settings::complementSeq(string(newSeq), string(newTemplateType).substr(2) == "RNA") : string(newSeq);
		if (seq.length() < hybridLen->getVal() + 2) return 0;
		Sequence* newSequence = new Sequence("$user", string(newTemplateType), string(newPrimerType), seq); 
		sequences["$user"] = newSequence;
		Settings::setSequence("$user");
		delete _currentStateGUI;
		_currentStateGUI = new State(true, true);
		Plots::init(); // Reinitialise plot data every time sequence changes

		return 1;

	}


	// Set the sequence to one in the list
	void EMSCRIPTEN_KEEPALIVE userSelectSequence(char* seqID){
		bool succ = Settings::setSequence(string(seqID));
		if (!succ) cout << "Cannot find sequence " << seqID << "." << endl;
		else {
			delete _currentStateGUI;
			_currentStateGUI = new State(true, true);
			Plots::init(); // Reinitialise plot data every time sequence changes
		}

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
		messageFromWasmToJS("", msgID);

	}




	// Save the distribution and its arguments of a parameter (and samples it)
	void EMSCRIPTEN_KEEPALIVE saveParameterDistribution(char* paramID, char* distributionName, char* distributionArgNames, double* distributionArgValues, int nArgs) {

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

		parametersJSON += "'refreshDOM':" + string(_needToReinitiateAnimation ? "true" : "false") + ",";

		for (int i = 0; i < Settings::paramList.size(); i ++){
			parametersJSON += Settings::paramList.at(i)->toJSON();
			if (i < Settings::paramList.size()-1) parametersJSON += ",";
		}

		parametersJSON += "}";
		_needToReinitiateAnimation = false;
		messageFromWasmToJS(parametersJSON, msgID);
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


		currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date

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

		// Current state
		stateDiagramJSON += "'NTPbound':" + string(_currentStateGUI->NTPbound() ? "true" : "false") + ",";
		stateDiagramJSON += "'activated':" + string(_currentStateGUI->get_activated() ? "true" : "false") + ",";
		stateDiagramJSON += "'mRNAPosInActiveSite':" + to_string(_currentStateGUI->get_mRNAPosInActiveSite()) + ",";
		stateDiagramJSON += "'mRNALength':" + to_string(_currentStateGUI->get_nascentLength()) + ",";


		// Calculate all rates for the state (from backtrack -2 to hypertranslocated +3) 
		State* stateToCalculateFor = _currentStateGUI->clone();
		stateToCalculateFor->releaseNTP();
		stateToCalculateFor->deactivate(); // Set to deactivated so we can backtrack


		// Get the state into backtracked (m = -2)
		for (int i = stateToCalculateFor->get_mRNAPosInActiveSite(); i < -2; i ++){
			stateToCalculateFor->forward();
		}
		for (int i = stateToCalculateFor->get_mRNAPosInActiveSite(); i > -2; i --){
			stateToCalculateFor->backward();
		}


		// State m = -2
		stateDiagramJSON += "'k -2,-1':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From backtrack 2 to backtrack 1

		// State m = -1
		stateToCalculateFor->forward();
		stateDiagramJSON += "'k -1,-2':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From backtrack 1 to backtrack 2
		stateDiagramJSON += "'k -1,0':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From backtrack 1 to pretranslocated


		// State m = 0
		stateToCalculateFor->forward();
		double k_01 = stateToCalculateFor->calculateForwardRate(true, true);
		stateDiagramJSON += "'k 0,-1':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From pretranslocated to backtrack 1
		stateDiagramJSON += "'k 0,+1':" + to_string(currentModel->get_assumeTranslocationEquilibrium() ? 0 : stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From pretranslocated to posttranslocated


		// State m = 1
		stateToCalculateFor->forward();
		double k_10 = stateToCalculateFor->calculateBackwardRate(true, true);
		stateDiagramJSON += "'k +1,0':" + to_string(currentModel->get_assumeTranslocationEquilibrium() ? 0 : stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From posttranslocated to pretranslocated
		stateDiagramJSON += "'k +1,+2':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From posttranslocated to hypertranslocated 1
		stateDiagramJSON += "'kbind':" + to_string(currentModel->get_assumeBindingEquilibrium() ? 0 : stateToCalculateFor->calculateBindNTPrate(true)) + ","; // Rate of binding NTP
		stateDiagramJSON += "'krelease':" + to_string(currentModel->get_assumeBindingEquilibrium() ? 0 : stateToCalculateFor->calculateReleaseNTPRate(true)) + ","; // Rate of releasing NTP
		stateDiagramJSON += "'kcat':" + to_string(stateToCalculateFor->calculateCatalysisRate(true)) + ","; // Rate of catalysis
		stateDiagramJSON += "'KD':" + to_string(Kdiss->getVal()) + ","; // Dissociation constant
		stateDiagramJSON += "'Kt':" + to_string(k_10 == 0 || k_01 == 0 ? 0 : k_10 / k_01) + ","; // Translocation constant
		//cout << "k_10 " << k_10 << " k_01 " << k_01 << endl;


		// State m = 2
		stateToCalculateFor->forward();
		stateDiagramJSON += "'k +2,+1':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From hypertranslocated 1 to posttranslocated
		stateDiagramJSON += "'k +2,+3':" + to_string(stateToCalculateFor->calculateForwardRate(true, false)) + ","; // From hypertranslocated 1 to hypertranslocated 2


		// State m = 3
		stateToCalculateFor->forward();
		stateDiagramJSON += "'k +3,+2':" + to_string(stateToCalculateFor->calculateBackwardRate(true, false)) + ","; // From hypertranslocated 2 to hypertranslocated 1


		stateDiagramJSON += "'kA':" + to_string(stateToCalculateFor->calculateActivateRate(true)) + ","; // Rate of activation
		stateDiagramJSON += "'kU':" + to_string(stateToCalculateFor->calculateDeactivateRate(true)); // Rate of ianctivation

		stateDiagramJSON += "}";
		messageFromWasmToJS(stateDiagramJSON, msgID);

		delete stateToCalculateFor;

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
		_interfaceSimulator = new Simulator();
		_interfaceSimulator->initialise_GUI_simulation(N, 1000);


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
		//string plotsJSON = Plots::getPlotDataAsJSON();


		// Stop timer
		auto endTime = chrono::system_clock::now();
		chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
		double time = elapsed_seconds.count();


		toReturnJSON += "'animationTime':" + to_string(Coordinates::getAnimationTime()) + ",";
		//toReturnJSON += "'plots':" + plotsJSON + ",";
		toReturnJSON += "'stop':" + string(toStop ?  "true" : "false") + ",";
		toReturnJSON += "'realTime':" + to_string(time);
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
			string plotsJSON = Plots::getPlotDataAsJSON();
			string toReturnJSON = "{'stop':true, 'plots':" + plotsJSON + "}";
			_GUI_STOP = false;
			_GUI_simulating = false;
			messageFromWasmToJS(toReturnJSON, msgID);
			delete _interfaceSimulator;
			//delete _interfaceSimulation_startTime;
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
		//string plotsJSON = Plots::getPlotDataAsJSON();


		// Stop timer
		auto endTime = chrono::system_clock::now();
		chrono::duration<double> elapsed_seconds = endTime - _interfaceSimulation_startTime;
		double time = elapsed_seconds.count();


		// Return string
		toReturnJSON += "'animationTime':" + to_string(Coordinates::getAnimationTime()) + ",";
		//toReturnJSON += "'plots':" + plotsJSON + ",";
		toReturnJSON += "'stop':" + string(toStop ?  "true" : "false") + ",";
		toReturnJSON += "'realTime':" + to_string(time);
		toReturnJSON += "}";
		messageFromWasmToJS(toReturnJSON, msgID);

		
	}


	// Return any unsent plot data as well as the plot display settings
	void EMSCRIPTEN_KEEPALIVE getPlotData(int msgID){
		string JSON = Plots::getPlotDataAsJSON();
		messageFromWasmToJS(JSON, msgID);
	}


	// User selects which plot should be displayed in a certain plot slot
	void EMSCRIPTEN_KEEPALIVE userSelectPlot(int plotNum, char* value, int deleteData, int msgID){

		Plots::userSelectPlot(plotNum, string(value), deleteData == 1);
		string plotsJSON = Plots::getPlotDataAsJSON();
		messageFromWasmToJS(plotsJSON, msgID);

	}


	// User saves plot settings for a given plot
	void EMSCRIPTEN_KEEPALIVE savePlotSettings(int plotNum, char* values_str, int msgID){
		
		Plots::savePlotSettings(plotNum, string(values_str));
		string plotsJSON = Plots::getPlotDataAsJSON();
		messageFromWasmToJS(plotsJSON, msgID);

	}



	// User shows or hides all plots
	void EMSCRIPTEN_KEEPALIVE showPlots(int hidden){
		Plots::hideAllPlots(hidden == 1);
	}



	// Returns an object which contains the sizes of each object in the cache that can be cleared
	void EMSCRIPTEN_KEEPALIVE getCacheSizes(int msgID){
		string cacheSizeJSON = Plots::getCacheSizeJSON();
		messageFromWasmToJS(cacheSizeJSON, msgID);
	}


	// Delete the specified plot data (ie. clear the cache) 
	void EMSCRIPTEN_KEEPALIVE deletePlots(bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata, bool sequences_cleardata, int msgID){

		Plots::deletePlotData(_currentStateGUI, distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, sequences_cleardata);
		string plotsJSON = Plots::getPlotDataAsJSON();
		messageFromWasmToJS(plotsJSON, msgID);
	}




	// Calculates the mean translocation equilibrium constant, and mean rates of going forward and backwards
	void EMSCRIPTEN_KEEPALIVE calculateMeanTranslocationEquilibriumConstant(int msgID){

		double results[4];
		FreeEnergy::calculateMeanTranslocationEquilibriumConstant(results);

		// Build JSON string
		string parametersJSON = "{";
		parametersJSON += "'meanEquilibriumConstant':" + to_string(results[0]) + ",";
		parametersJSON += "'meanEquilibriumConstantFwdOverBck':" + to_string(results[1]) + ",";
		parametersJSON += "'meanForwardRate':" + to_string(results[2]) + ",";
		parametersJSON += "'meanBackwardsRate':" + to_string(results[3]);
		parametersJSON += "}";
		messageFromWasmToJS(parametersJSON, msgID);

	}







	
	// **********************
	//   NODE.JS FUNCTIONS
	// **********************
	
	
	// Set the input file name for subsequent use by main()
	void EMSCRIPTEN_KEEPALIVE setInputFilename(char* filename){
		inputXMLfilename = string(filename);
	}
	
	// Set the output file name for subsequent use by main()
	void EMSCRIPTEN_KEEPALIVE setOutputFilename(char* filename){
		outputFilename = string(filename);
	}
	

	



}








