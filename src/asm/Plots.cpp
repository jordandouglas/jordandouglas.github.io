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
#include "BayesianCalculations.h"


#include <string>
#include <iostream>



using namespace std;





Plots::Plots(){


    this->maximumBytesJSON = 8388608; // 8MB
    this->plotDataJSON = "";
    this->plotsInit = false;

    // Distance versus time plot data (and velocity histogram data)
    this->currentSimNumber = 0;
    this->distanceVsTimeSize = 0;
    this->distanceVsTimeSizeMax = 1e7;


    // Catalysis time histogram
    this->catalysisTimesSize = 0;
    this->catalysisTimesSizeMax = 1e6;


    // Pause time per site
    this->npauseSimulations = 0;
    this->phyloPauseTimePerSite.resize(0);


    // Copied sequences (only the ones that have not been sent to the controller)
    this->maxNumberCopiedSequences = 500;
    this->numberCopiedSequences = 0;



    // Miscellaneous information
    this->timeElapsed = 0;
    this->velocity = 0;
    this->totalDisplacement = 0;
    this->totaltimeElapsed = 0;
    this->totaltimeElapsedThisTrial = 0;
    this->sitewisePlotHidden = false;
    this->plotsAreHidden = false;
    this->sendCopiedSequences = true;
    this->arrestTimeoutReached = false;
    this->timeWaitedUntilNextTranslocation = 0;
    this->timeWaitedUntilNextCatalysis = 0;


    // Plot settings
    this->plotSettings.resize(4);



}



void Plots::clear(){

    this->deletePlotData(nullptr, true, true, true, true, true, true);
    this->distanceVsTimeData.clear();
    this->distanceVsTimeDataUnsent.clear();
    this->distancesTravelledOnEachTemplate.clear();
    this->timesSpentOnEachTemplate.clear();
    this->dwellTimePerSite.clear();
    this->timePerTranscriptLength.clear();
    this->timeToCatalysisPerSite.clear();
    this->unsentCopiedSequences.clear();
    this->parametersPlotData.clear();
    this->catalysisTimes.clear();
    this->catalysisTimesUnsent.clear();
    this->proportionTimePerTranscriptLength.clear();


}


// Must call this function when the sequence changes
void Plots::init(){



    if (_RECORD_PAUSE_TIMES){

        if (_USING_PHYLOPAUSE) {
            this->phyloPauseTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
            for (int baseNum = 0; baseNum < this->phyloPauseTimePerSite.size(); baseNum ++) {
                this->phyloPauseTimePerSite.at(baseNum).clear();
            }
        }
        else {
            for (list<vector<double>>::iterator it = this->proportionTimePerTranscriptLength.begin(); it != this->proportionTimePerTranscriptLength.end(); ++it){
                it->clear();
            }
            this->proportionTimePerTranscriptLength.clear();
            //vector<double> first_vec(currentSequence->get_templateSequence().length()+1);
            //for (int i = 0; i < first_vec.size(); i ++) first_vec.at(i) = 0;
            //this->proportionTimePerTranscriptLength.push_back(first_vec);
        }

    }




	if (!_USING_GUI) return;
	this->plotsInit = true;

	// Restrict the data flow by only disallowing the JSON string to exceed a certain number of megabytes at a time. This is to avoid memory errors
	this->plotDataJSON.reserve(this->maximumBytesJSON);


	this->currentSimNumber = 1;


	// Distance versus time plot data
	this->distanceVsTimeSize = 2;
	this->distanceVsTimeData.clear();
	distanceVsTimeDataUnsent.clear();
	this->distancesTravelledOnEachTemplate.clear();
	this->timesSpentOnEachTemplate.clear();



	// Catalysis time histogram
	this->catalysisTimesSize = 0;





	// Dwell time per site plot
	this->dwellTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
	for (int baseNum = 0; baseNum < this->dwellTimePerSite.size(); baseNum ++) {
		this->dwellTimePerSite.at(baseNum) = 0.0;
	}


    // Time per transcript length
    this->timePerTranscriptLength.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
    for (int baseNum = 0; baseNum < this->timePerTranscriptLength.size(); baseNum ++) {
        this->timePerTranscriptLength.at(baseNum) = 0.0;
    }


    // Pause time per site plot
    this->npauseSimulations = 0;
    this->timeToCatalysisPerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
    for (int baseNum = 0; baseNum < this->timeToCatalysisPerSite.size(); baseNum ++) {
        this->timeToCatalysisPerSite.at(baseNum) = 0.0;
    }


	// Parameter heatmap data. Need to add recorded metrics as well as the values of the parameters
	this->parametersPlotData.clear();
	this->parametersPlotData.push_back(new ParameterHeatmapData("probability", "Probability density"));
	this->parametersPlotData.push_back(new ParameterHeatmapData("velocity", "Mean velocity (bp/s)"));
	this->parametersPlotData.push_back(new ParameterHeatmapData("catalyTime", "Mean catalysis time (s)"));
	this->parametersPlotData.push_back(new ParameterHeatmapData("totalTime", "Total transcription time (s)"));
	this->parametersPlotData.push_back(new ParameterHeatmapData("nascentLen", "Final nascent length (nt)"));
	this->parametersPlotData.push_back(new ParameterHeatmapData("logLikelihood", "Chi-squared test statistic", "X^2"));

	// Add all parameters to the list
	for (int i = 0; i < Settings::paramList.size(); i ++){
		this->parametersPlotData.push_back(new ParameterHeatmapData(Settings::paramList.at(i)->getID(), Settings::paramList.at(i)->getName(), Settings::paramList.at(i)->getLatexName()));
	}


	// Copied sequences
	this->unsentCopiedSequences.clear();
	this->numberCopiedSequences = 0;


	// Miscellaneous information
	this->totalDisplacement = 0;
	this->totaltimeElapsed = 0;
	this->totaltimeElapsedThisTrial = 0;
	this->velocity = 0;



	// Prepare for first simulation
	this->refreshPlotData(_currentStateGUI);


}




