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

ABC_JS = {};

ABC_JS.ABC_EXPERIMENTAL_DATA = null;
ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];
ABC_JS.ABC_simulating = false;
ABC_JS.ABC_parameters_and_metrics_this_simulation = {};
ABC_JS.velocities_for_this_curve = [];
ABC_JS.ABC_outputString = [];
ABC_JS.ABC_outputString_unrendered = [];
ABC_JS.n_ABC_trials_left = null;
ABC_JS.nAcceptedValues = 0;





// Start running ABC with the rules parsed by the controller
ABC_JS.beginABC_WW = function(experimentalData, resolve = function() {}, msgID = null){



	if (!WW_JS.stopRunning_WW) {
		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}
		return;
	}

	//console.log("I have fits", experimentalData);


	ABC_JS.ABC_simulating = true;
	WW_JS.stopRunning_WW = false;
	ABC_JS.ABC_EXPERIMENTAL_DATA = experimentalData;
	ABC_JS.nAcceptedValues = 0;
	//ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];


	var fitNums = []; // Build a list of fit numbers
	for (var fitNum in ABC_JS.ABC_EXPERIMENTAL_DATA["fits"]) {
		fitNums.push(fitNum); 
	}
	fitNums.sort();



	// Initialise the list of parameters/metrics which will be added to the posterior distribution if accepted
	ABC_JS.ABC_parameters_and_metrics_this_simulation = {};
	if (experimentalData.inferenceMethod == "ABC"){
		for (var fitNum in fitNums) {
			ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitNums[fitNum]] = null;
			ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitNums[fitNum]] = null;
		}
		ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = null;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"] = null;
	}


	else if (experimentalData.inferenceMethod == "MCMC") {

		ABC_JS.ABC_parameters_and_metrics_this_simulation["logPrior"] = null;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["logLikelihood"] = null;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["logPosterior"] = null;

	}


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

	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"] = {name: PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["name"], vals: []}; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["NTPeq"] = {name: "NTP concentration divided by [NTP]eq", vals: []}; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"] = {name: "Mean velocity (bp/s)", vals: []};
	//if(RHS_params.indexOf("catalyTime") != -1) ABC_JS.ABC_parameters_and_metrics_this_simulation["catalyTime"] = {name: "Mean catalysis time (s)", vals: []};
	//if(RHS_params.indexOf("totalTime") != -1) ABC_JS.ABC_parameters_and_metrics_this_simulation["totalTime"] = {name: "Total transcription time (s)", vals: []};
	//if(RHS_params.indexOf("nascentLen") != -1) ABC_JS.ABC_parameters_and_metrics_this_simulation["nascentLen"] = {name: "Final nascent length (nt)", vals: []};


	ABC_JS.n_ABC_trials_left = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"];



	// Make sure that 4 NTPs are being used, not 1
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] = true;



	ABC_JS.initialise_ABCoutput_WW(fitNums);




	if (ANIMATION_TIME_TEMP == 0) SIM_JS.renderPlotsHidden(50); // Set up the DOM rendering loop, which will render plots, parameters, and ABC output every few seconds




	// Divert to the MCMC page if the MCMC option has been selected
	if (experimentalData.inferenceMethod == "MCMC"){
		MCMC_JS.beginMCMC(fitNums, resolve, msgID);
	}


	// Start the first ABC trial (not MCMC)
	else if (experimentalData.inferenceMethod == "ABC"){
		ABC_JS.ABC_trials_WW(fitNums, resolve, msgID);
	}



}



ABC_JS.clearABCdata_WW = function(){

	ABC_JS.ABC_EXPERIMENTAL_DATA = null;
	ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];
	ABC_JS.ABC_simulating = false;
	ABC_JS.ABC_parameters_and_metrics_this_simulation = {};
	ABC_JS.ABC_outputString = [];
	ABC_JS.ABC_outputString_unrendered = [];
	ABC_JS.n_ABC_trials_left = null;
	ABC_JS.nAcceptedValues = 0;

	MCMC_JS.clearMCMCdata_WW();


}


