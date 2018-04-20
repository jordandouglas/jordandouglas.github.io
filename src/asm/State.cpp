
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


#include "State.h"
#include "Settings.h"
#include "Plots.h"
#include "Parameter.h"
#include "Model.h"
#include "FreeEnergy.h"
#include "Coordinates.h"
#include "HTMLobject.h"

#include "TranslocationRatesCache.h"
#include <iostream>
#include <locale>
#include <algorithm>
#include <iomanip>
#include <deque>

using namespace std;

State::State(bool init){

	if (init) this->setToInitialState();
	this->isGuiState = false;

}



State::State(bool init, bool guiState){

	this->isGuiState = guiState && _USING_GUI;
	if (init) {
		if (this->isGuiState && _animationSpeed != "hidden") Coordinates::resetToInitialState();
		this->setToInitialState();
	}

}


State* State::setToInitialState(){

	if (this->isGuiState) _applyingReactionsGUI = true;
	this->nascentSequence = "";
	int sequenceLength = (int)(hybridLen->getVal()-1);
	for (int i = 0; i < sequenceLength; i ++){
		this->nascentSequence += Settings::complementSeq(templateSequence.substr(i,1), PrimerType.substr(2) == "RNA");
	}
	this->mRNAPosInActiveSite = 0;
	this->boundNTP = "";
	this->NTPtoAdd = "";
	this->terminated = false;
	this->nextTemplateBaseToCopy = sequenceLength + 1;
	this->activated = true;
	this->thereHaveBeenMutations = false;


	// Which base number is on left and right side of hybrid
	this->leftTemplateBase = 0;
	this->rightTemplateBase = sequenceLength;
	this->leftNascentBase = 0;
	this->rightNascentBase = sequenceLength;
	this->changeInLeftBulgePosition =  0;


	// Information on the position and size of each bulge, and the bases each bulge contains
	this->bulgePos.push_back(0);
	this->bulgedBase.push_back(-1);
	this->bulgeSize.push_back(0);
	this->partOfBulgeID.push_back(0);

	
	// Transcribe a few bases forward to avoid left bubble effects
	this->transcribe(_nBasesToTranscribeInit + max(2, (int)(bubbleLeft->getVal())));
	if (this->isGuiState) _applyingReactionsGUI = false;
	return this;
}

State* State::clone(){

	State* s = new State(false);
	s->nascentSequence = this->nascentSequence;
	s->mRNAPosInActiveSite = this->mRNAPosInActiveSite;
	s->boundNTP = this->boundNTP;
	s->NTPtoAdd = this->NTPtoAdd;
	s->terminated = this->terminated;
	s->activated = this->activated;
	s->nextTemplateBaseToCopy = this->nextTemplateBaseToCopy;
	s->thereHaveBeenMutations = this->thereHaveBeenMutations;
	s->leftTemplateBase = this->leftTemplateBase;
	s->rightTemplateBase = this->rightTemplateBase;
	s->leftNascentBase = this->leftNascentBase;
	s->rightNascentBase = this->rightNascentBase;
	s->changeInLeftBulgePosition = this->changeInLeftBulgePosition;


	// Clone the vectors
	s->bulgePos = bulgePos;
	s->bulgedBase = bulgedBase;
	s->bulgeSize = bulgeSize;
	s->partOfBulgeID = partOfBulgeID;


	return s;

}

string State::toJSON(){

	string JSON = "{";

	JSON += "'mRNAPosInActiveSite':" + to_string(this->mRNAPosInActiveSite) + ",";
	JSON += "'leftTemplateBase':" + to_string(this->leftTemplateBase) + ",";
	JSON += "'rightTemplateBase':" + to_string(this->rightTemplateBase) + ",";
	JSON += "'leftNascentBase':" + to_string(this->leftNascentBase) + ",";
	JSON += "'rightNascentBase':" + to_string(this->rightNascentBase) + ",";
	JSON += "'NTPbound':" + string(this->NTPbound() ? "true" : "false") + ",";
	JSON += "'activated':" + string(this->activated ? "true" : "false") + ",";
	JSON += "'terminated':" + string(this->terminated ? "true" : "false") + ",";


	JSON += "'bulgePos':[";
	for (int i = 0; i < this->bulgePos.size(); i ++){
		JSON += to_string(this->bulgePos.at(i));
		if (i < this->bulgePos.size() - 1) JSON += ",";
	}
	JSON += "]";

	JSON += "}";
	return JSON;

}


State* State::print(){

	int bubblePrint = 10;
	if (!this->terminated){
	
		// Left bubble (template strand)
		int start = max(0, this->get_nascentLength() - (int)hybridLen->getVal()  - bubblePrint);
		int stop = max(0, this->get_nascentLength() + this->mRNAPosInActiveSite - (int)hybridLen->getVal());
		int startingBase = start + 1;
		cout << startingBase <<  templateSequence.substr(start, stop-start) << endl;
		
		// Hybrid (template side)
		start = stop;
		stop = this->get_nascentLength() + this->mRNAPosInActiveSite;
		int strWidth = (stop - start + (int)hybridLen->getVal());
		cout << setw(strWidth) << templateSequence.substr(start, stop-start) << endl;
		
		
		// Hybrid (nascent side)
		stop = this->get_nascentLength();
		strWidth =  (stop - start + (int)hybridLen->getVal());
		cout << setw(strWidth) << this->nascentSequence.substr(start, stop-start);


		locale loc;
		if (this->NTPbound()) cout << tolower((this->boundNTP).c_str()[0], loc);
		cout << endl;
		
		
		// Left bubble (nascent strand)
		stop = start;
		start = max(0, this->get_nascentLength() - (int)hybridLen->getVal() - bubblePrint);
		startingBase = start + 1;
		cout << startingBase << this->nascentSequence.substr(start, stop-start) << endl;
	}
	
	cout << "[" << this->get_nascentLength() << ","  << this->mRNAPosInActiveSite << "," << this->NTPbound() << "," << this->terminated << "]\n" << endl;
	return this;

}


State* State::transcribe(int N){


	//cout << "transcribing " << N << endl;

	if (!this->activated) this->activate();

	// Ensure that active site is open and NTP is not bound
	if (this->NTPbound()) this->releaseNTP();
	for (int i = this->mRNAPosInActiveSite; i < 1; i ++){
		this->forward();
	}
	for (int i = this->mRNAPosInActiveSite; i > 1; i --){
		this->backward();
	}
	
	
	// Transcribe N bases
	for (int i = 0; i < N; i ++){
		this->bindNTP();
		this->bindNTP();
		this->forward();
	}

	return this;
}


// Returns a list of numbers corresponding to the actions which must be performed in order to transcribe N bases
list<int> State::getTranscribeActions(int N){


	//cout << "transcribing " << N << endl;
	list<int> actionsToDo;



	// Ensure that active site is open and NTP is not bound
	if (!this->activated) actionsToDo.push_back(4); // 4 = activate
	if (this->NTPbound()) actionsToDo.push_back(2); // 2 = release
	for (int i = this->mRNAPosInActiveSite; i < 1; i ++){
		actionsToDo.push_back(1); // 1 = forward
	}
	for (int i = this->mRNAPosInActiveSite; i > 1; i --){
		actionsToDo.push_back(0); // 0 = backwards
	}
	
	
	// Transcribe N bases
	for (int i = 0; i < N; i ++){
		actionsToDo.push_back(3); // 3 = bind
		actionsToDo.push_back(3); // 3 = catalyse
		actionsToDo.push_back(1); // 1 = forward
	}

	return actionsToDo;
}



State* State::stutter(int N){


	//cout << "transcribing " << N << endl;

	if (!this->activated) this->activate();

	// Ensure that active site is open and NTP is not bound
	if (this->NTPbound()) this->releaseNTP();

	for (int i = this->bulgePos.at(0); i < hybridLen->getVal() && i > 0; i ++){
		this->slipLeft(0);
	}
	for (int i = this->mRNAPosInActiveSite; i < 0; i ++){
		this->forward();
	}
	for (int i = this->mRNAPosInActiveSite; i > 0; i --){
		this->backward();
	}

	
	// Stutter N times
	for (int i = 0; i < N; i ++){
		this->slipLeft(0);
		this->slipLeft(0);
		this->slipLeft(0);
		this->bindNTP();
		this->bindNTP();

		for (int j = 0; i < hybridLen->getVal() - 4; j ++) this->slipLeft(0);

	}
	
	return this;
}