// Start new simulation
void Plots::refreshPlotData(State* state){




    // Miscellaneous information
    this->arrestTimeoutReached = false;
    this->totaltimeElapsedThisTrial = 0;
    this->timeElapsed = 0;
    this->timeWaitedUntilNextTranslocation = 0;
    this->timeWaitedUntilNextCatalysis = 0;

    // Pause time per site plot
    this->npauseSimulations ++;





    if (_RECORD_PAUSE_TIMES){
        vector<double> next_vec(currentSequence->get_templateSequence().length()+1);
        for (int i = 0; i < next_vec.size(); i ++) next_vec.at(i) = 0;
        this->proportionTimePerTranscriptLength.push_back(next_vec);
    }





	if (state == nullptr || !_USING_GUI || !this->plotsInit) return;


	//cout << "Refreshing plot data: " << this->currentSimNumber << endl;
	this->currentSimNumber ++;


	// Start new distance vs time entry
	if (this->distanceVsTimeSize < this->distanceVsTimeSizeMax){
		this->distanceVsTimeSize += 2;


		// Initial distance and time for this simulation
		int rightHybridBase = state->getRightTemplateBaseNumber();
	
		vector<double> distanceTime(3);
		distanceTime.at(0) = rightHybridBase; // Distance (nt)
		distanceTime.at(1) = 0; // Time (s)
		distanceTime.at(2) = this->currentSimNumber; // Current simulation number stored in first double* of each simulation


		// List for this simulation only
		list<vector<double>> distanceTimeThisSimulation;
		distanceTimeThisSimulation.push_back(distanceTime);

		// List of all simulations
		//this->distanceVsTimeData.push_back(distanceTimeThisSimulation);
 		this->distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);

	}


	// Catalysis time data
	this->catalysisTimesThisTrial.clear();
	if (this->catalysisTimesSize < this->catalysisTimesSizeMax){
		this->catalysisTimesSize ++;

		list<double> catalysisTimesTrial;
		catalysisTimesTrial.push_back(this->currentSimNumber * 1.0); // First element is the simulation number 
		this->catalysisTimes.push_back(catalysisTimesTrial);
		this->catalysisTimesUnsent.push_back(catalysisTimesTrial);

	}




   


}




// At the end of every simulation update the parameter plot data
void Plots::updateParameterPlotData(State* state){


	if (state == nullptr || !_USING_GUI || !this->plotsInit) return;

	if (this->catalysisTimesThisTrial.size() == 0) return; 
	if (this->totaltimeElapsedThisTrial == 0) return;



	int increaseInPrimerLength = state->get_nascentLength() - (hybridLen->getVal(true) + bubbleLeft->getVal(true) + 2);
	double velocity_thisTrial = increaseInPrimerLength / this->totaltimeElapsedThisTrial;
	double meanDwellTime_thisTrial = this->totaltimeElapsedThisTrial / this->catalysisTimesThisTrial.size();


	// Record the total time taken to copy this template and the distance travelled
	if (this->distanceVsTimeSize < this->distanceVsTimeSizeMax){
		Settings::sortedPush(this->distancesTravelledOnEachTemplate, state->getRightTemplateBaseNumber());
		Settings::sortedPush(this->timesSpentOnEachTemplate, this->totaltimeElapsedThisTrial);
	}




	for (list<ParameterHeatmapData*>::iterator it = this->parametersPlotData.begin(); it != this->parametersPlotData.end(); ++it){

		// Update metric 
		if ((*it)->getID() == "velocity") (*it)->addValue(velocity_thisTrial);
		else if ((*it)->getID() == "totalTime") (*it)->addValue(this->totaltimeElapsedThisTrial);
		else if ((*it)->getID() == "catalyTime") (*it)->addValue(meanDwellTime_thisTrial);
		else if ((*it)->getID() == "nascentLen") (*it)->addValue(state->get_nascentLength());


		// Add a new value for this parameter
		else for (int i = 0; i < Settings::paramList.size(); i ++){
			if ((*it)->getID() == Settings::paramList.at(i)->getID()){
				(*it)->addValue(Settings::paramList.at(i)->getVal(true));
				break;
			}
		}

	}


	// Inform any site specific recordings that the current simulation has finished
	for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
		if (this->plotSettings.at(pltNum) != nullptr) this->plotSettings.at(pltNum)->trialEnd();
	}




}



// Reset the time until the next catalysis event to 0. This is necessary when the 3' end of the nascent strand is cleaved
void Plots::resetTimeToCatalysis(){
	this->timeWaitedUntilNextCatalysis = 0;
}



