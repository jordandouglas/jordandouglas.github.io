
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



function initABCpanel(){

	$(".beginABC_btn").css("cursor", "auto");
	$(".beginABC_btn").css("background-color", "#858280");
	$(".beginABC_btn").attr("disabled", "disabled");

	$("#ABCPanelTable1").html("");
	$("#ABCPanelTable2").html("");

	nFits = 0;
	ABCtableToUse = 1; // Alternate between the left (1) and right (2) tables
	addNewCurveButtons();

}






// Loads all the settings from the DOM and sends them through to the model so ABC can begin
// Assumes that all force-velocity input textareas have already been validated
function beginABC(which = "ABC"){


	// Load the force-velocity values
	var abcDataObjectForModel = getAbcDataObject(which)

	console.log("Sending object", abcDataObjectForModel);


	// Set to hidden mode and prevent user from changing to regular mode
	$("#PreExp").val("hidden");
	$("#PreExp").attr("disabled", "disabled");
	$("#PreExp").css("cursor", "auto");
	$("#PreExp").css("background-color", "#858280");
	changeSpeed_controller();


	beginABC_controller(abcDataObjectForModel);

	// Update the DOM so that we can see that ABC is running
	$(".beginABC_btn").val("Stop ABC");
	$(".beginABC_btn").attr("onclick", "stop_controller()");
	hideButtonAndShowStopButton("simulate");


	// Disable the ntrials textboxes
	$("#ABCntrials").css("cursor", "auto");
	$("#ABCntrials").css("background-color", "#858280");
	$("#ABCntrials").attr("disabled", "disabled");


	$("#MCMCntrials").css("cursor", "auto");
	$("#MCMCntrials").css("background-color", "#858280");
	$("#MCMCntrials").attr("disabled", "disabled");




	//$("#ABC_RSS").css("cursor", "auto");
	//$("#ABC_RSS").css("background-color", "#858280");
	//$("#ABC_RSS").attr("disabled", "disabled");


	onABCStart();



}



function onABCStart(){



	$("#downloadABC").show(50);
	$("#uploadABC").hide(50);
	
	$("#ABCacceptancePercentage_span").show(50);
	if (!$("#ABC_useMCMC").prop("checked")) $("#ABC_showRejectedParameters_span").show(50);
	$("#ABCacceptancePercentage_val").html("0");
	$("#ABCacceptance_span").show(50);
	$("#nRowsToDisplayABC").show(50);
	$("#ABCacceptance_val").html("0");



}


