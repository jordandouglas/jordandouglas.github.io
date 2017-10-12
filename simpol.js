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

			-o <folder> : Saves all sequence and plot data into the specified folder. Creates the folder if it does not exist
			-ABC		: Performs an ABC analysis instead of just simulations


			Example: simpol.js session.xml -o path/to/OutputFolder -ABC



*/

initNodeCompilation();

function initNodeCompilation(){
	

	var args = process.argv;
	if (args.length <= 2){
		console.log("Please parse a SimPol session in XML format!");
		return;
	}

	var fs = require('fs');
	var XMLfileDirectory = args[2];
	var outputFolder = null;
	var runABC = false;

	// Parse the optional args
	for(var i = 3; i < args.length; i ++){
		var arg = args[i];
		if (arg == "-o"){
			outputFolder = args[i+1];
			i++;
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


	// Read the XML file
	fs.readFile(XMLfileDirectory, 'utf8', function(err, data) {  
	    if (err) throw err;

	    // Load all the appropriate scripts and initialise the program
	    RUNNING_FROM_COMMAND_LINE = true;
		var WW_JS = require('./src/Model/WebWorker.js');
		WW_JS.init_WW(false);
		WW_JS.loadSessionFromCommandLine(data, runABC, outputFolder);


	});







}









