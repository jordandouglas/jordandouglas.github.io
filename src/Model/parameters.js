
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


PHYSICAL_PARAMETERS = {}; // The complete list of parameters which can be tuned using the side navigation menu

PHYSICAL_PARAMETERS["ATPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["CTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["GTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["UTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false};

PHYSICAL_PARAMETERS["hybridLength"] = {distribution:"Fixed", refreshOnChange:true, fixedDistnVal: 7, minVal: 5, name: "Hybrid length (bp)", title: "Number of base pairs inside the polymerase", zeroTruncated: true, integer: true};
PHYSICAL_PARAMETERS["bubbleSizeLeft"] = {distribution:"Fixed", refreshOnChange:true, fixedDistnVal: 2, name: "Bubble length left (bp)",  title: "Number of unpaired template bases 3' of the hybrid", zeroTruncated: true, integer: true, hidden:true};
PHYSICAL_PARAMETERS["bubbleSizeRight"] = {distribution:"Fixed", refreshOnChange:true, fixedDistnVal: 1, name: "Bubble length right (bp)", title: "Number of unpaired template bases 5' of the hybrid", zeroTruncated: true, integer: true, hidden:true};

PHYSICAL_PARAMETERS["GDaggerSlide"] = {distribution:"Fixed", fixedDistnVal: 8.7, name: "\u0394G\u2020slide", title: "Free energy barrier height of translocation", zeroTruncated: false, integer: false};
PHYSICAL_PARAMETERS["GsecondarySitePenalty"] = {distribution:"Fixed", fixedDistnVal: 1.336, name: "\u0394G\u2020NTP2", title: "Free energy penalty of binding NTP in the secondary binding site", zeroTruncated: false, integer: false};
PHYSICAL_PARAMETERS["FAssist"] = {distribution:"Fixed", fixedDistnVal: 0, name: "Fassist (pN)", title: "Assisting force", zeroTruncated: false, integer: false};
PHYSICAL_PARAMETERS["arrestTimeout"] = {distribution:"Fixed", fixedDistnVal: 60, name: "Arrest timeout (s)", title: "Maximum pause duration before the simulation is arrested. Set to zero to prevent arrests.", zeroTruncated: true, integer: false};


PHYSICAL_PARAMETERS["RateBind"] = {distribution:"Fixed", fixedDistnVal: 250, name: "Rate bind (\u03bcM\u207B\u00B9 s\u207B\u00B9)", title: "Second order rate constant of binding the correct NTP", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["RateUnbind"] = {distribution:"Fixed", fixedDistnVal: 1000, name: "Rate unbind (s\u207B\u00B9)", title: "Rate constant of releasing bound NTP", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["RatePolymerise"] = {distribution:"Fixed", fixedDistnVal: 30, normalSdVal: 5, name: "Rate of catalysis (s\u207B\u00B9)", title: "Rate constant of catalysing bound NTP", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["RateMisbind"] = {distribution:"Fixed", fixedDistnVal: 0.25, name: "Rate misbind (\u03bcM\u207B\u00B9 s\u207B\u00B9)", title: "Second order rate constant of NTP mis-binding which can lead to transition/transversion mutations", zeroTruncated: true, integer: false, hidden:true};
PHYSICAL_PARAMETERS["TransitionTransversionRatio"] = {distribution:"Fixed", fixedDistnVal: 2, name: "Transition:transversion", title: "How much more likely is a transition mis-binding event than a transversion mis-binding event", zeroTruncated: true, integer: false, hidden:true};


PHYSICAL_PARAMETERS["kU"] = {distribution:"Fixed", fixedDistnVal: 0.23, name: "kU (s\u207B\u00B9)", title: "Rate constant of polymerase entering the unactive state", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["kA"] = {distribution:"Fixed", fixedDistnVal: 3, name: "kA (s\u207B\u00B9)", title: "Rate constant of polymerase leaving the unactive state", zeroTruncated: true, integer: false};
PHYSICAL_PARAMETERS["kUspecial"] = {distribution:"Fixed", fixedDistnVal: 1, name: "kU' (s\u207B\u00B9)", title: "Rate of entry into unactivated state multiplier at edit site", zeroTruncated: true, integer: false, hidden:true};
PHYSICAL_PARAMETERS["kAspecial"] = {distribution:"Fixed", fixedDistnVal: 1, name: "kA' (s\u207B\u00B9)", title: "Rate of entry into activated state multiplier at edit site", zeroTruncated: true, integer: false, hidden:true};

PHYSICAL_PARAMETERS["nbasesToFold"] = {distribution:"Fixed", fixedDistnVal: 150, name: "Number of bases to fold", title: "The number of most recently added bases in the nascent strand to fold", zeroTruncated: true, integer: true, maxVal: 300, hidden:true};



PHYSICAL_PARAMETERS["GDaggerDiffuse"] = {distribution:"Fixed", fixedDistnVal: 15, name: "\u0394G\u2020slip", title: "Free energy barrier height of bulge formation and diffusion in the primer sequence", zeroTruncated: false, integer: false};
PHYSICAL_PARAMETERS["allowMultipleBulges"] = { distribution: "Fixed", fixedDistnVal:false, binary: true, title: "Allow more than 1 bulge in the primer at a time?", name: "allowMultipleBulges"};



function initParameters_WW(){
	
	for (var paramID in PHYSICAL_PARAMETERS){
		if (PHYSICAL_PARAMETERS[paramID]["val"] == null) PHYSICAL_PARAMETERS[paramID]["val"] = PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"];
	}

	refreshNTP_WW();
	
	
}


function get_PHYSICAL_PARAMETERS_WW(resolve = function(dict) { }, msgID = null){

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(PHYSICAL_PARAMETERS));
		return;
	}
	return resolve(PHYSICAL_PARAMETERS);

}



function setStructuralParameters_WW(){
	
	
	PHYSICAL_PARAMETERS["hybridLength"]["hidden"] = false;
	PHYSICAL_PARAMETERS["bubbleSizeLeft"]["hidden"] = false;
	PHYSICAL_PARAMETERS["bubbleSizeRight"]["hidden"] = false;
	
	
	// Only show the bubble size parameters if the template is double stranded
	if (all_sequences[sequenceID]["template"].substring(0,2) != "ds"){
		PHYSICAL_PARAMETERS["bubbleSizeLeft"]["hidden"] = true;
		PHYSICAL_PARAMETERS["bubbleSizeRight"]["hidden"] = true;
	}
	
	
	// If nascent sequence is ds then don't show hybrid length or bubblesize left
	if (all_sequences[sequenceID]["primer"].substring(0,2) == "ds"){
		PHYSICAL_PARAMETERS["bubbleSizeLeft"]["hidden"] = true;
		PHYSICAL_PARAMETERS["hybridLength"]["hidden"] = true;
	}
	
	
	// If the new sequence has a default parameter value then it will override the current one 
	if (all_sequences[sequenceID]["hybridLength"] != null) {
		PHYSICAL_PARAMETERS["hybridLength"]["fixedDistnVal"] = all_sequences[sequenceID]["hybridLength"];
		PHYSICAL_PARAMETERS["hybridLength"]["val"] = all_sequences[sequenceID]["hybridLength"];
	}else{
		PHYSICAL_PARAMETERS["hybridLength"]["fixedDistnVal"] = 9;
		PHYSICAL_PARAMETERS["hybridLength"]["val"] = 9;
	}
	
	

	
}


function refreshNTP_WW(){

	console.log("needToRefreshNTPParameters", needToRefreshNTPParameters);
	if(!needToRefreshNTPParameters) return;
	if (all_sequences[sequenceID]["primer"].substring(2) == "RNA"){
		
		
		PHYSICAL_PARAMETERS["ATPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"] = 3152;
		PHYSICAL_PARAMETERS["ATPconc"]["normalSdVal"] = 1698;
		PHYSICAL_PARAMETERS["ATPconc"]["name"] = "[ATP] (\u03bcM)";
		PHYSICAL_PARAMETERS["ATPconc"]["title"] = "Cellular concentration of ATP";
		PHYSICAL_PARAMETERS["ATPconc"]["val"] = PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"];
		
		PHYSICAL_PARAMETERS["CTPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"] = 278;
		PHYSICAL_PARAMETERS["CTPconc"]["normalSdVal"] = 242;
		PHYSICAL_PARAMETERS["CTPconc"]["name"] = "[CTP] (\u03bcM)";
		PHYSICAL_PARAMETERS["CTPconc"]["title"] = "Cellular concentration of CTP";
		PHYSICAL_PARAMETERS["CTPconc"]["val"] = PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"];
		
		PHYSICAL_PARAMETERS["GTPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"] = 468;
		PHYSICAL_PARAMETERS["GTPconc"]["normalSdVal"] = 224;
		PHYSICAL_PARAMETERS["GTPconc"]["name"] = "[GTP] (\u03bcM)";
		PHYSICAL_PARAMETERS["GTPconc"]["title"] = "Cellular concentration of GTP";
		PHYSICAL_PARAMETERS["GTPconc"]["val"] = PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"];
		
		PHYSICAL_PARAMETERS["UTPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"] = 567;
		PHYSICAL_PARAMETERS["UTPconc"]["normalSdVal"] = 460;
		PHYSICAL_PARAMETERS["UTPconc"]["name"] = "[UTP] (\u03bcM)";
		PHYSICAL_PARAMETERS["UTPconc"]["title"] = "Cellular concentration of UTP";
		PHYSICAL_PARAMETERS["UTPconc"]["val"] = PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"];
		

		
	}else{
		
		PHYSICAL_PARAMETERS["ATPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"] = 24;
		PHYSICAL_PARAMETERS["ATPconc"]["normalSdVal"] = 22;
		PHYSICAL_PARAMETERS["ATPconc"]["name"] = "[dATP] (\u03bcM)";
		PHYSICAL_PARAMETERS["ATPconc"]["title"] = "Cellular concentration of dATP";
		PHYSICAL_PARAMETERS["ATPconc"]["val"] = PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"];

		PHYSICAL_PARAMETERS["CTPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"] = 29;
		PHYSICAL_PARAMETERS["CTPconc"]["normalSdVal"] = 19;
		PHYSICAL_PARAMETERS["CTPconc"]["name"] = "[dCTP] (\u03bcM)";
		PHYSICAL_PARAMETERS["CTPconc"]["title"] = "Cellular concentration of dCTP";
		PHYSICAL_PARAMETERS["CTPconc"]["val"] = PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"];

		PHYSICAL_PARAMETERS["GTPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"] = 5.2;
		PHYSICAL_PARAMETERS["GTPconc"]["normalSdVal"] = 4.5;
		PHYSICAL_PARAMETERS["GTPconc"]["name"] = "[dGTP] (\u03bcM)";
		PHYSICAL_PARAMETERS["GTPconc"]["title"] = "Cellular concentration of dGTP";
		PHYSICAL_PARAMETERS["GTPconc"]["val"] = PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"];

		PHYSICAL_PARAMETERS["UTPconc"]["distribution"] = "Fixed";
		PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"] = 37;
		PHYSICAL_PARAMETERS["UTPconc"]["normalSdVal"] = 30;
		PHYSICAL_PARAMETERS["UTPconc"]["name"] = "[dTTP] (\u03bcM)";
		PHYSICAL_PARAMETERS["UTPconc"]["title"] = "Cellular concentration of dTTP";
		PHYSICAL_PARAMETERS["UTPconc"]["val"] = PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"];
	
	}

	needToRefreshNTPParameters = false;
	initMisbindingMatrix();
	

}




// Change the value of a parameter via the non-popup textbox
function update_this_parameter_WW(paramID, fixedVal, resolve = function(toReturn) {}, msgID = null){
	
	
	var toReturn = {refresh: false}

	var initialVal = PHYSICAL_PARAMETERS[paramID]["val"];
	
	if (PHYSICAL_PARAMETERS[paramID]["integer"] != null && PHYSICAL_PARAMETERS[paramID]["integer"]) fixedVal = Math.ceil(fixedVal);
	
	// Do not accept the change if it is out of range
	if (!PHYSICAL_PARAMETERS[paramID]["zeroTruncated"] || (PHYSICAL_PARAMETERS[paramID]["zeroTruncated"] && fixedVal > 0)) {
	
	
		// Change the values
		PHYSICAL_PARAMETERS[paramID]["val"] = fixedVal;
		PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"] = fixedVal;
		
		// Some parameters require a refresh
		toReturn["refresh"] = PHYSICAL_PARAMETERS[paramID]["refreshOnChange"] != null && PHYSICAL_PARAMETERS[paramID]["refreshOnChange"];


	}
	
	else fixedVal = PHYSICAL_PARAMETERS[paramID]["val"]
	
	
	toReturn["val"] = fixedVal;


	// Recalculate misincorporation transition matrix 
	if (paramID.substring(3) == "conc" || paramID == "RateBind" || paramID == "RateMisbind" || paramID == "TransitionTransversionRatio"){
		initMisbindingMatrix();
	}
	
	
	// If the parameter has been changed and it will affect translocation rates then we calculate everything again
	if (initialVal != PHYSICAL_PARAMETERS[paramID]["val"] && (paramID == "GDaggerSlide" || paramID == "FAssist" || paramID == "hybridLength" || paramID == "bubbleSizeLeft" || paramID == "bubbleSizeRight" || paramID == "nbasesToFold")){
		translocationCacheNeedsUpdating = true; // Recalculate the translocation rate cache
	}



	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
		return;
	}
	else resolve(toReturn);

}


function sample_parameters_WW(resolve = function(){ }, msgID = null){
	for (var paramID in PHYSICAL_PARAMETERS) sample_parameter_WW(paramID);
}



function rpoiss(rate, aboveZero = false, minVal = null, maxVal = null){
	
	if (aboveZero == null) aboveZero = false;
	
	var minPossibleValue = minVal != null ? minVal : aboveZero ? 1 : 0;

	var getAVal = function(rate){
		var count = minPossibleValue;
		var timeRemaining = 1;
		while(true){
			timeRemaining -= new Random(Math.ceil(mersenneTwister.random() * 1e6)).exponential(rate);
			if (timeRemaining > 0) count ++;
			else break;
		}
		return count;
	};
	
	var toReturn = getAVal(rate);
	if(maxVal != null && toReturn > maxVal) toReturn = maxVal;
	
	return toReturn;
	

}



function sample_parameter_WW(paramID, resolve = function() { }, msgID = null){

	// The Random() function sometimes generates the same number multiple times in a row if you do not use a seed 
	// (which will often give different parameters the same value if they have the same distribution)
	

	var initialVal = PHYSICAL_PARAMETERS[paramID]["val"];
	switch(PHYSICAL_PARAMETERS[paramID]["distribution"]) {
	    case "Fixed":
	        PHYSICAL_PARAMETERS[paramID]["val"] = PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"];
	        break;
	
	    case "Uniform":
	        PHYSICAL_PARAMETERS[paramID]["val"] = new Random(Math.ceil(mersenneTwister.random() * 1e6)).uniform(PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"], PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"]);
	        break;
	
		case "Exponential":
		    PHYSICAL_PARAMETERS[paramID]["val"] = new Random(Math.ceil(mersenneTwister.random() * 1e6)).exponential(PHYSICAL_PARAMETERS[paramID]["ExponentialDistnVal"]);
		    break;
		
		case "Normal": // May have to repeatedly resample if this parameter is zero-truncated
			var value = new Random(Math.ceil(mersenneTwister.random() * 1e6)).normal(PHYSICAL_PARAMETERS[paramID]["normalMeanVal"], PHYSICAL_PARAMETERS[paramID]["normalSdVal"]);
			while (value <= 0 && PHYSICAL_PARAMETERS[paramID]["zeroTruncated"]) value = new Random(Math.ceil(mersenneTwister.random() * 1e6)).normal(PHYSICAL_PARAMETERS[paramID]["normalMeanVal"], PHYSICAL_PARAMETERS[paramID]["normalSdVal"]);
			PHYSICAL_PARAMETERS[paramID]["val"] = value;
			break;
			
		case "Lognormal": // Generate a normal(mean, sd) and then take the exp of it
			PHYSICAL_PARAMETERS[paramID]["val"] = Math.exp(new Random(Math.ceil(mersenneTwister.random() * 1e6)).normal(PHYSICAL_PARAMETERS[paramID]["lognormalMeanVal"], PHYSICAL_PARAMETERS[paramID]["lognormalSdVal"]));
			break;
			
		case "Gamma": 
			PHYSICAL_PARAMETERS[paramID]["val"] = new Random(Math.ceil(mersenneTwister.random() * 1e6)).gamma(PHYSICAL_PARAMETERS[paramID]["gammaShapeVal"], 1/PHYSICAL_PARAMETERS[paramID]["gammaRateVal"]);
			break;
			
		case "DiscreteUniform": 
			PHYSICAL_PARAMETERS[paramID]["val"] = Math.max(1, PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] + Math.floor(mersenneTwister.random() * (1 + PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] - PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"])));
			break;	
			
		case "Poisson": 
			PHYSICAL_PARAMETERS[paramID]["val"] = rpoiss(PHYSICAL_PARAMETERS[paramID]["poissonRateVal"], PHYSICAL_PARAMETERS[paramID]["zeroTruncated"], PHYSICAL_PARAMETERS[paramID]["minVal"], PHYSICAL_PARAMETERS[paramID]["maxVal"]);
			break;
			
			
	    default:
	        PHYSICAL_PARAMETERS[paramID]["val"] = PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"];
	}


	if (paramID.substring(3) == "conc" || paramID == "RateBind" || paramID == "RateMisbind" || paramID == "TransitionTransversionRatio"){
		initMisbindingMatrix();
	}
	
	// If a parameter has been changed and it will affect translocation rates then we calculate everything again
	if (initialVal != PHYSICAL_PARAMETERS[paramID]["val"] && (paramID == "GDaggerSlide" || paramID == "FAssist" || paramID == "hybridLength" || paramID == "bubbleSizeLeft" || paramID == "bubbleSizeRight" || paramID == "nbasesToFold")){
		translocationCacheNeedsUpdating = true;
	}
	

	if (msgID != null){
		postMessage(msgID + "~X~done");
		return;
	}
	resolve();


	// Random gamma	console.log("rgamma", stream1.gamma(0.1, 0.2), new Random().gamma(0.1, 0.2));

	
}





function submitDistribution_WW(paramID, distributionName, distributionParams, resolve = function(dict) {}, msgID = null){
	
	
	PHYSICAL_PARAMETERS[paramID]["distribution"] = distributionName;


	switch(PHYSICAL_PARAMETERS[paramID]["distribution"]) {
	    case "Fixed":
			if (PHYSICAL_PARAMETERS[paramID]["integer"] != null && PHYSICAL_PARAMETERS[paramID]["integer"] && distributionParams[0] <= 0) distributionParams[0] = 1;
			if (PHYSICAL_PARAMETERS[paramID]["minVal"] != null && distributionParams[0] < PHYSICAL_PARAMETERS[paramID]["minVal"]) distributionParams[0] = PHYSICAL_PARAMETERS[paramID]["minVal"];
			if (PHYSICAL_PARAMETERS[paramID]["maxVal"] != null && distributionParams[0] > PHYSICAL_PARAMETERS[paramID]["maxVal"]) distributionParams[0] = PHYSICAL_PARAMETERS[paramID]["maxVal"];
	        PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"] = distributionParams[0];
	        break;
	    case "Uniform":
			if (PHYSICAL_PARAMETERS[paramID]["integer"] != null && PHYSICAL_PARAMETERS[paramID]["integer"] && distributionParams[0] <= 0) distributionParams[0] = 1;
			if (PHYSICAL_PARAMETERS[paramID]["minVal"] != null && distributionParams[0] < PHYSICAL_PARAMETERS[paramID]["minVal"]) distributionParams[0] = PHYSICAL_PARAMETERS[paramID]["minVal"];
			if (PHYSICAL_PARAMETERS[paramID]["maxVal"] != null && distributionParams[1] > PHYSICAL_PARAMETERS[paramID]["maxVal"]) distributionParams[1] = PHYSICAL_PARAMETERS[paramID]["maxVal"];
			if (distributionParams[0] >= distributionParams[1]) distributionParams[1] = distributionParams[0] + 1;
	        PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] = distributionParams[0];
			PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] = distributionParams[1];
	        break;
		case "Exponential":
			if (distributionParams[0] <= 0) distributionParams[0] = 1;
		    PHYSICAL_PARAMETERS[paramID]["ExponentialDistnVal"] = distributionParams[0];
		    break;
		case "Normal":
			if (distributionParams[1] <= 0) distributionParams[1] = 1;
			PHYSICAL_PARAMETERS[paramID]["normalMeanVal"] = distributionParams[0];
			PHYSICAL_PARAMETERS[paramID]["normalSdVal"] = distributionParams[1];
			break;
		case "Lognormal":
			PHYSICAL_PARAMETERS[paramID]["lognormalMeanVal"] = distributionParams[0];
			if (distributionParams[1] <= 0) distributionParams[1] = 0.5;
			PHYSICAL_PARAMETERS[paramID]["lognormalSdVal"] = distributionParams[1];
			break;
		case "Gamma":
			if (distributionParams[0] <= 0) distributionParams[0] = 1;
			if (distributionParams[1] <= 0) distributionParams[1] = 2;
			PHYSICAL_PARAMETERS[paramID]["gammaShapeVal"] = distributionParams[0];
			PHYSICAL_PARAMETERS[paramID]["gammaRateVal"] = distributionParams[1];
			break;
		case "DiscreteUniform":
			if (PHYSICAL_PARAMETERS[paramID]["integer"] != null && PHYSICAL_PARAMETERS[paramID]["integer"] && distributionParams[0] <= 0) distributionParams[0] = 1;
			if (PHYSICAL_PARAMETERS[paramID]["minVal"] != null && distributionParams[0] < PHYSICAL_PARAMETERS[paramID]["minVal"]) distributionParams[0] = PHYSICAL_PARAMETERS[paramID]["minVal"];
			if (PHYSICAL_PARAMETERS[paramID]["maxVal"] != null && distributionParams[1] > PHYSICAL_PARAMETERS[paramID]["maxVal"]) distributionParams[1] = PHYSICAL_PARAMETERS[paramID]["maxVal"];
			if (distributionParams[0] >= distributionParams[1]) distributionParams[1] = distributionParams[0] + 1;
			PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] = distributionParams[0];
			PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] = distributionParams[1];
			break;			
		case "Poisson":
			if (distributionParams[0] <= 0) distributionParams[0] = 1;
			PHYSICAL_PARAMETERS[paramID]["poissonRateVal"] = distributionParams[0];
			break;			
			
	    default:
	        PHYSICAL_PARAMETERS[paramID]["val"] = 1;
	}
	
	sample_parameter_WW(paramID);


	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(PHYSICAL_PARAMETERS));
	}

	else resolve(PHYSICAL_PARAMETERS);
		
	
}






