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



/*

	This file is used to run SimPol from the command line using node.js.
	This will run SimPol without any user interface.


	1) Download and install node.js >= 8 from https://nodejs.org/en/download/

		or on Ubuntu you can use 

			curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
			sudo apt-get install -y nodejs


	2) Configure your simulation settings with the user interface of SimPol. Download the session
	   as an XML file


	3) Call simpol.js from the command line:

		node simpol.js session.xml [optional args]

		Optional arguments:

			-o <folder> 	: Saves all sequence and plot data into the specified folder. Creates the folder if it does not exist
			-ABC			: Performs an ABC analysis instead of just simulations
			-nthreads	n	: Runs an ABC analysis over n workers (and 1 worker is required to be the master worker)
			-i <folder>		: Resumes the MCMC from the specified folder (will not overwrite these log files). This is in the event of the simulation stopping prematurely


			Example: simpol.js session.xml -o path/to/OutputFolder -ABC



*/

initNodeCompilation();


process.on('uncaughtException', function (error) {
	console.log(error.stack);
});


process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});



messageFromWasmToJS = function(msg, msgID){

}


printLogFileLine = function(msg, append){

	//console.log("Received message", msg);
	if (outputFile == null) {
		console.log(msg);
		return;
	}
	
	if (append == 1) fs.appendFileSync(outputFile, msg);
	else fs.writeFileSync(outputFile, msg);

}


function initNodeCompilation(){
	
	fs = require('fs');
	
	
	// Parse the optional args
	var args = process.argv;
	var XMLfileDirectory = null;
	outputFile = null;
	var runMCMC = false;
	var nthreads = 1;
	
	// Remove io related arguments as these cannot be handled by the WebAssembly module
	new_args = [args[0], args[1]];
	for(var i = 2; i < args.length; i ++){

		var arg = args[i];

		if (arg == ">" || arg == "&") break;


		if (arg == "-o"){
			outputFile = args[i+1];
			i++;
		}

		else if (arg == "-i"){
			XMLfileDirectory = args[i+1];
			i++;
		}

		else if (arg == "-nthreads"){
			new_args.push(args[i]);
			new_args.push(args[i+1]);
			nthreads = args[i+1];
			i++;

			if (isNaN(nthreads) || Math.ceil(parseFloat(nthreads)) < 1){
				console.log("Invalid number of threads!");
				return;
			}
		}

		else if (arg == "-MCMC"){
			new_args.push(args[i]);
			runMCMC = true;
		}
		
		else if (arg == "-sim"){
			new_args.push(args[i]);
			runMCMC = false;
		}
		
		else {
			console.log("Invalid arguments!");
			return;
		}
	}
	new_args.push("-wasm");
	process.argv = new_args;
	
	if (XMLfileDirectory == null) {
		console.log("Please parse an inputfile: -i <file.xml>");
		return;
	}

	
	const buf = fs.readFileSync('./simpol_asm.wasm');
	const lib = WebAssembly.compile(new Uint8Array(buf));


	// Parse the XML file now
	fs.readFile(XMLfileDirectory, 'utf8', function(err, XMLfile) {  
		if (err) throw err;
		
		asmjs = require('./simpol_asm.js');
		onRuntimeInitialised = function(){


			// Parse XML file data as a string through the interface
			asmjs.ccall("loadSessionFromXML", null, ["string", "number"], [XMLfile, 1]);
			
			// Main is called automatically upon js exit (no arguments sent directly)
			

		}
		asmjs['onRuntimeInitialized'] = onRuntimeInitialised;
		
		
		
	});


}






