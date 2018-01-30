
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
#include "Parameter.h"
#include "Model.h"
#include "FreeEnergy.h"

#include "TranslocationRatesCache.h"
#include <iostream>
#include <locale>
#include <algorithm>
#include <iomanip>

using namespace std;

State::State(bool init){

	if (init) this->setToInitialState();

}


State* State::setToInitialState(){

	this->nascentSequence = "";
	int sequenceLength = (int)(hybridLen->getVal()-1);
	for (int i = 0; i < sequenceLength; i ++){
		this->nascentSequence += Settings::complementSeq(templateSequence.substr(i,1), PrimerType.substr(2) == "RNA");
	}
	this->mRNAPosInActiveSite = 0;
	this->boundNTP = "";
	this->terminated = false;
	
	// Transcribe a few bases forward to avoid left bubble effects
	return this->transcribe(2 + max(2, (int)(bubbleLeft->getVal())));
}

State* State::clone(){

	State* s = new State(false);
	s->nascentSequence = this->nascentSequence;
	s->mRNAPosInActiveSite = this->mRNAPosInActiveSite;
	s->boundNTP = this->boundNTP;
	s->terminated = this->terminated;
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





State* State::forward(){
	if (this->terminated) return this;
	if (!this->NTPbound()) this->mRNAPosInActiveSite ++; // Only move forward if NTP is not bound
	if (this->mRNAPosInActiveSite > (int)(hybridLen->getVal()-1) ||
		(this->mRNAPosInActiveSite <= 1 && this->mRNAPosInActiveSite + this->get_nascentLength() + 1 > templateSequence.length())) this->terminated = true;
	
	return this;
}

double State::calculateForwardRate(bool lookupFirst, bool ignoreStateRestrictions){
	
	if (!ignoreStateRestrictions){
		if (this->terminated || this->NTPbound()) return 0;
		//if (currentModel->get_assumeTranslocationEquilibrium() && this->mRNAPosInActiveSite == 0) return 0;
	}
	
	// Lookup in table first or calculate it again?
	if (lookupFirst){
		double kFwd = TranslocationRatesCache::getTranslocationRates(this, true);
		return kFwd;
	}
	
	
	double groundEnergy = this->calculateTranslocationFreeEnergy();
	double forwardHeight = this->calculateForwardTranslocationFreeEnergyBarrier();
	if (forwardHeight >= INF) return 0;
	
	
	// Calculate rate
	//cout << "rate = " << groundEnergy << " - " << forwardHeight << " = " << _preExp * exp(-(forwardHeight - groundEnergy)) << endl;
	return _preExp * exp(-(forwardHeight - groundEnergy));
	

}


State* State::backward(){
	if (this->terminated) return this;
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
		double kBck = TranslocationRatesCache::getTranslocationRates(this, false);
		return kBck;
	}
	
	
	
	double groundEnergy = this->calculateTranslocationFreeEnergy();
	double backwardHeight = this->calculateBackwardTranslocationFreeEnergyBarrier();
	if (backwardHeight >= INF) return 0;
	
	
	// Calculate rate
	return _preExp * exp(-(backwardHeight - groundEnergy));

	

}


State* State::bindNTP(){
	
	if (this->terminated) return this;
	
	// Bind NTP
	if (!this->NTPbound() && this->mRNAPosInActiveSite == 1){
		this->boundNTP = Settings::complementSeq(templateSequence.substr(this->get_nascentLength(), 1), PrimerType.substr(2) == "RNA");
	}
	
	// Elongate
	else if (this->NTPbound() && this->mRNAPosInActiveSite == 1){
		this->nascentSequence += this->boundNTP;
		this->boundNTP = "";
		this->mRNAPosInActiveSite = 0;
	}
	
	return this;
	
}


double State::calculateBindNTPrate(bool ignoreStateRestrictions){


	if (!ignoreStateRestrictions){
		if (this->terminated) return 0;
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
			
	// Elongate
	else if (this->NTPbound() && this->mRNAPosInActiveSite == 1){
		return kCat->getVal();
	}


	return 0;
	
}


State* State::releaseNTP(){
	
	if (this->terminated) return this;
	
	if (this->NTPbound()){
		this->boundNTP = "";
	}
	
	return this;
	
}

double State::calculateReleaseNTPRate(bool ignoreStateRestrictions){

	if (!ignoreStateRestrictions) if (!this->NTPbound() || this->terminated || currentModel->get_assumeBindingEquilibrium()) return 0;
	return RateBind->getVal() * Kdiss->getVal(); 

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

int State::get_mRNAPosInActiveSite(){
	return this->mRNAPosInActiveSite;
}

int State::get_nascentLength(){
	return this->nascentSequence.length();
}

string State::get_NascentSequence(){
	return this->nascentSequence;
}

int State::get_initialLength() {
	
	// Returns the length of the sequence when it was first created
	return (int)(hybridLen->getVal()-1) + 2 + max(2, (int)(bubbleLeft->getVal()));
}


int State::getLeftBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite() + 1 - (int)(hybridLen->getVal());
}

int State::getRightBaseNumber(){
	return this->State::get_nascentLength() + this->State::get_mRNAPosInActiveSite();
}


void State::set_mRNAPosInActiveSite(int newVal){
	this->mRNAPosInActiveSite = newVal;
}



double State::calculateTranslocationFreeEnergy(){
	double freeEnergy = FreeEnergy::getFreeEnergyOfHybrid(this) - FreeEnergy::getFreeEnergyOfTranscriptionBubble(this);
	freeEnergy += DGPost->getVal();
	return freeEnergy;	
}


double State::calculateForwardTranslocationFreeEnergyBarrier(){


	double barrierHeight = 0;
	

	// Check if hypertranslocation is permitted
	if (!currentModel->get_allowHypertranslocation() && this->mRNAPosInActiveSite >= 1){
		return INF;
	}

	
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


	// Check if backtracking is permitted
	if (!currentModel->get_allowBacktracking() && this->mRNAPosInActiveSite <= 0){
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
