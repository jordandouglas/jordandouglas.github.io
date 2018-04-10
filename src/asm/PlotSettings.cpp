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


#include "PlotSettings.h"
#include "Settings.h"
#include "Plots.h"
#include "ParameterHeatmapData.h"



#include <string>
#include <iostream>



using namespace std;


// Initialise the settings of a plot with the default settings
PlotSettings::PlotSettings(int plotNumber, string name){

	this->plotNumber = plotNumber;
	this->name = name;


	// Distance vs time plot
	if (this->name == "distanceVsTime"){
		this->plotFunction = "plotTimeChart";
		this->xRange = "automaticX";
		this->yRange = "automaticY";
	}


	// Time histogram
	else if (this->name == "pauseHistogram"){
		this->plotFunction = "plot_pause_distribution";
		this->xRange = "automaticX";
		this->perTime = "perCatalysis";
	}


	// Velocity histogram
	else if (this->name == "velocityHistogram"){
		this->plotFunction = "plot_velocity_distribution";
		this->xRange = "automaticX";
		this->windowSize = 1;
	}


	// Pause time per site plot
	else if (this->name == "pauseSite"){
		this->plotFunction = "plot_time_vs_site";
		this->yAxis = "timePercentage";
	}


	// Parameter heatmap
	else if (this->name == "parameterHeatmap"){
		this->plotFunction = "plot_parameter_heatmap";
		this->xRange = "automaticX";
		this->yRange = "automaticY";
		this->zRange = "automaticZ";
		this->customParamX = "none";
		this->customParamY = "probability";
		this->metricZ = "none";
		this->zColouring = "blue";
		this->plotFromPosterior = false;
		this->xData = "";
		this->yData = "";
		this->zData = "";

	}


	else {
		cout << "Cannot find plot " << this->name << endl;

	}


}



// Returns the id of this plot type
string PlotSettings::getName(){
	return this->name;
}



// Send through a list of parameter/metric recordings and save as a string under x, y and zdata
void PlotSettings::updateHeatmapData(list<ParameterHeatmapData*> heatmapData){

	if (this->name != "parameterHeatmap") return;

	this->xData = "{}";
	this->yData = "{}";
	this->zData = "{}";

	// Cache the the data which we are interested in (in JSON format)
	for (list<ParameterHeatmapData*>::iterator it = heatmapData.begin(); it != heatmapData.end(); ++it){

		if ((*it)->getID() == this->customParamX) this->xData = (*it)->toJSON();
		if ((*it)->getID() == this->customParamY) this->yData = (*it)->toJSON();
		if ((*it)->getID() == this->metricZ) this->zData = (*it)->toJSON();

	}


}



// Converts these plot settings into a JSON
string PlotSettings::toJSON(){

	string settingsJSON = "'name':'" + this->name + "',";
	settingsJSON += "'plotFunction':'" + this->plotFunction + "',";


	if (this->name == "distanceVsTime"){
		settingsJSON += "'xRange':'" + this->xRange + "',";
		settingsJSON += "'yRange':'" + this->yRange + "',";
	}


	// Time histogram
	else if (this->name == "pauseHistogram"){
		settingsJSON += "'xRange':'" + this->xRange + "',";
		settingsJSON += "'perTime':'" + this->perTime + "',";
	}


	// Velocity histogram
	else if (this->name == "velocityHistogram"){
		settingsJSON += "'xRange':'" + this->xRange + "',";
		settingsJSON += "'windowSize':" + to_string(this->windowSize) + ",";
	}


	// Pause time per site plot
	else if (this->name == "pauseSite"){
		settingsJSON += "'yAxis':'" + this->yAxis + "',";
	}


	// Parameter heatmap
	else if (this->name == "parameterHeatmap"){
		settingsJSON += "'xRange':'" + this->xRange + "',";
		settingsJSON += "'yRange':'" + this->yRange + "',";
		settingsJSON += "'zRange':'" + this->zRange + "',";
		settingsJSON += "'customParamX':'" + this->customParamX + "',";
		settingsJSON += "'customParamY':'" + this->customParamY + "',";
		settingsJSON += "'metricZ':'" + this->metricZ + "',";
		settingsJSON += "'zColouring':'" + this->zColouring + "',";
		settingsJSON += "'plotFromPosterior':" + string(this->plotFromPosterior ? "true" : "false") + ",";
		settingsJSON += "'xData':" + this->xData + ",";
		settingsJSON += "'yData':" + this->yData + ",";
		settingsJSON += "'zData':" + this->zData + ",";



	

	}


	if (settingsJSON.substr(settingsJSON.length()-1, 1) == ",") settingsJSON = settingsJSON.substr(0, settingsJSON.length() - 1);

	return settingsJSON;

}






