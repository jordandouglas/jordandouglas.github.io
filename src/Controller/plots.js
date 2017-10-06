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

function initPlots(){

	PLOT_DATA = {};
	DWELL_TIMES_CONTROLLER = [];
	VELOCITIES = [];
	DISTANCE_VS_TIME_CONTROLLER = [];

	variableSelectionMode = false;
	haveShownDVTerrorMessage = false; // If the distance versus time plot contains too much data it slows down the program.
									  // Show an error message once if the number of points becomes too great

	$("#plotDIV4").hide();

	$("#selectPlot1").val("none");
	$("#selectPlot2").val("none");
	$("#selectPlot3").val("none");
	$("#selectPlot4").val("none");




}


function update_DWELL_TIMES_CONTROLLER(DWELL_TIMES_UNSENT){


	if (DWELL_TIMES_UNSENT == null) return;


	// Add the new distance and time values to the pre-existing lists
	for (var simNum in DWELL_TIMES_UNSENT){

		if (simNum < 1) continue;
		if (DWELL_TIMES_CONTROLLER[simNum-1] == null) DWELL_TIMES_CONTROLLER[simNum-1] = [];

		for (var j = 0; j < DWELL_TIMES_UNSENT[simNum].length; j ++){

			// Update the dwell times list and sort it as we go
			sortedPush(DWELL_TIMES_CONTROLLER[simNum-1], DWELL_TIMES_UNSENT[simNum][j]);


		}

	}



}



function update_DISTANCE_VS_TIME(DISTANCE_VS_TIME_UNSENT){


	if (DISTANCE_VS_TIME_UNSENT == null) return;


	// Add the new distance and time values to the pre-existing lists
	for (var simNum in DISTANCE_VS_TIME_UNSENT){

		//if (DISTANCE_VS_TIME_UNSENT[simNum] == null) continue;

		if (DISTANCE_VS_TIME_CONTROLLER[simNum-1] == null) DISTANCE_VS_TIME_CONTROLLER[simNum-1] = {sim: simNum, times: [], distances: []};
		if (VELOCITIES[simNum-1] == null) VELOCITIES[simNum-1] = {sim: simNum, times: [], distances: []};
		var DVT = DISTANCE_VS_TIME_CONTROLLER[simNum-1];
		var VELO = VELOCITIES[simNum-1];
		for (var j = 0; j < DISTANCE_VS_TIME_UNSENT[simNum]["times"].length; j ++){


			// Update the distance vs time list
			DVT["times"].push(DISTANCE_VS_TIME_UNSENT[simNum]["times"][j]);
			DVT["distances"].push(DISTANCE_VS_TIME_UNSENT[simNum]["distances"][j]);





			// Update the velocity list
			var prevTime = VELO["times"].length >= 1 ? VELO["times"][VELO["times"].length-1] : 0; // Add zero or the last entry to get accumulative time
			VELO["times"].push(DISTANCE_VS_TIME_UNSENT[simNum]["times"][j] + prevTime);
			VELO["distances"].push(DISTANCE_VS_TIME_UNSENT[simNum]["distances"][j]);
			
				
			//var velocity = (DVT["distances"][lastIndex] - DVT["distances"][lastIndex-1]) / DISTANCE_VS_TIME_UNSENT[simNum]["times"][j];
			//console.log("travelled from", DVT["distances"][lastIndex-1], "to", DVT["distances"][lastIndex], "in time", DISTANCE_VS_TIME_UNSENT[simNum]["times"][j], "velocity", velocity);
			//sortedPush(VELOCITIES, velocity);



		}



	}

	//console.log("Got", DISTANCE_VS_TIME_CONTROLLER);


}



function drawPlots(forceUpdate = false){
	
	
	// Only make a request if there exists a visible plot
	//console.log("visibilities", $("#plotDIV1").is(":visible"), $("#plotDIV2").is(":visible"), $("#plotDIV3").is(":visible"), $("#plotDIV4").is(":visible"));
	if (!$("#plotDIV1").is(":visible") && !$("#plotDIV2").is(":visible") && !$("#plotDIV3").is(":visible") && !$("#plotDIV4").is(":visible")) return;
	
	var toCall = () => new Promise((resolve) => getPlotData_controller(forceUpdate, resolve));
	toCall().then((plotData) => {


			//console.log("Received data", plotData);
			update_PLOT_DATA(plotData)
	
			window.requestAnimationFrame(function(){
				for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
					if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "none" && PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "custom" && PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plt]["plotFunction"])();
					else if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "custom" || PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plt]["plotFunction"])(plt);
				}
			});
	
	
	});
	

}



function update_PLOT_DATA(plotData){

	PLOT_DATA = plotData;


	// Add the new values to the DISTANCE_VS_TIME_CONTROLLER data structure
	update_DISTANCE_VS_TIME(plotData["DISTANCE_VS_TIME_UNSENT"]);

	// Update the dwell times
	update_DWELL_TIMES_CONTROLLER(plotData["DWELL_TIMES_UNSENT"]);

}


function sequenceChangeRefresh(){


	console.log("sequenceChangeRefresh");

	resetAllPlots();

	PLOT_DATA = {};
	DWELL_TIMES_CONTROLLER = [];
	VELOCITIES = [];
	DISTANCE_VS_TIME_CONTROLLER = [];
	

	
}


function resetAllPlots(){


	if (PLOT_DATA["whichPlotInWhichCanvas"] == null) return;
	basesToDisplayTimes100 = 1;
	haveShownDVTerrorMessage = false;
	
	for (var i = 0; i < PLOT_DATA["whichPlotInWhichCanvas"].length; i ++){
		//$("#selectPlot" + (i+1)).val("none");
		//$("#showPlot" + (i+1)).hide(true);
		//showPlot((i+1), false);

		if (i+1 == 4) $("#plot4Buttons").hide(true);
		else{
			$("#downloadPlot" + (i+1)).hide(true);
			$("#plotOptions" + (i+1)).hide(true);
			$("#helpPlot" + (i+1)).hide(true);
		}
	}


}


function selectPlot(plotNum, deleteData = null){

	var plotSelect = $("#selectPlot" + plotNum);
	var value = plotSelect.val();
	
	
	// Update the model
	selectPlot_controller(plotNum, value, deleteData, function(plotData){
		
		update_PLOT_DATA(plotData);

		// Delete the canvas and add it back later so it doesn't bug
		$("#plotCanvas" + plotNum).remove();

		if (plotNum == 4) $("#plotCanvasContainer" + plotNum).html('<canvas id="plotCanvas' + plotNum + '"height="150"></canvas>');
		else $("#plotCanvasContainer" + plotNum).html('<canvas id="plotCanvas' + plotNum + '"height="300" width="500"></canvas>');
	


		// Initialise the appropriate plot
		if (value == "distanceVsTime") {
			$("#plotLabel" + plotNum).html("Time elapsed: <span id='plotLabelVariable" + plotNum + "'>" + roundToSF(PLOT_DATA["timeElapsed"]) + "</span> s");
		}

		else if (value == "pauseHistogram") {
			$("#plotLabel" + plotNum).html("Mean time: <span id='plotLabelVariable" + plotNum + "'>" + 0 + "</span> s");
		}

		else if(value == "velocityHistogram"){
			$("#plotLabel" + plotNum).html("Mean velocity: <span id='plotLabelVariable" + plotNum + "'>" + 0 + "</span> bp/s");
		}
	
		else if (value == "custom") {
			$("#plotLabel" + plotNum).html("<br>");
		}


		else if (value == "parameterHeatmap") {
			$("#plotLabel" + plotNum).html("<br>");
		}


		if ( value != "none") {

			console.log("Displaying plot", plotNum);

			// If there is a plot display the buttons
			$("#showPlot" + plotNum).show(true);
			showPlot(plotNum, true);


			if (plotNum == 4) $("#plot4Buttons").show(true);
			else{
				$("#plotOptions" + plotNum).show(true);
				$("#downloadPlot" + plotNum).show(true);
				$("#helpPlot" + plotNum).show(true);
				$("#helpPlot" + plotNum).attr("href", "about/#" + value + "_PlotHelp");
			}


		}else{

			// If no plot then hide the buttons
			
			showPlot(plotNum, false);
			if (plotNum == 4) $("#plot4Buttons").hide(true);
			else{
				$("#showPlot" + plotNum).hide(true);
				$("#downloadPlot" + plotNum).hide(true);
				$("#plotOptions" + plotNum).hide(true);
				$("#helpPlot" + plotNum).hide(true);


			}

		}
	

	
	});

	

}









// Plot the free energy peaks and troughs
function draw_a_landscape_plot(dx, peaks, troughs, col, id, ymin = -2, ymax = 3){
	
	if (!ALLOW_ANIMATIONS) return;

	if (peaks[0] == maxHeight && peaks[1] == maxHeight && peaks[2] == maxHeight && peaks[3] == maxHeight && peaks[4] == maxHeight && peaks[5] == maxHeight) {
		var canvas = $('#' + id)[0];
		ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		return;
	}

	//console.log("Plotting", id, peaks, troughs);
	
	landscape_plot(function (x) {

		x = x + 1 * Math.PI;
		
		if (x + 1/2 * Math.PI + dx < (0/2 * Math.PI)){
			if (peaks[0] == maxHeight || peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[0] - troughs[0]) + 1/2 * (peaks[0] + troughs[0]);
		}
		if (x + 1/2 * Math.PI + dx < (2/2 * Math.PI)){
			if (peaks[0] == maxHeight || peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[0] - troughs[1]) + 1/2 * (peaks[0] + troughs[1]);
		}
		
		if (x + 1/2 * Math.PI + dx < (4/2 * Math.PI)){
			if (peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[1] - troughs[1]) + 1/2 * (peaks[1] + troughs[1]);
		}
		if (x + 1/2 * Math.PI + dx < (6/2 * Math.PI)){
			if (peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[1] - troughs[2]) + 1/2 * (peaks[1] + troughs[2]);
		}
		
		if (x + 1/2 * Math.PI + dx < (8/2 * Math.PI)){
			if (peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[2] - troughs[2]) + 1/2 * (peaks[2] + troughs[2]);
		}
		if (x + 1/2 * Math.PI + dx < (10/2 * Math.PI)){
			if (peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[2] - troughs[3]) + 1/2 * (peaks[2] + troughs[3]);
		}
		
		if (x + 1/2 * Math.PI + dx < (12/2 * Math.PI)){
			if (peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[3] - troughs[3]) + 1/2 * (peaks[3] + troughs[3]);
		}
		if (x + 1/2 * Math.PI + dx < (14/2 * Math.PI)){
			if (peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[3] - troughs[4]) + 1/2 * (peaks[3] + troughs[4]);
		}
		
		if (x + 1/2 * Math.PI + dx < (16/2 * Math.PI)){
			if (peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[4] - troughs[4]) + 1/2 * (peaks[4] + troughs[4]);
		}
		if (x + 1/2 * Math.PI + dx < (18/2 * Math.PI)){
			if (peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[4] - troughs[5]) + 1/2 * (peaks[4] + troughs[5]);
		}
		
		
		if (x + 1/2 * Math.PI + dx < (20/2 * Math.PI)){
			if (peaks[5] == maxHeight || peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[5] - troughs[5]) + 1/2 * (peaks[5] + troughs[5]);
		}
		if (x + 1/2 * Math.PI + dx < (22/2 * Math.PI)){
			if (peaks[5] == maxHeight || peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[5] - troughs[6]) + 1/2 * (peaks[5] + troughs[6]);
		}


			
	}, [1/2 * Math.PI, 17/2 * Math.PI, Math.floor(ymin - (ymax - ymin) * 0.2), Math.ceil(ymax + (ymax - ymin) * 0.2)], id, col);



	// Add a Delta G yaxis on the left hand side
	if ($("#" + id + "_deltaG").length == 0){
		var x = $("#" + id).offset().left - $("#navigationPanelTable").offset().left;
		var y = $("#" + id).offset().top + $("#" + id).height() - $("#navigationPanelTable").offset().top;
		var deltaG = `<div id="` + id + `_deltaG" style="position:absolute; left:` + x + `; top:` + y + `; font-family:Arial">&Delta;G</div>`;
		$("#navigationPanelTable").append(deltaG);
	}
	
}


// Plot the free energy peaks and troughs
function landscape_plot(fn, range, id, col) {


	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	var widthScale = (canvas.width / (range[1] - range[0]));
	//var heightScale = (canvas.height / (range[3] - range[2])),
	var first = true;




	// Add dashed lines corresponding to every few yvals. Only plot at nice numbers
	var result = getNiceAxesNumbers(range[2], range[3], canvas.height, 0, [1])
	range[2] = result["min"];
	range[3] = result["max"];
	var heightScale = result["widthOrHeightScale"];
	var yDashedLinePos = result["vals"];


	ctx.strokeStyle = "#696969";
	ctx.setLineDash([5, 3]);
	ctx.lineWidth = 1;

	for (var lineNum = 0; lineNum < yDashedLinePos.length; lineNum++){
		var y0 = heightScale * (yDashedLinePos[lineNum] - range[2]);
		ctx.beginPath();
		ctx.moveTo(0, y0);
		ctx.lineTo(canvas.width, y0);
		ctx.stroke();
	}

	ctx.setLineDash([]);
	ctx.strokeStyle = "black";

	
	ctx.beginPath();
	
	for (var x = 0; x < canvas.width; x++) {
		var xFnVal = (x / widthScale) - range[0],
			yGVal = (fn(xFnVal) - range[2]) * heightScale;
		
		yGVal = canvas.height - yGVal; // 0,0 is top-left
		if (first) {
			ctx.moveTo(x, yGVal);
			first = false;
		}
		else {
			ctx.lineTo(x, yGVal);
			//console.log("(x,y)= " + x + "," + yGVal);
		}
	}
	
	ctx.strokeStyle = col;
	ctx.lineWidth = 3;
	ctx.stroke(); 
	
	// Add circle
	ctx.beginPath();


	// Add circle to centre bottom of plot 
	xFnVal = (canvas.width / 2 / widthScale) - range[0];
    yGVal = canvas.height - Math.min((fn(xFnVal - 0.01) - range[2]), (fn(xFnVal) - range[2])) * heightScale;
	ctx_ellipse(ctx, canvas.width / 2, yGVal, 12, 12, 0, 0, 2 * Math.PI);
	

	ctx.fill();
	ctx.strokeStyle = "black";
	
	
	// Y-axis
	/*
	ctx.beginPath();
	ctx.moveTo(1,0);
	ctx.lineTo(1, canvas.height);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(1,1);
	ctx.lineTo(8,1);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(1,canvas.height - 1);
	ctx.lineTo(8,canvas.height - 1);
	ctx.stroke();
	*/

	ctx.font="12px Arial";
	ctx.textBaseline="bottom"; 
	ctx.fillText(-roundToSF(yDashedLinePos[0]),5, heightScale * (yDashedLinePos[0] - range[2]));
	ctx.fillText(-roundToSF(yDashedLinePos[yDashedLinePos.length-1]),5, heightScale * (yDashedLinePos[yDashedLinePos.length-1] - range[2]));


	
}






function update_simulatedInsertDistribution(ninsert){


	return;
	var smallestInsertSize;
	if (document.getElementById("SelectSequence").value == "$user") smallestInsertSize = -2;
	else smallestInsertSize = all_sequences[document.getElementById("SelectSequence").value]["minInsertSize"];
	ninsert = Math.min(ninsert, smallestInsertSize + observedInsertDistribution.length - 1);



	for(var i = 0; i < simulatedInsertDistribution.length; i ++){
		simulatedInsertDistribution[i] *= nsimulations;
	}
	simulatedInsertDistribution[ninsert - smallestInsertSize] ++;
	nsimulations++;
	for(var i = 0; i < simulatedInsertDistribution.length; i ++){
		simulatedInsertDistribution[i] /= nsimulations;
	}


	$("#downloadSimBtn").show(true);


	barchart(false);

}



function download_insertHistogramTSV(){


	if (observedInsertDistribution.length == 0) return;
	
	var toprint = "n\tObserved\tSimulated\n";

	var observedInsertDistribution_temp = all_sequences[document.getElementById("SelectSequence").value]["insertDistn"];
	for(var i = 0; i < observedInsertDistribution_temp.length; i ++){
		var iToPrint = i < observedInsertDistribution_temp.length - 1 ? i : i + "+";
		toprint += iToPrint + "\t" + observedInsertDistribution_temp[i] + "\t" + Math.round(nsimulations * simulatedInsertDistribution[i]) + "\n";
	}
	download("insert-distribution.tsv", toprint);



}


