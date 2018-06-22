
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


	gelFabricCanvases = {};


	$(".beginABC_btn").css("cursor", "auto");
	$(".beginABC_btn").css("background-color", "#858280");
	$(".beginABC_btn").attr("disabled", "disabled");
	$("#uploadABC").show(50);

	// Acceptance
	$("#ABCacceptanceDIV").hide(0);
	$("#ABCacceptanceVal").html("0");

	// Status
	$("#burninStatusDIV").hide(0);
	$("#burninStatusVal").html("");

	// Epsilon
	$("#currentEpsilonDIV").hide(0);
	$("#currentEpsilonVal").html("");


	$("#ABCPanelTable1").html("");
	$("#ABCPanelTable2").html("");

	nFits = 0;
	ABCtableToUse = 1; // Alternate between the left (1) and right (2) tables
	addNewCurveButtons();
	toggleMCMC();

}






// Loads all the settings from the DOM and sends them through to the model so ABC can begin
// Assumes that all force-velocity input textareas have already been validated
function beginABC(){


	// Load the force-velocity values
	var which = $("#ABC_useMCMC").val() == 1 ? "ABC" : $("#ABC_useMCMC").val() == 2 ? "MCMC" : "NS-ABC"
	var abcDataObjectForModel = getAbcDataObject(which)

	console.log("Sending object", abcDataObjectForModel, $("#ABC_useMCMC").val());


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


	// Disable the ntrials textboxes
	$("#ABCntrials").css("cursor", "auto");
	$("#ABCntrials").css("background-color", "#858280");
	$("#ABCntrials").attr("disabled", "disabled");


	$("#MCMCntrials").css("cursor", "auto");
	$("#MCMCntrials").css("background-color", "#858280");
	$("#MCMCntrials").attr("disabled", "disabled");


	//$("#ABC_chiSq").css("cursor", "auto");
	//$("#ABC_chiSq").css("background-color", "#858280");
	//$("#ABC_chiSq").attr("disabled", "disabled");




	// Add the trace plots if MCMC
	if (which == "MCMC") addTracePlots();



}



function onABCStart(){



	$("#downloadABC").show(50);
	$("#uploadABC").hide(50);

	$("#ABCacceptanceDIV").show(50);

	// Status
	$("#burninStatusDIV").show(50);

	// Epsilon
	$("#currentEpsilonDIV").show(50);
	
	//$("#ABCacceptancePercentage_val").html("0");
	$("#nRowsToDisplayABC").show(50);
	$("#ABCacceptance_val").html("0");



}


function addTracePlots(){

	if ($(".MCMCtraceOption").length == 0){
		var option = `<option value="tracePlot" class="MCMCtraceOption">MCMC trace</option>`;
		$("#selectPlot1").append(option);
		$("#selectPlot2").append(option);
		$("#selectPlot3").append(option);
	}

	// Open a trace plot
	for (var i = 1; i <=3; i ++){
		if ($("#selectPlot" + i).val() == "tracePlot") break;
		if ($("#selectPlot" + i).val() == "none"){
			$("#selectPlot" + i).val("tracePlot");
			selectPlot(i);
			break;
		}
	}


}



function removeTracePlots(){


	// Delete and reset any trace plots
	for (var i = 1; i <=3; i ++){
		if ($("#selectPlot" + i).val() == "tracePlot"){
			$("#selectPlot" + i).val("none");
			selectPlot(i);
		}
	}

	$("option[value='tracePlot']").remove();


}



