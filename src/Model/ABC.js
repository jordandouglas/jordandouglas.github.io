

ABC_RULES = null;
ABC_POSTERIOR_DISTRIBUTION = [];



// Start running ABC with the rules parsed by the controller
function beginABC_WW(rules, resolve = function() { }, msgID = null){

	ABC_RULES = rules;
	ABC_POSTERIOR_DISTRIBUTION = [];

	console.log("I have rules", ABC_RULES);


	// Start the first trial
	ABC_trial_WW(ABC_RULES["ABCntrials"]);





	if (msgID != null){
		postMessage(msgID + "~X~" + "done");
	}else{
		resolve();
	}


}


// Perform N simulations
function ABC_trial_WW(N){

	if (N == 0) return;


	// Perform nruleFirings trials per rule 
	for (var ruleNum in  ABC_RULES["rules"]){

		var accepted = ABC_trial_fire_rule_WW(ruleNum, BC_RULES["nruleFirings"]);




	}




}



// Within a simulation each rule must be fired K times
function ABC_trial_fire_rule_WW(ruleNum, K){


	// Set the parameters in the LHS to their required ABC value. This value will override its current value / prior distribution
	var LHS = ABC_RULES["rules"][ruleNum]["LHS"];
	for (var conditionNum = 0; conditionNum < LHS.length; conditionNum++){
		var condition = LHS[conditionNum];
		PHYSICAL_PARAMETERS[condition["param"]]["ABCval"] = condition["value"];
	}

	// Sample the parameters
	sample_parameters_WW();

	// Perform K trials
	startTrials_WW(K);


	// Set the parameters in the LHS back to their default value
	for (var conditionNum = 0; conditionNum < LHS.length; conditionNum++){
		var condition = LHS[conditionNum];
		PHYSICAL_PARAMETERS[condition["param"]]["ABCval"] = null;
	}


	// Check if this satisfies the RHS
	return acceptOrRejectParameters(ruleNum);


}



// Either accept the current parameters and move onto the next rule (return true)
// Or reject the parameters and discard them (return false)
function acceptOrRejectParameters(ruleNum){

	


	return false;

}






