
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
	this->terminated = false;
	this->nextTemplateBaseToCopy = sequenceLength + 1;
	this->activated = true;

	
	// Transcribe a few bases forward to avoid left bubble effects
	this->transcribe(4 + max(2, (int)(bubbleLeft->getVal())));
	if (this->isGuiState) _applyingReactionsGUI = false;
	return this;
}

State* State::clone(){

	State* s = new State(false);
	s->nascentSequence = this->nascentSequence;
	s->mRNAPosInActiveSite = this->mRNAPosInActiveSite;
	s->boundNTP = this->boundNTP;
	s->terminated = this->terminated;
	s->activated = this->activated;
	s->nextTemplateBaseToCopy = this->nextTemplateBaseToCopy;
	return s;

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





State* State::forward(){


	if (this->terminated) return this;

	// Update coordinates if this state is being displayed by the GUI (and not hidden mode)
	if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {


		// Move the polymerase
		Coordinates::move_obj_from_id("pol", 25, 0);

		double shiftBaseBy = -52/(bubbleLeft->getVal()+1);
	
		for (int i = this->getLeftBaseNumber(); i > this->getLeftBaseNumber() - (bubbleLeft->getVal()+1) && i >= 0; i--) {
			if (i == this->getLeftBaseNumber() - (bubbleLeft->getVal()+1) + 1){
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
		for (int i = this->getRightBaseNumber() + 1; i < this->getRightBaseNumber() + (bubbleRight->getVal()+1) + 1; i++) {

			if (i == this->getRightBaseNumber() + (bubbleRight->getVal()+1)) {
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
		if (PrimerType.substr(0,2) != "ds") for (int i = this->getLeftBaseNumber(); i > this->getLeftBaseNumber() - (bubbleLeft->getVal()+1) && i >= 0; i--) Coordinates::move_nt(i, "m", 0, +52/(bubbleLeft->getVal()+1));
		for (int i = this->getRightBaseNumber() + 1; i < this->getRightBaseNumber() + (bubbleRight->getVal()+1) + 1; i++) Coordinates::move_nt(i, "m", 0, -52/(bubbleRight->getVal()+1));
	

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


	if (!this->NTPbound()) this->mRNAPosInActiveSite ++; // Only move forward if NTP is not bound
	if (this->mRNAPosInActiveSite > (int)(hybridLen->getVal()-1) ||
		(this->mRNAPosInActiveSite <= 1 && this->mRNAPosInActiveSite + this->get_nascentLength() > templateSequence.length())) this->terminate();


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
	
	
	double groundEnergy = this->calculateTranslocationFreeEnergy();
	double forwardHeight = this->calculateForwardTranslocationFreeEnergyBarrier();

	//cout << "forwardHeight " << forwardHeight << ", groundEnergy = " << groundEnergy << ", diff = " << (forwardHeight - groundEnergy) << endl;

	if (forwardHeight >= INF) return 0;
	
	
	// Calculate rate
	//cout << "rate = " << groundEnergy << " - " << forwardHeight << " = " << _preExp * exp(-(forwardHeight - groundEnergy)) << endl;
	return _preExp * exp(-(forwardHeight - groundEnergy));
	

}


State* State::backward(){
	if (this->terminated) return this;
	if (this->getLeftBaseNumber() < 1 || this->getLeftBaseNumber() - bubbleLeft->getVal() -1 <= 2) return this;

	// Update coordinates if this state is being displayed by the GUI
	if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {


		// Move the polymerase
		Coordinates::move_obj_from_id("pol", -25, 0);


		// Move genome bases
		double shiftBaseBy = 52/(bubbleLeft->getVal()+1);
		for (int i = this->getLeftBaseNumber() - 1; i > this->getLeftBaseNumber() - (bubbleLeft->getVal()+1) - 1 && i >= 0; i--) {

			if (i == this->getLeftBaseNumber() - (bubbleLeft->getVal()+1)) {
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
		for (int i = this->getRightBaseNumber(); i < this->getRightBaseNumber() + (bubbleRight->getVal()+1); i++) {

			if (i == this->getRightBaseNumber() + (bubbleRight->getVal()+1) - 1) {
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
		if (PrimerType.substr(0,2) != "ds") for (int i = this->getLeftBaseNumber() - 1;i > this->getLeftBaseNumber() - (bubbleLeft->getVal()+1) - 1 && i >= 0; i--) Coordinates::move_nt(i, "m", 0, -52/(bubbleLeft->getVal()+1));
		for (int i = this->getRightBaseNumber(); i < this->getRightBaseNumber() + (bubbleRight->getVal()+1); i++) Coordinates::move_nt(i, "m", 0, +52/(bubbleRight->getVal()+1));


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


	if (!this->NTPbound()) this->mRNAPosInActiveSite --; // Only move backwards if NTP is not bound

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
	
	
	double groundEnergy = this->calculateTranslocationFreeEnergy();
	double backwardHeight = this->calculateBackwardTranslocationFreeEnergyBarrier();
	if (backwardHeight >= INF) return 0;
	
	
	// Calculate rate
	return _preExp * exp(-(backwardHeight - groundEnergy));

	

}


State* State::bindNTP(){
	
	if (this->terminated || !this->activated) return this;
	
	// Bind NTP
	if (!this->NTPbound() && this->mRNAPosInActiveSite == 1){

		this->boundNTP = Settings::complementSeq(templateSequence.substr(this->nextTemplateBaseToCopy-1, 1), PrimerType.substr(2) == "RNA");

		// Update coordinates if this state is being displayed by the GUI
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
			HTMLobject* nt = Coordinates::getNucleotide(this->nextTemplateBaseToCopy, "g");
			if (nt != nullptr) {
				double xCoord = nt->getX() + 10;
				double yCoord = 165;
				Coordinates::create_nucleotide(this->nextTemplateBaseToCopy, "m", xCoord, yCoord, this->boundNTP, this->boundNTP + "m", true);
			}

		}


	}

	
	// Elongate
	else if (this->NTPbound() && this->mRNAPosInActiveSite == 1){


		// Update coordinates if this state is being displayed by the GUI
		if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
		 	Coordinates::move_nt(this->getRightBaseNumber(), "m", -10, -10); // Move NTP into the sequence
			Coordinates::set_TP_state(this->getRightBaseNumber(), "m", false); // Remove the TP
		}


		this->nascentSequence += this->boundNTP;
		this->boundNTP = "";
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



	if (this->NTPbound()){
		this->boundNTP = "";
	}

	// Update coordinates if this state is being displayed by the GUI
	if (this->isGuiState && _applyingReactionsGUI && _animationSpeed != "hidden") {
		Coordinates::delete_nt(this->get_nascentLength()+1, "m");
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
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite() + 1 - (int)(hybridLen->getVal());
}

int State::getRightNascentBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite();
}


int State::getLeftTemplateBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite() + 1 - (int)(hybridLen->getVal());
}

int State::getRightTemplateBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite();
}



int State::getLeftBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite() + 1 - (int)(hybridLen->getVal());
}

int State::getRightBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite();
}

int State::get_nextTemplateBaseToCopy(){
	return this->nextTemplateBaseToCopy;
}

void State::set_mRNAPosInActiveSite(int newVal){
	this->mRNAPosInActiveSite = newVal;
}





double State::calculateTranslocationFreeEnergy(){
	double freeEnergy = FreeEnergy::getFreeEnergyOfHybrid(this) - FreeEnergy::getFreeEnergyOfTranscriptionBubble(this);
	return freeEnergy;	
}


double State::calculateForwardTranslocationFreeEnergyBarrier(){


	double barrierHeight = 0;
	

	State* stateAfterForwardtranslocation = this->clone()->forward();


	// Midpoint model: free energy barrier is halfway between the two on either side
	if (currentModel->get_currentTranslocationModel() == "midpointBarriers"){
		barrierHeight += (this->calculateTranslocationFreeEnergy() + stateAfterForwardtranslocation->calculateTranslocationFreeEnergy()) / 2;
	}

	else if (currentModel->get_currentTranslocationModel() == "meltingBarriers" || currentModel->get_currentTranslocationModel() == "sealingBarriers"){
		barrierHeight += FreeEnergy::getFreeEnergyOfIntermediateState(this, stateAfterForwardtranslocation);
		barrierHeight -= FreeEnergy::getFreeEnergyOfTranscriptionBubbleIntermediate(this, stateAfterForwardtranslocation); // Subtract the free energy which we would gain if the intermediate transcription bubble was sealed
	}
	

	
	return barrierHeight;



}



double State::calculateBackwardTranslocationFreeEnergyBarrier(){

	double barrierHeight = 0;
	
	
	// Do not back translocate if it will cause the bubble to be open on the 3' end
	if (this->getLeftBaseNumber() - bubbleLeft->getVal() -1 <= 2){
		return INF;
	}


 
	State* stateAfterBackwardtranslocation = this->clone()->backward();


	// Midpoint model: free energy barrier is halfway between the two on either side
	if (currentModel->get_currentTranslocationModel() == "midpointBarriers"){
		barrierHeight += (this->calculateTranslocationFreeEnergy() + stateAfterBackwardtranslocation->calculateTranslocationFreeEnergy()) / 2;
	}

	else if (currentModel->get_currentTranslocationModel() == "meltingBarriers" || currentModel->get_currentTranslocationModel() == "sealingBarriers"){
		barrierHeight += FreeEnergy::getFreeEnergyOfIntermediateState(this, stateAfterBackwardtranslocation);
		barrierHeight -= FreeEnergy::getFreeEnergyOfTranscriptionBubbleIntermediate(this, stateAfterBackwardtranslocation); // Subtract the free energy which we would gain if the intermediate transcription bubble was sealed
	}


	
	return barrierHeight;


}
