
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


PARAMS_JS = {};


PARAMS_JS.PHYSICAL_PARAMETERS = {}; // The complete list of parameters which can be tuned using the side navigation menu

PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false, hidden:false};
PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"] = {distribution:"Fixed", zeroTruncated: true, integer: false, hidden:true};

PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"] = {distribution:"Fixed", refreshOnChange:true, fixedDistnVal: 7, minVal: 5, name: "Hybrid length (bp)", title: "Number of base pairs inside the polymerase", zeroTruncated: true, integer: true};
PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"] = {distribution:"Fixed", refreshOnChange:true, fixedDistnVal: 2, name: "Bubble length left (bp)",  title: "Number of unpaired template bases 3' of the hybrid", zeroTruncated: true, integer: true, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"] = {distribution:"Fixed", refreshOnChange:true, fixedDistnVal: 1, name: "Bubble length right (bp)", title: "Number of unpaired template bases 5' of the hybrid", zeroTruncated: true, integer: true, hidden:true};

PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"] = {distribution:"Fixed", fixedDistnVal: 4.5, uniformDistnLowerVal: 2, uniformDistnUpperVal: 6, name: "\u0394G\u2020slide", title: "Free energy barrier height of translocation", zeroTruncated: false, integer: false};
PARAMS_JS.PHYSICAL_PARAMETERS["DGPost"] = {distribution:"Fixed", fixedDistnVal: 0, uniformDistnLowerVal: -4, uniformDistnUpperVal: 4, name: "\u0394Gpost", title: "Free energy added on to posttranslocated ground state", zeroTruncated: false, integer: false};
PARAMS_JS.PHYSICAL_PARAMETERS["DGHyperDag"] = {distribution:"Fixed", fixedDistnVal: 0, name: "\u0394DGHyperDag", title: "Free energy penalty height of hypertranslocation", zeroTruncated: false, integer: false, hidden: true};
PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"] = {distribution:"Fixed", fixedDistnVal: 1.336, name: "\u0394G\u2020NTP2", title: "Free energy penalty of binding NTP in the secondary binding site", zeroTruncated: false, integer: false};
PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"] = {distribution:"Fixed", fixedDistnVal: 0, uniformDistnLowerVal: -10, uniformDistnUpperVal: 30, name: "Force (pN)", title: "Assisting force applied to the polymerase during single-molecule experiments.", zeroTruncated: false, integer: false};
PARAMS_JS.PHYSICAL_PARAMETERS["arrestTime"] = {distribution:"Fixed", fixedDistnVal: 60, name: "Arrest timeout (s)", title: "Maximum pause duration before the simulation is arrested. Set to zero to prevent arrests.", zeroTruncated: true, integer: false};


