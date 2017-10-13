

ABC_JS = {};

ABC_JS.ABC_FORCE_VELOCITIES = null;
ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];
ABC_JS.ABC_simulating = false;
ABC_JS.ABC_parameters_and_metrics_this_simulation = {};
ABC_JS.velocities_for_this_curve = [];
ABC_JS.ABC_outputString = [];
ABC_JS.ABC_outputString_unrendered = [];
ABC_JS.n_ABC_trials_left = null;
ABC_JS.nAcceptedValues = 0;





// Start running ABC with the rules parsed by the controller
ABC_JS.beginABC_WW = function(forcesVelocities, resolve = function() {}, msgID = null){



	if (!WW_JS.stopRunning_WW) {
		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}
		return;
	}

	//console.log("I have fits", forcesVelocities);


	ABC_JS.ABC_simulating = true;
	WW_JS.stopRunning_WW = false;
	ABC_JS.ABC_FORCE_VELOCITIES = forcesVelocities;
	ABC_JS.nAcceptedValues = 0;
	//ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];



	var fitNums = []; // Build a list of fit numbers
	for (var fitNum in ABC_JS.ABC_FORCE_VELOCITIES["fits"]) {
		fitNums.push(fitNum); 
	}




	// Initialise the list of parameters/metrics which will be added to the posterior distribution if accepted
	ABC_JS.ABC_parameters_and_metrics_this_simulation = {};
	for (var fitNum in fitNums) {
		ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitNums[fitNum]] = null;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitNums[fitNum]] = null;
	}
	ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"] = null;
	for (var paramID in PARAMS_JS.PHYSICAL_PARAMETERS){
		if (!PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["binary"] && !PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["hidden"]) {


			if (paramID == "FAssist") continue;

			// If a fixed distribution and not used by ABC then only store 1 number
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"] == "Fixed") 
				ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID] = {name: PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["name"], val: PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"]};

			// Otherwise keep updating the list every trial
			else ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID] = {name: PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["name"], priorVal: null}; 
		}
				
	}

	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"] = {name: PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["name"], obsVals: []}; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"] = {name: "Mean velocity (bp/s)", vals: []};
	//if(RHS_params.indexOf("catalyTime") != -1) ABC_JS.ABC_parameters_and_metrics_this_simulation["catalyTime"] = {name: "Mean catalysis time (s)", vals: []};
	//if(RHS_params.indexOf("totalTime") != -1) ABC_JS.ABC_parameters_and_metrics_this_simulation["totalTime"] = {name: "Total transcription time (s)", vals: []};
	//if(RHS_params.indexOf("nascentLen") != -1) ABC_JS.ABC_parameters_and_metrics_this_simulation["nascentLen"] = {name: "Final nascent length (nt)", vals: []};


	ABC_JS.n_ABC_trials_left = ABC_JS.ABC_FORCE_VELOCITIES["ntrials"];



	// Make sure that 4 NTPs are being used, not 1
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] = true;



	ABC_JS.initialise_ABCoutput_WW(fitNums);




	if (ANIMATION_TIME_TEMP == 0) SIM_JS.renderPlotsHidden(50); // Set up the DOM rendering loop, which will render plots, parameters, and ABC output every few seconds



	
	// Start the first trial
	ABC_JS.ABC_trials_WW(fitNums, resolve, msgID);






}



ABC_JS.clearABCdata_WW = function(){

	ABC_JS.ABC_FORCE_VELOCITIES = null;
	ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];
	ABC_JS.ABC_simulating = false;
	ABC_JS.ABC_parameters_and_metrics_this_simulation = {};
	ABC_JS.ABC_outputString = [];
	ABC_JS.ABC_outputString_unrendered = [];
	ABC_JS.n_ABC_trials_left = null;
	ABC_JS.nAcceptedValues = 0;


}