// Updates the timeWaitedUntilNextCatalysis or timeToCatalysisPerSite object at the current site. Only call this method when updatePlotData should not be called
void Plots::update_timeWaitedUntilNextCatalysis(int baseNumber){
    if (_USING_PHYLOPAUSE && baseNumber < this->phyloPauseTimePerSite.size()) this->phyloPauseTimePerSite.at(baseNumber).push_back(this->timeWaitedUntilNextCatalysis);
    else if (baseNumber < this->timeToCatalysisPerSite.size()) {
        this->timeToCatalysisPerSite.at(baseNumber) += this->timeWaitedUntilNextCatalysis;
        this->recordSite(baseNumber, this->timeWaitedUntilNextCatalysis);
    }


    this->timeWaitedUntilNextCatalysis = 0;
}


void Plots::updatePlotData(State* state, int lastAction, int* actionsToDo, double reactionTime) {


    // Phylopause -> record time to catalysis at this site and add to list for this site
    if (_RECORD_PAUSE_TIMES){


        // Time per transcript length
        //if (state->get_nascentLength() < this->timePerTranscriptLength.size()) this->timePerTranscriptLength.at(state->get_nascentLength()) += reactionTime;


        if (_USING_PHYLOPAUSE){
            this->timeWaitedUntilNextCatalysis += reactionTime;
            bool thereWasACatalysis = lastAction == 3 && (state->NTPbound() || currentModel->get_assumeBindingEquilibrium());
            if (thereWasACatalysis) {
                this->phyloPauseTimePerSite.at(state->getRightTemplateBaseNumber()).push_back(this->timeWaitedUntilNextCatalysis);
                this->timeWaitedUntilNextCatalysis = 0;
            }
        }

        else{

            this->proportionTimePerTranscriptLength.back().at(state->get_nascentLength()) = this->proportionTimePerTranscriptLength.back().at(state->get_nascentLength()) + reactionTime;

        }

        return;
    }



	if (state == nullptr || !_USING_GUI || !this->plotsInit) return;


	int rightHybridBase = state->getRightTemplateBaseNumber();
	int numActions = sizeof(actionsToDo) / sizeof(actionsToDo[0]);

    this->timeWaitedUntilNextCatalysis += reactionTime;
	this->totaltimeElapsed += reactionTime;
	this->timeWaitedUntilNextTranslocation += reactionTime;
	this->totaltimeElapsedThisTrial += reactionTime;


	//cout << "reactionTime " << reactionTime << endl;

	//cout << "timeWaitedUntilNextTranslocation " << this->timeWaitedUntilNextTranslocation << endl;



    // Time per transcript length
    if (state->get_nascentLength() < this->timePerTranscriptLength.size()) this->timePerTranscriptLength.at(state->get_nascentLength()) += reactionTime;



	// If there has been a translocation action, add it to the distance~time chart, and update the time spent at this site
	bool thereWasATranslocation = false;
	for (int i = 0; i < numActions; i ++) {
		thereWasATranslocation = thereWasATranslocation || actionsToDo[i] == 0 || actionsToDo[i] == 1;
		if (actionsToDo[i] == 0) this->totalDisplacement--;
		if (actionsToDo[i] == 1) this->totalDisplacement++;
	}
	//cout << endl;

	if (thereWasATranslocation) {

		if (this->distanceVsTimeSize < this->distanceVsTimeSizeMax) { // Maximum size of the distance vs time object


			// Create array for this action sampling 
			this->distanceVsTimeSize += 2;
			vector<double> distanceTime(2);
			distanceTime.at(0) = 1.0 * rightHybridBase; // Distance (nt);
			distanceTime.at(1) = this->timeWaitedUntilNextTranslocation; // Time (s)

			// Add to list of distance-times
			//this->distanceVsTimeData.back().push_back(distanceTime);

		    // Add to list of unsent distance-times (may need to create this object again)
		    if (this->distanceVsTimeDataUnsent.size() == 0){
		    	vector<double> distanceTimeUnsent(3);
				distanceTimeUnsent.at(0) = 1.0 * rightHybridBase; // Distance (nt);
				distanceTimeUnsent.at(1) = this->timeWaitedUntilNextTranslocation; // Time (s)
				distanceTimeUnsent.at(2) = this->currentSimNumber;
		    	list<vector<double>> distanceTimeThisSimulation;
				distanceTimeThisSimulation.push_back(distanceTimeUnsent);
		    	this->distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);
		    	//cout << "new" << endl;
		    } else{
		    	this->distanceVsTimeDataUnsent.back().push_back(distanceTime);
		    }


			// Dwell time per site plot
			if (rightHybridBase < this->dwellTimePerSite.size()) this->dwellTimePerSite.at(rightHybridBase) += this->timeWaitedUntilNextTranslocation;


            

    		this->timeWaitedUntilNextTranslocation = 0;
			this->velocity = this->totalDisplacement / this->totaltimeElapsed;



		}

	}


	// If this is a catalysis event, add it to the pause histogram and if it is a misincorporation then add to misincorportion plot
	//cout << "lastAction " << lastAction << " state->NTPbound() " << state->NTPbound() << endl;
	bool thereWasACatalysis = lastAction == 3 && (state->NTPbound() || currentModel->get_assumeBindingEquilibrium());
	if (thereWasACatalysis) {


		// Dwell time histogram
		this->catalysisTimesThisTrial.push_back(this->timeWaitedUntilNextCatalysis);
		if (this->catalysisTimesSize < this->catalysisTimesSizeMax){

			this->catalysisTimesSize ++;
			this->catalysisTimes.back().push_back(this->timeWaitedUntilNextCatalysis);


			// Reinitialise the unsent list
			if (catalysisTimesUnsent.size() == 0){
				list<double> catalysisTimesTrial;
				catalysisTimesTrial.push_back(this->currentSimNumber * 1.0); // First element is the simulation number 
				catalysisTimesTrial.push_back(this->timeWaitedUntilNextCatalysis);
				this->catalysisTimes.push_back(catalysisTimesTrial);
				this->catalysisTimesUnsent.push_back(catalysisTimesTrial);
			}else{
				this->catalysisTimesUnsent.back().push_back(this->timeWaitedUntilNextCatalysis);
			}


		}


        if (state->getRightTemplateBaseNumber() < this->timeToCatalysisPerSite.size()) this->timeToCatalysisPerSite.at(state->getRightTemplateBaseNumber()) += this->timeWaitedUntilNextCatalysis;


		// Site specificity recording
		this->recordSite(rightHybridBase, this->timeWaitedUntilNextCatalysis);
		
		this->timeWaitedUntilNextCatalysis = 0;

	}



}



