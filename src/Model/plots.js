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


PLOTS_JS = {};








PLOTS_JS.CURRENT_SIM_NUMBER = 1;

PLOTS_JS.DISTANCE_VS_TIME_SIZE = 0;
PLOTS_JS.DISTANCE_VS_TIME_SIZE_MAX = 1e8;
PLOTS_JS.DISTANCE_VS_TIME = [];
PLOTS_JS.DISTANCE_VS_TIME_UNSENT = {};

PLOTS_JS.DWELL_TIMES_SIZE = 0;
PLOTS_JS.DWELL_TIMES_SIZE_MAX = 1e6;
PLOTS_JS.DWELL_TIMES = [];
PLOTS_JS.DWELL_TIMES_UNSENT = {};
PLOTS_JS.DWELL_TIMES_THIS_TRIAL = [];

PLOTS_JS.PARAMETERS_PLOT_DATA = {};


PLOTS_JS.timesSpentOnEachTemplate = [0];
PLOTS_JS.distancesTravelledOnEachTemplate = [0];


PLOTS_JS.timeWaitedUntilNextTranslocation = 0;
PLOTS_JS.timeWaitedUntilNextCatalysis = 0;
PLOTS_JS.pauseTimePerSite = [];
PLOTS_JS.arrestCounts = [];
PLOTS_JS.misincorporationCounts = [];

PLOTS_JS.timeElapsed = 0;
PLOTS_JS.velocity = 0;
PLOTS_JS.totalDisplacement = 0;
PLOTS_JS.totaltimeElapsed = 0;
PLOTS_JS.npauseSimulations = 0;
PLOTS_JS.nabortionSimulations = 0;
PLOTS_JS.nMisincorporationSimulations = 0;
PLOTS_JS.plotsAreHidden = false;



PLOTS_JS.whichPlotInWhichCanvas = {};



 PLOTS_JS.refreshPlotData = function(){


 	
	
	if (PLOTS_JS.DISTANCE_VS_TIME_SIZE < PLOTS_JS.DISTANCE_VS_TIME_SIZE_MAX){
		PLOTS_JS.DISTANCE_VS_TIME_SIZE += 2;
		var rightHybridBase = WW_JS.currentState["rightGBase"] - WW_JS.currentState["mRNAPosInActiveSite"];
		PLOTS_JS.DISTANCE_VS_TIME.push({sim: PLOTS_JS.CURRENT_SIM_NUMBER, times: [0], distances: [rightHybridBase] });
		PLOTS_JS.DISTANCE_VS_TIME_UNSENT[PLOTS_JS.DISTANCE_VS_TIME.length] = {sim: PLOTS_JS.CURRENT_SIM_NUMBER, times: [0], distances: [rightHybridBase] };
	}


	PLOTS_JS.DWELL_TIMES_THIS_TRIAL = [];
	if (PLOTS_JS.DWELL_TIMES_SIZE < PLOTS_JS.DWELL_TIMES_SIZE_MAX){
		PLOTS_JS.DWELL_TIMES.push([]); // List i contains all the dwell times from the ith trial
		PLOTS_JS.DWELL_TIMES_UNSENT[PLOTS_JS.DWELL_TIMES.length] = [];	// List[i] contains all the dwell times from the ith trial
	}

	PLOTS_JS.timeElapsed = 0;
	PLOTS_JS.timeWaitedUntilNextTranslocation = 0;
	PLOTS_JS.timeWaitedUntilNextCatalysis = 0;

}


PLOTS_JS.refreshPlotDataSequenceChangeOnly_WW = function(resolve = function() { }, msgID = null){



	// There are two lists of distance/time data in the model
	// We have the master copy (PLOTS_JS.DISTANCE_VS_TIME) which contains all the information (having the master copy in the model might not be necessary)
	// We also have the temporary copy (PLOTS_JS.DISTANCE_VS_TIME_UNSENT) which contains all the information which hasn't been sent back to the controller
	// 		This second list is reset everytime we send data back, and the controller uses it to reconstruct the master copy on its end
	// 		This is to avoid sending the complete list of data back every time 
	PLOTS_JS.CURRENT_SIM_NUMBER = 1;
	PLOTS_JS.DISTANCE_VS_TIME_SIZE = 2;
	PLOTS_JS.DWELL_TIMES_SIZE = 0;
	PLOTS_JS.DISTANCE_VS_TIME = [];
	PLOTS_JS.DISTANCE_VS_TIME_UNSENT = {};
	var rightHybridBase = WW_JS.currentState["rightGBase"] - WW_JS.currentState["mRNAPosInActiveSite"];
	PLOTS_JS.DISTANCE_VS_TIME.push({sim: 1, times: [0], distances: [rightHybridBase] });
	PLOTS_JS.DISTANCE_VS_TIME_UNSENT[PLOTS_JS.DISTANCE_VS_TIME.length] = {sim: PLOTS_JS.DISTANCE_VS_TIME.length, times: [0], distances: [rightHybridBase] };
	PLOTS_JS.DWELL_TIMES = [];
	PLOTS_JS.DWELL_TIMES_UNSENT = {};
	PLOTS_JS.DWELL_TIMES_THIS_TRIAL = [];


	// Create a series of lists corresponding to the value of each parameter and each metric
	PLOTS_JS.PARAMETERS_PLOT_DATA = {};
	for (var paramID in PARAMS_JS.PHYSICAL_PARAMETERS){
		if (!PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["binary"]) PLOTS_JS.PARAMETERS_PLOT_DATA[paramID] = {name: PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["name"], vals: []};
	}
	PLOTS_JS.PARAMETERS_PLOT_DATA["probability"] = {name: "Probability density", vals: null};
	PLOTS_JS.PARAMETERS_PLOT_DATA["velocity"] = {name: "Mean velocity (bp/s)", vals: []};
	PLOTS_JS.PARAMETERS_PLOT_DATA["catalyTime"] = {name: "Mean catalysis time (s)", vals: []};
	PLOTS_JS.PARAMETERS_PLOT_DATA["totalTime"] = {name: "Total transcription time (s)", vals: []};
	PLOTS_JS.PARAMETERS_PLOT_DATA["nascentLen"] = {name: "Final nascent length (nt)", vals: []};


	PLOTS_JS.timesSpentOnEachTemplate = [0];
	PLOTS_JS.distancesTravelledOnEachTemplate = [0];
	PLOTS_JS.npauseSimulations = 1;
	PLOTS_JS.nabortionSimulations = 1;
	PLOTS_JS.nMisincorporationSimulations = 1;
	PLOTS_JS.totalDisplacement = 0;
	PLOTS_JS.totaltimeElapsed = 0;
	
	PLOTS_JS.pauseTimePerSite = new Array(WW_JS.currentState["nbases"]+1);
	for (var i = 0; i < PLOTS_JS.pauseTimePerSite.length; i ++) PLOTS_JS.pauseTimePerSite[i] = 0;
	
	PLOTS_JS.arrestCounts = new Array(WW_JS.currentState["nbases"]+1);
	for (var i = 0; i < PLOTS_JS.arrestCounts.length; i ++) PLOTS_JS.arrestCounts[i] = 0;
	
	PLOTS_JS.misincorporationCounts = new Array(WW_JS.currentState["nbases"]+1);
	for (var i = 0; i < PLOTS_JS.misincorporationCounts.length; i ++) {
		PLOTS_JS.misincorporationCounts[i] = {"A": 0, "C": 0, "G": 0, "T": 0, "U": 0};
	}

	
	for (var plotNum = 1; plotNum <= 3; plotNum++){
		if (PLOTS_JS.whichPlotInWhichCanvas[plotNum] != null && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "custom") {
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParam"]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customMetric"]];
		}
		
		if (PLOTS_JS.whichPlotInWhichCanvas[plotNum] != null && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamX"]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamY"]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[PLOTS_JS.whichPlotInWhichCanvas[plotNum]["metricZ"]];
		}
	}



	// Clear the ABC data
	ABC_JS.clearABCdata_WW();

	//console.log("Setting data", PLOTS_JS.arrestCounts, WW_JS.currentState["nbases"]);
	
	if (msgID != null){
		postMessage(msgID + "~X~done");
	}
	else resolve();
	


	
}


