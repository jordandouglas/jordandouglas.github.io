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



size_t const Plots::maximumBytesJSON = 8388608; // 8MB
string Plots::plotDataJSON = "";

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
vector<double> Plots::timeToCatalysisPerSite;
vector<double> Plots::dwellTimePerSite;



// Parameter heatmap data
list<ParameterHeatmapData*> Plots::parametersPlotData;


// Copied sequences (only the ones that have not been sent to the controller)
list<string> Plots::unsentCopiedSequences;
int const Plots::maxNumberCopiedSequences = 500;
int Plots::numberCopiedSequences = 0;



// Miscellaneous information
double Plots::timeElapsed = 0;
double Plots::velocity = 0;
int Plots::totalDisplacement = 0;
double Plots::totaltimeElapsed = 0;
double Plots::totaltimeElapsedThisTrial = 0;
bool Plots::sitewisePlotHidden = false;
bool Plots::plotsAreHidden = false;
bool Plots::arrestTimeoutReached = false;
double Plots::timeWaitedUntilNextTranslocation = 0;
double Plots::timeWaitedUntilNextCatalysis = 0;


// Plot display settings
vector<PlotSettings*> Plots::plotSettings(4);





// Must call this function when the sequence changes
void Plots::init(){



	// Restrict the data flow by only disallowing the JSON string to exceed a certain number of megabytes at a time. This is to avoid memory errors
	Plots::plotDataJSON.reserve(Plots::maximumBytesJSON);


	Plots::currentSimNumber = 1;


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
	Plots::timeToCatalysisPerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
	for (int baseNum = 0; baseNum < Plots::timeToCatalysisPerSite.size(); baseNum ++) {
		Plots::timeToCatalysisPerSite.at(baseNum) = 0.0;
	}


	// Dwell time per site plot
	Plots::npauseSimulations = 0;
	Plots::dwellTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
	for (int baseNum = 0; baseNum < Plots::dwellTimePerSite.size(); baseNum ++) {
		Plots::dwellTimePerSite.at(baseNum) = 0.0;
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
		Plots::parametersPlotData.push_back(new ParameterHeatmapData(Settings::paramList.at(i)->getID(), Settings::paramList.at(i)->getName(), Settings::paramList.at(i)->getLatexName()));
	}


	// Copied sequences
	Plots::unsentCopiedSequences.clear();
	Plots::numberCopiedSequences = 0;


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


	if (state == nullptr || !_USING_GUI) return;


	//cout << "Refreshing plot data: " << Plots::currentSimNumber << endl;
	Plots::currentSimNumber ++;


	// Start new distance vs time entry
	if (Plots::distanceVsTimeSize < Plots::distanceVsTimeSizeMax){
		Plots::distanceVsTimeSize += 2;


		// Initial distance and time for this simulation
		int rightHybridBase = state->getRightTemplateBaseNumber();
	
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


	if (state == nullptr || !_USING_GUI) return;

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


	// Inform any site specific recordings that the current simulation has finished
	for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
		if (Plots::plotSettings.at(pltNum) != nullptr) Plots::plotSettings.at(pltNum)->trialEnd();
	}




}



// Reset the time until the next catalysis event to 0. This is necessary when the 3' end of the nascent strand is cleaved
void Plots::resetTimeToCatalysis(){
	Plots::timeWaitedUntilNextCatalysis = 0;
}