function updateForce_WW(newFAssist = null, resolve = function() { }, msgID = null){



	
	// If the new force is unitialised then generate the force objects again
	if (newFAssist == null){
		
		if (PHYSICAL_PARAMETERS["FAssist"]["val"] != 0) add_force_equipment_WW(PHYSICAL_PARAMETERS["FAssist"]["val"]);
		else remove_force_equipment_WW();
		
	}
	

	// If force is added/removed then create/rmemove the force equipment
	else if (PHYSICAL_PARAMETERS["FAssist"]["val"] == 0 && newFAssist != 0){
		add_force_equipment_WW(newFAssist);
	}
	
	else if (PHYSICAL_PARAMETERS["FAssist"]["val"] != 0 && newFAssist == 0){
		remove_force_equipment_WW();
	}
	
	// If force changes then change the arrows
	else if (PHYSICAL_PARAMETERS["FAssist"]["val"] != 0 && newFAssist != 0 && PHYSICAL_PARAMETERS["FAssist"]["val"] != newFAssist){
		
		
		
		// Set arrow size
		var arrowSize = getArrowSize_WW(newFAssist);
		
		if (HTMLobjects["forceArrow1"] == null){
			
			var arrowSrc = newFAssist < 0 ? "leftForce" : "rightForce";
			create_HTMLobject_WW("forceArrow1", HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200,               HTMLobjects["pol"]["y"]  + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc);
			create_HTMLobject_WW("forceArrow2", HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200 + 2*arrowSize, HTMLobjects["pol"]["y"]  + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc);
			
		}else{
		

		
			// Set arrow direction
			if (PHYSICAL_PARAMETERS["FAssist"]["val"] > 0 && newFAssist < 0){
			
				change_src_of_object_WW(HTMLobjects["forceArrow1"], "leftForce");
				change_src_of_object_WW(HTMLobjects["forceArrow2"], "leftForce");

			//$("#forceArrow1").attr("src", "src/Images/leftForce.png");
			//$("#forceArrow2").attr("src", "src/Images/leftForce.png");
			
			}else if (PHYSICAL_PARAMETERS["FAssist"]["val"] < 0 && newFAssist > 0){
			
				change_src_of_object_WW(HTMLobjects["forceArrow1"], "rightForce");
				change_src_of_object_WW(HTMLobjects["forceArrow2"], "rightForce");

			}
		}

	}

	if (newFAssist != null){
		PHYSICAL_PARAMETERS["FAssist"]["val"] = newFAssist;
		PHYSICAL_PARAMETERS["FAssist"]["fixedDistnVal"] = newFAssist;
		initTranslocationRateCache(); // Recalculate the translocation rate cache when the force changes
	}




	if (msgID != null){
		postMessage(msgID + "~X~done");
	}

	else resolve();
	
	
}


