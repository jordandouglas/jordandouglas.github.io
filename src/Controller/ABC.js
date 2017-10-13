




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
		if (!valid) break;

	}


	// If something is invalid then deactivate the start ABC button
	if (!valid){
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
		thereExistsOnePairOfNumbers = true;

	}


	// If there are no observations and only empty lines then valid is set to false
	if (!thereExistsOnePairOfNumbers) valid = false;

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







function addNewABCRuleButton() {

	numberABCrules++;

	if (numberABCrules == 2){
		$("#beginABC_btn").css("cursor", "pointer");
		$("#beginABC_btn").css("background-color", "#663399");
		$("#beginABC_btn").attr("disabled", false);
	}


	var html = `
		<tr id="ABCrule` + numberABCrules + `" class="ABCrule" >


			<td style="vertical-align:top; font-size:20px text-align:center;" colspan=2>
				<input type=button onClick=addNewRule() value='+ New rule' title="Create a new rule to decide which parameter values will be added to the posterior distribution" class="operation" style="background-color:#663399">
			</td>
		</tr>

	`;


	$("#ABCPanelTable").append(html);



}

function deleteABCrule(ele){

	var ruleNumber = $(ele).attr("id").substring(10);
	$("#ABCrule" + ruleNumber).remove();
	$("#ABCruleSpacer" + ruleNumber).remove();



}


function addNewRuleTemplate(ruleNumber) {


	// Get the row which contains this rule
	var row = $("#ABCrule" + ruleNumber);


	var td = `

		

		<td style="vertical-align:middle; font-size:16px text-align:right;  min-width:90px">

			<input id="deleteRule` + ruleNumber + `" type=button onClick=deleteABCrule(this) value='&times;' title="Delete this rule" class="operation" style="background-color:#663399; width:15px; font-size:12px; padding: 0 0">

			<b style="font-family:Bookman;">Rule ` + ruleNumber + `:</b>

		</td>




		`;

	
	row.html(td);
	row.before('<tr id="ABCruleSpacer' + ruleNumber + '" style="height:5px"></tr>');
	row.css("background-color", "#b3b3b3");

	var toCall = () => new Promise((resolve) => get_PHYSICAL_PARAMETERS_controller(resolve));
	toCall().then((params) => {
		addIfStatementABC(ruleNumber, params);
		addThenStatementABC(ruleNumber);
	});


	
}

function addParametersToIfDropdownList(dropDown, params){


	for (var paramID in params){
		if (params[paramID]["hidden"] || params[paramID]["binary"]) continue;
		dropDown.append(
			`<option value="` + paramID + `" > ` + params[paramID]["name"] + `</option>`
		);
	};




}


function addIfStatementABC(ruleNumber, params, first = true){

	
	var ifOrAnd = first ? "IF" : "AND";


	var ifHTML = `

		<td style="vertical-align:middle; font-size:25px text-align:center; min-width:380px">

			<b style="font-family:Bookman;">` + ifOrAnd + `</b> &nbsp;&nbsp;	
				<select class="plot-dropdown ifParameterName` + ruleNumber + `" title="Select which parameter to tweak" style="vertical-align: middle; text-align:right; background-color:#663399; max-width:180px; font-size:15px">
				</select>
				&nbsp;&nbsp; 

				<!--
				<select class="plot-dropdown ifOperator` + ruleNumber + `" title="Select whether this parameter must be greater than or less than a number" style="vertical-align: middle; text-align:right; background-color:#663399">
				  	<option value="greaterThan">&gt;</option>
				  	<option value="greaterThanEqual">&ge;</option>
				  	<option value="equalTo">=</option>
				  	<option value="lessThanEqual">&le;</option>
				  	<option value="lessThan">&lt;</option>
				</select>


				-->

				<b style="font-family:Bookman; font-size:22px; vertical-align:middle">=</b> &nbsp;&nbsp;	

				<input type="number" value="0" class="variable ifParameterVal` + ruleNumber + `" style="vertical-align: middle; text-align:left; width: 70px;  padding: 5px; font-size:14px; background-color:#663399">


		</td>


		<td style="vertical-align:middle; font-size:25px text-align:center; background-color:#ebe9e7">

			<input id="newIf` + ruleNumber + `" type=button onClick=addNewIf(this) value='+ AND' title="Add another condition to this rule" class="operation" style="background-color:#663399; width:45px; font-size:12px">

		</td>

	`;




	// Add a new if cell to the position before the first then cell
	if($(".thenCell" + ruleNumber).length > 0){
		var ele = $($(".thenCell" + ruleNumber)[0]);
		ele.before(ifHTML);

	}else{
		var row = $("#ABCrule" + ruleNumber);
		row.append(ifHTML);
	}


	// Add the parameters to the dropdown list
	var dropDown = $($(".ifParameterName" + ruleNumber)[$(".ifParameterName" + ruleNumber).length-1]);
	addParametersToIfDropdownList(dropDown, params);

	dropDown.val("FAssist");


	// Set the >, >= etc operator to default as =
	//$($(".ifOperator" + ruleNumber)[$(".ifOperator" + ruleNumber).length-1]).val("equalTo");





}


