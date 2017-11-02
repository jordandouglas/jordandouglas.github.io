
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









/* Contains all functions which communicate between the controller and the WebWorker
	Note that if the WebWorker is not registered then the functions in WebWorker.js will be called from this page directly
*/


MESSAGE_LISTENER = {};

function register_WebWorker(resolve = function() { }){

	
	WEB_WORKER = null;
	if(typeof(Worker) !== "undefined") {
        	if(WEB_WORKER == null) {
				try {
            			WEB_WORKER = new Worker("src/Model/WebWorker.js");

            			// Tell the WebWorker to initialise
   						callWebWorkerFunction(function() { WW_JS.init_WW(true); });



				} catch(err){

					// WebWorker failed to register but we must continue to use the variables/functions from the WebWorker.js file anyway
					WEB_WORKER = null;
					removeWebworkerRegistrationHTML();
					console.log('WebWorker registration failed', err);
					$("#browserWWdisabled").show(true);

					// Tell the WebWorker to initialise
   					WW_JS.init_WW(false);
				}
        	}

    } else {
       	console.log('WebWorker registration failed');
       	removeWebworkerRegistrationHTML();
		$("#browserWWdisabled").show(true);
    }


    // Set up message listener
    if (WEB_WORKER != null){


    	// Error handler
	    WEB_WORKER.onerror = function (err) {
	    	console.log("WW error", err);
		}


    	MESSAGE_LISTENER = {};
    	WEB_WORKER.onmessage = function(event) {

			//console.log("Received message", event.data);

			// A message for debugging purposes
			if (event.data.substring(0,4) == "MSG:"){
				console.log("WW says:", event.data.substring(4));
				return;
			}


			// If the message starts with _ then it is a request for a function call
			if (event.data[0] == "_"){
				var fn = event.data.substring(1);
				executeFunctionFromString(fn);
				return;
			}



			// Otherwise the message will be the following format "id~X~result"
			var id = event.data.split("~X~")[0];
			var result = event.data.split("~X~")[1];




			// Find the object in MESSAGE_LISTENER with the corresponding id
			var obj = MESSAGE_LISTENER[id];
			if (obj == null) return;


			// If the result is 'done' then we can continue with the callback
			if (result == "done"){
				obj["resolve"](null);
			}


			else{
				// Otherwise we continue with the callback but with the JSON-parsed parameter
				result = JSON.parse(result);
				//console.log("Returning JSON ", result);
				obj["resolve"](result);
			}


			// Remove this object from the MESSAGE_LISTENER list
			MESSAGE_LISTENER[id] = null;

		}



    }


    resolve();



}




function callWebWorkerFunction(fn, resolve = null, msgID = null){

	fnStr = "(" + fn + ")";

	// No WebWorker, call function directly
	//console.log("Calling", fn);
	if(WEB_WORKER == null) {
		var result = eval(fnStr)();
		console.log("Resolving", result);
		if (resolve != null) resolve(result);
	}

	else{

		//console.log("Posting msg " + fnStr);

		// If we do not require a response then just send the message
		if (msgID == null) WEB_WORKER.postMessage("~X~" + fnStr);

		// Otherwise add this to MESSAGE_LISTENER with a unique id and send the message along with the id
		else{
			MESSAGE_LISTENER[msgID] = {resolve: resolve};
			WEB_WORKER.postMessage(msgID + "~X~" + fnStr);

		}

	}


}


function stringifyFunction(fn, args = [], addID = false){

	var fnStr = "function() { " + fn + "(";



	for (var i = 0; i < args.length; i ++){
		if (typeof args[i]  === 'string') fnStr += "'" + args[i] + "'";
		else if (typeof args[i] == 'object') fnStr += JSON.stringify(args[i])
		else fnStr += args[i];

		if (i < args.length - 1) fnStr += ", ";
	}


	// Create and add a message id as the first argument
	var msgID = 0;
	if (addID){
		msgID = Math.ceil(mersenneTwister.random() * 1000);
		while (MESSAGE_LISTENER["" + msgID] != null) msgID ++;
		MESSAGE_LISTENER[msgID] = {resolve: null};

		if (args.length > 0) fnStr += ", ";
		fnStr += msgID;

	}


	fnStr += ") }";

	if (addID) return [fnStr, msgID];
	return fnStr;

}



// Assumes that function is in format fn_name(arg1 | arg2)
function executeFunctionFromString(fnStr){

	if (fnStr == "null" || fnStr == "false") return;


	fnStr = fnStr.trim();
	fnStr = fnStr.substring(0, fnStr.length - 1); // Remove the last ')'
	var bits = fnStr.split("(");
	var fnName = bits[0]
	var args = [];
	var argStr = bits[1].trim().split("|");

	for (var argNum = 0; argNum < argStr.length; argNum ++){
		if (argStr[argNum].trim() == "") continue;
		args.push(JSON.parse(argStr[argNum]));
	}


	if (args.length == 0) window[fnName]();
	else if (args.length == 1) window[fnName](args[0]);
	else if (args.length == 2) window[fnName](args[0], args[1]);
	else if (args.length == 3) window[fnName](args[0], args[1], args[2]);

}




function refresh_controller(resolve_fn = function(x) {}){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.refresh_WW(resolve));
		toCall().then((x) => resolve_fn(x));
	}else{
		var res = stringifyFunction("WW_JS.refresh_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => resolve_fn(x));

	}

}


