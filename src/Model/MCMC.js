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



MCMC_JS = {};
MCMC_JS.parametersWithPriors = [];
MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = {};
MCMC_JS.MCMC_SIMULATING = false;
MCMC_JS.currentchiSqthreshold = 0;
MCMC_JS.chiSq_this_trial = 0;
MCMC_JS.cached_effective_sample_sizes = {};



MCMC_JS.beginMCMC = function(fitNums, resolve = function() {}, msgID = null){


	
	var exitMCMC = function(){

		ABC_JS.ABC_simulating = false;
		MCMC_JS.MCMC_SIMULATING = false;
		WW_JS.stopRunning_WW = true;


		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}

	}



	// Sample parameters from their priors and log this initial state
	if (WW_JS.ABCinputFolder == null) PARAMS_JS.sample_parameters_WW();
	MCMC_JS.MCMC_SIMULATING = true;



	// Sample the model (if performing model search)
	if (XML_MODELS_JS.SAMPLING_MODELS) {
		XML_MODELS_JS.sampleNewModel();
	}




	// Build a list of parameters which have prior distributions
	MCMC_JS.parametersWithPriors = [];
	for (var paramID in ABC_JS.ABC_parameters_and_metrics_this_simulation){
		if (ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID] != null && ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] !== undefined) {
			ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"];
			MCMC_JS.parametersWithPriors.push(paramID);
		}
	}

	//console.log("MCMC_JS.parametersWithPriors", MCMC_JS.parametersWithPriors);




	if (MCMC_JS.parametersWithPriors.length == 0 && XML_MODELS_JS.XML_MODELS == 0){
		exitMCMC();
		return;
	}




	var toDoAfterFirstSimulation = function(){


		if (WW_JS.stopRunning_WW){
			exitMCMC();
			return;
		}



		ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_min = parseFloat(ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_min);
		ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_gamma = parseFloat(ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_gamma);
		ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_0 = parseFloat(ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_0);


		// Resume MCMC from previously saved file
		if (WW_JS.ABCinputFolder != null){


			for (var propertyID in MCMC_JS.MCMC_parameters_and_metrics_from_input_file){
				ABC_JS.ABC_parameters_and_metrics_this_simulation[propertyID] = MCMC_JS.MCMC_parameters_and_metrics_from_input_file[propertyID];
			}


			// Add to the posterior
			MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation));
			ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation)));


			// Set the chiSq threshold to the current value
			MCMC_JS.currentchiSqthreshold = ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_0 * Math.pow(ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_gamma, ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"]);
			MCMC_JS.currentchiSqthreshold = Math.max(MCMC_JS.currentchiSqthreshold, ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_min);
			//console.log("chiSq threshold", MCMC_JS.currentchiSqthreshold, ABC_JS.ABC_parameters_and_metrics_this_simulation);

		}

		else{


			var logPrior = MCMC_JS.getLogPrior();
			var logLikelihood = -MCMC_JS.chiSq_this_trial;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logPrior = logPrior;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logLikelihood = logLikelihood;

			// Copy this current state and save it as the previous state
			MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation));


			// Log the initial state and add it to the posterior
			ABC_JS.update_ABCoutput_WW(fitNums);
			ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation)));
			

			// Set the chiSq threshold to the initial value
			MCMC_JS.currentchiSqthreshold = ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_0;

		}



		
		// Perform MCMC over N trials
		var toCall = () => new Promise((resolve) => MCMC_JS.performMCMCtrial(fitNums, resolve));
		toCall().then(() => exitMCMC());


	}



	ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = 0;
	MCMC_JS.chiSq_this_trial = 0;

	
	// Set the threshold to infinity so that the first simulation does not abort early
	MCMC_JS.currentchiSqthreshold = Number.POSITIVE_INFINITY;


	// Evaluate the likelihood of the initial state
	if (WW_JS.ABCinputFolder != null) toDoAfterFirstSimulation();
	else {
		var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_curve_WW(0, true, fitNums, resolve));
		toCall().then(() => toDoAfterFirstSimulation());
	}



}


MCMC_JS.clearMCMCdata_WW = function(){

	MCMC_JS.parametersWithPriors = [];
	MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = {};

}