// Returns all unsent plot data as a JSON string and removes unsent data from memory
// Using '+=' instead of '+' a a string concatenator inside hot loops (see https://stackoverflow.com/questions/18892281/most-optimized-way-of-concatenation-in-strings)  
string Plots::getPlotDataAsJSON(){


	if (_USING_GUI && this->plotsAreHidden && this->sitewisePlotHidden && !this->sendCopiedSequences) return "{'moreData':false}";
	if (!this->plotsInit)  return "{'moreData':false}";
	//cout << "getPlotDataAsJSON" << endl;


	// Determine which types of data must be sent through to the controller (don't send everything or it may slow things down)
	bool distanceVsTime_needsData = false;
	bool pauseHistogram_needsData = false;
	bool pausePerSite_needsData = false;
	bool parameterHeatmap_needsData = false;
	bool terminatedSequences_needsData = this->unsentCopiedSequences.size() > 0 && this->sendCopiedSequences;
	for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
		if (!this->plotsAreHidden && this->plotSettings.at(pltNum) != nullptr && (this->plotSettings.at(pltNum)->getName() == "distanceVsTime" || this->plotSettings.at(pltNum)->getName() == "velocityHistogram")) distanceVsTime_needsData = true;
		else if (!this->plotsAreHidden && this->plotSettings.at(pltNum) != nullptr && this->plotSettings.at(pltNum)->getName() == "pauseHistogram") pauseHistogram_needsData = true;
		else if (!this->plotsAreHidden && this->plotSettings.at(pltNum) != nullptr && (this->plotSettings.at(pltNum)->getName() == "parameterHeatmap" || this->plotSettings.at(pltNum)->getName() == "tracePlot")) parameterHeatmap_needsData = true;
		else if (!this->sitewisePlotHidden && this->plotSettings.at(pltNum) != nullptr && 
							(this->plotSettings.at(pltNum)->getName() == "pauseSite" || this->plotSettings.at(pltNum)->getName() == "catalysisTimeSite")) pausePerSite_needsData = true;
		
			
	}


	if (!distanceVsTime_needsData && !pauseHistogram_needsData && !pausePerSite_needsData && !parameterHeatmap_needsData && !terminatedSequences_needsData) return "{'moreData':false}";


	// If at some point the JSON string reaches its maximum capacity then we will inform the controller that more data must be requested
	bool stringLengthHasBeenExceeded = false;


	this->plotDataJSON = "{";

	this->plotDataJSON += "'timeElapsed':" + to_string(this->totaltimeElapsedThisTrial);
	this->plotDataJSON += ",'velocity':" + to_string(this->velocity);
	this->plotDataJSON += ",'templateSeq':'" + currentSequence->get_templateSequence() + "'";
	this->plotDataJSON += ",'nbases':" + to_string(currentSequence->get_templateSequence().length());





	// Catalysis time histogram
	if (pauseHistogram_needsData) {


		//cout << "Asking for Catalysis time" << endl;

		// Turn unsent catalysis times object into a JSON
		this->plotDataJSON += ",'DWELL_TIMES_UNSENT':{";
		int nruns = 0;
		string times = "[";
		list<list<double>>::iterator it;
		int catalysisSiteNumber = 0;
		int exceededStringLengthAt_i = -1;
		int exceededStringLengthAt_j = -1;
		int nElements = -1;
		for (it = this->catalysisTimesUnsent.begin(); it != this->catalysisTimesUnsent.end(); ++it){

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

        		if (this->plotDataJSON.length() + times.length() >= this->maximumBytesJSON - 1000) {
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

			this->plotDataJSON += "'";
			this->plotDataJSON += to_string(simulationNum);
			this->plotDataJSON += "':";
			this->plotDataJSON += times;
			this->plotDataJSON += ",";	


			// Stop adding elements to the string now that we have gone past the maximum length
			if (exceededStringLengthAt_j != -1) break;


		}

		if (this->plotDataJSON.substr(this->plotDataJSON.length()-1, 1) == ",") this->plotDataJSON = this->plotDataJSON.substr(0, this->plotDataJSON.length() - 1);
		this->plotDataJSON += "}";





		// Erase all unsent elements which were successfully added to the string before memory was exceeded
		if (exceededStringLengthAt_i != -1) {
			if (exceededStringLengthAt_i > 0){
				list<list<double>>::iterator finalElementToDelete = this->catalysisTimesUnsent.begin();
				advance(finalElementToDelete, exceededStringLengthAt_i-1);
				this->catalysisTimesUnsent.erase(this->catalysisTimesUnsent.begin(), finalElementToDelete);
			}
		}
		else {

			this->catalysisTimesUnsent.clear();

			// Reinitialise the unsent data structure
			list<double> catalysisTimesTrial;
			catalysisTimesTrial.push_back(this->currentSimNumber * 1.0); // First element is the simulation number 
			this->catalysisTimes.push_back(catalysisTimesTrial);
			this->catalysisTimesUnsent.push_back(catalysisTimesTrial);


		}




	}


	// Sitewise pause time long plot. Only send the y-axis values that are required. Should need approximately 10L bytes to store this in the string 
	if (pausePerSite_needsData) {


		if (this->plotDataJSON.length() + 10 * this->dwellTimePerSite.size() < this->maximumBytesJSON){

			this->plotDataJSON += ",'npauseSimulations':" + to_string(this->npauseSimulations);




			if (this->plotSettings.at(3)->get_pauseSiteYVariable() == "catalysisTimes") {

				// Time to catalysis per site
				this->plotDataJSON += ",'pauseTimePerSite':[";
				for (int baseNum = 0; baseNum < this->timeToCatalysisPerSite.size(); baseNum ++){
					this->plotDataJSON += to_string(this->timeToCatalysisPerSite.at(baseNum));
					if (baseNum < this->timeToCatalysisPerSite.size()-1) this->plotDataJSON += ",";
				}
				this->plotDataJSON += "]";
			}

			else if (this->plotSettings.at(3)->get_pauseSiteYVariable() == "dwellTimes") {

				// Dwell time per site
				this->plotDataJSON += ",'pauseTimePerSite':[";
				for (int baseNum = 0; baseNum < this->dwellTimePerSite.size(); baseNum ++){
					this->plotDataJSON += to_string(this->dwellTimePerSite.at(baseNum));
					if (baseNum < this->dwellTimePerSite.size()-1) this->plotDataJSON += ",";
				}
				this->plotDataJSON += "]";
			}



            else if (this->plotSettings.at(3)->get_pauseSiteYVariable() == "timePerTranscriptLength") {

                // Dwell time per site
                this->plotDataJSON += ",'pauseTimePerSite':[";
                for (int baseNum = 0; baseNum < this->timePerTranscriptLength.size(); baseNum ++){
                    this->plotDataJSON += to_string(this->timePerTranscriptLength.at(baseNum));
                    if (baseNum < this->timePerTranscriptLength.size()-1) this->plotDataJSON += ",";
                }
                this->plotDataJSON += "]";
            }







		}else{
			stringLengthHasBeenExceeded = true;
			cout << "Maximum string size exceeded for dwell time per site plot." << endl;
		}

	}


	

	// Parameter heatmap data. This is stored in the settings for each individual plot (and will be added to the JSON in the section below)
	// But here we update the plot settings to include the new data 
	if (parameterHeatmap_needsData) {



		// Send through either simulated data or posterior data
		for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
			if (this->plotSettings.at(pltNum) != nullptr){

				// If a plot needs access to the posterior distribution then convert the respective posterior distribution into the appropriate format
				if (this->plotSettings.at(pltNum)->get_plotFromPosterior()){
					list<ParameterHeatmapData*> heatMapDataToSend = BayesianCalculations::getPosteriorDistributionAsHeatmap(this->plotSettings.at(pltNum)->getPosteriorDistributionID());
					this->plotSettings.at(pltNum)->updateHeatmapData(heatMapDataToSend);
				}

				// Send simulation data not Bayesian data
				else {
					this->plotSettings.at(pltNum)->updateHeatmapData(this->parametersPlotData);
				}


			}
		}



	}



	// Send through a list of terminated sequences which have not yet been sent through
	if (terminatedSequences_needsData) {

		this->plotDataJSON += ",'sequences':[";

		for (list<string>::iterator it = this->unsentCopiedSequences.begin(); it != this->unsentCopiedSequences.end(); ++it){

			this->plotDataJSON += "'" + (*it) + "'";


			// Add commas if there is another element in the list
			if (++it != this->unsentCopiedSequences.end()){
    			this->plotDataJSON += ",";	
    		}
    		--it;

		}


		this->plotDataJSON += "]";
		this->unsentCopiedSequences.clear();


	} 





	if (distanceVsTime_needsData) {

	
		// Turn unsent distance versus time object into a JSON
		this->plotDataJSON += ",'DVT_UNSENT':{";
		string distances;
		string times;
		list<vector<double>> simulationList;
		int nElements = -1;
		int exceededStringLengthAt_i = -1;
		int exceededStringLengthAt_j = -1;
		int distanceTimeNumber = 0;
		list<list<vector<double>>>::iterator it;
		list<vector<double>>::iterator j;
		for (it = this->distanceVsTimeDataUnsent.begin(); it != this->distanceVsTimeDataUnsent.end(); ++it){


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
			//cout << "size of this " << simulationList.size() << "size of parent " << this->distanceVsTimeDataUnsent.size() << endl;
			exceededStringLengthAt_j = -1;
			distanceTimeNumber = 0;
			for (j = simulationList.begin(); j != simulationList.end(); ++j){


				distanceTimeNumber ++;
				if ((*j).size() < 2 || int((*j).at(0)) <= 0) continue;
				distances += to_string(int((*j).at(0)));
				times += to_string((*j).at(1));

    			distances += ",";	
    			times += ",";	


        		if (this->plotDataJSON.length() + distances.length() + times.length() >= this->maximumBytesJSON - 1000) {
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


			this->plotDataJSON += "'";
			this->plotDataJSON += to_string(simulationNum);
			this->plotDataJSON += "':{'sim':";
			this->plotDataJSON += to_string(simulationNum);


			this->plotDataJSON += ",'distances':";
			this->plotDataJSON += distances;
			this->plotDataJSON += ",'times':";
			this->plotDataJSON += times;
			this->plotDataJSON += "}";
			this->plotDataJSON += ",";	


    		//cout << "distanceVsTimeDataUnsent_JSON length " << distanceVsTimeDataUnsent_JSON.length() << endl;

    		//cout << distanceVsTimeDataUnsent_JSON << endl;




			//cout << "c" << nElements << endl;


			// Stop adding elements to the string if we have gone past the maximum length
    		if (exceededStringLengthAt_j != -1) break;




		}



		if (this->plotDataJSON.substr(this->plotDataJSON.length()-1, 1) == ",") this->plotDataJSON = this->plotDataJSON.substr(0, this->plotDataJSON.length() - 1);
		this->plotDataJSON += "}";




		//cout << distanceVsTimeDataUnsent_JSON << endl;




		// Include median distance travelled
		if (this->distancesTravelledOnEachTemplate.size() > 0){
			int middleDistanceIndex = this->distancesTravelledOnEachTemplate.size() / 2;
			//cout << middleDistanceIndex << endl;
			this->plotDataJSON += ",'medianDistanceTravelledPerTemplate':" + to_string(this->distancesTravelledOnEachTemplate.at(middleDistanceIndex));
		}

		// Include median time travelled
		if (this->timesSpentOnEachTemplate.size() > 0){
			int middleTimeIndex = this->timesSpentOnEachTemplate.size() / 2;
			//cout << middleTimeIndex << endl;
			this->plotDataJSON += ",'medianTimeSpentOnATemplate':" + to_string(this->timesSpentOnEachTemplate.at(middleTimeIndex));
		}


		// Erase all unsent elements which were successfully added to the string before memory was exceeded
		if (exceededStringLengthAt_i != -1) {
			if (exceededStringLengthAt_i > 0){
				list<list<vector<double>>>::iterator finalElementToDelete = this->distanceVsTimeDataUnsent.begin();
				advance(finalElementToDelete, exceededStringLengthAt_i-1);
				//cout << "Erasing upto element " << exceededStringLengthAt_i-1 << endl;

				//cout << "length before " << this->distanceVsTimeDataUnsent.size() << endl;
				this->distanceVsTimeDataUnsent.erase(this->distanceVsTimeDataUnsent.begin(), finalElementToDelete);
				

				//cout << "length after " << this->distanceVsTimeDataUnsent.size() << endl;
			}
		}
		else {

			this->distanceVsTimeDataUnsent.clear();

			// Reinitialise the unsent data structure
			if (this->distanceVsTimeSize < this->distanceVsTimeSizeMax) {
				vector<double> distanceTimeUnsent(3);
				//distanceTimeUnsent.at(0) = 0; // Distance (nt);
				//distanceTimeUnsent.at(1) = this->timeWaitedUntilNextTranslocation; // Time (s)
				distanceTimeUnsent.at(2) = this->currentSimNumber;
		    	list<vector<double>> distanceTimeThisSimulation;
				distanceTimeThisSimulation.push_back(distanceTimeUnsent);
		    	this->distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);
	    	}

	    }



				
	}




	//cout << "Plots JSON = " << this->plotDataJSON << endl;

	// Plot settings. Parameter heatmap data will be added onto the whichPlotInWhichCanvas object
	string plotSettingsJSON = "'whichPlotInWhichCanvas':{";
	for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
		if (this->plotSettings.at(pltNum) != nullptr) plotSettingsJSON += "'" + to_string(pltNum+1) + "':{" +  this->plotSettings.at(pltNum)->toJSON() + "},";
	}



	if (plotSettingsJSON.substr(plotSettingsJSON.length()-1, 1) == ",") plotSettingsJSON = plotSettingsJSON.substr(0, plotSettingsJSON.length() - 1);
	plotSettingsJSON += "}";
	this->plotDataJSON += "," + plotSettingsJSON;

	//cout << "this->plotDataJSON " << this->plotDataJSON << endl;
	//cout << "C" << endl;


	this->plotDataJSON += ",'moreData':" + string(stringLengthHasBeenExceeded ? "true" : "false");


	return this->plotDataJSON + "}";


}



