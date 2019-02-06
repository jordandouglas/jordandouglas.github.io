
#include "Settings.h"
#include "Parameter.h"
#include "Model.h"
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


#include <list>
#include <string>
#include <iostream>

using namespace std;


Model::Model(){

	id = "default";
	double modelPrior = 1;
	allowBacktracking = false;
	allowHypertranslocation = false;
	allowInactivation = false;
	deactivateUponMisincorporation = false;
	allowGeometricCatalysis = true;
	subtractMeanBarrierHeight = false;
	allowmRNAfolding = false;
	allowMisincorporation = false;
	useFourNTPconcentrations = false;
	assumeBindingEquilibrium = true;
	assumeTranslocationEquilibrium = false;
	allowMultipleBulges = true;
	allowDNAbending = false;
	
	//modelIsActive = false;


	currentTranslocationModel = "HIGU_barriers";
	currentRNABlockadeModel = "terminalBlockade";
	currentInactivationModel = "sequenceIndependent";
	currentBacksteppingModel = "backstep0";
    currentBacksteppingModel_int = 0;
	NTPbindingNParams = 2;

}



// Copies the model into a new one
Model* Model::clone(){

	// Copy model settings
	Model* clonedModel = new Model();
	clonedModel->setID(this->id);
	clonedModel->allowBacktracking = this->allowBacktracking;
	clonedModel->allowHypertranslocation = this->allowHypertranslocation;
	clonedModel->allowInactivation = this->allowInactivation;
	clonedModel->deactivateUponMisincorporation = this->deactivateUponMisincorporation;
	clonedModel->allowGeometricCatalysis = this->allowGeometricCatalysis;
	clonedModel->subtractMeanBarrierHeight = this->subtractMeanBarrierHeight;
	clonedModel->allowmRNAfolding = this->allowmRNAfolding;
	clonedModel->allowMisincorporation = this->allowMisincorporation;
	clonedModel->useFourNTPconcentrations = this->useFourNTPconcentrations;
	clonedModel->assumeBindingEquilibrium = this->assumeBindingEquilibrium;
	clonedModel->assumeTranslocationEquilibrium = this->assumeTranslocationEquilibrium;
	clonedModel->currentTranslocationModel = this->currentTranslocationModel;
	clonedModel->currentRNABlockadeModel = this->currentRNABlockadeModel;
	clonedModel->currentInactivationModel = this->currentInactivationModel;
	clonedModel->currentBacksteppingModel = this->currentBacksteppingModel;
    clonedModel->currentBacksteppingModel_int = this->currentBacksteppingModel_int;
	clonedModel->allowMultipleBulges = this->allowMultipleBulges;
	clonedModel->allowDNAbending = this->allowDNAbending;


	return clonedModel;

}





void Model::setID(string val){
	this->id = val;
}

string Model::getID(){
	return this->id;
}


void Model::addParameterHardcoding(string paramID, string value){


	// If the value is declaration of which instance number to use then divert to addParameterInstanceMapping
	vector<string> split_vector = Settings::split(value, ':');
	if (split_vector.size() == 2 && split_vector.at(0) == "instance") {
		int instanceNum = atoi(split_vector.at(1).c_str());
		this->addParameterInstanceMapping(paramID, instanceNum);
	}

	else parameterHardcodings[paramID] = atof(value.c_str());

	split_vector.clear();
}


// Changes any parameters which are hardcoded by this model
void Model::activateModel(){


    //cout << "Activating model " << this->id << " with folding " << this->allowmRNAfolding <<  endl;


	// Set parameters to their correct instance (if applicable)
	for(std::map<string, int>::iterator iter = this->parameterInstanceMappings.begin(); iter != this->parameterInstanceMappings.end(); ++iter){
		string paramID =  iter->first;
		int instanceNum = iter->second;


		Parameter* param = Settings::getParameterByName(paramID);
		if (param != nullptr) param->setParameterInstance(instanceNum);

	}


	//this->modelIsActive = true;
	for(std::map<string, double>::iterator iter = this->parameterHardcodings.begin(); iter != this->parameterHardcodings.end(); ++iter){
		
		string paramID =  iter->first;
		double value = iter->second;

		Parameter* param = Settings::getParameterByName(paramID);
		if (param != nullptr) param->hardcodeValue(value);

	}
}