// Returns a list of numbers corresponding to the actions which must be performed in order to transcribe N bases
list<int> State::getStutterActions(int N){


	list<int> actionsToDo;


	// Ensure that active site is open and NTP is not bound
	if (!this->activated) actionsToDo.push_back(4); // 4 = activate
	if (this->NTPbound()) actionsToDo.push_back(2); // 2 = release
	for (int i = this->bulgePos.at(0); i < hybridLen->getVal() && i > 0; i ++){
		actionsToDo.push_back(8); // 8 = slipLeft(0)
	}
	for (int i = this->mRNAPosInActiveSite; i < 0; i ++){
		actionsToDo.push_back(1); // 1 = forward
	}
	for (int i = this->mRNAPosInActiveSite; i > 0; i --){
		actionsToDo.push_back(0); // 0 = backwards
	}


	// Stutter N times
	for (int i = 0; i < N; i ++){
		
		actionsToDo.push_back(8); // 8 = slipLeft(0)
		actionsToDo.push_back(8); // 8 = slipLeft(0)
		actionsToDo.push_back(8); // 8 = slipLeft(0)
		actionsToDo.push_back(3); // 3 = bind
		actionsToDo.push_back(3); // 3 = catalyse

		for (int j = 0; j < hybridLen->getVal() - 4; j ++) actionsToDo.push_back(8); // 8 = slip_left(0)

	}



	return actionsToDo;
}






State* State::forward(){


	//if (this->terminated) return this;


	// If bulge will move too far to the left then absorb it
	SlippageLandscapes* DOMupdates = new SlippageLandscapes();



	for (int s = 0; s < this->bulgePos.size(); s++){
		if (this->partOfBulgeID.at(s) != s) continue;
		if (this->bulgePos.at(s) > 0 && this->bulgePos.at(s) == hybridLen->getVal() - 1) this->absorb_bulge(s, false, true, DOMupdates);
		//if (this->bulgePos.at(s) > 0) this->bulgePos.at(s) ++;
	}

	// Update coordinates if this state is being displayed by the GUI (and not hidden mode)
	if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {


		// Move the polymerase
		Coordinates::move_obj_from_id("pol", 25, 0);

		double shiftBaseBy = -52/(bubbleLeft->getVal()+1);
		for (int i = this->getLeftTemplateBaseNumber(); i > this->getLeftTemplateBaseNumber() - (bubbleLeft->getVal()+1) && i >= 0; i--) {
			if (i == this->getLeftTemplateBaseNumber() - (bubbleLeft->getVal()+1) + 1){
				if (PrimerType.substr(0,2) != "ds") {
					Coordinates::move_nt(i, "g", 0, shiftBaseBy);
					Coordinates::move_nt(i, "o", 0, -shiftBaseBy/2);
				}
			}
			else {
				if (PrimerType.substr(0,2) != "ds") {
					Coordinates::move_nt(i, "g", 0, -52/(bubbleLeft->getVal()+1));
					Coordinates::move_nt(i, "o", 0, +26/(bubbleLeft->getVal()+1));
				}
			}
		
			if (i > 0 && TemplateType.substr(0,2) == "ds") {
				if (PrimerType.substr(0,2) != "ds") Coordinates::flip_base(i, "g", "m"); 
			}
		}



		shiftBaseBy = 52/(bubbleRight->getVal()+1);
		for (int i = this->getRightTemplateBaseNumber() + 1; i < this->getRightTemplateBaseNumber() + (bubbleRight->getVal()+1) + 1; i++) {

			if (i == this->getRightTemplateBaseNumber() + (bubbleRight->getVal()+1)) {
				Coordinates::move_nt(i, "g", 0, shiftBaseBy);
				Coordinates::move_nt(i, "o", 0, -shiftBaseBy/2);
			}
			else {
				Coordinates::move_nt(i, "g", 0, +52/(bubbleRight->getVal()+1));
				Coordinates::move_nt(i, "o", 0, -26/(bubbleRight->getVal()+1));
			}
		
			if (i > 0 && TemplateType.substr(0,2) == "ds") {
				Coordinates::flip_base(i, "g", "g"); 
				if (PrimerType.substr(0,2) == "ds") Coordinates::flip_base(i, "o", "m"); 
			}
		}


		// Move mRNA bases
		if (PrimerType.substr(0,2) != "ds") for (int i = this->getLeftNascentBaseNumber(); i > this->getLeftNascentBaseNumber() - (bubbleLeft->getVal()+1) && i >= 0; i--) Coordinates::move_nt(i, "m", 0, +52/(bubbleLeft->getVal()+1));
		for (int i = this->getRightNascentBaseNumber() + 1; i < this->getRightNascentBaseNumber() + (bubbleRight->getVal()+1) + 1; i++) Coordinates::move_nt(i, "m", 0, -52/(bubbleRight->getVal()+1));
	

		// Remove NTP
		if (this->NTPbound()) this->releaseNTP();



		// Move bead to the right
		if (FAssist->getVal() != 0){
			if (FAssist->getVal() > 0) Coordinates::move_obj_from_id("rightBead", 25, 0); // Assisting load
			else Coordinates::move_obj_from_id("leftBead", 25, 0); // Hindering load
			Coordinates::move_obj_from_id("tweezer", 25, 0);
			Coordinates::move_obj_from_id("forceArrow1", 25, 0);
			Coordinates::move_obj_from_id("forceArrow2", 25, 0);
		}


	}

	// Only move forward if NTP is not bound
	if (!this->NTPbound()) {

		this->mRNAPosInActiveSite ++; 
		this->leftTemplateBase ++; 
		this->rightTemplateBase ++; 
		this->leftNascentBase ++; 
		this->rightNascentBase ++; 

	}

	if (this->mRNAPosInActiveSite > (int)(hybridLen->getVal()-1) ||
		(this->mRNAPosInActiveSite <= 1 && this->rightTemplateBase > templateSequence.length())) this->terminate();


	// If this is GUI state then we will be applying these changes to the DOM 
	if (this->isGuiState) _slippageLandscapesToSendToDOM = DOMupdates;
	else delete DOMupdates; 


	return this;
}




State* State::terminate(){

	if (this->terminated) return this;

	this->terminated = true;


	if (this->isGuiState) {

		if (_applyingReactionsGUI && _animationSpeed != "hidden"){
			for (int i = 0; i <= this->nascentSequence.length(); i ++){
				Coordinates::delete_nt(i, "m");
			}
		}
		Plots::addCopiedSequence(this->nascentSequence);

	}





	/*
	if (WW_JS.isWebWorker && !RUNNING_FROM_COMMAND_LINE && !ABC_JS.ABC_simulating){
		postMessage("_renderTermination(" + JSON.stringify({primerSeq: primerSeq, insertPositions: insertPositions}) + ")" );
	}else if(!RUNNING_FROM_COMMAND_LINE && !ABC_JS.ABC_simulating){
		renderTermination({primerSeq: primerSeq, insertPositions: insertPositions});
	}

	for (var i = 0; i <= primerSequence.length - 1; i ++){
		delete_nt_WW(i, "m");
	}
	*/
	return this;
}

double State::calculateForwardRate(bool lookupFirst, bool ignoreStateRestrictions){
	
	if (!ignoreStateRestrictions){
		if (this->terminated || this->NTPbound()) return 0;
		//if (currentModel->get_assumeTranslocationEquilibrium() && this->mRNAPosInActiveSite == 0) return 0;
	}
	
	// Lookup in table first or calculate it again?
	if (lookupFirst){

		// Check if hypertranslocation is permitted
		if (!currentModel->get_allowHypertranslocation() && this->mRNAPosInActiveSite >= 1) return 0;


		// Check if going from backtracked to pretranslocated is permitted while activated
		if (currentModel->get_allowBacktracking() && currentModel->get_allowInactivation() && !currentModel->get_allowBacktrackWithoutInactivation() && this->activated && this->mRNAPosInActiveSite == -1) return 0;



		return _translocationRatesCache->getTranslocationRates(this, true);

	}
	
	
	double groundEnergy = this->calculateTranslocationFreeEnergy(true);
	double forwardHeight = this->calculateForwardTranslocationFreeEnergyBarrier(true);

	//cout << "forwardHeight " << forwardHeight << ", groundEnergy = " << groundEnergy << ", diff = " << (forwardHeight - groundEnergy) << endl;

	if (forwardHeight >= INF) return 0;
	
	
	// Calculate rate
	//cout << "rate = " << groundEnergy << " - " << forwardHeight << " = " << _preExp * exp(-(forwardHeight - groundEnergy)) << endl;
	return _preExp * exp(-(forwardHeight - groundEnergy));
	

}


