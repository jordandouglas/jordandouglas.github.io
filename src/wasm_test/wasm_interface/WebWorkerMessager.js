
MESSAGE_LISTENER = {};

function register_WebWorker(resolve = function() { }){


	WEB_WORKER_WASM = null;
	if(typeof(Worker) !== "undefined") {
        	if(WEB_WORKER_WASM == null) {
				try {

					 // Setup webworker for webassembly
					 if (USE_WASM) WEB_WORKER_WASM = new Worker("Program_wasm.js");
         

				} catch(err){

					// WebWorker failed to register
					WEB_WORKER_WASM = null;
					
					console.log('WebWorker registration failed', err);

				}
        	}


    } else {
       	console.log('WebWorker registration failed');
	
    }

    if (WEB_WORKER_WASM == null) alert("Failed to register WebAssembly");

    // Set up message listeners
    MESSAGE_LISTENER = {};

    if (WEB_WORKER_WASM != null){


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


	WorkerToUse = WEB_WORKER_WASM;
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



/*

	Add interface functions below
*/

function add_controller(n1, n2, resolve){
    
    
    if (WEB_WORKER_WASM != null){
        
    
        var res = stringifyFunction("userInputSequence", [n1, n2], true);
        var fnStr = "wasm_" + res[0];
        var msgID = res[1];
        //console.log("Sending function: " + fnStr);
        var toCall = (fnStr) => new Promise((resolve) => callWebWorkerFunction(fnStr, resolve, msgID));

        toCall(fnStr).then((x) => resolve(x));

    }


}

