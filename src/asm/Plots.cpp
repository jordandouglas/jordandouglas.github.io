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



#include "Settings.h"
#include "Plots.h"
#include "State.h"


#include <string>
#include <iostream>



using namespace std;




// Distance versus time plot data (and velocity histogram data)
int Plots::currentSimNumber = 0;
int Plots::distanceVsTimeSize = 0;
int const Plots::distanceVsTimeSizeMax = 1e7;
list<list<vector<double>>> Plots::distanceVsTimeData; // Position of the polymerase over all time
list<list<vector<double>>> Plots::distanceVsTimeDataUnsent; // Data which has not yet been sent to the DOM (subset of distanceVsTimeData)
vector<int> Plots::distancesTravelledOnEachTemplate(0); // Sorted list of distances travelled. Sorted so that it is easy to calculate the median
vector<double> Plots::timesSpentOnEachTemplate(0); // Sorted list of times taken per template. Sorted so that it is easy to calculate the median




// Catalysis time histogram
int Plots::catalysisTimesSize = 0;
int const Plots::catalysisTimesSizeMax = 1e6;
list<list<double>> Plots::catalysisTimes;
list<list<double>> Plots::catalysisTimesUnsent;
list<double> Plots::catalysisTimesThisTrial;


// Pause time per site
int Plots::npauseSimulations = 0;
vector<double> Plots::pauseTimePerSite;



// Parameter heatmap data
list<ParameterHeatmapData*> Plots::parametersPlotData;


// Copied sequences (only the ones that have not been sent to the controller)
list<string> Plots::unsentCopiedSequences;



// Miscellaneous information
double Plots::timeElapsed = 0;
double Plots::velocity = 0;
int Plots::totalDisplacement = 0;
double Plots::totaltimeElapsed = 0;
double Plots::totaltimeElapsedThisTrial = 0;
bool Plots::plotsAreHidden = false;
bool Plots::arrestTimeoutReached = false;
double Plots::timeWaitedUntilNextTranslocation = 0;
double Plots::timeWaitedUntilNextCatalysis = 0;


// Plot display settings
vector<PlotSettings*> Plots::plotSettings(4);





// Must call this function when the sequence changes
void Plots::init(){

	Plots::currentSimNumber = 0;


	// Distance versus time plot data
	Plots::distanceVsTimeSize = 2;
	Plots::distanceVsTimeData.clear();
	distanceVsTimeDataUnsent.clear();
	Plots::distancesTravelledOnEachTemplate.clear();
	Plots::timesSpentOnEachTemplate.clear();




	// Catalysis time histogram
	Plots::catalysisTimesSize = 0;


	// Pause time per site plot
	Plots::npauseSimulations = 0;
	Plots::pauseTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
	for (int baseNum = 0; baseNum < Plots::pauseTimePerSite.size(); baseNum ++) {
		Plots::pauseTimePerSite.at(baseNum) = 0.0;
	}


	// Parameter heatmap data. Need to add recorded metrics as well as the values of the parameters
	Plots::parametersPlotData.clear();
	Plots::parametersPlotData.push_back(new ParameterHeatmapData("probability", "Probability density"));
	Plots::parametersPlotData.push_back(new ParameterHeatmapData("velocity", "Mean velocity (bp/s)"));
	Plots::parametersPlotData.push_back(new ParameterHeatmapData("catalyTime", "Mean catalysis time (s)"));
	Plots::parametersPlotData.push_back(new ParameterHeatmapData("totalTime", "Total transcription time (s)"));
	Plots::parametersPlotData.push_back(new ParameterHeatmapData("nascentLen", "Final nascent length (nt)"));
	Plots::parametersPlotData.push_back(new ParameterHeatmapData("logLikelihood", "Chi-squared test statistic", "X^2"));

	// Add all parameters to the list
	for (int i = 0; i < Settings::paramList.size(); i ++){
		Plots::parametersPlotData.push_back(new ParameterHeatmapData(Settings::paramList.at(i)->getID(), Settings::paramList.at(i)->getName()));
	}


	// Copied sequences
	Plots::unsentCopiedSequences.clear();

	// Miscellaneous information
	Plots::totalDisplacement = 0;
	Plots::totaltimeElapsed = 0;
	Plots::totaltimeElapsedThisTrial = 0;
	Plots::velocity = 0;



	// Prepare for first simulation
	Plots::refreshPlotData(_currentStateGUI);


}