State* State::backward(){
	//if (this->terminated) return this;
	if (this->getLeftTemplateBaseNumber() < 1 || this->getLeftTemplateBaseNumber() - bubbleLeft->getVal() -1 <= 2) return this;



	// If bulge will move too far to the left then absorb it
	SlippageLandscapes* DOMupdates = new SlippageLandscapes();

	for (int s = 0; s < this->bulgePos.size(); s++){
		if (this->partOfBulgeID.at(s) != s) continue;
		if (this->bulgedBase.at(s) == this->rightNascentBase - 1) this->absorb_bulge(s, true, true, DOMupdates);
		//if (this->bulgePos.at(s) > 0) this->bulgePos.at(s) --;
	}


	// Update coordinates if this state is being displayed by the GUI
	if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {


		// Move the polymerase
		Coordinates::move_obj_from_id("pol", -25, 0);


		// Move genome bases
		double shiftBaseBy = 52/(bubbleLeft->getVal()+1);
		for (int i = this->getLeftTemplateBaseNumber() - 1; i > this->getLeftTemplateBaseNumber() - (bubbleLeft->getVal()+1) - 1 && i >= 0; i--) {

			if (i == this->getLeftTemplateBaseNumber() - (bubbleLeft->getVal()+1)) {
				if (PrimerType.substr(0,2) != "ds") Coordinates::move_nt(i, "g", 0, shiftBaseBy);
				if (PrimerType.substr(0,2) != "ds") Coordinates::move_nt(i, "o", 0, -shiftBaseBy/2);
			}
			else {
				if (PrimerType.substr(0,2) != "ds") Coordinates::move_nt(i, "g", 0, +52/(bubbleLeft->getVal()+1));
				if (PrimerType.substr(0,2) != "ds") Coordinates::move_nt(i, "o", 0, -26/(bubbleLeft->getVal()+1));
			}
				
	
			if (i > 0 && TemplateType.substr(0,2) == "ds") {
				if (PrimerType.substr(0,2) != "ds") Coordinates::flip_base(i, "g", "g"); 
			}
		}
	
	
		
		shiftBaseBy = -52/(bubbleRight->getVal()+1);
		for (int i = this->getRightTemplateBaseNumber(); i < this->getRightTemplateBaseNumber() + (bubbleRight->getVal()+1); i++) {

			if (i == this->getRightTemplateBaseNumber() + (bubbleRight->getVal()+1) - 1) {
				Coordinates::move_nt(i, "g", 0, shiftBaseBy);
				Coordinates::move_nt(i, "o", 0, -shiftBaseBy/2);
			}
			else {
				Coordinates::move_nt(i, "g", 0, -52/(bubbleRight->getVal()+1));
				Coordinates::move_nt(i, "o", 0, +26/(bubbleRight->getVal()+1));
			}
	
			if (i > 0 && TemplateType.substr(0,2) == "ds") {
				Coordinates::flip_base(i, "g", "m"); 
				if (PrimerType.substr(0,2) == "ds") Coordinates::flip_base(i, "o", "g"); 
			}
		}
		


		// Move mRNA bases
		if (PrimerType.substr(0,2) != "ds") for (int i = this->getLeftNascentBaseNumber() - 1;i > this->getLeftNascentBaseNumber() - (bubbleLeft->getVal()+1) - 1 && i >= 0; i--) Coordinates::move_nt(i, "m", 0, -52/(bubbleLeft->getVal()+1));
		for (int i = this->getRightNascentBaseNumber(); i < this->getRightNascentBaseNumber() + (bubbleRight->getVal()+1); i++) Coordinates::move_nt(i, "m", 0, +52/(bubbleRight->getVal()+1));


		// Remove NTP
		if (this->NTPbound()) this->releaseNTP();


		// Move bead to the left
		if (FAssist->getVal() != 0){
			if (FAssist->getVal() > 0) Coordinates::move_obj_from_id("rightBead", -25, 0); // Assisting load
			else Coordinates::move_obj_from_id("leftBead", -25, 0); // Hindering load
			Coordinates::move_obj_from_id("tweezer", -25, 0);
			Coordinates::move_obj_from_id("forceArrow1", -25, 0);
			Coordinates::move_obj_from_id("forceArrow2", -25, 0);
		}
		

	}


	if (!this->NTPbound()) {  // Only move backwards if NTP is not bound

		this->mRNAPosInActiveSite --;
		this->leftTemplateBase --; 
		this->rightTemplateBase --; 
		this->leftNascentBase --; 
		this->rightNascentBase --; 
	}


	// If this is GUI state then we will be applying these changes to the DOM 
	if (this->isGuiState) _slippageLandscapesToSendToDOM = DOMupdates;
	else delete DOMupdates; 

	return this;
}


double State::calculateBackwardRate(bool lookupFirst, bool ignoreStateRestrictions){
	

	if (!ignoreStateRestrictions){
		if (this->terminated || this->NTPbound()) return 0;
		//if (currentModel->get_assumeTranslocationEquilibrium() && this->mRNAPosInActiveSite == 1) return 0;

	}



	
	// Lookup in table first or calculate it again?
	if (lookupFirst){

		// Check if backtracking is permitted
		if (!currentModel->get_allowBacktracking() && this->mRNAPosInActiveSite <= 0) return 0;

		// Check if backtracking is permitted while activated
		if (currentModel->get_allowBacktracking() && currentModel->get_allowInactivation() && !currentModel->get_allowBacktrackWithoutInactivation() && this->activated && this->mRNAPosInActiveSite == 0) return 0;

		return _translocationRatesCache->getTranslocationRates(this, false);

	}
	
	
	double groundEnergy = this->calculateTranslocationFreeEnergy(true);
	double backwardHeight = this->calculateBackwardTranslocationFreeEnergyBarrier(true);
	if (backwardHeight >= INF) return 0;
	
	
	// Calculate rate
	return _preExp * exp(-(backwardHeight - groundEnergy));

	

}


State* State::bindNTP(){
	
	if (this->terminated || !this->activated) return this;
	
	// Bind NTP
	if (!this->NTPbound() && this->mRNAPosInActiveSite == 1){


		this->boundNTP = this->NTPtoAdd != "" ? this->NTPtoAdd : Settings::complementSeq(templateSequence.substr(this->nextTemplateBaseToCopy-1, 1), PrimerType.substr(2) == "RNA");

		// Update coordinates if this state is being displayed by the GUI
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
			HTMLobject* nt = Coordinates::getNucleotide(this->rightTemplateBase, "g");
			if (nt != nullptr) {
				double xCoord = nt->getX() + 10;
				double yCoord = 165;
				Coordinates::create_nucleotide(this->get_nascentLength() + 1, "m", xCoord, yCoord, this->boundNTP, this->boundNTP + "m", true);
			}

		}


	}

	
	// Elongate
	else if (this->NTPbound() && this->mRNAPosInActiveSite == 1){


		// Update coordinates if this state is being displayed by the GUI
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
		 	Coordinates::move_nt(this->get_nascentLength()+1, "m", -10, -10); // Move NTP into the sequence
			Coordinates::set_TP_state(this->get_nascentLength()+1, "m", false); // Remove the TP
		}


		this->nascentSequence += this->boundNTP;
		this->boundNTP = "";
		this->NTPtoAdd = "";
		this->mRNAPosInActiveSite = 0;
		this->nextTemplateBaseToCopy ++;

	}
	
	return this;
	
}


double State::calculateBindOrCatNTPrate(bool ignoreStateRestrictions){


	if (!this->NTPbound()) return this->calculateBindNTPrate(ignoreStateRestrictions);
	if (this->NTPbound()) return this->State::calculateCatalysisRate(ignoreStateRestrictions);

	return 0;
	
}



