
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


#ifndef PARAMETER_HEATMAP_DATA_H
#define PARAMETER_HEATMAP_DATA_H



#include <string>
#include <list>
#include <vector>

using namespace std;

// This class stores the recorded data per trial of a given parameter or metric
class ParameterHeatmapData{

	string id; // id of plot
	string name; // Name to display on axis label
	string latexName; // If this is provided then will try to render this in latex math notation instead of the name
	list<double> values; // Values (one number for each trial)
	double burninStartState;
	bool needToRecalculateESS;
	double ESS;


	public:
		ParameterHeatmapData(string id, string name);
		ParameterHeatmapData(string id, string name, string latexName);
		void addValue(double val);
		void deleteValues();
		string getID();
		string toJSON();
		list<double> getVals();


		void setBurnin(double burninStartState);
		double getESS();



};

#endif

