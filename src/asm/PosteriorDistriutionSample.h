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


#ifndef POSTERIOR_DISTRIBUTION_SAMPLE_H
#define POSTERIOR_DISTRIBUTION_SAMPLE_H

#include <string>
#include <iostream>
#include <map>
#include <vector>

using namespace std;


// A single row in the log file
class PosteriorDistriutionSample {

	
	int sampleNum;
	int currentObsNum;
	double chiSquared;
	double priorProb;
	string modelIndicator;
	map<string, double> parameterEstimates;
	vector<double> simulatedValues; // eg. velocities


    public:
    	PosteriorDistriutionSample(int sampleNum);
    	void setStateNumber(int sampleNum);
    	void set_modelIndicator(string val);
    	string get_modelIndicator();
    	double get_chiSquared();
    	void set_logPriorProb(double val);
    	double get_logPriorProb();
    	void addParameterEstimate(string paramID, double val);
    	void addSimulatedAndObservedValue(double simVal, double obsVal);
		
    	void print(bool toFile);
    	void printHeader(bool toFile);


};




#endif