// Perform N ABC-trials
ABC_JS.ABC_trials_WW = function(fitNums, resolve = function() {}, msgID = null){


 	// Print out every 100th simulation when calling from command line
 	if (RUNNING_FROM_COMMAND_LINE && (ABC_JS.n_ABC_trials_left == 1 || ABC_JS.n_ABC_trials_left == ABC_JS.ABC_FORCE_VELOCITIES["ntrials"] || (ABC_JS.ABC_FORCE_VELOCITIES["ntrials"] - ABC_JS.n_ABC_trials_left + 1) % 20 == 0)){


 		var acceptanceNumber = ABC_JS.nAcceptedValues;
		var acceptancePercentage = WW_JS.roundToSF_WW(100 * ABC_JS.nAcceptedValues / (ABC_JS.ABC_FORCE_VELOCITIES["ntrials"] - ABC_JS.n_ABC_trials_left));
		if (isNaN(acceptancePercentage)) acceptancePercentage = 0;

 		console.log("ABC", (ABC_JS.ABC_FORCE_VELOCITIES["ntrials"] - ABC_JS.n_ABC_trials_left + 1), "/", ABC_JS.ABC_FORCE_VELOCITIES["ntrials"], "| Accepted:", acceptanceNumber, "| Acceptance rate:", acceptancePercentage + "%");
 	}


	// When there are no more trials, stop
	if (ABC_JS.n_ABC_trials_left == 0 || WW_JS.stopRunning_WW) {

		//console.log("Finished ABC, posterior is", ABC_JS.ABC_POSTERIOR_DISTRIBUTION, ABC_JS.n_ABC_trials_left, WW_JS.stopRunning_WW);
		ABC_JS.ABC_simulating = false;
		WW_JS.stopRunning_WW = true;

		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}

		return;
	}

	//console.log("N = ", ABC_JS.n_ABC_trials_left);


	// Reset whether or not each fit was accepted
	for (var fitNum in fitNums) {
		ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitNums[fitNum]] = null;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitNums[fitNum]] = null;
	}
	ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"] = null;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["obsVals"] = []; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"] = [];


	// Sample all the parameters now. There will be no more random sampling between simulation trials, only in between ABC trials
	PARAMS_JS.sample_parameters_WW();
	
	
	// Add the sampled priors to the list
	for (var paramID in ABC_JS.ABC_parameters_and_metrics_this_simulation) {
		if (ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID] != null && ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] !== undefined) {
			ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"];
		}
	}

	

	// After completing this trial, call this function again but with N decremented. If the trial was a success then add to the posterior
	var toDoAfterTrial = function(accepted){
		
		

		ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"] = accepted;
		if (accepted ) { // Do not cache if we are running from command line
			ABC_JS.nAcceptedValues ++;
			if (!RUNNING_FROM_COMMAND_LINE) ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation)));
		}

		if (!WW_JS.stopRunning_WW) ABC_JS.update_ABCoutput_WW(fitNums);
		ABC_JS.n_ABC_trials_left--;

		ABC_JS.ABC_trials_WW(fitNums, resolve, msgID);

	}


	var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_curve_WW(0, true, fitNums, resolve));
	toCall().then((acc) => toDoAfterTrial(acc));


}


// Run the simulations for this curve for this ABC-trial
ABC_JS.ABC_trial_for_curve_WW = function(currentFitNum, accepted, fitNums, resolve = function(acc) {}){

	

	//console.log("Executing curve", fitNums[currentFitNum], "for trial, accepted = ", accepted);


	// Stop executing rules when there are no more rules or if the previous rule was rejected
	// If user pressed the stop button then return false
	if (fitNums[currentFitNum] == null || !accepted || WW_JS.stopRunning_WW){
		resolve(WW_JS.stopRunning_WW ? false : accepted);
		return;
	}


	// After executing this rule, update the accepted variable and then move on to the next rule
	var toDoAfterTrials = function(){


		// Calculate the mean RSS
		var meanRSS = 0;
		var fitID = fitNums[currentFitNum];
		for (var observationNum = 0; observationNum < ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["vals"].length; observationNum++){
			
			var observedVelocity = ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["vals"][observationNum]["velocity"];
			var simulatedVelocity = ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"][observationNum];

			var residualSquared =  Math.pow(observedVelocity - simulatedVelocity, 2);


			meanRSS += residualSquared / ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["vals"].length;

		}

		ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitID] = meanRSS;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitID] = meanRSS < ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["RSSthreshold"];
		accepted = accepted && meanRSS < ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["RSSthreshold"];

		ABC_JS.ABC_trial_for_curve_WW(currentFitNum + 1, accepted, fitNums, resolve);
	}


	// Run a single simulation with this force / [NTP]
	var toCall = () => new Promise((resolve) => ABC_JS.ABC_K_trials_for_observation_WW(fitNums[currentFitNum], 0, resolve));
	toCall().then((acc) => toDoAfterTrials(acc));


}






