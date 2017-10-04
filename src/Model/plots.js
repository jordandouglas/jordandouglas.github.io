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


DISTANCE_VS_TIME = [];
DISTANCE_VS_TIME_UNSENT = {};
DWELL_TIMES = [];
DWELL_TIMES_UNSENT = {};

PARAMETERS_PLOT_DATA = {};


timesSpentOnEachTemplate = [0];
distancesTravelledOnEachTemplate = [0];


timeWaitedUntilNextTranslocation = 0;
timeWaitedUntilNextCatalysis = 0;
pauseTimePerSite = [];
abortionCounts = [];
misincorporationCounts = [];
elongationDurations = [];

timeElapsed = 0;
meanVelocity = 0;
totalDisplacement = 0;
totalTimeElapsed = 0;
npauseSimulations = 0;
nabortionSimulations = 0;
nMisincorporationSimulations = 0;




whichPlotInWhichCanvas = {};



function refreshPlotData(){


	DISTANCE_VS_TIME.push({sim: DISTANCE_VS_TIME.length+1, times: [0], distances: [PHYSICAL_PARAMETERS["hybridLength"]["val"]] });
	DISTANCE_VS_TIME_UNSENT[DISTANCE_VS_TIME.length] = {sim: DISTANCE_VS_TIME.length, times: [0], distances: [PHYSICAL_PARAMETERS["hybridLength"]["val"]] };
	DWELL_TIMES.push([]); // List i contains all the dwell times from the ith trial
	DWELL_TIMES_UNSENT[DWELL_TIMES.length] = [];	// List[i] contains all the dwell times from the ith trial

	timeElapsed = 0;
	timeWaitedUntilNextTranslocation = 0;
	timeWaitedUntilNextCatalysis = 0;

}