function getAbcDataObject(which = "ABC"){

	//console.log("getAbcDataObject", which);
	
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
		abcDataObjectForModel.chiSqthreshold_min = $("#MCMC_chiSqthreshold_min").val();
		abcDataObjectForModel.chiSqthreshold_0 = $("#MCMC_chiSqthreshold_0").val();
		abcDataObjectForModel.chiSqthreshold_gamma = $("#MCMC_chiSqthreshold_gamma").val();
		
	}

	abcDataObjectForModel["fits"] = {};

	for (var fitNum = 0; fitNum <= curveTables.length; fitNum++){


		var table = $(curveTables[fitNum]);
		var fitID = table.attr("fitID");


		// Which type of data?
		var dataType = $("#forceVelocityInputData_" + fitID).length > 0 ? "forceVelocity" : $("#ntpVelocityInputData_" + fitID).length > 0 ? "ntpVelocity" : $("#timeGelInputData_" + fitID).length > 0 ? "timeGel" : null;

		if (dataType == null) continue;

		var dataValues = $("#" + dataType + "InputData_" + fitID).val();
		abcDataObjectForModel["fits"][fitID] = {vals: []};
		abcDataObjectForModel["fits"][fitID]["dataType"] = dataType;
		abcDataObjectForModel["fits"][fitID]["chiSqthreshold"] = parseFloat($("#ABC_chiSq_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["ATPconc"] = parseFloat($("#ATPconc_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["CTPconc"] = parseFloat($("#CTPconc_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["GTPconc"] = parseFloat($("#GTPconc_" + fitID).val());
		abcDataObjectForModel["fits"][fitID]["UTPconc"] = parseFloat($("#UTPconc_" + fitID).val());


		// NTP velocity data also has a force 
		if (dataType == "ntpVelocity") abcDataObjectForModel["fits"][fitID]["force"] = parseFloat($("#ABC_force_" + fitID).val());


		var splitValues = dataValues.split("\n");
		if (splitValues.length == 0) valid = false;


		for (var lineNum = 0; lineNum < splitValues.length; lineNum++){


			if (splitValues[lineNum].trim() == "") continue;
		




			// New time category in gel data
			if (dataType == "timeGel" && splitValues[lineNum].trim().substring(0, 2) == "t="){
				var splitLine = splitValues[lineNum].split("=");
				var time = parseFloat(splitLine[1]);
				abcDataObjectForModel["fits"][fitID]["vals"].push({t: time, lengths: [], densities: []})
				continue;
			}



			var splitLine = splitValues[lineNum].split(",");


			if (splitLine.length == 1 && splitLine[0].trim() == "") continue;

			var X_axis_value = parseFloat(splitLine[0]);
			var Y_axis_value = parseFloat(splitLine[1]);


			if    (dataType == "forceVelocity") abcDataObjectForModel["fits"][fitID]["vals"].push({force: X_axis_value, velocity: Y_axis_value});
			else if (dataType == "ntpVelocity") abcDataObjectForModel["fits"][fitID]["vals"].push({ntp: X_axis_value, velocity: Y_axis_value});
			else if (dataType == "timeGel"){
				abcDataObjectForModel["fits"][fitID]["vals"][abcDataObjectForModel["fits"][fitID]["vals"].length-1].lengths.push(X_axis_value);
				abcDataObjectForModel["fits"][fitID]["vals"][abcDataObjectForModel["fits"][fitID]["vals"].length-1].densities.push(Y_axis_value);
			}

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
		$(".beginABC_btn").css("background-color", "#008cba");
		$(".beginABC_btn").attr("disabled", false);
	}


}


// Ensure that the force velocity input textarea is valid
function validateExperimentalDataInput(ele){


	var valid = true;

	var dataType =  $(ele).attr("id").indexOf("forceVelocity") != -1 ? "forceVelocity" : 
					$(ele).attr("id").indexOf("ntpVelocity") != -1 ? "ntpVelocity" :
					$(ele).attr("id").indexOf("timeGel") != -1 ?  "timeGel" : null;


	// Ensure that the values in this textbox are in the format force, velocity with lines separating observations
	var ABCdataValues = $(ele).val();
	var splitValues = ABCdataValues.split("\n");
	if (splitValues.length == 0) valid = false;
	var thereExistsOnePairOfNumbers = false;
	var X_axis_values = []; // Ensure no duplicate X_axis_values
	var Y_axis_values = [];
	var timeGelData = [];
	for (var lineNum = 0; lineNum < splitValues.length; lineNum++){


		if (splitValues[lineNum].trim() == "") continue;

		// New time category in gel data
		if (dataType == "timeGel" && splitValues[lineNum].trim().substring(0, 2) == "t="){
			var splitLine = splitValues[lineNum].split("=");
			if (splitLine.length != 2) {
				valid = false;
				break;
			}
			var time = parseFloat(splitLine[1]);
			X_axis_values = [];
			Y_axis_values = [];
			timeGelData.push({t: time, lengths: X_axis_values, densities: Y_axis_values})
			continue;

		}


		var splitLine = splitValues[lineNum].split(",");
		if (splitLine.length == 1 && splitLine[0].trim() == "") continue;

		if (splitLine.length != 2) {
			valid = false;
			break;
		}

		// Check that these are numbers
		var X_axis_value = parseFloat(splitLine[0]);
		var Y_axis_value = parseFloat(splitLine[1]);
		if (isNaN(X_axis_value) || isNaN(Y_axis_value)){
			valid = false;
			break;
		}


		// Check that the x-axis value is not a duplicate
		if (X_axis_values.indexOf(X_axis_value) != -1){
			valid = false;
			break;
		}


		// Check that NTP concentration or length is positive
		if ((dataType == "ntpVelocity" || dataType == "timeGel") && X_axis_value <= 0){
			valid = false;
			break;
		}




		X_axis_values.push(X_axis_value);
		Y_axis_values.push(Y_axis_value);
		thereExistsOnePairOfNumbers = true;

	}



	// If there are no observations and only empty lines then valid is set to false
	if (!thereExistsOnePairOfNumbers) valid = false;


	if (valid) {
		var fitID = $(ele).attr("id").split("_")[1];
		if (dataType == "forceVelocity") drawForceVelocityCurveCanvas(fitID, X_axis_values, Y_axis_values);
		else if (dataType == "ntpVelocity") drawNtpVelocityCurveCanvas(fitID, X_axis_values, Y_axis_values);
		else if (dataType == "timeGel") drawTimeGelPlotCanvas(fitID, timeGelData);
	}

	else if (!valid && dataType == "timeGel") $(".timeGelDensityPlotDIV_" + fitID).hide(0);


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




function highlightABCoutputRow(element, forceShow = false){


	//if (element == null) return;


	// If already highlighted, remove it
	if(!forceShow && element.className.indexOf("ABC_output_highlighted") != -1){
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
				<div style="padding: 5 5; background-color:#b3b3b3; font-size:16px; width:300px; margin:auto;">

					Add experimental data <br><br>
					<input type=button onClick='addNewABCData("forceVelocity")' value='+ Force-velocity curve' title="Add force-velocity experimental data" class="operation ABCbtn" style="background-color:#008CBA; width: 200px"> 
					<br><br>
					<input type=button onClick='addNewABCData("ntpVelocity")' value='+ [NTP]-velocity curve' title="Add [NTP]-velocity experimental data" class="operation ABCbtn" style="background-color:#008CBA; width: 200px">
					<br><br>
					<input type=button onClick='addNewABCData("timeGel")' value='+ Time gel' title="Upload a gel of transcript lengths over time" class="operation ABCbtn" style="background-color:#008CBA; width: 200px">
					<br><br>
					
				</div>

			</td>
		</tr>
	
	`;

}

// <input type=button onClick='addNewABCData("pauseSite")' value='+ Pause sites' title="Add pause site locations" class="operation ABCbtn" style="background-color:#008CBA; width: 200px">
// <br><br>


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

		case "pauseSite":
			HTMLtemplate = getABCpauseSiteTemplate(fitID);
			break;

		case "timeGel":
			HTMLtemplate = getTimeGelTemplate(fitID);
			break;



	}

	
	
	
	
	// Add the curve template to the newly opened cell
	$("#ABCPanelTable" + ABCtableToUse).append(HTMLtemplate);

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

		case "timeGel":
			drawTimeGelPlotCanvas(fitID);
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

					<input type=button id='deleteExperiment_` + fitID + `' class='minimise' style='float:right'  value='&times;' onClick=deleteExperiment("` + fitID + `") title='Delete this experiment'>
			
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

					<input type=button id='deleteExperiment_` + fitID + `' class='minimise' style='float:right'  value='&times;' onClick=deleteExperiment("` + fitID + `") title='Delete this experiment'>

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



			</td>

		</tr>



	`;
}



function getABCpauseSiteTemplate(fitID){
	return `
		<tr fitID="` + fitID + `" class="ABCcurveRow ntpVelocityRow"> <!-- style="background-color:#b3b3b3;"> -->


			<td class="` + fitID + `" style="width:500px; text-align:center; vertical-align:top">
				<div style="font-size:20px;">
					Pause site experimental data
					<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer;" href="about/#ntpVelocity_ABCSectionHelp"><img class="helpIcon" src="src/Images/help.png"></a>
						
				</div>


					<textarea class="ABCinputData ntpVelocityInputData" id="ntpVelocityInputData_` + fitID + `" onChange="validateAllAbcDataInputs()" style="font-size:14px; padding: 5 10;  width: 400px; height: 200px; max-width:400px; max-height:500px; min-height:100px; min-width:200px"  
					title="Input pause site locations in the specified format" placeholder="Example.                                                   28                                                           49,5.4,0.41                                                        101,8.6,0.21"></textarea>
					<br><br>
					<span style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Input observed pause site locations. On each line specify the site number that the pause occurred at. Optional: Emax followed by the halflife of the pause (units s), seperated with commas.
					</span>

			</td>




			<td class="` + fitID + `" style="text-align:center; vertical-align:top">

					<input type=button id='deleteExperiment_` + fitID + `' class='minimise' style='float:right'  value='&times;' onClick=deleteExperiment("` + fitID + `") title='Delete this experiment'>

					<br><br>
					Force:
						<input type="number" id="ABC_force_` + fitID + `" value=0 title="The force (pN) applied during this experiment"
							 class="variable" style="vertical-align: middle; text-align:left; width: 70px;  font-size:14px; background-color:#008CBA">pN <br> <br>

					

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



			</td>

		</tr>



	`;
}










function getTimeGelTemplate(fitID){
	return `
		<tr fitID="` + fitID + `" class="ABCcurveRow timeGelRow"> <!-- style="background-color:#b3b3b3;"> -->


			<td class="` + fitID + `" style="width:200px; text-align:center; vertical-align:top">
				<br><br>
				<div style="font-size:18px;">
					Experimental data
					<input type=image class="rotate180" title="Upload an a time gel image as .png or .jpg" onClick="uploadGel('` + fitID + `');" src="src/Images/download.png" style="cursor: pointer; vertical-align: middle; height:20px; ">  
					<input style="display:none" type="file" id="uploadGel_` + fitID + `" accept=".png, .jpg, .jpeg"> 
				</div>


					<textarea class="ABCinputData ntpVelocityInputData" id="timeGelInputData_` + fitID + `" onChange="validateAllAbcDataInputs()" style="font-size:14px; padding: 5 10;  width: 200px; height: 200px; max-width:200px; max-height:500px; min-height:100px; min-width:200px"  
					title="Input time gel data in the specified format" placeholder="Example.                                      t=5                                        10, 0.5                                 11, 0.5                                t=10                                 20, 3"></textarea>
					<br><br>
					<span style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Input transcript length (nt) and relative density observations. Separate length and density values with a comma and separate observations with a line break. 
						Ensure there are no duplicate lengths.
					</span>


				

				
			</td>


			<td class="` + fitID + `" style="width:300px; text-align:center; vertical-align:top">

				<div style="font-size:20px;">
					Gel electrophoresis of transcript lengths over time
					<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer;" href="about/#ntpVelocity_ABCSectionHelp"><img class="helpIcon" src="src/Images/help.png"></a>
						
				</div>

					<span id="timeGelPlotDIV_` + fitID + `">
						<canvas id="timeGelPlotIMG_` + fitID + `" width=300 style="position:absolute;"></canvas>
						<canvas id="timeGelPlot_` + fitID + `" width=300 height=300> </canvas>
					</span>

			</td>



			<td class="` + fitID + `" style="text-align:center; vertical-align:top">

					<input type=button id='deleteExperiment_` + fitID + `' class='minimise' style='float:right'  value='&times;' onClick=deleteExperiment("` + fitID + `") title='Delete this experiment'>


					<br><br><br>
					<table style="width:250px; margin:auto">

						<tr>
							<td colspan=2 style="text-align:center;">
								<br>
								<div style="font-size:18px;">NTP Concentrations</div>
							</td>

						</tr>

						<tr>
							<td style="text-align:right;">
					 			[ATP] = 
					 		</td>

					 		<td>
					 			<input class="variable" value=100   type="number" id="ATPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M 
							</td>
					 	</tr>


					 	<tr>
							<td style="text-align:right;">
					 			[CTP] = 
					 		</td>

					 		<td>
					 			<input class="variable" value=100  type="number"  id="CTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M
							</td>
					 	</tr>




					 	<tr>
							<td style="text-align:right;">
					 			[GTP] = 
					 		</td>

					 		<td>
								<input class="variable" value=100 type="number"  id="GTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M
							</td>
					 	</tr>



					 	<tr>
							<td style="text-align:right;">
					 			[UTP] = 
					 		</td>

					 		<td>
								<input class="variable" value=100 type="number" id="UTPconc_` + fitID + `" style="vertical-align: middle; text-align:left; width: 70px">&mu;M	
							</td>
					 	</tr>


				 		<tr>
							<td style="text-align:center;" colspan=2>
								<br><br>
					 				<input id="editLaneBtn_` + fitID + `" type=button class="operation" onClick="displayGelLaneDialog('` + fitID + `')" value='Edit selected lane' title="View and change the information for the selected lane. Draw a lane on the gel using the cursor and then click on a lane to select it." disabled="true" style="width:150px; cursor:none; background-color:#858280 "></input>
								
					 		</td>
					 	</tr>



					


					 	<tr class=" timeGelDensityPlotDIV_` + fitID + `" style="display:none;">
							<td style="text-align:center;" colspan=2>
								<br><br>
								Display band densities for:
					 			<select class="plot-dropdown" title="Select which lane to display" id = "selectLane_` + fitID + `"  OnChange="validateAllAbcDataInputs();" style="vertical-align: middle; width: 180px">
								</select>
					 		</td>

					 	</tr>




					 </table>

					 <br>



			</td>

		</tr>


		<tr fitID="` + fitID + `" class="timeGelRow timeGelDensityPlotDIV_` + fitID + `" style="display:none">

			<td colspan=3>
				<canvas id="timeGelDensityPlot_` + fitID + `" width=750 height=150> </canvas>
			</td>

		</tr>



	`;
}



function uploadGel(fitID){

	 var loadGelPng = function(evt) {

		//var files = evt.target.files; // FileList object
		var file    = document.getElementById("uploadGel_" + fitID).files[0]; //sames as here

		var reader  = new FileReader();
		reader.onloadend = function () {
			console.log("image:", reader.result);

            var img = new Image();
            img.addEventListener("load", function() {

            	//$("#timeGelPlotIMG_" + fitID).attr("src", img.src);
				$("#timeGelPlotIMG_" + fitID).offset({ top: $("#timeGelPlot_" + fitID).offset().top, left: $("#timeGelPlot_" + fitID).offset().left});


				// Set the canvas behind the fabric canvas to a static image of the gel
				var bgImageCanvas = $("#timeGelPlotIMG_" + fitID)[0];
				bgImageCanvas.width = 300;
				bgImageCanvas.height = (img.height / img.width) * bgImageCanvas.width;
				var ctx = bgImageCanvas.getContext('2d');
				ctx.drawImage(img, 0, 0, bgImageCanvas.width, bgImageCanvas.height);



           		drawTimeGelCanvasFromImage(fitID, img);

            });
            img.src = reader.result;
           

       	}

		if (file) {
           reader.readAsDataURL(file); //reads the data as a URL
       	} 

	 }

	document.getElementById("uploadGel_" + fitID).addEventListener('change', loadGelPng, false);
	$("#uploadGel_" + fitID).click();


}



function getPixelDensitiesForLane(fitID, lane){


	// Get the rectangle object associated with this lane 
	for (var pixelRow = lane.rectangle.top; pixelRow <= lane.rectangle.top + lane.rectangle.height; pixelRow++){


	}
	/*
	var m = slope(A, B);
var b = intercept(A, m);

var coordinates = [];
for (var x = A[0]; x <= B[0]; x++) {
    var y = m * x + b;
    coordinates.push([x, y]);
}

var pixelData = canvas.getContext('2d').getImageData(event.offsetX, event.offsetY, 1, 1).data;




	var bgImageCanvas = $("#timeGelPlotIMG_" + fitID)[0];
	var fabricCanvas = gelFabricCanvases[fitID];
	if (fabricCanvas == null) {
		console.log("Error: cannot find fabric canvas", fitID);
		return;
	}


	*/


}


function deleteExperiment(fitID){
	
	
	// Delete the contents of this cell
	var thisFitNum = parseFloat(fitID.substring(3));
	var fitNum = 0;

	gelFabricCanvases[fitID] = null;
	
	
	// Move every cell after this cell back by one
	for(fitNum = thisFitNum+1; fitNum <= nFits; fitNum++){
		
		var html = $("[fitid='fit" + fitNum + "']").html();
		html = html.replace(new RegExp("fit" + fitNum, 'g'), "fit" + (fitNum-1));
		$("[fitid='fit" + (fitNum-1) + "']").html(html);
		
		// Copy all the values over
		$("#forceVelocityInputData_fit" + (fitNum-1)).val($("#forceVelocityInputData_fit" + (fitNum)).val());
		$("#ntpVelocityInputData_fit" + (fitNum-1)).val($("#ntpVelocityInputData_fit" + (fitNum)).val());
		$("#ATPconc_fit" + (fitNum-1)).val($("#ATPconc_fit" + (fitNum)).val());
		$("#CTPconc_fit" + (fitNum-1)).val($("#CTPconc_fit" + (fitNum)).val());
		$("#GTPconc_fit" + (fitNum-1)).val($("#GTPconc_fit" + (fitNum)).val());
		$("#UTPconc_fit" + (fitNum-1)).val($("#UTPconc_fit" + (fitNum)).val());
		$("#ABC_force_fit" + (fitNum-1)).val($("#ABC_force_fit" + (fitNum)).val());
		$("#ABC_chiSq_fit" + (fitNum-1)).val($("#ABC_chiSq_fit" + (fitNum)).val());
		
		
	}
	
	
	ABCtableToUse ++;
	if (ABCtableToUse > 2) ABCtableToUse = 1;
	nFits--;
	
	
	// Delete the final experiment cell
	$("[fitid='fit" + (fitNum-1) + "']").remove();

	
	// Delete the cell which contains the add-new buttons and then add it back to the appropriate cell
	$("#newABCcurve").remove();
	addNewCurveButtons();
	
	
	validateAllAbcDataInputs();
	
	
}



function drawForceVelocityCurveCanvas(fitID, forces = null, velocities = null){


	
	var canvas = $("#forceVelocityCurve_" + fitID)[0];
	if (canvas == null) return;

	var ctx = canvas.getContext('2d');

	var canvasSizeMultiplier = 1;
	var axisGap = 45 * canvasSizeMultiplier;
	var margin = 3 * canvasSizeMultiplier;




	getPosteriorDistribution_controller(function(result){


		//console.log("getPosteriorDistribution_controller", result);

		
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
			ctx.lineWidth = 1 * canvasSizeMultiplier;


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
			for (var postNum = result.burnin; result.burnin >= 0 && postNum < posterior.length; postNum++){

				//console.log("postNum", postNum);
				//console.log(posterior[postNum]);

				var posteriorVelocities = posterior[postNum]["simulatedValues"];

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
			ctx.lineWidth = 1 * canvasSizeMultiplier;






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
			for (var postNum = result.burnin; result.burnin >= 0 && postNum < posterior.length; postNum++){


				var posteriorVelocities = posterior[postNum]["simulatedValues"];

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





function drawTimeGelPlotCanvas(fitID){

	// Draw the gel
	// drawTimeGelCanvas(fitID, timeGelData);
	

	// Get the lanes object from the fabric canvases
	var fabricCanvas = gelFabricCanvases[fitID];
	if (fabricCanvas == null || fabricCanvas.lanes == null || fabricCanvas.lanes.length == 0) return;


	// Create dropdown which contains all the lanes
	var currentVal = $("#selectLane_" + fitID).val(); // Save the current value (if it has one)

	$("#selectLane_" + fitID).children().remove();
	for (var i = 0; i < fabricCanvas.lanes.length; i ++){
		$("#selectLane_" + fitID).append("<option value='" + fabricCanvas.lanes[i].id + "'>Lane " + fabricCanvas.lanes[i].laneNum + ": t = " + fabricCanvas.lanes[i].time + "s</option>");
	}

	if (currentVal != null) $("#selectLane_" + fitID).val(currentVal); // Reset to the previous lane number (if there was one)
	$(".timeGelDensityPlotDIV_" + fitID).show(50);


	// Find which lane is selected
	currentVal = parseFloat($("#selectLane_" + fitID).val());
	var lane = null;
	for (var i = 0; i < fabricCanvas.lanes.length; i ++){
		if (currentVal == fabricCanvas.lanes[i].id) {
			lane = fabricCanvas.lanes[i];
			break;
		}
	}


	// Draw band intensity plot for the selected lane
	drawTimeGelDensityCanvas(fitID, lane);


}




/*
function drawTimeGelPlotCanvas(fitID, timeGelData = null){

	// Draw the gel
	drawTimeGelCanvas(fitID, timeGelData);
	

	// Draw band intensity plot for the selected lane
	if (timeGelData != null && timeGelData.length > 0) {
		console.log("timeGelData", timeGelData);

		var currentVal = $("#selectLane_" + fitID).val(); // Save the current value (if it has one)

		$("#selectLane_" + fitID).children().remove();
		for (var i = 0; i < timeGelData.length; i ++){
			$("#selectLane_" + fitID).append("<option value='" + (i+1) + "'>Lane " + (i+1) + ": t = " + timeGelData[i].t + "s</option>");
		}

		if (currentVal != null) $("#selectLane_" + fitID).val(currentVal); // Reset to the previous lane number (if there was one)
		$(".timeGelDensityPlotDIV_" + fitID).show(50);


		// Draw the density plot of the appropriate lane
		currentVal = $("#selectLane_" + fitID).val();
		getTemplateSequenceLength_controller(function(result) {
			drawTimeGelDensityCanvas(fitID, result.nbases, timeGelData[parseFloat(currentVal)-1]);
		});


	}

}
*/









// Draw the gel electrophoresis from an image
function drawTimeGelCanvasFromImage(fitID, image){


	var fabricCanvas;
	if (gelFabricCanvases[fitID] != null){
		fabricCanvas = gelFabricCanvases[fitID];
	}else{
		fabricCanvas = new fabric.Canvas("timeGelPlot_" + fitID, { selection: false });
		gelFabricCanvases[fitID] = fabricCanvas;
	}

	fabricCanvas.clear();

	fabricCanvas.selectedObject = null;
	fabricCanvas.drawingRectangle = false;
	fabricCanvas.lanes = [];


	fabricCanvas.setWidth(300);
	fabricCanvas.setHeight((image.height / image.width) * 300);



	// Disable the lane edit button
	$("#editLaneBtn_" + fitID).css("cursor", "auto");
	$("#editLaneBtn_" + fitID).css("background-color", "#858280");
	$("#editLaneBtn_" + fitID).attr("disabled", "disabled");



    var currentRectID = 1;
	var line, rectangle, isDown;

	fabricCanvas.on('mouse:down', function(o){

		if (fabricCanvas.selectedObject != null) {
			fabricCanvas.drawingRectangle = false;
			return;
		}

		isDown = true;

		// Drawing line
		if (!fabricCanvas.drawingRectangle) {
			var pointer = fabricCanvas.getPointer(o.e);
			var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];
			line = new fabric.Line(points, {
				strokeWidth: 2,
				fill: '#EE7600',
				stroke: '#EE7600',
				originX: 'center',
				originY: 'center'
			});
			fabricCanvas.add(line);

		}



	});

	fabricCanvas.on('mouse:move', function(o){


		if (fabricCanvas.selectedObject != null) return;

		// Drawing rectangle
		if (fabricCanvas.drawingRectangle){
			var pointer = fabricCanvas.getPointer(o.e);
			var rectHalfWidth = Math.abs(line.x1 - pointer.x);
			rectangle.set({ left: line.x1 - rectHalfWidth, width: 2*rectHalfWidth, top: line.y1 - Math.tan(rectangle.angle * Math.PI / 180) * rectHalfWidth, });
			fabricCanvas.renderAll();

		}

		// Drawing line
		else if (isDown) {
			var pointer = fabricCanvas.getPointer(o.e);
			line.set({ x2: pointer.x, y2: pointer.y });
			fabricCanvas.renderAll();
		}

	});

	fabricCanvas.on('mouse:up', function(o){

		if (fabricCanvas.selectedObject != null) return;

		// Finish drawing rectangle
		if (fabricCanvas.drawingRectangle) {

			fabricCanvas.lanes.push({id: rectangle.id, rectangle:rectangle, laneNum: fabricCanvas.lanes.length + 1, time: 1, npixelsLength: rectangle.height, densities: new Array(Math.ceil(rectangle.height)) });
			fabricCanvas.drawingRectangle = false;

			drawTimeGelPlotCanvas(fitID);
		}

		// Finish drawing line, start drawing rectangle
		else {


			if (line.y1 > line.y2) {
				var temp = line.y1;
				line.y1 = line.y2;
				line.y2 = temp;
			}

			// Euclidean length of line = rectangle height
			var rectLength = Math.sqrt( (line.x2 - line.x1)*(line.x2 - line.x1) + (line.y2 - line.y1)*(line.y2 - line.y1) );
			var rectWidth = 6;

			// Angle of rotation
			var angle = Math.acos((line.y2 - line.y1) / rectLength);

			if (line.x2 > line.x1) angle = -angle;

			//console.log("angle", angle * 180 / Math.PI);

			rectangle = new fabric.Rect({
				id: currentRectID,
		        left: line.x1 - rectWidth/2,
		        top: line.y1 - Math.tan(angle) * (rectWidth/2),
		        width: rectWidth,
		        height: rectLength,
		        angle: angle * 180 / Math.PI,
		        fill: "",
		        stroke: "#EE7600",
		        strokeWidth: 2,
		    });
		    fabricCanvas.remove(line);
		    fabricCanvas.add(rectangle);
		    fabricCanvas.drawingRectangle = true;
		    currentRectID ++;

		}

		isDown = false;
	});

	fabricCanvas.on("object:selected", function(e) { 


		//console.log("object:selected");

		//var fabricCanvas = gelFabricCanvases[fitID];
		//if (fabricCanvas == null) return;

		fabricCanvas.drawingRectangle = false;
		fabricCanvas.selectedObject = e.target;


		var activeObj = e.target;
		//if(activeObj.get('type') == 'group') {
		     activeObj.set({"borderColor":"#EE7600","cornerColor":"#EE7600"});
		 //}



		// Enable the lane edit button
		$("#editLaneBtn_" + fitID).css("cursor", "pointer");
		$("#editLaneBtn_" + fitID).css("background-color", "#008cba");
		$("#editLaneBtn_" + fitID).attr("disabled", false);




	});

	fabricCanvas.on('selection:updated', function (e) {
		//console.log("selection:updated");

		fabricCanvas.drawingRectangle = false;
		fabricCanvas.selectedObject = e.target;

	});

	fabricCanvas.on("selection:cleared", function(e) { 

		//var fabricCanvas = gelFabricCanvases[fitID];
		//if (fabricCanvas == null) return;

		fabricCanvas.selectedObject = null;

		// Disable the lane edit button
		$("#editLaneBtn_" + fitID).css("cursor", "auto");
		$("#editLaneBtn_" + fitID).css("background-color", "#858280");
		$("#editLaneBtn_" + fitID).attr("disabled", "disabled");


 	});



}


function displayGelLaneDialog(fitID){


	var fabricCanvas = gelFabricCanvases[fitID];
	if (fabricCanvas == null || fabricCanvas.selectedObject == null) return;

	// Find which lane is selected
	var lane = null;
	for (var i = 0; i < fabricCanvas.lanes.length; i ++){
		if (fabricCanvas.selectedObject.id == fabricCanvas.lanes[i].id) {
			lane = fabricCanvas.lanes[i];
			break;
		}
	}

	if (lane == null){
		console.log("ERROR: cannot find laneid", fabricCanvas.selectedObject.id);
		return;
	}


	closeAllDialogs();
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);

	var popupHTML = getGelLaneInformationTemplate(fitID, lane);
	//popupHTML = popupHTML.replace("XX_plotNum_XX", plotNum);
	//popupHTML = popupHTML.replace("XX_plotName_XX", $("#selectPlot" + plotNum + " :selected").text());

	$(popupHTML).appendTo('body');



	window.setTimeout(function(){
	
		$("#main").click(function(){
			closeGelLaneInformationPopup();
		});
		
		$("#mySidenav").click(function(){
			closeGelLaneInformationPopup();
		});
	
	
	}, 200);


}

	
function getGelLaneInformationTemplate(fitID, laneObj){

	return `
		<div id='laneDialog' style='background-color:#008cba; padding: 10 10; position:fixed; width: 20vw; left:40vw; top:50vh; z-index:5' fitID="` + fitID + `">
			<div style='background-color:white; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 22px'> Lane information </span>
				<span class="blueDarkblueCloseBtn" title="Close" style="right: 15px; top: 4px;" onclick='closeGelLaneInformationPopup("` + fitID + `")'>&times;</span>
				<table cellpadding=10 style='width:90%; margin:auto; font-size: 18px;'>
				
				<tr>
					<td> 
							Lane number:
							<input class="textboxBlue" type="number" style="width:60px; text-align:right" id="gelLaneNum" value=` + laneObj.laneNum + `> 
					</td>
					
					
					<td> 
							Time:
							<input class="textboxBlue" type="number" style="width:60px; text-align:right" id="gelLaneTime" value=` + laneObj.time + `> s
					</td>

				</tr>
				<tr>

					<td>
						<input type="button" class="operation" onClick="closeGelLaneInformationPopup('` + fitID + `'); deleteFabricCanvasSelection('` + fitID + `')" value='Delete' title="Delete this lane" style="width:100px; float:right"></input>
				

					</td>
					<td> 
						<input type="button" class="operation" onClick="saveLaneInformation('` + fitID + `', '` + laneObj.id + `')" value='Save' title="Save information for this lane" style="width:100px; float:right"></input>
					</td>
						
				</tr>
					
				</table>
				
				
			</div>
		</div>
	
	
	`;

}

function saveLaneInformation(fitID, laneID){


	var fabricCanvas = gelFabricCanvases[fitID];
	if (fabricCanvas == null) return;

	var lane = null;
	for (var i = 0; i < fabricCanvas.lanes.length; i ++){
		if (laneID == fabricCanvas.lanes[i].id) {
			lane = fabricCanvas.lanes[i];
			break;
		}
	}

	if (lane == null){
		console.log("ERROR: cannot find laneid", laneID);
		return;
	}

	lane.laneNum = parseFloat($("#gelLaneNum").val());
	lane.time = parseFloat($("#gelLaneTime").val());
	closeGelLaneInformationPopup(fitID);
	drawTimeGelPlotCanvas(fitID);

}



function closeGelLaneInformationPopup(fitID = null){
	
	if ($("#laneDialog").length) {
		$("#mySidenav").unbind('click');
		$("#main").unbind('click');
		$("#laneDialog").remove();
		$("#main").css("opacity", 1);
		$("#mySidenav").css("opacity", 1);

		/*
		if (fitID != null){
			var fabricCanvas = gelFabricCanvases[fitID];
			if (fabricCanvas == null) return;
			fabricCanvas.deactivateAllWithDispatch();
		}
		*/

	}


}


// Deletes the object selected in the specified fabric canvas 
function deleteFabricCanvasSelection(fitID){

	var fabricCanvas = gelFabricCanvases[fitID];
	if (fabricCanvas == null || fabricCanvas.selectedObject == null) return; 


	// Delete the lane object
	for (var i = 0; i < fabricCanvas.lanes.length; i ++){
		if (fabricCanvas.selectedObject.id == fabricCanvas.lanes[i].id) {
			fabricCanvas.lanes.splice(i, 1);
			break;
		}
	}

	console.log("lanes", fabricCanvas.lanes);


	// Delete the fabric object
	fabricCanvas.remove(fabricCanvas.selectedObject);
	fabricCanvas.selectedObject = null;

	drawTimeGelPlotCanvas(fitID);


}


function scalePreserveAspectRatio(imgW,imgH,maxW,maxH){
  return(Math.min((maxW/imgW),(maxH/imgH)));
}





// Draw the gel electrophoresis
function drawTimeGelCanvas(fitID, timeGelData = null){


	var canvas = $("#timeGelPlot_" + fitID)[0];
	if (canvas == null) return;

	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.globalAlpha = 1;


	var canvasSizeMultiplier = 1;
	var laneLabelHeight = 20 * canvasSizeMultiplier;
	var axisGap = 30 * canvasSizeMultiplier;
	var laneWidth = 40 * canvasSizeMultiplier;
	var laneGap = 5 * canvasSizeMultiplier;

	ctx.fillStyle = "white";
	ctx.fillRect(0, laneLabelHeight, canvas.width, canvas.height-laneLabelHeight);
	ctx.fillStyle = "black";
	


	// Add + and - symbols
	ctx.font = 18 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign= "right"; // Top left
	ctx.textBaseline="bottom"; 
	ctx.fillText("-", 2/3*axisGap, 2/3*axisGap + laneLabelHeight); 
	ctx.textAlign= "left"; // Top right
	ctx.fillText("-", canvas.width - 2/3*axisGap, 2/3*axisGap + laneLabelHeight); 
	ctx.textAlign= "right"; // Bottom left
	ctx.textBaseline="top"; 
	ctx.fillText("+", 2/3*axisGap, canvas.height - 2/3*axisGap); 
	ctx.textAlign= "left"; // Bottom right
	ctx.fillText("+", canvas.width - 2/3*axisGap, canvas.height - 2/3*axisGap); 


	if (timeGelData == null) return;

	// Hover events
	var stateHoverEvents = [];


	// Normalise the densities and determine band y-coordinates
	var maxDensity = 0;
	var lowestBand = 10000000;
	var highestBand = 1;
	for (var laneNumber = 1; laneNumber <= timeGelData.length; laneNumber++){


		var lengths = timeGelData[laneNumber-1].lengths;
		var densities = timeGelData[laneNumber-1].densities;


		// Find largest density
		for (var i = 0; i < densities.length; i ++) maxDensity = Math.max(densities[i], maxDensity);


		// Determine y height of the min and max band. Small molecules at the bottom
		for (var i = 0; i < lengths.length; i ++) lowestBand = Math.min(lengths[i], lowestBand);
		for (var i = 0; i < lengths.length; i ++) highestBand = Math.max(lengths[i], highestBand);

	}


	highestBand ++;
	if (lowestBand > 1) lowestBand --;
	var heightScale = (canvas.height - 2*axisGap - laneLabelHeight) / (1/(1 + Math.log(lowestBand)) - 1/(1 + Math.log(highestBand)));
	var bandHeight = 5;

	for (var laneNumber = 1; laneNumber <= timeGelData.length; laneNumber++){


		var time = timeGelData[laneNumber-1].t;
		var lengths = timeGelData[laneNumber-1].lengths;
		var densities = timeGelData[laneNumber-1].densities;
		var lanePosX = laneGap + (2*laneGap + laneWidth)*(laneNumber-1);


		// Plot the lane name
		ctx.globalAlpha = 1;
		ctx.font = 18 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign= "center"; // Top left
		ctx.textBaseline="bottom"; 
		ctx.fillText(time, lanePosX + 0.5*laneWidth, laneLabelHeight); 


		// Normalise the densities so that the largest is 1
		for (var i = 0; i < densities.length; i ++) densities[i] /= maxDensity;

		// Plot the bands
		for (var i = 0; i < lengths.length; i ++){


			var transcriptLength = lengths[i];
			var relativeDensity = densities[i]; 
			var migrationDistance = 1 / (1 + Math.log(transcriptLength)) - 1 / (1 + Math.log(highestBand)); // Add 1 so we don't divide by 0
			var migrationDistanceY = heightScale * migrationDistance + axisGap + laneLabelHeight; // Add 1 so we don't divide by 0



			// Plot the band at the appropriate density and migration distance
			ctx.globalAlpha = relativeDensity;
			ctx.fillRect(lanePosX, migrationDistanceY - 0.5*bandHeight, laneWidth, bandHeight);



		    // Mouseover event
			addTimeGelHoverEvents(ctx, stateHoverEvents, laneWidth, bandHeight, canvas, transcriptLength, relativeDensity, canvasSizeMultiplier, lanePosX, migrationDistanceY, axisGap);


		}
	}





	// Activate hover events
	canvas.onmousemove = function(e) { 

		var rect = this.getBoundingClientRect();
		var mouseHover = false;
		for (var i = 0; i < stateHoverEvents.length; i++){
			//console.log("stateHoverEvents", stateHoverEvents.length, i);
			if (stateHoverEvents[i](e, rect)){
				mouseHover = true;
				break;
			}

		}

		if (mouseHover){
			$("#timeGelPlot_" + fitID).css('cursor','pointer');
		}

		else{

			if ($("#timeGelPlot_" + fitID).css('cursor') == "pointer") {
				drawTimeGelCanvas(fitID, timeGelData)
				$("#timeGelPlot_" + fitID).css('cursor','auto');
			}

		}

	};


	canvas.onmouseleave = function(e){
		drawTimeGelCanvas(fitID, timeGelData)
	};


}


// Hover over a band to read its description
function addTimeGelHoverEvents(ctx, stateHoverEvents, laneWidth, bandHeight, canvas, transcriptLength, relativeDensity, canvasSizeMultiplier, lanePosX, migrationDistanceY, axisGap){



	
	stateHoverEvents.push(function(e, rect) {

		//console.log("mouse in band?", transcriptLength);
		

        var mouseX = e.clientX - rect.left;
		var mouseY = e.clientY - rect.top;


		var mouseInBand = lanePosX <= mouseX && mouseX <= lanePosX + laneWidth && migrationDistanceY - 0.5*bandHeight <= mouseY && mouseY <= migrationDistanceY + 0.5*bandHeight;
		

		if (mouseInBand){
			var textbox = transcriptLength + " nt with relative density " + roundToSF(relativeDensity, 2);

			ctx.font = 16 * canvasSizeMultiplier + "px Arial";
			ctx.textAlign= "left";
			ctx.globalAlpha = 1;
			ctx.fillStyle = "#1e1e1e";


		
			ctx.fillRect(axisGap, canvas.height - 0.75*axisGap - 4, ctx.measureText(textbox).width+6, 22);

			ctx.globalAlpha = 1;
			ctx.fillStyle = "#ebe9e7";
			ctx.textBaseline="top"; 
			ctx.fillText(textbox, axisGap + 3, canvas.height - 0.75*axisGap);

			return true;

		}

		return false;


	});


}



// Draws a density plot for the specified lane
function drawTimeGelDensityCanvas(fitID, laneData = null){


	var canvas = $("#timeGelDensityPlot_" + fitID)[0];
	if (canvas == null) return;

	getPosteriorDistribution_controller(function(result){

		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;


		var canvasSizeMultiplier = 1;
		var laneLabelHeight = 20 * canvasSizeMultiplier;
		var margin = 3 * canvasSizeMultiplier;
		var axisGap = 40 * canvasSizeMultiplier;
		var laneWidth = 40 * canvasSizeMultiplier;
		var laneGap = 5 * canvasSizeMultiplier;






		var plotWidth = canvas.width - axisGap - margin;
		var plotHeight = canvas.height - axisGap - margin;



		// Refine xmax and xmin and select positions to add ticks
		var xlabPos = [];
		var xResult = getNiceAxesNumbers(1, laneData.npixelsLength, plotWidth, false);
		var xmin = xResult["min"]
		var xmax = xResult["max"]
		var widthScale = xResult["widthOrHeightScale"]
		xlabPos = xResult["vals"]
		//console.log("xResult", xResult);

		var ymin = 0;
		var ymax = 1;
		var heightScale = plotHeight / (ymax - ymin);


		// X min and max
		var axisPointMargin = 5 * canvasSizeMultiplier;
		ctx.font = 12 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="top"; 
		var tickLength = 10 * canvasSizeMultiplier;
		ctx.lineWidth = 1 * canvasSizeMultiplier;

		for (var labelID = 0; labelID < xlabPos.length; labelID++){
			var x0 = widthScale * (xlabPos[labelID] - xmin) + axisGap;
			ctx.textAlign= labelID == 0 ? "left" : "center";
			ctx.fillText(xlabPos[labelID], x0, canvas.height - axisGap + axisPointMargin);

			// Draw a tick on the axis
			ctx.beginPath();
			ctx.moveTo(x0, canvas.height - axisGap - tickLength/2);
			ctx.lineTo(x0, canvas.height - axisGap + tickLength/2);
			ctx.stroke();

		}







		if (result.posterior != null && result.posterior.length > 0){


			var abcDataObjectForModel = getAbcDataObject();

			var fitIDs = [];
			for (var fitID_temp in abcDataObjectForModel["fits"]) fitIDs.push(fitID_temp);
			fitIDs.sort();
			var correctObsNum = 0;
			//console.log("abcDataObjectForModel", abcDataObjectForModel)
			for (var fitNum = 0; fitNum < fitIDs.length; fitNum++){

				if (fitIDs[fitNum] == fitID) {

					// Correct fit num, get the right lane
					for (var laneNum = 0; laneNum < abcDataObjectForModel["fits"][fitIDs[fitNum]]["vals"].length; laneNum++){
						if (abcDataObjectForModel["fits"][fitIDs[fitNum]]["vals"][laneNum].t == laneData.time) break;
						correctObsNum ++;
					}
					break;
				}
				correctObsNum += abcDataObjectForModel["fits"][fitIDs[fitNum]]["vals"].length;
			}



			//console.log("result", correctObsNum, result);

			// Account for the MCMC burn-in
			ctx.globalAlpha = 0.25;
			ctx.strokeStyle = "#008cba";
			ctx.lineWidth = 1 * canvasSizeMultiplier;
			for (var postNum = result.burnin; result.burnin >= 0 && postNum < result.posterior.length; postNum++){




				var posteriorDensities = result.posterior[postNum]["simulatedDensities"][correctObsNum];


				//console.log("posteriorDensities", correctObsNum, posteriorDensities)

				var xPrime = widthScale * 0 + axisGap;
				var yPrime = plotHeight + margin - heightScale * -ymin;
				ctx.moveTo(xPrime, yPrime);


				// Plot the posterior distribution of densities
				for (var len = 1; posteriorDensities != null && len < posteriorDensities.length; len++) {



					// If there is a density for this length use it, else 0
					var density = posteriorDensities[len];

					//console.log("len", len, "density", density);
					


					// Plot it
					xPrime = widthScale * (len - xmin) + axisGap;
					yPrime = plotHeight + margin - heightScale * (density - ymin);
					ctx.lineTo(xPrime, yPrime);

				}

				ctx.stroke();

			}



		}

		


		// Plot the observed densities
		ctx.globalAlpha = 1;
		ctx.strokeStyle = "black";
		ctx.lineWidth = 2 * canvasSizeMultiplier;
		ctx.beginPath();
		var xPrime = widthScale * xmin + axisGap;
		var yPrime = plotHeight + margin - heightScale * -ymin;
		ctx.moveTo(xPrime, yPrime);


		for (var len = xmin+1; len <= xmax; len ++){

			// If there is a density for this length use it, else 0
			var density = laneData.densities[len];
			if (density == null) density = 0;


			// Plot it
			xPrime = widthScale * (len - xmin) + axisGap;
			yPrime = plotHeight + margin - heightScale * (density - ymin);
			ctx.lineTo(xPrime, yPrime);

		}

		ctx.stroke();



		// X min and max
		var axisPointMargin = 5 * canvasSizeMultiplier;
		ctx.lineWidth = 1 * canvasSizeMultiplier;
		ctx.font = 12 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="top"; 
		ctx.textAlign="left"; 
		ctx.fillText(xmin, axisGap, canvas.height - axisGap + axisPointMargin);
		ctx.textAlign="right"; 
		ctx.fillText(xmax, canvas.width - margin - 1, canvas.height - axisGap + axisPointMargin);

		// Draw a tick on the axis
		ctx.beginPath();
		ctx.moveTo(canvas.width - margin, canvas.height - axisGap - tickLength/2);
		ctx.lineTo(canvas.width - margin, canvas.height - axisGap + tickLength/2);
		ctx.stroke();


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



		



		// Draw the axes 2x so they always exist
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
		ctx.fillText("Pixel number for t=" + laneData.time + "s", xlabXPos, xlabYPos);


		// Y label
		ctx.font = 20 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign="center"; 
		ctx.textBaseline="bottom"; 
		ctx.save()
		var ylabXPos = 2 * axisGap / 3;
		var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
		ctx.translate(ylabXPos, ylabYPos);
		ctx.rotate(-Math.PI/2);
		ctx.fillText("Density", 0 ,0);
		ctx.restore();


	});

}




// Loads a session from the XML file stored at url
function uploadABCFromURL(url){
	
	console.log("Trying to open", url);
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
		  
		    if (xhttp == null || xhttp.responseXML == "") return;
		   
		    //console.log("xhttp.responseText", xhttp.responseText);
			var TSVstring = e.target.result.replace(/(\r\n|\n|\r)/gm,"!");
			TSVstring = TSVstring.replace(/(\t)/gm, "&");
			
		   uploadABC_controller(TSVstring);
		   
		}
	};
	xhttp.open("GET", url, true);
	xhttp.send();
	
	
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
					var TSVstring = e.target.result.replace(/(\r\n|\n|\r)/gm,"!");
					TSVstring = TSVstring.replace(/(\t)/gm, "&");

					//console.log("Sending TSVstring", TSVstring);

					uploadABC_controller(TSVstring);

				};
			})(fileName);

			reader.readAsText(fileName);
			
			

		}

		$("#uploadABCinput").val("");

	}


	
}



