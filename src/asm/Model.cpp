
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

	id = "-1";
	double modelPrior = 1;
	allowBacktracking = false;
	allowHypertranslocation = false;
	allowInactivation = false;
	allowBacktrackWithoutInactivation = false;
	deactivateUponMisincorporation = false;
	allowGeometricCatalysis = true;
	allowmRNAfolding = false;
	allowMisincorporation = false;
	useFourNTPconcentrations = true;
	assumeBindingEquilibrium = true;
	assumeTranslocationEquilibrium = false;
	//modelIsActive = false;


	currentTranslocationModel = "sealingBarriers";
	NTPbindingNParams = 2;

}



// Copies the model into a new one
Model* Model::clone(){

	// Copy model settings
	Model* clonedModel = new Model();
	clonedModel->allowBacktracking = this->allowBacktracking;
	clonedModel->allowHypertranslocation = this->allowHypertranslocation;
	clonedModel->allowInactivation = this->allowInactivation;
	clonedModel->allowBacktrackWithoutInactivation = this->allowBacktrackWithoutInactivation;
	clonedModel->deactivateUponMisincorporation = this->deactivateUponMisincorporation;
	clonedModel->allowGeometricCatalysis = this->allowGeometricCatalysis;
	clonedModel->allowmRNAfolding = this->allowmRNAfolding;
	clonedModel->allowMisincorporation = this->allowMisincorporation;
	clonedModel->useFourNTPconcentrations = this->useFourNTPconcentrations;
	clonedModel->assumeBindingEquilibrium = this->assumeBindingEquilibrium;
	clonedModel->assumeTranslocationEquilibrium = this->assumeTranslocationEquilibrium;
	clonedModel->currentTranslocationModel = this->currentTranslocationModel;


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
}


// Changes any parameters which are hardcoded by this model
void Model::activateModel(){


	// Set parameters to their correct instance (if applicable)
	for(std::map<string, int>::iterator iter = this->parameterInstanceMappings.begin(); iter != this->parameterInstanceMappings.end(); ++iter){
		string paramID =  iter->first;
		int instanceNum = iter->second;

		if (paramID == "NTPconc") NTPconc->setParameterInstance(instanceNum);
		else if (paramID == "ATPconc") ATPconc->setParameterInstance(instanceNum);
		else if (paramID == "CTPconc") CTPconc->setParameterInstance(instanceNum);
		else if (paramID == "GTPconc") GTPconc->setParameterInstance(instanceNum);
		else if (paramID == "UTPconc") UTPconc->setParameterInstance(instanceNum);
		else if (paramID == "FAssist") FAssist->setParameterInstance(instanceNum);

		else if (paramID == "hybridLen") hybridLen->setParameterInstance(instanceNum);
		else if (paramID == "bubbleLeft") bubbleLeft->setParameterInstance(instanceNum);
		else if (paramID == "bubbleRight") bubbleRight->setParameterInstance(instanceNum);

		else if (paramID == "GDagSlide") GDagSlide->setParameterInstance(instanceNum);
		else if (paramID == "DGPost") DGPost->setParameterInstance(instanceNum);
		else if (paramID == "barrierPos") barrierPos->setParameterInstance(instanceNum);

		else if (paramID == "arrestTime") arrestTime->setParameterInstance(instanceNum);
		else if (paramID == "kCat") kCat->setParameterInstance(instanceNum);
		else if (paramID == "Kdiss") Kdiss->setParameterInstance(instanceNum);
		else if (paramID == "RateBind") RateBind->setParameterInstance(instanceNum);
	}


	//this->modelIsActive = true;
	for(std::map<string, double>::iterator iter = this->parameterHardcodings.begin(); iter != this->parameterHardcodings.end(); ++iter){
		
		string paramID =  iter->first;
		double value = iter->second;

		if (paramID == "NTPconc") NTPconc->hardcodeValue(value);
		else if (paramID == "ATPconc") ATPconc->hardcodeValue(value);
		else if (paramID == "CTPconc") CTPconc->hardcodeValue(value);
		else if (paramID == "GTPconc") GTPconc->hardcodeValue(value);
		else if (paramID == "UTPconc") UTPconc->hardcodeValue(value);
		else if (paramID == "FAssist") FAssist->hardcodeValue(value);

		else if (paramID == "hybridLen") hybridLen->hardcodeValue(value);
		else if (paramID == "bubbleLeft") bubbleLeft->hardcodeValue(value);
		else if (paramID == "bubbleRight") bubbleRight->hardcodeValue(value);

		else if (paramID == "GDagSlide") GDagSlide->hardcodeValue(value);
		else if (paramID == "DGPost") DGPost->hardcodeValue(value);
		else if (paramID == "barrierPos") barrierPos->hardcodeValue(value);

		else if (paramID == "arrestTime") arrestTime->hardcodeValue(value);
		else if (paramID == "kCat") kCat->hardcodeValue(value);
		else if (paramID == "Kdiss") Kdiss->hardcodeValue(value);
		else if (paramID == "RateBind") RateBind->hardcodeValue(value);

	}
}


