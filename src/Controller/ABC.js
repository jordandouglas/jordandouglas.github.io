




function initABCpanel(){

	$("#beginABC_btn").css("cursor", "auto");
	$("#beginABC_btn").css("background-color", "#858280");
	$("#beginABC_btn").attr("disabled", "disabled");

	$("#ABCPanelTable1").html("");
	$("#ABCPanelTable2").html("");

	nFits = 0;
	ABCtableToUse = 1; // Alternate between the left (1) and right (2) tables
	addNewCurveButtons();

}






// Loads all the settings from the DOM and sends them through to the model so ABC can begin
// Assumes that all force-velocity input textareas have already been validated
function beginABC(){




	// Load the force-velocity values
	var forcesVelocitiesForModel = getABCforceVelocityObject();




	// Set to hidden mode and prevent user from changing to regular mode
	$("#PreExp").val("hidden");
	$("#PreExp").attr("disabled", "disabled");
	$("#PreExp").css("cursor", "auto");
	$("#PreExp").css("background-color", "#858280");
	changeSpeed_controller();


	beginABC_controller(forcesVelocitiesForModel);

	
	// Update the DOM so that we can see that ABC is running
	$("#beginABC_btn").val("Stop ABC");
	$("#beginABC_btn").attr("onclick", "stop_controller()");
	hideButtonAndShowStopButton("simulate");


	// Disable the ntrials and nrulespertrial textboxes
	$("#ABCntrials").css("cursor", "auto");
	$("#ABCntrials").css("background-color", "#858280");
	$("#ABCntrials").attr("disabled", "disabled");

	$("#ABC_RSS").css("cursor", "auto");
	$("#ABC_RSS").css("background-color", "#858280");
	$("#ABC_RSS").attr("disabled", "disabled");

	$("#downloadABC").show(50);
	$("#ABCacceptancePercentage_span").show(50);
	$("#ABC_showRejectedParameters_span").show(50);
	$("#ABCacceptancePercentage_val").html("0");
	$("#ABCacceptance_span").show(50);
	$("#ABCacceptance_val").html("0");


}



function getABCforceVelocityObject(){



	var curveTables = $(".ABCcurveRow");
	var forcesVelocitiesForModel = {ntrials: $("#ABCntrials").val(), testsPerData: $("#ABC_ntestsperdata").val()};
	forcesVelocitiesForModel["fits"] = {};
	for (var fitNum = 0; fitNum <= curveTables.length; fitNum++){

		var table = $(curveTables[fitNum]);
		var fitID = table.attr("fitID");

		if ($("#forceVelocityInputData_" + fitID).length == 0) continue;

		var forceVelocityValues = $("#forceVelocityInputData_" + fitID).val();
		forcesVelocitiesForModel["fits"][fitID] = {vals: []};
		forcesVelocitiesForModel["fits"][fitID]["RSSthreshold"] = parseFloat($("#ABC_RSS_" + fitID).val());
		forcesVelocitiesForModel["fits"][fitID]["ATPconc"] = parseFloat($("#ATPconc_" + fitID).val());
		forcesVelocitiesForModel["fits"][fitID]["CTPconc"] = parseFloat($("#CTPconc_" + fitID).val());
		forcesVelocitiesForModel["fits"][fitID]["GTPconc"] = parseFloat($("#GTPconc_" + fitID).val());
		forcesVelocitiesForModel["fits"][fitID]["UTPconc"] = parseFloat($("#UTPconc_" + fitID).val());


		var splitValues = forceVelocityValues.split("\n");
		if (splitValues.length == 0) valid = false;

		for (var lineNum = 0; lineNum < splitValues.length; lineNum++){
			var splitLine = splitValues[lineNum].split(",");

			if (splitLine.length == 1 && splitLine[0].trim() == "") continue;

			var force = parseFloat(splitLine[0]);
			var velocity = parseFloat(splitLine[1]);

			forcesVelocitiesForModel["fits"][fitID]["vals"].push({force: force, velocity: velocity});

		}
	}

	return forcesVelocitiesForModel;

}



function validateAllForceVelocityInputs(){

	var textareas = $(".forceVelocityInputData");
	var valid = true;
	for (var i = 0; i < textareas.length; i ++){
		valid = valid && validateForceVelocityInput(textareas[i]);
	}


	// If something is invalid then deactivate the start ABC button
	if (!valid || running_ABC){
		$("#beginABC_btn").css("cursor", "auto");
		$("#beginABC_btn").css("background-color", "#858280");
		$("#beginABC_btn").attr("disabled", "disabled");
	}


	// Else activate it
	else{
		$("#beginABC_btn").css("cursor", "pointer");
		$("#beginABC_btn").css("background-color", "#663399");
		$("#beginABC_btn").attr("disabled", false);
	}


}


