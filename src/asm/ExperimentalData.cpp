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
	this->halt = 0;
	this->currentExperiment = -1;
	this->sequenceID = _seqID;

	this->pauseSite = 0;
	this->Emax = 0;
	this->t12 = 0;


	ntrials.resize(nObs);
	if (dataType == "timeGel") {
		lanes.resize(nObs);
	}
	else {
		settingsX.resize(nObs); 
		observationsY.resize(nObs);
	}
}


int ExperimentalData::getID(){
	return this->id;
}

// Create a new lane in the time gel
void ExperimentalData::addTimeGelLane(int laneNum, double time, vector<double> densities, double rectTop, double rectLeft, double rectWidth, double rectHeight, double rectAngle, bool simulateLane, double laneInterceptY){


	if (currentExperiment+1 < lanes.size()){
		currentExperiment ++;
		lanes.at(currentExperiment) = new GelLaneData(laneNum, time, densities, rectTop, rectLeft, rectWidth, rectHeight, rectAngle, simulateLane, laneInterceptY);
	}


}



void ExperimentalData::addDatapoint(double setting, double observation){

	if (currentExperiment+1 < settingsX.size()){
		currentExperiment ++;
		settingsX.at(currentExperiment) = setting;
		observationsY.at(currentExperiment) = observation;
	}

}


void ExperimentalData::addDatapoint(double setting, double observation, int n){

	if (currentExperiment+1 < settingsX.size()){
		currentExperiment ++;
		settingsX.at(currentExperiment) = setting;
		observationsY.at(currentExperiment) = observation;
		ntrials.at(currentExperiment) = n;
	}

}


double ExperimentalData::getCurrentSettingX(){
	return settingsX.at(this->currentExperiment);
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


string ExperimentalData::toJSON(){


	string JSON = "'fit" + to_string(this->id) + "':{";
	JSON += "'dataType':'" + this->dataType + "',";
	JSON += "'ATPconc':" + to_string(this->ATPconc_local) + ",";
	JSON += "'CTPconc':" + to_string(this->CTPconc_local) + ",";
	JSON += "'GTPconc':" + to_string(this->GTPconc_local) + ",";
	JSON += "'UTPconc':" + to_string(this->UTPconc_local) + ",";
	JSON += "'force':" + to_string(this->force) + ",";
	if (this->dataType == "pauseEscape") {
		JSON += "'pauseSite':" + to_string(this->pauseSite) + ",";
		JSON += "'halt':" + to_string(this->halt) + ",";
		JSON += "'Emax':" + to_string(this->Emax) + ",";
		JSON += "'t12':" + to_string(this->t12) + ",";
	}


	// Using own sequence?
	if (this->sequenceID != _seqID){
		JSON += "'seq':'" + Settings::getSequence(this->sequenceID)->get_templateSequence() + "',";

	}


	JSON += "'vals':[";

	// Iterate through all observed values
	int nobservations = this->dataType == "timeGel" ? this->lanes.size() : settingsX.size();
	for (int i = 0; i < nobservations; i ++){


		if (this->dataType != "pauseEscape") JSON += "{";

		if (this->dataType == "forceVelocity"){
			JSON += "'force':" + to_string(settingsX.at(i)) + ",";
			JSON += "'velocity':" + to_string(observationsY.at(i));
		}

		else if (this->dataType == "ntpVelocity"){
			JSON += "'ntp':" + to_string(settingsX.at(i)) + ",";
			JSON += "'velocity':" + to_string(observationsY.at(i));
		}


		else if (this->dataType == "pauseEscape"){
			JSON += to_string(settingsX.at(i)) + ",";
		}


		else if (this->dataType == "timeGel"){
			JSON += this->lanes.at(i)->toJSON();
		}

		if (this->dataType != "pauseEscape") JSON += "},";
		

	}

	if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);

	JSON += "]}";

	return JSON;

}


// Changes the global settings to reflect the settings described by the first experiment in settingsX
bool ExperimentalData::reset() {

	this->currentExperiment = 0;
	if (this->settingsX.size() == 0 && this->dataType != "timeGel") return false;
	if (this->lanes.size() == 0 && this->dataType == "timeGel") return false;


	// Change the settings
	applySettings();
	return true;

}




