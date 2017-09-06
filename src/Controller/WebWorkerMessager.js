
/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SNAPdragon.

    SNAPdragon is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SNAPdragon is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SNAPdragon.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/









/* Contains all functions which communicate between the controller and the WebWorker
	Note that if the WebWorker is not registered then the functions in WebWorker.js will be called from this page directly
*/


MESSAGE_LISTENER = {};

function register_WebWorker(){

	
	WEB_WORKER = null;
	if(typeof(Worker) !== "undefined") {
        	if(WEB_WORKER == null) {
				try {
            			WEB_WORKER = new Worker("src/Model/WebWorker.js");

            			// Tell the WebWorker to initialise
   						callWebWorkerFunction(function() { init_WW(true); });



				} catch(err){

					// WebWorker failed to register but we must continue to use the variables/functions from the WebWorker.js file anyway
					WEB_WORKER = null;
					removeWebworkerRegistrationHTML();
					console.log('WebWorker registration failed', err);
					$("#browserWWdisabled").show(true);

					// Tell the WebWorker to initialise
   					init_WW(false);
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
		var toCall = () => new Promise((resolve) => refresh_WW(resolve));
		toCall().then((x) => resolve_fn(x));
	}else{
		var res = stringifyFunction("refresh_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => resolve_fn(x));

	}

}


function stop_controller(){



	if (WEB_WORKER == null) {
		stop_WW();
	}else{
		var fnStr = stringifyFunction("stop_WW", []);
		console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}


}


function create_HTMLobject_controller(id, x, y, width, height, src, zIndex = 1){

	
	if (WEB_WORKER == null) {
		create_HTMLobject_WW(id, x, y, width, height, src, zIndex);
	}

	else{
		var fnStr = stringifyFunction("create_HTMLobject_WW", [id, x, y, width, height, src, zIndex]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}


}

function create_pol_controller(x, y, src = "pol"){

	if (WEB_WORKER == null) {
		create_pol_WW(x, y, src);
	}

	else{
		var fnStr = stringifyFunction("create_pol_WW", [x, y, src]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}

}



function flip_base_controller(pos, seq, flipTo){
	if (WEB_WORKER == null) {
		flip_base_WW(pos, seq, flipTo);
	}

	else{
		var fnStr = stringifyFunction("flip_base_WW", [pos, seq, flipTo]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}
}

function create_nucleoprotein_controller(id, x, y){
	if (WEB_WORKER == null) {
		create_nucleoprotein_WW(id, x, y);
	}

	else{
		var fnStr = stringifyFunction("create_nucleoprotein_WW", [id, x, y]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}
}



function create_nucleotide_controller(id, seq, pos, x, y, base, src, hasTP = false, mut = null){


	if (WEB_WORKER == null) {
		create_nucleotide_WW(id, seq, pos, x, y, base, src, hasTP, mut);
	}

	else{
		var fnStr = stringifyFunction("create_nucleotide_WW", [id, seq, pos, x, y, base, src, hasTP, mut]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}


}

function delete_HTMLobj_controller(id){

	if (WEB_WORKER == null) {
		delete_HTMLobj_WW(id);
	}

	else{
		var fnStr = stringifyFunction("delete_HTMLobj_WW", [id]);
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
		var fnStr = stringifyFunction("move_obj_WW", [obj, dx, dy, animationTime]);
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
		move_nt_WW(pos, seq, dx, dy, animationTime);
	}

	else{
		var fnStr = stringifyFunction("move_nt_WW", [pos, seq, dx, dy, animationTime]);
		callWebWorkerFunction(fnStr);
	}

}


function move_obj_from_id_controller(id, dx, dy, animationTime = ANIMATION_TIME_controller){

	if (WEB_WORKER == null) {
		move_obj_from_id_WW(id, dx, dy, animationTime);
	}

	else{
		var fnStr = stringifyFunction("move_obj_from_id_WW", [id, dx, dy, animationTime]);
		callWebWorkerFunction(fnStr);
	}

}


function get_unrenderedObjects_controller(resolve){


	if (WEB_WORKER == null) {
		resolve(get_unrenderedObjects_WW());
	}else{
		var res = stringifyFunction("get_unrenderedObjects_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

}


function get_primerSequence_controller(resolve){

	if (WEB_WORKER == null) {
		resolve(get_primerSequence_WW());
	}else{
		var res = stringifyFunction("get_primerSequence_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

}


function add_pairs_controller(resolve){

	if (WEB_WORKER == null) {
		resolve(add_pairs_WW());
	}else{
		var res = stringifyFunction("add_pairs_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

}


function userInputSequence_controller(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent, resolve){




	if (WEB_WORKER == null) {
		resolve(userInputSequence_WW(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent));

	}else{
		var res = stringifyFunction("userInputSequence_WW", [newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent], true);
		var fnStr = res[0];
		var msgID = res[1];
		callWebWorkerFunction(fnStr, resolve, msgID);
	}


}

function userSelectSequence_controller(newSequenceID, newTemplateType, newPrimerType, resolve){




	if (WEB_WORKER == null) {
		resolve(userSelectSequence_WW(newSequenceID, newTemplateType, newPrimerType));

	}else{
		var res = stringifyFunction("userSelectSequence_WW", [newSequenceID, newTemplateType, newPrimerType], true);
		var fnStr = res[0];
		var msgID = res[1];
		console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	}


}


function refreshPlotDataSequenceChangeOnly_controller(){
	
	if (WEB_WORKER == null) {
		refreshPlotDataSequenceChangeOnly_WW();
	}

	else{
		var fnStr = stringifyFunction("refreshPlotDataSequenceChangeOnly_WW", []);
		callWebWorkerFunction(fnStr);
	}
	
}

function getPlotData_controller(resolve){
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getPlotData_WW(resolve, null));
		toCall().then((dict) => resolve(dict));

	}else{
		var res = stringifyFunction("getPlotData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}
	
}




function setNextBaseToAdd_controller(){


	var setNTP_resolve = function(dict) { setNTP(dict["NTPtoAdd"]) };


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => setNextBaseToAdd_WW(resolve, null));
		toCall().then((dict) => setNTP_resolve(dict));

	}else{
		var res = stringifyFunction("setNextBaseToAdd_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => setNTP_resolve(dict));
	}


}



function userSetNextBaseToAdd_controller(ntpType){

	if (WEB_WORKER == null) {
		userSetNextBaseToAdd_WW(ntpType);
	}

	else{
		var fnStr = stringifyFunction("userSetNextBaseToAdd_WW", [ntpType]);
		callWebWorkerFunction(fnStr);
	}

}

function refreshNTP_controller(){

	if (WEB_WORKER == null) {
		refreshNTP_WW();
	}

	else{
		var fnStr = stringifyFunction("refreshNTP_WW");
		callWebWorkerFunction(fnStr);
	}

}



function getSaveSessionData_controller(resolve){
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getSaveSessionData_WW(resolve));
		toCall().then((dict) => resolve(dict));

	}else{
		var res = stringifyFunction("getSaveSessionData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}
	
}

function get_PHYSICAL_PARAMETERS_controller(resolve = function(dict) {}){



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => get_PHYSICAL_PARAMETERS_WW(resolve));
		toCall().then((dict) => resolve(dict));

	}else{
		var res = stringifyFunction("get_PHYSICAL_PARAMETERS_WW", [null], true);
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
		var toCall = () => new Promise((resolve) => sample_parameters_WW(resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("sample_parameters_WW", [null], true);
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
		var toCall = () => new Promise((resolve) => submitDistribution_WW(paramID, distributionName, distributionParams, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("submitDistribution_WW", [paramID, distributionName, distributionParams, null], true);
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
			update_binding_curve(0);
			update_slipping_curve(0);
			update_activation_curve(0);
		};


		var val = parseFloat($(element).val());
		if ($("#" + paramID).attr("type") == "checkbox") val = $("#" + paramID).is(":checked");

		if (WEB_WORKER == null) {
			var toCall = () => new Promise((resolve) => update_this_parameter_WW(paramID, val, resolve));
			toCall().then((result) => updateDOM(result));
		}

		else{
			var res = stringifyFunction("update_this_parameter_WW", [paramID, val, null], true);
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
	};

	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => updateForce_WW(newFAssist, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else{
		var res = stringifyFunction("updateForce_WW", [newFAssist, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));


	}
	
}







function transcribe_controller(nbasesToTranscribe = null, fastMode = false, resolve = function() { }){


	

	disable_all_buttons();

	if (nbasesToTranscribe == null) nbasesToTranscribe = parseFloat($('#nbasesToSimulate').val());
	console.log("Transcribing", nbasesToTranscribe);

	var clickMisincorporation = false;
	if ($("#deactivateUponMisincorporation").is(":checked")){
		$("#deactivateUponMisincorporation").click();
		clickMisincorporation = true;
	}

	var updateDOM = function(){
		reactivate_buttons();
		setNextBaseToAdd_controller();
		renderObjects();
		if (clickMisincorporation) $("#deactivateUponMisincorporation").click();
		resolve();

	};

	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => transcribe_WW(nbasesToTranscribe, fastMode, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else{
		var res = stringifyFunction("transcribe_WW", [nbasesToTranscribe, fastMode, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));

		renderObjectsUntilReceiveMessage(msgID);

	}

}


function stutter_controller(nbasesToStutter = null, fastMode = false, resolve = function() { }){


	disable_all_buttons();

	if (nbasesToStutter == null) nbasesToStutter = parseFloat($('#nbasesToSimulate').val());
	console.log("Stuttering", nbasesToStutter);

	var updateDOM = function(){
		setNextBaseToAdd_controller();
		renderObjects();
		reactivate_buttons();
		resolve();
	};


	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null ){// || ANIMATION_TIME_controller > 1) {
		var toCall = () => new Promise((resolve) => stutter_WW(nbasesToStutter, fastMode, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else{
		var res = stringifyFunction("stutter_WW", [nbasesToStutter, fastMode, null], true);
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
		enable_buttons();
		set_state_desc();
		update_sliding_curve(1);
		update_slipping_curve(0);
		update_binding_curve(0);
		update_activation_curve(0);
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

		var toCall = () => new Promise((resolve) => forward_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("forward_WW", [state, UPDATE_COORDS, null], true);
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

		console.log("Calling function");

		enable_buttons();
		set_state_desc();
		update_sliding_curve(-1);
		update_slipping_curve(0);
		update_binding_curve(0);
		update_activation_curve(0);
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
		var toCall = () => new Promise((resolve) => backwards_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else{
		var res = stringifyFunction("backwards_WW", [state, UPDATE_COORDS, null], true);
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
		enable_buttons();
		set_state_desc();
		update_sliding_curve(0);
		update_slipping_curve(0);
		update_binding_curve(1);
		update_activation_curve(0);
		setNextBaseToAdd_controller();
		renderObjects();

		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => bindNTP_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("bindNTP_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}


function releaseNTP_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		enable_buttons();
		set_state_desc();
		update_sliding_curve(0);
		update_slipping_curve(0);
		update_binding_curve(-1);
		update_activation_curve(0);
		setNextBaseToAdd_controller();
		renderObjects();

		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => releaseNTP_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("releaseNTP_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

}



function activate_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		enable_buttons();
		set_state_desc();
		update_sliding_curve(0);
		update_slipping_curve(0);
		update_binding_curve(0);
		update_activation_curve(-1);
		renderObjects();
		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => activate_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("activate_WW", [state, UPDATE_COORDS, null], true);
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
		enable_buttons();
		set_state_desc();
		update_sliding_curve(0);
		update_slipping_curve(0);
		update_binding_curve(0);
		update_activation_curve(1);
		renderObjects();
		resolve(x);

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => deactivate_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("deactivate_WW", [state, UPDATE_COORDS, null], true);
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

		enable_buttons();
		set_state_desc();
		update_sliding_curve(0);
		update_slipping_curve(-1, S);
		update_binding_curve(0);
		update_activation_curve(0);
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

		var toCall = () => new Promise((resolve) => slip_left_WW(state, UPDATE_COORDS, S, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("slip_left_WW", [state, UPDATE_COORDS, S, null], true);
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

		enable_buttons();
		set_state_desc();
		update_sliding_curve(0);
		update_slipping_curve(1, S);
		update_binding_curve(0);
		update_activation_curve(0);
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

		var toCall = () => new Promise((resolve) => slip_right_WW(state, UPDATE_COORDS, S, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("slip_right_WW", [state, UPDATE_COORDS, S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}






function changeSpeed_controller(){




	var speed = $("#PreExp").val();


	if (speed != ANIMATION_TIME_controller && ANIMATION_TIME_controller == "hidden") addSequenceLoadingHTML();
	if (speed != "hidden") deleteHiddenModeNotification();

	ANIMATION_TIME_controller = speed;

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



	var updateDOM = function(){
		if (speed != "hidden" && !simulating) renderObjects();
	}



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => changeSpeed_WW(speed, resolve));
		toCall().then(() => updateDOM());
	}

	else{
		var res = stringifyFunction("changeSpeed_WW", [speed, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => updateDOM());

	}

	
}



function getSlidingHeights_controller(resolve = function(heights){ }){

	console.log("Asking for getSlidingHeights_controller");
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getSlidingHeights_WW(true, resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getSlidingHeights_WW", [true, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}



function getBindingHeights_controller(resolve = function(heights){ }){
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getBindingHeights_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getBindingHeights_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}
}

function getActivationHeights_controller(resolve = function(heights){ }){
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getActivationHeights_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getActivationHeights_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));
	}
}


function getStateDiagramInfo_controller(resolve = function(state) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getStateDiagramInfo_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getStateDiagramInfo_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}



function getCurrentState_controller(resolve = function(state) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getCurrentState_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getCurrentState_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}





function startTrials_controller(){



	if ($("#SelectPrimerType").val().substring(0,2) == "ds") return;
	
	if(simulating) return;
	simulating = true;
	
	
	// If the sequence is big and WebWorker is connected then switch to hidden mode for efficiency
	getCurrentState_controller(function(result) {

		var currentState = result["state"];
		
		if ($("#PreExp").val() != "hidden" && WEB_WORKER != null && currentState["nbases"] > 500) changeToHiddenModeAndShowNotification();
		
		
		var ntrials = $("#nbasesToSimulate").val();
		disable_all_buttons();

		// If this is not a webworker and the current speed is ultrafast then set it back to fast otherwise the browser will crash
		changeSpeed_controller();

		$("#numSimSpan").hide(true);
		$("#progressSimSpan").html("<span id='counterProgress'>0</span> / " + ntrials);
		$("#progressSimSpan").show(true);
		lockTheScrollbar("#bases");




		var updateDOM = function(){
			deleteHiddenModeNotification();
			reactivate_buttons();
			setNextBaseToAdd_controller();
			if($("#PreExp").val() != "hidden") renderObjects();
			drawPlots();
			console.log("Updating dom");
			simulating = false;


			$("#numSimSpan").show(true);
			$("#progressSimSpan").html("");
			$("#progressSimSpan").hide(true);
			unlockTheScrollbar("#bases");


			msgID_simulation = null;
			simulationRenderingController = false;

		};

			
		// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
		if (WEB_WORKER == null) {
			var toCall = () => new Promise((resolve) => startTrials_WW(ntrials, resolve));
			toCall().then(() => updateDOM());
		}


		// If it is in asynchronous or hidden mode, then we keep going until the end
		else{
			var res = stringifyFunction("startTrials_WW", [ntrials, null], true);
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
		var toCall = () => new Promise((resolve) => selectPlot_WW(plotNum, value, deleteData, resolve));
		toCall().then((plotData) => updateDOM(plotData));
	}

	else{
		var res = stringifyFunction("selectPlot_WW", [plotNum, value, deleteData, null], true);
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

			functionToCallAfterSaving  = function() { plot_custom(plotNum); };

	}
	
	var updateDom = function(whichPlotInWhichCanvas){
		
		PLOT_DATA["whichPlotInWhichCanvas"] = whichPlotInWhichCanvas;
		functionToCallAfterSaving();
		closePlotSettingsPopup();
	};
	
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => saveSettings_WW(plotNum, plotType, values, resolve));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));
	}

	else{
		var res = stringifyFunction("saveSettings_WW", [plotNum, plotType, values, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}
	



}



function delete_plot_data_controller(plotNum){
	
	
	if (WEB_WORKER == null) {
		delete_plot_data_WW(plotNum);
	}

	else{
		var fnStr = stringifyFunction("delete_plot_data_WW", [plotNum]);
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
		var toCall = () => new Promise((resolve) => getElongationModels_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getElongationModels_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}



}

function getMisbindMatrix_controller(resolve = function(x) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getMisbindMatrix_WW(resolve));
		toCall().then((mod) => resolve(mod));
	}

	else{
		var res = stringifyFunction("getMisbindMatrix_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => resolve(mod));

	}

}

function getMFESequenceBonds_controller(){


	if ($("#PreExp").val() == "hidden") return;

	var updateDOM = function(graphInfo){

		console.log("graphInfo", graphInfo);
		renderSecondaryStructure(graphInfo);
		renderObjects();

	};
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getMFESequenceBonds_WW(resolve));
		toCall().then((graphInfo) => updateDOM(graphInfo));
	}

	else{
		var res = stringifyFunction("getMFESequenceBonds_WW", [null], true);
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

		
		$("#SelectSequence").val(seqObject["seqID"]);
		$("#SelectTemplateType").val(seqObject["template"]);
		$("#SelectPrimerType").val(seqObject["primer"]);
		userChangeSequence();
		if (seqObject["seqID"] == "$user") submitCustomSequence();

		updateModelDOM(model);

		
	};
	
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => loadSession_WW(XMLData, resolve));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));
	}

	else{
		var res = stringifyFunction("loadSession_WW", [XMLData, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}
	
	
	
}





function showPlot_controller(plotNum, hidden){

	if (WEB_WORKER == null) {
		showPlot_WW(plotNum, hidden);
	}else{
		var fnStr = stringifyFunction("showPlot_WW", [plotNum, hidden]);
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




function userInputModel_controller(){

	var elongationModelID = $("#SelectElongationModel").val();
	var translocationModelID = $("#SelectTranslocationModel").val();
	var allowBacktracking = $("#allowBacktracking").is(":checked");
	var allowHypertranslocation = $("#allowHypertranslocation").is(":checked");
	var allowInactivation = $("#allowInactivation").is(":checked");
	var allowBacktrackWithoutInactivation = $("#allowBacktrackWithoutInactivation").is(":checked");
	var deactivateUponMisincorporation = $("#deactivateUponMisincorporation").is(":checked");
	var allowGeometricCatalysis = $("#allowGeometricCatalysis").is(":checked");
	var allowmRNAfolding = $("#allowmRNAfolding").is(":checked");
	var allowMisincorporation = $("#allowMisincorporation").is(":checked");
	



	var updateDOM = function(mod){

		update_sliding_curve(0);
		update_slipping_curve(0);
		update_binding_curve(0);
		update_activation_curve(0);

		updateModelDOM(mod);
	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => userInputModel_WW(elongationModelID, translocationModelID, allowBacktracking, allowHypertranslocation, allowInactivation, allowBacktrackWithoutInactivation, deactivateUponMisincorporation, allowGeometricCatalysis, allowmRNAfolding, allowMisincorporation, resolve));
		toCall().then((mod) => updateDOM(mod));
	}

	else{
		var res = stringifyFunction("userInputModel_WW", [elongationModelID, translocationModelID, allowBacktracking, allowHypertranslocation, allowInactivation, allowBacktrackWithoutInactivation, deactivateUponMisincorporation, allowGeometricCatalysis, allowmRNAfolding, allowMisincorporation, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => updateDOM(mod));

	}



}


function getCacheSizes_controller(resolve = function(){}){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => getCacheSizes_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("getCacheSizes_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}





function deletePlots_controller(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, resolve){



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => deletePlots_WW(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, resolve));
		toCall().then((result) => resolve(result));
	}

	else{
		var res = stringifyFunction("deletePlots_WW", [distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}




}