function closePosteriorSummaryPopup(){
	
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#posteriorSummaryPopup").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);

	
	
}

function getPosteriorSummaryTemplate(){


	return `

		<div id='posteriorSummaryPopup' style='background-color:#008cba; padding: 10 10; position:fixed; width: 30vw; left:35vw; top:20vh; z-index:5'>
			<div style='background-color:white; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 22px'> Posterior Distribution Summary </span>


				<span style='font-size: 30px; cursor:pointer; position:fixed; left:64.5vw; top:20.5vh' onclick='closePosteriorSummaryPopup()'>&times;</span>
				<div style='padding:2; font-size:18px;'> Sample parameters from the posterior and summarise the posterior into a single value </div>
				<table cellpadding=10 style='width:90%; margin:auto;'>
				
					<tr>
						<td style="vertical-align:top" title="The geometric median is the posterior sample which is closest in Euclidean space to all other posterior samples. The parameters are first normalised into z-scores."> 
							<b>Geometric median:</b>


							<div id="geometricMedianDIV" style="display:none">
								<br>
								State: <span id="geometricMedianStateVal"></span> &nbsp;&nbsp;&nbsp;
								X<sup>2</sup> = <span id="geometricMedianX2Val"></span>

								<table id="geometricMedianTable" style="width:100%" cellpadding=5 cellspacing=2>
								
									<tr style="background-color:#b3b3b3">
										<td style="width:100%">
											Parameter
										</td>
										
										<td style="width:100%">
											Estimate
										</td>
									
									</tr>
								
								</table>
								
							</td>
						</div>
							
						<td  style="vertical-align:top"> 
							<b>Sample from posterior:</b>
							
							
						</td>
					</tr>

					

				</table>
				
				

			</div>
		</div>
	`;

}