// Update the display settings for this plot. The settings are parsed as a string in format:
// str1|str2|a,b,c|str3...    where each element is a string which corresponds to a certain setting, or list elements are separated by a,b,c
void PlotSettings::savePlotSettings(string plotSettingStr){


	vector<string> values = Settings::split(plotSettingStr, '|'); 


	// Distance versus time plot
	if (this->name == "distanceVsTime"){


		if (values.at(0) == "automaticX") this->xRange = "automaticX";
		else{

			vector<string> tuple = Settings::split(values.at(0), ','); 



			// Do not accept negative values or non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->xRange = "automaticX";
			else{

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;


				if (xMax <= 0 || xMin < 0) this->xRange = "automaticX";
				else this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}

		}


		if (values.at(1) == "automaticY") this->yRange = "automaticY";
		else{

			vector<string> tuple = Settings::split(values.at(1), ','); 


			// Do not accept negative values or non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->yRange = "automaticY";
			else{

				int yMin = stoi(tuple.at(0));
				int yMax = stoi(tuple.at(1));
				if (yMax <= yMin) yMax = yMin + 1;


				// Do not accept negative values or non strings
				if (yMax <= 0 || yMin < 0) this->yRange = "automaticY";
				else this->yRange = "[" + to_string(yMin) + "," + to_string(yMax) + "]";
			}


		}


	}



	// Dwell time histogram
	else if (this->name == "pauseHistogram"){


		
		this->perTime = values.at(0);

		if (values.at(1) == "automaticX") this->xRange = "automaticX";
		else if (values.at(1) == "pauseX") this->xRange = "pauseX";
		else if (values.at(1) == "shortPauseX") this->xRange = "shortPauseX";
		else{ // Parse range of values

			vector<string> tuple = Settings::split(values.at(1), ','); 

			// Do not accept negative values or non strings
			if (! (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) ) {

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;

				if (! (xMax <= 0 || xMin < 0)) this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}

		}



	}



	// Velocity histogram
	else if (this->name == "velocityHistogram"){


		// Window size. Do not accept negative or nonnumbers
		if (Settings::strIsNumber(values.at(0)) && stod(values.at(0)) > 0) this->windowSize = stod(values.at(0));



		if (values.at(1) == "automaticX") this->xRange = "automaticX";
		else{ // Parse range of values

			vector<string> tuple = Settings::split(values.at(1), ','); 

			// Do not accept negative values or non strings
			if (! (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) ) {

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;

				if (! (xMax <= 0 || xMin < 0)) this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}

		}


	}




	// Pause time per site plot
	else if (this->name == "pauseSite"){
		this->yAxis = values.at(0);
	}




	// Parameter heatmap
	else if (this->name == "parameterHeatmap"){


		// Values at indices 0, 1 and 2 are the variable ids for the x, y and z axes
		this->customParamX = values.at(0);
		this->customParamY = values.at(1);
		this->metricZ = values.at(2);



		// X axis range at index 3
		if (values.at(3) == "automaticX") this->xRange = "automaticX";
		else{

			vector<string> tuple = Settings::split(values.at(3), ','); 


			// Do not accept negative values or non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->xRange = "automaticX";
			else{

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;


				if (xMax <= 0 || xMin < 0) this->xRange = "automaticX";
				else this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}

		}


		// Y axis range at index 4
		if (values.at(4) == "automaticY") this->yRange = "automaticY";
		else{

			vector<string> tuple = Settings::split(values.at(4), ','); 


			// Do not accept negative values or non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->yRange = "automaticY";
			else{

				double yMin = stod(tuple.at(0));
				double yMax = stod(tuple.at(1));
				if (yMax <= yMin) yMax = yMin + 0.1;


				if (yMax <= 0 || yMin < 0) this->yRange = "automaticY";
				else this->yRange = "[" + to_string(yMin) + "," + to_string(yMax) + "]";
			}

		}


		// Z axis range at index 5
		if (values.at(5) == "automaticZ") this->zRange = "automaticZ";
		else{

			vector<string> tuple = Settings::split(values.at(5), ','); 


			// Do not accept negative values or non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->zRange = "automaticZ";
			else{

				double zMin = stod(tuple.at(0));
				double zMax = stod(tuple.at(1));
				if (zMax <= zMin) zMax = zMin + 0.1;


				if (zMax <= 0 || zMin < 0) this->zRange = "automaticZ";
				else this->zRange = "[" + to_string(zMin) + "," + to_string(zMax) + "]";
			}

		}
		



		// Value at index 6 is the colour
		this->zColouring = values.at(6);

		// Value at index 7 is whether or not to plot from the posterior distribution
		this->plotFromPosterior = values.at(7) == "true";



		// TODO If sample from posterior use the correct points 
		/*
		if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"]){
			var valuesX = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamX"]);
			var valuesY = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamY"]);
			var valuesZ = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["metricZ"]);
			if (valuesX != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["name"], latexName:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["latexName"], vals:valuesX};
			if (valuesY != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["name"], latexName:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["latexName"], vals:valuesY};
			if (valuesZ != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"]["name"], latexName:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"]["latexName"], vals:valuesZ};
		}
		*/
	


	}



}