function refreshPlotDataSequenceChangeOnly_WW(resolve = function() { }, msgID = null){

	// There are two lists of distance/time data in the model
	// We have the master copy (DISTANCE_VS_TIME) which contains all the information (having the master copy in the model might not be necessary)
	// We also have the temporary copy (DISTANCE_VS_TIME_UNSENT) which contains all the information which hasn't been sent back to the controller
	// 		This second list is reset everytime we send data back, and the controller uses it to reconstruct the master copy on its end
	// 		This is to avoid sending the complete list of data back every time 
	DISTANCE_VS_TIME = [];
	DISTANCE_VS_TIME_UNSENT = {};
	DISTANCE_VS_TIME.push({sim: 1, times: [0], distances: [PHYSICAL_PARAMETERS["hybridLength"]["val"]] });
	DISTANCE_VS_TIME_UNSENT[DISTANCE_VS_TIME.length] = {sim: DISTANCE_VS_TIME.length, times: [0], distances: [PHYSICAL_PARAMETERS["hybridLength"]["val"]] };
	DWELL_TIMES = [];
	DWELL_TIMES_UNSENT = {};


	// Create a series of lists corresponding to the value of each parameter and each metric
	PARAMETERS_PLOT_DATA = {};
	for (var paramID in PHYSICAL_PARAMETERS){
		if (!PHYSICAL_PARAMETERS[paramID]["binary"]) PARAMETERS_PLOT_DATA[paramID] = {name: PHYSICAL_PARAMETERS[paramID]["name"], vals: []};
	}
	PARAMETERS_PLOT_DATA["probability"] = {name: "Probability density", vals: null};
	PARAMETERS_PLOT_DATA["meanVelocity"] = {name: "Mean velocity (bp/s)", vals: []};
	PARAMETERS_PLOT_DATA["meanCatalysis"] = {name: "Mean catalysis time (s)", vals: []};
	PARAMETERS_PLOT_DATA["meanTranscription"] = {name: "Total transcription time (s)", vals: []};
	PARAMETERS_PLOT_DATA["nascentLength"] = {name: "Final nascent length (nt)", vals: []};


	timesSpentOnEachTemplate = [0];
	distancesTravelledOnEachTemplate = [0];
	elongationDurations = [];
	npauseSimulations = 1;
	nabortionSimulations = 1;
	nMisincorporationSimulations = 1;
	totalDisplacement = 0;
	totalTimeElapsed = 0;
	
	pauseTimePerSite = new Array(currentState["nbases"]+1);
	for (var i = 0; i < pauseTimePerSite.length; i ++) pauseTimePerSite[i] = 0;
	
	abortionCounts = new Array(currentState["nbases"]+1);
	for (var i = 0; i < abortionCounts.length; i ++) abortionCounts[i] = 0;
	
	misincorporationCounts = new Array(currentState["nbases"]+1);
	for (var i = 0; i < misincorporationCounts.length; i ++) {
		misincorporationCounts[i] = {"A": 0, "C": 0, "G": 0, "T": 0, "U": 0};
	}

	
	for (var plotNum = 1; plotNum <= 3; plotNum++){
		if (whichPlotInWhichCanvas[plotNum] != null && whichPlotInWhichCanvas[plotNum]["name"] == "custom") {
			whichPlotInWhichCanvas[plotNum]["xData"] = PARAMETERS_PLOT_DATA[whichPlotInWhichCanvas[plotNum]["customParam"]];
			whichPlotInWhichCanvas[plotNum]["yData"] = PARAMETERS_PLOT_DATA[whichPlotInWhichCanvas[plotNum]["customMetric"]];
		}
		
		if (whichPlotInWhichCanvas[plotNum] != null && whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {
			whichPlotInWhichCanvas[plotNum]["xData"] = PARAMETERS_PLOT_DATA[whichPlotInWhichCanvas[plotNum]["customParamX"]];
			whichPlotInWhichCanvas[plotNum]["yData"] = PARAMETERS_PLOT_DATA[whichPlotInWhichCanvas[plotNum]["customParamY"]];
			whichPlotInWhichCanvas[plotNum]["zData"] = PARAMETERS_PLOT_DATA[whichPlotInWhichCanvas[plotNum]["metricZ"]];
		}
	}

	
	//console.log("Setting data", abortionCounts, currentState["nbases"]);
	
	if (msgID != null){
		postMessage(msgID + "~X~done");
	}
	else resolve();
	


	
}


// Returns a string of the sequence stored inside primerSequence / templateSequence / complementSequence
function getSequenceOfObject_WW(nt_obj){
	
	var seq = "";
	for (var i = 1; i < nt_obj.length; i ++){
		seq += nt_obj[i]["base"];
	}
	return seq;
	
	
}




function getPlotData_WW(forceUpdate = false, resolve = function(plotData) { }, msgID = null){
	
	
	var plotData = {};

	
	
	// Only send plot data which is needed
	if (whichPlotInWhichCanvas[4] != null && !whichPlotInWhichCanvas[4]["hidden"] && whichPlotInWhichCanvas[4]["name"] == "abortionSite"){
		plotData["abortionCounts"] = abortionCounts;
		plotData["nabortionSimulations"] = nabortionSimulations;
	}else if (whichPlotInWhichCanvas[4] != null && !whichPlotInWhichCanvas[4]["hidden"] && whichPlotInWhichCanvas[4]["name"] == "pauseSite"){
		plotData["pauseTimePerSite"] = pauseTimePerSite;
		plotData["npauseSimulations"] = npauseSimulations
	}else if (whichPlotInWhichCanvas[4] != null && !whichPlotInWhichCanvas[4]["hidden"] && whichPlotInWhichCanvas[4]["name"] == "misincorporationSite"){
		plotData["misincorporationCounts"] = misincorporationCounts;
		plotData["nMisincorporationSimulations"] = nMisincorporationSimulations;
	}



	var distanceVsTime_needsData = 	(whichPlotInWhichCanvas[1] != null && !whichPlotInWhichCanvas[1]["hidden"] && whichPlotInWhichCanvas[1]["name"] == "distanceVsTime") || 
			 						(whichPlotInWhichCanvas[2] != null && !whichPlotInWhichCanvas[2]["hidden"] && whichPlotInWhichCanvas[2]["name"] == "distanceVsTime") || 
									(whichPlotInWhichCanvas[3] != null && !whichPlotInWhichCanvas[3]["hidden"] && whichPlotInWhichCanvas[3]["name"] == "distanceVsTime");

	var pauseHistogram_needsData = 	(whichPlotInWhichCanvas[1] != null && !whichPlotInWhichCanvas[1]["hidden"] && whichPlotInWhichCanvas[1]["name"] == "pauseHistogram") || 
			 						(whichPlotInWhichCanvas[2] != null && !whichPlotInWhichCanvas[2]["hidden"] && whichPlotInWhichCanvas[2]["name"] == "pauseHistogram") || 
									(whichPlotInWhichCanvas[3] != null && !whichPlotInWhichCanvas[3]["hidden"] && whichPlotInWhichCanvas[3]["name"] == "pauseHistogram");

	var velocityHistogram_needsData = 	(whichPlotInWhichCanvas[1] && !whichPlotInWhichCanvas[1]["hidden"] != null && whichPlotInWhichCanvas[1]["name"] == "velocityHistogram") || 
			 							(whichPlotInWhichCanvas[2] && !whichPlotInWhichCanvas[2]["hidden"] != null && whichPlotInWhichCanvas[2]["name"] == "velocityHistogram") || 
										(whichPlotInWhichCanvas[3] && !whichPlotInWhichCanvas[3]["hidden"] != null && whichPlotInWhichCanvas[3]["name"] == "velocityHistogram");
	
	
	if (distanceVsTime_needsData || velocityHistogram_needsData){


		//console.log("Sending", DISTANCE_VS_TIME_UNSENT);
		plotData["DISTANCE_VS_TIME_UNSENT"] = DISTANCE_VS_TIME_UNSENT;
		DISTANCE_VS_TIME_UNSENT = {}; // Reset the list of unsent data
		DISTANCE_VS_TIME_UNSENT[DISTANCE_VS_TIME.length] = { sim: DISTANCE_VS_TIME.length, times: [], distances: [] };


		plotData["timeElapsed"] = timeElapsed;
		plotData["meanVelocity"] = meanVelocity;


				
	}


	if (pauseHistogram_needsData){

		plotData["DWELL_TIMES_UNSENT"] = DWELL_TIMES_UNSENT;
		DWELL_TIMES_UNSENT = {};
		DWELL_TIMES_UNSENT[DWELL_TIMES.length] = [];


		//console.log("Correct dwell times", DWELL_TIMES);

	}


	if (pauseHistogram_needsData){
		//plotData["elongationDurations"] = elongationDurations;
	}


	if (velocityHistogram_needsData){
		//plotData["elongationDurations"] = elongationDurations;
	}

	
	var thereExistsAParameterPlot = (whichPlotInWhichCanvas[1] != null && !whichPlotInWhichCanvas[1]["hidden"] && whichPlotInWhichCanvas[1]["name"] == "custom") || 
			 					 (whichPlotInWhichCanvas[2] != null && !whichPlotInWhichCanvas[2]["hidden"] && whichPlotInWhichCanvas[2]["name"] == "custom") || 
			 				     (whichPlotInWhichCanvas[3] != null && !whichPlotInWhichCanvas[3]["hidden"] && whichPlotInWhichCanvas[3]["name"] == "custom") ||
			 				     (whichPlotInWhichCanvas[1] != null && !whichPlotInWhichCanvas[1]["hidden"] && whichPlotInWhichCanvas[1]["name"] == "parameterHeatmap") || 
			 					 (whichPlotInWhichCanvas[2] != null && !whichPlotInWhichCanvas[2]["hidden"] && whichPlotInWhichCanvas[2]["name"] == "parameterHeatmap") || 
			 				     (whichPlotInWhichCanvas[3] != null && !whichPlotInWhichCanvas[3]["hidden"] && whichPlotInWhichCanvas[3]["name"] == "parameterHeatmap");


	if (forceUpdate || JSON.stringify(plotData) != "{}" || thereExistsAParameterPlot){
	
		plotData["nbases"] = currentState["nbases"];
		plotData["templateSeq"] = getSequenceOfObject_WW(templateSequence);
		plotData["whichPlotInWhichCanvas"] = whichPlotInWhichCanvas;
		plotData["xCoordOfRightMostBase"] = templateSequence[currentState["nbases"]-1]["x"];
		plotData["xCoordOfLeftMostBase"] = templateSequence[1]["x"];
		plotData["medianTimeSpentOnATemplate"] = timesSpentOnEachTemplate[Math.floor(timesSpentOnEachTemplate.length / 2)]; // List is already sorted
		plotData["medianDistanceTravelledPerTemplate"] = distancesTravelledOnEachTemplate[Math.floor(distancesTravelledOnEachTemplate.length / 2)]; // List is already sorted

	
	}


	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(plotData));
	}
	else resolve(plotData);
	
	return plotData;
	
	
	
}