// Start new simulation
void Plots::refreshPlotData(State* state){


	Plots::currentSimNumber ++;


	// Start new distance vs time entry
	if (Plots::distanceVsTimeSize < Plots::distanceVsTimeSizeMax){
		Plots::distanceVsTimeSize += 2;


		// Initial distance and time for this simulation
		int rightHybridBase = state->getRightBaseNumber();
	
		vector<double> distanceTime(3);
		distanceTime.at(0) = rightHybridBase; // Distance (nt)
		distanceTime.at(1) = 0; // Time (s)
		distanceTime.at(2) = Plots::currentSimNumber; // Current simulation number stored in first double* of each simulation


		// List for this simulation only
		list<vector<double>> distanceTimeThisSimulation;
		distanceTimeThisSimulation.push_back(distanceTime);

		// List of all simulations
		//Plots::distanceVsTimeData.push_back(distanceTimeThisSimulation);
 		Plots::distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);

	}


	// Catalysis time data
	Plots::catalysisTimesThisTrial.clear();
	if (Plots::catalysisTimesSize < Plots::catalysisTimesSizeMax){
		Plots::catalysisTimesSize ++;

		list<double> catalysisTimesTrial;
		catalysisTimesTrial.push_back(Plots::currentSimNumber * 1.0); // First element is the simulation number 
		Plots::catalysisTimes.push_back(catalysisTimesTrial);
		Plots::catalysisTimesUnsent.push_back(catalysisTimesTrial);

	}


	// Pause time per site plot
	Plots::npauseSimulations ++;


	// Miscellaneous information
	Plots::arrestTimeoutReached = false;
	Plots::totaltimeElapsedThisTrial = 0;
	Plots::timeElapsed = 0;
	Plots::timeWaitedUntilNextTranslocation = 0;
	Plots::timeWaitedUntilNextCatalysis = 0;



}




// At the end of every simulation update the parameter plot data
void Plots::updateParameterPlotData(State* state){
	


	if (Plots::catalysisTimesThisTrial.size() == 0) return; 
	if (Plots::totaltimeElapsedThisTrial == 0) return;



	int increaseInPrimerLength = state->get_nascentLength() - (hybridLen->getVal() + bubbleLeft->getVal() + 2);
	double velocity_thisTrial = increaseInPrimerLength / Plots::totaltimeElapsedThisTrial;
	double meanDwellTime_thisTrial = Plots::totaltimeElapsedThisTrial / Plots::catalysisTimesThisTrial.size();


	// Record the total time taken to copy this template and the distance travelled
	if (Plots::distanceVsTimeSize < Plots::distanceVsTimeSizeMax){
		Settings::sortedPush(Plots::distancesTravelledOnEachTemplate, state->getRightTemplateBaseNumber());
		Settings::sortedPush(Plots::timesSpentOnEachTemplate, Plots::totaltimeElapsedThisTrial);
	}



	for (list<ParameterHeatmapData*>::iterator it = Plots::parametersPlotData.begin(); it != Plots::parametersPlotData.end(); ++it){

		// Update metric 
		if ((*it)->getID() == "velocity") (*it)->addValue(velocity_thisTrial);
		else if ((*it)->getID() == "totalTime") (*it)->addValue(Plots::totaltimeElapsedThisTrial);
		else if ((*it)->getID() == "catalyTime") (*it)->addValue(meanDwellTime_thisTrial);
		else if ((*it)->getID() == "nascentLen") (*it)->addValue(state->get_nascentLength());


		// Add a new value for this parameter
		else for (int i = 0; i < Settings::paramList.size(); i ++){
			if ((*it)->getID() == Settings::paramList.at(i)->getID()){
				(*it)->addValue(Settings::paramList.at(i)->getVal());
				break;
			}
		}

	}

}