PARAMS_JS.PHYSICAL_PARAMETERS["kCat"] = {distribution:"Fixed", fixedDistnVal: 30, uniformDistnLowerVal: 0, uniformDistnUpperVal: 100, normalSdVal: 5, name: "Rate of catalysis (s\u207B\u00B9)", title: "Rate constant of catalysing bound NTP", zeroTruncated: true, integer: false, hidden:false};
PARAMS_JS.PHYSICAL_PARAMETERS["kCat_ATP"] = {distribution:"Fixed", fixedDistnVal: 38, name: "Rate of catalysis for A (s\u207B\u00B9)", title: "Rate constant of catalysing bound ATP", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["kCat_CTP"] = {distribution:"Fixed", fixedDistnVal: 7, name: "Rate of catalysis for C (s\u207B\u00B9)", title: "Rate constant of catalysing bound CTP", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["kCat_GTP"] = {distribution:"Fixed", fixedDistnVal: 62, name: "Rate of catalysis for G (s\u207B\u00B9)", title: "Rate constant of catalysing bound GTP", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["kCat_UTP"] = {distribution:"Fixed", fixedDistnVal: 24, name: "Rate of catalysis for U (s\u207B\u00B9)", title: "Rate constant of catalysing bound UTP", zeroTruncated: true, integer: false, hidden:true};

PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss"] = {distribution:"Fixed", fixedDistnVal: 35, uniformDistnLowerVal: 0, uniformDistnUpperVal: 100, name: "KD (\u03bcM)", title: "Dissociation constant of NTP", zeroTruncated: true, integer: false, hidden:false};
PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_ATP"] = {distribution:"Fixed", fixedDistnVal: 50, name: "KD of ATP (\u03bcM)", title: "Dissociation constant of ATP", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_CTP"] = {distribution:"Fixed", fixedDistnVal: 33, name: "KD of CTP (\u03bcM)", title: "Dissociation constant of CTP", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_GTP"] = {distribution:"Fixed", fixedDistnVal: 36, name: "KD of GTP (\u03bcM)", title: "Dissociation constant of GTP", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_UTP"] = {distribution:"Fixed", fixedDistnVal: 18, name: "KD of UTP (\u03bcM)", title: "Dissociation constant of UTP", zeroTruncated: true, integer: false, hidden:true};


PARAMS_JS.PHYSICAL_PARAMETERS["RateBind"] = {distribution:"Fixed", fixedDistnVal: 250, name: "Rate bind (\u03bcM\u207B\u00B9 s\u207B\u00B9)", title: "Second order rate constant of binding the correct NTP", zeroTruncated: true, integer: false, hidden: true};
PARAMS_JS.PHYSICAL_PARAMETERS["RateMisbind"] = {distribution:"Fixed", fixedDistnVal: 1, name: "Rate misbind (\u03bcM\u207B\u00B9 s\u207B\u00B9)", title: "Second order rate constant of NTP mis-binding which can lead to transition/transversion mutations", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["TransitionTransversionRatio"] = {distribution:"Fixed", fixedDistnVal: 4, name: "Transition:transversion", title: "How much more likely is a transition mis-binding event than a transversion mis-binding event", zeroTruncated: true, integer: false, hidden:true};


PARAMS_JS.PHYSICAL_PARAMETERS["kU"] = {distribution:"Fixed", fixedDistnVal: 0.05, name: "kU (s\u207B\u00B9)", title: "Rate constant of polymerase entering the unactive state", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["kA"] = {distribution:"Fixed", fixedDistnVal: 3, name: "kA (s\u207B\u00B9)", title: "Rate constant of polymerase leaving the unactive state", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["kUspecial"] = {distribution:"Fixed", fixedDistnVal: 1, name: "kU' (s\u207B\u00B9)", title: "Rate of entry into unactivated state multiplier at edit site", zeroTruncated: true, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["kAspecial"] = {distribution:"Fixed", fixedDistnVal: 1, name: "kA' (s\u207B\u00B9)", title: "Rate of entry into activated state multiplier at edit site", zeroTruncated: true, integer: false, hidden:true};

PARAMS_JS.PHYSICAL_PARAMETERS["nbpToFold"] = {distribution:"Fixed", fixedDistnVal: 150, name: "Number of bases to fold", title: "The number of most recently added bases in the nascent strand to fold", zeroTruncated: true, integer: true, maxVal: 300, hidden:true};



PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"] = {distribution:"Fixed", fixedDistnVal: 15, name: "\u0394G\u2020slip", title: "Free energy barrier height of bulge formation and diffusion in the primer sequence", zeroTruncated: false, integer: false, hidden:true};
PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"] = { distribution: "Fixed", fixedDistnVal:false, binary: true, title: "Allow more than 1 bulge in the primer at a time?", name: "allowMultipleBulges"};



PARAMS_JS.initParameters_WW = function(){
	
	for (var paramID in PARAMS_JS.PHYSICAL_PARAMETERS){
		if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] == null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"];
	}

	PARAMS_JS.refreshNTP_WW();
	
	
}


PARAMS_JS.get_PHYSICAL_PARAMETERS_WW = function(resolve = function(dict) { }, msgID = null){

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(PARAMS_JS.PHYSICAL_PARAMETERS));
		return;
	}
	return resolve(PARAMS_JS.PHYSICAL_PARAMETERS);

}



PARAMS_JS.setStructuralParameters_WW = function(){
	
	
	PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["hidden"] = false;
	PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["hidden"] = false;
	PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["hidden"] = false;
	
	
	// Only show the bubble size parameters if the template is double stranded
	if (SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) != "ds"){
		PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["hidden"] = true;
		PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["hidden"] = true;
	}
	
	
	// If nascent sequence is ds then don't show hybrid length or bubblesize left
	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds"){
		PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["hidden"] = true;
		PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["hidden"] = true;
	}
	
	
	// If the new sequence has a default parameter value then it will override the current one 
	if (SEQS_JS.all_sequences[sequenceID]["hybridLen"] != null) {
		PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["fixedDistnVal"] = SEQS_JS.all_sequences[sequenceID]["hybridLen"];
		PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] = SEQS_JS.all_sequences[sequenceID]["hybridLen"];
	}else{
		PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["fixedDistnVal"] = 9;
		PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] = 9;
	}
	
	

	
}


