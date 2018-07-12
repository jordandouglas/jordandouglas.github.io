

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

MESSAGE_LISTENER = {};

function register_WebWorker(resolve = function() { }){

	
	WEB_WORKER = null;
	WEB_WORKER_WASM = null;
	if(typeof(Worker) !== "undefined") {
        	if(WEB_WORKER == null) {
				try {

					 	 // Setup webworker for webassembly
					    if (USE_WASM) WEB_WORKER_WASM = new Worker("src/asm/WasmInterface.js");
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

    if (WEB_WORKER_WASM == null) USE_WASM = false;

    // Set up message listeners
    MESSAGE_LISTENER = {};
    if (WEB_WORKER != null){


    	// Error handler
	    WEB_WORKER.onerror = function (err) {
	    	console.log("WW error", err);
		}

    	WEB_WORKER.onmessage = function(event) {
			onWebWorkerReceiveMessage(event);
		}

    }


    if (WEB_WORKER_WASM != null){

    	//$("#output_asm").show(true);

    	// Connect to webassembly
		fetch("src/asm/simpol_asm.wasm").then(response =>
			 response.arrayBuffer()
		).then(bytes =>
			WebAssembly.compile(bytes)
		);


   		 // Error handler
	    WEB_WORKER_WASM.onerror = function (err) {
	    	console.log("WASM error", err);
		}

    	WEB_WORKER_WASM.onmessage = function(event) {
			onWebWorkerReceiveMessage(event, resolve);
		}
	
    	

    }  else resolve();



}


function onWebWorkerReceiveMessage(event, resolveAfterWebassemblyInitialised = function() { }){

	//console.log("Received message", event.data);


	if (event.data == "wasm_initialised"){
		console.log("wasm_initialised");
		resolveAfterWebassemblyInitialised();
		return;
	}


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
		//console.log("result", id, result);
		try {
			var resultTemp = JSON.parse(result);
			result = resultTemp;
		}catch(e){
			console.log("Could not parse", result);
			JSON.parse(result);
			return;
		}

		//console.log("Returning JSON ", result);
		obj["resolve"](result);
	}


	// Remove this object from the MESSAGE_LISTENER list
	if (MESSAGE_LISTENER[id] != null && (MESSAGE_LISTENER[id].remove == null || MESSAGE_LISTENER[id].remove == true)) MESSAGE_LISTENER[id] = null;
}



function callWebWorkerFunction(fn, resolve = null, msgID = null, removeAfter = true){


	WorkerToUse = WEB_WORKER;
	var fnStr = "" + fn;
	if (fnStr.substring(0, 5) == "wasm_"){
		WorkerToUse = WEB_WORKER_WASM;
		fnStr = fnStr.substring(5, fnStr.length);
	}

    fnStr = "(" + fnStr + ")";

	// No WebWorker, call function directly
	if(WorkerToUse == null) {
		var result = eval(fnStr)();
		console.log("Resolving", result);
		if (resolve != null) resolve(result);
	}

	else{

		//console.log("Posting msg " + fnStr);

		// If we do not require a response then just send the message
		if (msgID == null) WorkerToUse.postMessage("~X~" + fnStr);

		// Otherwise add this to MESSAGE_LISTENER with a unique id and send the message along with the id
		else{
			MESSAGE_LISTENER[msgID] = {resolve: resolve, remove: removeAfter};
			WorkerToUse.postMessage(msgID + "~X~" + fnStr);

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
	}else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("WW_JS.refresh_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => resolve_fn(x));

	}

	else{

		
		
		var res = stringifyFunction("refresh", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then(() => resolve_fn());
		
	}

}


function stop_controller(resolve = function() { }){



	if (WEB_WORKER == null) {
		resolve(WW_JS.stop_WW());
	}
	
	else if (WEB_WORKER_WASM == null){

		var res = stringifyFunction("WW_JS.stop_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		
		console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then(() => resolve());
	}
	
	else{

		//callWebWorkerFunction(stringifyFunction("WW_JS.stop_WW", [null]));
		
		var res = stringifyFunction("stopWebAssembly", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then(() => setTimeout( function() { resolve(); }, 50) );
		
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
	} else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("WW_JS.get_unrenderedObjects_WW", [], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr, resolve, msgID);
	} else {

		var res = stringifyFunction("getUnrenderedobjects", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
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


function calculateMeanTranslocationEquilibriumConstant_controller(resolve = function() { }){


	var toDoAfter = function(toReturn){
		resolve(toReturn);
	}

	

	if (WEB_WORKER == null) {
		toDoAfter(FE_JS.calculateMeanTranslocationEquilibriumConstant_WW());

	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("FE_JS.calculateMeanTranslocationEquilibriumConstant_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		callWebWorkerFunction(fnStr, toDoAfter, msgID);
	}

	else {
		
		var res = stringifyFunction("calculateMeanTranslocationEquilibriumConstant", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

		toCall(fnStr).then((x) => resolve(x));


	}


}


function getPolymerases_controller(resolve = function(polymerases) { }){

	if (WEB_WORKER_WASM != null) {

		var res = stringifyFunction("getPolymerases", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

		toCall(fnStr).then((x) => resolve(x));

	}

}

// User changes the polymerase in the dropdown list. Only supported on WASM 
function userChangePolymerase_controller(){

	if (WEB_WORKER_WASM != null) {


		var toDoAfterChange = function(){
			refresh();

		}


		var selectedPolymeraseID = $("#SelectPolymerase").val();


		var res = stringifyFunction("userChangePolymerase", [selectedPolymeraseID], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

		toCall(fnStr).then(() => toDoAfterChange());

	}


}



// Calculate DNA curvature
function bendDNA_controller(){

	if (WEB_WORKER_WASM != null) {


		var toDoAfterChange = function(result){
			console.log("DNA bent:", result);

		}



		var res = stringifyFunction("bendDNA", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

		toCall(fnStr).then((x) => toDoAfterChange(x));

	}


}



function userInputSequence_controller(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent, resolve){

	if (WEB_WORKER == null) {
		resolve(WW_JS.userInputSequence_WW(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent));

	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("WW_JS.userInputSequence_WW", [newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent], true);
		var fnStr = res[0];
		var msgID = res[1];
		callWebWorkerFunction(fnStr, resolve, msgID);
	}

	else{
		
	
		var res = stringifyFunction("userInputSequence", [newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

		toCall(fnStr).then((x) => resolve(x));

	}


}

function userSelectSequence_controller(newSequenceID, newTemplateType, newPrimerType, resolve){



	if (WEB_WORKER == null) {
		resolve(WW_JS.userSelectSequence_WW(newSequenceID, newTemplateType, newPrimerType));

	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("WW_JS.userSelectSequence_WW", [newSequenceID, newTemplateType, newPrimerType], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((goodLength) => resolve(goodLength));
	}

	else{
		
	
		var res = stringifyFunction("userSelectSequence", [newSequenceID], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

		toCall(fnStr).then((x) => resolve(x));

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

	}else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("PLOTS_JS.getPlotData_WW", [forceUpdate, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}else{
		
		var res = stringifyFunction("getPlotData", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));

	}
	
}




function setNextBaseToAdd_controller(){


	var setNTP_resolve = function(dict) {
		setNTP(dict["NTPtoAdd"]) 
	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.setNextBaseToAdd_WW(resolve, null));
		toCall().then((dict) => setNTP_resolve(dict));

	}else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("WW_JS.setNextBaseToAdd_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => setNTP_resolve(dict));

	}else{
		var res = stringifyFunction("getNextBaseToAdd", [], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("WW_JS.userSetNextBaseToAdd_WW", [ntpType, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else {
		var res = stringifyFunction("userSetNextBaseToAdd", [ntpType], true);
		var fnStr = "wasm_" + res[0];
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

	}else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("WW_JS.getSaveSessionData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));
	}

	else{

		var res = stringifyFunction("getSaveSessionData", [], true);
		var fnStr = "wasm_" + res[0];
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

	} 

	// Use the js webworker as a model
	else if (WEB_WORKER_WASM == null) {
		
		
		var res = stringifyFunction("PARAMS_JS.get_PHYSICAL_PARAMETERS_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((dict) => resolve(dict));

		
	}

	// Use the webassembly module as a model
	else  {


		callWebWorkerFunction(stringifyFunction("PARAMS_JS.get_PHYSICAL_PARAMETERS_WW", []));
	
		var res = stringifyFunction("getAllParameters", [], true);
		var fnStr = "wasm_" + res[0];
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
	var distributionParamsDict = {};

	switch(distributionName) {
	    case "Fixed":
	    	distributionParams.push(parseFloat($("#fixedDistnVal").val()));
	    	distributionParamsDict.fixedDistnVal = parseFloat($("#fixedDistnVal").val());
	        break;
	    case "Uniform":
	    	distributionParams.push(parseFloat($("#uniformDistnLowerVal").val()));
	    	distributionParams.push(parseFloat($("#uniformDistnUpperVal").val()));
	    	distributionParamsDict.uniformDistnLowerVal = parseFloat($("#uniformDistnLowerVal").val());
	    	distributionParamsDict.uniformDistnUpperVal = parseFloat($("#uniformDistnUpperVal").val());
	        break;
		case "Exponential":
			distributionParams.push(parseFloat($("#exponentialDistnVal").val()));
			distributionParamsDict.exponentialDistnVal = parseFloat($("#exponentialDistnVal").val());
		    break;
		case "Normal":
			distributionParams.push(parseFloat($("#normalMeanVal").val()));
	    	distributionParams.push(parseFloat($("#normalSdVal").val()));
	    	distributionParamsDict.normalMeanVal = parseFloat($("#normalMeanVal").val());
	    	distributionParamsDict.normalSdVal = parseFloat($("#normalSdVal").val());
			break;
		case "Lognormal":
			distributionParams.push(parseFloat($("#lognormalMeanVal").val()));
	    	distributionParams.push(parseFloat($("#lognormalSdVal").val()));
	    	distributionParamsDict.lognormalMeanVal = parseFloat($("#lognormalMeanVal").val());
	    	distributionParamsDict.lognormalSdVal = parseFloat($("#lognormalSdVal").val());
			break;
		case "Gamma":
			distributionParams.push(parseFloat($("#gammaShapeVal").val()));
	    	distributionParams.push(parseFloat($("#gammaRateVal").val()));
	    	distributionParamsDict.gammaShapeVal = parseFloat($("#gammaShapeVal").val());
	    	distributionParamsDict.gammaRateVal = parseFloat($("#gammaRateVal").val());
			break;
		case "DiscreteUniform":
			distributionParams.push(parseFloat($("#uniformDistnLowerVal").val()));
		   	distributionParams.push(parseFloat($("#uniformDistnUpperVal").val()));
		   	distributionParamsDict.uniformDistnLowerVal = parseFloat($("#uniformDistnLowerVal").val());
	    	distributionParamsDict.uniformDistnUpperVal = parseFloat($("#uniformDistnUpperVal").val());
			break;
		case "Poisson":
			distributionParams.push(parseFloat($("#poissonRateVal").val()));
			distributionParamsDict.poissonRateVal = parseFloat($("#poissonRateVal").val());
			break;
	}


	// Function to call when webworker has responded
	var updateDOM = function(PHYSICAL_PARAMETERS_LOCAL){
		closePriorDistributionPopup();


		if (PHYSICAL_PARAMETERS_LOCAL["refreshDOM"]){
			refresh();
			return;
		}
		
		
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

		if (paramID == "FAssist") renderObjects();

		resolve();

		
	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PARAMS_JS.submitDistribution_WW(paramID, distributionName, distributionParams, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else if(WEB_WORKER_WASM == null){
		var res = stringifyFunction("PARAMS_JS.submitDistribution_WW", [paramID, distributionName, distributionParams, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}
	
	else {
		
		callWebWorkerFunction(stringifyFunction("PARAMS_JS.submitDistribution_WW", [paramID, distributionName, distributionParams]));

		// Send to WebAssembly webworker
		var res = stringifyFunction("saveParameterDistribution", [paramID, distributionName, distributionParamsDict], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));
		
	}

}

function update_this_parameter_controller(element){


	

	var paramID = $(element).attr("id");
	// Special case for the assisting force 
	if (WEB_WORKER_WASM == null && paramID == "FAssist"){
		updateForce_controller();
	}else{


		// Function to call when webworker has responded
		var updateDOM = function(result){

			if (result["refreshDOM"]){
				refresh();
				return;
			}

			if (result["val"] == null) result = result[paramID];

			// If this is an NTP concentration or an NTP binding parameter then we also need to resample the next NTP addition event
			//if (paramID.substring(3) == "conc" || paramID == "RateBind" || paramID == "RateMisbind" || paramID == "TransitionTransversionRatio") setNextBaseToAdd_controller();
			
			$(element).val(result["val"]);
			update_sliding_curve(0);
			update_slipping_curve(0);
			refreshNavigationCanvases();
			renderObjects();
		};


		var val = parseFloat($(element).val());



		if ($("#" + paramID).attr("type") == "checkbox") val = $("#" + paramID).is(":checked");

		if (WEB_WORKER == null) {
			var toCall = () => new Promise((resolve) => PARAMS_JS.update_this_parameter_WW(paramID, val, resolve));
			toCall().then((result) => updateDOM(result));
		}

		else if (WEB_WORKER_WASM == null) {
			var res = stringifyFunction("PARAMS_JS.update_this_parameter_WW", [paramID, val, null], true);
			var fnStr = res[0];
			var msgID = res[1];
			var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
			toCall().then((result) => updateDOM(result));

		}

		else {
		
			//callWebWorkerFunction(stringifyFunction("PARAMS_JS.update_this_parameter_WW", [paramID, val]));

			// Send to WebAssembly webworker
			var res = stringifyFunction("saveParameterDistribution", [paramID, "Fixed", {fixedDistnVal: val}], true);
			var fnStr = "wasm_" + res[0];
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

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PARAMS_JS.updateForce_WW(newFAssist, resolve));
		toCall().then(() => updateDOM());
	}


	else {
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
		drawPlots();
		resolve();

	};

	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => OPS_JS.transcribe_WW(nbasesToTranscribe, fastMode, resolve));
		toCall().then(() => updateDOM());
	}


	// If it is in asynchronous or hidden mode, then we keep going until the end
	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.transcribe_WW", [nbasesToTranscribe, fastMode, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then(() => updateDOM());

		renderObjectsUntilReceiveMessage(msgID);

	}


	else{
		var res = stringifyFunction("transcribe", [nbasesToTranscribe], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => updateDOM());

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
		drawPlots();
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
	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("OPS_JS.stutter_WW", [nbasesToStutter, fastMode, null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));

		renderObjectsUntilReceiveMessage(msgID);

	}


	else{
		var res = stringifyFunction("stutter", [nbasesToStutter], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];

		var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall(fnStr).then((x) => updateDOM(x));

		renderObjectsUntilReceiveMessage(msgID);

	}

}


function forward_controller(state = null, UPDATE_COORDS = true, resolve = function() { }){


	if (variableSelectionMode) return resolve(false);

	if ($("#fwdBtn").css("cursor") == "not-allowed") return resolve(false);

	var updateDOM = function(DOMupdates){


		if (DOMupdates != null) {

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

		}


		refreshNavigationCanvases();
		update_sliding_curve(1);
		update_slipping_curve(0);
		renderObjects();
		drawPlots();


		resolve();


	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.forward_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.forward_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("translocateForward", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));
	}


}


function backwards_controller(state = null, UPDATE_COORDS = true, resolve = function() { }){


	if (variableSelectionMode) return resolve(false);

	if ($("#bckBtn").css("cursor") == "not-allowed") return resolve(false);

	var updateDOM = function(DOMupdates){




		if (DOMupdates != null) {
		
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

		}

		//showFoldedRNA_controller(false);
		refreshNavigationCanvases();
		update_sliding_curve(-1);
		update_slipping_curve(0);
		renderObjects();
		//destroySecondaryStructure();
		

	
		resolve();

	};

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => OPS_JS.backwards_WW(state, UPDATE_COORDS, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.backwards_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));
	}


	else{
		var res = stringifyFunction("translocateBackwards", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.bindNTP_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("bindOrCatalyseNTP", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => updateDOM());
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.releaseNTP_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{
		var res = stringifyFunction("releaseOrRemoveNTP", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => updateDOM());
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.activate_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{

		var res = stringifyFunction("activatePolymerase", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.deactivate_WW", [state, UPDATE_COORDS, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{

		var res = stringifyFunction("deactivatePolymerase", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}


function cleave_controller(state = null, UPDATE_COORDS = true, resolve = function(x) { }){

	if (variableSelectionMode) return resolve(false);


	var updateDOM = function(x){
		
		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(0);
		renderObjects();
		resolve(x);

	};

	if (WEB_WORKER_WASM != null) {

		var res = stringifyFunction("cleaveNascentStrand", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}


}







function slip_left_controller(S = 0, state = null, UPDATE_COORDS = true, resolve = function() { }){

	if (variableSelectionMode) return resolve(false);

	//console.log("slip_left_controller", S);

	var updateDOM = function(DOMupdates){

		

		if (DOMupdates != null) {

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

		}

		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(-1, S);
		renderObjects();


		resolve();

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.slip_left_WW(state, UPDATE_COORDS, S, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("OPS_JS.slip_left_WW", [state, UPDATE_COORDS, S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{
		
		var res = stringifyFunction("slipLeft", [S], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

		
	}


}





function slip_right_controller(S = 0, state = null, UPDATE_COORDS = true, resolve = function() { }){

	if (variableSelectionMode) return resolve(false);

	//console.log("slip_right_controller", S);

	var updateDOM = function(DOMupdates){

		
		if (DOMupdates != null) {

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

		}

		refreshNavigationCanvases();
		update_sliding_curve(0);
		update_slipping_curve(1, S);
		renderObjects();


		resolve();

	};

	if (WEB_WORKER == null) {

		var toCall = () => new Promise((resolve) => OPS_JS.slip_right_WW(state, UPDATE_COORDS, S, resolve));
		toCall().then((result) => updateDOM(result));

	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("OPS_JS.slip_right_WW", [state, UPDATE_COORDS, S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else {
		
		var res = stringifyFunction("slipRight", [S], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("WW_JS.changeSpeed_WW", [speed, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((res) => updateDOM(res));

	}

	else {
		
		//callWebWorkerFunction(stringifyFunction("WW_JS.changeSpeed_WW", [speed]));

		var res = stringifyFunction("changeSpeed", [speed], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
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

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("FE_JS.getSlidingHeights_WW", [true, ignoreModelOptions, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else {

		var res = stringifyFunction("getTranslocationEnergyLandscape", [], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("FE_JS.getStateDiagramInfo_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{

		var res = stringifyFunction("getStateDiagramInfo", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

}



function getTemplateSequenceLength_controller(resolve = function(state) { }){

	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => WW_JS.getTemplateSequenceLength_WW(resolve));
		toCall().then((result) => resolve(result));
	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("WW_JS.getTemplateSequenceLength_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		//console.log("Sending function: " + fnStr);
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{
		var res = stringifyFunction("getTemplateSequenceLength", [], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("FE_JS.getTranslocationCanvasData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{

		var res = stringifyFunction("getTranslocationCanvasData", [], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("FE_JS.getNTPCanvasData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{

		var res = stringifyFunction("getNTPCanvasData", [], true);
		var fnStr = "wasm_" + res[0];
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

	else  if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("FE_JS.getDeactivationCanvasData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{

		var res = stringifyFunction("getDeactivationCanvasData", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));


	}

}




function getCleavageCanvasData_controller(resolve = function(result){}){


	if (WEB_WORKER_WASM != null) {

		var res = stringifyFunction("getCleavageCanvasData", [], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("FE_JS.getSlippageCanvasData_WW", [S, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else {
		var res = stringifyFunction("getSlippageCanvasData", [S], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}



function startTrials_controller(){


	if ($("#simulateBtn").hasClass("toolbarIconDisabled")) return;
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
	getTemplateSequenceLength_controller(function(result) {

		
		if ($("#PreExp").val() != "hidden" && WEB_WORKER != null && result["nbases"] > 1000) changeToHiddenModeAndShowNotification();
		
		
		disable_all_buttons();

		// If this is not a webworker and the current speed is ultrafast then set it back to fast otherwise the browser will crash
		changeSpeed_controller();

		$("#numSimSpan").hide(0);
		//$("#progressSimSpan").html("<span id='counterProgress'>0</span> / " + ntrials);
		$("#progressSimSpan").html("<span id='counterProgress'>0</span>%");
		$("#progressSimSpan").show(0);
		$("#progressSimCanvas").show(0);
		//$("progressToolbarCell").css("background-color", "#424f4f");
		lockTheScrollbar("#bases");




		var updateDOM = function(result){
			deleteHiddenModeNotification();
			reactivate_buttons();
			setNextBaseToAdd_controller();
			refreshNavigationCanvases();
			if($("#PreExp").val() != "hidden") renderObjects();
			if (WEB_WORKER_WASM == null) drawPlots();
			//console.log("Updating dom");
			simulating = false;
			hideStopButtonAndShow("simulate");
			update_sliding_curve(0);

			$("#numSimSpan").show(0);
			$("#progressSimSpan").html("");
			$("#progressSimSpan").hide(0);
			$("#progressSimCanvas").hide(0);
			$("#progressSimCanvas").attr("title", "");
			//$("progressToolbarCell").css("background-color", "");
			var canvas = document.getElementById("progressSimCanvas");
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, 90, 22);
			unlockTheScrollbar("#bases");


			msgID_simulation = null;
			simulationRenderingController = false;

		};

			
		// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
		if (WEB_WORKER == null) {
			var toCall = () => new Promise((resolve) => SIM_JS.startTrials_WW(ntrials, resolve));
			toCall().then(() => updateDOM());
		}


		
		// WebWorker. If it is in asynchronous or hidden mode, then we keep going until the end
		else if (WEB_WORKER_WASM == null){
			

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
			
			
		// Run simulations in Webassembly if service is available
		else{
			
			var res = stringifyFunction("startTrials", [ntrials], true);
			var fnStr = "wasm_" + res[0];
			var msgID = res[1];

			var resolve = function(result){
				
				//drawPlotsFromData(result.plots);
				drawPlots();
				setNextBaseToAdd_controller();

				var toDoAfterObjectRender = function() {

					if (result.stop) {
						updateDOM(result);
						MESSAGE_LISTENER[msgID] = null;
					}
					else{
						//MESSAGE_LISTENER[msgID].remove = false;
						if ($("#counterProgress").html() != Math.floor(result.N)) {
							renderParameters(); // Update parameters at the end of each trial
						}

						var progressProportion = result.N / ntrials;
						$("#counterProgress").html(Math.floor(progressProportion * 100));

						$("#progressSimCanvas").attr("title", "Completed " + result.N + " out of " + ntrials + " simulations");
						var canvas = document.getElementById("progressSimCanvas");
						var ctx = canvas.getContext("2d");
						ctx.fillStyle = "#858280"; 
						ctx.fillRect(0,0,progressProportion*90,22); 
						ctx.fill();

						//$("#output_asm").append("<div style='padding:5 5'>Velocity: " + roundToSF(result.meanVelocity, 4) + "bp/s; Time taken: " + roundToSF(result.realTime, 4) + "s; n complete = " + result.N + "</div>"); 


						// Go back to the model when done
						if (result.animationTime > 0){
							var resumeTrialsFnStr = "wasm_" + stringifyFunction("resumeTrials", [msgID]);
							callWebWorkerFunction(resumeTrialsFnStr, null, null, false);
						}

					}

				};

				if(!result.stop && result.animationTime != 0) renderObjects(false, toDoAfterObjectRender);
				else toDoAfterObjectRender();


			}
			

			callWebWorkerFunction(fnStr, resolve, msgID, false);

			// Render every animationFrame unless ultrafast or hidden
			if ($("#PreExp").val() != "ultrafast" && $("#PreExp").val() != "hidden") {
				simulationRenderingController = true;
				//renderObjectsUntilReceiveMessage(msgID);
			}

			// If hidden mode then the model will tell us when to render
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("PLOTS_JS.selectPlot_WW", [plotNum, value, deleteData, true, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((plotData) => updateDOM(plotData));

	}else{


		var res = stringifyFunction("userSelectPlot", [plotNum, value, deleteData], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));


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
			values.push($('input[name=pauseSiteYVariable]:checked').val());
			//console.log("input[name=Yaxis]:checked", $('input[name=Yaxis]:checked').val());
			functionToCallAfterSaving  = function() { plot_time_vs_site(); };
			break;


		case "parameterHeatmap":

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

			values.push($("#selectPosteriorDistn").val());


			// Site specific constraints for X, Y and Z
			if ($('input[name="sitesToRecordX"][value="allSites"]').prop("checked")) values.push("allSites");
			else {
				values.push(convertCommaStringToList($("#sitesToRecord_textboxX").val()));
			}

			if ($('input[name="sitesToRecordY"][value="allSites"]').prop("checked")) values.push("allSites");
			else {
				values.push(convertCommaStringToList($("#sitesToRecord_textboxY").val()));
			}

			if ($('input[name="sitesToRecordZ"][value="allSites"]').prop("checked")) values.push("allSites");
			else {
				values.push(convertCommaStringToList($("#sitesToRecord_textboxZ").val()));
			}


			console.log("values", values);

			functionToCallAfterSaving  = function() { plot_parameter_heatmap(plotNum); };
			break;
			
			
			
		case "tracePlot": 

		
			values.push($("#traceVariableY").val());
		
			if ($('input[name="xRange"][value="automaticX"]').prop("checked")) values.push("automaticX");
			else {
				values.push([$("#xMin_textbox").val(), $("#xMax_textbox").val()]);
			}

			if ($('input[name="yRange"][value="automaticY"]').prop("checked")) values.push("automaticY");
			else {
				values.push([$("#yMin_textbox").val(), $("#yMax_textbox").val()]);
			}
			

			functionToCallAfterSaving  = function() { plot_MCMC_trace(); };
			break;
			
	}
	
	var updateDom = function(result){

		
		if (result.whichPlotInWhichCanvas != null) {
			drawPlotsFromData(result);

		}
		else PLOT_DATA["whichPlotInWhichCanvas"] = result;


		functionToCallAfterSaving();
		closePlotSettingsPopup();
	};
	
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.saveSettings_WW(plotNum, plotType, values, resolve));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));
	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("PLOTS_JS.saveSettings_WW", [plotNum, plotType, values, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}

	else{

		var res = stringifyFunction("savePlotSettings", [plotNum, values], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDom(result));


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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("FE_JS.getElongationModels_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));
		

	}
	
	 else  {
		 
		//callWebWorkerFunction(stringifyFunction("FE_JS.getElongationModels_WW", []));
		 
		var res = stringifyFunction("getModelSettings", [], true);
		var fnStr = "wasm_" + res[0];
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



function showFoldedRNA_controller(toDisplay = null){

	
	// No RNA secondary structure display on mobile phones beause svg is not well supported
	if ($("#PreExp").val() == "hidden" || IS_MOBILE) return;

	if (toDisplay == null) toDisplay = !$("#foldBtnDiv").hasClass("toolbarIconDisabled");

	var updateDOM = function(graphInfo){
		if (toDisplay) {
			$("#foldBtnDiv").addClass("toolbarIconDisabled");
			getMFESequenceBonds_controller();
		}
		else {
			$("#foldBtnDiv").removeClass("toolbarIconDisabled");
			destroySecondaryStructure();
			renderObjects();
		}
		
	};
	
	if (WEB_WORKER == null || WEB_WORKER_WASM == null) {
		getMFESequenceBonds_controller();
		return;
	}
	
	else {

		var res = stringifyFunction("showFoldedRNA", [toDisplay], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];

		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((graphInfo) => updateDOM(graphInfo));
	}
	
}



function getMFESequenceBonds_controller(){

	
	// No RNA secondary structure display on mobile phones beause svg is not well supported
	if ($("#PreExp").val() == "hidden" || IS_MOBILE) return;
	

	var updateDOM = function(graphInfo){

		//console.log("graphInfo", graphInfo);
		renderSecondaryStructure(graphInfo);
		renderObjects();

	};
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => MFE_JS.getMFESequenceBonds_WW(resolve));
		toCall().then((graphInfo) => updateDOM(graphInfo));
	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("MFE_JS.getMFESequenceBonds_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];

		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((graphInfo) => updateDOM(graphInfo));
	}
	
	else {
		

		var res = stringifyFunction("getMFESequenceBonds", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];

		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((graphInfo) => updateDOM(graphInfo));
	}
	
}

function getAllSequences_controller(resolve = function(allSeqs) { }){

	if (WEB_WORKER_WASM == null) {
		resolve(SEQS_JS.all_sequences);
	}

	else{

		var res = stringifyFunction("getSequences", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((seqs) => resolve(seqs));

	}


}

function loadSession_controller(XMLData, resolve = function() { }){


	// console.log("XMLData", XMLData);
	var updateDom = function(result){

		console.log("updateDom", result);

		var seqObject = result["seq"];
		var model = result["model"];
		var compactState = result["compactState"];
		var experimentalData = result["ABC_EXPERIMENTAL_DATA"];

		// console.log("experimentalData", experimentalData);
		
			
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
			
			resolve();
			
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


		// Current polymerase
		if (result.currentPolymerase != null){
			$("#SelectPolymerase").val(result.currentPolymerase);
		}


		// Update the ABC panel
		if (experimentalData != null){



			console.log("experimentalData", experimentalData);

			// Reset the ABC DOM
			initABCpanel();

			if (experimentalData["ntrials"] != null) {
				if (experimentalData["inferenceMethod"] == "ABC") $("#ABCntrials").val(experimentalData["ntrials"]);
				else if (experimentalData["inferenceMethod"] == "MCMC") $("#MCMCntrials").val(experimentalData["ntrials"]);
			}
			if (experimentalData["testsPerData"] != null) {
				if (experimentalData["inferenceMethod"] == "ABC") $("#ABC_ntestsperdata").val(experimentalData["testsPerData"]);
				else if (experimentalData["inferenceMethod"] == "MCMC") $("#MCMC_ntestsperdata").val(experimentalData["testsPerData"]);
			}
			if (experimentalData["burnin"] != null) $("#MCMC_burnin").val(experimentalData["burnin"]);
			if (experimentalData["logEvery"] != null) $("#MCMC_logevery").val(experimentalData["logEvery"]);
			
			if (experimentalData["chiSqthreshold_min"] != null) $("#MCMC_chiSqthreshold_min").val(experimentalData["chiSqthreshold_min"]);
			if (experimentalData["chiSqthreshold_0"] != null) $("#MCMC_chiSqthreshold_0").val(experimentalData["chiSqthreshold_0"]);
			if (experimentalData["chiSqthreshold_gamma"] != null) $("#MCMC_chiSqthreshold_gamma").val(experimentalData["chiSqthreshold_gamma"]);
			

			for (var fitID in experimentalData["fits"]){

				var dataType = experimentalData["fits"][fitID]["dataType"];


				console.log("fitID", fitID, dataType);
				//if ($("[fitid='" + fitID + "']").length > 0) continue;


				// Add a new ABC curve
				addNewABCData(dataType);
				var textAreaString = "";



				// Display gel image if there is one
				if (dataType == "timeGel" && ABC_gel_images_to_load.length > 0){


					// Display first image in the list

					// Create a new type of data
					addNewABCData("timeGel");

		            var img = new Image();
		            img.addEventListener("load", function() {
		            	console.log("Loaded image");
		            	uploadGelFromImage(img, img.fitID);



						// Render the lanes after the image had loaded
						for (var obsNum = 0; obsNum < experimentalData["fits"][fitID]["vals"].length; obsNum++){
							var lane = experimentalData["fits"][fitID]["vals"][obsNum];
							loadLane(fitID, lane.laneNum, lane.time, lane.rectTop, lane.rectLeft, lane.rectWidth, lane.rectHeight, lane.rectAngle, lane.simulateLane, lane.densities);

						}

						drawTimeGelPlotCanvas(fitID);


		            });

		            // Parse the image encoding
		            console.log("Loading image");
	           		img.fitID = fitID;
		            img.src = ABC_gel_images_to_load.shift();
					
				}



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


				// Add the NTP concentrations and chiSq threshold to the DOM
				$("#ATPconc_" + fitID).val(experimentalData["fits"][fitID]["ATPconc"]);
				$("#CTPconc_" + fitID).val(experimentalData["fits"][fitID]["CTPconc"]);
				$("#GTPconc_" + fitID).val(experimentalData["fits"][fitID]["GTPconc"]);
				$("#UTPconc_" + fitID).val(experimentalData["fits"][fitID]["UTPconc"]);
				if (dataType == "ntpVelocity") $("#ABC_force_" + fitID).val(experimentalData["fits"][fitID]["force"]);


				if (dataType != "timeGel") $("#" + dataType + "InputData_" + fitID).val(textAreaString);

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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("XML_JS.loadSession_WW", [XMLData, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));

	}

	else{

		//callWebWorkerFunction(stringifyFunction("XML_JS.loadSession_WW", [XMLData]));

		var res = stringifyFunction("loadSessionFromXML", [XMLData], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((whichPlotInWhichCanvas) => updateDom(whichPlotInWhichCanvas));


	}
	
	
	
}



// Perform MCMC to infer the parameters of the gel lanes (ie. build a linear model of MW vs migration distance)
function gelInference_controller(fitID, priors, resolve = function() { } ){



	hideButtonAndShowStopButton("simulate");
	running_ABC = true;
	var restoreDOM = function(){


		hideStopButtonAndShow("simulate");
		$("#beginABC_btn").val("Resume ABC");
		$("#beginMCMC_btn").val("Resume MCMC-ABC");
		$(".beginABC_btn").attr("onclick", "beginABC()");
		$("#ABCntrials").css("cursor", "");
		$("#ABCntrials").css("background-color", "#008cba");
		$("#ABCntrials").attr("disabled", false);
		$("#MCMCntrials").css("cursor", "");
		$("#MCMCntrials").css("background-color", "#008cba");
		$("#MCMCntrials").attr("disabled", false);
		$("#PreExp").attr("disabled", false);
		$("#PreExp").css("cursor", "");
		$("#PreExp").css("background-color", "#008CBA");
		running_ABC = false;
		simulationRenderingController = false;


		resolve();


	};



	
	if (WEB_WORKER_WASM != null){


		$("#PreExp").val("hidden");
		simulationRenderingController = false;


		onABCStart();





		var toDoAfterInit = function(result){


			// Update the list of posterior distributions and set to the correct one
			getPosteriorDistributionNames(function(posteriorNames){

				$("#selectLoggedPosteriorDistnDIV").show(100);

				for (var p in posteriorNames){
					if ($("#selectLoggedPosteriorDistn_" + p).length == 0) $("#selectLoggedPosteriorDistn").append(`<option id="selectLoggedPosteriorDistn_` + p + `" value="` + p + `" > ` + posteriorNames[p] + `</option>`);
				}
				console.log("result", result.selectedPosteriorID);
				// setCurrentLoggedPosteriorDistributionID_controller();

				if ($("#selectLoggedPosteriorDistn").val() != null && $("#selectLoggedPosteriorDistn").val() != result.selectedPosteriorID){
					ABClines = [];
					ABClinesAcceptedOnly = [];
				}
				$("#selectLoggedPosteriorDistn").val(result.selectedPosteriorID);
				


				updateDOMbetweenTrials(result);

			});


		}


		// To do in between MCMC trials
		var updateDOMbetweenTrials = function(result){

			//console.log("updateDOMbetweenTrials", result);


			drawPlots();
			drawTimeGelPlotCanvas(fitID);


			$("#ABCacceptanceVal").html(roundToSF(result.acceptanceRate));

			/*
			// Update the counter
			var nTrialsToGo = parseFloat(result["nTrialsToGo"]);
			if (nTrialsToGo != parseFloat($("#ABCntrials").val()) && !isNaN(nTrialsToGo)) {
				$("#ABCntrials").val(nTrialsToGo);
				$("#MCMCntrials").val(nTrialsToGo);
			}
			*/

			if (result["lines"] != null) {
				addNewABCRows(result["lines"].split("!"));
			}


			// validateAllAbcDataInputs();



			if (result.stop) {
				restoreDOM();
				MESSAGE_LISTENER[msgID] = null;
			}

			else {

				// Go back to the model when done
				var resumeCalibrationFnStr = "wasm_" + stringifyFunction("resumeGelCalibration", [msgID]);
				var toCall_resume = () => new Promise((resolve) => callWebWorkerFunction(resumeCalibrationFnStr, resolve, msgID, false));
				toCall_resume().then((result) => updateDOMbetweenTrials(result));

			}

		};


		var res = stringifyFunction("initGelCalibration", [fitID, priors], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID, false));
		toCall().then((result) => toDoAfterInit(result));

	}


}


function getGelPosteriorDistribution_controller(fitID, resolve){


	if (WEB_WORKER_WASM != null){

		var res = stringifyFunction("getGelPosteriorDistribution", [fitID], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}


function setCurrentLoggedPosteriorDistributionID_controller(){


	var newID = $("#selectLoggedPosteriorDistn").val();

	var resolve = function(){
		
		get_ABCoutput_controller(newID, function(linesResult) {

			console.log("Rendering");

			ABClines = [];
			ABClinesAcceptedOnly = [];

			addNewABCRows(linesResult.lines.split("!"));
			
		});
	}

	if (WEB_WORKER_WASM != null){

		var res = stringifyFunction("setCurrentLoggedPosteriorDistributionID", [newID], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => resolve());

	}


}


// Show or hide sitewise plot
function showSitewisePlot_controller(hidden){


	if (WEB_WORKER == null) {
		PLOTS_JS.showPlots_WW(hidden);
	}else if (WEB_WORKER_WASM == null){

	}else{
		var fnStr = "wasm_" + stringifyFunction("showSitewisePlot", [hidden]);
		callWebWorkerFunction(fnStr);
	}


}


// Show or hide all plots
function showPlots_controller(hidden){


	if (WEB_WORKER == null) {
		PLOTS_JS.showPlots_WW(hidden);
	}else if (WEB_WORKER_WASM == null){
		var fnStr = stringifyFunction("PLOTS_JS.showPlots_WW", [hidden]);
		//console.log("Sending function: " + fnStr);
		callWebWorkerFunction(fnStr);
	}else{
		var fnStr = "wasm_" + stringifyFunction("showPlots", [hidden]);
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

	else if(WEB_WORKER_WASM == null){
		var res = stringifyFunction("FE_JS.getNTPparametersAndSettings_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => resolve(mod));

	}else{

		var res = stringifyFunction("getParametersAndModelSettings", [], true);
		var fnStr = "wasm_" + res[0];
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

	else if(WEB_WORKER_WASM == null){
		var res = stringifyFunction("FE_JS.userInputModel_WW", [toSend, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((mod) => updateDOM(mod));

	}
	
	else{
		

		
		callWebWorkerFunction(stringifyFunction("FE_JS.userInputModel_WW", [toSend]));
		
		var res = stringifyFunction("setModelSettings", [toSend], true);
		var fnStr = "wasm_" + res[0];
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

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("PLOTS_JS.getCacheSizes_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{

		var res = stringifyFunction("getCacheSizes", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));


	}

}





function deletePlots_controller(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, sequences_cleardata, resolve = function() { }){



	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => PLOTS_JS.deletePlots_WW(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, resolve));
		toCall().then((result) => resolve(result));
	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("PLOTS_JS.deletePlots_WW", [distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}

	else{

		var res = stringifyFunction("deletePlots", [distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, sequences_cleardata], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => resolve(result));

	}


}




// Uploads the string in tsv format to the posterior distribution
function uploadABC_controller(TSVstring){


	//console.log("TSVstring", TSVstring);

	updateABCExperimentalData_controller();
	var updateDOM = function(result){


		var success = result["success"];
		if (success){


			get_ABCoutput_controller(0, function(linesResult) {

				console.log("Rendering");

				//$("#ABCoutput").html("");
				$("#beginMCMC_btn").val("Resume MCMC-ABC");
				addNewABCRows(linesResult.lines.split("!"));


				onABCStart();
				get_unrendered_ABCoutput_controller();
				validateAllAbcDataInputs();
				drawPlots(true);

				if (result.inferenceMethod == "MCMC") addTracePlots();
				
			});




		}else{

			console.log("Failed to upload ABC output");
		}

	}


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.uploadABC_WW(TSVstring, resolve));
		toCall().then((result) => updateDOM(result));
	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("ABC_JS.uploadABC_WW", [TSVstring, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((result) => updateDOM(result));

	}

	else{



		deletePlots_controller(false, false, false, false, true, false, function() {

			var res = stringifyFunction("uploadABC", [TSVstring], true);
			var fnStr = "wasm_" + res[0];
			var msgID = res[1];
			var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
			toCall().then((lines) => updateDOM(lines));


		});

	}

}






function beginABC_controller(abcDataObjectForModel){


	console.log("experimentalData", abcDataObjectForModel);

	hideButtonAndShowStopButton("simulate");
	var showRejectedParameters = $("#ABC_showRejectedParameters").prop("checked");
	running_ABC = true;
	var restoreDOM = function(){


		hideStopButtonAndShow("simulate");
		$("#beginABC_btn").val("Resume ABC");
		$("#beginMCMC_btn").val("Resume MCMC-ABC");
		$(".beginABC_btn").attr("onclick", "beginABC()");
		$("#ABCntrials").css("cursor", "");
		$("#ABCntrials").css("background-color", "#008cba");
		$("#ABCntrials").attr("disabled", false);
		$("#MCMCntrials").css("cursor", "");
		$("#MCMCntrials").css("background-color", "#008cba");
		$("#MCMCntrials").attr("disabled", false);
		$("#PreExp").attr("disabled", false);
		$("#PreExp").css("cursor", "");
		$("#PreExp").css("background-color", "#008CBA");
		running_ABC = false;
		simulationRenderingController = false;

		get_unrendered_ABCoutput_controller();


	};


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.beginABC_WW(abcDataObjectForModel, resolve));
		toCall().then(() => restoreDOM());
	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("ABC_JS.beginABC_WW", [abcDataObjectForModel, null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then(() => restoreDOM());


		if ($("#PreExp").val() != "ultrafast" && $("#PreExp").val() != "hidden") {
			simulationRenderingController = true;
			renderObjectsUntilReceiveMessage(msgID);
		}

		// If ultrafast mode then the model will tell us when to render
		else{
			simulationRenderingController = false;
		}


	}


	else{

		$("#PreExp").val("hidden");
		simulationRenderingController = false;



		// Convert all current settings into XML format and then upload them to set the MCMC settings
		var toCall = () => new Promise((resolve) => getXMLstringOfSession("", resolve));
		toCall().then((XMLData) => {

			loadSessionFromString(XMLData, function() {
			//loadSession_controller(XMLData.replace(/(\r\n|\n|\r)/gm,""), function() {


				onABCStart();

				var toDoAfterInit = function(result){


					// Update the list of posterior distributions and set to the correct one
					getPosteriorDistributionNames(function(posteriorNames){

						$("#selectLoggedPosteriorDistnDIV").show(100);

						for (var p in posteriorNames){
							if ($("#selectLoggedPosteriorDistn_" + p).length == 0) $("#selectLoggedPosteriorDistn").append(`<option id="selectLoggedPosteriorDistn_` + p + `" value="` + p + `" > ` + posteriorNames[p] + `</option>`);
						}
						console.log("result", result.selectedPosteriorID);


						if ($("#selectLoggedPosteriorDistn").val() != null && $("#selectLoggedPosteriorDistn").val() != result.selectedPosteriorID){
							ABClines = [];
							ABClinesAcceptedOnly = [];
						}
						$("#selectLoggedPosteriorDistn").val(result.selectedPosteriorID);


						updateDOMbetweenTrials(result);

					});


				}


				// To do in between MCMC trials
				var updateDOMbetweenTrials = function(result){

					
					drawPlots();

					//console.log("updateDOMbetweenTrials", result);

					$("#ABCacceptanceVal").html(roundToSF(result.acceptanceRate));
					$("#burninStatusVal").html(result.status);
					$("#currentEpsilonVal").html(roundToSF(result.epsilon), 6);



					// Update the counter
					var nTrialsToGo = parseFloat(result["nTrialsToGo"]);
					if (nTrialsToGo != parseFloat($("#ABCntrials").val()) && !isNaN(nTrialsToGo)) {
						$("#ABCntrials").val(nTrialsToGo);
						$("#MCMCntrials").val(nTrialsToGo);
					}


					if (result["newLines"] != null) {



						/*
						// Update the numbers of accepted values
						var acceptanceNumber = result["acceptanceNumber"];
						if (acceptanceNumber != null) $("#ABCacceptance_val").html(roundToSF(acceptanceNumber));


						// Update the acceptance percentage
						var acceptancePercentage = result["acceptancePercentage"];
						if (acceptancePercentage != null) $("#ABCacceptancePercentage_val").html(roundToSF(acceptancePercentage));
						
						// Update ESS
						var ESS = result["ESS"];
						if (ESS != null) $("#ABC_ESS_val").html(roundToSF(ESS));
						*/

						// Update the ABC output
						addNewABCRows(result["newLines"].split("!"));

					}


					// Hide all the rejected rows if required
					if (showRejectedParameters) $(".ABCrejected").show(0);
					else $(".ABCrejected").hide(0);


					validateAllAbcDataInputs();


					//console.log("resumeABC1");

					if (result.stop) {
						restoreDOM();
						MESSAGE_LISTENER[msgID] = null;
					}

					else {

						// Go back to the model when done
						var resumeABCFnStr = "wasm_" + stringifyFunction("resumeABC", [msgID]);
						//callWebWorkerFunction(resumeABCFnStr, null, null, false);
						var toCall_resume = () => new Promise((resolve) => callWebWorkerFunction(resumeABCFnStr, resolve, msgID, false));
						toCall_resume().then((result) => updateDOMbetweenTrials(result));

					}


					

				};

				hideButtonAndShowStopButton("simulate");

				// Start the ABC
				var res = stringifyFunction("initABC", [], true);
				var fnStr = "wasm_" + res[0];
				var msgID = res[1];
				var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID, false));
				toCall().then((result) => toDoAfterInit(result));

			});
		});


	}



}




function get_unrendered_ABCoutput_controller(resolve = function() { }){


	var showRejectedParameters = $("#ABC_showRejectedParameters").prop("checked");


	// Update the ABC output 
	var updateDOM = function(result){

		// Update the counter
		var nTrialsToGo = parseFloat(result["nTrialsToGo"]);
		if (nTrialsToGo != parseFloat($("#ABCntrials").val()) && !isNaN(nTrialsToGo)) {
			$("#ABCntrials").val(nTrialsToGo);
			$("#MCMCntrials").val(nTrialsToGo);
		}



		if (result["newLines"] != null) {


			// Update the numbers of accepted values
			var acceptanceNumber = result["acceptanceNumber"];
			if (acceptanceNumber != null) $("#ABCacceptance_val").html(roundToSF(acceptanceNumber));


			// Update the acceptance percentage
			var acceptancePercentage = result["acceptancePercentage"];
			if (acceptancePercentage != null) $("#ABCacceptancePercentage_val").html(roundToSF(acceptancePercentage));
			
			// Update ESS
			var ESS = result["ESS"];
			if (ESS != null) $("#ABC_ESS_val").html(roundToSF(ESS));
			

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





function get_ABCoutput_controller(posteriorID, resolve = function(lines) { }){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.get_ABCoutput_WW(resolve));
		toCall().then((lines) => resolve(lines));
	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("ABC_JS.get_ABCoutput_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((lines) => resolve(lines));

	}

	else{

		var res = stringifyFunction("getABCoutput", [posteriorID], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((lines) => resolve(lines));


	}


}


function updateABCExperimentalData_controller(){

	var which = "MCMC";
	var abcDataObjectForModel = getAbcDataObject(which)
	if (WEB_WORKER == null) {
		ABC_JS.updateABCExperimentalData_WW(abcDataObjectForModel);
	}else{
		var fnStr = stringifyFunction("ABC_JS.updateABCExperimentalData_WW", [abcDataObjectForModel]);
		callWebWorkerFunction(fnStr);
	}

}


function update_burnin_controller(){



	var burnin = $("#MCMC_burnin").val();
	if (WEB_WORKER == null) {
		MCMC_JS.update_burnin_WW(burnin);
	}else if (WEB_WORKER_WASM == null){
		var fnStr = stringifyFunction("MCMC_JS.update_burnin_WW", [burnin]);
		callWebWorkerFunction(fnStr);
	}else{
		var fnStr = "wasm_" + stringifyFunction("update_burnin", [burnin]);
		callWebWorkerFunction(fnStr);
	}


}


function getPosteriorDistributionNames(resolve = function() { }){
	
	if (WEB_WORKER_WASM != null) {
		var res = stringifyFunction("getPosteriorDistributionNames", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((params) => resolve(params));


	}
	
}




function getParametersInPosteriorDistribution(posteriorID, resolve = function() { }){
	
	if (WEB_WORKER_WASM != null) {
		var res = stringifyFunction("getParametersInPosteriorDistribution", [posteriorID], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((params) => resolve(params));


	}
	
}



function get_ParametersWithPriors_controller(resolve = function() { }){
	
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => MCMC_JS.get_ParametersWithPriors_WW(resolve));
		toCall().then((params) => resolve(params));
	}

	else if (WEB_WORKER_WASM == null) {
		var res = stringifyFunction("MCMC_JS.get_ParametersWithPriors_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((params) => resolve(params));
	}

	else {
		var res = stringifyFunction("getParametersWithPriors", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((params) => resolve(params));


	}
	
	
}


function getPosteriorSummaryData_controller(resolve = function() { }){
	
	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.getPosteriorSummaryData_WW(resolve));
		toCall().then((posterior) => resolve(posterior));
	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("ABC_JS.getPosteriorSummaryData_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((posterior) => resolve(posterior));

	}

	else{

		var res = stringifyFunction("getPosteriorSummaryData", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((posterior) => resolve(posterior));


	}
	
	
}

function getPosteriorDistribution_controller(resolve = function(posterior) { }){


	if (WEB_WORKER == null) {
		var toCall = () => new Promise((resolve) => ABC_JS.getPosteriorDistribution_WW(resolve));
		toCall().then((posterior) => resolve(posterior));
	}

	else if (WEB_WORKER_WASM == null){
		var res = stringifyFunction("ABC_JS.getPosteriorDistribution_WW", [null], true);
		var fnStr = res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((posterior) => resolve(posterior));

	}


	else{


		var res = stringifyFunction("getPosteriorDistribution", [], true);
		var fnStr = "wasm_" + res[0];
		var msgID = res[1];
		var toCall = () => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));
		toCall().then((posterior) => resolve(posterior));


	}


}