void Plots::updatePlotData(State* state, int* actionsToDo, double reactionTime) {


	int rightHybridBase = state->getRightBaseNumber();
	int numActions = sizeof(actionsToDo) / sizeof(actionsToDo[0]);
	int lastAction = actionsToDo[numActions-1]; // The last element in the list was a kinetic action. 
												// Reactions before it were all equilibrium ones

	Plots::totaltimeElapsed += reactionTime;
	Plots::timeWaitedUntilNextTranslocation += reactionTime;
	Plots::timeWaitedUntilNextCatalysis += reactionTime;
	Plots::totaltimeElapsedThisTrial += reactionTime;


	//cout << "reactionTime " << reactionTime << endl;

	//cout << "timeWaitedUntilNextTranslocation " << Plots::timeWaitedUntilNextTranslocation << endl;


	// If there has been a translocation action, add it to the distance~time chart, and update the time spent at this site
	bool thereWasATranslocation = false;
	for (int i = 0; i < numActions; i ++) {
		thereWasATranslocation = thereWasATranslocation || actionsToDo[i] == 0 || actionsToDo[i] == 1;
		if (actionsToDo[i] == 0) Plots::totalDisplacement--;
		if (actionsToDo[i] == 1) Plots::totalDisplacement++;
	}
	//cout << endl;

	if (thereWasATranslocation) {

		//cout << "Updating plot data " << reactionTime << ", " << rightHybridBase << " state->getRightBaseNumber() " << state->getRightBaseNumber() << " state->get_mRNAPosInActiveSite() " << state->get_mRNAPosInActiveSite() << endl;
		if (Plots::distanceVsTimeSize < Plots::distanceVsTimeSizeMax) { // Maximum size of the distance vs time object


			// Create array for this action sampling 
			Plots::distanceVsTimeSize += 2;
			vector<double> distanceTime(2);
			distanceTime.at(0) = 1.0 * rightHybridBase; // Distance (nt);
			distanceTime.at(1) = Plots::timeWaitedUntilNextTranslocation; // Time (s)

			// Add to list of distance-times
			//Plots::distanceVsTimeData.back().push_back(distanceTime);

		    // Add to list of unsent distance-times (may need to create this object again)
		    if (Plots::distanceVsTimeDataUnsent.size() == 0){
		    	vector<double> distanceTimeUnsent(3);
				distanceTimeUnsent.at(0) = 1.0 * rightHybridBase; // Distance (nt);
				distanceTimeUnsent.at(1) = Plots::timeWaitedUntilNextTranslocation; // Time (s)
				distanceTimeUnsent.at(2) = Plots::currentSimNumber;
		    	list<vector<double>> distanceTimeThisSimulation;
				distanceTimeThisSimulation.push_back(distanceTimeUnsent);
		    	Plots::distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);
		    	//cout << "new" << endl;
		    } else{
		    	Plots::distanceVsTimeDataUnsent.back().push_back(distanceTime);
		    }


			// Pause time per site plot
			Plots::pauseTimePerSite.at(rightHybridBase) += Plots::timeWaitedUntilNextTranslocation;


    		Plots::timeWaitedUntilNextTranslocation = 0;
			Plots::velocity = Plots::totalDisplacement / Plots::totaltimeElapsed;



		}

	}


	// If this is a catalysis event, add it to the pause histogram and if it is a misincorporation then add to misincorportion plot
	//cout << "lastAction " << lastAction << "state->NTPbound()" << state->NTPbound() << endl;
	bool thereWasACatalysis = lastAction == 3 && (state->NTPbound() || currentModel->get_assumeBindingEquilibrium());
	if (thereWasACatalysis) {


		// Dwell time histogram
		Plots::catalysisTimesThisTrial.push_back(Plots::timeWaitedUntilNextCatalysis);
		if (Plots::catalysisTimesSize < Plots::catalysisTimesSizeMax){

			Plots::catalysisTimesSize ++;
			Plots::catalysisTimes.back().push_back(Plots::timeWaitedUntilNextCatalysis);


			// Reinitialise the unsent list
			if (catalysisTimesUnsent.size() == 0){
				list<double> catalysisTimesTrial;
				catalysisTimesTrial.push_back(Plots::currentSimNumber * 1.0); // First element is the simulation number 
				catalysisTimesTrial.push_back(Plots::timeWaitedUntilNextCatalysis);
				Plots::catalysisTimes.push_back(catalysisTimesTrial);
				Plots::catalysisTimesUnsent.push_back(catalysisTimesTrial);
			}else{
				Plots::catalysisTimesUnsent.back().push_back(Plots::timeWaitedUntilNextCatalysis);
			}


		}
		
		Plots::timeWaitedUntilNextCatalysis = 0;

	}


}