function barchart(newBarchart = true) {


	return;


	if ($("#plotDIV3").is( ":hidden" )) return;


	// Delete the canvas and add it back later so it doesn't bug
	$("#chartContainer").remove();
	$("#plotDIV3").html('<canvas id="chartContainer" width="500" height="300"></canvas>');


	
	var smallestInsertSize, observedInsertDistribution_temp;
	if (document.getElementById("SelectSequence").value == "$user") {
		smallestInsertSize = -2;
		observedInsertDistribution_temp = [0,0,0,0,0,0,0,0,0,0];
	}
	else {
		smallestInsertSize = all_sequences[document.getElementById("SelectSequence").value]["minInsertSize"];
		observedInsertDistribution_temp = all_sequences[document.getElementById("SelectSequence").value]["insertDistn"];
	}
	

	if (observedInsertDistribution_temp.length == 0) {
		$("#downloadSimBtn").hide(true);
		return;
	}


	var sizes = [];
	for (var size = 0; size < observedInsertDistribution_temp.length - 1; size++) sizes.push("" + (size + smallestInsertSize));
	sizes.push("" + (smallestInsertSize + observedInsertDistribution_temp.length - 1) + "+");


	if (newBarchart) {

		$("#downloadSimBtn").hide(true);

		nsimulations = 0;
		simulatedInsertDistribution = new Array(sizes.length).fill(0);
		var isProportion = observedInsertDistribution_temp.filter(function(n){ return n % 1 != 0}).length > 0;
		nobservations = isProportion ? "\u221e" : observedInsertDistribution_temp.reduce(function(a, b) { return a + b; }, 0);

		observedInsertDistribution = [];
		if (nobservations != "\u221e"){
			for (var i = 0; i < observedInsertDistribution_temp.length; i ++){
				observedInsertDistribution.push(Math.round(observedInsertDistribution_temp[i] / nobservations * 1e3) / 1e3 );
			}
		}else {
			observedInsertDistribution = observedInsertDistribution_temp;	
		}

	}




	var obsCols = Array(Math.ceil(sizes.length / 3) + 5).join('rgba(243, 146, 0, 0.8)\trgba(0, 101, 50, 0.8)\trgba(149, 27, 129, 0.8)\t').split('\t');
	var simCols = Array(sizes.length + 5).join('rgba(150,150,150,0.5)\t').split('\t');
	var borderCols = Array(sizes.length + 5).join('rgba(256,256,256,1)\t').split('\t');
	var canvas = document.getElementById("chartContainer");



	var myChart = new Chart(canvas, {
	    type: 'bar',
	    data: {
		labels: sizes,
		datasets: [{
		    label: 'Observed insert size, n = ' + nobservations,
		    data: observedInsertDistribution,
		    backgroundColor: obsCols,
		    borderColor: borderCols,
		    borderWidth: 1
		},
		{
		    label: 'Simulated insert size, n = ' + nsimulations,
		    data: simulatedInsertDistribution,
		    backgroundColor: simCols,
		    borderColor: borderCols,
		    borderWidth: 1
		}]
	    },
	    options: {
		maintainAspectRatio:false,
		scales: {
		    yAxes: [{
		        ticks: {
		            beginAtZero:true
		        }
		    }]
		}
	    }
	})

}




// Plot a time vs distance chart
function plotTimeChart(){
	

	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "distanceVsTime") canvasesToPrintTo.push(plt);
	}



	var index = DISTANCE_VS_TIME_CONTROLLER.length-1; // Index of the last list in the list
	if (index > 0 && DISTANCE_VS_TIME_CONTROLLER[index]["times"].length == 1) index--; // Use the second last value if this one is empty


	for (var j = 0; j < canvasesToPrintTo.length; j ++){



		var pltNum = canvasesToPrintTo[j];
		if ($("#plotDIV" + pltNum).is( ":hidden" )) continue;

		


		// Change the time elapsed label
		$("#plotLabelVariable" + pltNum).html(roundToSF(PLOT_DATA["timeElapsed"]));
		

		// Ymax and ymin
		var ymax = 0;
		var ymin = 0;
		if (index >=0 && PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"] == "automaticY"){


			ymin = 0;

			var distTravelled = DISTANCE_VS_TIME_CONTROLLER[index]["distances"][DISTANCE_VS_TIME_CONTROLLER[index]["distances"].length-1];
			if (PLOT_DATA["medianDistanceTravelledPerTemplate"] > distTravelled){
				ymax = PLOT_DATA["medianDistanceTravelledPerTemplate"];
			}else{
				ymax = distTravelled * 1.5;
			}

			ymax = roundToSF(ymax, 2, "ceil");
			if (ymin == ymax) ymax++;




		}else{
			ymin = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"][0] - 1;
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"][1];
		}

		var addDashedLines = ymax - ymin < 40; // Don't add dashed lines if there are too many
		


		// Xmax and xmin
		var xmax = 1;
		var xmin = 0;
		if (index >= 0 && PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"] == "automaticX"){


			xmin = 0;

			var acumTime = 0;
			for (var i = 0; i < DISTANCE_VS_TIME_CONTROLLER[index]["times"].length; i++){
				acumTime += DISTANCE_VS_TIME_CONTROLLER[index]["times"][i];
			}


			if (PLOT_DATA["medianTimeSpentOnATemplate"] > acumTime){
				xmax = PLOT_DATA["medianTimeSpentOnATemplate"];
			}else{
				xmax = acumTime * 1.5;
			}
			
			
			xmax = roundToSF(xmax, 2, "ceil");

			if (xmin == xmax) xmax++;




		}else{

			xmin = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"][1];
		}



		// Show a warning message that the data is getting big
		if(!$("#plotCanvasContainer" + pltNum).is( ":hidden" ) && !haveShownDVTerrorMessage && $("#PreExp").val() != "hidden"){

			var numPoints = 0;
			for (var trial = 0; trial < DISTANCE_VS_TIME_CONTROLLER.length; trial++){
				numPoints += DISTANCE_VS_TIME_CONTROLLER[trial]["distances"].length;
			}
			if (numPoints > 500000){
				haveShownDVTerrorMessage = true;
				addNotificationMessage("That is a lot of data! If SimPol starts to slow down you should minimise this plot.", 
									$("#plotCanvas" + pltNum).offset().left + 100,
									$("#plotCanvas" + pltNum).offset().top + 20,
									300);
			}

		}



		step_plot(DISTANCE_VS_TIME_CONTROLLER, [xmin, xmax, ymin, ymax], "plotCanvas" + pltNum, "plotCanvasContainer" + pltNum, "#008CBA", addDashedLines, "Time (s)", "Distance (nt)", PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["canvasSizeMultiplier"]);
	}
	
}


// Download the data from the plot above as a .tsv file
function download_distanceVsTimeTSV(){




	var tsv="Distance (nt) versus time (s), DateTime " + getFormattedDateAndTime() + "\n\n";
	for (var simNum = 0; simNum < DISTANCE_VS_TIME_CONTROLLER.length; simNum++){

		if (DISTANCE_VS_TIME_CONTROLLER[simNum] == null) continue;

		tsv += "trial\t" + (simNum+1) + "\n";
		var xvalsSim = DISTANCE_VS_TIME_CONTROLLER[simNum]["times"];
		var yvalsSim = DISTANCE_VS_TIME_CONTROLLER[simNum]["distances"];

		tsv += "times\t";
		for (var timeNum = 0; timeNum < xvalsSim.length; timeNum++){
			tsv += xvalsSim[timeNum] + "\t";
		}

		tsv += "\ndistances\t";
		for (var distanceNum = 0; distanceNum < yvalsSim.length; distanceNum++){
			tsv += yvalsSim[distanceNum] + "\t";
		}
		tsv += "\n\n";

	}

	download("distance_vs_time.tsv", tsv);

}



// Remove periodic datapoints so that the total list does not go beyond a certain length
// This is to make displaying the data more efficient
function pruneStepPlotData(xvals, yvals){
	
	
	
	//var timeUnitsPerPixel = 
	
	
	
}


// Produce a line plot where the y axis takes discrete values
function step_plot(vals, range, id, canvasDivID, col, addDashedLines = true, xlab = "", ylab = "", canvasSizeMultiplier = 1) {


	if ($("#" + canvasDivID).is( ":hidden" )) return;
	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	var axisGap = 45 * canvasSizeMultiplier;
	
	
	if (canvasDivID != null) {
		$("#" + id).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + id + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}

	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	
	

	var ctx = canvas.getContext('2d');

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	
	var widthScale = (plotWidth / (range[1] - range[0]));
	var heightScale = (plotHeight / (range[3] - range[2]));
	
	
	
	if (!isNaN(range[1])) {
		ctx.lineWidth = 2 * canvasSizeMultiplier;
	
		// X min and max
		var axisPointMargin = 10 * canvasSizeMultiplier;
		ctx.font = 12 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="top"; 
		ctx.textAlign="left"; 
		ctx.fillText(roundToSF(range[0], 1), axisGap, canvas.height - axisGap + axisPointMargin);
		ctx.textAlign="right"; 
		ctx.fillText(roundToSF(range[1], 1), canvas.width, canvas.height - axisGap + axisPointMargin);
	


		
		// Y min and max
		ctx.save()
		ctx.font = 12 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="bottom"; 
		ctx.textAlign="right"; 
		ctx.translate(axisGap - axisPointMargin, canvas.height - heightScale * (range[2]+1 - range[2]) - axisGap);
		ctx.rotate(-Math.PI/2);
		ctx.fillText(Math.ceil(range[2]+1), 0, 0);
		ctx.restore();
		
		ctx.save()
		ctx.font = 12 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign="right"; 
		ctx.textBaseline="bottom"; 
		ctx.translate(axisGap - axisPointMargin, 0);
		ctx.rotate(-Math.PI/2);
		ctx.fillText(Math.floor(range[3]), 0, 0);
		ctx.restore();
		
		



		// Add dashed lines corresponding to each yval
		if (addDashedLines){
			ctx.strokeStyle = "#696969";
			ctx.setLineDash([5, 3]);
			ctx.lineWidth = 1 * canvasSizeMultiplier;
			for (var linePos = Math.ceil(range[2]); linePos <= Math.floor(range[3]); linePos ++){

				var yPt = canvas.height - heightScale * (linePos - range[2]) - axisGap;
				//console.log("Plotting at",yPrime);
				ctx.beginPath();
				ctx.moveTo(axisGap,yPt);

				ctx.lineTo(canvas.width, yPt);
				ctx.stroke();

			}
		}


		

		ctx.setLineDash([])
		ctx.strokeStyle = col;
		ctx.lineWidth = 3 * canvasSizeMultiplier;
		
		
		// Plot first point
		var xPrime;
		var yPrime; 
		

		var pixelsPerSecond = (canvas.width - axisGap) / (range[1] - range[0]);
		var pixelsPerNucleotide = (canvas.height - axisGap) / (range[3] - range[2]);
		var finalXValue = 0;
		var finalYValue = 0; // Save the coordinates of the final plotted value so we can add the circle

		var acumTime = 0;
		var prevAcumTime = 0;
		for (var simNum = 0; simNum < vals.length; simNum++){

			if (vals[simNum] == null) continue;


			ctx.globalAlpha = simNum+1 == vals[vals.length-1]["sim"] ? 1 : 0.5;
			ctx.strokeStyle = simNum+1 == vals[vals.length-1]["sim"] ? col : "#b3b3b3";


			acumTime = 0;


			ctx.beginPath();
			var first = true;
			var xvalsSim = vals[simNum]["times"];
			var yvalsSim = vals[simNum]["distances"];
			//var plotEvery = Math.floor(Math.max(xvalsSim / 1000, 1));

			var currentTimePixel = 0; 		// We do not want to plot every single value because it is wasteful (and crashes the program). 
			var currentDistancePixel = 0; 	// So only plot values which will occupy a new pixel
			for (var valIndex = 0; valIndex < xvalsSim.length; valIndex ++){


				acumTime += xvalsSim[valIndex];
				//console.log("acumTime", acumTime, pixelsPerSecond, currentTimePixel, acumTime * pixelsPerSecond < currentTimePixel);
				if (acumTime * pixelsPerSecond < currentTimePixel && Math.ceil(yvalsSim[valIndex] * pixelsPerNucleotide) == currentDistancePixel) continue; // Do not plot if it will not generate a new pixel

				//console.log("Plotting", acumTime, yvalsSim[valIndex]);
				currentTimePixel = Math.ceil(acumTime * pixelsPerSecond);
				currentDistancePixel = Math.ceil(yvalsSim[valIndex] * pixelsPerNucleotide);
				finalXValue = acumTime;
				finalYValue = yvalsSim[valIndex];
				
				//if (valIndex != 0 && valIndex != xvalsSim.length-1 && valIndex % plotEvery != 1) continue;

				// If this point is in the future then all the remaining points in this list will be too. Break
				if (acumTime > range[1]){
					break;
				}

				// If this point is too early in time then do not plot it
				if (first && acumTime < range[0]){
					continue;
				}


				var xvalSim = Math.max(acumTime, range[0]); // If the value is too low then set its val to the minimum
				var yvalSim = Math.max(yvalsSim[valIndex], range[2]);
				var yvalSimPrev = Math.max(yvalsSim[valIndex-1], range[2]); // If the value is too low then set its val to the minimum
				
				
				xPrime = widthScale * (xvalSim - range[0]) + axisGap;
				yPrime = canvas.height - heightScale * (yvalSim - range[2]) - axisGap;
				
				if (first){
					ctx.moveTo(xPrime, yPrime);
					first = false;
				}
				

				// Plot this xval with the previous yval
				var yPrimePrev = canvas.height - heightScale * (yvalSimPrev - range[2]) - axisGap; // (0,0) is top left
				ctx.lineTo(xPrime, yPrimePrev);
				
				
				
				// Plot this xval with this yval
				ctx.lineTo(xPrime, yPrime);
			
			
			}
			

			ctx.stroke(); 
		
		}
		
		ctx.globalAlpha = 1;

		// Add circle to last x,y value in plot
		var lastIndex = vals.length-1;
		if (lastIndex >= 0){
			var lastYvals = vals[lastIndex]["distances"];

			if (finalXValue - range[0] >= 0 && finalYValue - range[2] >= 0) {
				ctx.beginPath();
				ctx.fillStyle = "#008CBA";
				xPrime = widthScale * (finalXValue - range[0]) + axisGap;
				yPrime = canvas.height - heightScale * (finalYValue - range[2]) - axisGap;
				ctx_ellipse(ctx, xPrime, yPrime, 5 * canvasSizeMultiplier, 5 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
				ctx.fill();
			}
		}
		
	
	
	}


	ctx.lineWidth = 3 * canvasSizeMultiplier;
	ctx.globalAlpha = 1;

	// Axes
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width, canvas.height - axisGap);
	ctx.stroke();
	
	

	// X label
	ctx.fillStyle = "black";
	ctx.font = 20 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="top"; 
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2;
	ctx.fillText(xlab, xlabXPos, xlabYPos);
	
	// Y label
	ctx.font = 20 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="bottom"; 
	ctx.save()
	var ylabXPos = 2 * axisGap / 3;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ylab, 0 ,0);
	ctx.restore();
	
	

}






function plotFoldingBarrier(){


	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "plotFunction") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return; 

	for (var i = 0; i < canvasesToPrintTo.length; i++){

		if ($("#plotDIV" + canvasesToPrintTo[i]).is( ":hidden" )) continue;












	}



}