// Ensure that the force velocity input textarea is valid
function validateForceVelocityInput(ele){


	var valid = true;


	// Ensure that the values in this textbox are in the format force, velocity with lines separating observations
	var forceVelocityValues = $(ele).val();
	var splitValues = forceVelocityValues.split("\n");
	if (splitValues.length == 0) valid = false;
	var thereExistsOnePairOfNumbers = false;
	var forces = []; // Ensure no duplicate forces
	var velocities = [];
	for (var lineNum = 0; lineNum < splitValues.length; lineNum++){
		var splitLine = splitValues[lineNum].split(",");
		if (splitLine.length == 1 && splitLine[0].trim() == "") continue;

		if (splitLine.length != 2) {
			valid = false;
			break;
		}

		var force = parseFloat(splitLine[0]);
		var velocity = parseFloat(splitLine[1]);
		if (isNaN(force) || isNaN(velocity)){
			valid = false;
			break;
		}


		if (forces.indexOf(force) != -1){
			valid = false;
			break;
		}

		forces.push(force);
		velocities.push(velocity);
		thereExistsOnePairOfNumbers = true;

	}


	// If there are no observations and only empty lines then valid is set to false
	if (!thereExistsOnePairOfNumbers) valid = false;


	if (valid) {
		var fitID = $(ele).attr("id").split("_")[1];
		drawForceVelocityCurveCanvas(fitID, forces, velocities);
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


function addNewCurveButtons(){

	var btns = getNewCurveButtonsTemplate();
	$("#ABCPanelTable" + ABCtableToUse).append(btns);


	// Disable the Begin ABC button
	$("#beginABC_btn").css("cursor", "auto");
	$("#beginABC_btn").css("background-color", "#858280");
	$("#beginABC_btn").attr("disabled", "disabled");


}



function getNewCurveButtonsTemplate(){


	return `

		<tr id="newABCcurve" >

			<td style="vertical-align:middle; font-size:20px; text-align:center;" colspan=3>
				<br><br>
				<div style="padding: 5 5; background-color:#b3b3b3; font-size:16px; width:300px; margin:auto">

					Add experimental data <br><br>
					<input type=button onClick=addNewForceVelocityCurve() value='+ Force-velocity curve' title="Add force-velocity experimental data" class="operation" style="background-color:#008CBA; width: 200px"> 
					<!--<br><br>
					<input type=button onClick=addNewForceVelocityCurve() value='+ [NTP]-velocity curve' title="Add [NTP]-velocity experimental data" class="operation" style="background-color:#008CBA; width: 200px">-->
					<br><br>
				</div>

			</td>
		</tr>
	
	`;

}



function addNewForceVelocityCurve(){




	nFits++;
	var fitID = "fit" + nFits;

	$("#ABCPanelTable" + ABCtableToUse).append(getABCforceVelocityCurveTemplate(fitID));



	// Switch to the other ABC table next time so we have 2 columns of curves
	ABCtableToUse ++;
	if (ABCtableToUse > 2) ABCtableToUse = 1;


	drawForceVelocityCurveCanvas(fitID);


	// Delete the new buttons and move them to the next cell
	$("#newABCcurve").remove(); 
	addNewCurveButtons();

}





function getABCforceVelocityCurveTemplate(fitID){



	return `
		<tr fitID="` + fitID + `" class="ABCcurveRow"> <!-- style="background-color:#b3b3b3;"> -->


			<td class="` + fitID + `" style="width:200px; text-align:center; vertical-align:top">
				<br><br>
				<div style="font-size:18px;">Force-velocity experimental data</div>


					<textarea class="forceVelocityInputData" id="forceVelocityInputData_` + fitID + `" onChange="validateAllForceVelocityInputs()" style="font-size:14px; padding: 5 10;  width: 200px; height: 200px; max-width:200px; max-height:500px; min-height:100px; min-width:200px"  
					title="Input force-velocity data in the specified format" placeholder="Example.                                  5, 15.5                                 10, 17.4                                14, 18.5"></textarea>
					<br><br>
					<span style="font-size:12px; font-family:Arial; vertical-align:middle; "> 
						Input your force (pN) and velocity (bp/s) observations. Separate force and velocity values with a comma and separate observations with a line break. 
						Ensure there are no duplicate forces.
					</span>

			</td>


			<td class="` + fitID + `" style="width:300px; text-align:center; vertical-align:top">

				<div style="font-size:20px;">Force-velocity curve</div>


					<canvas id="forceVelocityCurve_` + fitID + `" width=300 height=300> </canvas>

			</td>



			<td class="` + fitID + `" style="text-align:center; vertical-align:top">

					<br><br>
					<table style="width:250px; margin:auto">


						<tr>
							<td colspan=2 style="text-align:center;">

								<div style="font-size:18px;">NTP Concentrations</div><br>
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



					Mean RSS threshold:
						<input type="number" id="ABC_RSS_` + fitID + `" value=3 title="Accept parameters into the posterior distribution and only if the mean residual sum of squares (RSS) for this dataset is less than this threshold"
							 class="variable" style="vertical-align: middle; text-align:left; width: 70px;  font-size:14px; background-color:#008CBA">

			</td>

		</tr>



	`;




}




function drawForceVelocityCurveCanvas(fitID, forces = null, velocities = null){
	
	
	var canvas = $("#forceVelocityCurve_" + fitID)[0];
	if (canvas == null) return;

	ctx = canvas.getContext('2d');

	var canvasSizeMultiplier = 1;
	var axisGap = 45 * canvasSizeMultiplier;
	var margin = 3 * canvasSizeMultiplier;


	getPosteriorDistribution_controller(function(result){


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
			for (var postNum = 0; postNum < posterior.length; postNum++){

				console.log("postNum", postNum);

				var posteriorVelocities = posterior[postNum]["velocity"]["vals"];

				ctx.beginPath();
				var xPrime = widthScale * (forces[0] - xmin) + axisGap;
				var yPrime = plotHeight + margin - heightScale * (posteriorVelocities[0] - ymin);
				ctx.moveTo(xPrime, yPrime);


				for (var forceNum = 1; forceNum < forces.length; forceNum++ ){
					var xPrime = widthScale * (forces[forceNum] - xmin) + axisGap;
					var yPrime = plotHeight + margin - heightScale * (posteriorVelocities[forceNum] - ymin);

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