function plots_complete_simulation_WW(){


	// Update any custom plots
	update_custom_plot_data_WW();


	//refreshPlotData();

	nabortionSimulations ++;
	npauseSimulations++;
	nMisincorporationSimulations ++;









	
}


function updatePlotData_WW(stateC, actionNumber, reactionTime){
	

	var rightHybridBase = stateC[1] + stateC[0];

	totalTimeElapsed += reactionTime;
	timeWaitedUntilNextTranslocation += reactionTime;
	timeWaitedUntilNextCatalysis += reactionTime;
	

	// If we have been pausing too long, then abort
	if (PHYSICAL_PARAMETERS["arrestTimeout"]["val"] > 0 && PHYSICAL_PARAMETERS["arrestTimeout"]["val"] < timeWaitedUntilNextCatalysis){
		var abortionSite = stateC[0] + 1;
		abortionCounts[abortionSite] ++;
	}
	
	// If this is a translocation event, add it to the distance~time chart, and update the time spent at this site
	if (actionNumber < 2) {



		var index = DISTANCE_VS_TIME.length-1;
		DISTANCE_VS_TIME[index]["times"].push(timeWaitedUntilNextTranslocation);
		DISTANCE_VS_TIME[index]["distances"].push(rightHybridBase);


		timeElapsed += timeWaitedUntilNextTranslocation;
		

		// Update total displacement
		//var distanceTravelledThisStep = currentState["rightGBase"] - DISTANCE_VS_TIME[index]["distances"][DISTANCE_VS_TIME[index]["distances"].length-2];;
		totalDisplacement += actionNumber == 0 ? -1 : 1;
		meanVelocity = totalDisplacement / totalTimeElapsed;





		//console.log("Before", DISTANCE_VS_TIME);

	    
		if (DISTANCE_VS_TIME_UNSENT[index+1] == null) DISTANCE_VS_TIME_UNSENT[index+1] = {sim: index+1, times: [], distances: []};


		DISTANCE_VS_TIME_UNSENT[index+1]["times"].push(timeWaitedUntilNextTranslocation);
		DISTANCE_VS_TIME_UNSENT[index+1]["distances"].push(rightHybridBase);



		pauseTimePerSite[rightHybridBase] += timeWaitedUntilNextTranslocation;
		timeWaitedUntilNextTranslocation = 0;
	}
	
	
	// If this is a catalysis event, add it to the pause histogram and if it is a misincorporation then add to misincorportion plot
	if (actionNumber == 3 && stateC[2]) {


		// Dwell time histogram
		var index = DWELL_TIMES.length-1;
		if (DWELL_TIMES[index] == null) {
			DWELL_TIMES.push([]);
			index++;
		}
		DWELL_TIMES[index].push(timeWaitedUntilNextCatalysis);
		if (DWELL_TIMES_UNSENT[index+1] == null) DWELL_TIMES_UNSENT[index+1] = [];
		DWELL_TIMES_UNSENT[index+1].push(timeWaitedUntilNextCatalysis);


		// Pause duration histogram
		//sortedPush(elongationDurations, timeWaitedUntilNextCatalysis)
		
		// Mutation?

		var siteNum = rightHybridBase;
		var baseCopyFrom = templateSequence[siteNum]["base"];
		var baseCopyTo = SIMULATION_VARIABLES["baseToAdd"];
		if (correctPairs["" + baseCopyFrom + baseCopyTo] == null) misincorporationCounts[siteNum][baseCopyTo] ++;
		
		timeWaitedUntilNextCatalysis = 0;
	}
	
	

	


}