function plot_velocity_distribution(){


	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "velocityHistogram") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return; 

	var maxDataPoints = 10000;


	for (var i = 0; i < canvasesToPrintTo.length; i++){

		if ($("#plotDIV" + canvasesToPrintTo[i]).is( ":hidden" )) continue;



		// VELOCITIES.push({dist: DVT["distances"][lastIndex], time: DVT["times"][lastIndex-1]});
		// Calculate the velocities with the given window size
		var velocitiesWindowSize = [];
		var windowSize = PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["windowSize"];
		//console.log("Plotting velocity", VELOCITIES);
		for (var sim = 0; sim < VELOCITIES.length; sim++){

			if (VELOCITIES[sim] == null || VELOCITIES[sim]["times"].length == 0) continue;

			
			var startTime = VELOCITIES[sim]["times"][0];
			var startDist = VELOCITIES[sim]["distances"][0];

			//console.log("Looking into", VELOCITIES[sim], "startTime", startTime, "startDist", startDist);
			

			for (var timeIndex = 1; timeIndex < VELOCITIES[sim]["times"].length; timeIndex++){


				if (velocitiesWindowSize.length > maxDataPoints) break;


				// Find the distance travelled after waiting for a time equal to the window size
				var thisTime = VELOCITIES[sim]["times"][timeIndex];
				if (thisTime - startTime >= windowSize){

					var totalDist = VELOCITIES[sim]["distances"][timeIndex-1] - startDist;


					if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["timeSpaceX"] == "logSpace") velocitiesWindowSize.push(Math.max(Math.log(totalDist / windowSize), -1000));

					//sortedPush(velocitiesWindowSize, totalDist / windowSize); // Add velocity to list (and keep it sorted)

					else velocitiesWindowSize.push(totalDist / windowSize);

					// Continue calculations with a new start time
					startDist = VELOCITIES[sim]["distances"][timeIndex-1]
					startTime += windowSize; // Set the startTime to the beginning of the next window size


					timeIndex--;


				}


			}

		}

		//console.log("velocitiesWindowSize", velocitiesWindowSize);

	
		// Print the mean velocity to the html
		$("#plotLabelVariable" + canvasesToPrintTo[i]).html(roundToSF(PLOT_DATA["velocity"]));


				
		histogram(velocitiesWindowSize, "plotCanvas" + canvasesToPrintTo[i], "plotCanvasContainer" + canvasesToPrintTo[i], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["xRange"], "Translocation velocity (bp/s)", "Probability density", false, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["canvasSizeMultiplier"], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["timeSpaceX"] == "logSpace" );

	}
	

}



function plot_pause_distribution(){
	

	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "pauseHistogram") canvasesToPrintTo.push(plt);
	}
	

	for (var canvasNum = 0; canvasNum < canvasesToPrintTo.length; canvasNum ++){
		
		var meanElongationDuration = 0;

		var timesToPlot = [];
		var xAxisLabel = "";


		// Each datapoint is time spent between catalysis events
		if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["perTime"] == "perCatalysis"){
			for (var i = 0; i < DWELL_TIMES_CONTROLLER.length; i ++){
				if (DWELL_TIMES_CONTROLLER[i] == null) continue;
				for (var j = 0; j < DWELL_TIMES_CONTROLLER[i].length; j ++){
					
					// If below minimum do not count towards the mean
					if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "pauseX" && DWELL_TIMES_CONTROLLER[i][j] < 1) continue;
					if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "shortPauseX" && (DWELL_TIMES_CONTROLLER[i][j] < 1 || DWELL_TIMES_CONTROLLER[i][j] > 25)) continue;
					
					meanElongationDuration += DWELL_TIMES_CONTROLLER[i][j];

					if(PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") timesToPlot.push(Math.max(Math.log(DWELL_TIMES_CONTROLLER[i][j]), -1000));
					else timesToPlot.push(DWELL_TIMES_CONTROLLER[i][j]);
				}
			}



			xAxisLabel = "Time until catalysis (s)";
			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "pauseX") xAxisLabel = "Pause time (s)";
			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "shortPauseX") xAxisLabel = "Short pause time (s)";
			
			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") xAxisLabel = "log " + xAxisLabel;



		}


		// Each datapoint is time spent between catalysis events
		else if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["perTime"] == "perTemplate"){
			for (var i = 0; i < DWELL_TIMES_CONTROLLER.length-1; i ++){ // Stop before we reach the current template because it's not done yet
				if (DWELL_TIMES_CONTROLLER[i] == null) continue;
				var totalTimeOnThisTemplate = 0;
				for (var j = 0; j < DWELL_TIMES_CONTROLLER[i].length; j ++) totalTimeOnThisTemplate += DWELL_TIMES_CONTROLLER[i][j];

				if(totalTimeOnThisTemplate > 0 && PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") timesToPlot.push(Math.max(Math.log(totalTimeOnThisTemplate), -1000));
				else if(totalTimeOnThisTemplate > 0) timesToPlot.push(totalTimeOnThisTemplate);
				meanElongationDuration += totalTimeOnThisTemplate;
			}


			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") xAxisLabel = "log Time to copy template (s)";
			else xAxisLabel = "Time to copy template (s)";



		}
		
		
		



		meanElongationDuration /= timesToPlot.length;
		
		
		// Print the mean velocity to the html
		if (isNaN(meanElongationDuration)) meanElongationDuration = 0;
		$("#plotLabelVariable" + canvasesToPrintTo[canvasNum]).html(roundToSF(meanElongationDuration));

		//console.log("DWELL_TIMES_CONTROLLER", DWELL_TIMES_CONTROLLER.length, DWELL_TIMES_CONTROLLER);



		if ($("#plotDIV" + canvasesToPrintTo[canvasNum]).is( ":hidden" )) continue;
		histogram(timesToPlot, "plotCanvas" + canvasesToPrintTo[canvasNum], "plotCanvasContainer" + canvasesToPrintTo[canvasNum], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"], xAxisLabel, "Probability density",  false, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["canvasSizeMultiplier"], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace" );
	}
	
	
	
}


function download_velocityHistogramTSV(plotNum){


	// Download the velocities given the current window size
	var maxDataPoints = 10000;
	var velocitiesWindowSize = [];
	var windowSize = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["windowSize"];
	//console.log("Plotting velocity", VELOCITIES);
	for (var sim = 0; sim < VELOCITIES.length; sim++){

		if (VELOCITIES[sim] == null || VELOCITIES[sim]["times"].length == 0) continue;

		
		var startTime = VELOCITIES[sim]["times"][0];
		var startDist = VELOCITIES[sim]["distances"][0];

		//console.log("Looking into", VELOCITIES[sim], "startTime", startTime, "startDist", startDist);
		

		for (var timeIndex = 1; timeIndex < VELOCITIES[sim]["times"].length; timeIndex++){


			if (velocitiesWindowSize.length > maxDataPoints) break;


			// Find the distance travelled after waiting for a time equal to the window size
			var thisTime = VELOCITIES[sim]["times"][timeIndex];
			if (thisTime - startTime >= windowSize){

				var totalDist = VELOCITIES[sim]["distances"][timeIndex-1] - startDist;


				if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceX"] == "logSpace") velocitiesWindowSize.push(Math.max(Math.log(totalDist / windowSize), -1000));

				//sortedPush(velocitiesWindowSize, totalDist / windowSize); // Add velocity to list (and keep it sorted)

				else velocitiesWindowSize.push(totalDist / windowSize);

				// Continue calculations with a new start time
				startDist = VELOCITIES[sim]["distances"][timeIndex-1]
				startTime += windowSize; // Set the startTime to the beginning of the next window size


				timeIndex--;


			}


		}

	}


	if (velocitiesWindowSize.length == 0) return;
	var tsv = "Elongation velocity(bp/s). Window size: " + windowSize + "s, DateTime " + getFormattedDateAndTime() + "\n";
	for (var i = 0; i < velocitiesWindowSize.length; i ++){
		tsv += velocitiesWindowSize[i] + "\t";
	}


	download("velocity_histogram.tsv", tsv);


}

// Download the data from the plot above as a .tsv file
function download_pauseHistogramTSV(){


	if (DWELL_TIMES_CONTROLLER.length < 5) return;

	var tsv = "Time(s) between catalysis events, DateTime " + getFormattedDateAndTime() + "\n\n";
	for (var simNum = 0; simNum < DWELL_TIMES_CONTROLLER.length; simNum++){
		tsv += "trial\t" + (simNum+1) + "\n";
		tsv += "times\t";
		for (var timeNum = 0; timeNum < DWELL_TIMES_CONTROLLER[simNum].length; timeNum++){
			tsv += DWELL_TIMES_CONTROLLER[simNum][timeNum] + "\t";
		}
		tsv += "\n";

	}


	download("time_histogram.tsv", tsv);


}

// Using homebrew functions because the default ones have upperlimits of ~100,000
function minimumFromList(list){

	var min = 1e20;
	for (var i = 0; i < list.length; i ++){
		min = Math.min(min, list[i]);
	}
	if (min == 1e20) return null;
	return min;

}


function maximumFromList(list){

	var max = -1e20;
	for (var i = 0; i < list.length; i ++){
		max = Math.max(max, list[i]);
	}
	if (max == -1e20) return null;
	return max;

}




// Assumes that values are sorted. Will not display the top 5% of values
function histogram(values, canvasID, canvasDivID, xRange = "automaticX", xlab = "", ylab = "Probability density", hoverLabels = false, canvasSizeMultiplier = 1, logSpace = false, col = "#008CBA"){

	if (canvasDivID != null && $("#" + canvasDivID).is( ":hidden" )) return;
	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	// Delete the canvas and add it back later so it doesn't bug
	if (canvasDivID != null) {
		$("#" + canvasID).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + canvasID + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}
	
	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	
	//console.log("vals", values);


	var ctx = canvas.getContext('2d');
	var axisGap = 45 * canvasSizeMultiplier;
	var binGap = 5 * canvasSizeMultiplier;
	var maxNumBins = 16;
	textbox = "";
	
	
	ctx.globalAlpha = 1;

	

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	
	var widthScale = plotWidth;
	var heightScale = plotHeight;
	



	if (values.length > 5){
		

		
		
		// If xRange is set to pauseX set min to 1 and max to whatever the maximum is
		// If xRange is set to shortPauseX set min to 1 and max to 25
		ctx.lineWidth = 0;
		var minVal = xRange == "automaticX" ? minimumFromList(values) : xRange == "pauseX" || xRange == "shortPauseX" ? 1  : xRange[0]; 
		var maxVal = xRange == "automaticX" || xRange == "pauseX" ? maximumFromList(values) : xRange == "shortPauseX" ? 25 : xRange[1];



		// Ensure that bin sizes increment by a nice number (eg. 1K, 2K, 2.5K, 5K for K = 10^N)
		var nbins = Math.min(Math.ceil(Math.sqrt(values.length)), maxNumBins);
		if (minVal == maxVal) nbins = 1;

		var niceBinSizes = [1, 2, 2.5, 5];
		var niceBinSizeID = niceBinSizes.length - 1;
		var basePower = Math.floor(log(maxVal, base = 10));
		
		var binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);
		
		//console.log("BinSize1", binSize, "maxVal", maxVal, "basePower", basePower);
		
		if (minVal != maxVal) {
			while(true){
				if ((maxVal - minVal) / binSize - nbins > 0) break;
				niceBinSizeID --;
				if (niceBinSizeID < 0) {
					niceBinSizeID = niceBinSizes.length - 1;
					basePower --;
				}
				binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);

			}
		}else{
			nbins = 1;
			binSize = 1;
		}
		
		
		
		minVal = minVal - minVal % binSize;
		maxVal = maxVal + binSize - maxVal % binSize;
		

		
		
		nbins = Math.ceil((maxVal - minVal) / binSize);
		//var binSize = (maxVal - minVal) / nbins;
		widthScale = (plotWidth - (nbins+1)*binGap) / (nbins);
		
		// console.log("MinVal", minVal, "maxVal", maxVal, "binSize", binSize, "nbins", nbins);


		
		// Find the bar heights
		var barHeights = [];
		for(var binID = 0; binID < nbins; binID ++){
		

			var y0 = 0;
			var minBinVal = binSize * binID + minVal;
			var maxBinVal = binSize * (binID+1) + minVal;
		
		
			// The largest bin's lower bound should be inclusive but all other bin's upper bound should be non-inclusive
			if (binID == nbins-1){
				for (var j = 0; j < values.length; j ++){
					if (values[j] >= minBinVal && values[j] <= maxBinVal) y0 += 1/values.length;
				}
			}
		
			else{
		
				for (var j = 0; j < values.length; j ++){
					if (values[j] >= minBinVal && values[j] < maxBinVal) y0 += 1/values.length;
				}
			}

			barHeights.push(logSpace ? Math.max(Math.log(y0), -1000) : y0);

		}

		var ymin = logSpace ? minimumFromList(barHeights) : 0;
		var ymax = roundToSF(maximumFromList(barHeights) * 1.2); // Math.min(Math.ceil(Math.max.apply(Math, barHeights) * 10.5) / 10, 1);
		
	
		// Plot the bars and add the hover events
		ctx.globalAlpha = 0.6;
		//var cols = ["#008CBA", "#009900", "#008CBA", "#009900",];
		for(var binID = 0; binID < nbins; binID ++){
			var x0 = widthScale * binID + axisGap + binGap * (binID+1);
			ctx.fillStyle = col;
			ctx.fillRect(x0, heightScale, widthScale, barHeights[binID] / ymax * -heightScale);
		}
		
		
			// Add mouse hover event
			canvas.onmousemove = function(e) { 

				if (simulating) return;

				var rect = this.getBoundingClientRect(),
			        x = e.clientX - rect.left,
			        y = e.clientY - rect.top;
				
				histogram_mouse_over(x, y, canvas, ctx, binID, nbins, heightScale, widthScale, barHeights, minVal, ymax, col, binGap, axisGap, binSize, canvasSizeMultiplier); 
				add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier);
				add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels, canvasSizeMultiplier * 20 + "px Arial", canvasSizeMultiplier * 3);
				
			};



		canvas.onmouseleave = function(e){
			histogram(values, canvasID, canvasDivID, xRange, xlab, ylab, hoverLabels, canvasSizeMultiplier, logSpace, col);
		};
	

		add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier);
	
	}
	
	

	var newMouseMoveEvent = add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels, canvasSizeMultiplier * 20 + "px Arial", canvasSizeMultiplier * 3);
	
	// Add xy label hover events
	if (newMouseMoveEvent != null) {
	
	
		// Add mouse hover event
		canvas.onmousemove = function(e) { 
		
			if (simulating) return;
			
			var rect = this.getBoundingClientRect(),
	        	x = e.clientX - rect.left,
	        	y = e.clientY - rect.top;
			if (values.length > 5){
					histogram_mouse_over(x, y, canvas, ctx, binID, nbins, heightScale, widthScale, barHeights, minVal, ymax, col, binGap, axisGap, binSize, canvasSizeMultiplier); 
					add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier);
			}
			newMouseMoveEvent = add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels, canvasSizeMultiplier * 20 + "px Arial", canvasSizeMultiplier * 3);
			newMouseMoveEvent(x, y);
		};
			
			
	}
	


}



function histogram_mouse_over(x, y, canvas, ctx, binID, nbins, heightScale, widthScale, barHeights, minVal, ymax, col, binGap, axisGap, binSize, canvasSizeMultiplier) {


	if (simulating) return;

	
	var textbox = "";
	ctx.clearRect(0, 0, canvas.width, canvas.height); 
	
	for(var binID = 0; binID < nbins; binID ++){
		
		
		var x0 = widthScale * binID + axisGap + binGap * (binID+1);
		ctx.globalAlpha = 0.6;
		ctx.lineWidth = 0;
		ctx.save();
		ctx.beginPath();
	   	ctx.rect(x0, heightScale, widthScale, barHeights[binID] / ymax * -heightScale);
	
		// Mouse is hovering over this bar
		if (x0 - binGap/2 <= x && x0 + widthScale + binGap/2 > x && y < canvas.height - axisGap){
		//if (ctx.isPointInPath(x, y)){
			
			// Add the bar with a different opacity
			ctx.globalAlpha = 1;
			ctx.fillStyle = col;
			ctx.fill();

			textbox = "P(" + roundToSF(binSize * binID + minVal) + " <= x < " + roundToSF(binSize * (binID+1) + minVal) + ") = " + roundToSF(barHeights[binID]);
			
		}else{

			// Add the bar
			ctx.fillStyle = col;
				ctx.fill();
			
			
		}
		ctx.restore();
		
	}
	
	
	
	
	// Add a box which says the coordinates of the current bar
	if (textbox != ""){
		
		ctx.font = 18 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign= "left";
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#1e1e1e";
		
		// We don't want the text to go above or below the axis. The y-val of the textbox with respect to the cursor has a smooth rate of change.
		var dy = 60 - 120 / (canvas.height - axisGap) * y;
		//var dx = 20;
		var dx = 60 + (-ctx.measureText(textbox).width - 60) / (canvas.width - axisGap) * x;
		
		ctx.fillRect(x+dx-5, y+dy-3, ctx.measureText(textbox).width+10, 26);


		ctx.globalAlpha = 1;
		ctx.fillStyle = "#ebe9e7";
		ctx.textBaseline="top"; 
		ctx.fillText(textbox, x+dx, y+dy);
		
	}
	

	 
}



function log(num, base = null){
	
	if (num == 0) return 0;
	if (base == null) return Math.log(Math.abs(num));
	return Math.log(Math.abs(num)) / Math.log(base);
	
	
}