PARAMS_JS.refreshNTP_WW = function(){

	if(!needToRefreshNTPParameters) return;
	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "RNA"){



		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["fixedDistnVal"] = 1000;
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["name"] = "[NTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["title"] = "Cellular concentration of all NTPs";
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["fixedDistnVal"];
		
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"] = 3152;
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["normalSdVal"] = 1698;
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["name"] = "[ATP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["title"] = "Cellular concentration of ATP";
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"];
		
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"] = 278;
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["normalSdVal"] = 242;
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["name"] = "[CTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["title"] = "Cellular concentration of CTP";
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"];
		
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"] = 468;
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["normalSdVal"] = 224;
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["name"] = "[GTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["title"] = "Cellular concentration of GTP";
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"];
		
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"] = 567;
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["normalSdVal"] = 460;
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["name"] = "[UTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["title"] = "Cellular concentration of UTP";
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"];
		

		
	}else{



		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["fixedDistnVal"] = 20;
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["name"] = "[dNTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["title"] = "Cellular concentration of all dNTPs";
		PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["fixedDistnVal"];


		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"] = 24;
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["normalSdVal"] = 22;
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["name"] = "[dATP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["title"] = "Cellular concentration of dATP";
		PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["fixedDistnVal"];

		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"] = 29;
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["normalSdVal"] = 19;
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["name"] = "[dCTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["title"] = "Cellular concentration of dCTP";
		PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["fixedDistnVal"];

		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"] = 5.2;
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["normalSdVal"] = 4.5;
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["name"] = "[dGTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["title"] = "Cellular concentration of dGTP";
		PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["fixedDistnVal"];

		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["distribution"] = "Fixed";
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"] = 37;
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["normalSdVal"] = 30;
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["name"] = "[dTTP] (\u03bcM)";
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["title"] = "Cellular concentration of dTTP";
		PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["fixedDistnVal"];
	
	}

	needToRefreshNTPParameters = false;
	WW_JS.initMisbindingMatrix();
	

}




// Change the value of a parameter via the non-popup textbox
PARAMS_JS.update_this_parameter_WW = function(paramID, fixedVal, resolve = function(toReturn) {}, msgID = null){
	
	
	var toReturn = {refresh: false}

	var initialVal = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"];
	
	if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"]) fixedVal = Math.ceil(fixedVal);
	
	// Do not accept the change if it is out of range
	if (!PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["zeroTruncated"] || (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["zeroTruncated"] && fixedVal > 0)) {
	
	
		// Change the values
		PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = fixedVal;
		PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"] = fixedVal;
		
		// Some parameters require a refresh
		toReturn["refresh"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["refreshOnChange"] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["refreshOnChange"];


	}
	
	else fixedVal = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"]
	
	
	toReturn["val"] = fixedVal;


	// Recalculate misincorporation transition matrix 
	if (paramID.substring(3) == "conc" || paramID == "RateBind" || paramID == "RateMisbind" || paramID == "TransitionTransversionRatio"){
		WW_JS.initMisbindingMatrix();
		WW_JS.setNextBaseToAdd_WW();
	}
	
	
	// If the parameter has been changed and it will affect translocation rates then we calculate everything again
	if (initialVal != PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] && (paramID == "DGPost" || paramID == "hybridLen" || paramID == "bubbleLeft" || paramID == "bubbleRight" || paramID == "nbpToFold")){
		STATE_JS.translocationCacheNeedsUpdating = true; // Recalculate the translocation rate cache
		STATE_JS.initTranslocationRateCache();
	}



	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
		return;
	}
	else resolve(toReturn);

}