// User selects which plot should be used in a certain plot slot. Sets all plot settings to their defaults
void Plots::userSelectPlot(int plotNum, string value, bool deleteData){


	if (!_USING_GUI || !this->plotsInit) return;

	PlotSettings* newPlotSettings = new PlotSettings(plotNum, value);

	// Delete the PlotSettings which this one is replacing
	PlotSettings* toDelete = this->plotSettings.at(plotNum - 1);
	delete toDelete;
	this->plotSettings.at(plotNum - 1) = newPlotSettings;

	// If ABC has been running then set to posterior distribution
	this->plotSettings.at(plotNum - 1)->setPosteriorDistributionID(_currentLoggedPosteriorDistributionID, _currentLoggedPosteriorDistributionID > 0 ? "logPosterior" : "chiSq"); 



}


// Save the settings for a given plot
void Plots::savePlotSettings(int plotNum, string values_str){

	if (!_USING_GUI || !this->plotsInit) return;

	if (this->plotSettings.at(plotNum - 1) != nullptr) this->plotSettings.at(plotNum - 1)->savePlotSettings(values_str);

}



// Determine whether to stop sending data through to the controller
void Plots::hideSitewisePlot(bool toHide){
	this->sitewisePlotHidden = toHide;
}


// Determine whether to stop sending data through to the controller
void Plots::hideAllPlots(bool toHide){
	this->plotsAreHidden = toHide;
}


