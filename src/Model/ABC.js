

ABC_RULES = null;
ABC_POSTERIOR_DISTRIBUTION = [];
ABC_simulating = false;
ABC_metric_values_this_simulation = {};
ABC_parameters_and_metrics_this_simulation = {};



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
	for (var ruleNum in  ABC_RULES["rules"]) {
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






	// Start the first trial
	ABC_trials_WW(ABC_RULES["ntrials"], ruleNums, LHS_params, RHS_params, resolve, msgID);






}


// Perform N ABC-trials
function ABC_trials_WW(N, ruleNums, LHS_params, RHS_params, resolve = function() { }, msgID = null){


	// When there are no more trials, stop
	if (N == 0 || stopRunning_WW) {

		console.log("Finished ABC, posterior is", ABC_POSTERIOR_DISTRIBUTION, N, stopRunning_WW);
		ABC_simulating = false;
		stopRunning_WW = true;

		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}

		return;
	}

	//console.log("N = ", N, "LHS_params", LHS_params, "RHS_params", RHS_params);


	// Initialise the list of parameters/metrics which will be added to the posterior distribution if accepted
	// Each element in a list is from one rule
	ABC_parameters_and_metrics_this_simulation = {};
	for (var paramID in PHYSICAL_PARAMETERS){
		if (!PHYSICAL_PARAMETERS[paramID]["binary"] && !PHYSICAL_PARAMETERS[paramID]["hidden"]) {

			// If a fixed distribution and not used by ABC then only store 1 number
			if (PHYSICAL_PARAMETERS[paramID]["distribution"] == "Fixed" && LHS_params.indexOf(paramID) == -1) 
				ABC_parameters_and_metrics_this_simulation[paramID] = {name: PHYSICAL_PARAMETERS[paramID]["name"], val: PHYSICAL_PARAMETERS[paramID]["val"]};

			// Otherwise keep updating the list every trial
			else ABC_parameters_and_metrics_this_simulation[paramID] = {name: PHYSICAL_PARAMETERS[paramID]["name"], vals: []}; 
		}
				
	}


	if(RHS_params.indexOf("meanVelocity") != -1) ABC_parameters_and_metrics_this_simulation["meanVelocity"] = {name: "Mean velocity (bp/s)", vals: []};
	if(RHS_params.indexOf("meanCatalysis") != -1) ABC_parameters_and_metrics_this_simulation["meanCatalysis"] = {name: "Mean catalysis time (s)", vals: []};
	if(RHS_params.indexOf("meanTranscription") != -1) ABC_parameters_and_metrics_this_simulation["meanTranscription"] = {name: "Total transcription time (s)", vals: []};
	if(RHS_params.indexOf("nascentLength") != -1) ABC_parameters_and_metrics_this_simulation["nascentLength"] = {name: "Final nascent length (nt)", vals: []};



	// Sample all the parameters now. There will be no more random sampling between simulation trials, only in between ABC trials
	sample_parameters_WW();
	
	

	

	// After completing this trial, call this function again but with N decremented. If the trial was a success then add to the posterior
	var toDoAfterTrial = function(accepted){

		if (accepted) {
			console.log("Accepted parameters", ABC_parameters_and_metrics_this_simulation);
			ABC_POSTERIOR_DISTRIBUTION.push(ABC_parameters_and_metrics_this_simulation);
		}

		ABC_trials_WW(N - 1, ruleNums, LHS_params, RHS_params, resolve, msgID);
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


	//console.log("Executing rule", ruleNum, K, "times");

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
		resolve(acceptOrRejectParameters(ruleNum));
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