PARAMS_JS.sample_parameters_WW = function(resolve = function(){ }, msgID = null){
	for (var paramID in PARAMS_JS.PHYSICAL_PARAMETERS) PARAMS_JS.sample_parameter_WW(paramID);
}


PARAMS_JS.rpoiss = function(rate, aboveZero = false, minVal = null, maxVal = null){
	
	if (aboveZero == null) aboveZero = false;
	
	var minPossibleValue = minVal != null ? minVal : aboveZero ? 1 : 0;

	var getAVal = function(rate){
		var count = minPossibleValue;
		var timeRemaining = 1;
		while(true){
			timeRemaining -= RAND_JS.exponential(rate);
			if (timeRemaining > 0) count ++;
			else break;
		}
		return count;
	};
	
	var toReturn = getAVal(rate);
	if(maxVal != null && toReturn > maxVal) toReturn = maxVal;
	
	return toReturn;
	

}



PARAMS_JS.sample_parameter_WW = function(paramID, resolve = function() { }, msgID = null){

	// The Random() function sometimes generates the same number multiple times in a row if you do not use a seed 
	// (which will often give different parameters the same value if they have the same distribution)

	var initialVal = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"];


	switch(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"]) {
	    case "Fixed":
	        PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"];
	        break;
	
	    case "Uniform":
	        PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = RAND_JS.uniform(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"]);
	        break;
	
		case "Exponential":
		    PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = RAND_JS.exponential(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["ExponentialDistnVal"]);
		    break;
		
		case "Normal": // May have to repeatedly resample if this parameter is zero-truncated
			var value = RAND_JS.normal(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalMeanVal"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalSdVal"]);
			while (value <= 0 && PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["zeroTruncated"]) value = RAND_JS.normal(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalMeanVal"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalSdVal"]);
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = value;
			break;
			
		case "Lognormal": // Generate a normal(mean, sd) and then take the exp of it
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = Math.exp(RAND_JS.normal(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["lognormalMeanVal"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["lognormalSdVal"]));
			break;
			
		case "Gamma": 
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = RAND_JS.gamma(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["gammaShapeVal"], 1/PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["gammaRateVal"]);
			break;
			
		case "DiscreteUniform": 
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = Math.max(1, PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] + Math.floor(MER_JS.random() * (1 + PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] - PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"])));
			break;	
			
		case "Poisson": 
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = PARAMS_JS.rpoiss(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["poissonRateVal"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["zeroTruncated"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"], PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"]);
			break;
			
			
	    default:
	        PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"];
	}



	if (paramID.substring(3) == "conc" || paramID == "RateBind" || paramID == "RateMisbind" || paramID == "TransitionTransversionRatio"){
		WW_JS.initMisbindingMatrix();
	}
	
	// If a parameter has been changed and it will affect translocation rates then we calculate everything again
	if (initialVal != PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] && (paramID == "DGPost" || paramID == "hybridLen" || paramID == "bubbleLeft" || paramID == "bubbleRight" || paramID == "nbpToFold")){
		STATE_JS.translocationCacheNeedsUpdating = true;
		if (!initialising_node) STATE_JS.initTranslocationRateCache();
	}
	

	if (msgID != null){
		postMessage(msgID + "~X~done");
		return;
	}
	resolve();



	
}





PARAMS_JS.submitDistribution_WW = function(paramID, distributionName, distributionParams, resolve = function(dict) {}, msgID = null){
	
	
	PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"] = distributionName;


	switch(PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"]) {
	    case "Fixed":
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] && distributionParams[0] <= 0) distributionParams[0] = 1;
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"] != null && distributionParams[0] < PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"]) distributionParams[0] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"];
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"] != null && distributionParams[0] > PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"]) distributionParams[0] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"];
	        PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"] = distributionParams[0];
	        break;
	    case "Uniform":
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] && distributionParams[0] <= 0) distributionParams[0] = 1;
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"] != null && distributionParams[0] < PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"]) distributionParams[0] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"];
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"] != null && distributionParams[1] > PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"]) distributionParams[1] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"];
			if (distributionParams[0] >= distributionParams[1]) distributionParams[1] = distributionParams[0] + 1;
	        PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] = distributionParams[0];
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] = distributionParams[1];
	        break;
		case "Exponential":
			if (distributionParams[0] <= 0) distributionParams[0] = 1;
		    PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["ExponentialDistnVal"] = distributionParams[0];
		    break;
		case "Normal":
			if (distributionParams[1] <= 0) distributionParams[1] = 1;
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalMeanVal"] = distributionParams[0];
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalSdVal"] = distributionParams[1];
			break;
		case "Lognormal":
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["lognormalMeanVal"] = distributionParams[0];
			if (distributionParams[1] <= 0) distributionParams[1] = 0.5;
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["lognormalSdVal"] = distributionParams[1];
			break;
		case "Gamma":
			if (distributionParams[0] <= 0) distributionParams[0] = 1;
			if (distributionParams[1] <= 0) distributionParams[1] = 2;
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["gammaShapeVal"] = distributionParams[0];
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["gammaRateVal"] = distributionParams[1];
			break;
		case "DiscreteUniform":
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] != null && PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["integer"] && distributionParams[0] <= 0) distributionParams[0] = 1;
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"] != null && distributionParams[0] < PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"]) distributionParams[0] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["minVal"];
			if (PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"] != null && distributionParams[1] > PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"]) distributionParams[1] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["maxVal"];
			if (distributionParams[0] >= distributionParams[1]) distributionParams[1] = distributionParams[0] + 1;
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] = distributionParams[0];
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] = distributionParams[1];
			break;			
		case "Poisson":
			if (distributionParams[0] <= 0) distributionParams[0] = 1;
			PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["poissonRateVal"] = distributionParams[0];
			break;			
			
	    default:
	        PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = 1;
	}
	
	if (!simulating) PARAMS_JS.sample_parameter_WW(paramID);


	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(PARAMS_JS.PHYSICAL_PARAMETERS));
	}

	else resolve(PARAMS_JS.PHYSICAL_PARAMETERS);
		
	
}