MCMC_JS.performMCMCtrial = function(fitNums, resolve){

	//console.log("Performing MCMC trial", ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1);

	if (ABC_JS.n_ABC_trials_left == 0 || WW_JS.stopRunning_WW){
		console.log("Stopping MCMC");
		resolve();
		return;
	}


	// Print out every 100th simulation when calling from command line
 	if (RUNNING_FROM_COMMAND_LINE && (ABC_JS.n_ABC_trials_left == 1 || ABC_JS.n_ABC_trials_left == ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] || (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1) % 100 == 0)){

 		var workerString = WW_JS.WORKER_ID == null ? "" : "Worker " + WW_JS.WORKER_ID + " | ";
 		var acceptanceNumber = ABC_JS.nAcceptedValues;
		var acceptancePercentage = WW_JS.roundToSF_WW(100 * ABC_JS.nAcceptedValues / (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left));
		var ESS = WW_JS.roundToSF_WW(MCMC_JS.calculateESS());
		if (isNaN(acceptancePercentage)) acceptancePercentage = 0;
 		console.log(workerString + "MCMC", (ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1) + "/" + ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"], "| ESS:", ESS, "| chiSq:", MCMC_JS.currentchiSqthreshold ,"| Acceptance rate:", acceptancePercentage + "%");
 	}


	var toDoAfterTrial = function(){


		if (!WW_JS.stopRunning_WW){

			// Calculate the log prior / likelihood of this state
			var logLikelihood = -MCMC_JS.chiSq_this_trial;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logPrior = logPrior;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logLikelihood = logLikelihood;



			// Accept or reject the current state using Metropolis-Hastings formula. Accept the new state with probability min(1, alpha)
			var alpha = -logLikelihood > MCMC_JS.currentchiSqthreshold ? 0 : Math.exp(logPrior - MCMC_JS.MCMC_parameters_and_metrics_previous_simulation.logPrior);


			// Accept
			if (alpha >= 1 || RAND_JS.uniform(0, 1) < alpha){

				
				//console.log("accept", -logLikelihood, alpha, logPrior);

				MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation));
				//MCMC_JS.MCMC_parameters_and_metrics_previous_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
				ABC_JS.nAcceptedValues++;


				if (XML_MODELS_JS.SAMPLING_MODELS) {
					XML_MODELS_JS.previousModel = XML_MODELS_JS.currentModel;
				}


			}else{
				

				//console.log("reject", -logLikelihood, alpha, logPrior);


				MCMC_JS.MCMC_parameters_and_metrics_previous_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left;
				ABC_JS.ABC_parameters_and_metrics_this_simulation = JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation));
				//ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
				//console.log("Rejected with alpha=", alpha);


				for (var paramID in ABC_JS.ABC_parameters_and_metrics_this_simulation){
					if (ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"];
				}


				// Go back to the previous model
				if (XML_MODELS_JS.SAMPLING_MODELS) {
					XML_MODELS_JS.currentModel = XML_MODELS_JS.previousModel;
					XML_MODELS_JS.decache();
					XML_MODELS_JS.cacheGlobals();
					XML_MODELS_JS.setGlobalsToCurrentModel();

					ABC_JS.ABC_parameters_and_metrics_this_simulation.model = {name: "Model", val: XML_MODELS_JS.currentModel.name};
				}


			}


			//console.log("Completed trial, DGpost_obs =", MCMC_JS.MCMC_parameters_and_metrics_previous_simulation["DGPost"].priorVal, "| DGpost_actual =", PARAMS_JS.PHYSICAL_PARAMETERS["DGPost"].val);
			//console.log("Completed trial, barrierPos_obs =", MCMC_JS.MCMC_parameters_and_metrics_previous_simulation["barrierPos"].priorVal, "| barrierPos_actual =", PARAMS_JS.PHYSICAL_PARAMETERS["barrierPos"].val, "\n\n");



			// Log the current state if appropriate
			if (ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] % ABC_JS.ABC_EXPERIMENTAL_DATA.logEvery == 0) {
				ABC_JS.update_ABCoutput_WW(fitNums);


				//if (!RUNNING_FROM_COMMAND_LINE) {
					ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation)));
				//}

			}

			
			// Lower the chiSq threshold by multiplying it by gamma
			if (MCMC_JS.currentchiSqthreshold > ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_min){
				MCMC_JS.currentchiSqthreshold = Math.max(ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_min, MCMC_JS.currentchiSqthreshold * ABC_JS.ABC_EXPERIMENTAL_DATA.chiSqthreshold_gamma);
			}
			


		}
		
		MCMC_JS.performMCMCtrial(fitNums, resolve);


	}


	// Modify the parameters using the proposal function
	MCMC_JS.makeProposal();
	MCMC_JS.chiSq_this_trial = 0;


	// Reset the state
	ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["vals"] = []; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["NTPeq"]["vals"] = []; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"] = [];
	ABC_JS.ABC_parameters_and_metrics_this_simulation["logPrior"] = null;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["logLikelihood"] = null;
	ABC_JS.n_ABC_trials_left--;


	
	// Simulate data for the entire set of experimental data. Do not stop early even if the fit is bad (less efficient than regular ABC in this sense)
	// But do not simulate if the prior probability is negative infinity
	var logPrior = MCMC_JS.getLogPrior();
	if (logPrior == Number.NEGATIVE_INFINITY) {
		setTimeout(function(){
			toDoAfterTrial();
		}, 0);
	}
	else {
		var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_curve_WW(0, true, fitNums, resolve));
		toCall().then(() => toDoAfterTrial());
	}


}