// Perform N ABC-trials
ABC_JS.ABC_trials_WW = function(fitNums, resolve = function() {}, msgID = null){


 	// Print out every 20th simulation when calling from command line
 	if (RUNNING_FROM_COMMAND_LINE && (ABC_JS.n_ABC_trials_left == 1 || ABC_JS.n_ABC_trials_left == ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] || (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1) % 100 == 0)){

 		var workerString = WW_JS.WORKER_ID == null ? "" : "Worker " + WW_JS.WORKER_ID + " | ";

 		var acceptanceNumber = ABC_JS.nAcceptedValues;
		var acceptancePercentage = WW_JS.roundToSF_WW(100 * ABC_JS.nAcceptedValues / (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left));
		if (isNaN(acceptancePercentage)) acceptancePercentage = 0;

 		console.log(workerString + "ABC", (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1) + "/" + ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"], "| Accepted:", acceptanceNumber, "| Acceptance rate:", acceptancePercentage + "%");
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
	ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
	for (var fitNum in fitNums) {
		ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitNums[fitNum]] = null;
		ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitNums[fitNum]] = null;
	}
	ABC_JS.ABC_parameters_and_metrics_this_simulation["accepted"] = null;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["vals"] = []; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["NTPeq"]["vals"] = []; 
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
		if (accepted) { // Do not cache if we are running from command line
			ABC_JS.nAcceptedValues ++;
			if (!RUNNING_FROM_COMMAND_LINE) {
				ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation)));


				// Generate a force-velocity curve for this sampled point
				//ABC_JS.generateForceVelocityCurve(ABC_JS.ABC_parameters_and_metrics_this_simulation);

			}
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


		// If regular ABC (not MCMC) then reject now if the RSS is too high
		if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "ABC"){


			// What force-velocity index are we upto
			var force_velocity_num = -1;
			for (var fitNumPrev = 0; fitNumPrev < currentFitNum; fitNumPrev++){
				force_velocity_num += ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitNums[fitNumPrev]]["vals"].length;
			}


			// Calculate the mean RSS
			var meanRSS = 0;
			var fitID = fitNums[currentFitNum];
			for (var observationNum = 0; observationNum < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].length; observationNum++){

				force_velocity_num++;
				var observedVelocity = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"][observationNum]["velocity"];
				var simulatedVelocity = ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"][force_velocity_num];
				var residualSquared =  Math.pow(observedVelocity - simulatedVelocity, 2);
				meanRSS += residualSquared / ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].length;

			}

			ABC_JS.ABC_parameters_and_metrics_this_simulation["meanRSS" + fitID] = meanRSS;
			ABC_JS.ABC_parameters_and_metrics_this_simulation["Passed" + fitID] = meanRSS < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["RSSthreshold"];
			accepted = accepted && meanRSS < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["RSSthreshold"];

		}


		ABC_JS.ABC_trial_for_curve_WW(currentFitNum + 1, accepted, fitNums, resolve);
	}


	// Run a single simulation with this force / [NTP]
	var toCall = () => new Promise((resolve) => ABC_JS.ABC_K_trials_for_observation_WW(fitNums[currentFitNum], 0, resolve));
	toCall().then((acc) => toDoAfterTrials(acc));


}






// Perform K simulations under the current force and/or [NTP]
ABC_JS.ABC_K_trials_for_observation_WW = function(fitID, observationNum, resolve = function() {}){


	//console.log("Starting observation", observationNum, "for curve", fitID, ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID][observationNum]);


	if (ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"][observationNum] == null || WW_JS.stopRunning_WW){
		resolve();
		return;
	}


	// Set the force / NTP to the required value
	switch(ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["dataType"]){ 

		case "forceVelocity":
			var force = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"][observationNum]["force"];
			PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] = force;
			PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["val"] = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["ATPconc"];
			PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["val"] = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["CTPconc"];
			PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["val"] = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["GTPconc"];
			PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["val"] = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["UTPconc"];
			ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["vals"].push(force);
			ABC_JS.ABC_parameters_and_metrics_this_simulation["NTPeq"]["vals"].push(null);
			break;


		case "ntpVelocity":
			
			var ntpDividedByNTPeq = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"][observationNum]["ntp"];
			PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["force"];
			PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["val"] = ntpDividedByNTPeq * ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["ATPconc"];
			PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["val"] = ntpDividedByNTPeq * ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["CTPconc"];
			PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["val"] = ntpDividedByNTPeq * ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["GTPconc"];
			PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["val"] = ntpDividedByNTPeq * ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["UTPconc"];
			ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["vals"].push(ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["force"]);
			ABC_JS.ABC_parameters_and_metrics_this_simulation["NTPeq"]["vals"].push(ntpDividedByNTPeq);
			break;

	}

	

	
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
	var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_observation_WW(ABC_JS.ABC_EXPERIMENTAL_DATA["testsPerData"], fitID, observationNum, resolve));
	toCall().then(() => toDoAfterTrial());


}






