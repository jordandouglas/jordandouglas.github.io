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


GelLaneData::GelLaneData(int laneNum, double time, vector<double> densities, double rectTop, double rectLeft, double rectWidth, double rectHeight, double rectAngle, bool simulateLane, double laneInterceptY){

	this->laneNum = laneNum;
	this->time = time;
	this->densities = densities;
	this->rectTop = rectTop;
	this->rectLeft = rectLeft;
	this->rectWidth = rectWidth;
	this->rectHeight = rectHeight;
	this->rectAngle = rectAngle;
	this->simulateLane = simulateLane;
	this->laneInterceptY = laneInterceptY;


}


int GelLaneData::getNumDensities(){
	return this->densities.size();
}

double GelLaneData::get_laneInterceptY(){
	return this->laneInterceptY;
}


string GelLaneData::toJSON(){

	//string JSON = "'lane" + this->laneNum + "':{";
	string JSON = "";
	JSON += "'laneNum':" + to_string(this->laneNum) + ",";
	JSON += "'time':" + to_string(this->time) + ",";

	// Rectangle coordinates
	JSON += "'rectTop':" + to_string(this->rectTop) + ",";
	JSON += "'rectLeft':" + to_string(this->rectLeft) + ",";
	JSON += "'rectWidth':" + to_string(this->rectWidth) + ",";
	JSON += "'rectHeight':" + to_string(this->rectHeight) + ",";
	JSON += "'rectAngle':" + to_string(this->rectAngle) + ",";


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


void GelLaneData::clear(){
	this->transcriptLengths.clear();
	this->densities.clear();
}


double GelLaneData::get_time(){
	return this->time;
}



// Find the density which corresponds to this pixel. If cannot find then return 0 
double GelLaneData::get_densityAt(int pos){
	if (pos < 0 || pos >= this->densities.size()) return 0;
	return this->densities.at(pos);
}