string Plots::getPlotDataAsJSON(){


	if (_USING_GUI && Plots::plotsAreHidden) return "{}";

	string plotDataJSON = "{";

	plotDataJSON += "'timeElapsed':" + to_string(Plots::totaltimeElapsedThisTrial);
	plotDataJSON += ",'velocity':" + to_string(Plots::velocity);
	plotDataJSON += ",'templateSeq':'" + currentSequence->get_templateSequence() + "'";
	plotDataJSON += ",'nbases':" + to_string(currentSequence->get_templateSequence().length());



	// Determine which types of data must be sent through to the controller (don't send everything or it may slow things down)
	bool distanceVsTime_needsData = false;
	bool pauseHistogram_needsData = false;
	bool pausePerSite_needsData = false;
	bool parameterHeatmap_needsData = false;
	bool terminatedSequences_needsData = true;
	for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
		if (Plots::plotSettings.at(pltNum) != nullptr && (Plots::plotSettings.at(pltNum)->getName() == "distanceVsTime" || Plots::plotSettings.at(pltNum)->getName() == "velocityHistogram")) distanceVsTime_needsData = true;
		else if (Plots::plotSettings.at(pltNum) != nullptr && Plots::plotSettings.at(pltNum)->getName() == "pauseHistogram") pauseHistogram_needsData = true;
		else if (Plots::plotSettings.at(pltNum) != nullptr && Plots::plotSettings.at(pltNum)->getName() == "pauseSite") pausePerSite_needsData = true;
		else if (Plots::plotSettings.at(pltNum) != nullptr && Plots::plotSettings.at(pltNum)->getName() == "parameterHeatmap") parameterHeatmap_needsData = true;
	}



	if (distanceVsTime_needsData) {

		// Turn unsent distance versus time object into a JSON
		string distanceVsTimeDataUnsent_JSON = "'DVT_UNSENT':{";
		int nruns = 0;
		for (list<list<vector<double>>>::iterator it = Plots::distanceVsTimeDataUnsent.begin(); it != Plots::distanceVsTimeDataUnsent.end(); ++it){

			// Simulation number of this simulation
			list<vector<double>> simulationList = (*it);


			int simulationNum = 0;
			if (simulationList.front().size() == 3) simulationNum = int(simulationList.front().at(2));


			// Get all distances and times in this simulation
			string distances = "[";
			string times = "[";

			//cout << distanceVsTimeDataUnsent_JSON << endl;
			//cout << "size of this " << simulationList.size() << "size of parent " << Plots::distanceVsTimeDataUnsent.size() << endl;

			for (list<vector<double>>::iterator j = simulationList.begin(); j != simulationList.end(); ++j){

				vector<double> distanceTime = (*j);
				if (int(distanceTime.at(0)) <= 0) continue;
				distances += to_string(int(distanceTime.at(0)));
				times += to_string(distanceTime.at(1));

				// Add commas if there is another element in the list
				if (++j != simulationList.end()){
        			distances += ",";	
        			times += ",";	
        		}
        		--j;

        		distanceTime.clear();
        		delete &distanceTime;

			}

			distances += "]";
			times += "]";

			if (distances == "[]" || times == "[]") continue;

			distanceVsTimeDataUnsent_JSON += "'" + to_string(simulationNum) + "':{'sim':" + to_string(simulationNum);
			distanceVsTimeDataUnsent_JSON += ",'distances':" + distances + ",'times':" + times + "}";

			// Add commas if there is another element in the list
			if (++it != Plots::distanceVsTimeDataUnsent.end()){
    			distanceVsTimeDataUnsent_JSON += ",";	
    		}
    		--it;


			simulationList.clear();
			delete &simulationList;


		}

		distanceVsTimeDataUnsent_JSON += "}";

		//cout << distanceVsTimeDataUnsent_JSON << endl;
		plotDataJSON += "," + distanceVsTimeDataUnsent_JSON;


		// Include median distance travelled
		if (Plots::distancesTravelledOnEachTemplate.size() > 0){
			int middleDistanceIndex = Plots::distancesTravelledOnEachTemplate.size() / 2;
			plotDataJSON += ",'medianDistanceTravelledPerTemplate':" + to_string(Plots::distancesTravelledOnEachTemplate.at(middleDistanceIndex));
		}

		// Include median time travelled
		if (Plots::distancesTravelledOnEachTemplate.size() > 0){
			int middleTimeIndex = Plots::timesSpentOnEachTemplate.size() / 2;
			plotDataJSON += ",'medianTimeSpentOnATemplate':" + to_string(Plots::timesSpentOnEachTemplate.at(middleTimeIndex));
		}



		Plots::distanceVsTimeDataUnsent.clear();


		// Reinitialise the unsent data structure
		vector<double> distanceTimeUnsent(3);
		//distanceTimeUnsent.at(0) = 0; // Distance (nt);
		//distanceTimeUnsent.at(1) = Plots::timeWaitedUntilNextTranslocation; // Time (s)
		distanceTimeUnsent.at(2) = Plots::currentSimNumber;
    	list<vector<double>> distanceTimeThisSimulation;
		distanceTimeThisSimulation.push_back(distanceTimeUnsent);
    	Plots::distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);

				
	}



	// Catalysis time histogram
	if (pauseHistogram_needsData) {

		// Turn unsent catalysis times object into a JSON
		string catalysisTimeDataUnsent_JSON = "'DWELL_TIMES_UNSENT':{";
		int nruns = 0;
		for (list<list<double>>::iterator it = Plots::catalysisTimesUnsent.begin(); it != Plots::catalysisTimesUnsent.end(); ++it){

			
			// Simulation number of this simulation
			list<double> simulationList = (*it);
			int simulationNum = (int)simulationList.front(); // First element is the simulation number

			catalysisTimeDataUnsent_JSON += "'" + to_string(simulationNum) + "':[";

			for (list<double>::iterator j = simulationList.begin(); j != simulationList.end(); ++j){


				if (j == simulationList.begin()) continue;

				double catalysisTime = (*j);
				catalysisTimeDataUnsent_JSON += to_string(catalysisTime);

				// Add commas if there is another element in the list
				if (++j != simulationList.end()){
        			catalysisTimeDataUnsent_JSON += ",";	
        		}
        		--j;


			}

			catalysisTimeDataUnsent_JSON += "]";

			// Add commas if there is another element in the list
			if (++it != Plots::catalysisTimesUnsent.end()){
    			catalysisTimeDataUnsent_JSON += ",";	
    		}
    		--it;

			simulationList.clear();
			delete &simulationList;

		}

		catalysisTimeDataUnsent_JSON += "}";
		plotDataJSON += "," + catalysisTimeDataUnsent_JSON;



		// Reset the list of unsent data
		Plots::catalysisTimesUnsent.clear();


		// Reinitialise the unsent data structure
		list<double> catalysisTimesTrial;
		catalysisTimesTrial.push_back(Plots::currentSimNumber * 1.0); // First element is the simulation number 
		Plots::catalysisTimes.push_back(catalysisTimesTrial);
		Plots::catalysisTimesUnsent.push_back(catalysisTimesTrial);



	}



	// Sitewise pause time long plot
	if (pausePerSite_needsData) {


		plotDataJSON += ",'npauseSimulations':" + to_string(Plots::npauseSimulations);
		plotDataJSON += ",'pauseTimePerSite':[";


		for (int baseNum = 0; baseNum < Plots::pauseTimePerSite.size(); baseNum ++){
			plotDataJSON += to_string(Plots::pauseTimePerSite.at(baseNum));
			if (baseNum < Plots::pauseTimePerSite.size()-1) plotDataJSON += ",";
		}

		plotDataJSON += "]";

	}

	

	// Parameter heatmap data. This is stored in the settings for each individual plot (and will be added to the JSON in the section below)
	// But here we update the plot settings to include the new data 
	if (parameterHeatmap_needsData) {

		for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
			if (Plots::plotSettings.at(pltNum) != nullptr) Plots::plotSettings.at(pltNum)->updateHeatmapData(Plots::parametersPlotData);
		}

	}


	// Send through a list of terminated sequences which have not yet been sent through
	if (terminatedSequences_needsData) {

		plotDataJSON += ",'sequences':[";

		for (list<string>::iterator it = Plots::unsentCopiedSequences.begin(); it != Plots::unsentCopiedSequences.end(); ++it){

			plotDataJSON += "'" + (*it) + "'";


			// Add commas if there is another element in the list
			if (++it != Plots::unsentCopiedSequences.end()){
    			plotDataJSON += ",";	
    		}
    		--it;

		}


		plotDataJSON += "]";
		Plots::unsentCopiedSequences.clear();


	} 



	//cout << "Plots JSON = " << plotDataJSON << endl;

	// Plot settings. Parameter heatmap data will be added onto the whichPlotInWhichCanvas object
	string plotSettingsJSON = "'whichPlotInWhichCanvas':{";
	for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
		if (Plots::plotSettings.at(pltNum) != nullptr) plotSettingsJSON += "'" + to_string(pltNum+1) + "':{" +  Plots::plotSettings.at(pltNum)->toJSON() + "},";
	}

	if (plotSettingsJSON.substr(plotSettingsJSON.length()-1, 1) == ",") plotSettingsJSON = plotSettingsJSON.substr(0, plotSettingsJSON.length() - 1);
	plotSettingsJSON += "}";
	plotDataJSON += "," + plotSettingsJSON;

	//cout << "plotDataJSON " << plotDataJSON << endl;

	return plotDataJSON + "}";


}