function showPlot_WW(plotNum, isHidden){

	if (whichPlotInWhichCanvas[plotNum] != null){
		whichPlotInWhichCanvas[plotNum]["hidden"] = isHidden;
	}

}


function selectPlot_WW(plotNum, value, deleteData, resolve = function(plotData) { }, msgID = null){



	whichPlotInWhichCanvas[plotNum] = {};
	whichPlotInWhichCanvas[plotNum]["name"] = value;
	whichPlotInWhichCanvas[plotNum]["hidden"] = false;


	
	// Initialise the appropriate plot
	if (whichPlotInWhichCanvas[plotNum]["name"] == "distanceVsTime") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plotTimeChart";
		whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
	}

	else if (whichPlotInWhichCanvas[plotNum]["name"] == "pauseHistogram") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_pause_distribution";
		whichPlotInWhichCanvas[plotNum]["displayBottomProportionOf"] = 1;
		whichPlotInWhichCanvas[plotNum]["perTime"] = "perCatalysis";
		whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = "linearSpace";
		whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = "linearSpace";
		
	}

	else if (whichPlotInWhichCanvas[plotNum]["name"] == "velocityHistogram") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_velocity_distribution";
		whichPlotInWhichCanvas[plotNum]["displayBottomProportionOf"] = 1;
		whichPlotInWhichCanvas[plotNum]["windowSize"] = 1;
		whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = "linearSpace";
		whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = "linearSpace";

	}
	
	else if (whichPlotInWhichCanvas[plotNum]["name"] == "pauseSite") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_time_vs_site";
		whichPlotInWhichCanvas[plotNum]["yAxis"] = "timePercentage";
	}
	
	else if (whichPlotInWhichCanvas[plotNum]["name"] == "abortionSite") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_abortion_vs_site";
	}
	
	else if (whichPlotInWhichCanvas[plotNum]["name"] == "misincorporationSite") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_misincorporation_vs_site";
	}
	
	
	else if (whichPlotInWhichCanvas[plotNum]["name"] == "custom") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_custom";
		whichPlotInWhichCanvas[plotNum]["sitesToRecord"] = [];
		whichPlotInWhichCanvas[plotNum]["customParam"] = "none";
		whichPlotInWhichCanvas[plotNum]["customMetric"] = "probability";
		whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";

	}


	else if (whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plot_parameter_heatmap";
		whichPlotInWhichCanvas[plotNum]["sitesToRecord"] = [];
		whichPlotInWhichCanvas[plotNum]["customParamX"] = "none";
		whichPlotInWhichCanvas[plotNum]["customParamY"] = "none";
		whichPlotInWhichCanvas[plotNum]["metricZ"] = "probability";
		whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
		whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
		whichPlotInWhichCanvas[plotNum]["zRange"] = "automaticZ";
		whichPlotInWhichCanvas[plotNum]["zColouring"] = "blue";

	}



	else if (whichPlotInWhichCanvas[plotNum]["name"]  =="foldingBarrierPlot"){
		whichPlotInWhichCanvas[plotNum]["plotFunction"] = "plotFoldingBarrier";
	}



	if (deleteData != null) delete_plot_data_WW(deleteData);


	var plotData = getPlotData_WW();
	if (plotData["whichPlotInWhichCanvas"] == null) plotData["whichPlotInWhichCanvas"] = whichPlotInWhichCanvas;

	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(plotData));
	}else resolve(plotData);

}


