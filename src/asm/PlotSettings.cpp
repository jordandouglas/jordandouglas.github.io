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
#include "MCMC.h"


#include <string>
#include <iostream>



using namespace std;


// Initialise the settings of a plot with the default settings
PlotSettings::PlotSettings(int plotNumber, string name){

	this->plotNumber = plotNumber;
	this->name = name;
	this->selectedPosteriorID = -1;

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


	// Dwell time per site plot
	else if (this->name == "pauseSite"){
		this->pauseSiteYVariable = "catalysisTimes";
		this->plotFunction = "plot_time_vs_site";
		this->yAxis = "timeSeconds";
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
		this->xData = "{}";
		this->yData = "{}";
		this->zData = "{}";
		this->sitesToRecordX = "allSites";
		this->sitesToRecordY = "allSites";
		this->sitesToRecordZ = "allSites";
		this->timeToCatalysisThisTrial_X = 0;
		this->timeToCatalysisThisTrial_Y = 0;
		this->timeToCatalysisThisTrial_Z = 0;
		this->sitesToRecordX_vector.resize(0);
		this->sitesToRecordY_vector.resize(0);
		this->sitesToRecordZ_vector.resize(0);
		this->siteRecordingX = nullptr;
		this->siteRecordingY = nullptr;
		this->siteRecordingZ = nullptr;
		this->priorUnderlay = false;

	}


	// MCMC trace
	else if (this->name == "tracePlot"){
		this->plotFunction = "plot_MCMC_trace";
		this->customParamY = "chiSq";
		this->xRange = "automaticX";
		this->yRange = "automaticY";
		this->xData = "{}"; // State number
		this->yData = "{}"; // Custom Y variable
		this->ESS = 0;
		this->selectedPosteriorID = 0;
        this->exponentialDecay = false;
	}



	else {
		if (this->name != "none") cout << "Cannot find plot " << this->name << endl;

	}


}



// Returns the id of this plot type
string PlotSettings::getName(){
	return this->name;
}


string PlotSettings::get_pauseSiteYVariable(){
	return this->pauseSiteYVariable;
}



// Send through the current site and the time to catalysis at that site
// This object will determine whether or not to store that number
void PlotSettings::recordSite(int siteThatWasJustCatalysed, double timeToCatalysis){


	// If this is not a heatmap displaying a catalysis time then this function is not applicable
	if (this->name != "parameterHeatmap") return;


	// Check if the site is on any of the recording lists
	if (this->customParamX == "catalyTime" && this->sitesToRecordX != "allSites"){
		for (int i = 0; i < this->sitesToRecordX_vector.size(); i ++){
			if (siteThatWasJustCatalysed == this->sitesToRecordX_vector.at(i)){
				//cout << "X Recording site " << siteThatWasJustCatalysed << " time " << timeToCatalysis << endl;
				this->timeToCatalysisThisTrial_X += timeToCatalysis;
				break;
			} 
		}
	}

	if (this->customParamY == "catalyTime" && this->sitesToRecordY != "allSites"){
		for (int i = 0; i < this->sitesToRecordY_vector.size(); i ++){
			if (siteThatWasJustCatalysed == this->sitesToRecordY_vector.at(i)){
				//cout << "Y Recording site " << siteThatWasJustCatalysed << " time " << timeToCatalysis << endl;
				this->timeToCatalysisThisTrial_Y += timeToCatalysis;
				break;
			} 
		}
	}

	if (this->metricZ == "catalyTime" && this->sitesToRecordZ != "allSites"){
		for (int i = 0; i < this->sitesToRecordZ_vector.size(); i ++){
			if (siteThatWasJustCatalysed == this->sitesToRecordZ_vector.at(i)){
				//cout << "Z Recording site " << siteThatWasJustCatalysed << " time " << timeToCatalysis << endl;
				this->timeToCatalysisThisTrial_Z += timeToCatalysis;
				break;
			} 
		}
	}


}


// Delete all site recording information
void PlotSettings::deleteSiteRecordings(){

	if (this->name != "parameterHeatmap") return;


	if (this->siteRecordingX || this->siteRecordingX != nullptr) this->siteRecordingX->deleteValues();
	if (this->siteRecordingY || this->siteRecordingY != nullptr) this->siteRecordingY->deleteValues();
	if (this->siteRecordingZ || this->siteRecordingZ != nullptr) this->siteRecordingZ->deleteValues();

	this->timeToCatalysisThisTrial_X = 0;
	this->timeToCatalysisThisTrial_Y = 0;
	this->timeToCatalysisThisTrial_Z = 0;


}


