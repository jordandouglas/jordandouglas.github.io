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


#include "ExperimentalData.h"

#include <iostream>
#include <list>
#include <math.h> 
#include "Settings.h"
#include "Model.h"
#include "Parameter.h"


using namespace std;


ExperimentalData::ExperimentalData(int id, string dataType, int nObs){

	this->id = id;
	this->dataType = dataType;
	this->force = 0;
	this->ATPconc_local = ATPconc->getVal();
	this->CTPconc_local = CTPconc->getVal();
	this->GTPconc_local = GTPconc->getVal();
	this->UTPconc_local = UTPconc->getVal();
	this->currentExperiment = 0;
	this->sequenceID = _seqID;

	settingsX.resize(nObs); 
	observationsY.resize(nObs);
	ntrials.resize(nObs);

}


void ExperimentalData::addDatapoint(double setting, double observation){

	if (currentExperiment < settingsX.size()){
		settingsX.at(currentExperiment) = setting;
		observationsY.at(currentExperiment) = observation;
		currentExperiment ++;
	}

}


void ExperimentalData::addDatapoint(double setting, double observation, int n){

	if (currentExperiment < settingsX.size()){
		settingsX.at(currentExperiment) = setting;
		observationsY.at(currentExperiment) = observation;
		ntrials.at(currentExperiment) = n;
		currentExperiment ++;
	}

}




void ExperimentalData::print(){

	cout << "Experiment " << this->id << ": " << this->dataType << "; [ATP] = " << this->ATPconc_local <<  "; [CTP] = " << this->CTPconc_local << "; [GTP] = " << this->GTPconc_local << "; [UTP] = " << this->UTPconc_local << "; Force = " << this->force << "; observations: ";
	for (int i = 0; i < settingsX.size(); i ++){
		cout << settingsX.at(i) << ", " << observationsY.at(i);
		if (ntrials.at(i) != 0) cout << ", n=" << ntrials.at(i);
		cout << ", seq length: " << sequences[this->sequenceID]->get_templateSequence().length() << " nt;" << endl;
	}
	cout << endl;


}


// Changes the global settings to reflect the settings described by the first experiment in settingsX
bool ExperimentalData::reset() {

	this->currentExperiment = 0;
	if (this->settingsX.size() == 0) return false;

	// Change the settings
	applySettings();
	return true;

}




// Moves on to the next experimental settings
bool ExperimentalData::next() {

	this->currentExperiment ++;
	if (this->currentExperiment >= this->settingsX.size()) return false;

	// Change the settings
	applySettings();
	return true;

}

int ExperimentalData::getNTrials(){
	if (this->currentExperiment >= this->settingsX.size()) return 0;
	return this->ntrials.at(this->currentExperiment);
}





// Applies the current experimental settings to the model ie. NTP concentration and force
void ExperimentalData::applySettings(){


	//cout << "Changing settings to experiment " << this->id << " obs " << this->currentExperiment << endl;
	currentModel->set_useFourNTPconcentrations(true); // Ensure that 4 NTP concentrations are being used

	// Select the appropriate sequence
	Settings::setSequence(this->sequenceID);


	double currentXVal = this->settingsX.at(this->currentExperiment);
	if (this->dataType == "forceVelocity"){
		ATPconc->hardcodeValue(this->ATPconc_local);
		CTPconc->hardcodeValue(this->CTPconc_local);
		GTPconc->hardcodeValue(this->GTPconc_local);
		UTPconc->hardcodeValue(this->UTPconc_local);
		FAssist->hardcodeValue(currentXVal);
	}

	else if (this->dataType == "ntpVelocity"){
		ATPconc->hardcodeValue(this->ATPconc_local * currentXVal);
		CTPconc->hardcodeValue(this->CTPconc_local * currentXVal);
		GTPconc->hardcodeValue(this->GTPconc_local * currentXVal);
		UTPconc->hardcodeValue(this->UTPconc_local * currentXVal);
		FAssist->hardcodeValue(this->force);
	}

	else cout << "Unknown data type " << this->dataType << endl;

}


// Return the current observation
double ExperimentalData::getObservation() {
	return this->observationsY.at(this->currentExperiment);
}



void ExperimentalData::set_ATPconc(double val) {
	this->ATPconc_local = val;
}
void ExperimentalData::set_CTPconc(double val) {
	this->CTPconc_local = val;
}
void ExperimentalData::set_GTPconc(double val) {
	this->GTPconc_local = val;
}
void ExperimentalData::set_UTPconc(double val) {
	this->UTPconc_local = val;
}
void ExperimentalData::set_force(double val) {
	this->force = val;
}
void ExperimentalData::set_sequenceID(string seqID){
	this->sequenceID = seqID;
}




double ExperimentalData::get_ATPconc() {
	return this->ATPconc_local;
}
double ExperimentalData::get_CTPconc() {
	return this->CTPconc_local;
}
double ExperimentalData::get_GTPconc() {
	return this->GTPconc_local;
}
double ExperimentalData::get_UTPconc() {
	return this->UTPconc_local;
}
double ExperimentalData::get_force() {
	return this->force;
}