// Perform K simulations under the current force and/or [NTP]
ABC_JS.ABC_K_trials_for_observation_WW = function(fitID, observationNum, resolve = function() {}){


	//console.log("Starting observation", observationNum, "for curve", fitID, ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID][observationNum]);


	if (ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["vals"][observationNum] == null || WW_JS.stopRunning_WW){
		resolve();
		return;
	}


	// Set the force / NTP to the required value
	var force = ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["vals"][observationNum]["force"];
	PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] = force;
	PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["val"] = ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["ATPconc"];
	PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["val"] = ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["CTPconc"];
	PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["val"] = ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["GTPconc"];
	PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["val"] = ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["UTPconc"];
	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["obsVals"].push(force);



	
	var toDoAfterTrial = function(){

		// Take the median velocity
		ABC_JS.velocities_for_this_curve.sort();

		if (ABC_JS.velocities_for_this_curve.length % 2 == 0){ // Even number, take mean of middle two
			var middleLeft  = ABC_JS.velocities_for_this_curve[ABC_JS.velocities_for_this_curve.length/2-1];
			var middleRight = ABC_JS.velocities_for_this_curve[ABC_JS.velocities_for_this_curve.length/2];
			var median = (middleLeft + middleRight) / 2;
			ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"].push(median);
			//console.log("Taking median of", ABC_JS.velocities_for_this_curve, "got", median);
		}

		else{	// Odd number, take middle
			var median = ABC_JS.velocities_for_this_curve[Math.floor(ABC_JS.velocities_for_this_curve.length/2)];
			ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"].push(median);
			//console.log("Taking median of", ABC_JS.velocities_for_this_curve, "got", median);
		}


		// Start the next trial with the next observed force / [NTP]
		ABC_JS.ABC_K_trials_for_observation_WW(fitID, observationNum + 1, resolve);


	}
	
	// Perform a trial
	var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_observation_WW(ABC_JS.ABC_FORCE_VELOCITIES["testsPerData"], fitID, observationNum, resolve));
	toCall().then(() => toDoAfterTrial());


}






// Perform a single simulation under the current force and/or [NTP]
ABC_JS.ABC_trial_for_observation_WW = function(K, fitID, observationNum, resolve = function() {}){


	//console.log("Starting observation", observationNum, "for curve", fitID, ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID][observationNum]);

	if (K == 0 || WW_JS.stopRunning_WW){
		resolve();
		return;
	}


	// Create an empty list. There will be K trials and therefore K velocities. The list will be filled up by plots.js. We will take the median of K
	ABC_JS.velocities_for_this_curve = [];



	// Perform K trials then resolve
	var toCall = () => new Promise((resolve) => SIM_JS.startTrials_WW(K, resolve));
	toCall().then(() => resolve());
	

}






ABC_JS.initialise_ABCoutput_WW = function(fitNums){



	// Initialise the ABC output string
	// The first 2 lines are in the following format:	
	//												|						Force-velocity curve 1						 		 			|	  							 
	// Number		PriorParam1		PriorParam2	...	Force1	Velocity1	Force2	Velocity2	Force3	Velocity3		RSS		Passed	Accepted	 
	// Each column will have total width of a fixed number of spaces


	var paddingString = "&&&&&&&&&&&"; 
	//for (var i = 0; i < 20; i ++) paddingString += 
	var secondLine = (paddingString + "Trial").slice(-9);

	// Add all the prior-sampled variable names to the row. These variables will occur one time for each rule
	for (var objID in ABC_JS.ABC_parameters_and_metrics_this_simulation){
		if (ABC_JS.ABC_parameters_and_metrics_this_simulation[objID] != null && ABC_JS.ABC_parameters_and_metrics_this_simulation[objID]["priorVal"] !== undefined) secondLine +=  (paddingString + objID).slice(-paddingString.length);
	}


	// For each curve to fit to, add the force-velocity column names
	for (var fitNum in fitNums){

		var ID = fitNums[fitNum];

		for (var obsNum = 0; obsNum < ABC_JS.ABC_FORCE_VELOCITIES["fits"][ID]["vals"].length; obsNum ++){


			secondLine += (paddingString + "Force" + (obsNum+1)).slice(-paddingString.length);
			secondLine += (paddingString + "Velocity" + (obsNum+1)).slice(-paddingString.length);
			/*
			var force = ABC_JS.ABC_FORCE_VELOCITIES[ID][obsNum]["force"];
			var velocity = ABC_JS.ABC_FORCE_VELOCITIES[ID][obsNum]["velocity"];
			*/

		}

		secondLine += (paddingString + "MeanRSS").slice(-paddingString.length);
		secondLine += (paddingString + "Passed").slice(-paddingString.length);
	}

	secondLine += (paddingString + "|Accepted|").slice(-12) + "&&&"; // Add the | to denote that this should be in coloured font


	// If running from the command line then print it to the console
	if (RUNNING_FROM_COMMAND_LINE){

		ABC_JS.savePosteriorToFiles_CommandLine(secondLine);

	}

	// Otherwise save it for later
	else{

		ABC_JS.ABC_outputString.push("", "", secondLine);
		ABC_JS.ABC_outputString_unrendered.push("", "", secondLine);
	}


}


