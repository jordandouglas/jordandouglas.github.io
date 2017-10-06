

ABC_RULES = null;
ABC_POSTERIOR_DISTRIBUTION = [];
ABC_simulating = false;
ABC_metric_values_this_simulation = {};
ABC_parameters_and_metrics_this_simulation = {};
ABC_outputString = [];
ABC_outputString_unrendered = [];
n_ABC_trials_left = null;


// Start running ABC with the rules parsed by the controller
function beginABC_WW(rules, resolve = function() { }, msgID = null){


	if (!stopRunning_WW) {
		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}
		return;
	}


	ABC_simulating = true;
	stopRunning_WW = false;
	ABC_RULES = rules;
	ABC_POSTERIOR_DISTRIBUTION = [];

	console.log("I have rules", ABC_RULES);


	var ruleNums = []; // Build a list of rule numbers
	var LHS_params = []; // Build a list of parameters used on the LHS
	var RHS_params = []; // Build a list of metrics used on the RHS
	for (var ruleNum in ABC_RULES["rules"]) {
		ruleNums.push(ruleNum); 

		var LHS = ABC_RULES["rules"][ruleNum]["LHS"];
		for (var conditionNum = 0; conditionNum < LHS.length; conditionNum++){
			if(LHS_params.indexOf(LHS[conditionNum]["param"]) == -1) LHS_params.push(LHS[conditionNum]["param"]);
		}

		var RHS = ABC_RULES["rules"][ruleNum]["RHS"];
		for (var effectNum = 0; effectNum < RHS.length; effectNum++){
			if(RHS_params.indexOf(RHS[effectNum]["metric"]) == -1) RHS_params.push(RHS[effectNum]["metric"]);
		}

	}




	// Initialise the list of parameters/metrics which will be added to the posterior distribution if accepted
	// Each element in a list is from one rule
	ABC_parameters_and_metrics_this_simulation = {};
	for (var ruleNum in ABC_RULES["rules"]) {
		ABC_parameters_and_metrics_this_simulation["Rule" + ruleNum] = null;
	}
	ABC_parameters_and_metrics_this_simulation["accepted"] = null;
	for (var paramID in PHYSICAL_PARAMETERS){
		if (!PHYSICAL_PARAMETERS[paramID]["binary"] && !PHYSICAL_PARAMETERS[paramID]["hidden"]) {

			// If a fixed distribution and not used by ABC then only store 1 number
			if (PHYSICAL_PARAMETERS[paramID]["distribution"] == "Fixed" && LHS_params.indexOf(paramID) == -1) 
				ABC_parameters_and_metrics_this_simulation[paramID] = {name: PHYSICAL_PARAMETERS[paramID]["name"], val: PHYSICAL_PARAMETERS[paramID]["val"]};

			// Otherwise keep updating the list every trial
			else ABC_parameters_and_metrics_this_simulation[paramID] = {name: PHYSICAL_PARAMETERS[paramID]["name"], vals: []}; 
		}
				
	}


	if(RHS_params.indexOf("velocity") != -1) ABC_parameters_and_metrics_this_simulation["velocity"] = {name: "Mean velocity (bp/s)", vals: []};
	if(RHS_params.indexOf("catalyTime") != -1) ABC_parameters_and_metrics_this_simulation["catalyTime"] = {name: "Mean catalysis time (s)", vals: []};
	if(RHS_params.indexOf("totalTime") != -1) ABC_parameters_and_metrics_this_simulation["totalTime"] = {name: "Total transcription time (s)", vals: []};
	if(RHS_params.indexOf("nascentLen") != -1) ABC_parameters_and_metrics_this_simulation["nascentLen"] = {name: "Final nascent length (nt)", vals: []};


	n_ABC_trials_left = ABC_RULES["ntrials"];

	initialise_ABCoutput_WW(ruleNums);


	// Start the first trial
	ABC_trials_WW(ruleNums, resolve, msgID);






}