MCMC_JS.getLogPrior = function(){




	var logPriorProbability = 0;
	for (var i = 0; i < MCMC_JS.parametersWithPriors.length; i ++){
		var paramID = MCMC_JS.parametersWithPriors[i];
		var val = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].val;
		
		//console.log(paramID, val);

		switch (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"]){

			case "Uniform":
				var lower = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].uniformDistnLowerVal;
				var upper = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].uniformDistnUpperVal;
				if (val < lower || val > upper) logPriorProbability = Number.NEGATIVE_INFINITY;
				else logPriorProbability += Math.log( 1 / (upper - lower) );
				break;


			case "Normal":
				var mu = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].normalMeanVal;
				var sd = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].normalSdVal;
				logPriorProbability += Math.log( 1 / (Math.sqrt(2 * Math.PI * sd * sd)) * Math.exp(-(val-mu) * (val-mu) / (2 * sd * sd)) );
				break;


			case "Lognormal":
				var mu = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].lognormalMeanVal;
				var sd = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].lognormalSdVal;
				if (val <= 0) logPriorProbability = Number.NEGATIVE_INFINITY;
				else logPriorProbability += Math.log(1 / (val * sd * Math.sqrt(2 * Math.PI)) * Math.exp(-(Math.log(val)-mu) * (Math.log(val)-mu) / (2 * sd * sd)));
				break;


			case "Exponential":
				var rate = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].ExponentialDistnVal;
				if (val <= 0) logPriorProbability = Number.NEGATIVE_INFINITY;
				else logPriorProbability += rate * Math.exp(-rate * val);
				break;


			// TODO: gamma, poisson

		}


		if (  (PARAMS_JS.PHYSICAL_PARAMETERS[paramID].zeroTruncated == "exclusive" && val <  0) &&
			  (PARAMS_JS.PHYSICAL_PARAMETERS[paramID].zeroTruncated == "inclusive" && val <= 0)) logPriorProbability = Number.NEGATIVE_INFINITY;

	}

	// Temporary hardcodings: set limits for some parameters
	if (PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"].val < 6) logPriorProbability = Number.NEGATIVE_INFINITY;
	if (PARAMS_JS.PHYSICAL_PARAMETERS["RateBind"].val > 1000) logPriorProbability = Number.NEGATIVE_INFINITY;
	if (PARAMS_JS.PHYSICAL_PARAMETERS["barrierPos"].val > 3.4) logPriorProbability = Number.NEGATIVE_INFINITY;


	//console.log("GDagSlide", PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"].val, "RateBind", PARAMS_JS.PHYSICAL_PARAMETERS["RateBind"].val);

	//console.log("\n\nCalculating prior for", MCMC_JS.parametersWithPriors, logPriorProbability);

	return logPriorProbability;

}