// Add the current ABC state to the output to be displayed on the DOM
ABC_JS.update_ABCoutput_WW = function(fitNums){



	var paddingString = "&&&&&&&&&&&"; 

	// Add the trial number
	var trialNum = 	ABC_JS.ABC_FORCE_VELOCITIES["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
	var line = (paddingString + trialNum).slice(-9);


	// All the prior-sampled parameters
	for (var objID in ABC_JS.ABC_parameters_and_metrics_this_simulation){
		if (ABC_JS.ABC_parameters_and_metrics_this_simulation[objID] != null && ABC_JS.ABC_parameters_and_metrics_this_simulation[objID]["priorVal"] !== undefined){
			var val = WW_JS.roundToSF_WW(ABC_JS.ABC_parameters_and_metrics_this_simulation[objID]["priorVal"]);
			line += (paddingString + val).slice(-paddingString.length);
		}
	}


	var printVals = true; // When this is false, the curve was not executed because the RSS for a previous curve went too high, so leave some space but don't print any numbers
	

	// Get the force and velocity values
	for (var fitIndex = 0; fitIndex < fitNums.length; fitIndex++){

		var fitID = fitNums[fitIndex];
		

		// Iterate through each force-velocity observation in this curve
		for (var obsNum = 0; obsNum < ABC_JS.ABC_FORCE_VELOCITIES["fits"][fitID]["vals"].length; obsNum++){

			var force = printVals ? WW_JS.roundToSF_WW(ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["obsVals"][obsNum]) : "";
			var velocity = printVals ? WW_JS.roundToSF_WW(ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"][obsNum]) : "";

			if (isNaN(force) || isNaN(velocity)){
				printVals = false;
				force = "";
				velocity = "";
			}


			line += (paddingString + force).slice(-paddingString.length);
			line += (paddingString + velocity).slice(-paddingString.length);

		}

		// RSS
		var RSS = printVals ? WW_JS.roundToSF_WW(ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitID]) : "";
		line += (paddingString + RSS).slice(-paddingString.length);


		// Pass or fail
		var passed = printVals ? ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitID] : "";
		line += (paddingString + passed).slice(-paddingString.length);

		if (!passed) printVals = false;

	}

	// Accepted into posterior?
	line += (paddingString + "|" + ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"] + "|").slice(-12); // Add the | to denote that this should be in coloured font


	// If running from the command line then print it to the console
	if (RUNNING_FROM_COMMAND_LINE){

		// Only log if it was accepted into posterior
		if(ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"]) ABC_JS.savePosteriorToFiles_CommandLine(line);

	}

	// Otherwise save it for later
	else{

		ABC_JS.ABC_outputString.push(line);
		ABC_JS.ABC_outputString_unrendered.push(line);

	}


}



// Returns any new lines of the ABC output
ABC_JS.get_unrendered_ABCoutput_WW = function(resolve = function() {}, msgID= null){


	var toReturn = null;
	if (ABC_JS.ABC_outputString_unrendered.length > 0){
		var acceptanceNumber = ABC_JS.nAcceptedValues;
		var acceptancePercentage = 100 * ABC_JS.nAcceptedValues / (ABC_JS.ABC_FORCE_VELOCITIES["ntrials"] - ABC_JS.n_ABC_trials_left);
		toReturn = {newLines: ABC_JS.ABC_outputString_unrendered, nTrialsToGo: ABC_JS.n_ABC_trials_left, acceptanceNumber: acceptanceNumber, acceptancePercentage: acceptancePercentage};
	}
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


	ABC_JS.ABC_outputString_unrendered = [];


}


// Return the full ABC output. Each line is a string in the list
ABC_JS.get_ABCoutput_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};	
	if (msgID === undefined) msgID = null;

	var toReturn = {lines: ABC_JS.ABC_outputString};
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


}