// Perform N ABC-trials
function ABC_trials_WW(ruleNums, resolve = function() { }, msgID = null){


	// When there are no more trials, stop
	if (n_ABC_trials_left == 0 || stopRunning_WW) {

		console.log("Finished ABC, posterior is", ABC_POSTERIOR_DISTRIBUTION, n_ABC_trials_left, stopRunning_WW);
		ABC_simulating = false;
		stopRunning_WW = true;

		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}

		return;
	}

	//console.log("N = ", n_ABC_trials_left);

	// Reset the values in the object which will be added to the posterior if accepted
	for (var paramID in ABC_parameters_and_metrics_this_simulation) {
		if (ABC_parameters_and_metrics_this_simulation[paramID] != null && ABC_parameters_and_metrics_this_simulation[paramID]["vals"] != null) ABC_parameters_and_metrics_this_simulation[paramID]["vals"] = [];
	}

	// Reset whether or not each rule passed
	for (var ruleNum in ABC_RULES["rules"]) {
		ABC_parameters_and_metrics_this_simulation["Rule" + ruleNum] = null;
	}
	ABC_parameters_and_metrics_this_simulation["accepted"] = null;


	// Sample all the parameters now. There will be no more random sampling between simulation trials, only in between ABC trials
	sample_parameters_WW();
	
	

	

	// After completing this trial, call this function again but with N decremented. If the trial was a success then add to the posterior
	var toDoAfterTrial = function(accepted){



		ABC_parameters_and_metrics_this_simulation["accepted"] = accepted;
		if (accepted) {
			//console.log("Accepted parameters", ABC_parameters_and_metrics_this_simulation);
			ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(ABC_parameters_and_metrics_this_simulation)));
		}

		if (!stopRunning_WW) update_ABCoutput_WW(ruleNums);
		n_ABC_trials_left--;


		ABC_trials_WW(ruleNums, resolve, msgID);
	}


	// Perform nruleFirings trials per rule 
	var toCall = () => new Promise((resolve) => ABC_trial_fire_rules_WW(0, true, ruleNums, resolve));
	toCall().then((acc) => toDoAfterTrial(acc));


}


// Execute the rules for this ABC-trial
function ABC_trial_fire_rules_WW(currentRuleIndex, accepted, ruleNums, resolve = function(acc) { }){


	//console.log("Executing rule", ruleNums[currentRuleIndex], "for trial, accepted = ", accepted);


	// Stop executing rules when there are no more rules or if the previous rule was rejected
	// If user pressed the stop button then return false
	if (ruleNums[currentRuleIndex] == null || !accepted || stopRunning_WW){
		resolve(stopRunning_WW ? false : accepted);
		return;
	}


	// After executing this rule, update the accepted variable and then move on to the next rule
	var toDoAfterKTrials = function(acc){
		accepted = accepted && acc;
		ABC_trial_fire_rules_WW(currentRuleIndex + 1, accepted, ruleNums, resolve);
	}


	// Perform nruleFirings trials per rule 
	var toCall = () => new Promise((resolve) => ABC_trial_fire_rule_WW(ruleNums[currentRuleIndex], ABC_RULES["nruleFirings"], resolve));
	toCall().then((acc) => toDoAfterKTrials(acc));


}




// Perform K simulations under the current rule
function ABC_trial_fire_rule_WW(ruleNum, K, resolve = function(acc) { }){



	// Set the parameters in the LHS to their required ABC value. This value will override its current value / prior distribution
	var LHS = ABC_RULES["rules"][ruleNum]["LHS"];
	for (var conditionNum = 0; conditionNum < LHS.length; conditionNum++){
		var condition = LHS[conditionNum];
		PHYSICAL_PARAMETERS[condition["param"]]["val"] = condition["value"];
	}



	// Reset the list of recorded metrics for this simulation 
	ABC_metric_values_this_simulation = {};
	var RHS = ABC_RULES["rules"][ruleNum]["RHS"];
	for (var effectNum = 0; effectNum < RHS.length; effectNum++){
		var metricName = RHS[effectNum]["metric"];
		ABC_metric_values_this_simulation[metricName] = [];
	}





	var toDoAfterTrials = function(){



		// Cache the parameters used by this rule 
		for (var paramID in PHYSICAL_PARAMETERS){
			if (ABC_parameters_and_metrics_this_simulation[paramID] != null && ABC_parameters_and_metrics_this_simulation[paramID]["vals"] != null) 
				ABC_parameters_and_metrics_this_simulation[paramID]["vals"].push(PHYSICAL_PARAMETERS[paramID]["val"]);
		}


		// Set the parameters in the LHS back to their default value / sample them
		for (var conditionNum = 0; conditionNum < LHS.length; conditionNum++){
			var condition = LHS[conditionNum];
			sample_parameter_WW(condition["param"]);
		}

		// Check if this satisfies the RHS
		var accepted = acceptOrRejectParameters(ruleNum);
		ABC_parameters_and_metrics_this_simulation["Rule" + ruleNum] = accepted;
		resolve(accepted);


		return;

	}

	// Perform K trials
	var toCall = () => new Promise((resolve) => startTrials_WW(K, resolve));
	toCall().then(() => toDoAfterTrials());



}