function add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier){
	

	
	ctx.globalAlpha = 1;
	

	// Calculate the smallest order of magnitude across bars so we can express x-values in scientific notation. 
	// eg if mean order of magnitude is 5 then will express x-labels as 1.5e5, 20e5, etc.

	var meanBarOrderOfMagnitude = Math.ceil(log(binSize + minVal, 10)); 
	if (nbins == 1) meanBarOrderOfMagnitude = Math.ceil(log(binSize, 10)); 

	// X values on axis
	ctx.fillStyle = "black";
	var axisPointMargin = 4 * canvasSizeMultiplier;
	ctx.font = 12 * canvasSizeMultiplier + "px Arial";
	ctx.textBaseline="top"; 
	

	
	// Have 1 label for first and last bin and 2 or 0 in between
	if (meanBarOrderOfMagnitude <= 3 && meanBarOrderOfMagnitude >= -3) meanBarOrderOfMagnitude = 0;
	var orderOfMagnitudeString = meanBarOrderOfMagnitude == 0 ? "" :  meanBarOrderOfMagnitude == 0 ? "0" : "e" + meanBarOrderOfMagnitude;


	// 1 label for first bin and then every 3rd one after that
	//ctx.textAlign= "left";
	//var txtLabel = roundToSF((minVal) * Math.pow(10, -meanBarOrderOfMagnitude), 2) + orderOfMagnitudeString;
	//ctx.fillText(txtLabel, axisGap, canvas.height - axisGap + axisPointMargin);



	var binsEvery = nbins < 5 ? 1 : nbins < 10 ? 2 : nbins < 15 ? 3 : 4;
	for (i = 1; i <= nbins; i += binsEvery){


		var x0 = widthScale * i + axisGap + binGap * (i-1);
		var txtLabel = roundToSF((minVal + binSize * (i-1)) * Math.pow(10, -meanBarOrderOfMagnitude), 3) + orderOfMagnitudeString;


		//if (i == 1) ctx.textAlign= "left";
		 if ((canvas.width - x0) / canvas.width < 0.1) ctx.textAlign= "right";
		else ctx.textAlign= "center";

		ctx.fillText(txtLabel, x0, canvas.height - axisGap + axisPointMargin);
		

	} 




	// Y min and max
	ctx.save()
	ctx.font = 12 * canvasSizeMultiplier + "px Arial";
	ctx.textBaseline="bottom"; 
	ctx.textAlign="right"; 
	ctx.translate(axisGap - axisPointMargin, canvas.height - heightScale * 0 - axisGap);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(0, 0, 0);
	ctx.restore();

	ctx.save()
	ctx.font = 12 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="right"; 
	ctx.textBaseline="bottom"; 
	ctx.translate(axisGap - axisPointMargin, 0);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ymax, 0, 0);
	ctx.restore();
	
	
	
}



function add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels = false, font = "20px Arial", linewidth = 3){
	
	ctx.lineWidth = 3;
	ctx.globalAlpha = 1;
	
	
	// Axes
	ctx.strokeStyle = "black";
	ctx.lineWidth = linewidth;
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width, canvas.height - axisGap);
	ctx.stroke();
	
	
	
	if (!hoverLabels){
	// X title
	ctx.fillStyle = "black";
	ctx.font = font;
	ctx.textAlign="center"; 
	ctx.textBaseline="top"; 
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2;
	ctx.fillText(xlab, xlabXPos, xlabYPos);
	
	// Y title
	ctx.font = font;
	ctx.textAlign="center"; 
	ctx.textBaseline="bottom"; 
	ctx.save()
	var ylabXPos = 2 * axisGap / 3;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ylab, 0 ,0);
	ctx.restore();
	
		return null;
	
	}
	
	// Allow user to change labels
	ctx.font = font;
	ctx.textAlign="center"; 
	ctx.textBaseline="top";
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2 - 5;
	
	
	// Draw a rectangle around the x label and the label inside the rectangle
	ctx.fillStyle = "#1e7d1e";
	var x0 = xlabXPos -1/2 * ctx.measureText(xlab).width - 10;
	var y0 = xlabYPos - 2;
	var w = ctx.measureText(xlab).width + 20;
	var h = 28;
	ctx.fillRect(x0, y0, w, h);
	ctx.fillStyle = "white";
	ctx.fillText(xlab, xlabXPos, xlabYPos);



	

	
	
	// Draw a rectangle around the y label
	ctx.textBaseline="bottom"; 
	ctx.fillStyle = "#1e7d1e";
	var ylabXPos = 2 * axisGap / 3;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;


	var y0Ylab = -ctx.measureText(ylab).width/2 - 10 + ylabYPos;
	var x0Ylab = -25 + ylabXPos
	var hYlab = ctx.measureText(ylab).width + 20;
	var wYlab = 28;
	ctx.fillRect(x0Ylab, y0Ylab, wYlab, hYlab);

	ctx.save()
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillStyle = "white";
	ctx.fillText(ylab, 0 ,0);
	ctx.restore();
	


	// Add a hover events over the axis labels

	// Add mouse hover event
	var mouseMoveEvent = function (mouseX, mouseY) {


		var mouseInXLab = x0 < mouseX && x0 + w > mouseX && y0 <= mouseY && y0 + h >= mouseY;
		var mouseInYLab = x0Ylab < mouseX && x0Ylab + wYlab > mouseX && y0Ylab <= mouseY && y0Ylab + hYlab >= mouseY;
		if (mouseInXLab || mouseInYLab){
			//$('#' + id).addClass("variable-cursor")
			$('#' + canvasID).css('cursor','pointer');
		}else{
			//$('#' + id).removeClass("variable-cursor")
			$('#' + canvasID).css('cursor','auto');
		}


	};

	/*
	canvas.addEventListener('click', function(e) { 
		
		if (simulating) return;
		
		var rect = this.getBoundingClientRect();
		var mouseX = e.clientX - rect.left;
		var mouseY = e.clientY - rect.top;
		var mouseInXLab = x0 < mouseX && x0 + w > mouseX && y0 <= mouseY && y0 + h >= mouseY;
		var mouseInYLab = x0Ylab < mouseX && x0Ylab + wYlab > mouseX && y0Ylab <= mouseY && y0Ylab + hYlab >= mouseY;
		
		if (mouseInXLab){
			highlightVariables(canvasID, "x");
		}
		else if (mouseInYLab) {
			highlightVariables(canvasID, "y");
		}
		
		
	}, false);
	*/
		
	return mouseMoveEvent;
	
	
}




// Create a graph above the simulation where each x value is a base and each y value is pause duration
function plot_time_vs_site(){
	


	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "pauseSite") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return;
	
	for (var canvasNum = 0; canvasNum < canvasesToPrintTo.length; canvasNum ++){
		


		var pauseSum = PLOT_DATA["pauseTimePerSite"].reduce(function(a, b) { return a + b; }, 0);
		//basesToDisplayTimes100 = 1;


		// Create label function. Depends on what y-axis the user wants to see
		var ymin = 1000000;
		var labelFn = function(site, val){


			switch (PLOT_DATA["whichPlotInWhichCanvas"][4]["yAxis"]){
				case "timePercentage":
					if (val <= 0) return "";
					return "Total time at " + site + ": " + roundToSF(val / pauseSum * 100) + "%";
				case "timeSeconds":
					if (val <= 0) return "";
					return "Mean time at " + site + ": " + roundToSF(val / PLOT_DATA["npauseSimulations"]) + "s";
				case "logTimeSeconds":
					if (val <= ymin) return "";
					//console.log("Log time", pauseSum, "normal time", 
					return "Mean time at " + site + ": " + roundToSF(Math.exp(val) / PLOT_DATA["npauseSimulations"]) + "s";
			}
		
		}
	

		var valuesToPlot = [];
		if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "logTimeSeconds"){

			// Find the minimum value
			ymin = 1000000;
			for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
				if (PLOT_DATA["pauseTimePerSite"][i] > 0) ymin = Math.min(Math.log(PLOT_DATA["pauseTimePerSite"][i]), ymin);
			}

			// Set all values to either their log value or ymin if the time is zero
			for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
				if (PLOT_DATA["pauseTimePerSite"][i] > 0) valuesToPlot.push(Math.log(PLOT_DATA["pauseTimePerSite"][i]));
				else valuesToPlot.push(ymin);
			}
		}else valuesToPlot = PLOT_DATA["pauseTimePerSite"];

		var ylab = PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "timePercentage" ? "Time (%)" : PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "timeSeconds" ? "Time (s)" : "log time(s)";

	
		//var pauseTimes = [0, 0.001, 0.01, 0.5, 10, 0.2, 3, 0.001, 0.01, 0.5, 10, 0.2, 3, 0.001, 0.01, 0.5, 10, 0.2, 3, 10, 0];
		if ($("#plotDIV" + canvasesToPrintTo[canvasNum]).is( ":hidden" )) return;
			sitewise_plot("plotCanvas" + canvasesToPrintTo[canvasNum], "plotCanvasContainer" + canvasesToPrintTo[canvasNum], "plotDIV" + canvasesToPrintTo[canvasNum], valuesToPlot, ylab, labelFn, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["canvasSizeMultiplier"]);

		
	}
	

	
}

// Download the previous plot data as .tsv
function download_pauseSiteTSV(){

	var tsv = "Site\tAveragePauseTime(s)\tDateTime "  + getFormattedDateAndTime() + "\n";
	for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
		tsv += (i+1) + "\t" + PLOT_DATA["pauseTimePerSite"][i] + "\n";
	}

	download("pause_times.tsv", tsv);


}







function plot_abortion_vs_site(){



	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "abortionSite") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return;
	
	for (var canvasNum = 0; canvasNum < canvasesToPrintTo.length; canvasNum ++){

		console.log("CanvasNum", canvasesToPrintTo[canvasNum]);

		if (PLOT_DATA["abortionCounts"] == null) continue;
		//basesToDisplayTimes100 = 1;
	


		var abortionProbs = new Array(PLOT_DATA["abortionCounts"].length);
		for (var i = 0; i < abortionProbs.length; i ++) abortionProbs[i] = PLOT_DATA["abortionCounts"][i] / PLOT_DATA["nabortionSimulations"];




		// Create label function
		var labelFn = function(site, val){
			return "Arrest probability at " + site + ": " + roundToSF(val);
		}
	
		console.log("Plotting", canvasesToPrintTo[canvasNum]);

		sitewise_plot("plotCanvas" + canvasesToPrintTo[canvasNum], "plotCanvasContainer" + canvasesToPrintTo[canvasNum], "plotDIV" + canvasesToPrintTo[canvasNum], abortionProbs, "P(Arrest)", labelFn, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["canvasSizeMultiplier"]);


	}

}


function download_abortionSiteTSV(){

	var tsv = "Site\tProbabilityArrest\tDateTime "  + getFormattedDateAndTime() + "\n";
	var abortionProbs = new Array(PLOT_DATA["abortionCounts"].length);
	for (var i = 0; i < abortionProbs.length; i ++) abortionProbs[i] = PLOT_DATA["abortionCounts"][i] / PLOT_DATA["nabortionSimulations"];

	for (var i = 0; i < abortionProbs.length; i ++){
		tsv += (i+1) + "\t" + abortionProbs[i] + "\n";
	}

	download("arrest_probabilities.tsv", tsv);


}




// Assumes that the first and last element of yvals is zero
// In firefox, safari and chrome, the maximum canvas width is around 32k pixels. In IE 8k (will ignore IE)
// If we have the canvas size multiplier (for downloading high res png) at 10 and each base is 25 pixels wide then we should never display more
// than 32000 / 25 / 10 = 128nt at a time
// So the plot will display 120nt at a time maximum with overlapping windows of 20bp
// eg. display 1-120 or 100-220, or 200-320 etc. The slot we see is indicated by basesToDisplayTimes100
function sitewise_plot(canvasID, canvasContainerID, canvasDivID, yvals, ylab = "", hoverOverTextBoxFn = function(){}, canvasSizeMultiplier = 1, xlab = "", hoverOver = -1, mouseX = null, mouseY = null, scrollPos = null){


	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;
	
	var axisGap = 30 * canvasSizeMultiplier;
	var startSite = (basesToDisplayTimes100-1) * 100 + 1;
	var endSite = Math.min(startSite + 119, yvals.length-2);

	$("#plots4").off("mouseleave"); // Remove the mouseleave event
	
	// Delete the canvas and add it back later so it doesn't bug
	if (canvasDivID != null) { 

		if (scrollPos == null) scrollPos = $("#" + canvasDivID).scrollLeft();

		$("#" + canvasID).remove();
		var canvasWidth = axisGap + canvasSizeMultiplier * (Math.min((PLOT_DATA["nbases"]-1), 120-1)*25);  // Width should cover all nucleotides
		
		var canvasHeight = canvasSizeMultiplier * 150;
		$("#" + canvasContainerID).html('<canvas id="' + canvasID + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');



		// Enable/disable the buttons to turn this plot into the next plot with different site range

		// Disable the minus button if we cannot decrease from here
		if (basesToDisplayTimes100 == 1){
			$("#minus100Sites").addClass("dropdown-disabled");
			$("#minus100Sites").prop("disabled", true);
		}else{
			$("#minus100Sites").removeClass("dropdown-disabled");
			$("#minus100Sites").prop("disabled", false);
		}


		// Disable the plus button if we cannot increase from here
		var max = Math.ceil(PLOT_DATA["nbases"] / 100);
		if (PLOT_DATA["nbases"] % 100 <= 20) max--;
		if (basesToDisplayTimes100 == max){
			$("#plus100Sites").addClass("dropdown-disabled");
			$("#plus100Sites").prop("disabled", true);
		}else{
			$("#plus100Sites").removeClass("dropdown-disabled");
			$("#plus100Sites").prop("disabled", false);
		}


		// Set the label of the "Displaying XXX-YYY sites of ZZZ" label
		$("#numSitesDisplayed").html(startSite + "-" + endSite);
		$("#numSitesTotal").html(PLOT_DATA["nbases"]-1);


	}
	


	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	var ctx = canvas.getContext('2d');
	

	if (scrollPos != null) $("#" + canvasDivID).scrollLeft(scrollPos);

	ctx.lineWidth = 0 * canvasSizeMultiplier;

	
	ctx.globalAlpha = 1;

	

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var ymax = Math.max.apply(Math, yvals);
	var ymin = Math.min.apply(Math, yvals);
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	var widthScale = plotWidth;
	var heightScale = plotHeight / (ymax-ymin);




	var baseHeight = 25 * canvasSizeMultiplier;

	
	// Nucleotide colours"
	var colours = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}
	var textbox = ""; // To display above a bar



	if (yvals.length > 0){

		// Draw the first point
		//var prevX = $("#g1").offset().left - basesOffset;
		//ctx.moveTo(prevX, canvas.height - axisGap);


		for (var site = startSite; site <= endSite; site++){


			if (site == hoverOver) ctx.globalAlpha = 1;
			else ctx.globalAlpha = 0.7;
			//ctx.globalAlpha = 0.7;
			
			ctx.beginPath();


			var xVal = ((site-startSite)*25) * canvasSizeMultiplier + axisGap;
			
			
			
			var baseType = PLOT_DATA["templateSeq"][site-1];
			//var baseType = getBaseInSequenceAtPosition("g" + site);//$("#g" + site).attr("nt");
			var yVal = canvas.height - axisGap - (yvals[site]-ymin) * heightScale;
			var yValPrev = canvas.height - axisGap - (yvals[site-1]-ymin) * heightScale;
			var yValNext= canvas.height - axisGap - (yvals[site+1]-ymin) * heightScale;
			
			
			// Start the trace in the bottom left
			ctx.moveTo(xVal, canvas.height - axisGap);
			

			// Move upto the the point between this y value and the previous one
			var yMidPoint = (yValPrev + yVal) / 2;
			ctx.lineTo(xVal, yMidPoint);
			
			// Move to this y-value and 1/3rd way through this base
			//ctx.lineTo(xVal + baseHeight/3, yVal);
			
			// Move to this y-value and 1/2 way through this base
			ctx.lineTo(xVal + baseHeight/2, yVal);
			
			// Move to the midpoint between this and the next y-value
			yMidPoint = (yValNext + yVal) / 2;
			ctx.lineTo(xVal + baseHeight, yMidPoint);
			
			// Finally, we end up at the bottom right corner
			ctx.lineTo(xVal + baseHeight, canvas.height - axisGap);
			
			// Fill the area with the appropriate colour
			var baseName = baseType[0];
			ctx.fillStyle = colours[baseName];
			ctx.fill();
			
			
			
			// Create textbox to display if this bar is being hovered over
			if (site == hoverOver){
				textbox =  hoverOverTextBoxFn(baseName + site, yvals[site]);
			}

			
			// Add x axis labels
			ctx.globalAlpha = 1;
			if (site == hoverOver) ctx.font = "bold " + canvasSizeMultiplier * 30 + "px Courier";
			else ctx.font = "bold " + canvasSizeMultiplier * 22 + "px Courier";
			
			ctx.textAlign="center"; 
			ctx.textBaseline="top"; 
			ctx.fillText(baseName, xVal + baseHeight/2, canvas.height - axisGap);
			

		}
		
		


		
		
		// Add mouse hover event
		canvas.onmousemove = function (e) {

			if (simulating && $("#PreExp").val() != "hidden") return;

			var rect = this.getBoundingClientRect(),
		        mouseX = e.clientX - rect.left,
				mouseY = e.clientY - rect.top;

			for (var site = startSite; site <= endSite; site++){
				
				var xVal = ((site-startSite)*25) * canvasSizeMultiplier + axisGap;
				
				// Mouse is hovering over this bar
				if (xVal <= mouseX && mouseX < xVal + baseHeight){

					// Redraw the graph but with this bar having a different opacity and with a label showing
					sitewise_plot(canvasID, canvasContainerID, canvasDivID, yvals, ylab, hoverOverTextBoxFn, canvasSizeMultiplier, xlab, site, mouseX, mouseY, $("#" + canvasDivID).scrollLeft());
					return;
					
				}
			}
			
			
			
			
		};


		// Remove highlighting when mouse leaves sitewise panel
		$("#plots4").mouseleave(function() {
			$("#plots4").off("mouseleave");
			sitewise_plot(canvasID, canvasContainerID, canvasDivID, yvals, ylab, hoverOverTextBoxFn, canvasSizeMultiplier, xlab, -1, null, null, $("#" + canvasDivID).scrollLeft());
		});
		



		

		
	}
	
	// Axes
	add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, false, font = canvasSizeMultiplier * 20 + "px Arial", canvasSizeMultiplier * 3);
	
	// Add the hover label
	if (hoverOver!= -1 && textbox != "" && mouseY != null && mouseX != null){
			
			

			
		ctx.textAlign= "left";
		ctx.font = 18 * canvasSizeMultiplier + "px Arial";
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#1e1e1e";
		
		// We don't want the text to go above or below the axis. The y-val of the textbox with respect to the cursor has a smooth rate of change.
		var dy = 25 - 50 / (canvas.height - axisGap) * mouseY;
		var dx = -ctx.measureText(textbox).width / (canvas.width - axisGap) * mouseX;
		
		ctx.fillRect(mouseX + 5 + dx,  mouseY + 5 + dy, ctx.measureText(textbox).width + 4, -28);
	
		ctx.fillStyle = "#ebe9e7";
		ctx.textBaseline="bottom"; 
		ctx.fillText(textbox, mouseX + 7 + dx,  mouseY + dy);
			
	}
	
	

	
	
}