function stop_controller(resolve = function() { }){



	if (WEB_WORKER == null) {
		resolve(WW_JS.stop_WW());
	}else{

		var res = stringifyFunction("WW_JS.stop_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		
		console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then(() => resolve());
	}


}


function create_HTMLobject_controller(id, x, y, width, height, src, zIndex = 1){

	
	if (WEB_WORKER == null) {
		WW_JS.create_HTMLobject_WW(id, x, y, width, height, src, zIndex);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.create_HTMLobject_WW", [id, x, y, width, height, src, zIndex]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}


}

function create_pol_controller(x, y, src = "pol"){

	if (WEB_WORKER == null) {
		WW_JS.create_pol_WW(x, y, src);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.create_pol_WW", [x, y, src]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}

}



function flip_base_controller(pos, seq, flipTo){
	if (WEB_WORKER == null) {
		WW_JS.flip_base_WW(pos, seq, flipTo);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.flip_base_WW", [pos, seq, flipTo]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}
}

function create_nucleoprotein_controller(id, x, y){
	if (WEB_WORKER == null) {
		WW_JS.create_nucleoprotein_WW(id, x, y);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.create_nucleoprotein_WW", [id, x, y]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}
}



function create_nucleotide_controller(id, seq, pos, x, y, base, src, hasTP = false, mut = null){


	if (WEB_WORKER == null) {
		WW_JS.create_nucleotide_WW(id, seq, pos, x, y, base, src, hasTP, mut);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.create_nucleotide_WW", [id, seq, pos, x, y, base, src, hasTP, mut]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}


}

function delete_HTMLobj_controller(id){

	if (WEB_WORKER == null) {
		WW_JS.delete_HTMLobj_WW(id);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.delete_HTMLobj_WW", [id]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}

}

function delete_nt_controller(pos, seq){

	if (WEB_WORKER == null) {
		delete_nt_WW(pos, seq);
	}

	else{
		var fnStr = stringifyFunction("delete_nt_WW", [pos, seq]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}
}


function move_obj_controller(obj, dx, dy, animationTime){

	if (WEB_WORKER == null) {
		delete_nt_WW(obj, dx, dy, animationTime);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.move_obj_WW", [obj, dx, dy, animationTime]);
		callWebWorkerFunction(fnStr);
	}
}

function move_nt_controller(pos, seq, dx, dy, animationTime = ANIMATION_TIME_controller){
	
	if (WEB_WORKER == null) {
		/*var currentdate = new Date(); 
		var datetime = "Last Sync: " + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds() + ":" 
                + currentdate.getMilliseconds();
        console.log("Time move_nt_controller", datetime); */
		WW_JS.move_nt_WW(pos, seq, dx, dy, animationTime);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.move_nt_WW", [pos, seq, dx, dy, animationTime]);
		callWebWorkerFunction(fnStr);
	}

}


function move_obj_from_id_controller(id, dx, dy, animationTime = ANIMATION_TIME_controller){

	if (WEB_WORKER == null) {
		WW_JS.move_obj_from_id_WW(id, dx, dy, animationTime);
	}

	else{
		var fnStr = stringifyFunction("WW_JS.move_obj_from_id_WW", [id, dx, dy, animationTime]);
		callWebWorkerFunction(fnStr);
	}

}


function get_unrenderedObjects_controller(resolve){


	if (WEB_WORKER == null) {
		resolve(WW_JS.get_unrenderedObjects_WW());
	}else{
		var res = stringifyFunction("WW_JS.get_unrenderedObjects_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

}


function get_primerSequence_controller(resolve){

	if (WEB_WORKER == null) {
		resolve(WW_JS.get_primerSequence_WW());
	}else{
		var res = stringifyFunction("WW_JS.get_primerSequence_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

}


function add_pairs_controller(resolve){

	if (WEB_WORKER == null) {
		resolve(WW_JS.add_pairs_WW());
	}else{
		var res = stringifyFunction("WW_JS.add_pairs_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

}


function userInputSequence_controller(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent, resolve){


	

	if (WEB_WORKER == null) {
		resolve(WW_JS.userInputSequence_WW(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent));

	}else{
		var res = stringifyFunction("WW_JS.userInputSequence_WW", [newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent], true);
		var fnStr = res[0];
		var msgID = res[1];
		callWebWorkerFunction(fnStr, resolve, msgID);
	}


}

function userSelectSequence_controller(newSequenceID, newTemplateType, newPrimerType, resolve){




	if (WEB_WORKER == null) {
		resolve(WW_JS.userSelectSequence_WW(newSequenceID, newTemplateType, newPrimerType));

	}else{
		var res = stringifyFunction("WW_JS.userSelectSequence_WW", [newSequenceID, newTemplateType, newPrimerType], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((goodLength) => resolve(goodLength));
		
	}


}


function refreshPlotDataSequenceChangeOnly_controller(resolve = function() { }){
	

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.refreshPlotDataSequenceChangeOnly_WW(resolve));
		toCall().then(() => resolve());

	}else{
		var res = stringifyFunction("PLOTS_JS.refreshPlotDataSequenceChangeOnly_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then(() => resolve());
	}
	
	
}

function getPlotData_controller(forceUpdate = false, resolve){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.getPlotData_WW(forceUpdate, resolve, null));
		toCall().then((dict) => resolve(dict));

	}else{
		var res = stringifyFunction("PLOTS_JS.getPlotData_WW", [forceUpdate, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}
	
}




function setNextBaseToAdd_controller(){


	var setNTP_resolve = function(dict) { setNTP(dict["NTPtoAdd"]) };


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.setNextBaseToAdd_WW(resolve, null));
		toCall().then((dict) => setNTP_resolve(dict));

	}else{
		var res = stringifyFunction("WW_JS.setNextBaseToAdd_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => setNTP_resolve(dict));
	}


}



function userSetNextBaseToAdd_controller(ntpType){


	var updateDOM = function(){
		refreshNavigationCanvases();
	}



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.userSetNextBaseToAdd_WW(ntpType, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("WW_JS.userSetNextBaseToAdd_WW", [ntpType, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

}

function refreshNTP_controller(){

	if (WEB_WORKER == null) {
		PARAMS_JS.refreshNTP_WW();
	}

	else{
		var fnStr = stringifyFunction("PARAMS_JS.refreshNTP_WW");
		callWebWorkerFunction(fnStr);
	}

}



function getSaveSessionData_controller(resolve){
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.getSaveSessionData_WW(resolve));
		toCall().then((dict) => resolve(dict));

	}else{
		var res = stringifyFunction("WW_JS.getSaveSessionData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}
	
}

function get_PHYSICAL_PARAMETERS_controller(resolve = function(dict) {}){



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PARAMS_JS.get_PHYSICAL_PARAMETERS_WW(resolve));
		toCall().then((dict) => resolve(dict));

	}else{
		var res = stringifyFunction("PARAMS_JS.get_PHYSICAL_PARAMETERS_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}


}

function sample_parameters_controller(resolve = function() {}){


	var updateDOM = function(x){
		renderParameters();
		resolve();
	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PARAMS_JS.sample_parameters_WW(resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("PARAMS_JS.sample_parameters_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}



function submitDistribution_controller(resolve = function() {}){


	if ($("#popup_distn").length == 0) return;
	var paramID = $("#popup_distn").attr("paramID");
	var distributionName = $("#SelectDistribution").val();
	var distributionParams = [];

	switch(distributionName) {
	    case "Fixed":
	    	distributionParams.push(parseFloat($("#fixedDistnVal").val()));
	        break;
	    case "Uniform":
	    	distributionParams.push(parseFloat($("#uniformDistnLowerVal").val()));
	    	distributionParams.push(parseFloat($("#uniformDistnUpperVal").val()));
	        break;
		case "Exponential":
			distributionParams.push(parseFloat($("#ExponentialDistnVal").val()));
		    break;
		case "Normal":
			distributionParams.push(parseFloat($("#normalMeanVal").val()));
	    	distributionParams.push(parseFloat($("#normalSdVal").val()));
			break;
		case "Lognormal":
			distributionParams.push(parseFloat($("#lognormalMeanVal").val()));
	    	distributionParams.push(parseFloat($("#lognormalSdVal").val()));
			break;
		case "Gamma":
			distributionParams.push(parseFloat($("#gammaShapeVal").val()));
	    	distributionParams.push(parseFloat($("#gammaRateVal").val()));
			break;
		case "DiscreteUniform":
			distributionParams.push(parseFloat($("#uniformDistnLowerVal").val()));
		   	distributionParams.push(parseFloat($("#uniformDistnUpperVal").val()));
			break;
		case "Poisson":
			distributionParams.push(parseFloat($("#poissonRateVal").val()));
			break;
	}


	// Function to call when webworker has responded
	var updateDOM = function(PHYSICAL_PARAMETERS_LOCAL){
		closePriorDistributionPopup();
		
		
		// If the value has changed and this parameter requires refreshing on change, then refresh
		var needToRefresh = PHYSICAL_PARAMETERS_LOCAL[paramID]["refreshOnChange"] != null && PHYSICAL_PARAMETERS_LOCAL[paramID]["refreshOnChange"];
		needToRefresh = needToRefresh && $("#" + paramID).val() != roundToSF(PHYSICAL_PARAMETERS_LOCAL[paramID]["val"], 3);


		$("#" + paramID).val(roundToSF(PHYSICAL_PARAMETERS_LOCAL[paramID]["val"], 3));
		if (PHYSICAL_PARAMETERS_LOCAL[paramID]["distribution"] != "Fixed") {
			$("#" + paramID).addClass("parameter-disabled");
			$("#" + paramID).attr("disabled", true);
		}else{
			$("#" + paramID).removeClass("parameter-disabled");
			$("#" + paramID).attr("disabled", false);
		}
		
		if (needToRefresh){
			refresh();
			return;
		}
		
		
		renderParameters();
		resolve();

		
	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PARAMS_JS.submitDistribution_WW(paramID, distributionName, distributionParams, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("PARAMS_JS.submitDistribution_WW", [paramID, distributionName, distributionParams, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

}

function update_this_parameter_controller(element){




	var paramID = $(element).attr("id");
	// Special case for the assisting force 
	if (paramID == "FAssist"){
		updateForce_controller();
	}else{





		// Function to call when webworker has responded
		var updateDOM = function(result){
			
			if (result["refresh"]){
				refresh();
				return;
			}

			// If this is an NTP concentration or an NTP binding parameter then we also need to resample the next NTP addition event
			if (paramID.substring(3) == "conc" || paramID == "RateBind" || paramID == "RateMisbind" || paramID == "TransitionTransversionRatio") setNextBaseToAdd_controller();
			
			$(element).val(result["val"]);
			update_sliding_curve(0);
			update_slipping_curve(0);
			refreshNavigationCanvases();
		};


		var val = parseFloat($(element).val());
		if ($("#" + paramID).attr("type") == "checkbox") val = $("#" + paramID).is(":checked");

		if (WEB_WORKER == null) {
			var toCall = () => new Promise((resolve) => PARAMS_JS.update_this_parameter_WW(paramID, val, resolve));
			toCall().then((result) => updateDOM(result));
		}

		else{
			var res = stringifyFunction("PARAMS_JS.update_this_parameter_WW", [paramID, val, null], true);
			var fnStr = res[0];
			var msgID = res[1];
			var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
			toCall().then((result) => updateDOM(result));

		}


	}

}


function updateForce_controller(){
	
	var newFAssist = parseFloat($("#FAssist").val());


	
	var updateDOM = function(){
		update_sliding_curve(0);
		renderObjects();
		refreshNavigationCanvases();
	};

	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PARAMS_JS.updateForce_WW(newFAssist, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else{
		var res = stringifyFunction("PARAMS_JS.updateForce_WW", [newFAssist, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));


	}
	
}







function transcribe_controller(nbasesToTranscribe = null, fastMode = false, resolve = function() { }){


	if ($("#transcribeBtn").hasClass("toolbarIconDisabled")) return;

	disable_all_buttons();

	if (nbasesToTranscribe == null) nbasesToTranscribe = parseFloat($('#nbasesToSimulate').val());
	if(nbasesToTranscribe <= 0) return;

	var clickMisincorporation = false;
	if ($("#deactivateUponMisincorporation").is(":checked")){
		$("#deactivateUponMisincorporation").click();
		clickMisincorporation = true;
	}


	// Hide the simulate button and show the stop button
	hideButtonAndShowStopButton("transcribe");


	var updateDOM = function(){
		reactivate_buttons();
		setNextBaseToAdd_controller();
		renderObjects();
		refreshNavigationCanvases();
		if (clickMisincorporation) $("#deactivateUponMisincorporation").click();
		hideStopButtonAndShow("transcribe");
		update_sliding_curve(0);
		resolve();

	};

	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => OPS_JS.transcribe_WW(nbasesToTranscribe, fastMode, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else{
		var res = stringifyFunction("OPS_JS.transcribe_WW", [nbasesToTranscribe, fastMode, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));

		renderObjectsUntilReceiveMessage(msgID);

	}

}


function stutter_controller(nbasesToStutter = null, fastMode = false, resolve = function() { }){

	if ($("#stutterBtn").hasClass("toolbarIconDisabled")) return;
	disable_all_buttons();

	if (nbasesToStutter == null) nbasesToStutter = parseFloat($('#nbasesToSimulate').val());
	if(nbasesToStutter <= 0) return;

	var updateDOM = function(){
		setNextBaseToAdd_controller();
		renderObjects();
		reactivate_buttons();
		refreshNavigationCanvases();
		hideStopButtonAndShow("stutter");
		update_sliding_curve(0);
		resolve();
	};

	// Hide the simulate button and show the stop button
	hideButtonAndShowStopButton("stutter");


	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null ){// || ANIMATION_TIME_controller > 1) {
		var toCall = () => new Promise((resolve) => OPS_JS.stutter_WW(nbasesToStutter, fastMode, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else{
		var res = stringifyFunction("OPS_JS.stutter_WW", [nbasesToStutter, fastMode, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));

		renderObjectsUntilReceiveMessage(msgID);

	}

}


function forward_controller(state = null, UPDATE_COORDS = true, resolve = function() { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(DOMupdates){
		if(DOMupdates["successfulOp"]){
			
			refreshNavigationCanvases();
			update_sliding_curve(1);
			update_slipping_curve(0);
			renderObjects();
		}
		

		// Create any new slippage landscapes that are required
		for (var i = 0; i < DOMupdates["where_to_create_new_slipping_landscape"].length; i ++){
			create_new_slipping_landscape(DOMupdates["where_to_create_new_slipping_landscape"][i]);
		}


		// Reset slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_reset"].length; i ++){
			reset_slipping_landscape(DOMupdates["landscapes_to_reset"][i]);
		}


		// Delete slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_delete"].length; i ++){
			delete_slipping_landscape(DOMupdates["landscapes_to_delete"][i]);
		}



		resolve();

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.forward_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.forward_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}


function backwards_controller(state = null, UPDATE_COORDS = true, resolve = function() { }){


	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(DOMupdates){

		if(DOMupdates["successfulOp"]){
			
			refreshNavigationCanvases();
			update_sliding_curve(-1);
			update_slipping_curve(0);
			renderObjects();
			$("#mRNAsvg").remove();
			$("#bases").children().show(0);
		}
		

		// Create any new slippage landscapes that are required
		for (var i = 0; i < DOMupdates["where_to_create_new_slipping_landscape"].length; i ++){
			create_new_slipping_landscape(DOMupdates["where_to_create_new_slipping_landscape"][i]);
		}


		// Reset slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_reset"].length; i ++){
			reset_slipping_landscape(DOMupdates["landscapes_to_reset"][i]);
		}


		// Delete slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_delete"].length; i ++){
			delete_slipping_landscape(DOMupdates["landscapes_to_delete"][i]);
		}



		resolve();

	};

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => OPS_JS.backwards_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("OPS_JS.backwards_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));



	}


}










function bindNTP_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(0);
		setNextBaseToAdd_controller();
		renderObjects();

		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.bindNTP_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.bindNTP_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}


function releaseNTP_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(0);
		setNextBaseToAdd_controller();
		renderObjects();

		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.releaseNTP_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.releaseNTP_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

}



function activate_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(0);
		renderObjects();
		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.activate_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.activate_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}


function deactivate_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(0);
		renderObjects();
		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.deactivate_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.deactivate_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}



function slip_left_controller(S = 0, state = null, UPDATE_COORDS = true, resolve = function() { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(DOMupdates){

		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(-1, S);
		renderObjects();


		// Create any new slippage landscapes that are required
		for (var i = 0; i < DOMupdates["where_to_create_new_slipping_landscape"].length; i ++){
			create_new_slipping_landscape(DOMupdates["where_to_create_new_slipping_landscape"][i]);
		}


		// Reset slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_reset"].length; i ++){
			reset_slipping_landscape(DOMupdates["landscapes_to_reset"][i]);
		}


		// Delete slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_delete"].length; i ++){
			delete_slipping_landscape(DOMupdates["landscapes_to_delete"][i]);
		}


		resolve();

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.slip_left_WW(state, UPDATE_COORDS, S, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.slip_left_WW", [state, UPDATE_COORDS, S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}





function slip_right_controller(S = 0, state = null, UPDATE_COORDS = true, resolve = function() { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(DOMupdates){

		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(1, S);
		renderObjects();

		// Create any new slippage landscapes that are required
		for (var i = 0; i < DOMupdates["where_to_create_new_slipping_landscape"].length; i ++){
			create_new_slipping_landscape(DOMupdates["where_to_create_new_slipping_landscape"][i]);
		}


		// Reset slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_reset"].length; i ++){
			reset_slipping_landscape(DOMupdates["landscapes_to_reset"][i]);
		}


		// Delete slippage landscapes
		for (var i = 0; i < DOMupdates["landscapes_to_delete"].length; i ++){
			delete_slipping_landscape(DOMupdates["landscapes_to_delete"][i]);
		}


		resolve();

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.slip_right_WW(state, UPDATE_COORDS, S, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("OPS_JS.slip_right_WW", [state, UPDATE_COORDS, S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}






function changeSpeed_controller(){




	var speed = $("#PreExp").val();


	if (speed != ANIMATION_TIME_controller && SPEED_controller == "hidden") addSequenceLoadingHTML();
	if (speed != "hidden") deleteHiddenModeNotification();

	SPEED_controller = speed;

	// If we are simulating this is not a webworker and the current speed is ultrafast then set it back to fast otherwise the browser will crash
	if (simulating && WEB_WORKER == null && speed == "ultrafast" && speed != "hidden") {
		$("#PreExp").val("fast");
		speed = "fast";
	}

	if (speed == "hidden"){
		$("#bases_container").hide(300);
		$('#bases').html("");
	}

	else {

		// Reset scroll bar to correct position if going from hidden to non hidden
		var updateScrollbar = !$("#bases_container").is(":visible");
		$("#bases_container").show(true, function(){
			if (updateScrollbar) moveScrollBar();
		});


	}


	// If the speed changed to slow, medium or fast then start calling for rendering on the controller end
	if (speed == "slow" || speed == "medium" || speed == "fast"){

		// Do not start the recursion if it is already running
		if (!simulationRenderingController) {
			simulationRenderingController = true;
			renderObjectsUntilReceiveMessage(msgID_simulation);
		}

	}

	// If it changed to ultrafast or hidden then leave rendering up to the model
	else{
		simulationRenderingController = false;
	}



	var updateDOM = function(animationTime){
		ANIMATION_TIME_controller = animationTime;
		if (speed != "hidden" && !simulating) renderObjects();
	}



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.changeSpeed_WW(speed, resolve));
		toCall().then((res) => updateDOM(res));
	}

	else{
		var res = stringifyFunction("WW_JS.changeSpeed_WW", [speed, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((res) => updateDOM(res));

	}

	
}



function getSlidingHeights_controller(ignoreModelOptions = false, resolve = function(heights){ }){

	//console.log("Asking for getSlidingHeights_controller");
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getSlidingHeights_WW(true, ignoreModelOptions, resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getSlidingHeights_WW", [true, ignoreModelOptions, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}



function getStateDiagramInfo_controller(resolve = function(state) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getStateDiagramInfo_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getStateDiagramInfo_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}



function getCurrentState_controller(resolve = function(state) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.getCurrentState_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("WW_JS.getCurrentState_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}


function getTranslocationCanvasData_controller(resolve = function(result){}){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getTranslocationCanvasData_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getTranslocationCanvasData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}



function getNTPCanvasData_controller(resolve = function(result){}){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getNTPCanvasData_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getNTPCanvasData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}



function getDeactivationCanvasData_controller(resolve = function(result){}){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getDeactivationCanvasData_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getDeactivationCanvasData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}


function getSlippageCanvasData_controller(S = 0, resolve = function(result){}){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getSlippageCanvasData_WW(S, resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getSlippageCanvasData_WW", [S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}



}



function startTrials_controller(){


	if ($("#simulateBtn").hasClass("toolbarIconDisabled")) return;
	if ($("#SelectPrimerType").val().substring(0,2) == "ds") return;
	var ntrials = $("#nbasesToSimulate").val();
	if(ntrials <= 0) return;
	
	if(simulating) return;
	simulating = true;


	// Unfocus from anything which has been focused so that the input box change event triggers
	// Clicking this button will not defocus because this has the noselect class
	var focusedObj = $(':focus');
	if (focusedObj.length > 0) focusedObj.blur();


	// Hide the simulate button and show the stop button
	hideButtonAndShowStopButton("simulate");


	
	// If the sequence is big and WebWorker is connected then switch to hidden mode for efficiency
	getCurrentState_controller(function(result) {

		var currentState = result["state"];
		
		if ($("#PreExp").val() != "hidden" && WEB_WORKER != null && currentState["nbases"] > 500) changeToHiddenModeAndShowNotification();
		
		
		
		disable_all_buttons();

		// If this is not a webworker and the current speed is ultrafast then set it back to fast otherwise the browser will crash
		changeSpeed_controller();

		$("#numSimSpan").hide(0);
		$("#progressSimSpan").html("<span id='counterProgress'>0</span> / " + ntrials);
		$("#progressSimSpan").show(0);
		lockTheScrollbar("#bases");




		var updateDOM = function(){
			deleteHiddenModeNotification();
			reactivate_buttons();
			setNextBaseToAdd_controller();
			refreshNavigationCanvases();
			if($("#PreExp").val() != "hidden") renderObjects();
			drawPlots();
			console.log("Updating dom");
			simulating = false;
			hideStopButtonAndShow("simulate");
			update_sliding_curve(0);

			$("#numSimSpan").show(0);
			$("#progressSimSpan").html("");
			$("#progressSimSpan").hide(0);
			unlockTheScrollbar("#bases");


			msgID_simulation = null;
			simulationRenderingController = false;

		};

			
		// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
		if (WEB_WORKER == null) {
			var toCall = () => new Promise((resolve) => SIM_JS.startTrials_WW(ntrials, resolve));
			toCall().then(() => updateDOM());
		}


		// If it is in asynchronous or hidden mode, then we keep going until the end
		else{
			var res = stringifyFunction("SIM_JS.startTrials_WW", [ntrials, null], true);
			var fnStr = res[0];
			msgID_simulation = res[1];

			var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID_simulation));
			toCall(fnStr).then((x) => updateDOM(x));

			// Render every animationFrame unless ultrafast or hidden
			if ($("#PreExp").val() != "ultrafast" && $("#PreExp").val() != "hidden") {
				simulationRenderingController = true;
				console.log("Calling renderObjectsUntilReceiveMessage", $("#PreExp").val());
				renderObjectsUntilReceiveMessage(msgID_simulation);
			}

			// If ultrafast mode then the model will tell us when to render
			else{
				simulationRenderingController = false;
			}

		}
	
	
	});

	
}



function selectPlot_controller(plotNum, value, deleteData, updateDOM = function(plotData) { }){
	

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.selectPlot_WW(plotNum, value, deleteData, true, resolve));
		toCall().then((plotData) => updateDOM(plotData));
	}

	else{
		var res = stringifyFunction("PLOTS_JS.selectPlot_WW", [plotNum, value, deleteData, true, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((plotData) => updateDOM(plotData));

	}
	

}


// Save the settings of a plot
function saveSettings_controller(){


	var plotNum = $("#settingsPopup").attr("plotNum");
	var plotType = $("#selectPlot" + plotNum).val();
	var values = [];
	var functionToCallAfterSaving = function() { };
	
	
	switch(plotType){


		case "distanceVsTime":


			if ($('input[name="xRange"][value="automaticX"]').prop("checked")) values.push("automaticX");
			else {
				values.push([$("#xMin_textbox").val(), $("#xMax_textbox").val()]);
			}

			if ($('input[name="yRange"][value="automaticY"]').prop("checked")) values.push("automaticY");
			else {
				values.push([$("#yMin_textbox").val(), $("#yMax_textbox").val()]);
			}

			functionToCallAfterSaving  = function() { plotTimeChart(); };

			break;



		case "pauseHistogram": // Save the proportion of values to display
			values.push($('input[name=perTime]:checked').val());

			if ($('input[name="xRange"][value="automaticX"]').prop("checked")) values.push("automaticX");
			else if ($('input[name="xRange"][value="pauseX"]').prop("checked")) values.push("pauseX");
			else if ($('input[name="xRange"][value="shortPauseX"]').prop("checked")) values.push("shortPauseX");
			else {
				values.push([$("#xMin_textbox").val(), $("#xMax_textbox").val()]);
			}

			values.push($('input[name=timeSpaceX]:checked').val());
			values.push($('input[name=timeSpaceY]:checked').val());

			functionToCallAfterSaving  = function() { plot_pause_distribution(); };
			break;

		case "velocityHistogram": // Save the proportion of values to display
			values.push(parseFloat($("#windowSizeInput").val()));


			if ($('input[name="xRange"][value="automaticX"]').prop("checked")) values.push("automaticX");
			else {
				values.push([$("#xMin_textbox").val(), $("#xMax_textbox").val()]);
			}

			values.push($('input[name=timeSpaceX]:checked').val());
			values.push($('input[name=timeSpaceY]:checked').val());

			functionToCallAfterSaving  = function() { plot_velocity_distribution(); };
			break;

		case "pauseSite": // Save the y-axis variable
			values.push($('input[name=Yaxis]:checked').val());
			console.log("input[name=Yaxis]:checked", $('input[name=Yaxis]:checked').val());
			functionToCallAfterSaving  = function() { plot_time_vs_site(); };
			break;


		case "custom": // Save the site(s) which are interested in

			values.push($("#customParam").val());
			values.push($("#customMetric").val());


			if ($('input[name="xRange"][value="automaticX"]').prop("checked")) values.push("automaticX");
			else {
				values.push([$("#xMin_textbox").val(), $("#xMax_textbox").val()]);
			}

			if ($('input[name="yRange"][value="automaticY"]').prop("checked")) values.push("automaticY");
			else {
				values.push([$("#yMin_textbox").val(), $("#yMax_textbox").val()]);
			}

			/* SITE CONSTRAINT PARSING -> keep code
			if ($('input[name=sitesToRecord]:checked').val() == "allSites") values.push([]);
			else values.push(convertCommaStringToList($("#sitesToRecord_textbox").val()));
			*/

			values.push($("#plotFromPosterior").prop("checked"));

			functionToCallAfterSaving  = function() { plot_custom(plotNum); };
			break;


		case "parameterHeatmap": // Save the site(s) which are interested in

			values.push($("#customParamX").val());
			values.push($("#customParamY").val());
			values.push($("#customParamZ").val());


			if ($('input[name="xRange"][value="automaticX"]').prop("checked")) values.push("automaticX");
			else {
				values.push([$("#xMin_textbox").val(), $("#xMax_textbox").val()]);
			}

			if ($('input[name="yRange"][value="automaticY"]').prop("checked")) values.push("automaticY");
			else {
				values.push([$("#yMin_textbox").val(), $("#yMax_textbox").val()]);
			}

			if ($('input[name="zRange"][value="automaticZ"]').prop("checked")) values.push("automaticZ");
			else {
				values.push([$("#zMin_textbox").val(), $("#zMax_textbox").val()]);
			}

			values.push($("#zColouring").val());

			values.push($("#plotFromPosterior").prop("checked"));


			functionToCallAfterSaving  = function() { plot_parameter_heatmap(plotNum); };
			break;
	}
	
	var updateDom = function(whichPlotInWhichCanvas){
		
		PLOT_DATA["whichPlotInWhichCanvas"] = whichPlotInWhichCanvas;
		functionToCallAfterSaving();
		closePlotSettingsPopup();
	};
	
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.saveSettings_WW(plotNum, plotType, values, resolve));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));
	}

	else{
		var res = stringifyFunction("PLOTS_JS.saveSettings_WW", [plotNum, plotType, values, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}
	



}



function delete_plot_data_controller(plotNum){
	
	
	if (WEB_WORKER == null) {
		PLOTS_JS.delete_plot_data_WW(plotNum);
	}

	else{
		var fnStr = stringifyFunction("PLOTS_JS.delete_plot_data_WW", [plotNum]);
		callWebWorkerFunction(fnStr);
	}
	
	
}


function setVariableToRecord_controller(plotCanvasID, varName, axis){
	
	
	var updateDom = function(whichPlotInWhichCanvas){
		
		PLOT_DATA["whichPlotInWhichCanvas"] = whichPlotInWhichCanvas;
		plot_custom(plotCanvasID);
		
	};
	
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => setVariableToRecord_WW(plotCanvasID, varName, axis, resolve));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));
	}

	else{
		var res = stringifyFunction("setVariableToRecord_WW", [plotCanvasID, varName, axis, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}
	
	
	
}



function getElongationModels_controller(resolve = function(x) { }){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getElongationModels_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("FE_JS.getElongationModels_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}



}

function getMisbindMatrix_controller(resolve = function(x) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.getMisbindMatrix_WW(resolve));
		toCall().then((mod) => resolve(mod));
	}

	else{
		var res = stringifyFunction("WW_JS.getMisbindMatrix_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => resolve(mod));

	}

}

function getMFESequenceBonds_controller(){

	
	// No RNA secondary structure display on mobile phones beause svg is not well supported
	if ($("#PreExp").val() == "hidden" || IS_MOBILE) return;

	var updateDOM = function(graphInfo){

		console.log("graphInfo", graphInfo);
		renderSecondaryStructure(graphInfo);
		renderObjects();

	};
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => MFE_JS.getMFESequenceBonds_WW(resolve));
		toCall().then((graphInfo) => updateDOM(graphInfo));
	}

	else{
		var res = stringifyFunction("MFE_JS.getMFESequenceBonds_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((graphInfo) => updateDOM(graphInfo));


	}
	
	
	
}



function loadSession_controller(XMLData){
	

	var updateDom = function(result){



		var seqObject = result["seq"];
		var model = result["model"];
		var compactState = result["compactState"];
		var experimentalData = result["ABC_EXPERIMENTAL_DATA"];
		
		
			
		var openPlots = function(){

			// Open up the appropriate plots
			//PLOT_DATA = {};
			//PLOT_DATA["whichPlotInWhichCanvas"] = result["whichPlotInWhichCanvas"];
			
			for (var plt in result["whichPlotInWhichCanvas"]){
				
				var pltName = result["whichPlotInWhichCanvas"][plt]["name"];
				$("#selectPlot" + plt).val(pltName);
				$("#plotDIV" + plt).show(0);
				$("#plotOptions" + plt).show(0);
				$("#downloadPlot" + plt).show(0);
				$("#helpPlot" + plt).show(0);
				$("#helpPlot" + plt).attr("href", "about/#" + pltName + "_PlotHelp");
				
				
				//if (result["whichPlotInWhichCanvas"][plt]["name"] != "none" && result["whichPlotInWhichCanvas"][plt]["name"] != "custom" && result["whichPlotInWhichCanvas"][plt]["name"] != "parameterHeatmap") eval(result["whichPlotInWhichCanvas"][plt]["plotFunction"])();
				//else if (result["whichPlotInWhichCanvas"][plt]["name"] == "custom" || result["whichPlotInWhichCanvas"][plt]["name"] == "parameterHeatmap") eval(result["whichPlotInWhichCanvas"][plt]["plotFunction"])(plt);
				
			}
			
			//drawPlots();
			
		}
		
		if (result["showPlots"] != null) showPlots(result["showPlots"]);


		
		// Update the sequence settings
		if (result["N"] != null) $("#nbasesToSimulate").val(result["N"]);
		if (result["speed"] != null) $("#PreExp").val(result["speed"]);
		$("#SelectSequence").val(seqObject["seqID"]);
		$("#SelectTemplateType").val(seqObject["template"]);
		$("#SelectPrimerType").val(seqObject["primer"]);
		userChangeSequence(openPlots);


		if (seqObject["seqID"] == "$user") {
			$("#UserSequence").val(seqObject["seq"]);
			$('input[name="inputSeqType"][value="inputTemplateSeq"]').click()
			submitCustomSequence(openPlots);
		}



		// Update the ABC panel
		if (experimentalData != null){


			// Reset the ABC DOM
			initABCpanel();

			console.log("experimentalData", experimentalData);
			if(experimentalData["ntrials"] != null) $("#ABCntrials").val(experimentalData["ntrials"]);
			if(experimentalData["RSSthreshold"] != null) $("#ABC_ntestsperdata").val(experimentalData["testsPerData"]);


			for (var fitID in experimentalData["fits"]){


				var dataType = experimentalData["fits"][fitID]["dataType"];

				// Add a new ABC curve
				addNewABCData(dataType);
				var textAreaString = "";


				// Add the force-velocity observations to the DOM
				for (var obsNum = 0; obsNum < experimentalData["fits"][fitID]["vals"].length; obsNum++){
					if (dataType == "forceVelocity"){
						var force = experimentalData["fits"][fitID]["vals"][obsNum]["force"];
						var velocity = experimentalData["fits"][fitID]["vals"][obsNum]["velocity"];
						textAreaString += force + ", " + velocity;
					}

					else if (dataType == "ntpVelocity"){
						var ntp = experimentalData["fits"][fitID]["vals"][obsNum]["ntp"];
						var velocity = experimentalData["fits"][fitID]["vals"][obsNum]["velocity"];
						textAreaString += ntp + ", " + velocity;
					}


					if (obsNum < experimentalData["fits"][fitID]["vals"].length-1) textAreaString += "\n" 

				}


				// Add the NTP concentrations and RSS threshold to the DOM
				$("#ATPconc_" + fitID).val(experimentalData["fits"][fitID]["ATPconc"]);
				$("#CTPconc_" + fitID).val(experimentalData["fits"][fitID]["CTPconc"]);
				$("#GTPconc_" + fitID).val(experimentalData["fits"][fitID]["GTPconc"]);
				$("#UTPconc_" + fitID).val(experimentalData["fits"][fitID]["UTPconc"]);
				$("#ABC_RSS_" + fitID).val(experimentalData["fits"][fitID]["RSSthreshold"]);
				if (dataType == "ntpVelocity") $("#ABC_force_" + fitID).val(experimentalData["fits"][fitID]["force"]);


				$("#" + dataType + "InputData_" + fitID).val(textAreaString);

			}

			validateAllAbcDataInputs();
			
		}


		// Update the model DOM eg. enable hypertranslocation
		updateModelDOM(model);

	
		
	};
	
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => XML_JS.loadSession_WW(XMLData, resolve));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));
	}

	else{
		var res = stringifyFunction("XML_JS.loadSession_WW", [XMLData, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}
	
	
	
}





function showPlot_controller(hidden){

	if (WEB_WORKER == null) {
		PLOTS_JS.showPlot_WW(hidden);
	}else{
		var fnStr = stringifyFunction("PLOTS_JS.showPlot_WW", [hidden]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}

}



function resumeSimulation_controller(){

	if (WEB_WORKER == null) {
		resumeSimulation_WW();
	}else{
		var fnStr = stringifyFunction("resumeSimulation_WW", []);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}

}


function getNTPparametersAndSettings_controller(resolve = function(){}){


	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.getNTPparametersAndSettings_WW(resolve));
		toCall().then((mod) => resolve(mod));
	}

	else{
		var res = stringifyFunction("FE_JS.getNTPparametersAndSettings_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => resolve(mod));

	}



}



function userInputModel_controller(){

	
	// Iterate through the model settings on page and capture their values
	var toSend = {};
	var elements = $(".modelSetting");
	for (var i = 0; i < elements.length; i ++){


		var ele = elements[i];
		var id = $(ele).attr("id");
		var val = $(ele).is(":checked");
		if (id == "NTPbindingNParams") val = (val == true ? 8 : 2); 
		else if (id == "currentTranslocationModel") val = $(ele).val();
		toSend[id] = val;

	}



	var updateDOM = function(mod){

		update_sliding_curve(0);
		update_slipping_curve(0);


		refreshNavigationCanvases();
		
		updateModelDOM(mod);
	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => FE_JS.userInputModel_WW(toSend, resolve));
		toCall().then((mod) => updateDOM(mod));
	}

	else{
		var res = stringifyFunction("FE_JS.userInputModel_WW", [toSend, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => updateDOM(mod));

	}



}


function getCacheSizes_controller(resolve = function(){}){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.getCacheSizes_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("PLOTS_JS.getCacheSizes_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}





function deletePlots_controller(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, resolve){



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.deletePlots_WW(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("PLOTS_JS.deletePlots_WW", [distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}




}



// Uploads the string in tsv format to the posterior distribution
function uploadABC_controller(TSVstring){


	var updateDOM = function(result){


		var success = result["success"];
		if (success){

			console.log("Rendering");
			//$("#ABCoutput").html("");
			onABCStart();
			get_unrendered_ABCoutput_controller();
			validateAllAbcDataInputs();
			drawPlots(true);


		}else{

			console.log("Failed to upload ABC output");
		}

	}


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.uploadABC_WW(TSVstring, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("ABC_JS.uploadABC_WW", [TSVstring, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));


	}







}






function beginABC_controller(abcDataObjectForModel){


	running_ABC = true;
	var updateDOM = function(){

		hideStopButtonAndShow("simulate");
		$("#beginABC_btn").val("Begin ABC");
		$("#beginABC_btn").attr("onclick", "beginABC()");
		$("#ABCntrials").css("cursor", "");
		$("#ABCntrials").css("background-color", "#663399");
		$("#ABCntrials").attr("disabled", false);
		$("#ABC_RSS").css("cursor", "");
		$("#ABC_RSS").css("background-color", "#663399");
		$("#ABC_RSS").attr("disabled", false);
		$("#PreExp").attr("disabled", false);
		$("#PreExp").css("cursor", "");
		$("#PreExp").css("background-color", "#008CBA");
		running_ABC = false;
		simulationRenderingController = false;

		get_unrendered_ABCoutput_controller();


	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.beginABC_WW(abcDataObjectForModel, resolve));
		toCall().then(() => updateDOM());
	}

	else{
		var res = stringifyFunction("ABC_JS.beginABC_WW", [abcDataObjectForModel, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => updateDOM());


		if ($("#PreExp").val() != "ultrafast" && $("#PreExp").val() != "hidden") {
			simulationRenderingController = true;
			renderObjectsUntilReceiveMessage(msgID);
		}

		// If ultrafast mode then the model will tell us when to render
		else{
			simulationRenderingController = false;
		}


	}



}




function get_unrendered_ABCoutput_controller(resolve = function() { }){


	var showRejectedParameters = $("#ABC_showRejectedParameters").prop("checked");


	// Update the ABC output 
	var updateDOM = function(result){

		if (result != null) {



			// Update the counter
			var nTrialsToGo = result["nTrialsToGo"];
			if (nTrialsToGo != parseFloat($("#ABCntrials").val())) $("#ABCntrials").val(nTrialsToGo);


			// Update the numbers of accepted values
			var acceptanceNumber = result["acceptanceNumber"];
			if (acceptanceNumber != null) $("#ABCacceptance_val").html(roundToSF(acceptanceNumber));


			// Update the acceptance percentage
			var acceptancePercentage = result["acceptancePercentage"];
			if (acceptancePercentage != null) $("#ABCacceptancePercentage_val").html(roundToSF(acceptancePercentage));

			// Update the ABC output
			addNewABCRows(result["newLines"]);

		}


		// Hide all the rejected rows if required
		if (showRejectedParameters) $(".ABCrejected").show(0);
		else $(".ABCrejected").hide(0);



		validateAllAbcDataInputs();
		resolve();


	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.get_unrendered_ABCoutput_WW(resolve));
		toCall().then((lines) => updateDOM(lines));
	}

	else{
		var res = stringifyFunction("ABC_JS.get_unrendered_ABCoutput_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((lines) => updateDOM(lines));

	}


}









function get_ABCoutput_controller(resolve = function(lines) { }){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.get_ABCoutput_WW(resolve));
		toCall().then((lines) => resolve(lines));
	}

	else{
		var res = stringifyFunction("ABC_JS.get_ABCoutput_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((lines) => resolve(lines));

	}


}



function getPosteriorDistribution_controller(resolve = function(posterior) { }){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.getPosteriorDistribution_WW(resolve));
		toCall().then((posterior) => resolve(posterior));
	}

	else{
		var res = stringifyFunction("ABC_JS.getPosteriorDistribution_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((posterior) => resolve(posterior));

	}


}