// Determine whether to stop sending copied sequences through to the controller
void Plots::set_sendCopiedSequences(bool toSend){
    this->sendCopiedSequences = toSend;
}




// Returns a JSON string which contains information on all the cache sizes
string Plots::getCacheSizeJSON(){

	if (!_USING_GUI || !this->plotsInit) return "";

	int parameterPlotSize = this->parametersPlotData.size() * this->parametersPlotData.back()->getVals().size();

	string JSON = "{";
	JSON += "'DVTsize':" + to_string(this->distanceVsTimeSize) + ",";
	JSON += "'timeSize':" + to_string(Plots::catalysisTimesSize) + ",";
	JSON += "'parameterPlotSize':" + to_string(parameterPlotSize);
	JSON += "}";

	return JSON;

}




void Plots::deletePlotData(State* stateToInitFor, bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata, bool sequences_cleardata){

	if (!_USING_GUI || !this->plotsInit) return;

	if (distanceVsTime_cleardata) {

		this->currentSimNumber = 1;
		this->distanceVsTimeSize = 2;
		this->distanceVsTimeData.clear();
		distanceVsTimeDataUnsent.clear();

		this->totalDisplacement = 0;
		this->totaltimeElapsed = 0;
		this->timeElapsed = 0;
		this->velocity = 0;

		this->distancesTravelledOnEachTemplate.clear();
		this->timesSpentOnEachTemplate.clear();


		// Initial distance and time for this simulation
		int rightHybridBase = stateToInitFor->getRightTemplateBaseNumber();
	
		vector<double> distanceTime(3);
		distanceTime.at(0) = rightHybridBase; // Distance (nt)
		distanceTime.at(1) = 0; // Time (s)
		distanceTime.at(2) = this->currentSimNumber; // Current simulation number stored in first double* of each simulation


		// List for this simulation only
		list<vector<double>> distanceTimeThisSimulation;
		distanceTimeThisSimulation.push_back(distanceTime);

		// List of all simulations
		//this->distanceVsTimeData.push_back(distanceTimeThisSimulation);
 		this->distanceVsTimeDataUnsent.push_back(distanceTimeThisSimulation);

	
	}

	if (timeHistogram_cleardata){
		this->catalysisTimesSize = 0;
		this->catalysisTimesUnsent.clear();
		this->catalysisTimes.clear();
		this->catalysisTimesThisTrial.clear();
		this->totaltimeElapsedThisTrial = 0;
	}

	if (customPlot_cleardata){


		// Reset the values in all lists
		for (list<ParameterHeatmapData*>::iterator it = this->parametersPlotData.begin(); it != this->parametersPlotData.end(); ++it){
			(*it)->deleteValues();
		}

		// Delete all site recordings data 
		for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
			if (this->plotSettings.at(pltNum) != nullptr) this->plotSettings.at(pltNum)->deleteSiteRecordings();
		}
	

	}



	if (timePerSite_cleardata){

		// Time to catalysis per site plot
		this->npauseSimulations = 1;
		this->timeToCatalysisPerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
		for (int baseNum = 0; baseNum < this->timeToCatalysisPerSite.size(); baseNum ++) {
			this->timeToCatalysisPerSite.at(baseNum) = 0.0;
		}


		// Dwell time per site plot
		this->dwellTimePerSite.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
		for (int baseNum = 0; baseNum < this->dwellTimePerSite.size(); baseNum ++) {
			this->dwellTimePerSite.at(baseNum) = 0.0;
		}


        // Time per transcript length
        this->timePerTranscriptLength.resize(currentSequence->get_templateSequence().length()+1); // This object is indexed starting from 1
        for (int baseNum = 0; baseNum < this->timePerTranscriptLength.size(); baseNum ++) {
            this->timePerTranscriptLength.at(baseNum) = 0.0;
        }



	}



	// Clear the list of unsent sequences
	if (sequences_cleardata){
		this->unsentCopiedSequences.clear();
		this->numberCopiedSequences = 0;
	}


	// Set non posterior distribution as the default option for all plots
	if (ABC_cleardata) {

		_currentLoggedPosteriorDistributionID = -1;
		for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
			if (this->plotSettings.at(pltNum) != nullptr) {
				this->plotSettings.at(pltNum)->setPosteriorDistributionID(-1, "chiSq");
			}

		}

	}
	


}