function download_misincorporationSiteTSV(){

	var tsv = "Site\tProbMisincorporate_A\tProbMisincorporate_C\tProbMisincorporate_G\tProbMisincorporate_T\tProbMisincorporate_U\n";
	for (site in PLOT_DATA["misincorporationCounts"]){
		tsv += site;
		for (var mutn in PLOT_DATA["misincorporationCounts"][site]){
			tsv += "\t" + (PLOT_DATA["misincorporationCounts"][site][mutn] / PLOT_DATA["nMisincorporationSimulations"]);
		} 
		tsv += "\n";
	}

	download("misincorporation_probabilities.tsv", tsv);


}





function plot_misincorporation_vs_site(){



	// If we do not want to show this plot type in the sitewise slot, then return now
	if (PLOT_DATA["whichPlotInWhichCanvas"]["4"]["name"] != "misincorporationSite") return;
	
	if (PLOT_DATA["misincorporationCounts"] == null) return;

	//console.log("misinc counts", misincorporationCounts);

	// Create label function
	var labelFn = function(site, vals){
		var toReturnA = "Misincorporation probabilities at " + site + ":  ";
		var toReturnB = "";
		for (var mutn in vals){
			if (vals[mutn] > 0){
				toReturnB += "P(" + mutn + ") = " + (Math.round(vals[mutn] / PLOT_DATA["nMisincorporationSimulations"] * 1000) / 1000) + ";  ";
			}
		}
		if (toReturnB != "") return toReturnA + toReturnB;
		
		return "";
	}
	

	misincorporation_plot("plotCanvas4", "plotCanvasContainer4", PLOT_DATA["misincorporationCounts"], PLOT_DATA["nMisincorporationSimulations"], "P(mutate)", labelFn);


}



// Assumes that the first and last element of yvals is zero
function misincorporation_plot(canvasID, canvasDivID, yvals, ntrials, ylab = "", hoverOverTextBoxFn = function(){}, canvasSizeMultiplier = 1, xlab = "", hoverOver = -1, mouseX = null, mouseY = null){
	


	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	var ctx = canvas.getContext('2d');
	var axisGap = 30;
	
	ctx.canvas.width  = axisGap + $("#g" + (PLOT_DATA["nbases"]-1)).offset().left + $("#bases").scrollLeft() - $("#" + canvasDivID).offset().left; // Width should cover all nucleotides
	
	
	ctx.lineWidth = 0;
	ctx.globalAlpha = 1;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	
	// Find the maximum y value
	var ymax = 0;
	for (var site = 1; site < yvals.length-1; site++){
		var siteTotal = 0;
		for (var mutn in yvals[site]) siteTotal+= yvals[site][mutn];
		if (siteTotal > ymax) ymax = siteTotal;
		
	}
	if (ymax == 0) ymax = ntrials;
	ymax = ymax / ntrials;
	ymax = roundToSF(ymax * 1.1, 2);
	
	
	
	
	
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	var widthScale = plotWidth;
	var heightScale = plotHeight / ymax;



	var basesOffset =  -$("#" + canvasDivID).offset().left;// + $("#bases").scrollLeft();



	
	var baseMargin = 2;
	var baseHeight = 25 - 2*baseMargin;
	var yMargin = 0;



	
	
	// Nucleotide colours"
	var colours = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}
	var textbox = ""; // To display above a bar
	
	if (yvals.length > 0){

		// Draw the first point
		//var prevX = $("#g1").offset().left - basesOffset;
		//ctx.moveTo(prevX, canvas.height - axisGap);

		
		for (var site = 1; site < yvals.length-1; site++){
			
			
			if (site == hoverOver) ctx.globalAlpha = 1;
			else ctx.globalAlpha = 0.7;
			//ctx.globalAlpha = 0.7;
			

			var baseType = PLOT_DATA["templateSeq"][site-1];
			//var baseType = getBaseInSequenceAtPosition("g" + site);//$("#g" + site).attr("nt");
			var xVal = $("#g" + site).offset().left + basesOffset + baseMargin;
			
			// Add one bar for each non zero count
			var accumulativeY = canvas.height - axisGap;
			for (var mutn in yvals[site]){
				if (yvals[site][mutn] > 0){
					ctx.fillStyle = colours[mutn];
					var yVal = accumulativeY -  (yvals[site][mutn]/ntrials * heightScale);
					ctx.fillRect(xVal, yVal, baseHeight, accumulativeY - yVal)
					accumulativeY = yVal - yMargin;
				}
			}
			
		
			
			
			
			// Create textbox to display if this bar is being hovered over
			if (site == hoverOver){
				textbox = hoverOverTextBoxFn(baseType[0] + site, yvals[site]);
			}
			

			
			// Add x axis labels
			ctx.globalAlpha = 1;
			if (site == hoverOver) ctx.font = "bold 30px Courier";
			else ctx.font = "bold 22px Courier";
			
			ctx.textAlign="center"; 
			ctx.textBaseline="top"; 
			ctx.fillStyle = colours[baseType[0]];
			ctx.fillText(baseType[0], xVal + baseHeight/2, canvas.height - axisGap);
			

		}
		
		
	
		
		// Add mouse hover event
		canvas.onmousemove = function (e) {

			if (simulating) return;

			var rect = this.getBoundingClientRect(),
		        mouseX = e.clientX - rect.left,
				mouseY = e.clientY - rect.top;

			for (var site = 1; site < yvals.length-1; site++){
				
				var xVal = $("#g" + site).offset().left + basesOffset;
				
				// Mouse is hovering over this bar
				if (xVal <= mouseX && mouseX < xVal + baseHeight){
					

					// Redraw the graph but with this bar having a different opacity and with a label showing
					misincorporation_plot(canvasID, canvasDivID, yvals, ntrials, ylab, hoverOverTextBoxFn, xlab, site, mouseX, mouseY);
					return;
					
				}
			}
			
			
			
			
		};
		
		canvas.onmouseleave = function(e){
			misincorporation_plot(canvasID, canvasDivID, yvals, ntrials, ylab, hoverOverTextBoxFn, xlab);
		};
		


		

		
	}
	
	// Axes
	add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, false, font = "20px Arial", canvasSizeMultiplier * 3);
	
	// Add the hover label
	if (hoverOver!= -1 && textbox != "" && mouseY != null && mouseX != null){
			

		ctx.textAlign= "left";
		ctx.font = "18px Arial";
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#1e1e1e";
		
		// We don't want the text to go above or below the axis. The y-val of the textbox with respect to the cursor has a smooth rate of change.
		var dy = 25 - 50 / (canvas.height - axisGap) * mouseY;
		var dx = -ctx.measureText(textbox).width / (canvas.width - axisGap) * mouseX;
		
		ctx.fillRect(mouseX + 5 + dx,  mouseY + 5 + dy, ctx.measureText(textbox).width + 4, -28);
	
		ctx.fillStyle = "#ebe9e7";
		ctx.textBaseline="bottom"; 
		ctx.fillText(textbox, mouseX + 7 + dx,  mouseY + dy);
			
	}
	
	

	
	
}





function constrainCustomPlotToBase(plotCanvasID, baseElement){
	
	
	PLOT_DATA["whichPlotInWhichCanvas"][plotCanvasID]["bases"] = [baseElement.attr('id').substring(1)];
	console.log("You have chosen", PLOT_DATA["whichPlotInWhichCanvas"][plotCanvasID]["bases"]);
	
	
	
}


function setVariableToRecord(plotCanvasID, element, axis){
	
	//console.log("You have chosen", element.attr('id'));

	if (element.attr('id') == "plotCanvas" + plotCanvasID) return;

	var varName = element.attr('id') == "SelectVariable" ? $("#SelectVariable").val() : element.attr('id'); // What is the name of the variable we are setting this axis to
	if (element.attr('id') == "SelectVariable") $("#SelectVariable").val("none"); // Reset the dropdown for next time
	
	setVariableToRecord_controller(plotCanvasID, varName, axis);
	
	
}



function download_customDataTSV(plotNum){


	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParam"] == "none") return;

	var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParam"];
	var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yData"]["name"];
	var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xData"]["vals"];
	var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yData"]["vals"];


	var tsv = xLab + " per trial, DateTime "  + getFormattedDateAndTime() + "\n";
	tsv += xLab + "\t";
	for (var i = 0; i < xvals.length; i ++){
		tsv += xvals[i] + "\t";
	}
	tsv += "\n";

	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customMetric"] != "probability"){
		tsv += yLab + "\t";
		for (var i = 0; i < yvals.length; i ++){
			tsv += yvals[i] + "\t";
		}
		tsv += "\n";
	}

	download(xLab + ".tsv", tsv);


}





function download_heatmapDataTSV(plotNum){


	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamX"] == "none" || PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamY"] == "none") return;

	var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamX"];
	var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamY"];
	var zLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["metricZ"];
	var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xData"]["vals"];
	var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yData"]["vals"];
	var zvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zData"]["vals"];


	var tsv = xLab + " vs " + yLab + " per trial, DateTime "  + getFormattedDateAndTime() + "\n";
	tsv += xLab + "\t";
	for (var i = 0; i < xvals.length; i ++){
		tsv += xvals[i] + "\t";
	}
	tsv += "\n";


	tsv += yLab + "\t";
	for (var i = 0; i < yvals.length; i ++){
		tsv += yvals[i] + "\t";
	}
	tsv += "\n";

	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["metricZ"] != "probability"){
		tsv += zLab + "\t";
		for (var i = 0; i < zvals.length; i ++){
			tsv += zvals[i] + "\t";
		}
		tsv += "\n";
	}

	download(xLab + ".tsv", tsv);


}





function getColourPalette(paletteName){

	switch(paletteName){

		case "blue":
			return Array(10).fill("#008CBA");
			break;
		case "rainbow":
			return ["#FF80CC", "#E680FF", "#9980FF", "#80B2FF", "#80FFFF", "#80FFB3", "#99FF80", "#E5FF80", "#FFCC80", "#FF8080"];
			break;
		case "yellowRed":
			return ["#FFFFBF", "#FFFF40", "#FFFF00", "#FFDB00", "#FFB600", "#FF9200", "#FF6D00", "#FF4900", "#FF2400", "#FF0000"];
			break;
		case "greyBlack":
			return ["#999999", "#919191", "#898989", "#7F7F7F", "#757575", "#6A6A6A", "#5D5D5D", "#4E4E4E", "#393939", "#0D0D0D"];
			break;
	}

	return null;


}




// Returns the colour of the current value
function getColourFromPalette(val, min, max, paletteName){

	var scaledVal = Math.floor(10 * (val - min) / (max - min)); // Normalise between 0 and 9
	if(scaledVal > 9) scaledVal = 9;
	if(scaledVal < 0) scaledVal = 0;
	var cols = getColourPalette(paletteName);

	return cols[scaledVal];
	
}






function plot_parameter_heatmap(plotNumCustom = null){


	//console.log("Drawing heatmap", plotNumCustom);

	if (plotNumCustom == null) plotNumCustom = 5;

	if (plotNumCustom != 5 && $("#plotDIV" + plotNumCustom).is( ":hidden" )) return;

	
	// Empty plot
	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParamX"] == "none" || PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParamY"] == "none"){
		scatter_plot([], [], [0, 10, 0, 1], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], "Variable 1", "Variable 2", "Variable 3", "#008CBA", PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zColouring"]);
	}
	
	// X and Y variables
	else{
		


		var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["name"];
		var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["name"];
		var zLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]["name"];
		var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["vals"];
		var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["vals"];
		var zvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]["vals"];



		var xValsGood = [];
		var yValsGood = [];
		var zValsGood = [];
		var zmin, zmax;


		// Get the z-axis range and filter out points which are not within this range. 
		// If a colour gradient is being used then assign colours to the points
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zRange"] == "automaticZ"){
			zmin = minimumFromList(zvals);
			zmax = maximumFromList(zvals);
			xValsGood = xvals;
			yValsGood = yvals;
			zValsGood = zvals;
		}else{
			zmin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zRange"][0];
			zmax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zRange"][1];


			if(PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["metricZ"] == "probability"){
				xValsGood = xvals;
				yValsGood = yvals;
			}

			else{

				for (var trialID = 0; trialID < zvals.length; trialID++){

					if (zvals[trialID] <= zmax && zvals[trialID] >= zmin) {
						xValsGood.push(xvals[trialID]);
						yValsGood.push(yvals[trialID]);
						zValsGood.push(zvals[trialID]);
					}

				}
			}

		}




	
		// Get the x and y ranged
		var xmin, xmax, ymin, ymax;
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"] == "automaticX"){
			xmin = minimumFromList(xValsGood);
			xmax = maximumFromList(xValsGood);
		}else{
			xmin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][1];
		}

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"] == "automaticY"){
			ymin = minimumFromList(yValsGood);
			ymax = maximumFromList(yValsGood);
		}else{
			ymin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][0];
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][1];
		}


		xmin = roundToSF(xmin, 2, "floor");
		xmax = roundToSF(xmax, 2, "ceil");
		ymin = roundToSF(ymin, 2, "floor");
		ymax = roundToSF(ymax, 2, "ceil");
		zmin = roundToSF(zmin, 2, "floor");
		zmax = roundToSF(zmax, 2, "ceil");


		//console.log("ymax", ymax, "ymin", ymin, "yvals", yvals);
		//console.log("xmax", xmax, "xmin", xmin, "xvals", xvals, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]);
		
		//console.log("actual boundaries", Math.max.apply(Math, xvals), Math.min.apply(Math, xvals), Math.max.apply(Math, yvals), Math.min.apply(Math, yvals));
		//console.log("Magnitudes", orderOfMagnitudeXMin, orderOfMagnitudeXMax, orderOfMagnitudeYMin, orderOfMagnitudeYMax);


		// Set the point colouring
		var cols = "#008CBA"; // Either a single colour or a gradient
		var colouringFn = null;
		if(PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["metricZ"] != "probability"){
			
			cols = [];
			colouringFn = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zColouring"];
			for (var trialID = 0; trialID < zValsGood.length; trialID++){
				cols.push(getColourFromPalette(zValsGood[trialID], zmin, zmax, colouringFn));
			}

		}



		scatter_plot(xValsGood, yValsGood, [xmin, xmax, ymin, ymax, zmin, zmax], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], xLab, yLab, zLab, cols, colouringFn);


	}


}