MCMC_JS.getLogLikelihood = function(fitNums){


	var force_velocity_num = -1
	var chiSq = 0;
	for (var fitNum = 0; fitNum < fitNums.length; fitNum++){

		var fitID = fitNums[fitNum];
		for (var observationNum = 0; observationNum < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].length; observationNum++){

			force_velocity_num++;
			var observedVelocity = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"][observationNum]["velocity"];
			var simulatedVelocity = ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"][force_velocity_num];
			var residualSquared =  Math.pow(observedVelocity - simulatedVelocity, 2);
			chiSq += residualSquared;

		}

	}

	return -chiSq; // -chiSq is our approximation of the log-likelihood

}





// Select new parameters based off the current parameters. Will mutate the current parameters
MCMC_JS.makeProposal = function(){


	// Uniformly at random select a parameter to change
	var numParams = XML_MODELS_JS.SAMPLING_MODELS ? MCMC_JS.parametersWithPriors.length + 1 : MCMC_JS.parametersWithPriors.length;
	var randNum = Math.floor(MER_JS.random() * numParams);


	// If randNum is equal to numParams-1 then this corresponds to changing the model
	if (XML_MODELS_JS.SAMPLING_MODELS && randNum == numParams-1){
		XML_MODELS_JS.sampleNewModel();
		//numParams = MCMC_JS.parametersWithPriors.length; // Change a parameter as well as the model
		//randNum = Math.floor(MER_JS.random() * numParams);
		return;
	}


	// Generate a heavy tailed distribution random variable.
	// Using the algorithm in section 8.3 of https://arxiv.org/pdf/1606.03757.pdf
	var paramIDToChange = MCMC_JS.parametersWithPriors[randNum];
	var a = RAND_JS.normal(0, 1);
	var b = RAND_JS.uniform(0, 1);
	var t = a / Math.sqrt(-Math.log(b));
	var n = RAND_JS.normal(0, 1);
	var x = Math.pow(10, 1.5 - 3*Math.abs(t)) * n;

	//console.log("Changing parameter", paramIDToChange, "out of", MCMC_JS.parametersWithPriors);


	// Restore the model-free parameters from the cached values. This is so that if eg. the current model has set this parameter to 0, then
	// we should apply the proposal to the 'true' current value and not 0 
	if (XML_MODELS_JS.SAMPLING_MODELS) XML_MODELS_JS.decache();

	var currentVal = PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["val"];
	var newVal = ABC_JS.ABC_parameters_and_metrics_this_simulation[paramIDToChange]["priorVal"];


	switch (PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["distribution"]){


		case "Uniform":

			// Wrap the value so that it bounces back into the right range
			var stepSize = PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnUpperVal - PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnLowerVal;
			newVal = currentVal + x * stepSize;
			newVal = MCMC_JS.wrapProposal(newVal, PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnLowerVal, PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnUpperVal);
			break;


		case "Normal":

			// Use the standard deviation as the step size
			var stepSize = PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].normalSdVal;
			newVal = currentVal + x * stepSize;
			break;


		case "Lognormal":

			// Use the standard deviation of the normal as the step size, and perform the step in normal space then transform back into a lognormal
			var stepSize = PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].lognormalSdVal;
			newVal = Math.log(Math.exp(currentVal) + x * stepSize);
			break;


		// TODO: exponential, gamma, poisson


	}


	//console.log("changing", paramIDToChange, "from", WW_JS.roundToSF_WW(PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["val"], 5), "to", WW_JS.roundToSF_WW(newVal, 5), "x = ", x);

	//console.log("randh", x);



	if (XML_MODELS_JS.SAMPLING_MODELS){

		// Change the parameters as specified by the proposal
		PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["val"] = newVal;

		// Cache the new state
		XML_MODELS_JS.cacheGlobals();

		// Restore to the state specified by the current model
		XML_MODELS_JS.setGlobalsToCurrentModel();

	} 


	else PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["val"] = newVal;


	ABC_JS.ABC_parameters_and_metrics_this_simulation[paramIDToChange]["priorVal"] = newVal;
	

}


