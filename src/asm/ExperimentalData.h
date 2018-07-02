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


#ifndef EXPERIMENTALDATA_H
#define EXPERIMENTALDATA_H


#include "GelLaneData.h"

#include <string>
#include <vector>


using namespace std;

// Contains information on a set of experimental observations
class ExperimentalData{


	int id;
	void applySettings();
	string dataType;
	double ATPconc_local;
	double CTPconc_local;
	double GTPconc_local;
	double UTPconc_local;
	double force;
	string sequenceID; // Use a separate sequence for this dataset? Optional 

	int currentExperiment;
	vector<double> settingsX; // eg. forces, NTP concentrations, lengths
	vector<double> observationsY; // eg. velocity, densities
	vector<int> ntrials; // Number of simulations to perform per observation (optional) 

	vector<GelLaneData*> lanes; // For time gels only
	

	public:
		
		ExperimentalData(int id, string dataType, int nObs);

		bool reset(); // Changes the global settings to reflect the settings described by the first experiment in settingsX
		bool next(); // Moves on to the next experimental settings
		int getNTrials(); // Returns the number of trials to perform on the current observation (will return 0 if this has not been set)
		double getObservation(); // Return the current observation
		string getDataType();
		GelLaneData* getCurrentLane();
		void addTimeGelLane(int laneNum, double time, vector<double> densities, double rectTop, double rectLeft, double rectWidth, double rectHeight, double rectAngle, bool simulateLane);
		void addDatapoint(double setting, double observation);
		void addDatapoint(double setting, double observation, int n);
		void print();
		string toJSON();
		void clear();

		void set_ATPconc(double val);
		void set_CTPconc(double val);
		void set_GTPconc(double val);
		void set_UTPconc(double val);
		void set_force(double val);
		void set_sequenceID(string seqID);

		double get_ATPconc();
		double get_CTPconc();
		double get_GTPconc();
		double get_UTPconc();
		double get_force();
		

};




#endif