function getAbcDataObject(which = "ABC"){
	
	
	var curveTables = $(".ABCcurveRow");
	var abcDataObjectForModel = {};

	if (which == "ABC"){
		abcDataObjectForModel.inferenceMethod = "ABC";
		abcDataObjectForModel.ntrials = $("#ABCntrials").val();
		abcDataObjectForModel.testsPerData = $("#ABC_ntestsperdata").val();
	}

	else if (which == "MCMC"){
		abcDataObjectForModel.inferenceMethod = "MCMC";
		abcDataObjectForModel.ntrials = $("#MCMCntrials").val();
		abcDataObjectForModel.testsPerData = $("#MCMC_ntestsperdata").val();
		abcDataObjectForModel.burnin = $("#MCMC_burnin").val();
		abcDataObjectForModel.logEvery = $("#MCMC_logevery").val();
		abcDataObjectForModel.RSSthreshold = $("#MCMC_RSSthreshold").val();
		
	}

	abcDataObjectForModel["fits"] = {};
	for (var fitNum = 0; fitNum <= curveTables.length; fitNum++){

		

		var table = $(curveTables[fitNum]);
		var fitID = table.attr("fitID");


		// Which type of data?
		var dataType = $("#forceVelocityInputData_" + fitID).length > 0 ? "forceVelocity" : $("#ntpVelocityInputData_" + fitID).length > 0 ? "ntpVelocity" : null;

		if (dataType == null) continue;

		var dataValues = $("#" + dataType + "InputData_" + fitID).val();
		abcDataObjectForModel["fits"][fitID] = {vals: []};
		abcDataObjectForModel["fits"][fitID]["dataType"] = dataType;
		abcDataObjectForModel["fits"][fitID]["RSSthreshold"] = parseFloat($("#ABC_RSS_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["ATPconc"] = parseFloat($("#ATPconc_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["CTPconc"] = parseFloat($("#CTPconc_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["GTPconc"] = parseFloat($("#GTPconc_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["UTPconc"] = parseFloat($("#UTPconc_" + fitID).val());


		// NTP velocity data also has a force 
		if (dataType == "ntpVelocity") abcDataObjectForModel["fits"][fitID]["force"] = parseFloat($("#ABC_force_" + fitID).val());


		var splitValues = dataValues.split("\n");
		if (splitValues.length == 0) valid = false;

		for (var lineNum = 0; lineNum < splitValues.length; lineNum++){
			var splitLine = splitValues[lineNum].split(",");

			if (splitLine.length == 1 && splitLine[0].trim() == "") continue;

			var X_axis_value = parseFloat(splitLine[0]);
			var Y_axis_value = parseFloat(splitLine[1]);


			if    (dataType == "forceVelocity") abcDataObjectForModel["fits"][fitID]["vals"].push({force: X_axis_value, velocity: Y_axis_value});
			else if (dataType == "ntpVelocity") abcDataObjectForModel["fits"][fitID]["vals"].push({ntp: X_axis_value, velocity: Y_axis_value});

		}
	}


	return abcDataObjectForModel;


}






function validateAllAbcDataInputs(){

	var textareas = $(".ABCinputData");
	var valid = true;
	for (var i = 0; i < textareas.length; i ++){
		valid = valid && validateExperimentalDataInput(textareas[i]);
	}


	// If something is invalid then deactivate the start ABC button
	if (!valid && !running_ABC){
		$(".beginABC_btn").css("cursor", "auto");
		$(".beginABC_btn").css("background-color", "#858280");
		$(".beginABC_btn").attr("disabled", "disabled");
	}


	// Else activate it
	else{
		$(".beginABC_btn").css("cursor", "pointer");
		$(".beginABC_btn").css("background-color", "#663399");
		$(".beginABC_btn").attr("disabled", false);
	}


}


// Ensure that the force velocity input textarea is valid
function validateExperimentalDataInput(ele){


	var valid = true;

	var dataType =  $(ele).attr("id").indexOf("forceVelocity") != -1 ? "forceVelocity" : 
					$(ele).attr("id").indexOf("ntpVelocity") != -1 ? "ntpVelocity" : null;


	// Ensure that the values in this textbox are in the format force, velocity with lines separating observations
	var ABCdataValues = $(ele).val();
	var splitValues = ABCdataValues.split("\n");
	if (splitValues.length == 0) valid = false;
	var thereExistsOnePairOfNumbers = false;
	var X_axis_values = []; // Ensure no duplicate X_axis_values
	var velocities = [];
	for (var lineNum = 0; lineNum < splitValues.length; lineNum++){
		var splitLine = splitValues[lineNum].split(",");
		if (splitLine.length == 1 && splitLine[0].trim() == "") continue;

		if (splitLine.length != 2) {
			valid = false;
			break;
		}

		// Check that these are numbers
		var X_axis_value = parseFloat(splitLine[0]);
		var velocity = parseFloat(splitLine[1]);
		if (isNaN(X_axis_value) || isNaN(velocity)){
			valid = false;
			break;
		}


		// Check that the x-axis value is not a duplicate
		if (X_axis_values.indexOf(X_axis_value) != -1){
			valid = false;
			break;
		}


		// Check that NTP concentration is positive
		if (dataType == "ntpVelocity" && X_axis_value <= 0){
			valid = false;
			break;
		}


		X_axis_values.push(X_axis_value);
		velocities.push(velocity);
		thereExistsOnePairOfNumbers = true;

	}


	// If there are no observations and only empty lines then valid is set to false
	if (!thereExistsOnePairOfNumbers) valid = false;


	if (valid) {
		var fitID = $(ele).attr("id").split("_")[1];
		if (dataType == "forceVelocity") drawForceVelocityCurveCanvas(fitID, X_axis_values, velocities);
		else if (dataType == "ntpVelocity") drawNtpVelocityCurveCanvas(fitID, X_axis_values, velocities);
	}


	return valid;

}







// Update the parameter dropdown lists in case a parameter is no longer applicable or a new parameter is applicable
function updateABCpanel(){


	var toCall = () => new Promise((resolve) => get_PHYSICAL_PARAMETERS_controller(resolve));
	toCall().then((params) => {

		for (var ruleNum = 1; ruleNum <= numberABCrules; ruleNum ++){
			var ifDropdowns =  $(".ifParameterName" + ruleNum);
			for (var dropdownNum = 0; dropdownNum < ifDropdowns.length; dropdownNum++){
				
				var dropdown = $(ifDropdowns[dropdownNum]);

				var optionValues = dropdown.find("option").map(function() {return $(this).val();}).get();
				for (paramID in params){

					if (params[paramID]["binary"]) continue;

					// If an option in the dropdown is no longer an applicable param then remove it
					if (params[paramID]["hidden"] && optionValues.indexOf(paramID) != -1) {
						if (dropdown.val() == paramID) dropdown.val("FAssist") // Set the current parameter to FAssist if this one is selected
						dropdown.find("option[value='" + paramID + "']").remove(); // Remove the option from the list
					}

					// If any parameters are not in dropdown list then add it
					else if(!params[paramID]["hidden"] && optionValues.indexOf(paramID) == -1) {
						dropdown.append(
							`<option value="` + paramID + `" > ` + params[paramID]["name"] + `</option>`
						);
					}

				}

			}

		}

	});
	



}




function highlightABCoutputRow(element){



	// If already highlighted, remove it
	if(element.className.indexOf("ABC_output_highlighted") != -1){
		$(element).removeClass("ABC_output_highlighted");
	}

	// Else highlight it
	else $(element).addClass("ABC_output_highlighted");

}





function addNewCurveButtons(){

	var btns = getNewCurveButtonsTemplate();
	$("#ABCPanelTable" + ABCtableToUse).append(btns);


	// Disable the Begin ABC button
	$(".beginABC_btn").css("cursor", "auto");
	$(".beginABC_btn").css("background-color", "#858280");
	$(".beginABC_btn").attr("disabled", "disabled");


}



function getNewCurveButtonsTemplate(){


	return `

		<tr id="newABCcurve" >

			<td style="vertical-align:middle; font-size:20px; text-align:center;" colspan=3>
				<br><br>
				<div style="padding: 5 5; background-color:#b3b3b3; font-size:16px; width:300px; margin:auto">

					Add experimental data <br><br>
					<input type=button onClick='addNewABCData("forceVelocity")' value='+ Force-velocity curve' title="Add force-velocity experimental data" class="operation ABCbtn" style="background-color:#008CBA; width: 200px"> 
					<br><br>
					<input type=button onClick='addNewABCData("ntpVelocity")' value='+ [NTP]-velocity curve' title="Add [NTP]-velocity experimental data" class="operation ABCbtn" style="background-color:#008CBA; width: 200px">
					<br><br>
				</div>

			</td>
		</tr>
	
	`;

}


function addNewABCData(type = "forceVelocity"){


	nFits++;
	var fitID = "fit" + nFits;

	var HTMLtemplate = "";
	switch(type){
		case "forceVelocity": 
			HTMLtemplate = getABCforceVelocityCurveTemplate(fitID);
			break;

		case "ntpVelocity":
			HTMLtemplate = getABCntpVelocityCurveTemplate(fitID);
			break;
	}

	
	
	
	
	// Add the curve template to the newly opened cell
	$("#ABCPanelTable" + ABCtableToUse).append(HTMLtemplate);
	if ($("#ABC_useMCMC").prop("checked")) $(".rejection_ABC_RSS").hide(0);
	else $(".rejection_ABC_RSS").show(0);

	// Switch to the other ABC table next time so we have 2 columns of curves
	ABCtableToUse ++;
	if (ABCtableToUse > 2) ABCtableToUse = 1;

	// Draw the canvas
	switch(type){
		case "forceVelocity": 
			drawForceVelocityCurveCanvas(fitID);
			break;

		case "ntpVelocity":
			drawNtpVelocityCurveCanvas(fitID);
			break;
	}


	// Delete the new buttons and move them to the next cell
	$("#newABCcurve").remove(); 
	addNewCurveButtons();


}



function getABCforceVelocityCurveTemplate(fitID){



	return `
		<tr fitID="` + fitID + `" class="ABCcurveRow forceVelocityRow"> <!-- style="background-color:#b3b3b3;"> -->


			<td class="` + fitID + `" style="width:200px; text-align:center; vertical-align:top">
				<br><br>
				<div style="font-size:18px;">Force-velocity experimental data</div>


					<textarea class="ABCinputData forceVelocityInputData" id="forceVelocityInputData_` + fitID + `" onChange="validateAllAbcDataInputs()" style="font-size:14px; padding: 5 10;  width: 200px; height: 200px; max-width:200px; max-height:500px; min-height:100px; min-width:200px"  
					title="Input force-velocity data in the specified format" placeholder="Example.                                  -5, 15.5                                 10, 17.4                                14, 18.5"></textarea>
					<br><br>
					<span style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Input force (pN) and velocity (bp/s) observations. Separate force and velocity values with a comma and separate observations with a line break. 
						Ensure there are no duplicate forces.
					</span>

			</td>


			<td class="` + fitID + `" style="width:300px; text-align:center; vertical-align:top">

				<div style="font-size:20px;">
					Force-velocity curve
					<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer;" href="about/#forceVelocity_ABCSectionHelp"><img class="helpIcon" src="src/Images/help.png"></a>
				</div>


					<canvas id="forceVelocityCurve_` + fitID + `" width=300 height=300> </canvas>

			</td>



			<td class="` + fitID + `" style="text-align:center; vertical-align:top">

					<br><br>
					<table style="width:250px; margin:auto">


						<tr>
							<td colspan=2 style="text-align:center;">

								<div style="font-size:18px;">NTP Concentrations</div>
							</td>

						</tr>

						<tr>
							<td style="text-align:right;">
					 			[ATP] = 
					 		</td>

					 		<td>
					 			<input class="variable" value=1000   type="number" id="ATPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M 
							</td>
					 	</tr>


					 	<tr>
							<td style="text-align:right;">
					 			[CTP] = 
					 		</td>

					 		<td>
					 			<input class="variable" value=1000  type="number"  id="CTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M
							</td>
					 	</tr>




					 	<tr>
							<td style="text-align:right;">
					 			[GTP] = 
					 		</td>

					 		<td>
								<input class="variable" value=1000 type="number"  id="GTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M
							</td>
					 	</tr>



					 	<tr>
							<td style="text-align:right;">
					 			[UTP] = 
					 		</td>

					 		<td>
								<input class="variable" value=1000 type="number" id="UTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M	
							</td>
					 	</tr>



					 </table>

					 <br>
					 <div style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Enter the NTP concentrations for this experiment.
					</div> <br> <br>


					<div class="rejection_ABC_RSS">
						Mean RSS threshold:
							<input type="number" id="ABC_RSS_` + fitID + `" value=3 title="Accept parameters into the posterior distribution only if the mean residual sum of squares (RSS) for this dataset is less than this threshold"
								 class="variable" style="vertical-align: middle; text-align:left; width: 70px;  font-size:14px; background-color:#008CBA">
					</div>
			</td>

		</tr>



	`;


}


function getABCntpVelocityCurveTemplate(fitID){
	return `
		<tr fitID="` + fitID + `" class="ABCcurveRow ntpVelocityRow"> <!-- style="background-color:#b3b3b3;"> -->


			<td class="` + fitID + `" style="width:200px; text-align:center; vertical-align:top">
				<br><br>
				<div style="font-size:18px;">[NTP]-velocity experimental data</div>


					<textarea class="ABCinputData ntpVelocityInputData" id="ntpVelocityInputData_` + fitID + `" onChange="validateAllAbcDataInputs()" style="font-size:14px; padding: 5 10;  width: 200px; height: 200px; max-width:200px; max-height:500px; min-height:100px; min-width:200px"  
					title="Input NTP-velocity data in the specified format" placeholder="Example.                                  1, 0.5                                 10, 12.8                                50, 19.6"></textarea>
					<br><br>
					<span style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Input [NTP]/[NTP]<sub>eq</sub> ratios, and velocity (bp/s) observations. Separate concentration and velocity values with a comma and separate observations with a line break. 
						Ensure there are no duplicate concentrations.
					</span>

			</td>


			<td class="` + fitID + `" style="width:300px; text-align:center; vertical-align:top">

				<div style="font-size:20px;">
					[NTP]-velocity curve
					<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer;" href="about/#ntpVelocity_ABCSectionHelp"><img class="helpIcon" src="src/Images/help.png"></a>
						
				</div>

					
					<canvas id="ntpVelocityCurve_` + fitID + `" width=300 height=300> </canvas>

			</td>



			<td class="` + fitID + `" style="text-align:center; vertical-align:top">



					<br><br>
					Force:
						<input type="number" id="ABC_force_` + fitID + `" value=0 title="The force (pN) applied during this experiment"
							 class="variable" style="vertical-align: middle; text-align:left; width: 70px;  font-size:14px; background-color:#008CBA">pN <br> <br>

					

					<table style="width:250px; margin:auto">

						<tr>
							<td colspan=2 style="text-align:center;">

								<div style="font-size:18px;">NTP<sub>eq</sub> Concentrations</div>
							</td>

						</tr>

						<tr>
							<td style="text-align:right;">
					 			[ATP]<sub>eq</sub> = 
					 		</td>

					 		<td>
					 			<input class="variable" value=5   type="number" id="ATPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M 
							</td>
					 	</tr>


					 	<tr>
							<td style="text-align:right;">
					 			[CTP]<sub>eq</sub> = 
					 		</td>

					 		<td>
					 			<input class="variable" value=2.5  type="number"  id="CTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M
							</td>
					 	</tr>




					 	<tr>
							<td style="text-align:right;">
					 			[GTP]<sub>eq</sub> = 
					 		</td>

					 		<td>
								<input class="variable" value=10 type="number"  id="GTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M
							</td>
					 	</tr>



					 	<tr>
							<td style="text-align:right;">
					 			[UTP]<sub>eq</sub> = 
					 		</td>

					 		<td>
								<input class="variable" value=10 type="number" id="UTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M	
							</td>
					 	</tr>



					 </table>

					 <br>
					 <div style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Enter the four concentrations which are equal to 1[NTP]<sub>eq</sub>
					</div> <br> <br>




					Mean RSS threshold:
						<input type="number" id="ABC_RSS_` + fitID + `" value=3 title="Accept parameters into the posterior distribution only if the mean residual sum of squares (RSS) for this dataset is less than this threshold"
							 class="variable" style="vertical-align: middle; text-align:left; width: 70px;  font-size:14px; background-color:#008CBA">

			</td>

		</tr>



	`;
}




function drawForceVelocityCurveCanvas(fitID, forces = null, velocities = null){


	
	var canvas = $("#forceVelocityCurve_" + fitID)[0];
	if (canvas == null) return;

	var ctx = canvas.getContext('2d');

	var canvasSizeMultiplier = 1;
	var axisGap = 45 * canvasSizeMultiplier;
	var margin = 3 * canvasSizeMultiplier;




	getPosteriorDistribution_controller(function(result){

		
		var abcDataObjectForModel = getAbcDataObject();

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (forces != null && velocities != null){

			var plotWidth = canvas.width - axisGap - margin;
			var plotHeight = canvas.height - axisGap - margin;


			var xmin = roundToSF(minimumFromList(forces), 2, "floor");
			var xmax = roundToSF(maximumFromList(forces), 2, "ceil");
			var ymin = 0;
			var ymax = roundToSF(maximumFromList(velocities) * 1.3, 3, "ceil");

			if (xmax == xmin){
				xmax += 5;
				xmin -= 5;
			}

			if (ymax == ymin){
				ymax += 5;
			}

			var widthScale = plotWidth / (xmax - xmin);
			var heightScale = plotHeight / (ymax - ymin);



			// Plot the posterior distribution of curves
			var posterior = result["posterior"];
			

			ctx.globalAlpha = 0.4;
			ctx.strokeStyle = "#008CBA";
			ctx.lineWidth = 2 * canvasSizeMultiplier;


			// Find the starting and stopping index of these posterior velocities in the list
			var fitIDs = [];
			for (var fitID_temp in abcDataObjectForModel["fits"]) fitIDs.push(fitID_temp);
			fitIDs.sort();
			var startingObsNum = 0;
			for (var fitNum = 0; fitNum < fitIDs.length; fitNum++){
				if (fitIDs[fitNum] == fitID) break;
				startingObsNum += abcDataObjectForModel["fits"][fitIDs[fitNum]]["vals"].length;
			}



			// If MCMC then account for the burn-in
			var startingPosteriorNum = $("#ABC_useMCMC").prop("checked") ? Math.floor(parseFloat($("#MCMC_burnin").val()) / 100 * posterior.length) : 0;

			for (var postNum = startingPosteriorNum; postNum < posterior.length; postNum++){


				var posteriorVelocities = posterior[postNum]["velocity"]["vals"];

				ctx.beginPath();
				var xPrime = widthScale * (forces[0] - xmin) + axisGap;
				var yPrime = plotHeight + margin - heightScale * (posteriorVelocities[startingObsNum] - ymin);
				ctx.moveTo(xPrime, yPrime);


				//console.log("Plotting starting from", startingObsNum);

				for (var forceNum = 1; forceNum < forces.length; forceNum++ ){
					
					var index = startingObsNum + forceNum;
					var xPrime = widthScale * (forces[forceNum] - xmin) + axisGap;
					var yPrime = plotHeight + margin - heightScale * (posteriorVelocities[index] - ymin);
					//console.log("Plotting starting", index);
					ctx.lineTo(xPrime, yPrime);
				}


				ctx.stroke();


			}



			// Add the force-velocity values to the plot
			ctx.globalAlpha = 1;
			ctx.strokeStyle = "black";
			for (var obsNum = 0; obsNum < forces.length; obsNum++){
					
				var xPrime = widthScale * (forces[obsNum] - xmin) + axisGap;
				var yPrime = plotHeight + margin - heightScale * (velocities[obsNum] - ymin);


				// Add circle
				ctx.beginPath();
				ctx.fillStyle = "black"; // ;
				ctx_ellipse(ctx, xPrime, yPrime, 3 * canvasSizeMultiplier, 3 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
				ctx.fill();


			}
				

			// X min and max
			var axisPointMargin = 10 * canvasSizeMultiplier;
			ctx.font = 12 * canvasSizeMultiplier + "px Arial";
			ctx.textBaseline="top"; 
			ctx.textAlign="left"; 
			ctx.fillText(xmin, axisGap, canvas.height - axisGap + axisPointMargin);
			ctx.textAlign="right"; 
			ctx.fillText(xmax, canvas.width - margin, canvas.height - axisGap + axisPointMargin);


			// Y min and max
			ctx.save()
			ctx.font = 12 * canvasSizeMultiplier + "px Arial";
			ctx.textBaseline="bottom"; 
			ctx.textAlign="right"; 
			ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
			ctx.rotate(-Math.PI/2);
			ctx.fillText(0, 0, 0);
			ctx.restore();
			
			ctx.save()
			ctx.font = 12 * canvasSizeMultiplier + "px Arial";
			ctx.textAlign="right"; 
			ctx.textBaseline="bottom"; 
			ctx.translate(axisGap - axisPointMargin, margin);
			ctx.rotate(-Math.PI/2);
			ctx.fillText(ymax, 0, 0);
			ctx.restore();
			

		}



		// Axes
		ctx.strokeStyle = "black";
		ctx.lineWidth = 2 * canvasSizeMultiplier;
		ctx.beginPath();
		ctx.moveTo(axisGap, margin);
		ctx.lineTo(axisGap, canvas.height - axisGap);
		ctx.lineTo(canvas.width - margin, canvas.height - axisGap);
		ctx.stroke();

		

		// X label
		ctx.fillStyle = "black";
		ctx.font = 20 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign="center"; 
		ctx.textBaseline="top"; 
		var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
		var xlabYPos = canvas.height - axisGap / 2;
		ctx.fillText("Force (pN)", xlabXPos, xlabYPos);
		
		// Y label
		ctx.font = 20 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign="center"; 
		ctx.textBaseline="bottom"; 
		ctx.save()
		var ylabXPos = 2 * axisGap / 3;
		var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
		ctx.translate(ylabXPos, ylabYPos);
		ctx.rotate(-Math.PI/2);
		ctx.fillText("Velocity (bp/s)", 0 ,0);
		ctx.restore();

	});

}







function drawNtpVelocityCurveCanvas(fitID, concentrations = null, velocities = null){


	
	var canvas = $("#ntpVelocityCurve_" + fitID)[0];
	if (canvas == null) return;

	var ctx = canvas.getContext('2d');

	var canvasSizeMultiplier = 1;
	var axisGap = 45 * canvasSizeMultiplier;
	var margin = 3 * canvasSizeMultiplier;




	getPosteriorDistribution_controller(function(result){

		var abcDataObjectForModel = getAbcDataObject();
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (concentrations != null && velocities != null){

			var plotWidth = canvas.width - axisGap - margin;
			var plotHeight = canvas.height - axisGap - margin;


			var xmin = 0;
			var xmax = roundToSF(maximumFromList(concentrations), 2, "ceil");
			var ymin = 0;
			var ymax = roundToSF(maximumFromList(velocities) * 1.3, 3, "ceil");

			if (xmax == xmin){
				xmax += 10;
			}

			if (ymax == ymin){
				ymax += 5;
			}

			var widthScale = plotWidth / (xmax - xmin);
			var heightScale = plotHeight / (ymax - ymin);



			// Plot the posterior distribution of curves
			var posterior = result["posterior"];
			

			ctx.globalAlpha = 0.4;
			ctx.strokeStyle = "#008CBA";
			ctx.lineWidth = 2 * canvasSizeMultiplier;






			// Find the starting and stopping index of these posterior velocities in the list
			var fitIDs = [];
			for (var fitID_temp in abcDataObjectForModel["fits"]) fitIDs.push(fitID_temp);
			fitIDs.sort();
			var startingObsNum = 0;
			for (var fitNum = 0; fitNum < fitIDs.length; fitNum++){
				if (fitIDs[fitNum] == fitID) break;
				startingObsNum += abcDataObjectForModel["fits"][fitIDs[fitNum]]["vals"].length;
			}


			// If MCMC then account for the burn-in
			var startingPosteriorNum = $("#ABC_useMCMC").prop("checked") ? Math.floor(parseFloat($("#MCMC_burnin").val()) / 100 * posterior.length) : 0;

			for (var postNum = startingPosteriorNum; postNum < posterior.length; postNum++){


				var posteriorVelocities = posterior[postNum]["velocity"]["vals"];

				ctx.beginPath();
				var xPrime = widthScale * (concentrations[0] - xmin) + axisGap;
				var yPrime = plotHeight + margin - heightScale * (posteriorVelocities[startingObsNum] - ymin);
				ctx.moveTo(xPrime, yPrime);


				for (var concNum = 1; concNum < concentrations.length; concNum++ ){
					var index = startingObsNum + concNum;
					var xPrime = widthScale * (concentrations[concNum] - xmin) + axisGap;
					var yPrime = plotHeight + margin - heightScale * (posteriorVelocities[index] - ymin);

					ctx.lineTo(xPrime, yPrime);
				}


				ctx.stroke();



			}



			// Add the force-velocity values to the plot
			ctx.globalAlpha = 1;
			ctx.strokeStyle = "black";
			for (var obsNum = 0; obsNum < concentrations.length; obsNum++){
					
				var xPrime = widthScale * (concentrations[obsNum] - xmin) + axisGap;
				var yPrime = plotHeight + margin - heightScale * (velocities[obsNum] - ymin);


				// Add circle
				ctx.beginPath();
				ctx.fillStyle = "black"; // ;
				ctx_ellipse(ctx, xPrime, yPrime, 3 * canvasSizeMultiplier, 3 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
				ctx.fill();


			}
				

			// X min and max
			var axisPointMargin = 10 * canvasSizeMultiplier;
			ctx.font = 12 * canvasSizeMultiplier + "px Arial";
			ctx.textBaseline="top"; 
			ctx.textAlign="left"; 
			ctx.fillText(xmin, axisGap, canvas.height - axisGap + axisPointMargin);
			ctx.textAlign="right"; 
			ctx.fillText(xmax, canvas.width - margin, canvas.height - axisGap + axisPointMargin);


			// Y min and max
			ctx.save()
			ctx.font = 12 * canvasSizeMultiplier + "px Arial";
			ctx.textBaseline="bottom"; 
			ctx.textAlign="right"; 
			ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
			ctx.rotate(-Math.PI/2);
			ctx.fillText(0, 0, 0);
			ctx.restore();
			
			ctx.save()
			ctx.font = 12 * canvasSizeMultiplier + "px Arial";
			ctx.textAlign="right"; 
			ctx.textBaseline="bottom"; 
			ctx.translate(axisGap - axisPointMargin, margin);
			ctx.rotate(-Math.PI/2);
			ctx.fillText(ymax, 0, 0);
			ctx.restore();
			

		}



		// Axes
		ctx.strokeStyle = "black";
		ctx.lineWidth = 2 * canvasSizeMultiplier;
		ctx.beginPath();
		ctx.moveTo(axisGap, margin);
		ctx.lineTo(axisGap, canvas.height - axisGap);
		ctx.lineTo(canvas.width - margin, canvas.height - axisGap);
		ctx.stroke();

		

		// X label
		ctx.fillStyle = "black";
		ctx.font = 20 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign="center"; 
		ctx.textBaseline="top"; 
		var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
		var xlabYPos = canvas.height - axisGap / 2;
		ctx.fillText("[NTP]/[NTP]", xlabXPos, xlabYPos);
		var textWidth = ctx.measureText("[NTP]/[NTP]").width;

		ctx.font = 10 * canvasSizeMultiplier + "px Arial";
		ctx.fillText("eq", xlabXPos + textWidth/2 + 6*canvasSizeMultiplier, xlabYPos + 10*canvasSizeMultiplier);
		
		// Y label
		ctx.font = 20 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign="center"; 
		ctx.textBaseline="bottom"; 
		ctx.save()
		var ylabXPos = 2 * axisGap / 3;
		var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
		ctx.translate(ylabXPos, ylabYPos);
		ctx.rotate(-Math.PI/2);
		ctx.fillText("Velocity (bp/s)", 0 ,0);
		ctx.restore();

	});

}




function uploadABC(){
	
	
	document.getElementById('uploadABCinput').addEventListener('change', loadSessionFile, false);
	$("#uploadABCinput").click();

	function loadSessionFile(evt) {

		var files = evt.target.files; // FileList object
			
		// Loop through the FileList
		for (var i = 0, fileName; fileName = files[i]; i++) {

			
			var reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = (function(theFile) {
				return function(e) {

					if (e == null || e.target.result == "") return;
					var TSVstring = e.target.result.replace(/(\r\n|\n|\r)/gm,"|");

					//console.log("Sending TSVstring", TSVstring);

					uploadABC_controller(TSVstring);

				};
			})(fileName);

			reader.readAsText(fileName);
			
			

		}

		$("#uploadABCinput").val("");

	}


	
}



function downloadABC(){

	get_ABCoutput_controller(function(result){


		var lines = result["lines"];
		if (lines.length == 0) return;
		var stringToPrint = "";
		for (var i = 0; i < lines.length; i++){

			

			// Replace all the &&&&& blocks with a single tab
			var tabbedLine = "";
			var addedTab = false;
			for (var j = 0; j < lines[i].length; j ++){

				if (lines[i][j] == "|") continue; // Ignore pipes. They denote coloured font

				if (lines[i][j] == "&" && !addedTab) { // Replace & with a tab (unless you have already replaced a touching & with a tab)
					tabbedLine += "\t";
					addedTab = true;
				}
				else if(lines[i][j] != "&") {	// Add the normal character to the string
					tabbedLine += lines[i][j];
					addedTab = false;
				}
			}

			stringToPrint += tabbedLine + "\n";

		}


		download("ABC_output.tsv", stringToPrint);
		

	});



}



function addNewABCRows(lines){


	if (lines.length == 0) return;

	//console.log("lines", lines);

	for (var i = 0; i < lines.length; i++){


		var paddedLine = null;
		var rejected = false;
		if (lines[i].trim() == "") paddedLine = "<br>";

		else{

			// Replace all the & with a space
			if (lines[i].split("|").length > 1) rejected = rejected || lines[i].split("|")[1].trim() == "false";
			var paddedLine = "<div linenum='" + ABClines.length + "' onclick='highlightABCoutputRow(this)'>";
			

			var openPipe = true; // | (pipes) denote coloured font
			for (var j = 0; j < lines[i].length; j ++){

				if (lines[i][j] == "|") {
					paddedLine += openPipe ? "<span style='color:red'>" : "</span>"; 
					openPipe = !openPipe;
				}
				else if (lines[i][j] == "&") paddedLine += "&nbsp";
				else paddedLine += lines[i][j];

			}
		}

		paddedLine += "<br></div>";
		ABClines.push(paddedLine);
		if (!rejected) ABClinesAcceptedOnly.push(paddedLine);

	}


	renderABCoutput();


}



function renderABCoutput(){

	// Print ALL lines or just accepted lines?
	var linesToUse = $("#ABC_showRejectedParameters").prop("checked") ? ABClines : ABClinesAcceptedOnly;


	var ABCoutputHTML = "";


	// Always print the top 3 rows (header)
	if ($("[linenum='2']").length == 0) ABCoutputHTML += "<br><br>" + linesToUse[2];


	var startRow = (nTimes30ABCrowsToDisplay-1)*30 + 1;
	var stopRow = startRow + 29;
	var numRowsDisplayed = 0;
	for (var rowNum = startRow; rowNum <= stopRow; rowNum ++){
		
		var rowIndex = rowNum -1 + 3;
		if (linesToUse[rowIndex] == null) break;
		numRowsDisplayed ++;

		// Don't add back if already displayed
		if ($("[linenum='" + rowIndex + "']").length == 0) ABCoutputHTML += linesToUse[rowIndex];



	}


	if (numRowsDisplayed > 0 && ABCoutputHTML.trim() != "") $("#numABCrowsDisplayed").html(startRow + "-" + (startRow + numRowsDisplayed - 1));
	$("#numABCrowsGenerated").html(linesToUse.length - 3);


	// Add the new lines to the output
	if (ABCoutputHTML.trim() != "") $("#ABCoutput").html($("#ABCoutput").html() + ABCoutputHTML);



	// Enable/disable the plus 30 sequences button
	if (stopRow < linesToUse.length - 3 && numRowsDisplayed == 30) {
		$("#plusABCrows").removeClass("dropdown-disabled");
		$("#plusABCrows").prop("disabled", false);
	}else{
		$("#plusABCrows").addClass("dropdown-disabled");
		$("#plusABCrows").prop("disabled", "disabled");
	}


	// Enable/disable the minus 30 sequences button
	if (startRow >= 30) {
		$("#minusABCrows").removeClass("dropdown-disabled");
		$("#minusABCrows").prop("disabled", false);
	}else{
		$("#minusABCrows").addClass("dropdown-disabled");
		$("#minusABCrows").prop("disabled", "disabled");
	}



}


function minusABCrows(){

	$("#ABCoutput").html("");
	nTimes30ABCrowsToDisplay--;
	renderABCoutput();

}



function plusABCrows(){

	$("#ABCoutput").html("");
	nTimes30ABCrowsToDisplay++;
	renderABCoutput();

}



function toggleAcceptedOrRejected(){

	nTimes30ABCrowsToDisplay = 1;
	$("#ABCoutput").html("");
	get_unrendered_ABCoutput_controller(function(){
		renderABCoutput();
	});

}


function toggleMCMC(){



	if ($("#ABC_useMCMC").prop("checked")){
		$("#ABC_settings").hide(0);
		$("#MCMC_settings").show(100);
		$(".rejection_ABC_RSS").hide(0);

	}else{
		$("#ABC_settings").show(100);
		$("#MCMC_settings").hide(0);
		$(".rejection_ABC_RSS").show(100);
	}


}