// Bounce the sampled value back and forth so that it lies within the (lower, upper) range
// eg. if lower = 10 and val = 9.8, then return 10.2
MCMC_JS.wrapProposal = function(val, lower, upper){


	if (val > lower && val < upper) return val;

	if (val < lower) val = MCMC_JS.wrapProposal(lower + (lower - val), lower, upper);
	else if (val > upper) val = MCMC_JS.wrapProposal(upper - (val - upper), lower, upper);

	return val;


}




MCMC_JS.cache_effective_sample_sizes = function(){

	MCMC_JS.cached_effective_sample_sizes = {};

	for (var colID in ABC_JS.ABC_POSTERIOR_DISTRIBUTION[0]){

		if (colID == "NTPeq" || colID == "FAssist" || colID == "trial" || colID == "velocity" || colID == "accepted") continue;
		MCMC_JS.cached_effective_sample_sizes[colID] = 0;// MCMC_JS.calculateESS(colID);
	}



}



// Calculate the effective sample size
MCMC_JS.calculateESS = function(toTrace = "logLikelihood", workerNum = null){

/*
	console.log("burnin", ABC_JS.ABC_EXPERIMENTAL_DATA.burnin);
	
	var trialStart = Math.floor(ABC_JS.ABC_EXPERIMENTAL_DATA.burnin/100 * ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length);
	var n = ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length - trialStart;
	
	// Calculate the mean and variance of the chiSq
	var meanchiSq = 0;
	var varchiSq = 0;
	for (var trialNum = trialStart; trialNum < ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length; trialNum++) meanchiSq += -ABC_JS.ABC_POSTERIOR_DISTRIBUTION[trialNum].logLikelihood;
	meanchiSq /= ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length;
	for (var trialNum = trialStart; trialNum < ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length; trialNum++) varchiSq += Math.pow(-ABC_JS.ABC_POSTERIOR_DISTRIBUTION[trialNum].logLikelihood - meanchiSq, 2);
	varchiSq /= ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length;
	
	
	//console.log(meanchiSq, varchiSq, trialStart, ABC_JS.ABC_POSTERIOR_DISTRIBUTION);
	
	// Calculate the autocorrelation at each lag value
	var rhoSum = 0;
	for (var lag = 1; lag <= n-1; lag++){
	
		var rho_k = 0;
		for (var trialNum = trialStart; trialNum < ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length-lag; trialNum++){
			
			var chiSq_t = -ABC_JS.ABC_POSTERIOR_DISTRIBUTION[trialNum].logLikelihood;
			var chiSq_t_plus_lag = -ABC_JS.ABC_POSTERIOR_DISTRIBUTION[trialNum + lag].logLikelihood;
			
			if (chiSq_t_plus_lag == null) break;
			
			rho_k += (chiSq_t - meanchiSq) * (chiSq_t_plus_lag - meanchiSq); 

		}
		

		rho_k /= (n - lag) * varchiSq
		//rho_k = Math.abs(rho_k);
		rhoSum += rho_k;
	
	}
	
	//console.log(rhoSum);
	var ESS = n / (1 + 2*rhoSum);
	return ESS;
	*/



	// Code adapted from beast2/tracer
	var MAX_LAG = 2000;
	var sum = 0;
	var squareLaggedSums = Array.apply(null, Array(MAX_LAG)).map(Number.prototype.valueOf,0);
	var autoCorrelation = Array.apply(null, Array(MAX_LAG)).map(Number.prototype.valueOf,0);
	var trialStart = Math.floor(ABC_JS.ABC_EXPERIMENTAL_DATA.burnin/100 * ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length);
	var n = ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length - trialStart;
	if (isNaN(n) || n < 0) n = 0;



	// Create a list of values to calculate ESS over
	var trace = Array.apply(null, Array(n)).map(Number.prototype.valueOf,0);
	for (var i = trialStart; i < ABC_JS.ABC_POSTERIOR_DISTRIBUTION.length; i++) {
		trace[i] =  ABC_JS.ABC_POSTERIOR_DISTRIBUTION[i][toTrace];
	}


	// Keep track of sums of trace(i)*trace(i_+ lag) for all lags, excluding burn-in
	for (var i = 0; i < trace.length; i++) {

		// Calculate sum
		sum += trace[i];

		// Calculate the sum of the square of the values at each lag
		for (var lagIndex = 0; lagIndex < Math.min(i + 1, MAX_LAG); lagIndex++) {
			squareLaggedSums[lagIndex] = squareLaggedSums[lagIndex] + trace[i - lagIndex] * trace[i];
		}
	}


	// Calculate the auto correlation
	var i = trace.length-1;
	var mean = sum / (i+1);
	var sum1 = sum;
	var sum2 = sum;

	for (var lagIndex = 0; lagIndex < Math.min(i + 1, MAX_LAG); lagIndex++) {
		autoCorrelation[lagIndex] = squareLaggedSums[lagIndex] - (sum1 + sum2) * mean + mean * mean * (i + 1 - lagIndex);
        autoCorrelation[lagIndex] /= (i + 1 - lagIndex);
        sum1 -= trace[i - lagIndex];
        sum2 -= trace[lagIndex];
	}


	// Calculate 
	var maxLag = Math.min(n, MAX_LAG);
	var integralOfACFunctionTimes2 = 0;
 	for (var lagIndex = 0; lagIndex < maxLag; lagIndex++) {

 		if (lagIndex == 0) integralOfACFunctionTimes2 = autoCorrelation[0];
 		else if (lagIndex % 2 == 0) {

 			 if (autoCorrelation[lagIndex - 1] + autoCorrelation[lagIndex] > 0) integralOfACFunctionTimes2 += 2.0 * (autoCorrelation[lagIndex - 1] + autoCorrelation[lagIndex]);
             else break;
 		}
	}


	// Auto correlation time
	var ACT = 1 * integralOfACFunctionTimes2 / autoCorrelation[0];
	var ESS = n / ACT;


	//console.log("Calculated ESS for", toTrace, ESS);
	return ESS;


}


