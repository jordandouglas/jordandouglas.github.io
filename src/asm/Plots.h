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


	static int currentSimNumber;

	// Distance versus time plot data
	static int distanceVsTimeSize;
	static const int distanceVsTimeSizeMax;
	static list<list<vector<double>>> distanceVsTimeData; // Position of the polymerase over all time
	static list<list<vector<double>>> distanceVsTimeDataUnsent; // Data which has not yet been sent to the DOM (subset of distanceVsTimeData)
	static vector<int> distancesTravelledOnEachTemplate; // Sorted list of distances travelled. Sorted so that it is easy to calculate the median
	static vector<double> timesSpentOnEachTemplate; // Sorted list of times taken per template. Sorted so that it is easy to calculate the median



	// Catalysis time histogram data
	static int catalysisTimesSize;
	static int const catalysisTimesSizeMax;
	static list<list<double>> catalysisTimes;
	static list<list<double>> catalysisTimesUnsent;
	static list<double> catalysisTimesThisTrial;



	// Pause time per site plot data
	static int npauseSimulations;
	static vector<double> pauseTimePerSite;


	// Parameter heatmap data
	static list<ParameterHeatmapData*> parametersPlotData;


	// Copied sequences (only the ones that have not been sent to the controller)
	static list<string> unsentCopiedSequences;


	// Miscellaneous information
	static double timeElapsed;
	static double velocity;
	static int totalDisplacement;
	static double totaltimeElapsed;
	static double totaltimeElapsedThisTrial;
	//static int nabortionSimulations;
	//static int nMisincorporationSimulations;
	static bool plotsAreHidden;
	static bool arrestTimeoutReached;
	static double timeWaitedUntilNextTranslocation;
	static double timeWaitedUntilNextCatalysis;


	// Plot settings
	static vector<PlotSettings*> plotSettings;



	public:

		
		static void init();
		static void refreshPlotData(State* state); // Prepare for the next simulation
		static void updatePlotData(State* state, int* actionsToDo, double reactionTime); // Sends through information from the current simulation into the plot
		static string getPlotDataAsJSON(); // Returns the plot data in JSON format. Will modify the class
		static void userSelectPlot(int plotNum, string value, bool deleteData);
		static void savePlotSettings(int plotNum, string values_str);
		static void updateParameterPlotData(State* state);
		static void hideAllPlots(bool hide);
		static string getCacheSizeJSON();
		static void deletePlotData(State* stateToInitFor, bool distanceVsTime_cleardata, bool timeHistogram_cleardata, bool timePerSite_cleardata, bool customPlot_cleardata, bool ABC_cleardata, bool sequences_cleardata);
		static void addCopiedSequence(string sequence);

};

#endif

