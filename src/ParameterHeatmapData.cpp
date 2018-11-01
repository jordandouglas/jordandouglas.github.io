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
#include <algorithm>


using namespace std;


ParameterHeatmapData::ParameterHeatmapData(string id, string name){

	this->id = id;
	this->name = name;
	this->latexName = "";
	this->burninStartState = 0;
	this->needToRecalculateESS = false;
	this->ESS = 0;

}


ParameterHeatmapData::ParameterHeatmapData(string id, string name, string latexName){

	this->id = id;
	this->name = name;
	this->latexName = latexName;
	this->burninStartState = 0;
	this->needToRecalculateESS = false;
	this->ESS = 0;

}


// Adds a new value to the list
void ParameterHeatmapData::addValue(double val){
	this->values.push_back(val);
	this->needToRecalculateESS = true;
}

// Delete all values
void ParameterHeatmapData::deleteValues(){
	this->values.clear();
	this->needToRecalculateESS = true;
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



void ParameterHeatmapData::setBurnin(double burninStartState){
	if (this->burninStartState != burninStartState) {
		this->needToRecalculateESS = true;
		this->burninStartState = burninStartState;
	}
}


// Calculate the effective sample size. Modified from BEAST 2 code 
// https://github.com/CompEvol/beast2/blob/master/src/beast/core/util/ESS.java#L153
double ParameterHeatmapData::getESS(){

	if (!this->needToRecalculateESS) return this->ESS;
	this->needToRecalculateESS = false;

	//cout << "Computing ESS of " << this->name << " from burnin " << this->burninStartState << endl;


	const int MAX_LAG = 2000;
	double sum = 0.0;

	// Get values post-burnin
	list<double>::iterator firstValue = this->values.begin();
	if (this->burninStartState > 0) advance(firstValue, this->burninStartState);
	vector<double> trace{ firstValue, std::end(this->values) };


    /** keep track of sums of trace(i)*trace(i_+ lag) for all lags, excluding burn-in  **/
    double squareLaggedSums[MAX_LAG];
    double autoCorrelation[MAX_LAG];

    std::fill(squareLaggedSums, squareLaggedSums+sizeof(squareLaggedSums)/sizeof(double), 0);
    std::fill(autoCorrelation, autoCorrelation+sizeof(autoCorrelation)/sizeof(double), 0);

    for (int i = 0; i < trace.size(); i++) {
        sum += trace.at(i);
        // calculate mean
        double mean = sum / (i + 1);

        // calculate auto correlation for selected lag times
        // sum1 = \sum_{start ... totalSamples-lag-1} trace
        double sum1 = sum;
        // sum2 = \sum_{start+lag ... totalSamples-1} trace
        double sum2 = sum;
        for (int lagIndex = 0; lagIndex < std::min(i + 1, MAX_LAG); lagIndex++) {
            squareLaggedSums[lagIndex] = squareLaggedSums[lagIndex] + trace.at(i - lagIndex) * trace.at(i);

            autoCorrelation[lagIndex] = squareLaggedSums[lagIndex] - (sum1 + sum2) * mean + mean * mean * (i + 1 - lagIndex);
            autoCorrelation[lagIndex] /= (i + 1 - lagIndex);
            sum1 -= trace.at(i - lagIndex);
            sum2 -= trace.at(lagIndex);
        }
    }

    int trace_size = trace.size();
    int maxLag = std::min(trace_size, MAX_LAG);
    double integralOfACFunctionTimes2 = 0.0;
    for (int lagIndex = 0; lagIndex < maxLag; lagIndex++) {
        if (lagIndex == 0) {
            integralOfACFunctionTimes2 = autoCorrelation[0];
        }
        else if (lagIndex % 2 == 0) {
            if (autoCorrelation[lagIndex - 1] + autoCorrelation[lagIndex] > 0) {
                integralOfACFunctionTimes2 += 2.0 * (autoCorrelation[lagIndex - 1] + autoCorrelation[lagIndex]);
            }
            else { 
                break;
            }
        }
    }


    // Auto-correlation time
	double ACT = 1 * integralOfACFunctionTimes2 / autoCorrelation[0];



    //cout << "ESS = " << trace.size() / ACT << " ACT = " << ACT << endl;

    if (isnan(ACT)) this->ESS = 0;
	else this->ESS = trace.size() / ACT;


    // Clean up
    trace.clear();
	

	return this->ESS;
}