PARAMS_JS.updateForce_WW = function(newFAssist = null, resolve = function() { }, msgID = null){



	
	// If the new force is unitialised then generate the force objects again
	if (newFAssist == null){
		
		if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0) PARAMS_JS.add_force_equipment_WW(PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"]);
		else PARAMS_JS.remove_force_equipment_WW();
		
	}
	

	// If force is added/removed then create/rmemove the force equipment
	else if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] == 0 && newFAssist != 0){
		PARAMS_JS.add_force_equipment_WW(newFAssist);
	}
	
	else if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0 && newFAssist == 0){
		PARAMS_JS.remove_force_equipment_WW();
	}
	
	// If force changes then change the arrows
	else if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0 && newFAssist != 0 && PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != newFAssist){
		
		
		
		// Set arrow size
		var arrowSize = PARAMS_JS.getArrowSize_WW(newFAssist);
		
		if (HTMLobjects["forceArrow1"] == null){
			
			var arrowSrc = newFAssist < 0 ? "leftForce" : "rightForce";
			WW_JS.create_HTMLobject_WW("forceArrow1", HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200,               HTMLobjects["pol"]["y"]  + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc);
			WW_JS.create_HTMLobject_WW("forceArrow2", HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200 + 2*arrowSize, HTMLobjects["pol"]["y"]  + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc);
			
		}else{
		

		
			// Set arrow direction
			if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] > 0 && newFAssist < 0){
			
				WW_JS.change_src_of_object_WW(HTMLobjects["forceArrow1"], "leftForce");
				WW_JS.change_src_of_object_WW(HTMLobjects["forceArrow2"], "leftForce");

			//$("#forceArrow1").attr("src", "src/Images/leftForce.png");
			//$("#forceArrow2").attr("src", "src/Images/leftForce.png");
			
			}else if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] < 0 && newFAssist > 0){
			
				WW_JS.change_src_of_object_WW(HTMLobjects["forceArrow1"], "rightForce");
				WW_JS.change_src_of_object_WW(HTMLobjects["forceArrow2"], "rightForce");

			}
		}

	}

	if (newFAssist != null){
		PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] = newFAssist;
		PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["fixedDistnVal"] = newFAssist;
	}




	if (msgID != null){
		postMessage(msgID + "~X~done");
	}

	else resolve();
	
	
}