// Either accept the current parameters and move onto the next rule (return true)
// Or reject the parameters and discard them (return false)
function acceptOrRejectParameters(ruleNum){

	if (stopRunning_WW) return false;

	//console.log("Accept or reject based off", ABC_metric_values_this_simulation);


	// Go through each effect, look at the variable, the value and the operator. 
	// If variable OPERATOR value (eg. velocity > 10) then go to next effect, else return false  
	var RHS = ABC_RULES["rules"][ruleNum]["RHS"];
	for (var effectNum = 0; effectNum < RHS.length; effectNum++){
		var effect = RHS[effectNum];

		var observedValueList = ABC_metric_values_this_simulation[effect["metric"]]; // There will be upto K values in this list. Will take the mean
		if (observedValueList.length == 0) return false;

		var meanObservedValue = 0;
		var requiredValue = effect["value"];
		for (var i = 0; i < observedValueList.length; i ++) meanObservedValue += observedValueList[i] / observedValueList.length;


		// Cache number for later use 
		ABC_parameters_and_metrics_this_simulation[effect["metric"]]["vals"].push(meanObservedValue);

		switch(effect["operator"]){

			case "greaterThan":
				if (!(meanObservedValue > requiredValue)) return false;
				break;

			case "greaterThanEqual":
				if (!(meanObservedValue >= requiredValue)) return false;
				break;

			case "equalTo":
				if (!(meanObservedValue == requiredValue)) return false;
				break;

			case "lessThanEqual":
				if (!(meanObservedValue <= requiredValue)) return false;
				break;

			case "lessThan":
				if (!(meanObservedValue < requiredValue)) return false;
				break;

			default:
				return false;

		}



	}




	return true;

}



function initialise_ABCoutput_WW(ruleNums){



	// Initialise the ABC output string
	// The first 2 lines are in the following format:	
	//															|						Rule1							  |	    |				Rule 2									  |
	// Number		Rule1Param1		Rule1Param2		Rule1Metric1	Rule1Passed		Rule2Param1		Rule2Param2		Rule2Metric1	Rule2Passed		Accepted	 
	// Each column will have total width of a fixed number of spaces


	var paddingString = "&&&&&&&&&&&"; 
	//for (var i = 0; i < 20; i ++) paddingString += 
	var secondLine = (paddingString + "Trial").slice(-9);

	// Add all the variable names to the row. These variables will occur one time for each rule
	var variablesSection = "";
	for (var objID in ABC_parameters_and_metrics_this_simulation){
		if (ABC_parameters_and_metrics_this_simulation[objID] != null && ABC_parameters_and_metrics_this_simulation[objID]["vals"] != null) variablesSection +=  (paddingString + objID).slice(-paddingString.length);
	}

	for (var ruleNum in ruleNums){
		secondLine += variablesSection;
		secondLine += (paddingString + "Rule" + ruleNums[ruleNum]).slice(-paddingString.length);
	}

	secondLine += (paddingString + "Accepted").slice(-10);


	ABC_outputString = [secondLine];
	ABC_outputString_unrendered = [secondLine];


}


// Add the current ABC state to the output to be displayed on the DOM
function update_ABCoutput_WW(ruleNums){



	var paddingString = "&&&&&&&&&&&"; 
	var trialNum = 	ABC_RULES["ntrials"] - n_ABC_trials_left + 1;
	var line = (paddingString + trialNum).slice(-9);

	// Get the value of each parameter for this trial
	for (var ruleIndex = 0; ruleIndex < ruleNums.length; ruleIndex++){



		var printVals = true; // When this is false, the rule has not been executed, so leave some space but don't print any numbers
		if (ABC_parameters_and_metrics_this_simulation["Rule" + ruleNums[ruleIndex]] == null) printVals = false;

		for (var objID in ABC_parameters_and_metrics_this_simulation){



			if (ABC_parameters_and_metrics_this_simulation[objID] != null && ABC_parameters_and_metrics_this_simulation[objID]["vals"] != null) {
				var valueThisRule = printVals ? roundToSF_WW(parseFloat(ABC_parameters_and_metrics_this_simulation[objID]["vals"][ruleIndex]), 5) : "";
				line += (paddingString + valueThisRule).slice(-paddingString.length);
			}

		} 


		line += (paddingString + (printVals ? ABC_parameters_and_metrics_this_simulation["Rule" + ruleNums[ruleIndex]] : "")).slice(-paddingString.length);

	}

	line += (paddingString + ABC_parameters_and_metrics_this_simulation["accepted"]).slice(-10).toUpperCase();

	ABC_outputString.push(line);
	ABC_outputString_unrendered.push(line);


}



// Returns any new lines of the ABC output
function get_ABCoutput_WW(resolve = function() { }, msgID = null){


	var toReturn = {newLines: ABC_outputString_unrendered, nTrialsToGo: n_ABC_trials_left};
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


	ABC_outputString_unrendered = [];


}