function getArrowSize_WW(force){
	var minArrowSize = 30;
	var maxArrowSize = 60;
	var maxForceSize = 50;
	return Math.min(Math.abs(force) / maxForceSize, 1) * (maxArrowSize - minArrowSize) + minArrowSize;

}


function remove_force_equipment_WW(){
	
	delete_HTMLobj_WW("leftBead");
	delete_HTMLobj_WW("rightBead");
	delete_HTMLobj_WW("tweezer");
	delete_HTMLobj_WW("forceArrow1");
	delete_HTMLobj_WW("forceArrow2");
		
}


function add_force_equipment_WW(forceSize){



	// Add the beads
	create_HTMLobject_WW("leftBead",  templateSequence[1]["x"] - 75, 3, 150, 150, "bead", 0);
	create_HTMLobject_WW("rightBead", HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10, HTMLobjects["pol"]["y"] + Math.ceil((HTMLobjects["pol"]["height"] - 150) / 2), 150, 150, "bead", 0);

		
	// Add the string/tweezers
	//create_HTMLobject_WW("tweezer",  $("#pol").offset().left  + $("#pol").width() - $("#bases").offset().left + $("#bases").scrollLeft() - 10 + 140, $("#pol").offset().top - $("#bases").offset().top + 75, "100%", 15, "string", 0);
	var finalBaseXpos = templateSequence[currentState["nbases"]-1]["x"] - HTMLobjects["pol"]["x"] - HTMLobjects["pol"]["width"];
	create_HTMLobject_WW("tweezer",  HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] + 140 - 10, HTMLobjects["pol"]["y"] + 75, finalBaseXpos, 15, "string", 0);


	// Add the arrows
	var arrowSize = getArrowSize_WW(forceSize);
	var arrowSrc = forceSize > 0 ? "rightForce" : "leftForce";
	create_HTMLobject_WW("forceArrow1",  HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200,               HTMLobjects["pol"]["y"] + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc, 0);
	create_HTMLobject_WW("forceArrow2",  HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200 + 2*arrowSize, HTMLobjects["pol"]["y"] + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc, 0);
	

	
}