// Converts the model settings into a JSON string for use by javascript (not wrapped in { })
string Model::toJSON(){
	
	
	string JSON = "'id':'simpleBrownian','name':'Simple Brownian ratchet model',";
	
	JSON += "'allowBacktracking':" + string(this->allowBacktracking ? "true" : "false") + ",";
	JSON += "'allowHypertranslocation':" + string(this->allowHypertranslocation ? "true" : "false") + ",";
	JSON += "'allowInactivation':" + string(this->allowInactivation ? "true" : "false") + ",";
	JSON += "'allowBacktrackWithoutInactivation':" + string(this->allowBacktrackWithoutInactivation ? "true" : "false") + ",";
	JSON += "'deactivateUponMisincorporation':" + string(this->deactivateUponMisincorporation ? "true" : "false") + ",";
	JSON += "'allowGeometricCatalysis':" + string(this->allowGeometricCatalysis ? "true" : "false") + ",";
	JSON += "'allowmRNAfolding':" + string(this->allowmRNAfolding ? "true" : "false") + ",";
	JSON += "'allowMisincorporation':" + string(this->allowMisincorporation ? "true" : "false") + ",";
	JSON += "'useFourNTPconcentrations':" + string(this->useFourNTPconcentrations ? "true" : "false") + ",";
	JSON += "'NTPbindingNParams':" + to_string(this->NTPbindingNParams) + ",";
	JSON += "'currentTranslocationModel':'" + this->currentTranslocationModel + "',";
	JSON += "'assumeBindingEquilibrium':" + string(this->assumeBindingEquilibrium ? "true" : "false") + ",";
	JSON += "'assumeTranslocationEquilibrium':" + string(this->assumeTranslocationEquilibrium ? "true" : "false");
	
	return JSON;
	
}

void Model::print(){


	cout << "\n---Model" << this->id << "---" << endl;
	cout << "modelPrior = " << this->modelPrior << endl;
	//cout << "totalPrior = " << this->getLogPrior() << endl;
	cout << "allowBacktracking = " << this->allowBacktracking << endl;
	cout << "allowHypertranslocation = " << this->allowHypertranslocation << endl;
	cout << "allowInactivation = " << this->allowInactivation << endl;
	cout << "allowBacktrackWithoutInactivation = " << this->allowBacktrackWithoutInactivation << endl;
	cout << "deactivateUponMisincorporation = " << this->deactivateUponMisincorporation << endl;
	cout << "allowGeometricCatalysis = " << this->allowGeometricCatalysis << endl;
	cout << "allowmRNAfolding = " << this->allowmRNAfolding << endl;
	cout << "allowMisincorporation = " << this->allowMisincorporation << endl;
	cout << "useFourNTPconcentrations = " << this->useFourNTPconcentrations << endl;
	cout << "NTPbindingNParams = " << this->NTPbindingNParams << endl;
	cout << "currentTranslocationModel = " << this->currentTranslocationModel << endl;
	cout << "assumeBindingEquilibrium = " << this->assumeBindingEquilibrium << endl;
	cout << "assumeTranslocationEquilibrium = " << this->assumeTranslocationEquilibrium << endl;

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


Model* Model::set_allowBacktrackWithoutInactivation(bool val){
	this->allowBacktrackWithoutInactivation = val;
	return this;
}
bool Model::get_allowBacktrackWithoutInactivation(){
	return this->allowBacktrackWithoutInactivation;
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


Model* Model::set_currentTranslocationModel(string val){
	this->currentTranslocationModel = val;
	return this;
}
string Model::get_currentTranslocationModel(){
	return this->currentTranslocationModel;
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