MCMC_JS.get_ParametersWithPriors_WW = function(resolve = function() { }, msgID = null){
	
	
	var paramsWithPriorsFull = {};
	for (var i = 0; i < MCMC_JS.parametersWithPriors.length; i ++){
		var paramID = MCMC_JS.parametersWithPriors[i];
		paramsWithPriorsFull[paramID] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID];
	}
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(paramsWithPriorsFull));
	}
	else resolve(paramsWithPriorsFull);
	
}


MCMC_JS.update_burnin_WW = function(burnin){


	if (ABC_JS.ABC_EXPERIMENTAL_DATA == null) return;
	ABC_JS.ABC_EXPERIMENTAL_DATA.burnin = burnin;



}


if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		beginMCMC: MCMC_JS.beginMCMC,
		clearMCMCdata_WW: MCMC_JS.clearMCMCdata_WW,
		MCMC_SIMULATING: MCMC_JS.MCMC_SIMULATING,
		getLogPrior: MCMC_JS.getLogPrior,
		wrapProposal: MCMC_JS.wrapProposal,
		makeProposal: MCMC_JS.makeProposal,
		getLogLikelihood: MCMC_JS.getLogLikelihood,
		performMCMCtrial: MCMC_JS.performMCMCtrial,
		clearMCMCdata_WW: MCMC_JS.clearMCMCdata_WW,
		currentchiSqthreshold: MCMC_JS.currentchiSqthreshold,
		chiSq_this_trial: MCMC_JS.chiSq_this_trial,
		calculateESS: MCMC_JS.calculateESS,
		update_burnin_WW: MCMC_JS.update_burnin_WW,
		get_ParametersWithPriors_WW: MCMC_JS.get_ParametersWithPriors_WW,
		cache_effective_sample_sizes: MCMC_JS.cache_effective_sample_sizes,
		cached_effective_sample_sizes: MCMC_JS.cached_effective_sample_sizes,
		MCMC_parameters_and_metrics_from_input_file: MCMC_JS.MCMC_parameters_and_metrics_from_input_file
	}

}