function plot_custom(plotNumCustom = null){


	if (plotNumCustom == null) plotNumCustom = 5;

	if (plotNumCustom != 5 && $("#plotDIV" + plotNumCustom).is( ":hidden" )) return;

	//console.log("plotNumCustom", plotNumCustom, PLOT_DATA);
	
	// Empty plot
	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParam"] == "none"){
		scatter_plot([], [], [0, 10, 0, 1], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"]);
	}
	
	// X and Y variables
	else{
		


		var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["name"];
		var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["name"];
		var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["vals"];
		var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["vals"];


		// If are is no y vals then make a histogram, or if there is x but y is 'prob' 
		if (xvals != null && PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customMetric"] == "probability"){
			histogram(xvals, "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"], xLab, "Probability density", false, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"]);
			return;
		}

		// Otherwise make a scatter plot
		var xmin, xmax, ymin, ymax;
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"] == "automaticX"){
			xmin = minimumFromList(xvals); 
			xmax = maximumFromList(xvals); 
		}else{
			xmin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][1];
		}

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"] == "automaticY"){
			ymin = minimumFromList(yvals);  
			ymax = maximumFromList(yvals);
		}else{
			ymin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][0];
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][1];
		}


		xmin = roundToSF(xmin, 2, "floor");
		xmax = roundToSF(xmax, 2, "ceil");
		ymin = roundToSF(ymin, 2, "floor");
		ymax = roundToSF(ymax, 2, "ceil");


		//console.log("ymax", ymax, "ymin", ymin, "yvals", yvals);
		//console.log("xmax", xmax, "xmin", xmin, "xvals", xvals, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]);
		
		//console.log("actual boundaries", Math.max.apply(Math, xvals), Math.min.apply(Math, xvals), Math.max.apply(Math, yvals), Math.min.apply(Math, yvals));
		//console.log("Magnitudes", orderOfMagnitudeXMin, orderOfMagnitudeXMax, orderOfMagnitudeYMin, orderOfMagnitudeYMax);
		

		scatter_plot(xvals, yvals, [xmin, xmax, ymin, ymax], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], xLab, yLab);

	}
	
	

}



function getNiceAxesNumbers(min, max, plotWidthOrHeight, axisGap = 45, niceBinSizes = [1, 2, 5]){

	if (min > max) max = min+1;

	var maxNumLabels = 8;
	var nLabels = maxNumLabels;

	var niceBinSizeID = niceBinSizes.length - 1;
	var basePower = Math.floor(log(max, base = 10));
	
	var binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);


	var numLoops = 0;	
	if (min != max) {
		while(true){


			if (numLoops > 50 || (max - min) / binSize - nLabels > 0) break;
			niceBinSizeID --;
			if (niceBinSizeID < 0) {
				niceBinSizeID = niceBinSizes.length - 1;
				basePower --;
			}
			binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);
			numLoops++;

		}



		

		if (min > 0) min = min - min % binSize;
		else		 min = min - (binSize + min % binSize);

		if (max > 0) max = max + binSize - max % binSize;
		else		 max = max + binSize - (binSize + max % binSize);


		nLabels = Math.ceil((max - min) / binSize);

		


	}else{
		binSize = 1;
		min--;
		max++;
		nLabels = Math.ceil((max - min) / binSize);
	}
	
	

	var widthOrHeightScale = (plotWidthOrHeight / (max - min));


	var vals = [];
	var tooBigByFactorOf =  Math.max(Math.ceil(nLabels / maxNumLabels), 1)
	for(var labelID = 1; labelID < nLabels; labelID ++){
		if (labelID % tooBigByFactorOf == 0 && labelID * binSize / (max - min) < 0.95) vals.push(roundToSF(labelID * binSize + min));
	}




	return {min: min, max: max, vals: vals, widthOrHeightScale: widthOrHeightScale};
	


}




// Plot the values of x and y
function scatter_plot(xvals, yvals, range, id, canvasDivID, canvasSizeMultiplier, xlab = "Variable 1", ylab = "Variable 2", zlab = null, col = "#008CBA", colGradient = null) {
	

	if ($("#" + canvasDivID).is( ":hidden" )) return;


	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	// Delete the canvas and add it back later so it doesn't bug
	if (canvasDivID != null) {
		$("#" + id).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + id + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}
	
	

	var axisGap = 45 * canvasSizeMultiplier;
	var legendGap = zlab == null ? 0 : 45 * canvasSizeMultiplier; // If there are multiple colours then need a legend
	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	



	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var plotWidth = canvas.width - axisGap - legendGap;
	var plotHeight = canvas.height - axisGap;


	var widthScale = 1;
	var xlabPos = [];
	if (xvals != null && xvals.length > 0){
		var xResult = getNiceAxesNumbers(range[0], range[1], plotWidth);
		range[0] = xResult["min"]
		range[1] = xResult["max"]
		widthScale = xResult["widthOrHeightScale"]
		xlabPos = xResult["vals"]

		//console.log("xResult", xResult);
		
	}


	var heightScale = 1;
	var ylabPos = [];
	if (yvals != null && yvals.length > 0){
		var yResult = getNiceAxesNumbers(range[2], range[3], plotHeight);
		range[2] = yResult["min"]
		range[3] = yResult["max"]
		heightScale = yResult["widthOrHeightScale"]
		ylabPos = yResult["vals"]

		//console.log("xResult", xResult);
		
	}



	
	//var widthScale = (plotWidth / (range[1] - range[0]));
	//var heightScale = (plotHeight / (range[3] - range[2]));

	
	if (xvals != null && xvals.length > 0 && yvals != null && yvals.length > 0) {
		ctx.lineWidth = 3 * canvasSizeMultiplier;
	
		// X min and max
		var axisPointMargin = 4 * canvasSizeMultiplier;
		ctx.font = 10 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="top"; 
		ctx.textAlign="center"; 

		for (var labelID = 0; labelID < xlabPos.length; labelID++){
			var x0 = widthScale * (xlabPos[labelID] - range[0]) + axisGap;
			ctx.fillText(xlabPos[labelID], x0, canvas.height - axisGap + axisPointMargin);
		}



		// Y min and max
		ctx.textBaseline="bottom"; 
		ctx.textAlign="center"; 

		ctx.save()
		ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
		ctx.rotate(-Math.PI/2);
		for (var labelID = 0; labelID < ylabPos.length; labelID++){
			var y0 = heightScale * (ylabPos[labelID] - range[2]);
			ctx.fillText(ylabPos[labelID], y0, 0);
		}
		ctx.restore();



		ctx.beginPath();
		ctx.setLineDash([])
		ctx.lineWidth = 3 * canvasSizeMultiplier;

		for (var valIndex = 0; valIndex < Math.min(xvals.length, yvals.length); valIndex ++){
			
		
			
			xPrime = widthScale * (xvals[valIndex] - range[0]) + axisGap;
			yPrime = plotHeight - heightScale * (yvals[valIndex] - range[2]);
			
			if (xPrime < axisGap || xPrime > axisGap + plotWidth || yPrime > plotHeight - axisGap || yPrime < 0) continue; // Don't plot if out of range
			
			// Add circle
			ctx.beginPath();
			ctx.fillStyle = !$.isArray(col) ? col : col[valIndex]; // The colour may be a single value or a list corresponding to each point
			ctx.globalAlpha = 0.7;
			ctx_ellipse(ctx, xPrime, yPrime, 4 * canvasSizeMultiplier, 4 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
			ctx.fill();
			
		}
		

	
	
	}
	
	
	// X label
	ctx.globalAlpha = 1;
	ctx.font = 20 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="top";
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 3 - 7*canvasSizeMultiplier;
	ctx.fillStyle = "black";
	ctx.fillText(xlab, xlabXPos, xlabYPos);

	
	// Y label
	ctx.textBaseline="bottom"; 
	var ylabXPos = 2 * axisGap / 3 - 5*canvasSizeMultiplier;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.save()
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillStyle = "black";
	ctx.fillText(ylab, 0 ,0);
	ctx.restore();


	// Z label colour legend
	if (zlab != null){

		// Add the z-axis label name
		ctx.font = 14 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="bottom"; 
		ctx.textAlign="center"; 
		var zlabXPos = axisGap + plotWidth + legendGap;
		var zlabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
		ctx.save()
		ctx.translate(zlabXPos, zlabYPos);
		ctx.rotate(-Math.PI/2);
		ctx.fillStyle = "black";
		ctx.fillText(zlab, 0 ,0);
		ctx.restore();


		// Draw the colour gradient (a ladder of filled rectangles on top of each other)
		if(colGradient != null){

			ctx.globalAlpha = 1;
			var colGradientList = getColourPalette(colGradient);
			var colourStepSize = 3 * canvasSizeMultiplier;
			var rectX = axisGap + plotWidth + 5*canvasSizeMultiplier;
			var rectHeight = 12*canvasSizeMultiplier;
			var rectY0 = zlabYPos + rectHeight*(colGradientList.length)/2 - rectHeight;
			var rectWidth = 23*canvasSizeMultiplier;
			ctx.strokeStyle = "black";



			// The ladder
			for (var colID = 0; colID < colGradientList.length; colID++){

				var rectY = rectY0 - colID*rectHeight;
				ctx.fillStyle = colGradientList[colID]; // Rectangle filling
				ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

			}


			if(range.length > 4){

				ctx.textBaseline="middle"; 
			

				// Z min and max above and below the ladder
				if (!isNaN(range[4])){
					ctx.font = 10 * canvasSizeMultiplier + "px Arial";
					var zminYPos = rectY0 + rectHeight + 2*canvasSizeMultiplier;
					ctx.textAlign="right";
					ctx.save()
					ctx.translate(rectX + rectWidth/2, zminYPos);
					ctx.rotate(-Math.PI/2);
					ctx.fillStyle = "black";
					ctx.fillText(range[4], 0 ,0);
					ctx.restore();
				}


				if (!isNaN(range[5])){
					var zmaxYPos = rectY0 - (colGradientList.length-1)*rectHeight - 2*canvasSizeMultiplier ;
					ctx.textAlign="left";
					ctx.save()
					ctx.translate(rectX + rectWidth/2, zmaxYPos);
					ctx.rotate(-Math.PI/2);
					ctx.fillStyle = "black";
					ctx.fillText(range[5], 0 ,0);
					ctx.restore();
				}

			}



		}




	}
	

	
	ctx.lineWidth = 3*canvasSizeMultiplier;
	
	// Axes
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width - legendGap, canvas.height - axisGap);
	ctx.stroke();
	
	
	

}


function showPlot(plotNum, setTo = null){
	
	if (setTo == false || (setTo == null && document.getElementById("showPlot" + plotNum).value == "-")){
		document.getElementById("showPlot" + plotNum).value = "+";
		$("#plotDIV" + plotNum).hide(100);

		showPlot_controller(plotNum, true);

	}
	else if(setTo == true || (setTo == null && document.getElementById("showPlot" + plotNum).value == "+")){
		document.getElementById("showPlot" + plotNum).value = "-";
		$("#plotDIV" + plotNum).show(300);

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "custom" || PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["plotFunction"])(plotNum);
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] != "none") eval(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["plotFunction"])();

		showPlot_controller(plotNum, false);
	}

	
}




function getDownloadPlotTemplate(){
	

	
	return `
		<div id='downloadPopup' style='background-color:adadad; padding: 10 10; position:fixed; width: 20vw; left:40vw; top:50vh; z-index:5' plotNum="XX_plotNum_XX">
			<div style='background-color: ebe9e7; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 22px'> Download XX_plotName_XX </span>
				<span style='font-size: 30px; cursor:pointer; position:fixed; left:59.5vw; top:50.5vh' onclick='closePlotDownloadPopup()'>&times;</span>
				<table cellpadding=10 style='width:90%; margin:auto; font-size: 18px;'>
				
				<tr>

						<td> 
								Download as
								<select class="dropdown" style="width:60px; font-size:14px; text-align:center" name="SelectDownload" id="SelectDownload">
									<option value="tsv">tsv</option>
									<option value="png">png</option>
								</select>
						</td>
						
						
						<td> 
								<input type=button class="operation" onClick=downloadPlotInFormat() value='Download' title="Download plot in the selected format" style="width:100px; float:right"></input>
						</td>

						
					</tr>
					

				</table>
				
				

			</div>
		</div>
	
	
	`;
	
	
	
	
}


function closePlotDownloadPopup(){
	

		$("#mySidenav").unbind('click');
		$("#main").unbind('click');
		$("#downloadPopup").remove();
		$("#main").css("opacity", 1);
		$("#mySidenav").css("opacity", 1);

}


function downloadPlot(plotNum){


	closeAllDialogs();
	//var correspondingTextfield = $("#" + $(element).attr('id').replace("_distn", ""));
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getDownloadPlotTemplate();
	popupHTML = popupHTML.replace("XX_plotNum_XX", plotNum);
	popupHTML = popupHTML.replace("XX_plotName_XX", $("#selectPlot" + plotNum + " :selected").text());

	
	
	$(popupHTML).appendTo('body');
	
	
	
	
	window.setTimeout(function(){
		
		$("#main").click(function(){
			closePlotDownloadPopup();
		});
		
		$("#mySidenav").click(function(){
			closePlotDownloadPopup();
		});
		

		
	}, 50);



}


function downloadPlotInFormat(){
	
	var downloadPopup = $("#downloadPopup");
	if (downloadPopup == null) return;
	
	var plotNum = parseFloat(downloadPopup.attr("plotNum"));
	var downloadFormat = $("#SelectDownload").val();
	
	closePlotDownloadPopup();
	
	
	console.log("Format of plot", plotNum, "is", downloadFormat);
	
	// Download as tsv
	if (downloadFormat == "tsv"){
	
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "distanceVsTime") {
			download_distanceVsTimeTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "pauseHistogram") {
			download_pauseHistogramTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "velocityHistogram") {
			download_velocityHistogramTSV(plotNum);
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "insertPlot") {	
			download_insertHistogramTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "custom") {	
			download_customDataTSV(plotNum);
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "parameterHeatmap") {	
			download_heatmapDataTSV(plotNum);
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "pauseSite") {	
			download_pauseSiteTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "abortionSite") {	
			download_abortionSiteTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "misincorporationSite") {	
			download_misincorporationSiteTSV();
		}
		
	}
	
	// Download as png
	else if (downloadFormat == "png"){
		
		
		// Remove the temporary canvas if it already exists
		$("#plotDIV5").remove();
		
		
		// Create an invisible canvas with a large size
		console.log("making a canvas png");
		
		var canvasHTML = `
						<div class="scrollbar" id="plotDIV5"  style="display:none; height:170px; display:block; overflow-x:scroll; overflow-y:auto;  position:relative"> 
							<div id="plotCanvasContainer5"> 
								<canvas id="plotCanvas5" width="1px" height="1px"></canvas> 
							</div>
						</div>`;
		$("#main").after(canvasHTML);
		
		
		
		// Create a copy of the canvas pointer

		PLOT_DATA["whichPlotInWhichCanvas"][5] = JSON.parse(JSON.stringify(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]));
		PLOT_DATA["whichPlotInWhichCanvas"][5]["canvasSizeMultiplier"] = 10; // How much bigger is this canvas than the original?

		
		// Call the function which makes the plot (it will be saved to the temporary canvas)
		eval(PLOT_DATA["whichPlotInWhichCanvas"][5]["plotFunction"])();
		
		
		// Delete this pointer
		delete PLOT_DATA["whichPlotInWhichCanvas"][5];
		
		
		// Save the temporary canvas to a file
		var tempCanvas = document.getElementById("plotCanvas5"); 
		//var image = tempCanvas.toDataURL("image/png");


		tempCanvas.toBlob(function(blob) {
			saveAs(blob, PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] + ".png");
		}, "image/png");
		
		
		// Delete the temporary canvas
		$("#plotDIV5").remove();
		
		
	}
	
	
	
}


