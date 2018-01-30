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

	int currentExperiment;
	vector<double> settingsX; // eg. forces, NTP concentrations
	vector<double> observationsY; // eg. velocity

	public:
		
		ExperimentalData(int id, string dataType, int nObs);

		bool reset(); // Changes the global settings to reflect the settings described by the first experiment in settingsX
		bool next(); // Moves on to the next experimental settings
		double getObservation(); // Return the current observation
		void addDatapoint(double setting, double observation);
		void print();


		void set_ATPconc(double val);
		void set_CTPconc(double val);
		void set_GTPconc(double val);
		void set_UTPconc(double val);
		void set_force(double val);

		double get_ATPconc();
		double get_CTPconc();
		double get_GTPconc();
		double get_UTPconc();
		double get_force();
		

};




#endif
