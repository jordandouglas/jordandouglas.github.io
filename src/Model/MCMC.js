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
	PARAMS_JS.sample_parameters_WW();
	MCMC_JS.MCMC_SIMULATING = true;

	// Build a list of parameters which have prior distributions
	MCMC_JS.parametersWithPriors = [];
	for (var paramID in ABC_JS.ABC_parameters_and_metrics_this_simulation){
		if (ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID] != null && ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] !== undefined) {
			ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID]["priorVal"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"];
			MCMC_JS.parametersWithPriors.push(paramID);
		}

	}

	console.log("Priors:", MCMC_JS.parametersWithPriors);


	if (MCMC_JS.parametersWithPriors.length == 0){
		exitMCMC();
		return;
	}


	ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = 0;


	var toDoAfterFirstSimulation = function(){


		console.log("toDoAfterFirstSimulation");

		if (WW_JS.stopRunning_WW){
			exitMCMC();
			return;
		}


		var logPrior = MCMC_JS.getLogPrior();
		var logLikelihood = MCMC_JS.getLogLikelihood(fitNums);
		var logPosterior = logLikelihood + logPrior;
		ABC_JS.ABC_parameters_and_metrics_this_simulation.logPrior = logPrior;
		ABC_JS.ABC_parameters_and_metrics_this_simulation.logLikelihood = logLikelihood;
		ABC_JS.ABC_parameters_and_metrics_this_simulation.logPosterior = logPosterior;



		console.log("logPrior", logPrior, logLikelihood);

		// Copy this current state and save it as the previous state
		MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation));


		// Log the initial state and add it to the posterior
		ABC_JS.update_ABCoutput_WW(fitNums);
		if (!RUNNING_FROM_COMMAND_LINE) {
			ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation)));
		}
		

		// Perform MCMC over N trials
		var toCall = () => new Promise((resolve) => MCMC_JS.performMCMCtrial(fitNums, resolve));
		toCall().then(() => exitMCMC());


	}





	// Evaluate the likelihood of the initial state
	var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_curve_WW(0, true, fitNums, resolve));
	toCall().then(() => toDoAfterFirstSimulation());





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

	var toDoAfterTrial = function(){



		if (!WW_JS.stopRunning_WW){

			// Calculate the log prior / likelihood of this state
			var logLikelihood = MCMC_JS.getLogLikelihood(fitNums);
			var logPosterior = logPrior + logLikelihood;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logPrior = logPrior;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logLikelihood = logLikelihood;
			ABC_JS.ABC_parameters_and_metrics_this_simulation.logPosterior = logPosterior;


			// Accept or reject the current state using Metropolis-Hastings formula. Accept the new state with probability min(1, alpha)
			var alpha = Math.exp(logPosterior - MCMC_JS.MCMC_parameters_and_metrics_previous_simulation.logPosterior);

			// Accept
			if (alpha >= 1 || RAND_JS.uniform(0, 1) < alpha){
				MCMC_JS.MCMC_parameters_and_metrics_previous_simulation = JSON.parse(JSON.stringify(ABC_JS.ABC_parameters_and_metrics_this_simulation));
				MCMC_JS.MCMC_parameters_and_metrics_previous_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
				ABC_JS.nAcceptedValues++;
				console.log("Accepted with alpha=", alpha);
			}else{
				ABC_JS.ABC_parameters_and_metrics_this_simulation = JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation));
				ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
				//console.log("Rejected with alpha=", alpha);
			}


			// Log the current state if appropriate
			if (ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] % ABC_JS.ABC_EXPERIMENTAL_DATA.logEvery == 0) {
				ABC_JS.update_ABCoutput_WW(fitNums);


				if (!RUNNING_FROM_COMMAND_LINE) {
					ABC_JS.ABC_POSTERIOR_DISTRIBUTION.push(JSON.parse(JSON.stringify(MCMC_JS.MCMC_parameters_and_metrics_previous_simulation)));
				}

			}

		}
		
		MCMC_JS.performMCMCtrial(fitNums, resolve);


	}


	// Modify the parameters using the proposal function
	MCMC_JS.makeProposal();

	console.log("Kcat = ", ABC_JS.ABC_parameters_and_metrics_this_simulation["kCat"]["priorVal"]);


	// Reset the state
	ABC_JS.ABC_parameters_and_metrics_this_simulation["trial"] = ABC_JS.ABC_EXPERIMENTAL_DATA["ntrials"] - ABC_JS.n_ABC_trials_left + 1;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["FAssist"]["vals"] = []; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["NTPeq"]["vals"] = []; 
	ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"] = [];
	ABC_JS.ABC_parameters_and_metrics_this_simulation["logPrior"] = null;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["logLikelihood"] = null;
	ABC_JS.ABC_parameters_and_metrics_this_simulation["logPosterior"] = null;
	ABC_JS.n_ABC_trials_left--;


	
	// Simulate data for the entire set of experimental data. Do not stop early even if the fit is bad (less efficient than regular ABC in this sense)
	// But do not simulate if the prior probability is negative infinity
	var logPrior = MCMC_JS.getLogPrior();
	if (logPrior == Number.NEGATIVE_INFINITY) toDoAfterTrial();
	else {
		var toCall = () => new Promise((resolve) => ABC_JS.ABC_trial_for_curve_WW(0, true, fitNums, resolve));
		toCall().then(() => toDoAfterTrial());
	}


}




