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


#ifndef PLOTS_H
#define PLOTS_H


#include "State.h"
#include "PlotSettings.h"
#include "ParameterHeatmapData.h"


#include <string>
#include <list>


class Plots{


	int currentSimNumber;
	bool plotsInit;

	size_t maximumBytesJSON;
	string plotDataJSON;

	// Distance versus time plot data
	int distanceVsTimeSize;
	int distanceVsTimeSizeMax;
	list<list<vector<double>>> distanceVsTimeData; // Position of the polymerase over all time
	list<list<vector<double>>> distanceVsTimeDataUnsent; // Data which has not yet been sent to the DOM (subset of distanceVsTimeData)
	vector<int> distancesTravelledOnEachTemplate; // Sorted list of distances travelled. Sorted so that it is easy to calculate the median
	vector<double> timesSpentOnEachTemplate; // Sorted list of times taken per template. Sorted so that it is easy to calculate the median



	// Catalysis time histogram data
	int catalysisTimesSize;
	int catalysisTimesSizeMax;
	list<list<double>> catalysisTimes;
	list<list<double>> catalysisTimesUnsent;
	list<double> catalysisTimesThisTrial;



	// Pause time per site plot data
	int npauseSimulations;
	vector<double> timeToCatalysisPerSite;
	vector<double> dwellTimePerSite;
    vector<double> timePerTranscriptLength;
    list<vector<double>> proportionTimePerTranscriptLength;


    // PhyloPause pause distribution per plot data
    vector<list<double>> phyloPauseTimePerSite;


	// Parameter heatmap data
	list<ParameterHeatmapData*> parametersPlotData;


	// Copied sequences (only the ones that have not been sent to the controller)
	list<string> unsentCopiedSequences;
	int maxNumberCopiedSequences;
	int numberCopiedSequences;
    bool sendCopiedSequences;


	// Miscellaneous information
	double timeElapsed;
	double velocity;
	int totalDisplacement;
	double totaltimeElapsed;
	double totaltimeElapsedThisTrial;
	//int nabortionSimulations;
	//int nMisincorporationSimulations;
	bool sitewisePlotHidden;
	bool plotsAreHidden;
	bool arrestTimeoutReached;
	double timeWaitedUntilNextTranslocation;
	double timeWaitedUntilNextCatalysis;


	// Plot settings
	vector<PlotSettings*> plotSettings;



	public:


        Plots();
		
		void init();
		void refreshPlotData(State* state); // Prepare for the next simulation
        void update_timeWaitedUntilNextCatalysis(int baseNumber);
		void updatePlotData(State* state, int lastAction, int* actionsToDo, double reactionTime); // Sends through information from the current simulation into the plot
		string getPlotDataAsJSON(); // Returns the plot data in JSON format. Will modify the class
		void userSelectPlot(int plotNum, string value, bool deleteData);
		void savePlotSettings(int plotNum, string values_str);
		void updateParameterPlotData(State* state);
		void resetTimeToCatalysis();

		void hideSitewisePlot(bool hide);
		void hideAllPlots(bool hide);
        void set_sendCopiedSequences(bool toSend);
		string getCacheSizeJSON();
        void clear();
		void deletePlotData(State* stateToInitFor, bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata, bool sequences_cleardata);
		void recordSite(int siteThatWasJustCatalysed, double timeToCatalysis);
		void addCopiedSequence(string sequence);
		void prepareForABC();
		void setTracePlotPosteriorByID(int id);
        string timeToCatalysisPerSite_toJSON();
        vector<vector<double>> getTimeToCatalysisPerSite();
        list<vector<double>> getProportionOfTimePerLength();

};

#endif