function addNewIf(ele){

	// Get the param list so we can add to a new cell
	var toCall = () => new Promise((resolve) => get_PHYSICAL_PARAMETERS_controller(resolve));
	toCall().then((params) => {

		var ruleNumber = parseFloat($(ele).attr("id").substring(5)); // id is newIfi where i is the rule number
		$(ele).parent().remove();
		addIfStatementABC(ruleNumber, params, false);

	});

	

}



function addThenStatementABC(ruleNumber, first = true){

	var row = $("#ABCrule" + ruleNumber);
	var thenOrAnd = first ? "THEN" : "AND";

	var thenHTML = `

			

			<td class="thenCell` + ruleNumber + `" style="vertical-align:middle; font-size:25px text-align:center; min-width:450px">

				<b style="font-family:Bookman;">` + thenOrAnd + `</b> &nbsp;&nbsp;	
				<select class="plot-dropdown thenParameterName` + ruleNumber + `" title="Select which metric to measure" style="vertical-align: middle; text-align:right; background-color:#663399; max-width:210px; font-size:15px">
					<option value="velocity">Mean velocity (bp/s)</option>
					<option value="catalyTime">Mean catalysis time (s)</option>
					<option value="totalTime">Total copy time (s)</option>
					<option value="nascentLen">Nascent strand length (nt)</option>
				</select>

				 &nbsp;&nbsp; 

				 <select class="plot-dropdown thenOperator` + ruleNumber + `" title="Select whether this metric must be greater than or less than a number" style="vertical-align: middle; text-align:right; background-color:#663399">
				  	<option value="greaterThan">&gt;</option>
				  	<option value="greaterThanEqual">&ge;</option>
				  	<option value="equalTo">=</option>
				  	<option value="lessThanEqual">&le;</option>
				  	<option value="lessThan">&lt;</option>
				</select>
				 &nbsp;&nbsp;	

				 <input type="number" value="10" class="variable thenParameterVal` + ruleNumber + `" style="vertical-align: middle; text-align:left; width: 70px;  padding: 5px; font-size:14px; background-color:#663399">


			</td>


			<td style="vertical-align:middle; font-size:25px text-align:center; background-color:#ebe9e7">

				<input id="newThen` + ruleNumber + `" type=button onClick=addNewThen(this) value='+ AND' title="Add another consequence to this rule" class="operation" style="background-color:#663399; width:45px; font-size:12px">

			</td>
		`;


	row.append(thenHTML);

}

function addNewThen(ele){

	var ruleNumber = parseFloat($(ele).attr("id").substring(7)); // id is newTheni where i is the rule number
	$(ele).parent().remove();
	addThenStatementABC(ruleNumber, false);

}




function addNewRule() {

	// Delete the current add rule button and replace it with the rule template
	addNewRuleTemplate(numberABCrules);

	// Create a new add rule button on the next row
	addNewABCRuleButton();



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