// User selects which plot should be used in a certain plot slot. Sets all plot settings to their defaults
void Plots::userSelectPlot(int plotNum, string value, bool deleteData){



	PlotSettings* newPlotSettings = new PlotSettings(plotNum, value);

	// Delete the PlotSettings which this one is replacing
	PlotSettings* toDelete = Plots::plotSettings.at(plotNum - 1);
	delete toDelete;
	Plots::plotSettings.at(plotNum - 1) = newPlotSettings;



}


// Save the settings for a given plot
void Plots::savePlotSettings(int plotNum, string values_str){

	if (Plots::plotSettings.at(plotNum - 1) != nullptr) Plots::plotSettings.at(plotNum - 1)->savePlotSettings(values_str);

}


// Determine whether to stop sending data through to the controller
void Plots::hideAllPlots(bool toHide){
	Plots::plotsAreHidden = toHide;
}



// Returns a JSON string which contains information on all the cache sizes
string Plots::getCacheSizeJSON(){

	int parameterPlotSize = Plots::parametersPlotData.size() * Plots::parametersPlotData.back()->getVals().size();

	string JSON = "{";
	JSON += "'DVTsize':" + to_string(Plots::distanceVsTimeSize) + ",";
	JSON += "'timeSize':" + to_string(Plots::catalysisTimesSize) + ",";
	JSON += "'parameterPlotSize':" + to_string(parameterPlotSize);
	JSON += "}";

	return JSON;

}