// Called whenever a trial is ended and the parameter heatmap data is being updated
void PlotSettings::trialEnd(){

	if (this->name != "parameterHeatmap") return;

	// Inform the X, Y, and Z site recordings that the simulation has finished and therefore send through the mean site-specific catalysis times
	if (this->customParamX == "catalyTime" && this->sitesToRecordX != "allSites"){
		this->siteRecordingX->addValue(this->timeToCatalysisThisTrial_X / this->sitesToRecordX_vector.size());
	}

	if (this->customParamY == "catalyTime" && this->sitesToRecordY != "allSites"){
		this->siteRecordingY->addValue(this->timeToCatalysisThisTrial_Y / this->sitesToRecordY_vector.size());
	}

	if (this->metricZ == "catalyTime" && this->sitesToRecordZ != "allSites"){
		this->siteRecordingZ->addValue(this->timeToCatalysisThisTrial_Z / this->sitesToRecordZ_vector.size());
	}

	this->timeToCatalysisThisTrial_X = 0;
	this->timeToCatalysisThisTrial_Y = 0;
	this->timeToCatalysisThisTrial_Z = 0;

}





// Send through a list of parameter/metric recordings and save as a string under x, y and zdata
void PlotSettings::updateHeatmapData(list<ParameterHeatmapData*> heatmapData){


	// If parameter heatmap then save upto all 3 variables 
	if (this->name == "parameterHeatmap") {



		this->xData = "{}";
		this->yData = "{}";
		this->zData = "{}";

		// Cache the the data which we are interested in (in JSON format)
		for (list<ParameterHeatmapData*>::iterator it = heatmapData.begin(); it != heatmapData.end(); ++it){

			if ((*it)->getID() == this->customParamX) this->xData = (*it)->toJSON();
			if ((*it)->getID() == this->customParamY) this->yData = (*it)->toJSON();
			if ((*it)->getID() == this->metricZ) this->zData = (*it)->toJSON();

		}


		// Overwrite the above if the parameter is catalysis time and is set to recording specified sites 
		if (this->customParamX == "catalyTime" && this->sitesToRecordX != "allSites") this->xData = this->siteRecordingX->toJSON();
		if (this->customParamY == "catalyTime" && this->sitesToRecordY != "allSites") this->yData = this->siteRecordingY->toJSON();
		if (this->metricZ == "catalyTime" && this->sitesToRecordZ != "allSites") this->zData = this->siteRecordingZ->toJSON();

	}


	// If MCMC trace then save just the state number and y variable
	else if (this->name == "tracePlot") {

		this->xData = "{}";
		this->yData = "{}";


		// Cache the the data which we are interested in (in JSON format)
		for (list<ParameterHeatmapData*>::iterator it = heatmapData.begin(); it != heatmapData.end(); ++it){
			if ((*it)->getID() == "state") this->xData = (*it)->toJSON();
			if ((*it)->getID() == this->customParamY) {
				this->yData = (*it)->toJSON();

				// Calculate the effective sample size
				(*it)->setBurnin( burnin < 0 ? MCMC::get_nStatesUntilBurnin() : floor(burnin / 100 * _GUI_posterior.size()) );
				this->ESS = (*it)->getESS();
			}
		}





	}


}



