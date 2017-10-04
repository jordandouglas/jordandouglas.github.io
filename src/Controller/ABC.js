




function initABCpanel(){

	$("#beginABC_btn").css("cursor", "auto");
	$("#beginABC_btn").css("background-color", "#858280");
	$("#beginABC_btn").attr("disabled", "disabled");

	numberABCrules = 0;
	addNewABCRuleButton();

}


// Loads all the settings from the DOM and sends them through to the model so ABC can begin
function beginABC(){


	// The order which these are added to the list matters because rules are fired in this order
	// If an earlier rule fails the following will not be followed
	var rulesDOM = $(".ABCrule");
	var rules = {ntrials: $("#ABCntrials").val(), nruleFirings: $("#ABCnRulesPerTrial").val(), rules: {}};
	for (var i = 0; i < rulesDOM.length; i ++){
		var ruleDOM = $(rulesDOM[i]);

		// Get the parameters and their operators and values to set (ie. the LHS)
		var ruleNumber = ruleDOM.attr("id").substring(7);
		if (ruleNumber >= numberABCrules) break;
		var paramNames = ruleDOM.find(".ifParameterName" + ruleNumber);
		var paramOperators = ruleDOM.find(".ifOperator" + ruleNumber);
		var paramValues = ruleDOM.find(".ifParameterVal" + ruleNumber);
		var thisRule = {num: ruleNumber, LHS: [], RHS: []};
		
		for (var conditionNum = 0; conditionNum < paramNames.length; conditionNum++){
			
			var condition = {};
			var param = $(paramNames[conditionNum]).val();
			var value = parseFloat($(paramValues[conditionNum]).val());
			if (param == "none" || value == null || isNaN(value)) continue;

			condition["param"] = param;
			condition["operator"] = $(paramOperators[conditionNum]).val();
			condition["value"] = value;
			thisRule["LHS"].push(condition);

		}


		// RHS
		var metricNames = ruleDOM.find(".thenParameterName" + ruleNumber);
		var metricOperators = ruleDOM.find(".thenOperator" + ruleNumber);
		var metricValues = ruleDOM.find(".thenParameterVal" + ruleNumber);

		for (var conditionNum = 0; conditionNum < metricNames.length; conditionNum++){
			
			var effect = {};
			var metric = $(metricNames[conditionNum]).val();
			var value = parseFloat($(metricValues[conditionNum]).val());
			if (value == null || isNaN(value)) continue;

			effect["metric"] = metric;
			effect["operator"] = $(metricOperators[conditionNum]).val();
			effect["value"] = value;
			thisRule["RHS"].push(effect);

		}



		// Add this rule to the list of rules if the RHS is not empty
		if (thisRule["RHS"].length > 0) rules["rules"][ruleNumber] = thisRule;

	}

	beginABC_controller(rules);


	// Update the DOM so that we can see that ABC is running
	$("#beginABC_btn").val("Stop ABC");
	hideButtonAndShowStopButton("simulate");



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
						if (dropdown.val() == paramID) dropdown.val("none") // Set the current parameter to none if this one is selected
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




function addNewABCRuleButton() {

	numberABCrules++;


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

		

		<td style="vertical-align:middle; font-size:16px text-align:right;  min-width:70px">

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

		<td style="vertical-align:middle; font-size:25px text-align:center; min-width:400px">

			<b style="font-family:Bookman;">` + ifOrAnd + `</b> &nbsp;&nbsp;	
				<select class="plot-dropdown ifParameterName` + ruleNumber + `" title="Select which parameter to tweak" style="vertical-align: middle; text-align:right; background-color:#663399; max-width:180px; font-size:15px">
				  <option value="none">Select parameter...</option>
				</select>
				&nbsp;&nbsp; 

				<select class="plot-dropdown ifOperator` + ruleNumber + `" title="Select whether this parameter must be greater than or less than a number" style="vertical-align: middle; text-align:right; background-color:#663399">
				  	<option value="greaterThan">&gt;</option>
				  	<option value="greaterThanEqual">&ge;</option>
				  	<option value="equalTo">=</option>
				  	<option value="lessThanEqual">&le;</option>
				  	<option value="lessThan">&lt;</option>
				</select>


				&nbsp;&nbsp; 
				<input type="number" class="variable ifParameterVal` + ruleNumber + `" style="vertical-align: middle; text-align:center; width: 70px;  padding: 5px; font-size:14px; background-color:#663399">


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


	// Set the >, >= etc operator to default as =
	$($(".ifOperator" + ruleNumber)[$(".ifOperator" + ruleNumber).length-1]).val("equalTo");





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
					<option value="meanVelocity">Mean velocity (bp/s)</option>
					<option value="meanCatalysis">Mean catalysis time (s)</option>
					<option value="meanTranscription">Total copy time (s)</option>
					<option value="nascentLength">Nascent strand length (nt)</option>
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

				 <input type="number" value="10" class="variable thenParameterVal` + ruleNumber + `" style="vertical-align: middle; text-align:center; width: 70px;  padding: 5px; font-size:14px; background-color:#663399">


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







