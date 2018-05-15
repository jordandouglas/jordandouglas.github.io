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


#ifndef PLOT_SETTINGS_H
#define PLOT_SETTINGS_H

#include "ParameterHeatmapData.h"

#include <string>
#include <list>
#include <vector>


using namespace std;

// This class stores the display settings of an individual plot used by the GUI
class PlotSettings{

	int plotNumber; // 1,2 and 3 control the 3 top plots. 4 is the large plot on the bottom
	string name; // Name of plot
	string plotFunction; // JS function to call to generate the plot
	string xRange;
	string yRange;
	string zRange;


	// Time histogram only
	string perTime;

	// Velocity histogram only
	double windowSize;

	// Long pause plot only
	string yAxis; 
	string pauseSiteYVariable;


	// Parameter heatmap only
	vector<int> sitesToRecord;
	string customParamX;
	string customParamY;
	string metricZ;
	string zColouring;
	bool plotFromPosterior;
	string xData;
	string yData;
	string zData;

	// Recording sites for parameter heatmap
	string sitesToRecordX;
	string sitesToRecordY;
	string sitesToRecordZ;
	ParameterHeatmapData* siteRecordingX;
	ParameterHeatmapData* siteRecordingY;
	ParameterHeatmapData* siteRecordingZ;
	vector<int> sitesToRecordX_vector;
	vector<int> sitesToRecordY_vector;
	vector<int> sitesToRecordZ_vector;
	double timeToCatalysisThisTrial_X;
	double timeToCatalysisThisTrial_Y;
	double timeToCatalysisThisTrial_Z;



	public:
		PlotSettings(int plotNumber, string name);
		void savePlotSettings(string plotSettingStr);
		string getName();
		string toJSON();
		string get_pauseSiteYVariable();
		void trialEnd();
		void updateHeatmapData(list<ParameterHeatmapData*> heatmapData);
		void recordSite(int siteThatWasJustCatalysed, double timeToCatalysis);
		void deleteSiteRecordings();


};

#endif