// Converts the model settings into a JSON string for use by javascript (not wrapped in { })
string Model::toJSON(){


	//cout << "Getting translocation model " << this->currentTranslocationModel << "." << endl;
	
	string JSON = "";

	JSON += "'ID':'" + this->id + "',";


	// Model settings
	JSON += "'allowBacktracking':" + string(this->allowBacktracking ? "true" : "false") + ",";
	JSON += "'allowHypertranslocation':" + string(this->allowHypertranslocation ? "true" : "false") + ",";
	JSON += "'allowInactivation':" + string(this->allowInactivation ? "true" : "false") + ",";
	JSON += "'deactivateUponMisincorporation':" + string(this->deactivateUponMisincorporation ? "true" : "false") + ",";
	JSON += "'allowGeometricCatalysis':" + string(this->allowGeometricCatalysis ? "true" : "false") + ",";
	JSON += "'subtractMeanBarrierHeight':" + string(this->subtractMeanBarrierHeight ? "true" : "false") + ",";
	JSON += "'allowmRNAfolding':" + string(this->allowmRNAfolding ? "true" : "false") + ",";
	JSON += "'allowMisincorporation':" + string(this->allowMisincorporation ? "true" : "false") + ",";
	JSON += "'useFourNTPconcentrations':" + string(this->useFourNTPconcentrations ? "true" : "false") + ",";
	JSON += "'allowMultipleBulges':" + string(this->allowMultipleBulges ? "true" : "false") + ",";
	JSON += "'NTPbindingNParams':" + to_string(this->NTPbindingNParams) + ",";
	JSON += "'currentTranslocationModel':'" + this->currentTranslocationModel + "',";
	JSON += "'currentRNABlockadeModel':'" + this->currentRNABlockadeModel + "',";
	JSON += "'currentInactivationModel':'" + this->currentInactivationModel + "',";
	JSON += "'currentBacksteppingModel':'" + this->currentBacksteppingModel + "',";
	JSON += "'assumeBindingEquilibrium':" + string(this->assumeBindingEquilibrium ? "true" : "false") + ",";
	JSON += "'allowDNAbending':" + string(this->allowDNAbending ? "true" : "false") + ",";
	JSON += "'assumeTranslocationEquilibrium':" + string(this->assumeTranslocationEquilibrium ? "true" : "false") + ",";



	// Parameter hardcordings
	for(std::map<string, double>::iterator iter = this->parameterHardcodings.begin(); iter != this->parameterHardcodings.end(); ++iter){
		string paramID =  iter->first;
		double hcval = iter->second;
		JSON += "'" + paramID + "':" + to_string(hcval) + ",";
	}


	// Prior weight
	JSON += "'weight':" + to_string(this->modelPrior);

	
	return JSON;
	
}



// Converts the model settings into a JSON string for use by javascript (not wrapped in { })
string Model::toJSON_compact(){


	//cout << "Getting translocation model " << this->currentTranslocationModel << "." << endl;
	
	string JSON = "";
	
	JSON += "'allowBacktracking':" + string(this->allowBacktracking ? "true" : "false") + ",";
	JSON += "'allowHypertranslocation':" + string(this->allowHypertranslocation ? "true" : "false") + ",";
	JSON += "'allowInactivation':" + string(this->allowInactivation ? "true" : "false") + ",";
	JSON += "'allowGeometricCatalysis':" + string(this->allowGeometricCatalysis ? "true" : "false") + ",";
	JSON += "'subtractMeanBarrierHeight':" + string(this->subtractMeanBarrierHeight ? "true" : "false") + ",";
	JSON += "'allowmRNAfolding':" + string(this->allowmRNAfolding ? "true" : "false") + ",";
	JSON += "'useFourNTPconcentrations':" + string(this->useFourNTPconcentrations ? "true" : "false") + ",";
	JSON += "'currentTranslocationModel':'" + this->currentTranslocationModel + "',";
	JSON += "'currentRNABlockadeModel':'" + this->currentRNABlockadeModel + "',";
	JSON += "'currentInactivationModel':'" + this->currentInactivationModel + "',";
	JSON += "'currentBacksteppingModel':'" + this->currentBacksteppingModel + "',";
	JSON += "'assumeBindingEquilibrium':" + string(this->assumeBindingEquilibrium ? "true" : "false") + ",";
	JSON += "'assumeTranslocationEquilibrium':" + string(this->assumeTranslocationEquilibrium ? "true" : "false");


	// Parameter hardcordings
	for(std::map<string, double>::iterator iter = this->parameterHardcodings.begin(); iter != this->parameterHardcodings.end(); ++iter){
		string paramID =  iter->first;
		double hcval = iter->second;
		JSON += ",'" + paramID + "':" + to_string(hcval);
	}


	
	return JSON;
	
}