double State::calculateBindNTPrate(bool ignoreStateRestrictions){

	//cout << "calculateBindNTPrate " << this->NTPbound() << "," << this->mRNAPosInActiveSite << endl;

	//cout << "ignoreStateRestrictions " << ignoreStateRestrictions << endl;

	if (!ignoreStateRestrictions){
		if (this->terminated || !this->activated) return 0;
	}
	
	//cout << "AAA" << endl;
	// Bind NTP
	if (ignoreStateRestrictions || (!this->NTPbound() && this->mRNAPosInActiveSite == 1)){


		
		
		// If binding is at equilibrium return 0
		if (!ignoreStateRestrictions && currentModel->get_assumeBindingEquilibrium()) return 0;
		
		
		// NTP concentration to use
		double NTPconcentration = 0;
		if (currentModel->get_useFourNTPconcentrations()){
			string toBind = Settings::complementSeq(templateSequence.substr(this->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
			if (toBind == "A") NTPconcentration = ATPconc->getVal();
			else if (toBind == "C") NTPconcentration = CTPconc->getVal();
			else if (toBind == "G") NTPconcentration = GTPconc->getVal();
			else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal();
		}
		else NTPconcentration = NTPconc->getVal();

		
		// Calculate the rate of binding
		//cout << "NTPconcentration = " << NTPconcentration << endl;
		return RateBind->getVal() * NTPconcentration;
		
	}

	return 0;
	
}



double State::calculateCatalysisRate(bool ignoreStateRestrictions){


	if (!ignoreStateRestrictions){
		if (this->terminated || !this->activated) return 0;
	}

	if (ignoreStateRestrictions || (this->NTPbound() && this->mRNAPosInActiveSite == 1)) return kCat->getVal();
	return 0;
}



State* State::releaseNTP(){
	
	if (this->terminated) return this;


	// Release NTP
	if (this->NTPbound() && this->activated ){
		this->boundNTP = "";
		this->NTPtoAdd = "";
	
		// Update coordinates if this state is being displayed by the GUI
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
			Coordinates::delete_nt(this->get_nascentLength()+1, "m");
		}

	}


	// Pyrophosphorylysis
	else if (!this->NTPbound() && this->activated && this->get_nascentLength() > hybridLen->getVal() && this->mRNAPosInActiveSite == 0){


		// Add the triphosphate
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
			Coordinates::set_TP_state(this->get_nascentLength(), "m", true);
			Coordinates::move_nt(this->get_nascentLength(), "m", 10, 10);
		}


		this->boundNTP = this->nascentSequence.substr(this->nascentSequence.length()-1, 1);
		this->nascentSequence = this->nascentSequence.substr(0, this->nascentSequence.length()-1);
		this->mRNAPosInActiveSite = 1;
		this->nextTemplateBaseToCopy --;

		//if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds") PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]--;
		

	}

	
	return this;
	
}


double State::calculateReleaseNTPRate(bool ignoreStateRestrictions){
	if (!ignoreStateRestrictions) if (!this->NTPbound() || this->terminated || currentModel->get_assumeBindingEquilibrium()) return 0;
	return RateBind->getVal() * Kdiss->getVal(); 

}


// Activate the polymerase from its catalytically inactive state
State* State::activate(){


	if (!this->activated){
		
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			
			// Change the pol picture back to the default pol
			Coordinates::change_src_of_object_from_id("pol", "pol");
			//WW_JS.move_obj_from_id_WW("pol", 0, 0);
		}

		this->activated = true;
	}


	return this;
}


double State::calculateActivateRate(bool ignoreStateRestrictions){

	if (ignoreStateRestrictions || !this->activated) return RateActivate->getVal();
	return 0;
}


// Deactivate the polymerase by putting it into a catalytically inactive state
State* State::deactivate(){

	if (!this->NTPbound() && this->activated){
		
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			
			// Change the pol picture to the inactivated pol
			Coordinates::change_src_of_object_from_id("pol", "pol_U");
			//WW_JS.move_obj_from_id_WW("pol", 0, 0);
		}

		this->activated = false;
	}


	return this;
}


double State::calculateDeactivateRate(bool ignoreStateRestrictions){
	if (currentModel->get_allowInactivation() && (ignoreStateRestrictions || (this->activated && !this->NTPbound()))) return RateDeactivate->getVal();
	return 0;
}



// Cleave the 3' end of the nascent strand (if the polymerase is backtracked) and reactivates the polymerase
State* State::cleave(){

	if (this->mRNAPosInActiveSite < 0){

		int newLength = this->nascentSequence.length() + this->mRNAPosInActiveSite;
		int nbasesCleaved = this->nascentSequence.length() - newLength;

		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			
			// Delete the base objects 
			for (int baseNum = newLength+1; baseNum <= this->nascentSequence.length(); baseNum++){
				//Coordinates::move_nt(baseNum, "m", 20, 50);
				Coordinates::delete_nt(baseNum, "m");
			}

		}

		this->nextTemplateBaseToCopy -= nbasesCleaved;
		this->nascentSequence = this->nascentSequence.substr(0, newLength);
		this->mRNAPosInActiveSite = 0;
		return this->activate();

	}


	return this;
}


double State::calculateCleavageRate(bool ignoreStateRestrictions){
	if (ignoreStateRestrictions || this->mRNAPosInActiveSite < 0) return RateCleave->getVal();
	return 0;
}






// Apply whichever operator is necessary to slip left at bulge S
State* State::slipLeft(int S){
	
	//cout << "slip left" << S << endl;
	SlippageLandscapes* DOMupdates = new SlippageLandscapes(); // Need to create a new class which specifies new bulge landscapes to be created

	if (!this->terminated){ // && !(currentModel->get_allowMultipleBulges() &&  this->partOfBulgeID.at(S) != S && state["bulgePos"][ this->partOfBulgeID.at(S) ] == hybridLen->getval() - 1)) {

		


		// If this is part of a larger bulge, then split one base off to the left and leave the rest as it is (fissure). Do Not Return. It will be followed up by a 2nd operation.
		if (currentModel->get_allowMultipleBulges() && this->bulgePos.at(S) != this->getLeftBulgeBoundary() && this->partOfBulgeID.at(S) != S) {
			this->fissureBulgeLeft(S, DOMupdates);
		}
		

		int fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 1, 1));
		if (fuseWith == -1)	fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 2, 2));


		// If there is another bulge 1 to the left then we fuse the two together
		if (currentModel->get_allowMultipleBulges() && this->bulgePos.at(S) > 0 && Settings::indexOf(this->bulgePos, this->bulgePos.at(S) + 1) != -1) this->fuseBulgeLeft(S, DOMupdates);
		else if (currentModel->get_allowMultipleBulges() && this->bulgePos.at(S) == 0 && fuseWith != -1) this->fuseBulgeLeft(S, DOMupdates);
		else if (this->bulgePos.at(S) > 0 && this->bulgePos.at(S) < this->getLeftBulgeBoundary()) this->diffuse_left(S, DOMupdates);
		else if (!this->NTPbound() && this->bulgePos.at(S) == 0 && this->mRNAPosInActiveSite < this->getLeftBulgeBoundary() - 1) this->form_bulge(S, true, DOMupdates);
		else if (this->bulgePos.at(S) != 0 && this->bulgePos.at(S) == this->getLeftBulgeBoundary()) this->absorb_bulge(S, false, false, DOMupdates);

	}

	//cout << "Done slipping left" << endl;

	// If this is GUI state then we will be applying these changes to the DOM 
	if (this->isGuiState) _slippageLandscapesToSendToDOM = DOMupdates;
	else delete DOMupdates; 

	return this;
}


// Apply whichever operator is necessary to slip right at bulge S
State* State::slipRight(int S){

	//cout << "slip right" << S << endl;
	SlippageLandscapes* DOMupdates = new SlippageLandscapes(); // Need to create a new class which specifies new bulge landscapes to be created

	if (!this->terminated) {// && !(currentModel->get_allowMultipleBulges() && this->partOfBulgeID.at(S) != S && state["bulgePos"][ this->partOfBulgeID.at(S) ] - Math.max(0, this->mRNAPosInActiveSite) == 1)) {
		

		// Absorb bulge
		if (!this->NTPbound() && this->partOfBulgeID.at(S) == S && this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) == 1) this->absorb_bulge(S, true, false, DOMupdates);

		else{
		
			// If this is part of a larger bulge, then split one base off to the right and leave the rest as it is (fissure). Do Not Return. It will be followed up by a 2nd operation.
			if (currentModel->get_allowMultipleBulges() && this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) != 1 && this->partOfBulgeID.at(S) != S) {
				this->fissureBulgeRight(S, DOMupdates);
			}
			
			
			int canFuseWith = Settings::indexOf(this->bulgePos, this->getLeftBulgeBoundary());
			if (canFuseWith == -1)	canFuseWith = Settings::indexOf(this->bulgePos, this->getLeftBulgeBoundary() - 1);
			

			// If there is another bulge 1 to the right then we fuse the two together
			if (currentModel->get_allowMultipleBulges() &&  this->bulgePos.at(S) > 0 && Settings::indexOf(this->bulgePos, this->bulgePos.at(S) - 1) != -1) this->fuseBulgeRight(S, DOMupdates);
			else if (this->leftNascentBase > 1 && currentModel->get_allowMultipleBulges() && this->bulgePos.at(S) == 0 && canFuseWith != -1) this->fuseBulgeRight(S, DOMupdates);
			else if (this->bulgePos.at(S) < this->getLeftBulgeBoundary() + 1 && this->bulgePos.at(S) > 1 && this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) != 1) this->diffuse_right(S, DOMupdates);
			else if (this->bulgePos.at(S) == 0 && this->leftNascentBase > 1) this->form_bulge(S, false, DOMupdates);
		}

	}

	//cout << "Done slipping right" << endl;


	// If this is GUI state then we will be applying these changes to the DOM 
	if (this->isGuiState) _slippageLandscapesToSendToDOM = DOMupdates;
	else delete DOMupdates; 

	return this;
}