function posteriorSummary(){
	
	
	
	closeAllDialogs();
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getPosteriorSummaryTemplate();
	//popupHTML = popupHTML.replace("XX_plotNum_XX", plotNum);
	//popupHTML = popupHTML.replace("XX_plotName_XX", $("#selectPlot" + plotNum + " :selected").text());
	$(popupHTML).appendTo('body');



	getPosteriorSummaryData_controller(function(result){
		
		var paramNamesAndMedians = result.paramNamesAndMedians;


		$("#geometricMedianDIV").show(50);
		if (result.state == null) {
			$("#geometricMedianDIV").html("No information is available at this time.");
			return;
		}

		$("#geometricMedianStateVal").html(result.state);
		$("#geometricMedianX2Val").html(roundToSF(result.chiSquared, 4));


		for (var paramID in paramNamesAndMedians){

			var name = paramNamesAndMedians[paramID].name;
			var estimate = roundToSF(paramNamesAndMedians[paramID].estimate, 4);
			$("#geometricMedianTable").append(`

				<tr style="background-color:white">
					<td>
						` + name + `
					</td>

					<td>
						` + estimate + `
					</td>
				</tr>
			`);
			
			
		}
		
		
		
		
		
	});





	
	window.setTimeout(function(){
		
		$("#main").click(function(){
			closePosteriorSummaryPopup();
		});
		
		$("#mySidenav").click(function(){
			closePosteriorSummaryPopup();
		});
		
	}, 50);
	
	
}



