
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



#include "ParameterHeatmapData.h"
#include "Settings.h"


#include <string>
#include <iostream>



using namespace std;


ParameterHeatmapData::ParameterHeatmapData(string id, string name){

	this->id = id;
	this->name = name;
	this->latexName = "";

}


ParameterHeatmapData::ParameterHeatmapData(string id, string name, string latexName){

	this->id = id;
	this->name = name;
	this->latexName = latexName;

}


// Adds a new value to the list
void ParameterHeatmapData::addValue(double val){
	this->values.push_back(val);
}


list<double> ParameterHeatmapData::getVals(){
	return this->values;
}

// Get the id
string ParameterHeatmapData::getID(){
	return this->id;
}


// Gets the id, name and all values of this object and returns as a JSON string
string ParameterHeatmapData::toJSON(){


	string JSON = "{'name':'" + this->name + "',";
	if (this->latexName != "") JSON += "'latexName':'" + this->latexName + "',";
	JSON += "'vals':[";

	for (list<double>::iterator it = this->values.begin(); it != this->values.end(); ++it){
		JSON += to_string(*it) + ",";
	}

	if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
	JSON += "]}";
	return JSON; 

}