void Plots::deletePlotData(State* stateToInitFor, bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata){


	if (distanceVsTime_cleardata) {

		Plots::currentSimNumber = 1;
		Plots::distanceVsTimeSize = 2;
		Plots::distanceVsTimeData.clear();
		distanceVsTimeDataUnsent.clear();

		Plots::totalDisplacement = 0;
		Plots::totaltimeElapsed = 0;
		Plots::timeElapsed = 0;
		Plots::velocity = 0;

		Plots::distancesTravelledOnEachTemplate.clear();
		Plots::timesSpentOnEachTemplate.clear();


		// Initial distance and time for this simulation
		int rightHybridBase = stateToInitFor->getRightBaseNumber();
	
		vector<double> distanceTime(3);
		distanceTime.at(0) = rightHybridBase; // Distance (nt)
		distanceTime.at(1) = 0; // Time (s)
		distanceTime.at(2) = Plots::currentSimNumber; // Current simulation number stored in first double* of each simulation


		// List for this simulation only
		list<vector<double>> distanceTimeThisSimulation;
		distanceTimeThisSimulation.push_back(distanceTime);

		// List of all simulations
		//Plots::distanceVsTimeData.push_back(distanceTimeThisSimulation);
 		Plots::distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);

	
	}

	if (timeHistogram_cleardata){
		Plots::catalysisTimesSize = 0;
		Plots::catalysisTimesUnsent.clear();
		Plots::catalysisTimes.clear();
		Plots::catalysisTimesThisTrial.clear();
		Plots::totaltimeElapsedThisTrial = 0;
	}

	if (customPlot_cleardata){

		// Parameter heatmap data. Need to add recorded metrics as well as the values of the parameters
		Plots::parametersPlotData.clear();
		Plots::parametersPlotData.push_back(new ParameterHeatmapData("probability", "Probability density"));
		Plots::parametersPlotData.push_back(new ParameterHeatmapData("velocity", "Mean velocity (bp/s)"));
		Plots::parametersPlotData.push_back(new ParameterHeatmapData("catalyTime", "Mean catalysis time (s)"));
		Plots::parametersPlotData.push_back(new ParameterHeatmapData("totalTime", "Total transcription time (s)"));
		Plots::parametersPlotData.push_back(new ParameterHeatmapData("nascentLen", "Final nascent length (nt)"));
		Plots::parametersPlotData.push_back(new ParameterHeatmapData("logLikelihood", "Chi-squared test statistic", "X^2"));

		// Add all parameters to the list
		for (int i = 0; i < Settings::paramList.size(); i ++){
			Plots::parametersPlotData.push_back(new ParameterHeatmapData(Settings::paramList.at(i)->getID(), Settings::paramList.at(i)->getName()));
		}


	}



	if (timePerSite_cleardata){

		// Pause time per site plot
		Plots::npauseSimulations = 1;
		Plots::pauseTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
		for (int baseNum = 0; baseNum < Plots::pauseTimePerSite.size(); baseNum ++) {
			Plots::pauseTimePerSite.at(baseNum) = 0.0;
		}


	}


	// Clear the data saved in the ABC output, and the posterior distribution
	if (ABC_cleardata) {


	}
	


}





void Plots::addCopiedSequence(string sequence){

	Plots::unsentCopiedSequences.push_back(sequence);

}