// Returns the list of this type of value if it is in the posterior distribution
ABC_JS.getListOfValuesFromPosterior_WW = function(paramOrMetricID){


	if (paramOrMetricID == "probability") return null;

	var posteriorValues = [];
	for (var i = 0; i < ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length; i ++){
		
		// If no values sampled then move on to next value in posterior
		//if (ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID] == null || ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["vals"] == null) continue;

		// If there was only 1 number then use it (one time for each rule)


		// Iterate through all rules
		for (var j = 0; j < ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i]["nrules"]; j ++){

			if (ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["vals"] == null){

				posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["val"]);
				
			}else{

				posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["vals"][j]);

			}
		}



	}

	return posteriorValues;


}



// Create the posterior distribution text file (only if running from command line)
ABC_JS.initialiseSaveFiles_CommandLine = function(startingTime){



	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null) return;

	if (WW_JS.outputFolder[WW_JS.outputFolder.length-1] != "/") WW_JS.outputFolder += "/";

	// Create the output folder if it does not already exist
	var fs = require('fs');
	if (!fs.existsSync(WW_JS.outputFolder)){
		console.log("Creating directory", WW_JS.outputFolder);
	    fs.mkdirSync(WW_JS.outputFolder);
	}


	// Create the data files
	ABC_JS.posterior_fileName	= WW_JS.outputFolder + "posterior.tsv";

	WW_JS.writeLinesToFile(ABC_JS.posterior_fileName, "Posterior distribution. " + startingTime + "\n");


}




// Saves the most recently added posterior to its respective file
ABC_JS.savePosteriorToFiles_CommandLine = function(line){

	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null) return;



	var tabbedLine = "";
	var addedTab = false;
	for (var j = 0; j < line.length; j ++){

		if (line[j] == "|") continue; // Ignore pipes. They denote coloured font

		if (line[j] == "&" && !addedTab) { // Replace & with a tab (unless you have already replaced a touching & with a tab)
			tabbedLine += "\t";
			addedTab = true;
		}
		else if(line[j] != "&") {	// Add the normal character to the string
			tabbedLine += line[j];
			addedTab = false;
		}
	}


	WW_JS.writeLinesToFile(ABC_JS.posterior_fileName, tabbedLine + "\n", true);


}








if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		ABC_FORCE_VELOCITIES: ABC_JS.ABC_FORCE_VELOCITIES,
		ABC_POSTERIOR_DISTRIBUTION: ABC_JS.ABC_POSTERIOR_DISTRIBUTION,
		ABC_simulating: ABC_JS.ABC_simulating,
		ABC_parameters_and_metrics_this_simulation: ABC_JS.ABC_parameters_and_metrics_this_simulation,
		ABC_outputString: ABC_JS.ABC_outputString,
		ABC_outputString_unrendered: ABC_JS.ABC_outputString_unrendered,
		n_ABC_trials_left: ABC_JS.n_ABC_trials_left,
	  	beginABC_WW: ABC_JS.beginABC_WW,
	  	clearABCdata_WW: ABC_JS.clearABCdata_WW,
	  	ABC_trials_WW: ABC_JS.ABC_trials_WW,
	  	ABC_trial_for_curve_WW: ABC_JS.ABC_trial_for_curve_WW,
	  	ABC_trial_for_observation_WW: ABC_JS.ABC_trial_for_observation_WW,
	  	initialise_ABCoutput_WW: ABC_JS.initialise_ABCoutput_WW,
	  	update_ABCoutput_WW: ABC_JS.update_ABCoutput_WW,
	  	get_unrendered_ABCoutput_WW: ABC_JS.get_unrendered_ABCoutput_WW,
	  	get_ABCoutput_WW: ABC_JS.get_ABCoutput_WW,
	  	getListOfValuesFromPosterior_WW: ABC_JS.getListOfValuesFromPosterior_WW,
	  	initialiseSaveFiles_CommandLine: ABC_JS.initialiseSaveFiles_CommandLine,
	  	savePosteriorToFiles_CommandLine: ABC_JS.savePosteriorToFiles_CommandLine,
	  	nAcceptedValues: ABC_JS.nAcceptedValues,
	  	velocities_for_this_curve: ABC_JS.velocities_for_this_curve,
	  	ABC_K_trials_for_observation_WW: ABC_JS.ABC_K_trials_for_observation_WW
	}

}
