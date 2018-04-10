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


#include "Polymerase.h"
#include "Settings.h"


#include <iostream>
#include <vector>
#include <list>
#include <string>


using namespace std;


Polymerase::Polymerase(string id, string name, string templateType, string nascentType){

	this->id = id;
	this->name = name;
	this->templateType = templateType;
	this->nascentType = nascentType;
	this->polymeraseParameters.resize(0);




}

void Polymerase::setModel(Model* model){
	this->polymeraseModel = model;
}

// Sets whole list of parameters to use by this polymerase
void Polymerase::setParameters(vector<Parameter*> params){
	this->polymeraseParameters = params;
}


// Sets a specified parameter for this polymerase
void Polymerase::setParameter(Parameter* param){

	for (int i = 0; i < this->polymeraseParameters.size(); i ++){
		if (this->polymeraseParameters.at(i)->getID() == param->getID()){
			Parameter* toReplace = polymeraseParameters.at(i);
			delete toReplace;
			this->polymeraseParameters.at(i) = param;
			return;
		}
	}


	// Parameter did not appear in list -> add to list
	this->polymeraseParameters.resize(this->polymeraseParameters.size() + 1);
	this->polymeraseParameters.at(polymeraseParameters.size()-1) = param;

}



// Returns a JSON string of this polymerase
string Polymerase::toJSON(){

	string JSON = "'" + this->id + "':{";
	JSON += "'name':'" + this->name + "',";
	JSON += "'templateType':'" + this->templateType + "',";
	JSON += "'nascentType':'" + this->nascentType + "'";
	JSON += "}";
	return JSON;

}


 // Use the parameters and model associated with this polymerase
void Polymerase::activatePolymerase() {

	Settings::setParameterList(this->polymeraseParameters);
	currentModel = this->polymeraseModel;
	Settings::sampleAll();

}


string Polymerase::getID(){
	return this->id;
}