// Send through the current site and the time to catalysis at that site
// Each plot will determine whether or not to store that number
void Plots::recordSite(int siteThatWasJustCatalysed, double timeToCatalysis){
	if (!_USING_GUI || !this->plotsInit) return;
	for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
		if (this->plotSettings.at(pltNum) != nullptr) this->plotSettings.at(pltNum)->recordSite(siteThatWasJustCatalysed, timeToCatalysis);
	}
}


void Plots::addCopiedSequence(string sequence){
	if (!_USING_GUI || !this->plotsInit) return;
	if (this->numberCopiedSequences < this->maxNumberCopiedSequences) {
		this->numberCopiedSequences ++;
		this->unsentCopiedSequences.push_back(sequence);
	}
}


void Plots::prepareForABC(){

	if (!_USING_GUI || !this->plotsInit) return;

	// Set posterior distribution as the default option for all plots
	for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
		if (this->plotSettings.at(pltNum) != nullptr) this->plotSettings.at(pltNum)->setPosteriorDistributionID(0, "chiSq");
	}

}


// Set all open trace plots so that its posterior distribution is the one specified
void Plots::setTracePlotPosteriorByID(int id){

	for (int pltNum = 0; pltNum < this->plotSettings.size(); pltNum++){
		if (this->plotSettings.at(pltNum) != nullptr) this->plotSettings.at(pltNum)->setPosteriorDistributionID(id, id == 0 ? "chiSq" : "logPosterior");
	}

}