// Moves on to the next experimental settings
bool ExperimentalData::next() {

	this->currentExperiment ++;
	if (this->currentExperiment >= this->ntrials.size()) return false;

	// Change the settings
	applySettings();
	return true;

}

int ExperimentalData::getNTrials(){
	if (this->currentExperiment >= this->settingsX.size()) return 0;
	return this->ntrials.at(this->currentExperiment);
}

string ExperimentalData::getDataType(){
	return this->dataType;
}

void ExperimentalData::clear(){
	this->ntrials.clear();
	this->settingsX.clear();
	this->observationsY.clear();

	for (int i = 0; i < this->lanes.size(); i ++){
		this->lanes.at(i)->clear();
		delete this->lanes.at(i);
	}
	this->lanes.clear();

}

// Applies the current experimental settings to the model ie. NTP concentration and force
void ExperimentalData::applySettings(){



	//cout << "Changing settings to experiment " << this->id << " obs " << this->currentExperiment << endl;
	currentModel->set_useFourNTPconcentrations(true); // Ensure that 4 NTP concentrations are being used

	// Select the appropriate sequence
	Settings::setSequence(this->sequenceID);


	if (this->dataType == "forceVelocity"){
		double currentXVal = this->settingsX.at(this->currentExperiment);
		ATPconc->hardcodeValue(this->ATPconc_local);
		CTPconc->hardcodeValue(this->CTPconc_local);
		GTPconc->hardcodeValue(this->GTPconc_local);
		UTPconc->hardcodeValue(this->UTPconc_local);
		FAssist->hardcodeValue(currentXVal);
	}


	else if (this->dataType == "ntpVelocity"){
		double currentXVal = this->settingsX.at(this->currentExperiment);
		ATPconc->hardcodeValue(this->ATPconc_local * currentXVal);
		CTPconc->hardcodeValue(this->CTPconc_local * currentXVal);
		GTPconc->hardcodeValue(this->GTPconc_local * currentXVal);
		UTPconc->hardcodeValue(this->UTPconc_local * currentXVal);
		FAssist->hardcodeValue(this->force);
	}


	else if (this->dataType == "pauseEscape"){
		ATPconc->hardcodeValue(this->ATPconc_local);
		CTPconc->hardcodeValue(this->CTPconc_local);
		GTPconc->hardcodeValue(this->GTPconc_local);
		UTPconc->hardcodeValue(this->UTPconc_local);
		FAssist->hardcodeValue(this->force);
		haltPosition->hardcodeValue(this->halt);

		// Set the cutoff time to that of the current experiment
		double currentTime = this->settingsX.at(this->currentExperiment);
		arrestTime->hardcodeValue(currentTime);

	}



	else if (this->dataType == "timeGel"){
		ATPconc->hardcodeValue(this->ATPconc_local);
		CTPconc->hardcodeValue(this->CTPconc_local);
		GTPconc->hardcodeValue(this->GTPconc_local);
		UTPconc->hardcodeValue(this->UTPconc_local);

		// Set the cutoff time to that of the current experiment
		arrestTime->hardcodeValue(this->lanes.at(this->currentExperiment)->get_time());
	}


	else cout << "Unknown data type " << this->dataType << endl;



}


// Return the current observation
double ExperimentalData::getObservation() {
	return this->observationsY.at(this->currentExperiment);
}

GelLaneData* ExperimentalData::getCurrentLane(){
	return this->lanes.at(this->currentExperiment);
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
void ExperimentalData::set_halt(int val) {
	this->halt = val;
}
void ExperimentalData::set_pauseSite(int val) {
	this->pauseSite = val;
}
void ExperimentalData::set_Emax(double val) {
	this->Emax = val;
}
void ExperimentalData::set_t12(double val) {
	this->t12 = val;
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
int ExperimentalData::get_halt() {
	return this->halt;
}
int ExperimentalData::get_pauseSite() {
	return this->pauseSite;
}
double ExperimentalData::get_Emax() {
	return this->Emax;
}
double ExperimentalData::get_t12() {
	return this->t12;
}