// Perform a single simulation under the current force and/or [NTP]
ABC_JS.ABC_trial_for_observation_WW = function(K, fitID, observationNum, resolve = function() {}){


	//console.log("Starting observation", observationNum, "for curve", fitID, ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID][observationNum]);

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


	// For each curve to fit to, add the ntp-velocity or force-velocity column names
	var forceNumber = 0;
	var concentrationNumber = 0;
	var passNumber = 0;
	for (var fitNum in fitNums){

		var ID = fitNums[fitNum];
		var dataType = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][ID]["dataType"];

		for (var obsNum = 0; obsNum < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][ID]["vals"].length; obsNum ++){

			switch(dataType){
				case "forceVelocity":
					forceNumber++;
					secondLine += (paddingString + "F" + (forceNumber)).slice(-paddingString.length);
					secondLine += (paddingString + "v(F" + (forceNumber) + ")").slice(-paddingString.length);
					break;

				case "ntpVelocity":
					concentrationNumber++;
					secondLine += (paddingString + "NTP" + (concentrationNumber)).slice(-paddingString.length);
					secondLine += (paddingString + "v(NTP" + (concentrationNumber) + ")").slice(-paddingString.length);
					break;				
			/*
			var force = ABC_JS.ABC_EXPERIMENTAL_DATA[ID][obsNum]["force"];
			var velocity = ABC_JS.ABC_EXPERIMENTAL_DATA[ID][obsNum]["velocity"];
			*/

			}

		}


		if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "ABC"){
			passNumber ++;
			secondLine += (paddingString + "MeanRSS" + passNumber).slice(-paddingString.length);
			secondLine += (paddingString + "Passed" + passNumber).slice(-paddingString.length);
		}


	}

	if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "ABC"){
		secondLine += (paddingString + "|Accepted|").slice(-12) + "&&&"; // Add the | to denote that this should be in coloured font
	}

	else if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "MCMC"){

		secondLine += (paddingString + "logPrior").slice(-paddingString.length);
		secondLine += (paddingString + "-RSS").slice(-paddingString.length);
		secondLine += (paddingString + "logPost").slice(-paddingString.length);

	}


	// If running from the command line and is the first worker then print the first line to the console
	if (RUNNING_FROM_COMMAND_LINE && (WW_JS.WORKER_ID == null || WW_JS.WORKER_ID == 1)){

		ABC_JS.savePosteriorToFiles_CommandLine(secondLine);

	}

	// Otherwise save it for later
	else{

		ABC_JS.ABC_outputString.push("");
		ABC_JS.ABC_outputString.push("");
		ABC_JS.ABC_outputString.push(secondLine);
		ABC_JS.ABC_outputString_unrendered.push("");
		ABC_JS.ABC_outputString_unrendered.push("");
		ABC_JS.ABC_outputString_unrendered.push(secondLine);
	}


}