void Plots::updatePlotData(State* state, int lastAction, int* actionsToDo, double reactionTime) {



	if (state == nullptr || !_USING_GUI) return;

	int rightHybridBase = state->getRightTemplateBaseNumber();
	int numActions = sizeof(actionsToDo) / sizeof(actionsToDo[0]);


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


			// Dwell time per site plot
			Plots::dwellTimePerSite.at(rightHybridBase) += Plots::timeWaitedUntilNextTranslocation;


    		Plots::timeWaitedUntilNextTranslocation = 0;
			Plots::velocity = Plots::totalDisplacement / Plots::totaltimeElapsed;



		}

	}


	// If this is a catalysis event, add it to the pause histogram and if it is a misincorporation then add to misincorportion plot
	//cout << "lastAction " << lastAction << " state->NTPbound() " << state->NTPbound() << endl;
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

		//cout << "thereWasACatalysis " << rightHybridBase << " , " << Plots::timeToCatalysisPerSite.at(rightHybridBase) << endl;
		Plots::timeToCatalysisPerSite.at(rightHybridBase) += Plots::timeWaitedUntilNextCatalysis;


		// Site specificity recording
		Plots::recordSite(rightHybridBase, Plots::timeWaitedUntilNextCatalysis);
		
		Plots::timeWaitedUntilNextCatalysis = 0;

	}


}