MCMC_JS.getLogPrior = function(){


	var logPriorProbability = 0;
	for (var i = 0; i < MCMC_JS.parametersWithPriors.length; i ++){
		var paramID = MCMC_JS.parametersWithPriors[i];
		switch (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"]){

			case "Uniform":
				var lower = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].uniformDistnLowerVal;
				var upper = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].uniformDistnUpperVal;
				var val = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].val;
				if (val < lower || val > upper) logPriorProbability = Number.NEGATIVE_INFINITY;
				else logPriorProbability += Math.log( 1 / (upper - lower) );
				break;


			case "Normal":
				var mu = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].normalMeanVal;
				var sd = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].normalSdVal;
				var val = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].val;
				logPriorProbability += Math.log( 1 / (Math.sqrt(2 * Math.PI * sd * sd)) * Math.exp(-(val-mu) * (val-mu) / (2 * sd * sd)) );
				break;


			// TODO: the rest of the distributions

		}
	}

	return logPriorProbability;

}


MCMC_JS.getLogLikelihood = function(fitNums){


	var force_velocity_num = -1
	var RSS = 0;
	for (var fitNum = 0; fitNum < fitNums.length; fitNum++){

		var fitID = fitNums[fitNum];
		for (var observationNum = 0; observationNum < ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].length; observationNum++){

			force_velocity_num++;
			var observedVelocity = ABC_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"][observationNum]["velocity"];
			var simulatedVelocity = ABC_JS.ABC_parameters_and_metrics_this_simulation["velocity"]["vals"][force_velocity_num];
			var residualSquared =  Math.pow(observedVelocity - simulatedVelocity, 2);
			RSS += residualSquared;

		}

	}

	return -RSS; // -RSS is our approximation of the log-likelihood

}


// Select new parameters based off the current parameters. Will mutate the current parameters
MCMC_JS.makeProposal = function(){



	// Uniformly at random select a parameter to change
	var randNum = Math.floor(MER_JS.random() * MCMC_JS.parametersWithPriors.length);
	var paramIDToChange = MCMC_JS.parametersWithPriors[randNum];



	// Generate a heavy tailed distribution random variable.
	// Using the algorithm in section 8.3 of https://arxiv.org/pdf/1606.03757.pdf
	var a = RAND_JS.normal(0, 1);
	var b = RAND_JS.uniform(0, 1);
	var t = a / Math.sqrt(-Math.log(b));
	var n = RAND_JS.normal(0, 1);
	var x = Math.pow(10, 1.5 - 3*Math.abs(t)) * n;



	// Wrap the value so that it bounces back into the right range
	var stepSize = PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnUpperVal - PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnLowerVal;
	var newVal = ABC_JS.ABC_parameters_and_metrics_this_simulation[paramIDToChange]["priorVal"] + x * stepSize;
	if (PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["distribution"] == "Uniform") {
		newVal = MCMC_JS.wrapProposal(newVal, PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnLowerVal, PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange].uniformDistnUpperVal);
	}


	//console.log("randh", x);
	ABC_JS.ABC_parameters_and_metrics_this_simulation[paramIDToChange]["priorVal"] = newVal;
	PARAMS_JS.PHYSICAL_PARAMETERS[paramIDToChange]["val"] = newVal;

}


// Bounce the sampled value back and forth so that it lies within the (lower, upper) range
// eg. if lower = 10 and val = 9.8, then return 10.2
MCMC_JS.wrapProposal = function(val, lower, upper){


	if (val > lower && val < upper) return val;

	if (val < lower) val = MCMC_JS.wrapProposal(lower + (lower - val), lower, upper);
	else if (val > upper) val = MCMC_JS.wrapProposal(upper - (val - upper), lower, upper);

	return val;


}


if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		beginMCMC: MCMC_JS.beginMCMC,
		clearMCMCdata_WW: MCMC_JS.clearMCMCdata_WW,
		MCMC_SIMULATING: MCMC_JS.MCMC_SIMULATING 

	}

}