function downloadABC(){


	stop_controller(function() { 

		get_ABCoutput_controller(function(result){

			if (result.lines.length == 0) return;

			var stringToPrint = result.lines;
			stringToPrint = stringToPrint.split("&").join("\t").split("!").join("\n");

			download("posterior.log", stringToPrint);
			

		});

	});



}



function addNewABCRows(lines){

	if (lines.length == 0) return;

	var padded = "&&&&&&&&&&&&&&";
	//console.log("lines", lines);
	

	for (var i = 0; i < lines.length; i++){


		var lineWithNBSPpadding = null;
		var rejected = false;
		if (lines[i].trim() == "" || lines[i].trim() == "&") {
			//lineWithNBSPpadding = "<br>";
		}

		else{

			// Replace all the & with a space
			//if (lines[i].split("|").length > 1) rejected = rejected || lines[i].split("|")[1].trim() == "false";
			var lineWithNBSPpadding = "<div class='' linenum='" + ABClines.length + "' onclick='highlightABCoutputRow(this)'>";
			

			// consoleLine += (ABC_JS.paddingString + value).slice(-ABC_JS.paddingString.length);
			var lineSplit = lines[i].split("&");
			var lineWithAmpersandPadding = "";
			for (var j = 0; j < lineSplit.length; j++){

				var paddedLineSplit = (padded + lineSplit[j]).slice(-padded.length);
				lineWithAmpersandPadding += paddedLineSplit;

			}




			//var openPipe = true; // | (pipes) denote coloured font
			for (var j = 0; j < lineWithAmpersandPadding.length; j ++){

				//if (lines[i][j] == "|") {
					//paddedLine += openPipe ? "<span style='color:red'>" : "</span>"; 
					//openPipe = !openPipe;
				//}
				if (lineWithAmpersandPadding[j] == "&") lineWithNBSPpadding += "&nbsp";
				else lineWithNBSPpadding += lineWithAmpersandPadding[j];

			}

			lineWithNBSPpadding += "<br></div>";
			ABClines.push(lineWithNBSPpadding);
			if (!rejected) ABClinesAcceptedOnly.push(lineWithNBSPpadding);

		}



	}


	renderABCoutput();


}