void State::diffuse_left(int S, SlippageLandscapes* DOMupdates){

	if (this->isGuiState) cout << "diffuse left" << S << endl;
	if (this->bulgePos.at(S) > 0 && this->bulgePos.at(S) < this->getLeftBulgeBoundary()){
		
	    int leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S) - 1;

	    if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), this->bulgeSize.at(S), true, 0);
		}

		this->bulgePos.at(S) ++;
		this->bulgedBase.at(S) --;
		
	}
	
}



void State::diffuse_right(int S, SlippageLandscapes* DOMupdates){

	if (this->isGuiState) cout << "diffuse right" << S << endl;
	if (this->bulgePos.at(S) > 1 && this->bulgePos.at(S) < this->getLeftBulgeBoundary() + 1){


		this->bulgePos.at(S) --;
		this->bulgedBase.at(S) ++;

	    int leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S);
	    if (this->NTPbound() && this->bulgePos.at(S) == 1) this->releaseNTP();

	    if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary + this->bulgeSize.at(S), "m")->getX(), this->bulgeSize.at(S), true, 0);
		}




		
	}

	
}

void State::form_bulge(int S, bool form_left, SlippageLandscapes* DOMupdates){


	if (form_left && !this->NTPbound() &&  this->bulgePos.at(S) == 0 && this->mRNAPosInActiveSite < this->getLeftBulgeBoundary() - 1){
		
		if (this->isGuiState) cout << "form left" << S << endl;
		if (this->NTPbound()) this->releaseNTP();

		// Move 2nd last base to between the 2nd and 3rd to last positions, and last base into 2nd last position
		this->bulgedBase.at(S) = this->rightNascentBase;
		if (this->mRNAPosInActiveSite >= 0) {
			this->bulgedBase.at(S) -= this->mRNAPosInActiveSite + 1;
			this->bulgePos.at(S) = 2 + this->mRNAPosInActiveSite;
		}

		if (this->mRNAPosInActiveSite < 0){
			this->bulgePos.at(S) = 1;
		}
		
		this->bulgeSize.at(S) = 1;
		int leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S);




		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){

			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), 1, true, 0);
			for (int i = this->bulgedBase.at(S) + 2; i < this->get_nascentLength() + 1; i ++){
				if (i > this->rightNascentBase && i-this->rightNascentBase <= (bubbleRight->getVal()+1)) Coordinates::move_nt(i, "m", -25, -52/(bubbleRight->getVal()+1));
				else Coordinates::move_nt(i, "m", -25, 0);
			}

		}
		


		this->rightNascentBase ++;
		this->mRNAPosInActiveSite ++;
		this->nextTemplateBaseToCopy --;
		this->changeInLeftBulgePosition --;

		//if (UPDATE_COORDS) WW_JS.setNextBaseToAdd_WW();


		if (currentModel->get_allowMultipleBulges()) {
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
		}




		
	}
	
	else if (!form_left && this->mRNAPosInActiveSite <= this->getLeftBulgeBoundary() - 1 && this->bulgePos.at(S) == 0 && this->getLeftNascentBaseNumber() > 1) {
		
		if (this->isGuiState) cout << "form right" << S << endl;
		this->bulgedBase.at(S) = PrimerType.substr(0,2) == "ss" ? this->leftNascentBase : 2;
		this->bulgeSize.at(S) = 1;


		int leftBoundary = this->bulgedBase.at(S) - 1;

		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){

			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(this->bulgedBase.at(S), "m")->getX(), 1, true, 0);

			if (PrimerType.substr(0,2) == "ss"){
				for (int i = this->bulgedBase.at(S) - 2; i >= 0; i --){
					if (this->bulgedBase.at(S)-i <= bubbleLeft->getVal()+1) Coordinates::move_nt(i, "m", 25, -52/(bubbleLeft->getVal()+1));
					else Coordinates::move_nt(i, "m", 25, 0);
				}
			}

			else{
				// Double stranded
				Coordinates::move_nt(0, "m", 25, 0);

			}

		}

	
		this->bulgePos.at(S) = this->getLeftBulgeBoundary();
		leftNascentBase --;
		//this->changeInLeftBulgePosition --;

		if (currentModel->get_allowMultipleBulges()) {
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
		}


	}
	
}


void State::absorb_bulge(int S, bool absorb_right, bool destroy_entire_bulge, SlippageLandscapes* DOMupdates){

	
	if (!absorb_right && this->bulgeSize.at(S) > 0 && this->bulgePos.at(S) == this->getLeftBulgeBoundary()){
		
		if (this->isGuiState) cout << "absorb left" << S << endl;

		this->leftNascentBase ++;

		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){

			int leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S) + 1;
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary-1, "m")->getX(), this->bulgeSize.at(S)-1, true, 0);

			if (PrimerType.substr(0,2) == "ss"){
				for (int i = this->leftNascentBase - 1; i >= 0; i --){
					if (this->leftNascentBase - i <= (bubbleLeft->getVal()+1)) Coordinates::move_nt(i, "m", -25, 52/(bubbleLeft->getVal()+1));
					else Coordinates::move_nt(i, "m", -25, 0);
				}		
			}

			else{

				// Double stranded
				Coordinates::move_nt(1, "m", -25, 0);
				Coordinates::move_nt(0, "m", -25, 0);
			}

		}

		this->bulgeSize.at(S) --;
		//this->changeInLeftBulgePosition ++;


		if (this->bulgeSize.at(S) == 0){
			
			if (Settings::indexOf(this->bulgePos, 0) != -1)	{
				int toDelete = this->delete_slipping_params(S); // If there is already a form/absorb landscape then we can delete this one
				DOMupdates->add_landscapes_to_delete(toDelete);
			}
			else {
				
				this->reset_slipping_params(S);
				DOMupdates->add_landscapes_to_reset(S);
			}

		}
		
		else if (this->bulgeSize.at(S) == 1){ // If the bulge went from size 2 to size 1, we find and delete its fissure landscape
			int bulgeIDOfDonorFissure = this->get_fissure_landscape_of(S);
			int toDelete = this->delete_slipping_params(bulgeIDOfDonorFissure);
			DOMupdates->add_landscapes_to_delete(toDelete);
		}

		
		if (destroy_entire_bulge){
			this->absorb_bulge(S, absorb_right, destroy_entire_bulge, DOMupdates);
		}
		
		//return true;

	}


	// If backtracked, then bulge is absorbed when at position 1
	// If not backtracked, then bulge is absorbed when at position 2
	else if (absorb_right && !this->NTPbound() && this->bulgeSize.at(S) > 0 && this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) == 1 && !(this->bulgePos.at(S) == 2 && this->NTPbound())){
		
		if (this->isGuiState) cout << "absorb right" << S << endl;

		int leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S);
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){


			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), this->bulgeSize.at(S) - 1, true, 0);

			// Shift every rightward base 1 to the right
			for (int i = leftBoundary + this->bulgeSize.at(S) + 1; i < this->get_nascentLength() + 1; i ++){
				if (i >= this->rightNascentBase && i-(leftBoundary + this->bulgeSize.at(S)) <= (bubbleRight->getVal()+1)) Coordinates::move_nt(i, "m", 25, 52/(1+bubbleRight->getVal()));
				else Coordinates::move_nt(i, "m", 25, 0);
			}	


		}

		
		
		this->bulgeSize.at(S) --;
		this->bulgedBase.at(S) --;
		this->mRNAPosInActiveSite --;
		this->rightNascentBase --;
		this->changeInLeftBulgePosition ++;
		this->nextTemplateBaseToCopy ++;
		
		//if (UPDATE_COORDS) WW_JS.setNextBaseToAdd_WW();


		if (this->bulgeSize.at(S) == 0){
			if (Settings::indexOf(this->bulgePos, 0) != -1) {
				int toDelete = this->delete_slipping_params(S); // If there is already a form/absorb landscape then we can delete this one
				DOMupdates->add_landscapes_to_delete(toDelete);
			}
			else {
				this->reset_slipping_params(S);
				DOMupdates->add_landscapes_to_reset(S);
			}
		}
		
		else if (this->bulgeSize.at(S) == 1){ // If the bulge went from size 2 to size 1, we find and delete its fissure landscape
			int bulgeIDOfDonorFissure = this->get_fissure_landscape_of(S);
			int toDelete = this->delete_slipping_params(bulgeIDOfDonorFissure);
			DOMupdates->add_landscapes_to_delete(toDelete);
		}

	

			
		if (destroy_entire_bulge){ // Recursively destroy bulges until there are none left
			this->absorb_bulge(S, absorb_right, destroy_entire_bulge, DOMupdates);
		}
		
		//return true;

		
	}
	
	//return false;

}