void Model::print(){


	cout << "\n---Model" << this->id << "---" << endl;
	cout << "modelPrior = " << this->modelPrior << endl;
	//cout << "totalPrior = " << this->getLogPrior() << endl;
	cout << "allowBacktracking = " << this->allowBacktracking << endl;
	cout << "allowHypertranslocation = " << this->allowHypertranslocation << endl;
	cout << "allowInactivation = " << this->allowInactivation << endl;
	cout << "deactivateUponMisincorporation = " << this->deactivateUponMisincorporation << endl;
	cout << "allowGeometricCatalysis = " << this->allowGeometricCatalysis << endl;
	cout << "subtractMeanBarrierHeight = " << this->subtractMeanBarrierHeight << endl;
	cout << "allowmRNAfolding = " << this->allowmRNAfolding << endl;
	cout << "allowDNAbending = " << this->allowDNAbending << endl;
	cout << "allowMisincorporation = " << this->allowMisincorporation << endl;
	cout << "useFourNTPconcentrations = " << this->useFourNTPconcentrations << endl;
	cout << "NTPbindingNParams = " << this->NTPbindingNParams << endl;
	cout << "currentTranslocationModel = " << this->currentTranslocationModel << endl;
	cout << "currentRNABlockadeModel = " << this->currentRNABlockadeModel << endl;
	cout << "currentInactivationModel = " << this->currentInactivationModel << endl;
	cout << "currentBacksteppingModel = " << this->currentBacksteppingModel << endl;
	cout << "assumeBindingEquilibrium = " << this->assumeBindingEquilibrium << endl;
	cout << "assumeTranslocationEquilibrium = " << this->assumeTranslocationEquilibrium << endl;
	cout << "allowMultipleBulges = " << this->allowMultipleBulges << endl;



	for(std::map<string, int>::iterator iter = this->parameterInstanceMappings.begin(); iter != this->parameterInstanceMappings.end(); ++iter){
		string paramID =  iter->first;
		int instanceNum = iter->second;
		cout << paramID << " instance: " << instanceNum << endl;
	}


	for(std::map<string, double>::iterator iter = this->parameterHardcodings.begin(); iter != this->parameterHardcodings.end(); ++iter){
		string paramID =  iter->first;
		double hcval = iter->second;
		cout << paramID << " = " << hcval << endl;
	}




	cout << "--------------\n" << endl;



}


// Clears the lists in preparation for deletion 
void Model::clear(){
	this->parameterHardcodings.clear();
	this->parameterInstanceMappings.clear();
}


double Model::getTranslocationModelConstant(){

	if (currentTranslocationModel == "HIGU_barriers") return _HIGUConstant;
	if (currentTranslocationModel == "HIGI_barriers") return _HIGIConstant;
	if (currentTranslocationModel == "HUGU_barriers") return _HUGUConstant;
	if (currentTranslocationModel == "HUGI_barriers") return _HUGIConstant;
	if (currentTranslocationModel == "midpointBarriers") return _midpointModelConstant;
	if (currentTranslocationModel == "absoluteBarriers") return _absoluteModelConstant;
	return 0;

}



// Use this function when a parameter has multiple instances and this model uses one of them
// Otherwise the most recently used instance will be used when this model is active
// If the parameter only has one instance then don't use this function
void Model::addParameterInstanceMapping(string paramID, int instanceNum){
	parameterInstanceMappings[paramID] = instanceNum;
}


Model*Model::set_allowBacktracking(bool val){
	this->allowBacktracking = val;
	return this;
}
bool Model::get_allowBacktracking(){
	return this->allowBacktracking;
}


Model* Model::set_allowHypertranslocation(bool val){
	this->allowHypertranslocation = val;
	return this;
}
bool Model::get_allowHypertranslocation(){
	return this->allowHypertranslocation;
}


Model*Model::set_allowInactivation(bool val){
	this->allowInactivation = val;
	return this;
}
bool Model::get_allowInactivation(){
	return this->allowInactivation;
}