// Returns all unsent plot data as a JSON string and removes unsent data from memory
// Using '+=' instead of '+' a a string concatenator inside hot loops (see https://stackoverflow.com/questions/18892281/most-optimized-way-of-concatenation-in-strings)  
string Plots::getPlotDataAsJSON(){


	if (_USING_GUI && Plots::plotsAreHidden && Plots::sitewisePlotHidden) return "{'moreData':false}";

	//cout << "getPlotDataAsJSON" << endl;


	// Determine which types of data must be sent through to the controller (don't send everything or it may slow things down)
	bool distanceVsTime_needsData = false;
	bool pauseHistogram_needsData = false;
	bool pausePerSite_needsData = false;
	bool parameterHeatmap_needsData = false;
	bool terminatedSequences_needsData = Plots::unsentCopiedSequences.size() > 0;
	for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
		if (!Plots::plotsAreHidden && Plots::plotSettings.at(pltNum) != nullptr && (Plots::plotSettings.at(pltNum)->getName() == "distanceVsTime" || Plots::plotSettings.at(pltNum)->getName() == "velocityHistogram")) distanceVsTime_needsData = true;
		else if (!Plots::plotsAreHidden && Plots::plotSettings.at(pltNum) != nullptr && Plots::plotSettings.at(pltNum)->getName() == "pauseHistogram") pauseHistogram_needsData = true;
		else if (!Plots::plotsAreHidden && Plots::plotSettings.at(pltNum) != nullptr && Plots::plotSettings.at(pltNum)->getName() == "parameterHeatmap") parameterHeatmap_needsData = true;
		else if (!Plots::sitewisePlotHidden && Plots::plotSettings.at(pltNum) != nullptr && 
							(Plots::plotSettings.at(pltNum)->getName() == "pauseSite" || Plots::plotSettings.at(pltNum)->getName() == "catalysisTimeSite")) pausePerSite_needsData = true;
		
			
	}


	if (!distanceVsTime_needsData && !pauseHistogram_needsData && !pausePerSite_needsData && !parameterHeatmap_needsData && !terminatedSequences_needsData) return "{'moreData':false}";


	// If at some point the JSON string reaches its maximum capacity then we will inform the controller that more data must be requested
	bool stringLengthHasBeenExceeded = false;


	Plots::plotDataJSON = "{";

	Plots::plotDataJSON += "'timeElapsed':" + to_string(Plots::totaltimeElapsedThisTrial);
	Plots::plotDataJSON += ",'velocity':" + to_string(Plots::velocity);
	Plots::plotDataJSON += ",'templateSeq':'" + currentSequence->get_templateSequence() + "'";
	Plots::plotDataJSON += ",'nbases':" + to_string(currentSequence->get_templateSequence().length());



	if (distanceVsTime_needsData) {

	
		// Turn unsent distance versus time object into a JSON
		Plots::plotDataJSON += ",'DVT_UNSENT':{";
		string distances;
		string times;
		list<vector<double>> simulationList;
		int nElements = -1;
		int exceededStringLengthAt_i = -1;
		int exceededStringLengthAt_j = -1;
		int distanceTimeNumber = 0;
		list<list<vector<double>>>::iterator it;
		list<vector<double>>::iterator j;
		for (it = Plots::distanceVsTimeDataUnsent.begin(); it != Plots::distanceVsTimeDataUnsent.end(); ++it){


			// Simulation number of this simulation
			nElements++;


			simulationList = (*it);

			if (simulationList.size() < 2) continue;


			//cout << "a" << nElements << endl;


			int simulationNum = 0;
			if (simulationList.front().size() == 3) simulationNum = int(simulationList.front().at(2));


			// Get all distances and times in this simulation
			distances = "[";
			times = "[";




			//cout << distanceVsTimeDataUnsent_JSON << endl;
			//cout << "size of this " << simulationList.size() << "size of parent " << Plots::distanceVsTimeDataUnsent.size() << endl;
			exceededStringLengthAt_j = -1;
			distanceTimeNumber = 0;
			for (j = simulationList.begin(); j != simulationList.end(); ++j){


				distanceTimeNumber ++;
				if ((*j).size() < 2 || int((*j).at(0)) <= 0) continue;
				distances += to_string(int((*j).at(0)));
				times += to_string((*j).at(1));

    			distances += ",";	
    			times += ",";	


        		if (Plots::plotDataJSON.length() + distances.length() + times.length() >= Plots::maximumBytesJSON - 1000) {
        			exceededStringLengthAt_j = distanceTimeNumber;
        			cout << "Maximum string size exceeded for distance vs time." << endl;
        			break;
        		}



			}


			// Delete all distance time objects up until the entry which caused memory to exceed 
			distanceTimeNumber = 0;
			for (j = simulationList.begin(); j != simulationList.end(); ++j){
				distanceTimeNumber ++;
				if (exceededStringLengthAt_j != -1 && distanceTimeNumber > exceededStringLengthAt_j) break;
				(*j).clear();
			}



			// Clear the list of values for this simulation (up until the memory overflow was achieved, or the full list if string length was not exceeded)
			if (exceededStringLengthAt_j != -1) {
    			list<vector<double>>::iterator finalElementToDelete = (*it).begin();
    			advance(finalElementToDelete, exceededStringLengthAt_j);
    			(*it).erase((*it).begin(), finalElementToDelete);


    			exceededStringLengthAt_i = nElements;
				stringLengthHasBeenExceeded = true;


				// Ensure that the next element (that has not been deleted) contains the simulation number
				list<vector<double>>::iterator newFirstElement = (*it).begin();
				(*newFirstElement).resize(3);
				(*newFirstElement).at(2) = simulationNum;

    		}
			else (*it).clear();
			//delete &simulationList;




			if (distances.substr(distances.length()-1, 1) == ",") distances = distances.substr(0, distances.length() - 1);
			if (times.substr(times.length()-1, 1) == ",") times = times.substr(0, times.length() - 1);
			distances += "]";
			times += "]";

			//if (distances == "[]" || times == "[]") continue;


			Plots::plotDataJSON += "'";
			Plots::plotDataJSON += to_string(simulationNum);
			Plots::plotDataJSON += "':{'sim':";
			Plots::plotDataJSON += to_string(simulationNum);


			Plots::plotDataJSON += ",'distances':";
			Plots::plotDataJSON += distances;
			Plots::plotDataJSON += ",'times':";
			Plots::plotDataJSON += times;
			Plots::plotDataJSON += "}";
			Plots::plotDataJSON += ",";	


    		//cout << "distanceVsTimeDataUnsent_JSON length " << distanceVsTimeDataUnsent_JSON.length() << endl;

    		//cout << distanceVsTimeDataUnsent_JSON << endl;




			//cout << "c" << nElements << endl;


			// Stop adding elements to the string if we have gone past the maximum length
    		if (exceededStringLengthAt_j != -1) break;




		}



		if (Plots::plotDataJSON.substr(Plots::plotDataJSON.length()-1, 1) == ",") Plots::plotDataJSON = Plots::plotDataJSON.substr(0, Plots::plotDataJSON.length() - 1);
		Plots::plotDataJSON += "}";




		//cout << distanceVsTimeDataUnsent_JSON << endl;




		// Include median distance travelled
		if (Plots::distancesTravelledOnEachTemplate.size() > 0){
			int middleDistanceIndex = Plots::distancesTravelledOnEachTemplate.size() / 2;
			//cout << middleDistanceIndex << endl;
			Plots::plotDataJSON += ",'medianDistanceTravelledPerTemplate':" + to_string(Plots::distancesTravelledOnEachTemplate.at(middleDistanceIndex));
		}

		// Include median time travelled
		if (Plots::timesSpentOnEachTemplate.size() > 0){
			int middleTimeIndex = Plots::timesSpentOnEachTemplate.size() / 2;
			//cout << middleTimeIndex << endl;
			Plots::plotDataJSON += ",'medianTimeSpentOnATemplate':" + to_string(Plots::timesSpentOnEachTemplate.at(middleTimeIndex));
		}


		// Erase all unsent elements which were successfully added to the string before memory was exceeded
		if (exceededStringLengthAt_i != -1) {
			if (exceededStringLengthAt_i > 0){
				list<list<vector<double>>>::iterator finalElementToDelete = Plots::distanceVsTimeDataUnsent.begin();
				advance(finalElementToDelete, exceededStringLengthAt_i-1);
				//cout << "Erasing upto element " << exceededStringLengthAt_i-1 << endl;

				//cout << "length before " << Plots::distanceVsTimeDataUnsent.size() << endl;
				Plots::distanceVsTimeDataUnsent.erase(Plots::distanceVsTimeDataUnsent.begin(), finalElementToDelete);
				

				//cout << "length after " << Plots::distanceVsTimeDataUnsent.size() << endl;
			}
		}
		else {

			Plots::distanceVsTimeDataUnsent.clear();

			// Reinitialise the unsent data structure
			if (Plots::distanceVsTimeSize < Plots::distanceVsTimeSizeMax) {
				vector<double> distanceTimeUnsent(3);
				//distanceTimeUnsent.at(0) = 0; // Distance (nt);
				//distanceTimeUnsent.at(1) = Plots::timeWaitedUntilNextTranslocation; // Time (s)
				distanceTimeUnsent.at(2) = Plots::currentSimNumber;
		    	list<vector<double>> distanceTimeThisSimulation;
				distanceTimeThisSimulation.push_back(distanceTimeUnsent);
		    	Plots::distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);
	    	}

	    }



				
	}



	// Catalysis time histogram
	if (pauseHistogram_needsData) {


		//cout << "Asking for Catalysis time" << endl;

		// Turn unsent catalysis times object into a JSON
		Plots::plotDataJSON += ",'DWELL_TIMES_UNSENT':{";
		int nruns = 0;
		string times = "[";
		list<list<double>>::iterator it;
		int catalysisSiteNumber = 0;
		int exceededStringLengthAt_i = -1;
		int exceededStringLengthAt_j = -1;
		int nElements = -1;
		for (it = Plots::catalysisTimesUnsent.begin(); it != Plots::catalysisTimesUnsent.end(); ++it){

			nElements++;

			
			// Simulation number of this simulation
			list<double> simulationList = (*it);
			if (simulationList.size() == 0) continue;
			int simulationNum = (int)simulationList.front(); // First element is the simulation number


			times = "[";
			catalysisSiteNumber = 0;
			exceededStringLengthAt_j = -1;
			for (list<double>::iterator j = simulationList.begin(); j != simulationList.end(); ++j){

				if (j == simulationList.begin()) continue;
				times += to_string((*j)) + ",";


				catalysisSiteNumber ++;
        		//distanceTime.clear();
        		//delete &distanceTime;

        		if (Plots::plotDataJSON.length() + times.length() >= Plots::maximumBytesJSON - 1000) {
        			exceededStringLengthAt_j = catalysisSiteNumber;
        			cout << "Maximum string size exceeded for catalysis histogram." << endl;
        			break;
        		}


			}



			// Remove all catalysis entries up until the entry which caused memory to exceed 
			if (exceededStringLengthAt_j != -1) {
				stringLengthHasBeenExceeded = true;
				exceededStringLengthAt_i = nElements;

				list<double>::iterator finalElementToDelete = (*it).begin();
				advance(finalElementToDelete, exceededStringLengthAt_j);
				(*it).erase((*it).begin(), finalElementToDelete);
			}
			else {
				simulationList.clear();
				//delete &simulationList;
			}



			if (times.substr(times.length()-1, 1) == ",") times = times.substr(0, times.length() - 1);
			times += "]";
			if (times == "[]") continue;

			Plots::plotDataJSON += "'";
			Plots::plotDataJSON += to_string(simulationNum);
			Plots::plotDataJSON += "':";
			Plots::plotDataJSON += times;
			Plots::plotDataJSON += ",";	


			// Stop adding elements to the string now that we have gone past the maximum length
			if (exceededStringLengthAt_j != -1) break;


		}

		if (Plots::plotDataJSON.substr(Plots::plotDataJSON.length()-1, 1) == ",") Plots::plotDataJSON = Plots::plotDataJSON.substr(0, Plots::plotDataJSON.length() - 1);
		Plots::plotDataJSON += "}";





		// Erase all unsent elements which were successfully added to the string before memory was exceeded
		if (exceededStringLengthAt_i != -1) {
			if (exceededStringLengthAt_i > 0){
				list<list<double>>::iterator finalElementToDelete = Plots::catalysisTimesUnsent.begin();
				advance(finalElementToDelete, exceededStringLengthAt_i-1);
				Plots::catalysisTimesUnsent.erase(Plots::catalysisTimesUnsent.begin(), finalElementToDelete);
			}
		}
		else {

			Plots::catalysisTimesUnsent.clear();

			// Reinitialise the unsent data structure
			list<double> catalysisTimesTrial;
			catalysisTimesTrial.push_back(Plots::currentSimNumber * 1.0); // First element is the simulation number 
			Plots::catalysisTimes.push_back(catalysisTimesTrial);
			Plots::catalysisTimesUnsent.push_back(catalysisTimesTrial);


		}




	}


	// Sitewise pause time long plot. Only send the y-axis values that are required. Should need approximately 10L bytes to store this in the string 
	if (pausePerSite_needsData) {


		if (Plots::plotDataJSON.length() + 10 * Plots::dwellTimePerSite.size() < Plots::maximumBytesJSON){

			Plots::plotDataJSON += ",'npauseSimulations':" + to_string(Plots::npauseSimulations);




			if (Plots::plotSettings.at(3)->get_pauseSiteYVariable() == "catalysisTimes") {

				// Time to catalysis per site
				Plots::plotDataJSON += ",'pauseTimePerSite':[";
				for (int baseNum = 0; baseNum < Plots::timeToCatalysisPerSite.size(); baseNum ++){
					Plots::plotDataJSON += to_string(Plots::timeToCatalysisPerSite.at(baseNum));
					if (baseNum < Plots::timeToCatalysisPerSite.size()-1) Plots::plotDataJSON += ",";
				}
				Plots::plotDataJSON += "]";
			}

			else if (Plots::plotSettings.at(3)->get_pauseSiteYVariable() == "dwellTimes") {

				// Dwell time per site
				Plots::plotDataJSON += ",'pauseTimePerSite':[";
				for (int baseNum = 0; baseNum < Plots::dwellTimePerSite.size(); baseNum ++){
					Plots::plotDataJSON += to_string(Plots::dwellTimePerSite.at(baseNum));
					if (baseNum < Plots::dwellTimePerSite.size()-1) Plots::plotDataJSON += ",";
				}
				Plots::plotDataJSON += "]";
			}





		}else{
			stringLengthHasBeenExceeded = true;
			cout << "Maximum string size exceeded for dwell time per site plot." << endl;
		}

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

		Plots::plotDataJSON += ",'sequences':[";

		for (list<string>::iterator it = Plots::unsentCopiedSequences.begin(); it != Plots::unsentCopiedSequences.end(); ++it){

			Plots::plotDataJSON += "'" + (*it) + "'";


			// Add commas if there is another element in the list
			if (++it != Plots::unsentCopiedSequences.end()){
    			Plots::plotDataJSON += ",";	
    		}
    		--it;

		}


		Plots::plotDataJSON += "]";
		Plots::unsentCopiedSequences.clear();


	} 



	//cout << "Plots JSON = " << Plots::plotDataJSON << endl;

	// Plot settings. Parameter heatmap data will be added onto the whichPlotInWhichCanvas object
	string plotSettingsJSON = "'whichPlotInWhichCanvas':{";
	for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
		if (Plots::plotSettings.at(pltNum) != nullptr) plotSettingsJSON += "'" + to_string(pltNum+1) + "':{" +  Plots::plotSettings.at(pltNum)->toJSON() + "},";
	}



	if (plotSettingsJSON.substr(plotSettingsJSON.length()-1, 1) == ",") plotSettingsJSON = plotSettingsJSON.substr(0, plotSettingsJSON.length() - 1);
	plotSettingsJSON += "}";
	Plots::plotDataJSON += "," + plotSettingsJSON;

	//cout << "Plots::plotDataJSON " << Plots::plotDataJSON << endl;
	//cout << "C" << endl;


	Plots::plotDataJSON += ",'moreData':" + string(stringLengthHasBeenExceeded ? "true" : "false");


	return Plots::plotDataJSON + "}";


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
void Plots::hideSitewisePlot(bool toHide){
	Plots::sitewisePlotHidden = toHide;
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




void Plots::deletePlotData(State* stateToInitFor, bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata, bool sequences_cleardata){


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
		int rightHybridBase = stateToInitFor->getRightTemplateBaseNumber();
	
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


		// Reset the values in all lists
		for (list<ParameterHeatmapData*>::iterator it = Plots::parametersPlotData.begin(); it != Plots::parametersPlotData.end(); ++it){
			(*it)->deleteValues();
		}

		// Delete all site recordings data 
		for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
			if (Plots::plotSettings.at(pltNum) != nullptr) Plots::plotSettings.at(pltNum)->deleteSiteRecordings();
		}
	

	}



	if (timePerSite_cleardata){

		// Time to catalysis per site plot
		Plots::npauseSimulations = 1;
		Plots::timeToCatalysisPerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
		for (int baseNum = 0; baseNum < Plots::timeToCatalysisPerSite.size(); baseNum ++) {
			Plots::timeToCatalysisPerSite.at(baseNum) = 0.0;
		}


		// Dwell time per site plot
		Plots::npauseSimulations = 1;
		Plots::dwellTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
		for (int baseNum = 0; baseNum < Plots::dwellTimePerSite.size(); baseNum ++) {
			Plots::dwellTimePerSite.at(baseNum) = 0.0;
		}


	}



	// Clear the list of unsent sequences
	if (sequences_cleardata){
		Plots::unsentCopiedSequences.clear();
		Plots::numberCopiedSequences = 0;
	}


	// Clear the data saved in the ABC output, and the posterior distribution
	if (ABC_cleardata) {


	}
	


}


// Send through the current site and the time to catalysis at that site
// Each plot will determine whether or not to store that number
void Plots::recordSite(int siteThatWasJustCatalysed, double timeToCatalysis){
	for (int pltNum = 0; pltNum < Plots::plotSettings.size(); pltNum++){
		if (Plots::plotSettings.at(pltNum) != nullptr) Plots::plotSettings.at(pltNum)->recordSite(siteThatWasJustCatalysed, timeToCatalysis);
	}
}


void Plots::addCopiedSequence(string sequence){
	if (Plots::numberCopiedSequences < Plots::maxNumberCopiedSequences) {
		Plots::numberCopiedSequences ++;
		Plots::unsentCopiedSequences.push_back(sequence);
	}
}