void State::fissureBulgeLeft(int S, SlippageLandscapes* DOMupdates){


	if (this->isGuiState) cout << "fiss left" << S << endl;
	if (this->bulgePos.at(S) != this->getLeftBulgeBoundary() && this->partOfBulgeID.at(S) != S){
	
		
		int fissureFrom = this->partOfBulgeID.at(S);
		
		
		// Change the parameters of the base being moved
		
		// If there will still be a bulge, then create a new landscape for diffusing the new bulge
		this->bulgePos.at(S) = this->bulgePos.at(fissureFrom);
		this->bulgedBase.at(S) = this->bulgedBase.at(fissureFrom) - this->bulgeSize.at(fissureFrom) + 1;
		this->bulgeSize.at(S) = 1;
		this->partOfBulgeID.at(S) = S;
		
		// Create a new landscape to continue fission, if there is still a bulge
		if (this->bulgeSize.at(fissureFrom) > 2){
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
			int newIndex = this->bulgePos.size() - 1;
			this->partOfBulgeID.at(newIndex) = fissureFrom;
		}

		this->bulgeSize.at(fissureFrom) --;


		// Reduce the visual size of the bulge
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			int leftBoundary = this->bulgedBase.at(fissureFrom) - this->bulgeSize.at(fissureFrom);
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary-1, "m")->getX(), this->bulgeSize.at(fissureFrom), true, -1);
		}


		// Then exit. This action may be followed by a diffuse left or a fuse left.
		//return true;
		
	}
	
	//return false;



}

void State::fissureBulgeRight(int S, SlippageLandscapes* DOMupdates){

	if (this->isGuiState) cout << "fiss right" << S << endl;
	if (this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) != 1 && this->partOfBulgeID.at(S) != S){
		
		
		int fissureFrom = this->partOfBulgeID.at(S);
		

		// Change the parameters of the base being moved
		this->bulgePos.at(S) = this->bulgePos.at(fissureFrom);
		this->bulgedBase.at(S) = this->bulgedBase.at(fissureFrom);
		this->bulgeSize.at(S) = 1;
		this->partOfBulgeID.at(S) = S;
		
		
		// Create a new landscape to continue fission, if there is still a bulge
		if (this->bulgeSize.at(fissureFrom) > 2){
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
			int newIndex = this->bulgePos.size() - 1;
			this->partOfBulgeID.at(newIndex) = fissureFrom;
		}
		

		this->bulgedBase.at(fissureFrom)--;
		this->bulgeSize.at(fissureFrom)--;

		// Reduce the visual size of the bulge
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			int leftBoundary = this->bulgedBase.at(fissureFrom) - this->bulgeSize.at(fissureFrom);
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), this->bulgeSize.at(fissureFrom), true, +1);
		}


		// Then exit. This action may be followed by a diffuse left or a fuse left.
		//return true;
		
	}
	
	
	//return false;
	

}

void State::fuseBulgeLeft(int S, SlippageLandscapes* DOMupdates){

	if (this->isGuiState) cout << "fuse left" << S << endl;
	if (this->bulgePos.at(S) == 0 && (Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 1, 1)) != -1 || Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 2, 2)) != -1)) { // Form bulge first and then fuse them
		
		
	
		int fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 1, 1));
		if (fuseWith == -1)	fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 2, 2));
		
		
		// If there is a bulge 1 to the left of the bulge we will fuse into, then declare this operation impossible
		if (this->mRNAPosInActiveSite >= 0 && Settings::indexOf(this->bulgePos,  this->bulgePos.at(fuseWith) +1 ) != -1) return;
		if ( Settings::indexOf(this->bulgeSize,  this->bulgePos.at(fuseWith) ) >= 6 ) return;
		
		
		//console.log("Creating and fusing bulge", S, "with bulge", fuseWith, "at pos", this->bulgePos.at(fuseWith), "mRNAPosInActiveSite=", mRNAPosInActiveSite);
		
		
		if (this->NTPbound()) this->releaseNTP();

		

		// bulgePos and bulgedBase are the rightmost positions in the bulge
		this->bulgeSize.at(fuseWith) ++;
		if ( (this->mRNAPosInActiveSite >= 0 && this->bulgePos.at(fuseWith) == this->mRNAPosInActiveSite + 2 ) || (this->mRNAPosInActiveSite < 0)) this->bulgedBase.at(fuseWith) ++;
		if ( this->mRNAPosInActiveSite >= 0 && this->bulgePos.at(fuseWith) != this->mRNAPosInActiveSite + 2 ) this->bulgePos.at(fuseWith) ++;
		
	


		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){

			int leftBoundary = this->bulgedBase.at(fuseWith) - this->bulgeSize.at(fuseWith);
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), this->bulgeSize.at(fuseWith), true, 0);

			if (PrimerType.substr(0,2) == "ss"){
				for (int i = leftBoundary + this->bulgeSize.at(fuseWith) + 2; i < this->get_nascentLength() + 1; i ++){
					if (i>this->getRightNascentBaseNumber() && i-this->getRightNascentBaseNumber() <= bubbleRight->getVal()) Coordinates::move_nt(i, "m", -25, -52/bubbleRight->getVal());
					else Coordinates::move_nt(i, "m", -25, 0);
				}
			}

		}
		
		this->rightNascentBase ++;
		this->mRNAPosInActiveSite ++;
		this->nextTemplateBaseToCopy --;
		this->changeInLeftBulgePosition --;

		//if (UPDATE_COORDS) WW_JS.setNextBaseToAdd_WW();
		
		this->reset_slipping_params(S);
		DOMupdates->add_landscapes_to_reset(S);
		if (this->bulgeSize.at(fuseWith) <= 2) {
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
			this->partOfBulgeID.at(S) = fuseWith;
		}
		


		//return true;
		
	}
	

	else if (this->bulgePos.at(S) > 0 && Settings::indexOf(this->bulgePos, this->bulgePos.at(S) + 1) != -1){ // Fuse the 2 bulges
			
			
		int fuseWith = Settings::indexOf(this->bulgePos, this->bulgePos.at(S) + 1);
		
		this->bulgeSize.at(fuseWith) ++; // bulgePos and bulgedBase are the rightmost positions in the bulge
		this->bulgedBase.at(fuseWith) ++;


		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			int leftBoundary = this->bulgedBase.at(fuseWith) - this->bulgeSize.at(fuseWith);
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), this->bulgeSize.at(fuseWith), true, 0);

			
			this->bulgeSize.at(S) --;
			if (this->bulgeSize.at(S) == 0) {
				this->reset_slipping_params(S);
				DOMupdates->add_landscapes_to_reset(S);
			}
			else if (this->bulgeSize.at(S) > 0){
				leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S);
				Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary, "m")->getX(), this->bulgeSize.at(S), true, 0);
			}

		}
		
		// If we fused together 2 bulges of size 1, we simply turn the donor's diffusion landscape into the acceptor's fission landscape
		if (this->bulgeSize.at(S) == 0 && this->bulgeSize.at(fuseWith) == 2) {
			this->partOfBulgeID.at(S) = fuseWith;
		}

		// If this created a bulge of size 2 and the donor bulge was of size > 1, then create a fissure landscape
		else if (this->bulgeSize.at(S) > 0 && this->bulgeSize.at(fuseWith) == 2) {
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
			this->partOfBulgeID.at(this->bulgePos.size()-1) = fuseWith; 
		}
		
		// If the donor bulge has been destroyed, but the acceptor bulge is still large, then simply destroy this diffusion landscape
		else if (this->bulgeSize.at(S) == 0 && this->bulgeSize.at(fuseWith) > 2) {
			int toDelete = this->delete_slipping_params(S);
			DOMupdates->add_landscapes_to_delete(toDelete);
		}


		// If the donor bulge went from size 2 down to 1, then we need to delete its fissure landscape
		if (DOMupdates->get_landscapes_to_delete_size() == 0 && this->bulgeSize.at(S) == 1) {
			int bulgeIDOfDonorFissure = this->get_fissure_landscape_of(S);
			int toDelete = this->delete_slipping_params(bulgeIDOfDonorFissure);
			DOMupdates->add_landscapes_to_delete(toDelete);
		}


		//return true;

	}
	
	//return false;

}