PARAMS_JS.getArrowSize_WW = function(force){
	var minArrowSize = 30;
	var maxArrowSize = 60;
	var maxForceSize = 50;
	return Math.min(Math.abs(force) / maxForceSize, 1) * (maxArrowSize - minArrowSize) + minArrowSize;

}


 PARAMS_JS.remove_force_equipment_WW = function(){
	
	WW_JS.delete_HTMLobj_WW("leftBead");
	WW_JS.delete_HTMLobj_WW("rightBead");
	WW_JS.delete_HTMLobj_WW("tweezer");
	WW_JS.delete_HTMLobj_WW("forceArrow1");
	WW_JS.delete_HTMLobj_WW("forceArrow2");
		
}


 PARAMS_JS.add_force_equipment_WW = function(forceSize){



	// Add the beads
	WW_JS.create_HTMLobject_WW("leftBead",  templateSequence[1]["x"] - 75, 3, 150, 150, "bead", 0);
	WW_JS.create_HTMLobject_WW("rightBead", HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10, HTMLobjects["pol"]["y"] + Math.ceil((HTMLobjects["pol"]["height"] - 150) / 2), 150, 150, "bead", 0);

		
	// Add the string/tweezers
	//WW_JS.create_HTMLobject_WW("tweezer",  $("#pol").offset().left  + $("#pol").width() - $("#bases").offset().left + $("#bases").scrollLeft() - 10 + 140, $("#pol").offset().top - $("#bases").offset().top + 75, "100%", 15, "string", 0);
	var finalBaseXpos = templateSequence[WW_JS.currentState["nbases"]-1]["x"] - HTMLobjects["pol"]["x"] - HTMLobjects["pol"]["width"];
	WW_JS.create_HTMLobject_WW("tweezer",  HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] + 140 - 10, HTMLobjects["pol"]["y"] + 75, finalBaseXpos, 15, "string", 0);


	// Add the arrows
	var arrowSize = PARAMS_JS.getArrowSize_WW(forceSize);
	var arrowSrc = forceSize > 0 ? "rightForce" : "leftForce";
	WW_JS.create_HTMLobject_WW("forceArrow1",  HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200,               HTMLobjects["pol"]["y"] + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc, 0);
	WW_JS.create_HTMLobject_WW("forceArrow2",  HTMLobjects["pol"]["x"] + HTMLobjects["pol"]["width"] - 10 + 200 + 2*arrowSize, HTMLobjects["pol"]["y"] + 83 - 0.5*arrowSize, arrowSize, arrowSize, arrowSrc, 0);
	

	
}







if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		PHYSICAL_PARAMETERS: PARAMS_JS.PHYSICAL_PARAMETERS,
		initParameters_WW: PARAMS_JS.initParameters_WW,
		get_PHYSICAL_PARAMETERS_WW: PARAMS_JS.get_PHYSICAL_PARAMETERS_WW,
		setStructuralParameters_WW: PARAMS_JS.setStructuralParameters_WW,
		refreshNTP_WW: PARAMS_JS.refreshNTP_WW,
		update_this_parameter_WW: PARAMS_JS.update_this_parameter_WW,
		sample_parameters_WW: PARAMS_JS.sample_parameters_WW,
		rpoiss: PARAMS_JS.rpoiss,
		sample_parameter_WW: PARAMS_JS.sample_parameter_WW,
		submitDistribution_WW: PARAMS_JS.submitDistribution_WW,
		updateForce_WW: PARAMS_JS.updateForce_WW,
		getArrowSize_WW: PARAMS_JS.getArrowSize_WW,
		remove_force_equipment_WW: PARAMS_JS.remove_force_equipment_WW,
		add_force_equipment_WW: PARAMS_JS.add_force_equipment_WW
	}

}