// Converts these plot settings into a JSON
string PlotSettings::toJSON(){


	string settingsJSON = "'name':'" + this->name + "'";
	if (this->name == "none") return settingsJSON;

	settingsJSON += ",'plotFunction':'" + this->plotFunction + "',";


	if (this->name == "distanceVsTime"){
		settingsJSON += "'xRange':'" + this->xRange + "',";
		settingsJSON += "'yRange':'" + this->yRange + "',";
	}


	// Time histogram
	else if (this->name == "pauseHistogram"){
        settingsJSON += "'perTime':'" + this->perTime + "',";
		settingsJSON += "'xRange':'" + this->xRange + "',";
	}


	// Velocity histogram
	else if (this->name == "velocityHistogram"){
        settingsJSON += "'windowSize':" + to_string(this->windowSize) + ",";
		settingsJSON += "'xRange':'" + this->xRange + "',";
		
	}


	// Dwell time per site plot
	else if (this->name == "pauseSite"){
		settingsJSON += "'yAxis':'" + this->yAxis + "',";
		settingsJSON += "'pauseSiteYVariable':'" + this->pauseSiteYVariable + "',";
	}




	// Parameter heatmap
	else if (this->name == "parameterHeatmap"){
        settingsJSON += "'customParamX':'" + this->customParamX + "',"; //0
        settingsJSON += "'customParamY':'" + this->customParamY + "',"; // 1
        settingsJSON += "'metricZ':'" + this->metricZ + "',"; // 2
		settingsJSON += "'xRange':'" + this->xRange + "',"; // 3
		settingsJSON += "'yRange':'" + this->yRange + "',"; // 4
		settingsJSON += "'zRange':'" + this->zRange + "',"; // 5
		settingsJSON += "'zColouring':'" + this->zColouring + "',"; // 6
        settingsJSON += "'selectedPosteriorID':" + to_string(this->selectedPosteriorID) + ","; // 7
        settingsJSON += "'sitesToRecordX':'" + this->sitesToRecordX + "',"; // 8
        settingsJSON += "'sitesToRecordY':'" + this->sitesToRecordY + "',"; // 9
        settingsJSON += "'sitesToRecordZ':'" + this->sitesToRecordZ + "',"; // 10
		settingsJSON += "'priorUnderlay':" + string(this->priorUnderlay ? "true" : "false") + ","; // 11
        
		settingsJSON += "'xData':" + this->xData + ",";
		settingsJSON += "'yData':" + this->yData + ",";
		settingsJSON += "'zData':" + this->zData + ",";
		
		if (this->selectedPosteriorID == 0) settingsJSON += "'burnin':" + to_string( burnin < 0 ? MCMC::get_nStatesUntilBurnin() : floor(burnin / 100 * _GUI_posterior.size()) ) + ",";
		

	}

	// MCMC trace
	else if (this->name == "tracePlot"){
		settingsJSON += "'customParamY':'" + this->customParamY + "',";
		settingsJSON += "'xRange':'" + this->xRange + "',";
		settingsJSON += "'yRange':'" + this->yRange + "',";
		settingsJSON += "'xData':" + this->xData + ",";
		settingsJSON += "'yData':" + this->yData + ",";
		settingsJSON += "'burnin':" + to_string( burnin < 0 ? MCMC::get_nStatesUntilBurnin() : floor(burnin / 100 * _GUI_posterior.size()) ) + ",";
		settingsJSON += "'ESS':" + to_string(this->ESS) + ",";
		settingsJSON += "'selectedPosteriorID':" + to_string(this->selectedPosteriorID) + ",";
        settingsJSON += "'exponentialDecay':" + string(this->exponentialDecay ? "true" : "false") + ",";
        

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

			tuple.clear();

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

			tuple.clear();


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

			tuple.clear();

		}



	}



	// Velocity histogram
	else if (this->name == "velocityHistogram"){


		// Window size. Do not accept negative or nonnumbers
		if (Settings::strIsNumber(values.at(0)) && stod(values.at(0)) > 0) this->windowSize = stod(values.at(0));



		if (values.at(1) == "automaticX") this->xRange = "automaticX";
		else{ // Parse range of values

			vector<string> tuple = Settings::split(values.at(1), ','); 

			// Do not accept non strings
			if (! (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) ) {

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;

				this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}


			tuple.clear();

		}


	}




	// Dwell time per site plot
	else if (this->name == "pauseSite"){
		this->yAxis = values.at(0);
		this->pauseSiteYVariable = values.at(1);
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


			// Do not accept non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->xRange = "automaticX";
			else{

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;


				this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}


			tuple.clear();

		}


		// Y axis range at index 4
		if (values.at(4) == "automaticY") this->yRange = "automaticY";
		else{

			vector<string> tuple = Settings::split(values.at(4), ','); 


			// Do not accept non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->yRange = "automaticY";
			else{

				double yMin = stod(tuple.at(0));
				double yMax = stod(tuple.at(1));
				if (yMax <= yMin) yMax = yMin + 0.1;


				this->yRange = "[" + to_string(yMin) + "," + to_string(yMax) + "]";
			}


			tuple.clear();

		}


		// Z axis range at index 5
		if (values.at(5) == "automaticZ") this->zRange = "automaticZ";
		else{

			vector<string> tuple = Settings::split(values.at(5), ','); 


			// Do not accept non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->zRange = "automaticZ";
			else{

				double zMin = stod(tuple.at(0));
				double zMax = stod(tuple.at(1));
				if (zMax <= zMin) zMax = zMin + 0.1;

				this->zRange = "[" + to_string(zMin) + "," + to_string(zMax) + "]";
			}

		}
		



		// Value at index 6 is the colour
		this->zColouring = values.at(6);

		// Value at index 7 is the posterior distribution id to plot from
		this->selectedPosteriorID = stoi(values.at(7));



		// Values at index 8, 9 and 10 are site specific constraints for each variable
		// Store the actual sites in vectors but still keep the strings as these are periodically returned to the view
		if (this->sitesToRecordX != values.at(8)){
			this->sitesToRecordX = values.at(8);
			if (this->sitesToRecordX == "") this->sitesToRecordX = "allSites";
			this->sitesToRecordX_vector.clear();
			if (this->siteRecordingX || this->siteRecordingX != nullptr) delete this->siteRecordingX;
			if (this->sitesToRecordX != "allSites") {
				this->sitesToRecordX_vector = Settings::split_int(this->sitesToRecordX, ','); 
				this->siteRecordingX = new ParameterHeatmapData("catalyTime", "Mean cat. time at sites (s)");
			}
		}


		if (this->sitesToRecordY != values.at(9)){
			this->sitesToRecordY = values.at(9);
			if (this->sitesToRecordY == "") this->sitesToRecordY = "allSites";
			this->sitesToRecordY_vector.clear();
			if (this->siteRecordingY || this->siteRecordingY != nullptr) delete this->siteRecordingY;
			if (this->sitesToRecordY != "allSites") {
				this->sitesToRecordY_vector = Settings::split_int(this->sitesToRecordY, ','); 
				this->siteRecordingY = new ParameterHeatmapData("catalyTime", "Mean cat. time at sites (s)");
			}
		}


		if (this->sitesToRecordZ != values.at(10)){
			this->sitesToRecordZ = values.at(10);
			if (this->sitesToRecordZ == "") this->sitesToRecordZ = "allSites";
			this->sitesToRecordZ_vector.clear();
			if (this->siteRecordingZ || this->siteRecordingZ != nullptr) delete this->siteRecordingZ;
			if (this->sitesToRecordZ != "allSites") {
				this->sitesToRecordZ_vector = Settings::split_int(this->sitesToRecordZ, ','); 
				this->siteRecordingZ = new ParameterHeatmapData("catalyTime", "Mean cat. time at sites (s)");
			}
		}


		//cout << "values.at(11) " << values.at(11) << endl;
		this->priorUnderlay = values.at(11) == "true";





	}



	// MCMC trace
	else if (this->name == "tracePlot"){

		// Y axis value
		this->customParamY = values.at(0);



		// X axis range at index 1
		if (values.at(1) == "automaticX") this->xRange = "automaticX";
		else{

			vector<string> tuple = Settings::split(values.at(1), ','); 


			// Do not accept negative values or non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->xRange = "automaticX";
			else{

				double xMin = stod(tuple.at(0));
				double xMax = stod(tuple.at(1));
				if (xMax <= xMin) xMax = xMin + 0.1;


				if (! (xMax < 0 || xMin < 0)) this->xRange = "[" + to_string(xMin) + "," + to_string(xMax) + "]";
			}

			tuple.clear();

		}


		// Y axis range at index 2
		if (values.at(2) == "automaticY") this->yRange = "automaticY";
		else{

			vector<string> tuple = Settings::split(values.at(2), ','); 


			// Do not accept non strings
			if (tuple.size() < 2 || !Settings::strIsNumber(tuple.at(0)) || !Settings::strIsNumber(tuple.at(1))) this->yRange = "automaticY";
			else{

				double yMin = stod(tuple.at(0));
				double yMax = stod(tuple.at(1));
				if (yMax <= yMin) yMax = yMin + 0.1;


				this->yRange = "[" + to_string(yMin) + "," + to_string(yMax) + "]";
			}


			tuple.clear();

		}
        
        
        // Show the exponential decay?
        this->exponentialDecay = values.at(3) == "true";


	}

	values.clear();

}


bool PlotSettings::get_plotFromPosterior(){
	return this->selectedPosteriorID >= 0;
}



void PlotSettings::setPosteriorDistributionID(int id, string yAxisVariable){


	if (this->name != "tracePlot" || id >= 0) this->selectedPosteriorID = id;
	if (this->name == "tracePlot") this->customParamY = yAxisVariable;

}

int PlotSettings::getPosteriorDistributionID(){
	return this->selectedPosteriorID;
}