void State::fuseBulgeRight(int S, SlippageLandscapes* DOMupdates){

	if (this->isGuiState) cout << "fuse right" << S << endl;
	if (this->getLeftNascentBaseNumber() > 1 && this->bulgePos.at(S) == 0 && ((Settings::indexOf(this->bulgePos, this->getLeftBulgeBoundary()) != -1) || Settings::indexOf(this->bulgePos, hybridLen->getVal() - 2) != -1)) { // Form bulge first and then fuse them
		
		
		
		int fuseWith = Settings::indexOf(this->bulgePos, this->getLeftBulgeBoundary());
		if (fuseWith == -1)	fuseWith = Settings::indexOf(this->bulgePos, this->getLeftBulgeBoundary() - 1);
		
		if (Settings::indexOf(this->bulgeSize,  this->bulgePos.at(fuseWith) ) >= 6 ) return;
		

		this->bulgeSize.at(fuseWith) ++;
		this->leftNascentBase --;
		//this->changeInLeftBulgePosition --;


		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
			int leftBoundary = this->bulgedBase.at(fuseWith) - this->bulgeSize.at(fuseWith);
			Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary+1, "m")->getX(), this->bulgeSize.at(fuseWith), true, 0);
			for (int i = leftBoundary - 1;  i >= 0; i --){
				if (i > this->getLeftNascentBaseNumber() - (bubbleLeft->getVal()+1)) Coordinates::move_nt(i, "m", 25, -52/(bubbleLeft->getVal()+1));
				else Coordinates::move_nt(i, "m", 25, 0);
			}
		}
		
		
		this->reset_slipping_params(S);
		DOMupdates->add_landscapes_to_reset(S);
		if (this->bulgeSize.at(fuseWith) <= 2) {
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
			this->partOfBulgeID.at(S) = fuseWith;
		}
		

		

	}
	
		

	else if (this->bulgePos.at(S) > 0 && Settings::indexOf(this->bulgePos, this->bulgePos.at(S) - 1) != -1){ // Fuse the 2 bulges
		
		
			
		int fuseWith = Settings::indexOf(this->bulgePos, this->bulgePos.at(S) - 1);
		

		this->bulgeSize.at(fuseWith) ++; // bulgePos and bulgedBase are the rightmost positions in the bulge


		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){

			int leftBoundary = this->bulgedBase.at(fuseWith) - this->bulgeSize.at(fuseWith);
			if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden"){
				Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary+1, "m")->getX(), this->bulgeSize.at(fuseWith), true, 0);
			}

		}
		
		
		this->bulgeSize.at(S) --;
		if (this->bulgeSize.at(S) == 0){
	 		this->reset_slipping_params(S);
			DOMupdates->add_landscapes_to_reset(S);
		}

		else if (this->bulgeSize.at(S) > 0){ 
			this->bulgedBase.at(S) --;
			int leftBoundary = this->bulgedBase.at(S) - this->bulgeSize.at(S);
			if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") Coordinates::position_bulge(leftBoundary, Coordinates::getNucleotide(leftBoundary+1, "m")->getX(), this->bulgeSize.at(S), true, 0);
		}


		// If we fused together 2 bulges of size 1, we simply turn the donor's diffusion landscape into the acceptor's fission landscape
		if (this->bulgeSize.at(S) == 0 && this->bulgeSize.at(fuseWith) == 2) {
			this->partOfBulgeID.at(S) = fuseWith;
		}

		// If this created a bulge of size 2 and the donor bulge was of size > 1, then create a fissure landscape
		else if (this->bulgeSize.at(S) > 0 && this->bulgeSize.at(fuseWith) == 2) {
			int graphID = this->create_new_slipping_params();
			DOMupdates->add_where_to_create_new_slipping_landscape(graphID);
			this->partOfBulgeID.at(this->bulgePos.size()-1) = fuseWith;
		}
		
		// If the donor bulge has been destroyed, but the acceptor bulge is still large, then simply destroy this diffusion landscape
		else if (this->bulgeSize.at(S) == 0 && this->bulgeSize.at(fuseWith) > 2) {
			int toDelete = this->delete_slipping_params(S);
			DOMupdates->add_landscapes_to_delete(toDelete);
		}
		
		
		// If the donor bulge went from size 2 down to 1, then we need to delete its fissure landscape

		if (DOMupdates->get_landscapes_to_delete_size() == 0 && this->bulgeSize.at(S) == 1) {
			int bulgeIDOfDonorFissure = get_fissure_landscape_of(S);
			int toDelete = this->delete_slipping_params(bulgeIDOfDonorFissure);
			DOMupdates->add_landscapes_to_delete(toDelete);
		}


	}
	
	//return false;

}







// Gets the button label associated with slipping right
string State::getSlipRightLabel(int S) {


	string toReturn = "{}";

	bool allowMultipleBulges = currentModel->get_allowMultipleBulges();
	int h = this->getLeftBulgeBoundary() + 1; //hybridLen->getVal();

	int fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 1, 1));
	if (fuseWith == -1)	fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 2, 2));



	if (this->terminated) toReturn = "{'label': ''}";
	else if (allowMultipleBulges && this->partOfBulgeID.at(S) != S && this->bulgePos.at( this->partOfBulgeID.at(S) ) - max(0, this->mRNAPosInActiveSite) == 1) toReturn = "{'label': ''}";
	else if (allowMultipleBulges && this->partOfBulgeID.at(S) != S) toReturn = "{'label': 'Fissure'}";
	else if (!this->NTPbound() && this->partOfBulgeID.at(S) == S && this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) == 1) toReturn = "{'label': 'Absorb', 'title': 'Absorb the bulge at the left end of the hybrid (ctrl + &rarr;)'}";
	else if (allowMultipleBulges && this->bulgePos.at(S) > 0 && Settings::indexOf(this->bulgePos, this->bulgePos.at(S) - 1) != -1) toReturn = "{'label': 'Fuse'}";
	else if (this->leftNascentBase > 1 && allowMultipleBulges &&  this->bulgePos.at(S) == 0 && (Settings::indexOf(this->bulgePos, h - 1) != -1 || Settings::indexOf(this->bulgePos, h - 2) != -1)) toReturn = "{'label': 'Form', 'title': 'Create a bulge at the left end of the hybrid (ctrl + &rarr;)'}";
	else if (this->bulgePos.at(S) < h && this->bulgePos.at(S) > 1 && this->bulgePos.at(S) - max(0, this->mRNAPosInActiveSite) != 1) toReturn = "{'label': 'Diffuse', 'title': 'Move the bulge one step to the right (ctrl + &rarr;)'}";
	else if (this->bulgePos.at(S) == 0) toReturn = "{'label': 'Form', 'title': 'Create a bulge at the left end of the hybrid (ctrl + &rarr;)'}";


	return toReturn;



}