// Allow user to select a base
function highlightBases(plotCanvasID){
	
	stop_controller();
	variableSelectionMode = true;
	
	$("#" + plotCanvasID).addClass("variable");
	
	// Set the opacity of the whole page to low
	$('select:not(.variable):visible').fadeTo("slow", "0.3");
	$('input:not(.variable):visible').fadeTo("slow", "0.3");
	$('canvas:not(.variable):visible').fadeTo("slow", "0.3");
	$('img:not(.variable):visible').fadeTo("slow", "0.3");
	
	// Disable all buttons
	$('input:not(.variable):visible').prop('disabled', true);
	$('select:not(.variable):visible').prop('disabled', true);
	$('image:not(.variable):visible').prop('disabled', true);
	
	$('img.variable').css('cursor', 'pointer');
	
	
	// Enable these buttons
	$('.variable').prop('disabled', false);
	
	
	// Add click event over all img variable tabs
	$("img.variable:not(select)").click(function(){
		stopHighlightingVariables(plotCanvasID);
		constrainCustomPlotToBase(plotCanvasID[plotCanvasID.length-1], $(this));
	});
	
	// Restore if click on this canvas
	$("#" + plotCanvasID).click(function(){
		stopHighlightingVariables(plotCanvasID);
	});
	
	
	
	
}

// Allow user to select a variable
function highlightVariables(plotCanvasID, axis){

	stop_controller();
	variableSelectionMode = true;
	
	
	// Set the opacity of the whole page to low
	$('select:not(.variable):visible').fadeTo("slow", "0.3");
	$('input:not(.variable):visible').fadeTo("slow", "0.3");
	$('canvas:not(.variable):visible').fadeTo("slow", "0.3");
	$('img').fadeTo("slow", "0.3");
	
	
	// Disable all buttons
	$('input:not(.variable):visible').prop('disabled', true);
	$('select:not(.variable):visible').prop('disabled', true);
	$('image:visible').prop('disabled', true);
	


	// Change the cursor symbol
	//$('body, html').css('cursor', 'url(src/Images/cursor.png), auto');
	
	
	// Set each appropriate button to full opacity and green color
	$('input.variable').addClass("variable-active");
	$('select.variable').addClass("variable-active");
	$("#SelectVariable").show(true);
	//$('input.variable').addClass("variable-cursor");
	//$('select.variable').addClass("variable-cursor");	
	//$('canvas.variable').addClass("variable-cursor");	
	//$('img.variable').addClass("variable-cursor");	
	

	// Enable these buttons
	$('.variable').prop('disabled', false);
	
	
	// Add click event over all variable tabs
	$(".variable:not(select):not(img)").click(function(){
		stopHighlightingVariables(plotCanvasID);
		setVariableToRecord(plotCanvasID[plotCanvasID.length-1], $(this), axis);
	});
	
	// Add onChange event over all dropdowns
	$("select.variable").change(function(){
		stopHighlightingVariables(plotCanvasID);
		setVariableToRecord(plotCanvasID[plotCanvasID.length-1], $(this), axis);
	});
	

	
	
}


function stopHighlightingVariables(plotCanvasID){


	variableSelectionMode = false;

	
	// Set the opacity of the whole page to normal
	$('select:not(.variable):visible').fadeTo("medium", "1");
	$('input:not(.variable):visible').fadeTo("medium", "1");
	$('canvas:not(.variable):visible').fadeTo("medium", "1");
	$('img:visible').fadeTo("medium", "1");
	
	
	// Enable the buttons
	$("select:visible").prop('disabled', false);
	$("input:visible").prop('disabled', false);
	$("#SelectVariable").hide(true);
	enable_buttons();
	
	// Restore default cursor
	//$('body, html').css('cursor', 'auto');
	$('img.variable').css('cursor', 'auto');
	
	// Get rid of green colours
	$('input.variable').removeClass("variable-active");
	$('select.variable').removeClass("variable-active");
	//$('input.variable').removeClass("variable-cursor");
	//$('select.variable').removeClass("variable-cursor");	
	//$('canvas.variable').removeClass("variable-cursor");	
	//$('img.variable').removeClass("variable-cursor");	
	
	// Remove mouse events
	$(".variable").unbind('click');
	$(".variable").unbind('change');
	

		

}




// Plots values according to a function
function plot_probability_distribution(distn_fn, xmin, xmax, canvasID, xlab = ""){
	
	if ($("#" + canvasID).length == 0) return;

	// Delete the canvas and add it back later so it doesn't bug
	//$("#" + canvasID).remove();
	//$("#" + canvasDivID).html('<canvas id="' + canvasID + '"height="100" width="200"></canvas>');
	
	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	
	//console.log("vals", values);
	
	
	// Tidy up the xmin and xmax
	xmin = roundToSF(xmin);
	xmax = roundToSF(xmax);
	
	if (xmin == xmax) xmax = xmin+1;

	
	var axisGap = 35;
	var binGap = 5;
	var maxNumBins = 16;
	textbox = "";
	
	ctx.globalAlpha = 1;


	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	var widthScale = plotWidth / (xmax - xmin);
	
	
	if (distn_fn != null){
	
		// Find the position of all the coords
		var xVals = [];
		var yVals = [];
		for (var xVal = axisGap; xVal <= canvas.width; xVal++) {	
		
			var x = (xVal - axisGap) / widthScale + xmin;
			var yval = distn_fn(x); // There may be more than one element returned
		
			//console.log("Plotting", x, yval);
			if (yval.length > 1){
				for (var i = 0; i < yval.length; i++){
					xVals.push(xVal);
					yVals.push(yval[i]);
				}
			}else{
				xVals.push(xVal);
				yVals.push(yval);
			}
		
		}
	
		//console.log("Values", xVals, yVals, xmin, xmax);
	

		
		var ymax = maximumFromList(yVals);  
		ymax = roundToSF(ymax * 1.1, 1);
	
	
		var heightScale = plotHeight / ymax;
	
	ctx.beginPath();
	//ctx.lineWidth = 1;
	ctx.fillStyle = "#008CBA";
	ctx.strokeStyle = "#008CBA";
	ctx.moveTo(axisGap, plotHeight);
	for (var i = 0; i < yVals.length; i ++){
		ctx.lineTo(xVals[i], plotHeight - yVals[i] * heightScale);
	}
	/*
	for (var xVal = axisGap; xVal <= canvas.width; xVal++) {
		
		var x = (xVal - axisGap) / widthScale + xmin;
		var yVal = plotHeight - distn_fn(x) * heightScale;
		
		console.log("Plotting for", x, distn_fn(x));
		console.log("Canvas coords", xVal, yVal);
		
		
	}
	*/
		ctx.lineTo(canvas.width, plotHeight);
		ctx.fill();
		ctx.stroke();
	
	}else ymax = 1;
	
	
	
	// Axes
	ctx.lineWidth = 2;
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width, canvas.height - axisGap);
	ctx.stroke();
	
	
	// X label
	ctx.fillStyle = "black";
	ctx.font = "13px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="top"; 
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - 0.5*axisGap;
	ctx.fillText(xlab, xlabXPos, xlabYPos);
	
	// Y label
	ctx.font = "14px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="bottom"; 
	ctx.save()
	var ylabXPos = 2 * axisGap / 5;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillText("Probability density", 0 ,0);
	ctx.restore();
	
	
	
	// X min and max
	var axisPointMargin = 1;
	ctx.font = "12px Arial";
	ctx.textBaseline="top"; 
	ctx.textAlign="left"; 
	ctx.fillText(xmin, axisGap, canvas.height - axisGap + axisPointMargin);
	ctx.textAlign="right"; 
	ctx.fillText(xmax, canvas.width, canvas.height - axisGap + axisPointMargin);




	// Y min and max
	ctx.save()
	ctx.font = "12px Arial";
	ctx.textBaseline="bottom"; 
	ctx.textAlign="right"; 
	ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(0, 0, 0);
	ctx.restore();

	ctx.save()
	ctx.font = "12px Arial";
	ctx.textAlign="right"; 
	ctx.textBaseline="bottom"; 
	ctx.translate(axisGap - axisPointMargin, 0);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ymax, 0, 0);
	ctx.restore();



}


function roundToSF(val, sf=2, ceilOrFloor = "none"){
	
	var magnitude = Math.floor(log(val, 10));

	var num = val * Math.pow(10, sf-magnitude);
	if (ceilOrFloor == "ceil") num = Math.ceil(num)
	else if (ceilOrFloor == "floor") num = Math.floor(num)
	else num = Math.round(num);

	num = num * Math.pow(10, magnitude-sf);
	
	// Sometimes this picks up a trailing .00000000001 which we want to remove

	var expectedStringLength = 0;
	if (magnitude >= 0) expectedStringLength = magnitude >= sf ? magnitude+1 : sf+2; // Add 1 for the decimal point
	else expectedStringLength = 2 -magnitude + sf;
	if (num < 0) expectedStringLength++; // Also need the negative symbol



	num = parseFloat(num.toString().substring(0, expectedStringLength+1));
	
	return num;
		
}





function getPlotOptionsTemplate(){


	return `
		<div id='settingsPopup' style='background-color:adadad; padding: 10 10; position:fixed; width: 30vw; left:35vw; top:20vh; z-index:5' plotNum="XX_plotNum_XX">
			<div style='background-color: ebe9e7; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 22px'> XX_plotName_XX settings </span>


				<span style='font-size: 30px; cursor:pointer; position:fixed; left:64.5vw; top:20.5vh' onclick='closePlotSettingsPopup()'>&times;</span>
				<div style='padding:2; font-size:18px;'> Choose the display settings for this plot </div>
				<table cellpadding=10 style='width:90%; margin:auto;'>
				
					<tr>
						<td id="settingCell1" style="vertical-align:top"> 
							
						</td>
						
						<td id="settingCell2" style="vertical-align:top"> 
							
						</td>
					</tr>


					<tr>
						<td id="settingCell3" style="vertical-align:top"> 
							
						</td>
						
						
						<td id="settingCell4" style="vertical-align:top"> 
							
						</td>
					</tr>



					<tr>
						<td id="settingCell5" style="vertical-align:top"> 
							
						</td>
						
						
						<td id="settingCell6" style="vertical-align:top"> 
							
						</td>
					</tr>



					<tr>
						<td id="settingCell7" style="vertical-align:top"> 
							
						</td>
						
						
						<td id="settingCell8" style="vertical-align:top"> 
							
						</td>
					</tr>
					

				</table>
				
				<input type=button id='submitDistn' class="operation" onClick=saveSettings_controller() value='Save' title="Submit your changes" style="width:60px; float:right"></input>

			</div>
		</div>
	`;

}



function distanceVsTimeOptionsTemplate1(){
	
	return `
		<legend><b>Time range</b></legend>

			<table>

				<tr style="cursor:pointer" onclick= " $('input[name=xRange][value=automaticX]').prop('checked', true); disableTextbox('#xMin_textbox'); disableTextbox('#xMax_textbox') ">
					<td>
						 <input type="radio" name="xRange" value="automaticX"> 
					</td>
					<td>Auto</td>
					<td></td>


				</tr>
				
				
				
				<tr id="pauseXRow" style="cursor:pointer" onclick= " $('input[name=xRange][value=pauseX]').prop('checked', true); disableTextbox('#xMin_textbox'); disableTextbox('#xMax_textbox') ">
					<td>
						 <input type="radio" name="xRange" value="pauseX"> 
					</td>
					<td colspan=2>Pauses (&#x1D6D5; > 1s)</td>
					

				</tr>
				
				
					<tr id="shortPauseXRow" style="cursor:pointer" onclick= " $('input[name=xRange][value=shortPauseX]').prop('checked', true); disableTextbox('#xMin_textbox'); disableTextbox('#xMax_textbox') ">
						<td>
							 <input type="radio" name="xRange" value="shortPauseX"> 
						</td>
						<td colspan=2>Short pauses (1s < &#x1D6D5; < 25s)</td>


					</tr>
				

				
				

			<tr style="cursor:pointer" onclick= " $('input[name=xRange][value=specifyX]').prop('checked', true); enableTextbox('#xMin_textbox'); enableTextbox('#xMax_textbox') ">
				<td>
					<input class="textboxBlue" type="radio" name="xRange" onclick="enableTextbox('#xMin_textbox'); enableTextbox('#xMax_textbox')"  value="specifyX">
				</td>

				<td>
					Min = 
				</td>

				<td>
					<input class="textboxBlue" type="number" style="width:50px; text-align:right" id="xMin_textbox" value = 0> XUNITS 
				</td>
			</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=xRange][value=specifyX]').prop('checked', true); enableTextbox('#xMin_textbox'); enableTextbox('#xMax_textbox') ">
				<td></td>


				<td>
					Max = 
				</td>

				<td>
					<input class="textboxBlue" type="number" style="width:50px; text-align:right" id="xMax_textbox" value = 1> XUNITS 
				</td>
			</tr>
		</table>

	`;
	
}


function distanceVsTimeOptionsTemplate2(){
	
	return `
		<legend><b>Distance range</b></legend>
		<table>

				<tr style="cursor:pointer" onclick= " $('input[name=yRange][value=automaticY]').prop('checked', true); disableTextbox('#yMin_textbox'); disableTextbox('#yMax_textbox') ">
					<td>
						 <input type="radio" name="yRange" value="automaticY"> 
					</td>
					<td>Auto</td>
					<td></td>


				</tr>

			<tr style="cursor:pointer" onclick= " $('input[name=yRange][value=specifyY]').prop('checked', true); enableTextbox('#yMin_textbox'); enableTextbox('#yMax_textbox') ">
				<td>
					<input type="radio" name="yRange" onclick="enableTextbox('#yMin_textbox'); enableTextbox('#yMax_textbox')"  value="specifyY">
				</td>

				<td>
					Min = 
				</td>

				<td>
					<input class="textboxBlue" type="number" style="width:50px; text-align:right" id="yMin_textbox" value=YMINDEFAULT> YUNITS 
				</td>
			</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=yRange][value=specifyY]').prop('checked', true); enableTextbox('#yMin_textbox'); enableTextbox('#yMax_textbox') ">
				<td></td>


				<td>
					Max = 
				</td>

				<td>
					<input class="textboxBlue" type="number" style="width:50px; text-align:right" id="yMax_textbox" value=YMAXDEFAULT> YUNITS 
				</td>
			</tr>
		</table>
	`;
	
}





function distanceVsTimeOptionsTemplate3(){
	
	return `
		<legend><b>Z-axis range</b></legend>
		<table>

				<tr style="cursor:pointer" onclick= " $('input[name=zRange][value=automaticZ]').prop('checked', true); disableTextbox('#zMin_textbox'); disableTextbox('#zMax_textbox') ">
					<td>
						 <input type="radio" name="zRange" value="automaticZ"> 
					</td>
					<td>Auto</td>
					<td></td>


				</tr>

			<tr style="cursor:pointer" onclick= " $('input[name=zRange][value=specifyZ]').prop('checked', true); enableTextbox('#zMin_textbox'); enableTextbox('#zMax_textbox') ">
				<td>
					<input type="radio" name="zRange" onclick="enableTextbox('#zMin_textbox'); enableTextbox('#zMax_textbox')"  value="specifyZ">
				</td>

				<td>
					Min = 
				</td>

				<td>
					<input class="textboxBlue" type="number" style="width:50px; text-align:right" id="zMin_textbox" value=ZMINDEFAULT> 
				</td>
			</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=zRange][value=specifyZ]').prop('checked', true); enableTextbox('#zMin_textbox'); enableTextbox('#zMax_textbox') ">
				<td></td>


				<td>
					Max = 
				</td>

				<td>
					<input class="textboxBlue" type="number" style="width:50px; text-align:right" id="zMax_textbox" value=ZMAXDEFAULT> 
				</td>
			</tr>
		</table>
	`;
	
}




function heatmapZAxisLegend(){
	
	return `
		<legend><b>Point Colour</b></legend> 


		<select class="dropdown" title="Select the colour of the points in this plot" id = "zColouring" style="width:200px; vertical-align: middle; text-align:left;">
			<option value="blue">Blue</option>
			<option value="rainbow">Rainbow</option>
			<option value="greyBlack">Grey-black</option>
			<option value="yellowRed">Yellow-red</option>
		</select>

	`;
	
}


/*
function pauseHistogramOptionsTemplate(){
	
	return `
		Only display the bottom <input id="displayBottomProportionOf" type="text" style="width:80px; text-align:right"></input> of values.
	`;
	
}
*/


function pauseHistogramOptionsTemplate(){
	
	return `
		<legend><b>Measure time taken</b></legend>
		<label style="cursor:pointer"> <input type="radio" onclick="perTemplateDeselected()" name="perTime" value="perCatalysis">To catalyse<br> </label>
		<label style="cursor:pointer"> <input type="radio" onclick="perTemplateSelected()"   name="perTime" value="perTemplate">To copy the template <br> </label>
	`;
	
}


function logSpaceTemplateX(){
	
	return `
		<legend><b>X-axis</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceX" value="linearSpace">Time (s)<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceX" value="logSpace">log time(s)<br> </label>
	`;
	
}


