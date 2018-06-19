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


#include "GelLaneData.h"

#include <iostream>
#include <list>
#include <math.h> 
#include "Settings.h"


using namespace std;


GelLaneData::GelLaneData(int laneNum, double time, int nObs){


	this->laneNum = laneNum;
	this->time = time;
	this->transcriptLengths.resize(nObs);
	this->densities.resize(nObs);
	this->currentBandNum = 0;

}


void GelLaneData::addNewBand(double len, double den){
	
	if (currentBandNum < transcriptLengths.size()){
		this->transcriptLengths.at(currentBandNum) = len;
		this->densities.at(currentBandNum) = den;
		currentBandNum ++;
	}

}


string GelLaneData::toJSON(){

	//string JSON = "'lane" + this->laneNum + "':{";
	string JSON = "";
	JSON += "'t':" + to_string(this->time) + ",";


	// Iterate through lengths
	JSON += "'lengths':[";
	for (int i = 0; i < this->transcriptLengths.size(); i++){
		JSON += to_string(this->transcriptLengths.at(i)) + ",";
	}
	if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
	JSON += "],";


	// Iterate through densities
	JSON += "'densities':[";
	for (int i = 0; i < this->densities.size(); i++){
		JSON += to_string(this->densities.at(i)) + ",";
	}
	if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
	JSON += "]";

	// Return string
	//JSON += "}";
	return JSON;

}



double GelLaneData::get_time(){
	return this->time;
}



// Find the density which corresponds to this length. If cannot find then return 0 
double GelLaneData::get_densityAt(int len){
	for (int i = 0; i < this->densities.size(); i ++){
		if (this->transcriptLengths.at(i) == len) return this->densities.at(i);
	}
	return 0;
}