// Get a JSON string of time to catalysis per site
string Plots::timeToCatalysisPerSite_toJSON(){

    string JSON = "{'TTC':[";


    for (int baseNum = 0; baseNum < this->timeToCatalysisPerSite.size(); baseNum ++){
        JSON += to_string(this->timeToCatalysisPerSite.at(baseNum) / this->npauseSimulations);
        if (baseNum < this->timeToCatalysisPerSite.size()-1) JSON += ",";
    }
    JSON += "]}";
    return JSON;


}



// Returns a vector of the mean proportion of time spent at each length across the simulations
list<vector<double>> Plots::getProportionOfTimePerLength(){

    return this->proportionTimePerTranscriptLength;

}



// Returns a vector of tuples. Each tuple contains the mean and standard error of time to catalysis at that site
vector<vector<double>> Plots::getTimeToCatalysisPerSite(){


    vector<vector<double>> TTC(this->phyloPauseTimePerSite.size()-1);
    for (int baseNum = 1; baseNum < this->phyloPauseTimePerSite.size(); baseNum ++){
        TTC.at(baseNum-1).resize(4); // Mean, standard error of mean, median, standard error of median

        if (this->phyloPauseTimePerSite.at(baseNum).size() == 0){
            TTC.at(baseNum-1).at(0) = 0;
            TTC.at(baseNum-1).at(1) = 0;
            TTC.at(baseNum-1).at(2) = 0;
            TTC.at(baseNum-1).at(3) = 0; 
            continue;
        }


        // Calculate mean
        double meanTTC = 0;
        for (list<double>::iterator it = this->phyloPauseTimePerSite.at(baseNum).begin(); it != this->phyloPauseTimePerSite.at(baseNum).end(); ++it){
            meanTTC += *it;
        }
        meanTTC = meanTTC / this->phyloPauseTimePerSite.at(baseNum).size();


        // Calculate median
        this->phyloPauseTimePerSite.at(baseNum).sort();
        list<double>::iterator med = this->phyloPauseTimePerSite.at(baseNum).begin();
        std::advance(med, floor(this->phyloPauseTimePerSite.at(baseNum).size() / 2));
        double median = *med;


        // Calculate variance
        double variance = 0;
        for (list<double>::iterator it = this->phyloPauseTimePerSite.at(baseNum).begin(); it != this->phyloPauseTimePerSite.at(baseNum).end(); ++it){
            variance += pow(*it - meanTTC, 2);
        }
        variance = variance / this->phyloPauseTimePerSite.at(baseNum).size();


        // Standard error of mean
        double standardError = sqrt(variance / this->phyloPauseTimePerSite.at(baseNum).size());



        TTC.at(baseNum-1).at(0) = meanTTC;
        TTC.at(baseNum-1).at(1) = standardError;
        TTC.at(baseNum-1).at(2) = median;
        TTC.at(baseNum-1).at(3) = 1.253 * standardError; // Standard error of median is 1.253 * standard error of mean


    }



    return TTC;
}