function logSpaceTemplateY(){
	
	return `
		<legend><b>Y-axis</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceY" value="linearSpace">Probability<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceY" value="logSpace">log Probability<br> </label>
	`;
	
}






function windowSizeOptionsTemplate(){
	
	return `
		<b>Window size</b>  <input id="windowSizeInput" type="number" class="textboxBlue" style="width:50px; text-align:right"></input>s.
	`;
	
}



function pauseSiteOptionsTemplate(){

	return `
		<legend><b>Y-axis</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="Yaxis" value="timePercentage">Time (%)<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="Yaxis" value="timeSeconds">Time (s)<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="Yaxis" value="logTimeSeconds">log time(s)<br> </label>
	`;

}


function customPlotSiteConstraintTemplate(){

	return `
		<legend><b>Constrain to the following sites</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="sitesToRecord" onclick="disableTextbox('#sitesToRecord_textbox')" value="allSites">All sites<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="sitesToRecord" onclick="enableTextbox('#sitesToRecord_textbox')"  value="specifySites">Just these ones: </label>
			&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input type="text" class="textboxBlue" placeholder="eg. 1,2,5-10" style="width:250px" id="sitesToRecord_textbox">
	`;


}


function customPlotSelectParameterTemplate(){
	
	return `

		<legend><b>Parameter (x-axis)</b></legend>
		<select class="dropdown" title="Which parameter do you want to show on the x-axis?" id = "customParam" style="vertical-align: middle; text-align:right;">
			<option value="none">Select a parameter...</option>
		</select>

	`;
	
}


function customPlotSelectPropertyTemplate(){
	
	return `

		<legend><b>Metric (y-axis)</b></legend>
		<select class="dropdown" onChange="customYVariableChange()" title="Which metric do you want to show on the y-axis?" id = "customMetric" style="vertical-align: middle; text-align:right;">
			<option value="probability">Probability</option>
			<option value="velocity">Mean velocity (bp/s)</option>
			<option value="catalyTime">Mean catalysis time (s)</option>
			<option value="totalTime">Total transcription time (s)</option>
			<option value="nascentLen">Nascent strand length (nt)</option>
		</select><br>
		Calculated per trial.

	`;
	
}


function parameterHeatmapZAxisTemplate(){

	return `

		<legend><b>Metric (z-axis)</b></legend>
		<select class="dropdown" onChange="heatmapZVariableChange()" title="Which metric do you want to show on the z-axis?" id = "customMetric" style="vertical-align: middle; text-align:right;">
			<option value="probability">Probability</option>
			<option value="velocity">Mean velocity (bp/s)</option>
			<option value="catalyTime">Mean catalysis time (s)</option>
			<option value="totalTime">Mean transcription time (s)</option>
			<option value="nascentLen">Nascent strand length (nt)</option>
		</select><br>
		Calculated per trial.

	`;


}


function getPosteriorCheckboxTemplate(){

	return `
		<label class="switch" title="Only plot points which were accepted by the posterior distribution?">
	 	 	<input type="checkbox" id="plotFromPosterior"> </input>
	 	 	<span class="slider round"></span>
	 	 </label> 
		<span style="font-size:15px; vertical-align:middle">Posterior</span>
		
		

	`;


}


// Decrease the indices of the sites displayed in the long sitewise plot by 100
function minus100Sites(){

	if (basesToDisplayTimes100 == 1) return;
	basesToDisplayTimes100--;
	eval(PLOT_DATA["whichPlotInWhichCanvas"][4]["plotFunction"])(); // Draw the plot again

}


// Increase the indices of the sites displayed in the long sitewise plot by 100
function plus100Sites(){


	var max = Math.ceil(PLOT_DATA["nbases"] / 100);
	if (PLOT_DATA["nbases"] % 100 <= 20) max--;
	if (basesToDisplayTimes100 == max) return;
	basesToDisplayTimes100++;
	eval(PLOT_DATA["whichPlotInWhichCanvas"][4]["plotFunction"])(); // Draw the plot again

}




function plotOptions(plotNum){


	
	closeAllDialogs();
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getPlotOptionsTemplate();
	popupHTML = popupHTML.replace("XX_plotNum_XX", plotNum);
	popupHTML = popupHTML.replace("XX_plotName_XX", $("#selectPlot" + plotNum + " :selected").text());
	$(popupHTML).appendTo('body');


	switch($("#selectPlot" + plotNum).val()){
		

		case "distanceVsTime":
			$("#settingCell1").html(distanceVsTimeOptionsTemplate1().replace("XUNITS", "s").replace("XUNITS", "s"));
			$("#settingCell2").html(distanceVsTimeOptionsTemplate2().replace("YUNITS", "nt").replace("YUNITS", "nt").replace("YMINDEFAULT", 10).replace("YMAXDEFAULT", 100));

			$("#pauseXRow").remove();
			$("#shortPauseXRow").remove();

			console.log('PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"]', PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"]);

			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}

			// Set ymax and ymin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"] == "automaticY") $('input[name="yRange"][value="automaticY"]').click()
			else {
				$('input[name="yRange"][value="specifyY"]').click()
				$("#yMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][0]);
				$("#yMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][1]);
			}

			break;

		case "pauseHistogram":

			$("#settingCell3").html(distanceVsTimeOptionsTemplate1().replace("XUNITS", "s").replace("XUNITS", "s"));
			$("#settingCell1").html(pauseHistogramOptionsTemplate());
			//$("#settingCell2").html(logSpaceTemplateX());
			//$("#settingCell4").html(logSpaceTemplateY());

			// Per site or per template
			$('input[name="perTime"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["perTime"] + '"]').prop('checked', true);
			$('input[name="perTime"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["perTime"] + '"]').click();


			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click();
			else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "pauseX") $('input[name="xRange"][value="pauseX"]').click();
			else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "shortPauseX") $('input[name="xRange"][value="shortPauseX"]').click();
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}


			// Log space or linear space
			$('input[name="timeSpaceX"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceX"] + '"]').prop('checked', true);
			$('input[name="timeSpaceY"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceY"] + '"]').prop('checked', true);


			break;


		case "velocityHistogram":


			$("#settingCell1").html(distanceVsTimeOptionsTemplate1().replace("Time range", "Velocity range").replace("XUNITS", "s").replace("XUNITS", "s"));
			$("#settingCell2").html(windowSizeOptionsTemplate());
			//$("#settingCell3").html(logSpaceTemplateX());
			//$("#settingCell4").html(logSpaceTemplateY());
			
			$("#pauseXRow").remove();
			$("#shortPauseXRow").remove();

			// Window size
			$("#windowSizeInput").val(roundToSF(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["windowSize"] ));

			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}


			// Log space or linear space
			$('input[name="timeSpaceX"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceX"] + '"]').prop('checked', true)
			$('input[name="timeSpaceY"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceY"] + '"]').prop('checked', true)

			//$("#displayBottomProportionOf").val(roundToSF(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["displayBottomProportionOf"] ));


			break;
		
		
		case "pauseSite":

			
			$("#settingCell1").html(pauseSiteOptionsTemplate());

			$('input[name="Yaxis"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yAxis"] + '"]').prop('checked', true)
			break;


		case "custom": 


			// X-axis parameter
			$("#settingCell1").html(customPlotSelectParameterTemplate());

			get_PHYSICAL_PARAMETERS_controller(function(params){
				//console.log("params",params, params.length);
				for (var paramID in params){
					if (!params[paramID]["hidden"] && !params[paramID]["binary"]) $("#customParam").append(`<option value="` + paramID + `" > ` + params[paramID]["name"] + `</option>`);
				}

				$("#customParam").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParam"]);

			});




			// Y-axis attribute
			$("#settingCell3").html(customPlotSelectPropertyTemplate());
			$("#customMetric").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customMetric"]);
			customYVariableChange();


			$("#settingCell2").html(distanceVsTimeOptionsTemplate1().replace("Time range", "X-axis range").replace("XUNITS", "").replace("XUNITS", ""));
			$("#settingCell4").html(distanceVsTimeOptionsTemplate2().replace("Distance range", "Y-axis range").replace("YUNITS", "").replace("YUNITS", "").replace("YMINDEFAULT", 0).replace("YMAXDEFAULT", 1));


			$("#pauseXRow").remove();
			$("#shortPauseXRow").remove();


			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}


			// Set ymax and ymin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"] == "automaticY") $('input[name="yRange"][value="automaticY"]').click()
			else {
				$('input[name="yRange"][value="specifyY"]').click()
				$("#yMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][0]);
				$("#yMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][1]);
			}


			$("#settingCell5").html(getPosteriorCheckboxTemplate());
			if (!PLOT_DATA["thereExistsPosteriorDistribution"]) {
				$("#plotFromPosterior").css("cursor", "auto");
				$("#plotFromPosterior").attr("disabled", "disabled");
			}
			else $("#plotFromPosterior").prop("checked", PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["plotFromPosterior"]);


			/*
			// Site selection KEEP THIS CODE
			$("#settingCell3").html(customPlotSiteConstraintTemplate());
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecord"].length == 0) {
				$('input[name="sitesToRecord"][value="allSites"]').prop('checked', true)
				disableTextbox("#sitesToRecord_textbox");
				
			}else{
				$('input[name="sitesToRecord"][value="specifySites"]').prop('checked', true)
				enableTextbox("#sitesToRecord_textbox");
				$("#sitesToRecord_textbox").val(  convertListToCommaString(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecord"])  );

			}
			*/
			//$('input[name="Yaxis"][value="' + whichPlotInWhichCanvas[plotNum]["yAxis"] + '"]').prop('checked', true)
			break;



		case "parameterHeatmap": 


			// X-axis parameter
			$("#settingCell1").html(customPlotSelectParameterTemplate().replace("customParam", "customParamX"));
			$("#settingCell3").html(customPlotSelectParameterTemplate().replace("x-axis", "y-axis").replace("x-axis", "y-axis").replace("customParam", "customParamY"));

			get_PHYSICAL_PARAMETERS_controller(function(params){
				console.log("params",params, params.length);
				for (var paramID in params){
					if (!params[paramID]["hidden"] && !params[paramID]["binary"]) $("#customParamX").append(`<option value="` + paramID + `" > ` + params[paramID]["name"] + `</option>`);
					if (!params[paramID]["hidden"] && !params[paramID]["binary"]) $("#customParamY").append(`<option value="` + paramID + `" > ` + params[paramID]["name"] + `</option>`);
				}

				$("#customParamX").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamX"]);
				$("#customParamY").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamY"]);

			});


			// Z-axis
			$("#settingCell5").html(parameterHeatmapZAxisTemplate());
			$("#settingCell6").html(distanceVsTimeOptionsTemplate3().replace("ZMINDEFAULT", 0).replace("ZMAXDEFAULT", 1));
			$("#customMetric").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["metricZ"]);
			heatmapZVariableChange();


			// Z axis colouring
			$("#settingCell7").html(heatmapZAxisLegend());
			$("#zColouring").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zColouring"]);


			// Y-axis attribute
			$("#settingCell2").html(distanceVsTimeOptionsTemplate1().replace("Time range", "X-axis range").replace("XUNITS", "").replace("XUNITS", ""));
			$("#settingCell4").html(distanceVsTimeOptionsTemplate2().replace("Distance range", "Y-axis range").replace("YUNITS", "").replace("YUNITS", "").replace("YMINDEFAULT", 0).replace("YMAXDEFAULT", 1));
			$("#pauseXRow").remove();
			$("#shortPauseXRow").remove();


			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}


			// Set ymax and ymin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"] == "automaticY") $('input[name="yRange"][value="automaticY"]').click()
			else {
				$('input[name="yRange"][value="specifyY"]').click()
				$("#yMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][0]);
				$("#yMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][1]);
			}



			// Set zmax and zmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zRange"] == "automaticZ") $('input[name="zRange"][value="automaticZ"]').click()
			else {
				$('input[name="zRange"][value="specifyZ"]').click()
				$("#zMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zRange"][0]);
				$("#zMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zRange"][1]);
			}



			$("#settingCell8").html(getPosteriorCheckboxTemplate());
			console.log("exists", PLOT_DATA["thereExistsPosteriorDistribution"]);
			if (!PLOT_DATA["thereExistsPosteriorDistribution"]) {
				$("#plotFromPosterior").css("cursor", "auto");
				$("#plotFromPosterior").attr("disabled", "disabled");
			}
			else $("#plotFromPosterior").prop("checked", PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["plotFromPosterior"]);

			break;



	}





	
	window.setTimeout(function(){
		
		$("#main").click(function(){
			closePlotSettingsPopup();
		});
		
		$("#mySidenav").click(function(){
			closePlotSettingsPopup();
		});
		
	}, 50);


}


// If the perTemplate option is selected from the time histogram settings menu, then we hide the pause/short pause options
function perTemplateSelected(){
	$("#pauseXRow").hide(0);
	$("#shortPauseXRow").hide(0);
	if ($('input[name="xRange"][value="pauseX"]').prop("checked") || $('input[name="xRange"][value="shortPauseX"]').prop("checked")) $('input[name="xRange"][value="automaticX"]').click();
}


// If the perTemplate option is selected from the time histogram settings menu, then we hide the pause/short pause options
function perTemplateDeselected(){
	$("#pauseXRow").show(0);
	$("#shortPauseXRow").show(0);
}


function customYVariableChange(){
	if ($("#customMetric").length != 0 && $("#customMetric").val() == "probability") $("#settingCell4").hide(0);
	else $("#settingCell4").show(0);
}


function heatmapZVariableChange(){
	if ($("#customMetric").length != 0 && $("#customMetric").val() == "probability") {
		$("#settingCell6").hide(0);
		$("#settingCell7").hide(0);
	}
	else {
		$("#settingCell6").show(0);
		$("#settingCell7").show(0);
	}
}



// Assumes input list is sorted
// Input: numeric array: [1,2,5,6,7,8,9,10]
// Output: string: "1,2,5-10"
function convertListToCommaString(list){

	console.log("Pasring list", list);
	var string = "";
	for (var i = 0; i < list.length; i ++){
		var thisNum = list[i];
		var nextNum = list[i+1];

		// If the next number is not the following integer then move on 
		if (nextNum == null || thisNum+1 != nextNum){
			string += nextNum != null ? (thisNum + ", ") : thisNum;
			continue;
		}

		// Otherwise we keep looping intil the next integer is not 1 greater than this one
		var incrSize = 1;
		while (i < list.length-1){
			if (thisNum + incrSize + 1 != list[i+incrSize + 1]) break;
			incrSize++;
		}
		nextNum = list[i+incrSize];
		i += incrSize;
		string += i < list.length-1 ? (thisNum + "-" + nextNum + ", ") : (thisNum + "-" + nextNum);

	}
	return string;


}



// Input: string: "1,2,5-10"
// Output: numeric array: [1,2,5,6,7,8,9,10]
function convertCommaStringToList(string){


	var list = [];
	var bits = string.split(",");
	for (var i = 0; i < bits.length; i ++){
		bit = bits[i].trim();
		if (bit == "") continue;

		if (bit.match("-")){
			var lowerUpper = bit.split("-");
			var lower = parseFloat(lowerUpper[0].trim());
			var upper = parseFloat(lowerUpper[1].trim());
			if (isNaN(lower) || isNaN(upper)) continue; // Don't add non-numbers
			for (var j = lower; j <= upper; j ++){
				if (list.indexOf(j) == -1) list.push(j); // Don't add duplicates
			} 

		}else {
			var floatBit = parseFloat(bit);
			if (!isNaN(floatBit) && list.indexOf(floatBit == -1)) list.push(floatBit); // Don't add non-numbers or duplicates
		}

	}

	function sortNumber(a,b) {
    		return a - b;
	}


	// TODO: remove duplicates
	return list.sort(sortNumber);


}





function closePlotSettingsPopup(){
	
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#settingsPopup").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);

	
	
}

function disableTextbox(selector){
	$(selector).attr("disabled", true);
	$(selector).addClass(".parameter-disabled");
	$(selector).removeClass("textboxBlue");
}

function enableTextbox(selector){
	$(selector).attr("disabled", false);
	$(selector).removeClass(".parameter-disabled");
	$(selector).addClass("textboxBlue");
}












// Push data into its correct position in a sorted array
function sortedPush( array, value ) {
	

	var index = binaryFind(array, value);
	array.splice(index, 0, value);

	
   // array.splice( _.sortedIndex( array, value ), 0, value );
}


// Finds the position within a sorted array of numbers to add the new element
function binaryFind(sortedArray, searchElement) {

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