// Add the current ABC state to the output to be displayed on the DOM
ABC_JS.update_ABCoutput_WW = function(fitNums){



	var paddingString = "&&&&&&&&&&&"; 

	// In ABC we log the current state, in MCMC we log the previous state
	var stateToLog = ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "MCMC" ? MCMC_JS.MCMC_parameters_and_metrics_previous_simulation : ABC_JS.ABC_parameters_and_metrics_this_simulation;


	// Add the trial number
	var workerNum = RUNNING_FROM_COMMAND_LINE && WW_JS.WORKER_ID != null ? WW_JS.WORKER_ID + ":" : "";// Print the worker number if multithreading from the command line
	var trialNum = 	ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"]; //ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
	var line = (paddingString + workerNum + trialNum).slice(-9);


	// All the prior-sampled parameters
	for (var objID in stateToLog){
		if (stateToLog[objID] != null && stateToLog[objID]["priorVal"] !== undefined){
			var val = WW_JS.roundToSF_WW(stateToLog[objID]["priorVal"], 4);
			line += (paddingString + val).slice(-paddingString.length);
		}
	}


	var printVals = true; // When this is false, the curve was not executed because the RSS for a previous curve went too high, so leave some space but don't print any numbers
	

	// Get the force and velocity values
	var experimentalSettingNumber = 0;
	var forceNumber = 0;
	var concentrationNumber = 0;
	for (var fitIndex = 0; fitIndex < fitNums.length; fitIndex++){

		var fitID = fitNums[fitIndex];

		var dataType = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["dataType"];


		// Iterate through each force-velocity observation in this curve
		for (var obsNum = 0; obsNum < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].length; obsNum++){

			var X_axis_value = "-";
			if (printVals && dataType == "forceVelocity") X_axis_value = WW_JS.roundToSF_WW(stateToLog["FAssist"]["vals"][forceNumber]);
			else if(printVals && dataType == "ntpVelocity") X_axis_value = WW_JS.roundToSF_WW(stateToLog["NTPeq"]["vals"][concentrationNumber]);

			var velocity = printVals ? WW_JS.roundToSF_WW(stateToLog["velocity"]["vals"][experimentalSettingNumber], 3) : "-";


			if (isNaN(X_axis_value) || isNaN(velocity)){
				printVals = false;
				X_axis_value = "-";
				velocity = "-";
			}


			line += (paddingString + X_axis_value).slice(-paddingString.length);
			line += (paddingString + velocity).slice(-paddingString.length);

			if (dataType == "forceVelocity") forceNumber ++;
			if (dataType == "ntpVelocity") concentrationNumber ++;
			experimentalSettingNumber++;

		}

		if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "ABC"){

			// RSS
			var RSS = printVals ? WW_JS.roundToSF_WW(stateToLog["meanRSS" + fitID], 3) : "-";
			line += (paddingString + RSS).slice(-paddingString.length);


			// Pass or fail
			var passed = printVals ? stateToLog["Passed" + fitID] : "-";
			line += (paddingString + passed).slice(-paddingString.length);
		}



		if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "ABC" && !passed) printVals = false;

	}


	// Accepted into posterior?
	if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "ABC"){
		line += (paddingString + "|" + stateToLog["accepted"] + "|").slice(-12); // Add the | to denote that this should be in coloured font
	}

	else if (ABC_JS.ABC_EXPERIMENTAL_DATA.inferenceMethod == "MCMC"){

		// Likelihood, prior and posterior
		var prior = printVals ? WW_JS.roundToSF_WW(stateToLog["logPrior"], 3) : "-";
		line += (paddingString + prior).slice(-paddingString.length);
		var likelihood = printVals ? WW_JS.roundToSF_WW(stateToLog["logLikelihood"], 3) : "-";
		line += (paddingString + likelihood).slice(-paddingString.length);
		var posterior = printVals ? WW_JS.roundToSF_WW(stateToLog["logPosterior"], 3) : "-";
		line += (paddingString + posterior).slice(-paddingString.length);


	} 

	// If running from the command line then print it to the console
	if (RUNNING_FROM_COMMAND_LINE){

		// Only log if it was accepted into posterior or if running MCMC
		if(XML_JS.showRejectedParameters || stateToLog["accepted"] || ABC_JS.ABC_EXPERIMENTAL_DATA["inferenceMethod"] == "MCMC") ABC_JS.savePosteriorToFiles_CommandLine(line);

	}

	// Otherwise save it for later
	else{

		ABC_JS.ABC_outputString.push(line);
		ABC_JS.ABC_outputString_unrendered.push(line);

	}


}