function renderABCoutput(){

	// Print ALL lines or just accepted lines?
	var linesToUse = $("#ABC_showRejectedParameters").prop("checked") ? ABClines : ABClinesAcceptedOnly;


	var ABCoutputHTML = "";

	var rowsToHighlight = [];

	// Always print the top 3 rows (header)
	/*if ($("[linenum='2']").length == 0)*/ 
	ABCoutputHTML += "<br><br>" + linesToUse[0];

	if ($("[linenum='0']").hasClass("ABC_output_highlighted")) rowsToHighlight.push($("[linenum='0']")[0]);



	var startRow = (nTimes30ABCrowsToDisplay-1)*30 + 1;
	var stopRow = startRow + 29;
	var numRowsDisplayed = 0;




	for (var rowNum = startRow; rowNum <= stopRow; rowNum ++){
		
		if (linesToUse[rowNum] == null) continue;
		numRowsDisplayed ++;


		var jQuery_selector = $("[linenum='" + rowNum + "']");
		if (jQuery_selector.hasClass("ABC_output_highlighted")) {

			linesToUse[rowNum] = linesToUse[rowNum].replace("class=''", "class='ABC_output_highlighted'");

			//rowsToHighlight.push(jQuery_selector[0]);
		}else{
			linesToUse[rowNum] = linesToUse[rowNum].replace("class='ABC_output_highlighted'", "class=''");
		}


		ABCoutputHTML += linesToUse[rowNum];



	}


	if (numRowsDisplayed > 0 && ABCoutputHTML.trim() != "") $("#numABCrowsDisplayed").html(startRow + "-" + (startRow + numRowsDisplayed - 1));
	$("#numABCrowsGenerated").html(linesToUse.length - 1);



	// Add the new lines to the output
	$("#ABCoutput").html(ABCoutputHTML).after(function(){

		setTimeout(function() {
			// Highlight the rows which need to be highlighted
			for (var i = 0; i < rowsToHighlight.length; i ++){
				//highlightABCoutputRow(rowsToHighlight[i], true);
				//rowsToHighlight[i].click();
			}
		}, 20);

	});




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


	// Rejection ABC
	if ($("#ABC_useMCMC").val() == 1){

		$(".ABC_display").show(50);
		$(".MCMC_display").hide(0);

	}

	// MCMC ABC
	else if ($("#ABC_useMCMC").val() == 2){

		$(".ABC_display").hide(0);
		$(".MCMC_display").show(50);


	}


}