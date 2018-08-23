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


#ifndef PARAMETER_H
#define PARAMETER_H

#include <string>
#include <string>
#include <iostream>
#include <random>
#include <map>

using namespace std;

class Parameter{

	string id;
	bool integer;
	string zeroTruncated;
	string distributionName;
	bool isHardcoded;
    double hardcodedVal;
    double val;
    bool hidden;
    string name;
    string title;
    string latexName;
    void init();

    bool hasMadeProposal;
    double valBeforeMakingProposal;
    double normalisationAdditiveTerm; // An (optional) number to add onto this parameter for normalisation. This will not affect the prior probability or proposal distribution 

    map<string, double> distributionParameters;

	random_device rd; 
    mt19937 generator{rd()};


    // Sometimes a parameter has multiple instances used by different models. In this case we store one parameter inside this parameter for each instance
	bool isMetaParameter; 
	vector<Parameter*> instances;
	int currentInstance;



    public:
    	Parameter(string id, bool integer, string zeroTruncated); // Parameter constructor
    	Parameter(string id, bool integer, string zeroTruncated, string name, string title);
    	Parameter(string id, bool integer, string zeroTruncated, string name, string title, string latexName);


    	string getID();
    	string getName();
    	string getLatexName();
    	double getVal(bool normalise); // Returns the effective value (being used for simulation purposes)
    	double getTrueVal(); // Returns the true underlying estimate of this parameter (used for MCMC purposes)
		void setVal(double val);
		void setPriorDistribution(string distributionName);
		void makeProposal();
		void acceptProposal();
		void rejectProposal();
		string getPriorDistributionName();
		Parameter* clone();
		void sample();
		void hardcodeValue(double value);
		void stopHardcoding();
		Parameter* setDistributionParameter(string name, double value);
		void print();
		double calculateLogPrior();
		string toJSON();
		string toJSON_compact();
		Parameter* hide();
		Parameter* show();

		void convertToMetaParameter(int ninstances); // Convert this parameter into an object which points to other parameter objects (one for each instance)
		Parameter* getParameterFromMetaParameter(int instanceNum);
		double getDistributionParameterValue(string name);
		void setParameterInstance(int instanceNum);
		int getNumberInstances();
		bool get_isMetaParameter();
		vector<Parameter*> getParameterInstances();

		void recomputeNormalisationTerms();

};




#endif