function saveSettings_WW(plotNum, plotType, values, resolve = function() { }, msgID = null ){


	console.log("Saving values", values);


	switch(plotType){


		case "distanceVsTime":
			if (values[0] == "automaticX") whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = Math.max(parseFloat(values[0][0]), 0);
				var xMax = parseFloat(values[0][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			if (values[0] == "automaticY") whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
			else{
				var yMin = Math.max(parseFloat(values[1][0]), 1);
				var yMax = Math.max(parseFloat(values[1][1]), yMin+1);
				if (isNaN(yMin) || isNaN(yMax)) whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
				else whichPlotInWhichCanvas[plotNum]["yRange"] = [yMin, yMax];
			}

			break;

		case "pauseHistogram": // Save the proportion of values to display
			whichPlotInWhichCanvas[plotNum]["perTime"] = values[0];


			if (values[1] == "automaticX") whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else if (values[1] == "pauseX") whichPlotInWhichCanvas[plotNum]["xRange"] = "pauseX";
			else if (values[1] == "shortPauseX") whichPlotInWhichCanvas[plotNum]["xRange"] = "shortPauseX";
			else{
				var xMin = Math.max(parseFloat(values[1][0]), 0);
				var xMax = parseFloat(values[1][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}

			whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = values[2];
			whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = values[3];


			break;


		case "velocityHistogram": // Save the proportion of values to display and the window size

			val = parseFloat(values[0]);
			if (!(val == null || isNaN(val) || val < 0.001)) whichPlotInWhichCanvas[plotNum]["windowSize"] = val;


			if (values[1] == "automaticX") whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = parseFloat(values[1][0]);
				var xMax = parseFloat(values[1][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			whichPlotInWhichCanvas[plotNum]["timeSpaceX"] = values[2];
			whichPlotInWhichCanvas[plotNum]["timeSpaceY"] = values[3];


			break;


		case "pauseSite": // Save the y-axis variable
			whichPlotInWhichCanvas[plotNum]["yAxis"] = values[0];
			break;


		case "custom":

			whichPlotInWhichCanvas[plotNum]["customParam"] = values[0];
			whichPlotInWhichCanvas[plotNum]["customMetric"] = values[1];
			//whichPlotInWhichCanvas[plotNum]["sitesToRecord"] = values[2];
			whichPlotInWhichCanvas[plotNum]["xData"] = PARAMETERS_PLOT_DATA[values[0]];
			whichPlotInWhichCanvas[plotNum]["yData"] = PARAMETERS_PLOT_DATA[values[1]];



			if (values[2] == "automaticX") whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = parseFloat(values[2][0]);
				var xMax = parseFloat(values[2][1]);
				if (xMax <= xMin) xMax = xMin + 0.1;
				if (isNaN(xMin) || isNaN(xMax)) whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			if (values[3] == "automaticY") whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
			else{
				var yMin = parseFloat(values[3][0]);
				var yMax = Math.max(parseFloat(values[3][1]), yMin+1);
				if (isNaN(yMin) || isNaN(yMax)) whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
				else whichPlotInWhichCanvas[plotNum]["yRange"] = [yMin, yMax];
			}
			break;


		case "parameterHeatmap":

			whichPlotInWhichCanvas[plotNum]["customParamX"] = values[0];
			whichPlotInWhichCanvas[plotNum]["customParamY"] = values[1];
			whichPlotInWhichCanvas[plotNum]["metricZ"] = values[2];
			whichPlotInWhichCanvas[plotNum]["xData"] = PARAMETERS_PLOT_DATA[values[0]];
			whichPlotInWhichCanvas[plotNum]["yData"] = PARAMETERS_PLOT_DATA[values[1]];
			whichPlotInWhichCanvas[plotNum]["zData"] = PARAMETERS_PLOT_DATA[values[2]];
			whichPlotInWhichCanvas[plotNum]["zColouring"] = values[6]; // Colour of the points


			if (values[3] == "automaticX") whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
			else{
				var xMin = parseFloat(values[3][0]);
				var xMax = parseFloat(values[3][1]);
				if (xMax <= xMin) xMax = xMin + 0.00001;
				if (isNaN(xMin) || isNaN(xMax)) whichPlotInWhichCanvas[plotNum]["xRange"] = "automaticX";
				else whichPlotInWhichCanvas[plotNum]["xRange"] = [xMin, xMax];
			}


			if (values[4] == "automaticY" || values[4] == null) whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
			else{
				var yMin = parseFloat(values[4][0]);
				var yMax = parseFloat(values[4][1]);
				if (yMax <= yMin) yMax = yMin + 0.00001;
				if (isNaN(yMin) || isNaN(yMax)) whichPlotInWhichCanvas[plotNum]["yRange"] = "automaticY";
				else whichPlotInWhichCanvas[plotNum]["yRange"] = [yMin, yMax];
			}


			if (values[5] == "automaticZ" || values[5] == null) whichPlotInWhichCanvas[plotNum]["zRange"] = "automaticZ";
			else{
				var zMin = parseFloat(values[5][0]);
				var zMax = parseFloat(values[5][1]);
				if (zMax <= zMin) zMax = zMin + 0.00001;
				if (isNaN(zMin) || isNaN(zMax)) whichPlotInWhichCanvas[plotNum]["zRange"] = "automaticZ";
				else whichPlotInWhichCanvas[plotNum]["zRange"] = [zMin, zMax];
			}



			break;

	}
	
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(whichPlotInWhichCanvas));
	}else resolve(whichPlotInWhichCanvas);
	
	
}



function delete_plot_data_WW(plotName){
	

	
	// Only delete the data if noone else is using it
	for (var x in whichPlotInWhichCanvas){
		if (whichPlotInWhichCanvas[x]["name"] == plotName) return;
	}

	
	switch(plotName){
		
		case "distanceVsTime":
			timeElapsed = 0;
			break;
			
		case "pauseHistogram":
			elongationDurations = [];
			break
			
		case "pauseSite":
			npauseSimulations = 1;
			pauseTimePerSite = new Array(currentState["nbases"]+1);
			for (var i = 0; i < pauseTimePerSite.length; i ++) pauseTimePerSite[i] = 0;
			break;
			
		case "abortionSite":
			nabortionSimulations = 1;
			abortionCounts = new Array(currentState["nbases"]+1);
			for (var i = 0; i < abortionCounts.length; i ++) abortionCounts[i] = 0;
			break;
			
		case "misincorporationSite":
			nMisincorporationSimulations = 1;
			misincorporationCounts = new Array(currentState["nbases"]+1);
			for (var i = 0; i < misincorporationCounts.length; i ++) {
				misincorporationCounts[i] = {"A": 0, "C": 0, "G": 0, "T": 0, "U": 0};
			}
			break;
			
		case "custom":
			break;
		
	}
	

	
	
}






function update_custom_plot_data_WW(){



	if (DWELL_TIMES.length == 0) return; 


	var totalTime_thisTrial = 0;
	for (var timeNum = 0; timeNum < DWELL_TIMES[DWELL_TIMES.length-1].length; timeNum ++){
		totalTime_thisTrial += DWELL_TIMES[DWELL_TIMES.length-1][timeNum];
	}


	if (totalTime_thisTrial == 0) return;


	sortedPush_WW(timesSpentOnEachTemplate, totalTime_thisTrial);
	sortedPush_WW(distancesTravelledOnEachTemplate, currentState["rightGBase"]);




	var increaseInPrimerLength = currentState["mRNALength"] - (PHYSICAL_PARAMETERS["hybridLength"]["val"] + PHYSICAL_PARAMETERS["bubbleSizeLeft"]["val"] + 2);
	//if(increaseInPrimerLength < 100) return; // Disqualify early terminations because they will skew everything
	var meanVelocity_thisTrial = increaseInPrimerLength / totalTime_thisTrial;
	var meanDwellTime_thisTrial = totalTime_thisTrial / DWELL_TIMES[DWELL_TIMES.length-1].length;
	


	// X value
	for (var paramID in PHYSICAL_PARAMETERS){
		if (!PHYSICAL_PARAMETERS[paramID]["binary"]) PARAMETERS_PLOT_DATA[paramID]["vals"].push(PHYSICAL_PARAMETERS[paramID]["val"]) ;
	}


	// Y values
	PARAMETERS_PLOT_DATA["meanVelocity"]["vals"].push(meanVelocity_thisTrial);
	PARAMETERS_PLOT_DATA["meanTranscription"]["vals"].push(totalTime_thisTrial);
	PARAMETERS_PLOT_DATA["meanCatalysis"]["vals"].push(meanDwellTime_thisTrial);
	PARAMETERS_PLOT_DATA["nascentLength"]["vals"].push(currentState["mRNALength"]-1);



	// Update the parameters on the list

	for (var canvasNum = 1; canvasNum <=3; canvasNum++){
		if (whichPlotInWhichCanvas[canvasNum] != null && whichPlotInWhichCanvas[canvasNum]["name"] == "custom"){

			var paramID = whichPlotInWhichCanvas[canvasNum]["customParam"];
			var metricID = whichPlotInWhichCanvas[canvasNum]["customMetric"];

			whichPlotInWhichCanvas[canvasNum]["xData"] = PARAMETERS_PLOT_DATA[paramID];
			whichPlotInWhichCanvas[canvasNum]["yData"] = PARAMETERS_PLOT_DATA[metricID];


		}

		else if (whichPlotInWhichCanvas[canvasNum] != null && whichPlotInWhichCanvas[canvasNum]["name"] == "parameterHeatmap") {

			var paramIDx = whichPlotInWhichCanvas[canvasNum]["customParamX"];
			var paramIDy = whichPlotInWhichCanvas[canvasNum]["customParamY"];
			var metricID = whichPlotInWhichCanvas[canvasNum]["metricZ"];

			whichPlotInWhichCanvas[canvasNum]["xData"] = PARAMETERS_PLOT_DATA[paramIDx];
			whichPlotInWhichCanvas[canvasNum]["yData"] = PARAMETERS_PLOT_DATA[paramIDy];
			whichPlotInWhichCanvas[canvasNum]["zData"] = PARAMETERS_PLOT_DATA[metricID];

		}


	}





	
}



/*
function setVariableToRecord_WW(plotCanvasID, varName, axis, resolve = function () { }, msgID = null){
	
	
	// Set the x variable data for this element
	if (axis == "x" && whichPlotInWhichCanvas[plotCanvasID]["customDataIDX"] != varName) {
		
		whichPlotInWhichCanvas[plotCanvasID]["customDataIDX"] = varName;
		whichPlotInWhichCanvas[plotCanvasID]["customDataY"] = [];
		whichPlotInWhichCanvas[plotCanvasID]["customDataX"] = [];
		
	}


	// Set the y variable data
	else if (axis == "y" && whichPlotInWhichCanvas[plotCanvasID]["customDataIDY"] != varName) {
		
		whichPlotInWhichCanvas[plotCanvasID]["customDataIDY"] = varName;
		whichPlotInWhichCanvas[plotCanvasID]["customDataY"] = [];
		whichPlotInWhichCanvas[plotCanvasID]["customDataX"] = [];
		
	}

	

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(whichPlotInWhichCanvas));
	}
	
	else resolve(whichPlotInWhichCanvas);

	
}
*/



function getCacheSizes_WW(resolve = function() { }, msgID = null){


	var DVTsize = 0;
	for (var i = 0; i < DISTANCE_VS_TIME.length; i ++){
		DVTsize += DISTANCE_VS_TIME[i]["distances"].length * 2; // Number of distance AND time measurements stored
	}

	var timeSize = 0;
	for (var i = 0; i < DWELL_TIMES.length; i ++){
		timeSize += DWELL_TIMES[i].length; // Number of distance AND time measurements stored
	}


	var parameterPlotSize = -1;
	for (var i in PARAMETERS_PLOT_DATA) parameterPlotSize++;
	parameterPlotSize *= PARAMETERS_PLOT_DATA["meanVelocity"]["vals"].length;


	var result = {DVTsize: DVTsize, timeSize: timeSize, parameterPlotSize:parameterPlotSize};
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(result));
	}
	
	else resolve(result);


}


function deletePlots_WW(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, resolve = function() { }, msgID = null){


	if (distanceVsTime_cleardata) {
		DISTANCE_VS_TIME = [];
		DISTANCE_VS_TIME_UNSENT = {};
		DISTANCE_VS_TIME.push({sim: 1, times: [0], distances: [PHYSICAL_PARAMETERS["hybridLength"]["val"]] });
		DISTANCE_VS_TIME_UNSENT[DISTANCE_VS_TIME.length] = {sim: DISTANCE_VS_TIME.length, times: [0], distances: [PHYSICAL_PARAMETERS["hybridLength"]["val"]] };
		totalDisplacement = 0;
		totalTimeElapsed = 0;
		meanVelocity = 0;
		timeElapsed = 0;
		timesSpentOnEachTemplate = [0];
		distancesTravelledOnEachTemplate = [0];
	
	}

	if (timeHistogram_cleardata){
		DWELL_TIMES = [];
		DWELL_TIMES_UNSENT = {};
	}

	if (customPlot_cleardata){

		// Create a series of lists corresponding to the value of each parameter and each metric
		PARAMETERS_PLOT_DATA = {};
		for (var paramID in PHYSICAL_PARAMETERS){
			if (!PHYSICAL_PARAMETERS[paramID]["binary"]) PARAMETERS_PLOT_DATA[paramID] = {name: PHYSICAL_PARAMETERS[paramID]["name"], vals: []};
		}
		PARAMETERS_PLOT_DATA["probability"] = {name: "Probability density", vals: null};
		PARAMETERS_PLOT_DATA["meanVelocity"] = {name: "Mean velocity (bp/s)", vals: []};
		PARAMETERS_PLOT_DATA["meanCatalysis"] = {name: "Mean dwell time (s)", vals: []};
		PARAMETERS_PLOT_DATA["meanTranscription"] = {name: "Total transcription time (s)", vals: []};
		PARAMETERS_PLOT_DATA["nascentLength"] = {name: "Final nascent length (nt)", vals: []};





		for (var plotNum = 1; plotNum <= 3; plotNum++){
			if (whichPlotInWhichCanvas[plotNum] != null && whichPlotInWhichCanvas[plotNum]["name"] == "custom") {
				if(whichPlotInWhichCanvas[plotNum]["xData"] != null) whichPlotInWhichCanvas[plotNum]["xData"]["vals"] = [];
				if(whichPlotInWhichCanvas[plotNum]["yData"] != null) whichPlotInWhichCanvas[plotNum]["yData"]["vals"] = [];
			}
		}

		for (var plotNum = 1; plotNum <= 3; plotNum++){
			if (whichPlotInWhichCanvas[plotNum] != null && whichPlotInWhichCanvas[plotNum]["name"] == "parameterHeatmap") {
				if(whichPlotInWhichCanvas[plotNum]["xData"] != null) whichPlotInWhichCanvas[plotNum]["xData"]["vals"] = [];
				if(whichPlotInWhichCanvas[plotNum]["yData"] != null) whichPlotInWhichCanvas[plotNum]["yData"]["vals"] = [];
				if(whichPlotInWhichCanvas[plotNum]["zData"] != null) whichPlotInWhichCanvas[plotNum]["zData"]["vals"] = [];
			}
		}


	}



	if (timePerSite_cleardata){

		pauseTimePerSite = new Array(currentState["nbases"]+1);
		for (var i = 0; i < pauseTimePerSite.length; i ++) pauseTimePerSite[i] = 0;
		npauseSimulations = 1;
		/*
		abortionCounts = new Array(currentState["nbases"]+1);
		for (var i = 0; i < abortionCounts.length; i ++) abortionCounts[i] = 0;
		
		misincorporationCounts = new Array(currentState["nbases"]+1);
		for (var i = 0; i < misincorporationCounts.length; i ++) {
			misincorporationCounts[i] = {"A": 0, "C": 0, "G": 0, "T": 0, "U": 0};
		}
		*/


	}
	

	getPlotData_WW(resolve, msgID);


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




