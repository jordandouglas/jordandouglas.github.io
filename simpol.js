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


function initNodeCompilation(){





	var cluster = require('cluster'); // If more than 1 core then multithread
	var args = process.argv;
	if (args.length <= 2){
		console.log("Please parse a SimPol session in XML format!");
		return;
	}

	var fs = require('fs');
	var XMLfileDirectory = args[2];
	var outputFolder = null;
	var inputFolder = null;
	var runABC = false;
	var nthreads = 1;

	// Parse the optional args
	for(var i = 3; i < args.length; i ++){

		var arg = args[i];

		if (arg == ">" || arg == "&") break;


		if (arg == "-o"){
			outputFolder = args[i+1];
			i++;
		}

		else if (arg == "-i"){
			inputFolder = args[i+1];
			i++;
		}

		else if (arg == "-nthreads"){
			nthreads = args[i+1];
			i++;

			if (isNaN(nthreads) || Math.ceil(parseFloat(nthreads)) < 1){
				console.log("Invalid number of threads!");
				return;
			}
		}

		else if (arg == "-ABC"){
			runABC = true;
		}
		else {
			console.log("Invalid arguments!");
			return;
		}
	}



	if (outputFolder == "") outputFolder = null;





	// Load all the appropriate scripts and initialise the program
	RUNNING_FROM_COMMAND_LINE = true;
	var WW_JS = require('./src/Model/WebWorker.js');
	WW_JS.init_WW(false);
	WW_JS.setOutputFolder(outputFolder);
	WW_JS.setInputFolder(inputFolder);

	if (!runABC && outputFolder != null) PLOTS_JS.initialiseFileNames_CommandLine(); // Initialise the save file names
	//else if (runABC && outputFolder != null) ABC_JS.initialiseFileNames_CommandLine(); // Initialise the save file names


	// Print the welcome message
	var startingTime = new Date(); 
	if (cluster.isMaster){

		console.log("Starting SimPol at", WW_JS.getDateAndTime(startingTime)); 


		if (!runABC && outputFolder != null) PLOTS_JS.initialiseSaveFiles_CommandLine(startingTime); // Initialise the plots.js save files
		//else if (runABC && outputFolder != null) ABC_JS.initialiseSaveFiles_CommandLine(startingTime); // Initialise the ABC posterior save file


		else if (runABC && outputFolder != null) {

			// Create the output folder if it does not already exist
			var fs = require('fs');
			if (!fs.existsSync(outputFolder)){
				console.log("Creating directory", outputFolder);
			    fs.mkdirSync(outputFolder);
			}
		}


		console.log("--------------------------------------");

	}




	// If single core or this is a worker thread then run the analysis
	if (nthreads == 1 || cluster.isWorker){


		var workerID = cluster.isWorker ? cluster.worker.id : null;

		// Read the XML file
		fs.readFile(XMLfileDirectory, 'utf8', function(err, data) {  
		    if (err) throw err;

			WW_JS.loadSessionFromCommandLine(data, runABC, startingTime, nthreads, workerID, function(){
				if (cluster.isWorker) cluster.worker.kill();
				else{
					
					
					var finishingTime = new Date(); 
					var secondToFinish = (finishingTime - startingTime) / 1000;
					
					console.log("--------------------------------------");
					console.log("Finished after " + secondToFinish + "s");
					console.log("Exiting.");	
					
				}
			});
			

		});

	}


	// If this is the master thread then open up other threads. In total there will be n+1 threads (including this one)
	else{


		for (var i = 1; i <= nthreads; i ++){
			cluster.fork();
		}


		var nConnectedWorkers = nthreads;
		cluster.on('disconnect', (worker) => {

  			nConnectedWorkers--;

  			if (nConnectedWorkers == 0){

  				var finishingTime = new Date(); 
				var secondToFinish = (finishingTime - startingTime) / 1000;

				console.log("--------------------------------------");
				console.log("Finished after " + secondToFinish + "s");
				console.log("Exiting.");


				cluster.disconnect();


  			}


		});



	}



}









