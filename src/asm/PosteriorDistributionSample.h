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

#include "SimulatorResultSummary.h"
#include "ExperimentalData.h"

#include <string>
#include <iostream>
#include <map>
#include <vector>

using namespace std;


// A single row in the log file
class PosteriorDistributionSample {


	bool ABC; // True if ABC, false if there is a likelihood
	int sampleNum;
	int currentObsNum;
	double chiSquared;
	double logPriorProb;
	double logLikelihood;
	double logPosterior;
	string modelIndicator;
	map<string, double> parameterEstimates;
	vector<double> simulatedValues; // eg. Velocities
	vector<vector<double>> simulatedDensities; 


    public:
    	PosteriorDistributionSample(int sampleNum, int numExperimentalObservations, bool ABC);
    	void setStateNumber(int sampleNum);
    	int getStateNumber();
    	PosteriorDistributionSample* clone(bool copySimulations);
    	void set_modelIndicator(string val);
    	string get_modelIndicator();
    	double get_chiSquared();
    	void set_logPriorProb(double val);
    	void set_logLikelihood(double val);
    	void set_logPosterior(double val);
    	double get_logPriorProb();
    	double get_logLikelihood();
    	double get_logPosterior();
    	void addParameterEstimate(string paramID, double val);
    	double getParameterEstimate(string paramID);
    	vector<string> getParameterNames();
    	//void addSimulatedAndObservedValue(double simVal, double obsVal);
    	void addSimulatedAndObservedValue(SimulatorResultSummary* simulated, ExperimentalData* observed);
    	void parseFromLogFileLine(vector<string> splitLine, vector<string> headerLineSplit);
    	bool isABC();
		
    	void print(bool toFile);
    	void printHeader(bool toFile);
    	string toJSON();
    	void loadFromLogFile(string filename);
    	void setParametersFromState();


};




#endif