// Returns a string of the sequence stored inside primerSequence / templateSequence / complementSequence
 getSequenceOfObject_WW = function(nt_obj){
	
	var seq = "";
	for (var i = 1; i < nt_obj.length; i ++){
		seq += nt_obj[i]["base"];
	}
	return seq;
	
	
}




 PLOTS_JS.getPlotData_WW = function(forceUpdate = false, resolve = function(plotData) { }, msgID = null){
	


	var plotData = {};

	
	
	// Only send plot data which is needed
	if (PLOTS_JS.whichPlotInWhichCanvas[4] != null && !PLOTS_JS.plotsAreHidden && PLOTS_JS.whichPlotInWhichCanvas[4]["name"] == "abortionSite"){
		plotData["arrestCounts"] = PLOTS_JS.arrestCounts;
		plotData["nabortionSimulations"] = PLOTS_JS.nabortionSimulations;
	}else if (PLOTS_JS.whichPlotInWhichCanvas[4] != null && !PLOTS_JS.plotsAreHidden && PLOTS_JS.whichPlotInWhichCanvas[4]["name"] == "pauseSite"){
		plotData["pauseTimePerSite"] = PLOTS_JS.pauseTimePerSite;
		plotData["npauseSimulations"] = PLOTS_JS.npauseSimulations
	}else if (PLOTS_JS.whichPlotInWhichCanvas[4] != null && !PLOTS_JS.plotsAreHidden && PLOTS_JS.whichPlotInWhichCanvas[4]["name"] == "misincorporationSite"){
		plotData["misincorporationCounts"] = PLOTS_JS.misincorporationCounts;
		plotData["nMisincorporationSimulations"] = PLOTS_JS.nMisincorporationSimulations;
	}



	var distanceVsTime_needsData = 	 !PLOTS_JS.plotsAreHidden &&
									((PLOTS_JS.whichPlotInWhichCanvas[1] != null && PLOTS_JS.whichPlotInWhichCanvas[1]["name"] == "distanceVsTime") || 
			 						 (PLOTS_JS.whichPlotInWhichCanvas[2] != null && PLOTS_JS.whichPlotInWhichCanvas[2]["name"] == "distanceVsTime") || 
									 (PLOTS_JS.whichPlotInWhichCanvas[3] != null && PLOTS_JS.whichPlotInWhichCanvas[3]["name"] == "distanceVsTime"));

	var pauseHistogram_needsData = 	!PLOTS_JS.plotsAreHidden &&
									((PLOTS_JS.whichPlotInWhichCanvas[1] != null && PLOTS_JS.whichPlotInWhichCanvas[1]["name"] == "pauseHistogram") || 
			 						 (PLOTS_JS.whichPlotInWhichCanvas[2] != null && PLOTS_JS.whichPlotInWhichCanvas[2]["name"] == "pauseHistogram") || 
									 (PLOTS_JS.whichPlotInWhichCanvas[3] != null && PLOTS_JS.whichPlotInWhichCanvas[3]["name"] == "pauseHistogram"));

	var velocityHistogram_needsData = 	!PLOTS_JS.plotsAreHidden &&
										((PLOTS_JS.whichPlotInWhichCanvas[1] != null && PLOTS_JS.whichPlotInWhichCanvas[1]["name"] == "velocityHistogram") || 
			 						 	 (PLOTS_JS.whichPlotInWhichCanvas[2] != null && PLOTS_JS.whichPlotInWhichCanvas[2]["name"] == "velocityHistogram") || 
										 (PLOTS_JS.whichPlotInWhichCanvas[3] != null && PLOTS_JS.whichPlotInWhichCanvas[3]["name"] == "velocityHistogram"));
	
	
	if (distanceVsTime_needsData || velocityHistogram_needsData){


		//console.log("Sending", PLOTS_JS.DISTANCE_VS_TIME_UNSENT);
		plotData["DVT_UNSENT"] = PLOTS_JS.DISTANCE_VS_TIME_UNSENT;
		PLOTS_JS.DISTANCE_VS_TIME_UNSENT = {}; // Reset the list of unsent data
		PLOTS_JS.DISTANCE_VS_TIME_UNSENT[PLOTS_JS.DISTANCE_VS_TIME.length] = { sim: PLOTS_JS.CURRENT_SIM_NUMBER, times: [], distances: [] };


		plotData["PLOTS_JS.timeElapsed"] = PLOTS_JS.timeElapsed;
		plotData["velocity"] = PLOTS_JS.velocity;


				
	}


	if (pauseHistogram_needsData){

		plotData["DWELL_TIMES_UNSENT"] = PLOTS_JS.DWELL_TIMES_UNSENT;
		PLOTS_JS.DWELL_TIMES_UNSENT = {};
		PLOTS_JS.DWELL_TIMES_UNSENT[PLOTS_JS.DWELL_TIMES.length] = [];


		//console.log("Correct dwell times", PLOTS_JS.DWELL_TIMES);

	}


	if (pauseHistogram_needsData){
		//plotData["elongationDurations"] = elongationDurations;
	}


	if (velocityHistogram_needsData){
		//plotData["elongationDurations"] = elongationDurations;
	}

	
	var thereExistsAParameterPlot = !PLOTS_JS.plotsAreHidden &&
								 ((PLOTS_JS.whichPlotInWhichCanvas[1] != null && PLOTS_JS.whichPlotInWhichCanvas[1]["name"] == "custom") || 
			 					  (PLOTS_JS.whichPlotInWhichCanvas[2] != null && PLOTS_JS.whichPlotInWhichCanvas[2]["name"] == "custom") || 
			 				      (PLOTS_JS.whichPlotInWhichCanvas[3] != null && PLOTS_JS.whichPlotInWhichCanvas[3]["name"] == "custom") ||
			 				      (PLOTS_JS.whichPlotInWhichCanvas[1] != null && PLOTS_JS.whichPlotInWhichCanvas[1]["name"] == "parameterHeatmap") || 
			 					  (PLOTS_JS.whichPlotInWhichCanvas[2] != null && PLOTS_JS.whichPlotInWhichCanvas[2]["name"] == "parameterHeatmap") || 
			 				      (PLOTS_JS.whichPlotInWhichCanvas[3] != null && PLOTS_JS.whichPlotInWhichCanvas[3]["name"] == "parameterHeatmap"));




	// If a parameter plot/heatmap requires posterior data then send it
	if (ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length > 0){

		
		
		for (var plotNum = 1; plotNum <= 3; plotNum++){
			if (PLOTS_JS.whichPlotInWhichCanvas[plotNum] != null && !PLOTS_JS.plotsAreHidden && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"] && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "custom") {

				var valuesX = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParam"]);
				var valuesY = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customMetric"]);


				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["name"], vals:valuesX};
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["name"], vals:valuesY}; // WILL NOT WORK IF THIS METRIC WAS NOT SAMPLED

			}
		}



		for (var plotNum = 1; plotNum <= 3; plotNum++){

			if (!PLOTS_JS.plotsAreHidden && PLOTS_JS.whichPlotInWhichCanvas[plotNum] != null && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"] && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {



				var valuesX = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamX"]);
				var valuesY = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamY"]);
				var valuesZ = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["metricZ"]);

				//console.log("posterior", valuesX, valuesY, valuesZ, "PP", ABC_JS.ABC_POSTERIOR_DISTRIBUTION);


				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["name"], vals:valuesX};
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["name"], vals:valuesY};
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"]["name"], vals:valuesZ};

			}
		}



	}



	if (forceUpdate || JSON.stringify(plotData) != "{}" || thereExistsAParameterPlot){
	
		plotData["nbases"] = WW_JS.currentState["nbases"];
		plotData["templateSeq"] = getSequenceOfObject_WW(templateSequence);
		plotData["whichPlotInWhichCanvas"] = PLOTS_JS.whichPlotInWhichCanvas;
		plotData["xCoordOfRightMostBase"] = templateSequence[WW_JS.currentState["nbases"]-1]["x"];
		plotData["xCoordOfLeftMostBase"] = templateSequence[1]["x"];
		plotData["medianTimeSpentOnATemplate"] = PLOTS_JS.timesSpentOnEachTemplate[Math.floor(PLOTS_JS.timesSpentOnEachTemplate.length / 2)]; // List is already sorted
		plotData["medianDistanceTravelledPerTemplate"] = PLOTS_JS.distancesTravelledOnEachTemplate[Math.floor(PLOTS_JS.distancesTravelledOnEachTemplate.length / 2)]; // List is already sorted
		plotData["thereExistsPosteriorDistribution"] = ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length > 0;
	
	}



	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(plotData));
	}
	else resolve(plotData);
	
	return plotData;
	
	
	
}


 PLOTS_JS.plots_complete_simulation_WW = function(){


	// Update any custom plots
	PLOTS_JS.update_custom_plot_data_WW();
	PLOTS_JS.savePlotsToFiles_CommandLine();


	//PLOTS_JS.refreshPlotData();

	PLOTS_JS.CURRENT_SIM_NUMBER ++;
	PLOTS_JS.nabortionSimulations ++;
	PLOTS_JS.npauseSimulations++;
	PLOTS_JS.nMisincorporationSimulations ++;


	// If running from command line then delete all the cached plot data (but not ABC settings) so that memory usage does not increase over time
	if (RUNNING_FROM_COMMAND_LINE) {
		PLOTS_JS.deletePlots_WW(true, true, true, true, false);
	}


	
}


 PLOTS_JS.updatePlotData_WW = function(stateC, actionsToDo, reactionTime){
	

	var rightHybridBase = stateC[1] + stateC[0];

	var lastAction = actionsToDo[actionsToDo.length-1]; // The last element in the list was a kinetic action. 
														// Reactions before it were all equilibrium ones

	PLOTS_JS.totaltimeElapsed += reactionTime;
	PLOTS_JS.timeWaitedUntilNextTranslocation += reactionTime;
	PLOTS_JS.timeWaitedUntilNextCatalysis += reactionTime;
	

	// If we have been pausing too long, then abort
	if (PARAMS_JS.PHYSICAL_PARAMETERS["arrestTime"]["val"] > 0 && PARAMS_JS.PHYSICAL_PARAMETERS["arrestTime"]["val"] < PLOTS_JS.timeWaitedUntilNextCatalysis){
		var abortionSite = stateC[0] + 1;
		PLOTS_JS.arrestCounts[abortionSite] ++;
	}
	

	// If there has been a translocation action, add it to the distance~time chart, and update the time spent at this site
	if (actionsToDo.indexOf(0) != -1 || actionsToDo.indexOf(1) != -1) {
		

		if (PLOTS_JS.DISTANCE_VS_TIME_SIZE < PLOTS_JS.DISTANCE_VS_TIME_SIZE_MAX){ // Maximum size of the distance vs time object
			var index = PLOTS_JS.DISTANCE_VS_TIME.length-1;
			PLOTS_JS.DISTANCE_VS_TIME[index]["times"].push(PLOTS_JS.timeWaitedUntilNextTranslocation);
			PLOTS_JS.DISTANCE_VS_TIME[index]["distances"].push(rightHybridBase);
			PLOTS_JS.DISTANCE_VS_TIME_SIZE += 2;
			//console.log("Before", PLOTS_JS.DISTANCE_VS_TIME);
		    
			if (PLOTS_JS.DISTANCE_VS_TIME_UNSENT[index+1] == null) PLOTS_JS.DISTANCE_VS_TIME_UNSENT[index+1] = {sim: PLOTS_JS.CURRENT_SIM_NUMBER, times: [], distances: []};
			PLOTS_JS.DISTANCE_VS_TIME_UNSENT[index+1]["times"].push(PLOTS_JS.timeWaitedUntilNextTranslocation);
			PLOTS_JS.DISTANCE_VS_TIME_UNSENT[index+1]["distances"].push(rightHybridBase);
		}

		// Update total displacement
		PLOTS_JS.timeElapsed += PLOTS_JS.timeWaitedUntilNextTranslocation;
		PLOTS_JS.totalDisplacement += lastAction == 0 ? -1 : 1;
		PLOTS_JS.velocity = PLOTS_JS.totalDisplacement / PLOTS_JS.totaltimeElapsed;


		PLOTS_JS.pauseTimePerSite[rightHybridBase] += PLOTS_JS.timeWaitedUntilNextTranslocation;
		PLOTS_JS.timeWaitedUntilNextTranslocation = 0;
	}

	
	
	// If this is a catalysis event, add it to the pause histogram and if it is a misincorporation then add to misincorportion plot
	if (lastAction == 3 && stateC[2]) {


		// Dwell time histogram
		PLOTS_JS.DWELL_TIMES_THIS_TRIAL.push(PLOTS_JS.timeWaitedUntilNextCatalysis);
		if (PLOTS_JS.DWELL_TIMES_SIZE < PLOTS_JS.DWELL_TIMES_SIZE_MAX){
			var index = PLOTS_JS.DWELL_TIMES.length-1;
			if (PLOTS_JS.DWELL_TIMES[index] == null) {
				PLOTS_JS.DWELL_TIMES.push([]);
				index++;
			}
			PLOTS_JS.DWELL_TIMES[index].push(PLOTS_JS.timeWaitedUntilNextCatalysis);
			if (PLOTS_JS.DWELL_TIMES_UNSENT[index+1] == null) PLOTS_JS.DWELL_TIMES_UNSENT[index+1] = [];
			PLOTS_JS.DWELL_TIMES_UNSENT[index+1].push(PLOTS_JS.timeWaitedUntilNextCatalysis);
			PLOTS_JS.DWELL_TIMES_SIZE++;
		}


		// Pause duration histogram
		//sortedPush(elongationDurations, PLOTS_JS.timeWaitedUntilNextCatalysis)
		
		// Mutation?

		var siteNum = rightHybridBase;
		var baseCopyFrom = templateSequence[siteNum]["base"];
		var baseCopyTo = SIM_JS.SIMULATION_VARIABLES["baseToAdd"];
		if (correctPairs["" + baseCopyFrom + baseCopyTo] == null) PLOTS_JS.misincorporationCounts[siteNum][baseCopyTo] ++;
		
		PLOTS_JS.timeWaitedUntilNextCatalysis = 0;
	}
	
	

	


}



 PLOTS_JS.showPlot_WW = function(isHidden){

	PLOTS_JS.plotsAreHidden = isHidden;

}


 PLOTS_JS.selectPlot_WW = function(plotNum, value, deleteData, addData = true, resolve = function(plotData) { }, msgID = null){



	PLOTS_JS.whichPlotInWhichCanvas[plotNum] = {};
	PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] = value;


	
	// Initialise the appropriate plot
	if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "distanceVsTime") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plotTimeChart";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
	}

	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "pauseHistogram") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_pause_distribution";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["displayBottomProportionOf"] = 1;
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["perTime"] = "perCatalysis";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = "linearSpace";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = "linearSpace";
		
	}

	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "velocityHistogram") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_velocity_distribution";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["displayBottomProportionOf"] = 1;
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["windowSize"] = 1;
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = "linearSpace";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = "linearSpace";

	}
	
	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "pauseSite") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_time_vs_site";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yAxis"] = "timePercentage";
	}
	
	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "abortionSite") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_abortion_vs_site";
	}
	
	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "misincorporationSite") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_misincorporation_vs_site";
	}
	
	
	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "custom") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_custom";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["sitesToRecord"] = [];
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParam"] = "none";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customMetric"] = "probability";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"] = false;
	}


	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_parameter_heatmap";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["sitesToRecord"] = [];
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamX"] = "none";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamY"] = "none";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["metricZ"] = "probability";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zRange"] = "automaticZ";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zColouring"] = "blue";
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"] = false;

	}



	else if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"]  =="foldingBarrierPlot"){
		PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plotFoldingBarrier";
	}



	if (deleteData != null) PLOTS_JS.delete_plot_data_WW(deleteData);


	var plotData = {};
	if (addData){
		var plotData = PLOTS_JS.getPlotData_WW();
		if (plotData["whichPlotInWhichCanvas"] == null) plotData["whichPlotInWhichCanvas"] = PLOTS_JS.whichPlotInWhichCanvas;
	}
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(plotData));
	}else resolve(plotData);

}


 PLOTS_JS.saveSettings_WW = function(plotNum, plotType, values, resolve = function() { }, msgID = null ){


	console.log("Saving values", values);


	switch(plotType){


		case "distanceVsTime":
			if (values[0] == "automaticX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = Math.max(parseFloat(values[0][0]), 0);
				var xMax = parseFloat(values[0][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			if (values[0] == "automaticY") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
			else{
				var yMin = Math.max(parseFloat(values[1][0]), 1);
				var yMax = Math.max(parseFloat(values[1][1]), yMin+1);
				if (isNaN(yMin) || isNaN(yMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = [yMin, yMax];
			}

			break;

		case "pauseHistogram": // Save the proportion of values to display
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["perTime"] = values[0];


			if (values[1] == "automaticX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else if (values[1] == "pauseX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "pauseX";
			else if (values[1] == "shortPauseX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "shortPauseX";
			else{
				var xMin = Math.max(parseFloat(values[1][0]), 0);
				var xMax = parseFloat(values[1][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}

			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = values[2];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = values[3];


			break;


		case "velocityHistogram": // Save the proportion of values to display and the window size

			val = parseFloat(values[0]);
			if (!(val == null || isNaN(val) || val < 0.001)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["windowSize"] = val;


			if (values[1] == "automaticX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = parseFloat(values[1][0]);
				var xMax = parseFloat(values[1][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = values[2];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = values[3];


			break;


		case "pauseSite": // Save the y-axis variable
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yAxis"] = values[0];
			break;


		case "custom":

			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParam"] = values[0];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customMetric"] = values[1];
			//PLOTS_JS.whichPlotInWhichCanvas[plotNum]["sitesToRecord"] = values[2];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[values[0]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[values[1]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"] = values[4];

			// If sample from posterior use the correct points
			if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"]){
				var valuesX = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParam"]);
				var valuesY = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customMetric"]);
				PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["name"], vals:valuesX};
				PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["name"], vals:valuesY}; // WILL NOT WORK IF THIS METRIC WAS NOT SAMPLED
			}


			if (values[2] == "automaticX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = parseFloat(values[2][0]);
				var xMax = parseFloat(values[2][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			if (values[3] == "automaticY") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
			else{
				var yMin = parseFloat(values[3][0]);
				var yMax = Math.max(parseFloat(values[3][1]), yMin+1);
				if (isNaN(yMin) || isNaN(yMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = [yMin, yMax];
			}



			break;


		case "parameterHeatmap":

			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamX"] = values[0];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamY"] = values[1];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["metricZ"] = values[2];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[values[0]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[values[1]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[values[2]];
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zColouring"] = values[6]; // Colour of the points
			PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"] = values[7]; 



			// If sample from posterior use the correct points
			if (PLOTS_JS.whichPlotInWhichCanvas[plotNum]["plotFromPosterior"]){
				var valuesX = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamX"]);
				var valuesY = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["customParamY"]);
				var valuesZ = ABC_JS.getListOfValuesFromPosterior_WW(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["metricZ"]);
				PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["name"], vals:valuesX};
				PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["name"], vals:valuesY};
				PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"] = {name:PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"]["name"], vals:valuesZ};
			}

				



			if (values[3] == "automaticX") PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = parseFloat(values[3][0]);
				var xMax = parseFloat(values[3][1]);
				if (xMax <= xMin) xMax = xMin + 0.00001;
				if (isNaN(xMin) || isNaN(xMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			if (values[4] == "automaticY" || values[4] == null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
			else{
				var yMin = parseFloat(values[4][0]);
				var yMax = parseFloat(values[4][1]);
				if (yMax <= yMin) yMax = yMin + 0.00001;
				if (isNaN(yMin) || isNaN(yMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yRange"] = [yMin, yMax];
			}


			if (values[5] == "automaticZ" || values[5] == null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zRange"] = "automaticZ";
			else{
				var zMin = parseFloat(values[5][0]);
				var zMax = parseFloat(values[5][1]);
				if (zMax <= zMin) zMax = zMin + 0.00001;
				if (isNaN(zMin) || isNaN(zMax)) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zRange"] = "automaticZ";
				else PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zRange"] = [zMin, zMax];
			}




			break;

	}
	
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(PLOTS_JS.whichPlotInWhichCanvas));
	}else resolve(PLOTS_JS.whichPlotInWhichCanvas);
	
	
}



 PLOTS_JS.delete_plot_data_WW = function(plotName){
	

	
	// Only delete the data if noone else is using it
	for (var x in PLOTS_JS.whichPlotInWhichCanvas){
		if (PLOTS_JS.whichPlotInWhichCanvas[x]["name"] == plotName) return;
	}

	
	switch(plotName){
		
		case "distanceVsTime":
			PLOTS_JS.timeElapsed = 0;
			break;
			
		case "pauseHistogram":
			break
			
		case "pauseSite":
			PLOTS_JS.npauseSimulations = 1;
			PLOTS_JS.pauseTimePerSite = new Array(WW_JS.currentState["nbases"]+1);
			for (var i = 0; i < PLOTS_JS.pauseTimePerSite.length; i ++) PLOTS_JS.pauseTimePerSite[i] = 0;
			break;
			
		case "abortionSite":
			PLOTS_JS.nabortionSimulations = 1;
			PLOTS_JS.arrestCounts = new Array(WW_JS.currentState["nbases"]+1);
			for (var i = 0; i < PLOTS_JS.arrestCounts.length; i ++) PLOTS_JS.arrestCounts[i] = 0;
			break;
			
		case "misincorporationSite":
			PLOTS_JS.nMisincorporationSimulations = 1;
			PLOTS_JS.misincorporationCounts = new Array(WW_JS.currentState["nbases"]+1);
			for (var i = 0; i < PLOTS_JS.misincorporationCounts.length; i ++) {
				PLOTS_JS.misincorporationCounts[i] = {"A": 0, "C": 0, "G": 0, "T": 0, "U": 0};
			}
			break;
			
		case "custom":
			break;
		
	}
	

}






 PLOTS_JS.update_custom_plot_data_WW = function(){



	if (PLOTS_JS.DWELL_TIMES.length == 0) return; 



	var totalTime_thisTrial = 0;
	for (var timeNum = 0; timeNum < PLOTS_JS.DWELL_TIMES_THIS_TRIAL.length; timeNum ++){
		totalTime_thisTrial += PLOTS_JS.DWELL_TIMES_THIS_TRIAL[timeNum];
	}


	if (totalTime_thisTrial == 0) return;


	sortedPush_WW(PLOTS_JS.timesSpentOnEachTemplate, totalTime_thisTrial);
	var rightHybridBase = WW_JS.currentState["rightGBase"] - WW_JS.currentState["mRNAPosInActiveSite"];
	sortedPush_WW(PLOTS_JS.distancesTravelledOnEachTemplate, rightHybridBase);




	var increaseInPrimerLength = WW_JS.currentState["mRNALength"] - (PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] + PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"] + 2);
	//if(increaseInPrimerLength < 100) return; // Disqualify early terminations because they will skew everything
	var velocity_thisTrial = increaseInPrimerLength / totalTime_thisTrial;
	var meanDwellTime_thisTrial = totalTime_thisTrial / PLOTS_JS.DWELL_TIMES_THIS_TRIAL.length;
	


	// X value
	for (var paramID in PARAMS_JS.PHYSICAL_PARAMETERS){
		if (!PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["binary"]) PLOTS_JS.PARAMETERS_PLOT_DATA[paramID]["vals"].push(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"]) ;
	}


	// Y values
	PLOTS_JS.PARAMETERS_PLOT_DATA["velocity"]["vals"].push(velocity_thisTrial);
	PLOTS_JS.PARAMETERS_PLOT_DATA["totalTime"]["vals"].push(totalTime_thisTrial);
	PLOTS_JS.PARAMETERS_PLOT_DATA["catalyTime"]["vals"].push(meanDwellTime_thisTrial);
	PLOTS_JS.PARAMETERS_PLOT_DATA["nascentLen"]["vals"].push(WW_JS.currentState["mRNALength"]-1);


	// If ABC is being run then add the appropriate metrics to this list
	if (ABC_JS.ABC_simulating){
		if (ABC_JS.velocities_for_this_curve != null) ABC_JS.velocities_for_this_curve.push(velocity_thisTrial);
	}



	// Update the parameters on the list
	for (var canvasNum = 1; canvasNum <=3; canvasNum++){
		if (PLOTS_JS.whichPlotInWhichCanvas[canvasNum] != null && !PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["plotFromPosterior"] && PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["name"] == "custom"){

			var paramID = PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["customParam"];
			var metricID = PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["customMetric"];

			PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["xData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[paramID];
			PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["yData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[metricID];


		}

		else if (PLOTS_JS.whichPlotInWhichCanvas[canvasNum] != null && !PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["plotFromPosterior"] && PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["name"] == "parameterHeatmap") {

			var paramIDx = PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["customParamX"];
			var paramIDy = PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["customParamY"];
			var metricID = PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["metricZ"];

			PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["xData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[paramIDx];
			PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["yData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[paramIDy];
			PLOTS_JS.whichPlotInWhichCanvas[canvasNum]["zData"] = PLOTS_JS.PARAMETERS_PLOT_DATA[metricID];

		}


	}


	
}



/*
function setVariableToRecord_WW(plotCanvasID, varName, axis, resolve = function () { }, msgID = null){
	
	
	// Set the x variable data for this element
	if (axis == "x" && PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataIDX"] != varName) {
		
		PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataIDX"] = varName;
		PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataY"] = [];
		PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataX"] = [];
		
	}


	// Set the y variable data
	else if (axis == "y" && PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataIDY"] != varName) {
		
		PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataIDY"] = varName;
		PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataY"] = [];
		PLOTS_JS.whichPlotInWhichCanvas[plotCanvasID]["customDataX"] = [];
		
	}

	

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(PLOTS_JS.whichPlotInWhichCanvas));
	}
	
	else resolve(PLOTS_JS.whichPlotInWhichCanvas);

	
}
*/



 PLOTS_JS.getCacheSizes_WW = function(resolve = function() { }, msgID = null){



	var parameterPlotSize = -1;
	for (var i in PLOTS_JS.PARAMETERS_PLOT_DATA) parameterPlotSize++;
	parameterPlotSize *= PLOTS_JS.PARAMETERS_PLOT_DATA["velocity"]["vals"].length;


	var result = {DVTsize: PLOTS_JS.DISTANCE_VS_TIME_SIZE, timeSize: PLOTS_JS.DWELL_TIMES_SIZE, parameterPlotSize:parameterPlotSize};
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(result));
	}
	
	else resolve(result);


}


 PLOTS_JS.deletePlots_WW = function(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, resolve = function() { }, msgID = null){


	if (distanceVsTime_cleardata) {
		PLOTS_JS.DISTANCE_VS_TIME_SIZE = 2;
		PLOTS_JS.DISTANCE_VS_TIME = [];
		PLOTS_JS.DISTANCE_VS_TIME_UNSENT = {};
		var rightHybridBase = WW_JS.currentState["rightGBase"] - WW_JS.currentState["mRNAPosInActiveSite"];
		PLOTS_JS.DISTANCE_VS_TIME.push({sim: 1, times: [0], distances: [rightHybridBase] });
		PLOTS_JS.DISTANCE_VS_TIME_UNSENT[PLOTS_JS.DISTANCE_VS_TIME.length] = {sim: PLOTS_JS.DISTANCE_VS_TIME.length, times: [0], distances: [rightHybridBase] };
		PLOTS_JS.totalDisplacement = 0;
		PLOTS_JS.totaltimeElapsed = 0;
		if (!RUNNING_FROM_COMMAND_LINE)  PLOTS_JS.velocity = 0;
		PLOTS_JS.timeElapsed = 0;
		if (!RUNNING_FROM_COMMAND_LINE) PLOTS_JS.timesSpentOnEachTemplate = [0];
		PLOTS_JS.distancesTravelledOnEachTemplate = [0];
	
	}

	if (timeHistogram_cleardata){
		PLOTS_JS.DWELL_TIMES_SIZE = 0;
		PLOTS_JS.DWELL_TIMES = [];
		PLOTS_JS.DWELL_TIMES_UNSENT = {};
		PLOTS_JS.DWELL_TIMES_THIS_TRIAL = [];
	}

	if (customPlot_cleardata){

		// Create a series of lists corresponding to the value of each parameter and each metric
		PLOTS_JS.PARAMETERS_PLOT_DATA = {};
		for (var paramID in PARAMS_JS.PHYSICAL_PARAMETERS){
			if (!PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["binary"]) PLOTS_JS.PARAMETERS_PLOT_DATA[paramID] = {name: PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["name"], vals: []};
		}
		PLOTS_JS.PARAMETERS_PLOT_DATA["probability"] = {name: "Probability density", vals: null};
		PLOTS_JS.PARAMETERS_PLOT_DATA["velocity"] = {name: "Mean velocity (bp/s)", vals: []};
		PLOTS_JS.PARAMETERS_PLOT_DATA["catalyTime"] = {name: "Mean dwell time (s)", vals: []};
		PLOTS_JS.PARAMETERS_PLOT_DATA["totalTime"] = {name: "Total transcription time (s)", vals: []};
		PLOTS_JS.PARAMETERS_PLOT_DATA["nascentLen"] = {name: "Final nascent length (nt)", vals: []};





		for (var plotNum = 1; plotNum <= 3; plotNum++){
			if (PLOTS_JS.whichPlotInWhichCanvas[plotNum] != null && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "custom") {
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["vals"] = [];
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["vals"] = [];
			}
		}

		for (var plotNum = 1; plotNum <= 3; plotNum++){
			if (PLOTS_JS.whichPlotInWhichCanvas[plotNum] != null && PLOTS_JS.whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["xData"]["vals"] = [];
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["yData"]["vals"] = [];
				if(PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"] != null) PLOTS_JS.whichPlotInWhichCanvas[plotNum]["zData"]["vals"] = [];
			}
		}


	}



	if (timePerSite_cleardata){

		PLOTS_JS.pauseTimePerSite = new Array(WW_JS.currentState["nbases"]+1);
		for (var i = 0; i < PLOTS_JS.pauseTimePerSite.length; i ++) PLOTS_JS.pauseTimePerSite[i] = 0;
		PLOTS_JS.npauseSimulations = 1;
		/*
		PLOTS_JS.arrestCounts = new Array(WW_JS.currentState["nbases"]+1);
		for (var i = 0; i < PLOTS_JS.arrestCounts.length; i ++) PLOTS_JS.arrestCounts[i] = 0;
		
		PLOTS_JS.misincorporationCounts = new Array(WW_JS.currentState["nbases"]+1);
		for (var i = 0; i < PLOTS_JS.misincorporationCounts.length; i ++) {
			PLOTS_JS.misincorporationCounts[i] = {"A": 0, "C": 0, "G": 0, "T": 0, "U": 0};
		}
		*/


	}


	// Clear the data saved in the ABC output, and the posterior distribution
	if (ABC_cleardata) {
		ABC_JS.clearABCdata_WW();
	}
	

	PLOTS_JS.getPlotData_WW(false, resolve, msgID);


}




// Push data into its correct position in a sorted array
function sortedPush_WW( array, value ) {
	

	var index = binaryFind_WW(array, value);
	array.splice(index, 0, value);

	
   // array.splice( _.sortedIndex( array, value ), 0, value );
}


// Finds the position within a sorted array of numbers to add the new element
function binaryFind_WW(sortedArray, searchElement) {

  var minIndex = 0;
  var maxIndex = sortedArray.length - 1;
  var currentIndex;
  var currentElement;

  while (minIndex <= maxIndex) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = sortedArray[currentIndex];

    if (currentElement < searchElement) {
      minIndex = currentIndex + 1;
    }
    else if (currentElement > searchElement) {
      maxIndex = currentIndex - 1;
    }
    else {
      return currentIndex;
    }
  }      

  return currentElement < searchElement ? currentIndex + 1 : currentIndex;

}



PLOTS_JS.initialiseFileNames_CommandLine = function(){

	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null) return;

	// Create the data file names
	PLOTS_JS.dvt_fileName		= WW_JS.outputFolder + "distance_versus_time.tsv";
	PLOTS_JS.dwelltime_fileName = WW_JS.outputFolder + "catalysis_times.tsv";
	PLOTS_JS.params_fileName 	= WW_JS.outputFolder + "parameters.tsv";
	PLOTS_JS.pauseSite_fileName = WW_JS.outputFolder + "time_per_site.tsv";

}



PLOTS_JS.initialiseSaveFiles_CommandLine = function(startingTime){


	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null || ABC_JS.ABC_simulating) return;




	// Create the output folder if it does not already exist
	var fs = require('fs');
	if (!fs.existsSync(WW_JS.outputFolder)){
		console.log("Creating directory", WW_JS.outputFolder);
	    fs.mkdirSync(WW_JS.outputFolder);
	}



	WW_JS.writeLinesToFile(PLOTS_JS.dvt_fileName, "Distance versus time. " + startingTime + "\n");
	WW_JS.writeLinesToFile(PLOTS_JS.dwelltime_fileName, "Time taken to polymerise at each site. " + startingTime + "\n");
	WW_JS.writeLinesToFile(PLOTS_JS.params_fileName, "Parameter data. " + startingTime + "\n");
	WW_JS.writeLinesToFile(PLOTS_JS.pauseSite_fileName, "Sitewise pause data. " + startingTime + "\n");



	// Initialise the parameters file (column based not row based)
	var paramToPrint = "Trial\t";
	for (paramOrMetricID in PLOTS_JS.PARAMETERS_PLOT_DATA){
		if (paramOrMetricID == "probability" || PLOTS_JS.PARAMETERS_PLOT_DATA[paramOrMetricID]["vals"] == null) continue;
		if (PARAMS_JS.PHYSICAL_PARAMETERS[paramOrMetricID] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramOrMetricID]["hidden"]) continue;
		paramToPrint += paramOrMetricID + "\t";
	}
	WW_JS.writeLinesToFile(PLOTS_JS.params_fileName, paramToPrint + "\n", true);


}


// Saves the most recent simulation's data to its respective files
PLOTS_JS.savePlotsToFiles_CommandLine = function(){



	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null || ABC_JS.ABC_simulating) return;


	// Distance versus time
	var workerString = WW_JS.WORKER_ID == null ? "" : WW_JS.WORKER_ID + ".";
	var tsv = "";
	var DVT = PLOTS_JS.DISTANCE_VS_TIME[PLOTS_JS.DISTANCE_VS_TIME.length-1];
	tsv += "trial\t" + workerString + DVT["sim"] + "\n";
	var xvalsSim = DVT["times"];
	var yvalsSim = DVT["distances"];

	tsv += "times\t";
	for (var timeNum = 0; timeNum < xvalsSim.length; timeNum++){
		tsv += WW_JS.roundToSF_WW(xvalsSim[timeNum]) + "\t";
	}

	tsv += "\ndistances\t";
	for (var distanceNum = 0; distanceNum < yvalsSim.length; distanceNum++){
		tsv += yvalsSim[distanceNum] + "\t";
	}
	tsv += "\n\n";

	WW_JS.writeLinesToFile(PLOTS_JS.dvt_fileName, tsv, true);




	// Dwell time per site
	tsv = "";
	var dwelltimes = PLOTS_JS.DWELL_TIMES[0];
	tsv += "trial\t" + workerString + PLOTS_JS.CURRENT_SIM_NUMBER + "\n";
	tsv += "times\t";
	for (var timeNum = 0; timeNum < dwelltimes.length; timeNum++){
		tsv += WW_JS.roundToSF_WW(dwelltimes[timeNum]) + "\t";
	}
	tsv += "\n";

	WW_JS.writeLinesToFile(PLOTS_JS.dwelltime_fileName, tsv, true);



	// Parameter plot
	tsv = workerString + PLOTS_JS.CURRENT_SIM_NUMBER + "\t";
	for (paramOrMetricID in PLOTS_JS.PARAMETERS_PLOT_DATA){

		// Print the only value stored and reset the list of values
		if (paramOrMetricID == "probability" || PLOTS_JS.PARAMETERS_PLOT_DATA[paramOrMetricID]["vals"] == null) continue;
		if (PARAMS_JS.PHYSICAL_PARAMETERS[paramOrMetricID] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramOrMetricID]["hidden"]) continue;
		tsv += WW_JS.roundToSF_WW(PLOTS_JS.PARAMETERS_PLOT_DATA[paramOrMetricID]["vals"][0], 5) + "\t";
		PLOTS_JS.PARAMETERS_PLOT_DATA[paramOrMetricID]["vals"] = [];

	}

	WW_JS.writeLinesToFile(PLOTS_JS.params_fileName, tsv + "\n", true);


}


if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		DISTANCE_VS_TIME_SIZE: PLOTS_JS.DISTANCE_VS_TIME_SIZE,
		DISTANCE_VS_TIME_SIZE_MAX: PLOTS_JS.DISTANCE_VS_TIME_SIZE_MAX,
		DISTANCE_VS_TIME: PLOTS_JS.DISTANCE_VS_TIME,
		DISTANCE_VS_TIME_UNSENT: PLOTS_JS.DISTANCE_VS_TIME_UNSENT,
		DWELL_TIMES_SIZE: PLOTS_JS.DWELL_TIMES_SIZE,
		DWELL_TIMES_SIZE_MAX: PLOTS_JS.DWELL_TIMES_SIZE_MAX,
		DWELL_TIMES: PLOTS_JS.DWELL_TIMES,
		DWELL_TIMES_UNSENT: PLOTS_JS.DWELL_TIMES_UNSENT,
		DWELL_TIMES_THIS_TRIAL: PLOTS_JS.DWELL_TIMES_THIS_TRIAL,
		PARAMETERS_PLOT_DATA: PLOTS_JS.PARAMETERS_PLOT_DATA,
		timesSpentOnEachTemplate: PLOTS_JS.timesSpentOnEachTemplate,
		distancesTravelledOnEachTemplate: PLOTS_JS.distancesTravelledOnEachTemplate,
		timeWaitedUntilNextTranslocation: PLOTS_JS.timeWaitedUntilNextTranslocation,
		timeWaitedUntilNextCatalysis: PLOTS_JS.timeWaitedUntilNextCatalysis,
		pauseTimePerSite: PLOTS_JS.pauseTimePerSite,
		arrestCounts: PLOTS_JS.arrestCounts,
		misincorporationCounts: PLOTS_JS.misincorporationCounts,
		timeElapsed: PLOTS_JS.timeElapsed,
		velocity: PLOTS_JS.velocity,
		totalDisplacement: PLOTS_JS.totalDisplacement,
		totaltimeElapsed: PLOTS_JS.totaltimeElapsed,
		npauseSimulations: PLOTS_JS.npauseSimulations,
		nabortionSimulations: PLOTS_JS.nabortionSimulations,
		nMisincorporationSimulations: PLOTS_JS.nMisincorporationSimulations,
		whichPlotInWhichCanvas: PLOTS_JS.whichPlotInWhichCanvas,
		refreshPlotData: PLOTS_JS.refreshPlotData,
		refreshPlotDataSequenceChangeOnly_WW: PLOTS_JS.refreshPlotDataSequenceChangeOnly_WW,
		getPlotData_WW: PLOTS_JS.getPlotData_WW,
		plots_complete_simulation_WW: PLOTS_JS.plots_complete_simulation_WW,
		updatePlotData_WW: PLOTS_JS.updatePlotData_WW,
		showPlot_WW: PLOTS_JS.showPlot_WW,
		selectPlot_WW: PLOTS_JS.selectPlot_WW,
		saveSettings_WW: PLOTS_JS.saveSettings_WW,
		delete_plot_data_WW: PLOTS_JS.delete_plot_data_WW,
		update_custom_plot_data_WW: PLOTS_JS.update_custom_plot_data_WW,
		getCacheSizes_WW: PLOTS_JS.getCacheSizes_WW,
		deletePlots_WW: PLOTS_JS.deletePlots_WW,
		savePlotsToFiles_CommandLine: PLOTS_JS.savePlotsToFiles_CommandLine,
		initialiseSaveFiles_CommandLine: PLOTS_JS.initialiseSaveFiles_CommandLine,
		initialiseFileNames_CommandLine: PLOTS_JS.initialiseFileNames_CommandLine
	}

}