Model* Model::set_deactivateUponMisincorporation(bool val){
	this->deactivateUponMisincorporation = val;
	return this;
}
bool Model::get_deactivateUponMisincorporation(){
	return this->deactivateUponMisincorporation;
}



Model* Model::set_allowGeometricCatalysis(bool val){
	this->allowGeometricCatalysis = val;
	return this;
}
bool Model::get_allowGeometricCatalysis(){
	return this->allowGeometricCatalysis;
}


Model* Model::set_subtractMeanBarrierHeight(bool val){
	this->subtractMeanBarrierHeight = val;
	DGtaudag->recomputeNormalisationTerms();
	return this;
}
bool Model::get_subtractMeanBarrierHeight(){
	return this->subtractMeanBarrierHeight;
}




Model* Model::set_allowDNAbending(bool val){
	this->allowDNAbending = val;
	return this;
}
bool Model::get_allowDNAbending(){
	return this->allowDNAbending;
}

Model* Model::set_allowmRNAfolding(bool val){
	this->allowmRNAfolding = val;
	return this;
}
bool Model::get_allowmRNAfolding(){
	return this->allowmRNAfolding;
}

Model* Model::set_allowMisincorporation(bool val){
	this->allowMisincorporation = val;
	return this;
}
bool Model::get_allowMisincorporation(){
	return this->allowMisincorporation;
}


Model* Model::set_useFourNTPconcentrations(bool val){
	this->useFourNTPconcentrations = val;
	return this;
}
bool Model::get_useFourNTPconcentrations(){
	return this->useFourNTPconcentrations;
}


Model* Model::set_assumeBindingEquilibrium(bool val){
	this->assumeBindingEquilibrium = val;
	return this;
}
bool Model::get_assumeBindingEquilibrium(){
	return this->assumeBindingEquilibrium;
}


Model* Model::set_assumeTranslocationEquilibrium(bool val){
	this->assumeTranslocationEquilibrium = val;
	return this;
}
bool Model::get_assumeTranslocationEquilibrium(){
	return this->assumeTranslocationEquilibrium;
}


Model* Model::set_allowMultipleBulges(bool val){
	this->allowMultipleBulges = val;
	return this;
}
bool Model::get_allowMultipleBulges(){
	return this->allowMultipleBulges;
}


Model* Model::set_currentTranslocationModel(string val){

	// For parsing XML files from old versions
	if (val == "meltingBarriers") val = "HIGI_barriers"; 
	else if (val == "sealingBarriers") val = "HIGU_barriers"; 


	if (val != this->currentTranslocationModel) Settings::resetRateTables(); // Need to reset the translocation rate cache when this is changed
	this->currentTranslocationModel = val;
	//cout << "Setting translocation model to " << val << "." << " aka " <<  this->currentTranslocationModel << endl;
	return this;
}
string Model::get_currentTranslocationModel(){
	//cout << "get_currentTranslocationModel " << this->currentTranslocationModel << "." << endl;
	return this->currentTranslocationModel;
}


Model* Model::set_currentRNABlockadeModel(string val){
	if (val != this->currentRNABlockadeModel) Settings::resetUnfoldingTables(); // Need to reset the translocation rate cache when this is changed
	this->currentRNABlockadeModel = val;
	return this;
}
string Model::get_currentRNABlockadeModel(){
	return this->currentRNABlockadeModel;
}



Model* Model::set_currentInactivationModel(string val){
	this->currentInactivationModel = val;
	return this;
}
string Model::get_currentInactivationModel(){
	return this->currentInactivationModel;
}

Model* Model::set_currentBacksteppingModel(string val){
	this->currentBacksteppingModel = val;
    this->currentBacksteppingModel_int = (val == "backstep0" ? 0 : -1);
	return this;
}
string Model::get_currentBacksteppingModel(){
	return this->currentBacksteppingModel;
}
int Model::get_currentBacksteppingModel_int(){
    return this->currentBacksteppingModel_int;
}





Model* Model::set_NTPbindingNParams(int val){
	this->NTPbindingNParams = val;
	return this;
}
int Model::get_NTPbindingNParams(){
	return this->NTPbindingNParams;
}


void Model::setPriorProb(double val){
	this->modelPrior = val;
}
double Model::getPriorProb(){
	return this->modelPrior;
}