// Returns any new lines of the ABC output
ABC_JS.get_unrendered_ABCoutput_WW = function(resolve = function() {}, msgID = null){



	var toReturn = {nTrialsToGo: ABC_JS.n_ABC_trials_left};
	if (ABC_JS.ABC_outputString_unrendered.length > 0){
		var acceptanceNumber = ABC_JS.nAcceptedValues;
		var acceptancePercentage = ABC_JS.ABC_EXPERIMENTAL_DATA == null ? null : (100 * ABC_JS.nAcceptedValues / (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left));
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




	if (paramOrMetricID == "probability" || paramOrMetricID ==  "catalyTime" || paramOrMetricID ==  "none" || paramOrMetricID ==  "totalTime" || paramOrMetricID ==  "nascentLen") return null;


	var posteriorValues = [];
	for (var i = 0; i < ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length; i ++){


		// The length of the list returned should be the same number of forces sampled in this entry
		var nVals = ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i]["FAssist"]["vals"].length + ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i]["NTPeq"]["vals"].length;

		if (paramOrMetricID == "FAssist") for (var j = 0; j < nVals; j ++) posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i]["FAssist"]["vals"][j]);
		if (paramOrMetricID == "NTPeq") for (var j = 0; j < nVals; j ++) posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i]["NTPeq"]["vals"][j]);
		else if (paramOrMetricID == "velocity") for (var j = 0; j < nVals; j ++) posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i]["velocity"]["vals"][j]);

		else{

			for (var j = 0; j < nVals; j ++){

				if (ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["val"] != null) posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["val"]);

				else if (ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["priorVal"] != null) posteriorValues.push(ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][paramOrMetricID]["priorVal"]);

			}

		}


	}

	console.log("Returning posterior", ABC_JS.ABC_POSTERIOR_DISTRIBUTION, "for", paramOrMetricID);
	return posteriorValues;


}


ABC_JS.initialiseFileNames_CommandLine = function(){

	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null) return;

	// Set the posterior file name
	ABC_JS.posterior_fileName	= WW_JS.outputFolder + "posterior.tsv";

}


// Create the posterior distribution text file (only if running from command line)
ABC_JS.initialiseSaveFiles_CommandLine = function(startingTime){



	if (!RUNNING_FROM_COMMAND_LINE || WW_JS.outputFolder == null) return;


	// Create the output folder if it does not already exist
	var fs = require('fs');
	if (!fs.existsSync(WW_JS.outputFolder)){
		console.log("Creating directory", WW_JS.outputFolder);
	    fs.mkdirSync(WW_JS.outputFolder);
	}


	// Create the data files
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




ABC_JS.getPosteriorDistribution_WW = function(resolve = function() { }, msgID = null){



	var toReturn = {posterior: ABC_JS.ABC_POSTERIOR_DISTRIBUTION};
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}

}