// Gets the button label associated with slipping left
string State::getSlipLeftLabel(int S) {

	string toReturn = "{}";

	bool allowMultipleBulges = currentModel->get_allowMultipleBulges();
	int h = this->getLeftBulgeBoundary() + 1; //hybridLen->getVal();

	int fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 1, 1));
	if (fuseWith == -1)	fuseWith = Settings::indexOf(this->bulgePos, max(this->mRNAPosInActiveSite + 2, 2));


	if (this->terminated) toReturn = "{'label': ''}";
	else if (allowMultipleBulges && this->partOfBulgeID.at(S) != S && this->bulgePos.at( this->partOfBulgeID.at(S) ) == h - 1) toReturn = "{'label': ''}";
	else if (allowMultipleBulges && this->partOfBulgeID.at(S) != S) toReturn = "{'label': 'Fissure'}";
	else if (allowMultipleBulges && this->bulgePos.at(S) > 0 && Settings::indexOf(this->bulgePos, this->bulgePos.at(S) + 1) != -1) toReturn = "{'label': 'Fuse'}";
	else if (allowMultipleBulges && this->bulgePos.at(S) == 0 && allowMultipleBulges && this->bulgePos.at(S) == 0 && fuseWith != -1) {
		if (this->mRNAPosInActiveSite >= 0 && Settings::indexOf(this->bulgePos,  this->bulgePos.at(fuseWith) +1 ) != -1) toReturn = "{'label': ''}";
		else toReturn = "{'label': 'Form', 'title': 'Create a bulge at the right end of the hybrid (ctrl + &larr;)'}";
	}
	else if (this->bulgePos.at(S) > 0 && this->bulgePos.at(S) < h - 1) toReturn = "{'label': 'Diffuse', 'title': 'Move the bulge one step to the left (ctrl + &larr;)'}";
	else if (!this->NTPbound() && this->bulgePos.at(S) == 0 && this->mRNAPosInActiveSite != h - 1)  toReturn = "{'label': 'Form', 'title': 'Create a bulge at the right end of the hybrid (ctrl + &larr;)'}";
	else if (this->bulgePos.at(S) == h - 1) toReturn = "{'label': 'Absorb', 'title': 'Absorb the bulge at the left end of the hybrid (ctrl + &larr;)'}";
			
	return toReturn;


}






int State::create_new_slipping_params() {


	// if (!currentModel->get_allowMultipleBulges()) return null;
	
	int graphID = this->bulgePos.size();
	
	// Create new elements in the lists
	this->bulgePos.push_back(0);
	this->bulgedBase.push_back(-1);
	this->bulgeSize.push_back(0);
	this->partOfBulgeID.push_back(graphID);

	return graphID;
	
}



void State::reset_slipping_params(int S) {


	//if (this->isGuiState) cout << "Resetting " << S;
	this->bulgePos.at(S) = 0;
	this->bulgedBase.at(S) = -1;
	this->bulgeSize.at(S) = 0;
	this->partOfBulgeID.at(S) = S;
	
}


int State::delete_slipping_params(int S) {


	//if (!currentModel->get_allowMultipleBulges()) return;
	//if (this->isGuiState) cout << "Deleting " << S;

	// Delete this element from all slippage related lists
	std::deque<int>::iterator it = this->bulgePos.begin();
	advance(it, S);
	this->bulgePos.erase(it);

	it = this->bulgedBase.begin();
	advance(it, S);
	this->bulgedBase.erase(it);

	it = this->bulgeSize.begin();
	advance(it, S);
	this->bulgeSize.erase(it);

	it = this->partOfBulgeID.begin();
	advance(it, S);
	this->partOfBulgeID.erase(it);


	
	// Pull down the indices where applicable
	for (int s = 0; s < this->partOfBulgeID.size(); s++){
		if (this->partOfBulgeID.at(s) > S) {
			this->partOfBulgeID.at(s) --;
		}
	}



	return this->bulgePos.size();

	
}



// Returns the index of the fissure landscape which applies to bulge index S
int State::get_fissure_landscape_of(int S){
	
	for (int s = 0; s < this->bulgePos.size(); s++){
		if (s == S) continue;
		if (this->partOfBulgeID.at(s) == S) return s;
	}

	return -1;
}





void State::setNextBaseToAdd(string baseToAdd){
	this->thereHaveBeenMutations = true;
	this->NTPtoAdd = baseToAdd;
}

string State::getNextBaseToAdd(){
	return this->NTPtoAdd;
}

bool State::get_thereHaveBeenMutations(){
	return this->thereHaveBeenMutations;
}


bool State::isTerminated(){
	return this->terminated;
}


void State::set_terminated(bool newVal){
	this->terminated = newVal;
}

bool State::NTPbound(){
	return this->boundNTP != "";
}

string State::get_boundNTP(){
	return this->boundNTP;
}

int State::get_mRNAPosInActiveSite(){
	return this->mRNAPosInActiveSite;
}

int State::get_nascentLength(){
	return this->nascentSequence.length();
}

string State::get_NascentSequence(){
	return this->nascentSequence;
}

bool State::get_activated(){
	return this->activated;
}

int State::get_initialLength() {
	
	// Returns the length of the sequence when it was first created
	return (int)(hybridLen->getVal()-1) + 2 + max(2, (int)(bubbleLeft->getVal()));
}


int State::getLeftNascentBaseNumber(){
	return this->leftNascentBase;
	//return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite() + 1 - (int)(hybridLen->getVal());
}

int State::getRightNascentBaseNumber(){
	return this->rightNascentBase;
	//return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite();
}


int State::getLeftTemplateBaseNumber(){
	return this->leftTemplateBase;
	//return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite() + 1 - (int)(hybridLen->getVal());
}

int State::getRightTemplateBaseNumber(){
	return this->rightTemplateBase;
	//return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite();
}


int State::get_nextTemplateBaseToCopy(){
	return this->nextTemplateBaseToCopy;
}

// Maximum value an element in bulgePos may take before the bulge will absorb if it goes any higher 
int State::getLeftBulgeBoundary(){
	return PrimerType.substr(0,2) == "ss" ? hybridLen->getVal() - 1 : this->rightNascentBase - 2 + this->changeInLeftBulgePosition;
} 



double State::calculateTranslocationFreeEnergy(bool ignoreParametersAndSettings){
	double freeEnergy = FreeEnergy::getFreeEnergyOfHybrid(this) - FreeEnergy::getFreeEnergyOfTranscriptionBubble(this);
	if (!ignoreParametersAndSettings && this->mRNAPosInActiveSite == 1) freeEnergy += DGPost->getVal();
	return freeEnergy;	
}


double State::calculateForwardTranslocationFreeEnergyBarrier(bool ignoreParametersAndSettings){


	double barrierHeight = 0;
	

	State* stateAfterForwardtranslocation = this->clone()->forward();


	// Midpoint model: free energy barrier is halfway between the two on either side
	if (currentModel->get_currentTranslocationModel() == "midpointBarriers"){
		barrierHeight += (this->calculateTranslocationFreeEnergy(true) + stateAfterForwardtranslocation->calculateTranslocationFreeEnergy(true)) / 2;
	}

	else if (currentModel->get_currentTranslocationModel() == "meltingBarriers" || currentModel->get_currentTranslocationModel() == "sealingBarriers"){
		barrierHeight += FreeEnergy::getFreeEnergyOfIntermediateState(this, stateAfterForwardtranslocation);
		barrierHeight -= FreeEnergy::getFreeEnergyOfTranscriptionBubbleIntermediate(this, stateAfterForwardtranslocation); // Subtract the free energy which we would gain if the intermediate transcription bubble was sealed
	}



	if (!ignoreParametersAndSettings) {
		barrierHeight += GDagSlide->getVal();
	}

	delete stateAfterForwardtranslocation;
	return barrierHeight;



}



double State::calculateBackwardTranslocationFreeEnergyBarrier(bool ignoreParametersAndSettings){

	double barrierHeight = 0;
	
	
	// Do not back translocate if it will cause the bubble to be open on the 3' end
	if (this->getLeftTemplateBaseNumber() - bubbleLeft->getVal() -1 <= 2){
		return INF;
	}


 
	State* stateAfterBackwardtranslocation = this->clone()->backward();


	// Midpoint model: free energy barrier is halfway between the two on either side
	if (currentModel->get_currentTranslocationModel() == "midpointBarriers"){
		barrierHeight += (this->calculateTranslocationFreeEnergy(true) + stateAfterBackwardtranslocation->calculateTranslocationFreeEnergy(true)) / 2;
	}

	else if (currentModel->get_currentTranslocationModel() == "meltingBarriers" || currentModel->get_currentTranslocationModel() == "sealingBarriers"){
		barrierHeight += FreeEnergy::getFreeEnergyOfIntermediateState(this, stateAfterBackwardtranslocation);
		barrierHeight -= FreeEnergy::getFreeEnergyOfTranscriptionBubbleIntermediate(this, stateAfterBackwardtranslocation); // Subtract the free energy which we would gain if the intermediate transcription bubble was sealed
	}


	if (!ignoreParametersAndSettings) {
		barrierHeight += GDagSlide->getVal();
	}


	delete stateAfterBackwardtranslocation;
	return barrierHeight;


}