ABC_JS.uploadABC_WW = function(TSVstring, resolve = function() { }, msgID = null){



	var lines = TSVstring.split("|");
	var success = true;

	//console.log("lines", lines[0], lines[0].includes("Posterior distribution."));
	//ABC_JS.ABC_POSTERIOR_DISTRIBUTION = [];



	// Generate the console log string (which is the same string except that we use padding spaces instead of tabs)
	var paddingString = "&&&&&&&&&&&"; 
	var firstConsoleLine = "";


	// Check that this is indeed a posterior file
	if (lines[0].includes("Posterior distribution.")){


		// Build the first row
		var colNames = lines[1].split("\t");
		var posteriorObjectEmptyTemplate = {trial: null, accepted: null}; // The template for a single row in the posterior or rejected distribution
		posteriorObjectEmptyTemplate["FAssist"] = {name: PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["name"], vals: []}; 
		posteriorObjectEmptyTemplate["NTPeq"] = {name: "NTP concentration divided by [NTP]eq", vals: []}; 
		posteriorObjectEmptyTemplate["velocity"] = {name: "Mean velocity (bp/s)", vals: []};


		var nfits = 0; // Total number of graphs which have been fit to
		var columnNumTSV_to_columnNameObj = {};
		var fitNums = []; // Build a list of fit numbers
		var acceptedCol = -1;
		for (var colNum = 1; colNum <= colNames.length; colNum++){


			var col = colNames[colNum-1];

			if (col.trim() == "") continue;


			if (col.includes("Accepted")) {
				firstConsoleLine += (paddingString + "|Accepted|").slice(-12) + "&&&";
				columnNumTSV_to_columnNameObj[colNum] = "accepted";
				acceptedCol = colNum;
				continue;
			}


			if (col.includes("Trial")) {
				firstConsoleLine += (paddingString + col).slice(-9);
				columnNumTSV_to_columnNameObj[colNum] = "trial";
				continue;
			}


			// Parse force and velocity values
			firstConsoleLine += (paddingString + col).slice(-paddingString.length);
			if (col.match(/F[0-9]*$/gi) != null) columnNumTSV_to_columnNameObj[colNum] = "FAssist"; // Matches to force (F1, F2, etc)
			if (col.match(/NTP[0-9]*$/gi) != null) columnNumTSV_to_columnNameObj[colNum] = "NTPeq"; // Matches to NTP (NTP1, NTP2, etc)
			if (col.match(/v\(F[0-9]*\)$/gi) != null || col.match(/v\(NTP[0-9]*\)$/gi) != null) columnNumTSV_to_columnNameObj[colNum] = "velocity";	// Matches to velocity ( v(F1), v(F2), etc ) or ( v(NTP1), v(NTP2), etc )


			// Increment the number of graphs being fitted to
			if (col.includes("MeanRSS")){
				nfits ++;
				posteriorObjectEmptyTemplate["meanRSS" + nfits] = null;
				posteriorObjectEmptyTemplate["Passed" + nfits] = null;
				columnNumTSV_to_columnNameObj[colNum] = "meanRSS" + nfits;
				columnNumTSV_to_columnNameObj[colNum+1] = "Passed" + nfits;
				fitNums.push("fit" + nfits);

			}

			else if (PARAMS_JS.PHYSICAL_PARAMETERS[col] != null){
				columnNumTSV_to_columnNameObj[colNum] = col;
				posteriorObjectEmptyTemplate[col] = {name: PARAMS_JS.PHYSICAL_PARAMETERS[col]["name"], priorVal: false};
			}


		}

		// Add this line to the console output
		ABC_JS.ABC_outputString.push("");
		ABC_JS.ABC_outputString.push("");
		ABC_JS.ABC_outputString.push(firstConsoleLine);
		ABC_JS.ABC_outputString_unrendered.push("");
		ABC_JS.ABC_outputString_unrendered.push("");
		ABC_JS.ABC_outputString_unrendered.push(firstConsoleLine);



		// Populate the remaining rows with numbers
		for (var lineNum = 2; lineNum < lines.length; lineNum++){

			if (lines[lineNum].trim() == "") continue;

			var rowTemplateCopy = JSON.parse(JSON.stringify(posteriorObjectEmptyTemplate));

			var splitLine = lines[lineNum].split("\t");




			var consoleLine = "";


			for (var colNum = 2; colNum <= splitLine.length; colNum++){

				
				var colName = columnNumTSV_to_columnNameObj[colNum];
				if (colName == null) continue;

				var value = splitLine[colNum-1];


				if (value.match(/[0-9]\:[0-9]/gi)) value = value; // Don't parse as float if it contains a : (which the trial numbers do if it was multithreaded)
				else if (!isNaN(parseFloat(value))) value = parseFloat(value);
				else if (value == "true") value = true;
				else if (value == "false") value = false;


				if (colNames[colNum-1] == "Accepted") consoleLine += (paddingString + "|" + value + "|").slice(-12) + "&&&";
				else if (colNames[colNum-1] == "Trial") consoleLine += (paddingString + value).slice(-9);
				else consoleLine += (paddingString + value).slice(-paddingString.length);


				if (value == "-") continue;

				// Add the value to the list or set it as the value 
				if (rowTemplateCopy[colName] == null) rowTemplateCopy[colName] = value;
				else if (rowTemplateCopy[colName]["vals"] != null) rowTemplateCopy[colName]["vals"].push(value);
				else if (rowTemplateCopy[colName]["val"] != null) rowTemplateCopy[colName]["val"] = value;
				else if (rowTemplateCopy[colName]["priorVal"] != null) rowTemplateCopy[colName]["priorVal"] = value;


				//console.log(colNum, colNames[colNum-1], value);



			}

			// Add to the posterior distribution if applicable
			if (rowTemplateCopy["accepted"]) ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(rowTemplateCopy);


			//console.log("Created rowTemplateCopy", rowTemplateCopy);

			// Add to the list of lines to print
			ABC_JS.ABC_outputString.push(consoleLine);
			ABC_JS.ABC_outputString_unrendered.push(consoleLine);


		}

		//console.log("Created objects", ABC_JS.ABC_POSTERIOR_DISTRIBUTION);


	}

	else success = false;


	var toReturn = {success: success};

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}

}




if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		ABC_EXPERIMENTAL_DATA: ABC_JS.ABC_EXPERIMENTAL_DATA,
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
	  	ABC_K_trials_for_observation_WW: ABC_JS.ABC_K_trials_for_observation_WW,
	  	getPosteriorDistribution_WW: ABC_JS.getPosteriorDistribution_WW,
	  	initialiseFileNames_CommandLine: ABC_JS.initialiseFileNames_CommandLine 
	}

}
