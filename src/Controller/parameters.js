
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

PHYSICAL_PARAMETERS_TEMP = [];





function renderParameters(){


	var toCall = () => new Promise((resolve) => get_PHYSICAL_PARAMETERS_controller(resolve));
	toCall().then((PHYSICAL_PARAMETERS_LOCAL) => {
		renderParameters_givenParameters(PHYSICAL_PARAMETERS_LOCAL);
	});

	
}



function renderParameters_givenParameters(PHYSICAL_PARAMETERS_LOCAL){


		for (var paramID in PHYSICAL_PARAMETERS_LOCAL){
			

			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["hidden"] != null && PHYSICAL_PARAMETERS_LOCAL[paramID]["hidden"]){
				$("#" + paramID + "_container").hide(100);
			}
			
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["hidden"] == null || !PHYSICAL_PARAMETERS_LOCAL[paramID]["hidden"]){
				$("#" + paramID + "_container").show(100);
			}

			//console.log("Setting", "#" + paramID, "to", roundToSF(PHYSICAL_PARAMETERS_LOCAL[paramID]["val"], 3));
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["binary"] == null || PHYSICAL_PARAMETERS_LOCAL[paramID]["binary"] == false){
				if (PHYSICAL_PARAMETERS_LOCAL[paramID]["distribution"] != "Fixed" || !simulating) $("#" + paramID).val(roundToSF(PHYSICAL_PARAMETERS_LOCAL[paramID]["val"], 3));
				
				
				if (PHYSICAL_PARAMETERS_LOCAL[paramID]["distribution"] != "Fixed") {
					$("#" + paramID).addClass("parameter-disabled");
					$("#" + paramID).attr("disabled", true);
				}else{
					$("#" + paramID).removeClass("parameter-disabled");
					$("#" + paramID).attr("disabled", false);
				}
				
			}else{
				$("#" + paramID).prop('checked', PHYSICAL_PARAMETERS_LOCAL[paramID]["val"]);
			}

			$("#" + paramID).attr("title", PHYSICAL_PARAMETERS_LOCAL[paramID]["title"]);
			$("#" + paramID).attr("name", PHYSICAL_PARAMETERS_LOCAL[paramID]["name"]);

		}


}



function updateForce(){
	
	
	// If force is added/removed then create/rmemove the force equipment
	var newFAssist = $("#FAssist").val();
	if (PHYSICAL_PARAMETERS["FAssist"]["val"] == 0 && newFAssist != 0){
		add_force_equipment(newFAssist);
	}else if (PHYSICAL_PARAMETERS["FAssist"]["val"] != 0 && newFAssist == 0){
		remove_force_equipment();
	}
	
	// If force changes then change the arrows
	else if (PHYSICAL_PARAMETERS["FAssist"]["val"] != 0 && newFAssist != 0 && PHYSICAL_PARAMETERS["FAssist"]["val"] != newFAssist){
		
		// Set arrow direction
		if (PHYSICAL_PARAMETERS["FAssist"]["val"] > 0 && newFAssist < 0){
			$("#forceArrow1").attr("src", "src/Images/leftForce.png");
			$("#forceArrow2").attr("src", "src/Images/leftForce.png");
		}else if (PHYSICAL_PARAMETERS["FAssist"]["val"] < 0 && newFAssist > 0){
			$("#forceArrow1").attr("src", "src/Images/rightForce.png");
			$("#forceArrow2").attr("src", "src/Images/rightForce.png");
		}
		
		// Set arrow size
		var arrowSize = getArrowSize(newFAssist);
		$("#forceArrow1").height(arrowSize + "px");
		$("#forceArrow1").width(arrowSize + "px");
		$("#forceArrow2").height(arrowSize + "px");
		$("#forceArrow2").width(arrowSize + "px");
		
		
		// Set arrow position
		$("#forceArrow1").css({	top: $("#pol").offset().top - $("#bases").offset().top + 83 - 0.5*arrowSize, 
								left: $("#pol").offset().left  + $("#pol").width() - $("#bases").offset().left + $("#bases").scrollLeft() - 10 + 200 });
								
		$("#forceArrow2").css({	top: $("#pol").offset().top - $("#bases").offset().top + 83 - 0.5*arrowSize, 
								left: $("#pol").offset().left  + $("#pol").width() - $("#bases").offset().left + $("#bases").scrollLeft() - 10 + 200 + 2*arrowSize });
	
	}

	PHYSICAL_PARAMETERS["FAssist"]["val"] = newFAssist;
	PHYSICAL_PARAMETERS["FAssist"]["fixedDistnVal"] = newFAssist;
	

	
}

function update_parameters() {
	
	
	
	//var hybridLenTemp = Math.max(Math.floor($("#hybridLen").val()), 5);
	//$("#hybridLen").val(hybridLenTemp);
	//if (hybridLenTemp != hybridLen) refresh();



	

	
	if (document.getElementById("SelectSequence").value != "$user") specialSite = SEQS_JS.all_sequences[document.getElementById("SelectSequence").value]["editSite"];//parseFloat(document.getElementById("specialSite").value);
	else specialSite = -1;
	

	
	
	//renderGraphicsEveryNsteps = Math.max(Math.ceil(15 * PHYSICAL_PARAMETERS["RateUnbind"]["val"] / PHYSICAL_PARAMETERS["kCat"]["val"]), 100);
	
	
	//formBulgeH = parseFloat(document.getElementById("GDaggerBulge").value);
	slipHForm = 0;// parseFloat(document.getElementById("GDaggerForm").value);
	
	
	slipHtrough = 0;// parseFloat(document.getElementById("GBulge").value);
	

	TslipH = parseFloat(document.getElementById("GDaggerDiffuseT").value);
	

	
	
}


function refreshNTP(){


	refreshNTP_controller();

	if (document.getElementById("SelectPrimerType").value.substring(2) == "RNA"){

		document.getElementById("NTPname").innerHTML = "[NTP]";
		document.getElementById("ATPname").innerHTML = "[ATP]";
		document.getElementById("CTPname").innerHTML = "[CTP]";
		document.getElementById("GTPname").innerHTML = "[GTP]";
		document.getElementById("UTPname").innerHTML = "[UTP]";	
		$("#refreshNTP").attr("title", "Reset NTP concentrations to standard cellular levels");
		
	}else{

		document.getElementById("NTPname").innerHTML = "[dNTP]";
		document.getElementById("ATPname").innerHTML = "[dATP]";
		document.getElementById("CTPname").innerHTML = "[dCTP]";
		document.getElementById("GTPname").innerHTML = "[dGTP]";
		document.getElementById("UTPname").innerHTML = "[dTTP]";	
		$("#refreshNTP").attr("title", "Reset dNTP concentrations to standard cellular levels");
	}
	
	//update_parameters();
	
	
	var updateTextbox = function(PHYSICAL_PARAMETERS_LOCAL){

		var ids = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] ? ["ATPconc", "GTPconc", "CTPconc", "UTPconc"] : ["NTPconc", "NTPconc", "NTPconc", "NTPconc"];
		for (var i = 0; i < 4; i ++){
			var paramID = ids[i];
			$("#" + paramID).val(roundToSF(PHYSICAL_PARAMETERS_LOCAL[paramID]["val"], 3));
			$("#" + paramID).removeClass("parameter-disabled");
			$("#" + paramID).attr("disabled", false);
		}

	};
	
	get_PHYSICAL_PARAMETERS_controller(updateTextbox);
	


}





function getDistributionChangeTemplate(){
	
	
	
	return `
		<div id='popup_distn' style='background-color:#008cba; padding: 10 10; position:fixed; width: 600px; left:380; top:30vh; z-index:5' paramName="XX_NAME_XX" paramID="XX_ID_XX">
			<div style='background-color: white; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 22px'> Background distribution of XX_ID_XX </span>

				<span style='font-size: 30px; cursor:pointer; position:absolute; right:35px; top:10px'>
					<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer; float:right" href="about/#priorDistribution_ParamHelp"><img class="helpIcon" src="src/Images/help.png"></a>
				</span>
				<span class="blueDarkblueCloseBtn" title="Close" style="right: 15px; top: 4px;" onclick='closePriorDistributionPopup()'>&times;</span>
				<div style='padding:2; font-size:18px;'> XX_NAME_XX: XX_TITLE_XX </div>
				<table cellpadding=10 style='width:90%; margin:auto;'>
				
					<tr>

						<td> 
							Distribution:<br>
								XX_DISTRIBUTION_XX
						</td>
						
						
						<td rowspan=2>
							<canvas id="distrbutionCanvas" style="" width=200 height=150></canvas>
						</td>
						
					</tr>
					
					<tr>
		
						<td id="parameterDistnCell" style="font-style:Arial">
							
						</td>
					</tr>

				</table>
				
				<table>
					<tr>
						<td style="font-size:15"> Parameters are resampled from their specified distribution at the beginning of each simulation. Use this window to choose the distribution. </td>
						<td> 
							<input type=button id='submitDistn' class="operation" onClick=submitDistribution_controller() value='Save' title="Submit your changes" style="width:60px; float:right"></input>
						</td>
					</tr>
				</table>

			</div>
		</div>
	`;
	
	
	
}


function getContinuousVariableDistributionsTemplate(){
	
	return `
		<select class="dropdown" id="SelectDistribution" OnChange="selectPriorDistribution()">
		  	<option value="Fixed">Fixed</option>
		  	<option value="Uniform">Uniform Distribution</option>
		  	<option value="Normal">Normal Distribution</option>
	      	<option value="Lognormal">Lognormal Distribution</option>
	      	<option value="Exponential">Exponential Distribution</option>
	      	<option value="Gamma">Gamma Distribution</option>
		</select>
	
	`;
	
}


function getDiscreteVariableDistributionsTemplate(){
	
	return `
		<select class="dropdown" id="SelectDistribution" OnChange="selectPriorDistribution()">
		  	<option value="Fixed">Fixed</option>
		  	<option value="DiscreteUniform">Discrete Uniform Distribution</option>
			<option value="Poisson">Poisson Distribution</option>
		</select>
		<div id="discreteDescription" style="font-size:14px"></div>
	
	`;
	
}


function selectPriorDistribution(){
	
	if ($("#popup_distn").length == 0) return;
	switch($("#SelectDistribution").val()) {
	    case "Fixed":
	        addFixedPrior();
	        break;
	    case "Uniform":
	        addUniformPrior();
	        break;
		case "Exponential":
		    addExponentialPrior();
		    break;
		case "Normal":
			addNormalPrior();
			break;
		case "Lognormal":
			addLognormalPrior();
			break;
		case "Gamma":
			addGammaPrior();
			break;
		case "DiscreteUniform":
			addDiscreteUniformPrior();
			break;
		case "Poisson":
			addPoissonPrior();
			break;
	    default:
	        addFixedPrior();
	}
	
	
	
}



function addFixedPrior(){
	
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	$("#distrbutionCanvas").show(100);
	
	var paramID = $("#popup_distn").attr("paramID")
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	var inputBox = $("#popup_distn").attr("paramName") + " = <input type='number' title='Select the fixed value for this parameter' id='fixedDistnVal' value=" + currentVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px'></input>";
	
	$("#parameterDistnCell").append(inputBox);


	if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null){
		$("#fixedDistnVal").attr("min", parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]));
	}

	
	var xmin = roundToSF(currentVal - currentVal*0.2, 1);
	var xmax = roundToSF(currentVal + currentVal*0.2, 1);
	if (xmin == xmax){
		xmin--;
		xmax++;
	}
	if (PHYSICAL_PARAMETERS_TEMP[paramID]["integer"]){
		xmin = Math.floor(xmin);
		xmax = Math.ceil(xmax);
	}


	var fixedFn = function(x) {
		if (Math.abs(x - currentVal) < (xmax - xmin) / 150) return 1 / 1.1;
		return 0;
	};
	
	plot_probability_distribution(fixedFn, xmin, xmax, "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));
	

	
}





function addUniformPrior(){
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	
	var paramID = $("#popup_distn").attr("paramID")
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	var lowerLimitVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["uniformDistnLowerVal"]);
	var upperLimitVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["uniformDistnUpperVal"]);
	if (lowerLimitVal == null || isNaN(lowerLimitVal)) lowerLimitVal = roundToSF((currentVal - (currentVal * 0.5)));
	if (upperLimitVal == null || isNaN(upperLimitVal)) upperLimitVal = roundToSF((currentVal + (currentVal * 0.5)));
	
	if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]) lowerLimitVal = Math.max(lowerLimitVal, 0);
	if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]) upperLimitVal = Math.max(upperLimitVal, 0);
	
	if (lowerLimitVal == upperLimitVal){
		lowerLimitVal -= 1;
		upperLimitVal += 1;
	}
	
	

	var lowerLimitTextBox = "Lower: <input type='number' title='Select the lower limit for this parameter' id='uniformDistnLowerVal' value=" + lowerLimitVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotUniformDistrbutionCanvas()></input>";
	var upperLimitTextBox = "Upper: <input type='number' title='Select the upper limit for this parameter' id='uniformDistnUpperVal' value=" + upperLimitVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotUniformDistrbutionCanvas()></input>";
	
	$("#parameterDistnCell").append(lowerLimitTextBox + "&nbsp;" + upperLimitTextBox);


	if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null){
		$("#uniformDistnLowerVal").attr("min", parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]));
	}
	
	
	
	plotUniformDistrbutionCanvas = function(){

		var lower = parseFloat($("#uniformDistnLowerVal").val());
		var upper = parseFloat($("#uniformDistnUpperVal").val());
		
		if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]) { // Ensure that the values do not go below 0
			lower = Math.max(lower, 0);
			$("#uniformDistnLowerVal").val(lower)
			upper = Math.max(upper, 0);
			$("#uniformDistnUpperVal").val(upper)
		}
		
		if (upper <= lower) {
			plot_probability_distribution(null, -1, 1, "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));
			return;
		}
		
		var uniformFn = function(x) {
			//if (Math.abs(x - lowerLimitVal) < 0.001 * Math.abs(lowerLimitVal)) return [0, 1 / (upperLimitVal - lowerLimitVal)];
			//if (Math.abs(x - upperLimitVal) < 0.001 * Math.abs(upperLimitVal)) return [1 / (upperLimitVal - lowerLimitVal), 0];
			if (x >= lower && x <= upper) return 1 / (upper - lower);
			return 0;
		};


		var xmin = PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"] ? Math.max(0, lower - 0.25*(Math.abs(lower+upper+1))) : lower - 0.25*(Math.abs(lower+upper+1));
		plot_probability_distribution(uniformFn, xmin, upper + 0.25*(Math.abs(lower+upper+1)), "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));
	

	}
	
	plotUniformDistrbutionCanvas();
	 

	
}


function addExponentialPrior(){
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	var paramID = $("#popup_distn").attr("paramID")
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	
	var expRate = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["ExponentialDistnVal"]);
	if (expRate == null || isNaN(expRate)) expRate = roundToSF(1/currentVal);
	if (currentVal <= 0) expRate = 1; // We don't want infinite or negative rates
	
	var textBox = "&lambda;: <input type='number' title='Select the rate for this parameter. The rate is the inverse of the mean' id='ExponentialDistnVal' value=" + expRate + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotExponentialDistrbutionCanvas()></input>";
	
	$("#parameterDistnCell").append(textBox);
	
	
	plotExponentialDistrbutionCanvas = function(){

		var rate = parseFloat($("#ExponentialDistnVal").val());
		if (rate <= 0) return;
		var exponentialFn = function(x) {
			if (x < 0) return 0;
			return rate * Math.exp(-rate * x);
		};

		plot_probability_distribution(exponentialFn, 0, 5/rate, "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));

	}
	
	
	plotExponentialDistrbutionCanvas();
	

}







function addNormalPrior(){
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	
	
	var paramID = $("#popup_distn").attr("paramID")
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	
	var meanVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["normalMeanVal"]);
	var sd = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["normalSdVal"]);

	if (meanVal == null || isNaN(meanVal)) meanVal = roundToSF(currentVal);
	if (sd == null || isNaN(sd)) sd = roundToSF(meanVal * 0.25);
	
	if (sd == 0) sd = 1;

	
	var meanTextBox = "&mu;: <input type='number' title='Select the mean value of this parameter' id='normalMeanVal' value=" + meanVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotNormalDistrbutionCanvas()></input>";
	var sdLimitTextBox = "&sigma;: <input type='number' title='Select the standard deviation of this parameter' id='normalSdVal' value=" + sd + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotNormalDistrbutionCanvas()></input>";
	$("#parameterDistnCell").append(meanTextBox + "&nbsp;" + sdLimitTextBox);

	
	
	
	plotNormalDistrbutionCanvas = function(){

		var sd = parseFloat($("#normalSdVal").val());
		var meanVal = parseFloat($("#normalMeanVal").val());
		var normalFn = function(x) {
			return 1 / (Math.sqrt(2 * Math.PI * sd * sd)) * Math.exp(-(x-meanVal) * (x-meanVal) / (2 * sd * sd));
		};
		

		var xmin = PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"] ? Math.max(meanVal - sd * 4, 0) : meanVal - sd * 4;

		plot_probability_distribution(normalFn, xmin,  meanVal + sd * 4, "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));
	}
	
	
	plotNormalDistrbutionCanvas()
	
	
}


function addLognormalPrior(){
	
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	var paramID = $("#popup_distn").attr("paramID")
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	
	var meanVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["lognormalMeanVal"]);
	var sd = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["lognormalSdVal"]);
	if (sd == null || isNaN(sd)) sd = 0.5;
	if (meanVal == null || isNaN(meanVal)) meanVal = roundToSF(Math.log(currentVal / Math.exp(sd*sd/2)));
	if (isNaN(meanVal)) meanVal = 0;
	
	
	var meanTextBox = "&mu;: <input type='number' title='Select the logarithmic mean value of this parameter' id='lognormalMeanVal' value=" + meanVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotLognormalDistrbutionCanvas()></input>";
	var sdLimitTextBox = "&sigma;: <input type='number' title='Select the logarithmic standard deviation of this parameter' id='lognormalSdVal' value=" + sd + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotLognormalDistrbutionCanvas()></input>";
	$("#parameterDistnCell").append(meanTextBox + "&nbsp;" + sdLimitTextBox);

	
	
	
	plotLognormalDistrbutionCanvas = function(){

		var sd = parseFloat($("#lognormalSdVal").val());
		var meanVal = parseFloat($("#lognormalMeanVal").val());
		if (sd < 0) return;
		var lognormalFn = function(x) {
			if (x <= 0) return 0;
			return 1 / (x * sd * Math.sqrt(2 * Math.PI)) * Math.exp(-(Math.log(x)-meanVal) * (Math.log(x)-meanVal) / (2 * sd * sd));
		};

		var sd4 = Math.sqrt((Math.exp(Math.pow(sd, 2) - 1)) * Math.exp(2*meanVal + Math.pow(sd, 2))) * 4; // 4 standard deviations
		var empMean = Math.exp(meanVal + sd*sd/2);
		plot_probability_distribution(lognormalFn, Math.max(empMean - sd4, 0), empMean + sd4, "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));
	}
	
	
	plotLognormalDistrbutionCanvas();
	
		
	
}



function addGammaPrior(){
	
	
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	var paramID = $("#popup_distn").attr("paramID")
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	
	var shapeVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["gammaShapeVal"]);
	var rateVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["gammaRateVal"]);
	if (shapeVal == null || isNaN(shapeVal)) shapeVal = 2;
	if (rateVal == null || isNaN(rateVal)) rateVal = roundToSF(shapeVal/currentVal);
	if (currentVal <= 0) rateVal = 1; // We don't want infinite or negative rates
	
	
	var shapeTextBox = "&alpha;: <input type='number' title='Select the shape for this gamma-distributed parameter' id='gammaShapeVal' value=" + shapeVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotGammaDistrbutionCanvas()></input>";
	var rateTextBox = "&beta;: <input type='number' title='Select the rate for this gamma-distributed parameter' id='gammaRateVal' value=" + rateVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px' onChange=plotGammaDistrbutionCanvas()></input>";
	$("#parameterDistnCell").append(shapeTextBox + "&nbsp;" + rateTextBox);

	
	
	
	plotGammaDistrbutionCanvas = function(){

		var shape = parseFloat($("#gammaShapeVal").val());
		var scale = 1 / parseFloat($("#gammaRateVal").val());
		//if (scale < 0) return;
		var lognormalFn = function(x) {
			if (x <= 0) return 0;
			return jStat.gamma.pdf(x, shape, scale)
		};

		
		var sd4 = Math.sqrt(shape * scale * scale) * 4; // 4 standard deviations
		var empMean = shape * scale;
		plot_probability_distribution(lognormalFn, Math.max(empMean - sd4, 0), empMean + sd4, "distrbutionCanvas", $("#" + $("#popup_distn").attr("paramID")).attr('name'));
	}
	
	
	plotGammaDistrbutionCanvas();
	
	
}



function addPoissonPrior(){
	
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	$("#distrbutionCanvas").hide(100);
	
	var paramID = $("#popup_distn").attr("paramID")
	
	var minVal = null;
	if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null) minVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]);
	else if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"] != null && PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]) minVal = 1;
	
	var rateTextBox;
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	var poissonRateVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["poissonRateVal"]);
	if (poissonRateVal == null || isNaN(poissonRateVal)) {
		poissonRateVal = currentVal;
		if (minVal != null) poissonRateVal -= minVal;
	}
	
	if (minVal != null) rateTextBox = "&lambda;: <input type='number' title='Select the rate for this Poisson distributed parameter. " + minVal + " will be added onto the sampled value' id='poissonRateVal' value=" + poissonRateVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px'></input>";
	else rateTextBox = "&lambda;: <input type='number' title='Select the rate for this Poisson distributed parameter' id='poissonRateVal' value=" + poissonRateVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px'></input>";
		

	$("#parameterDistnCell").append(rateTextBox);


	if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null){
		$("#poissonRateVal").attr("min", parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]));
	}

	
	
}


function addDiscreteUniformPrior(){
	
	if ($("#popup_distn").length == 0) return;
	$("#parameterDistnCell").html("");
	
	$("#distrbutionCanvas").hide(100);
	

	var paramID = $("#popup_distn").attr("paramID")
	
	
	
	var minVal = null;
	if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null) minVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]);
	else if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"] != null && PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]) minVal = 1;


	var maxVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["maxVal"]);
		
	
	var currentVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["fixedDistnVal"]);
	var lowerLimitVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["uniformDistnLowerVal"]);
	var upperLimitVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["uniformDistnUpperVal"]);
	
	if (lowerLimitVal == null || isNaN(lowerLimitVal)) lowerLimitVal = roundToSF(Math.floor(roundToSF((currentVal - (currentVal * 0.5)))));
	if (upperLimitVal == null || isNaN(upperLimitVal)) upperLimitVal = roundToSF(Math.ceil( roundToSF((currentVal + (currentVal * 0.5)))));
	
	
	if (minVal != null && !isNaN(minVal) && lowerLimitVal < minVal) lowerLimitVal = minVal
	if (maxVal != null && !isNaN(maxVal) && upperLimitVal > minVal) upperLimitVal = maxVal
	
	if (lowerLimitVal >= upperLimitVal){
		upperLimitVal += 1;
	}

	
	var lowerLimitTextBox = "Lower: <input type='number' title='Select the lower limit for this parameter' id='uniformDistnLowerVal' value=" + lowerLimitVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px'></input>";
	var upperLimitTextBox = "Upper: <input type='number' title='Select the upper limit for this parameter' id='uniformDistnUpperVal' value=" + upperLimitVal + " style='background-color: #008cba; color:white; vertical-align: middle; text-align:right; width: 70px'></input>";
	
	$("#parameterDistnCell").append(lowerLimitTextBox + "&nbsp;" + upperLimitTextBox);


	if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null){
		$("#uniformDistnLowerVal").attr("min", parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]));
	}

}


function changeDistribution(element){

	console.log("Changing the distribution of", element);
	

	var correspondingTextfield = $("#" + $(element).attr('id').replace("_distn", ""));
	
	closeAllDialogs();
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	
	
	var popupHTML = getDistributionChangeTemplate();
	popupHTML = popupHTML.replace("XX_ID_XX", correspondingTextfield.attr('id'));
	popupHTML = popupHTML.replace("XX_ID_XX", correspondingTextfield.attr('id'));
	popupHTML = popupHTML.replace("XX_TITLE_XX", correspondingTextfield.attr('title'));
	popupHTML = popupHTML.replace("XX_NAME_XX", correspondingTextfield.attr('name'));
	popupHTML = popupHTML.replace("XX_NAME_XX", correspondingTextfield.attr('name'));
	
	var paramID = correspondingTextfield.attr("id");

	
	
	
	var loadParams = function(PHYSICAL_PARAMETERS_LOCAL){

		PHYSICAL_PARAMETERS_TEMP = PHYSICAL_PARAMETERS_LOCAL;
		
		var discreteDescriptionStr = "";
		if (PHYSICAL_PARAMETERS_TEMP[paramID]["integer"] == null || !PHYSICAL_PARAMETERS_TEMP[paramID]["integer"]){
			popupHTML = popupHTML.replace("XX_DISTRIBUTION_XX", getContinuousVariableDistributionsTemplate());
		}else{
			popupHTML = popupHTML.replace("XX_DISTRIBUTION_XX", getDiscreteVariableDistributionsTemplate());
			
			var minVal = null;
			if (PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"] != null) minVal = parseFloat(PHYSICAL_PARAMETERS_TEMP[paramID]["minVal"]);
			else if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"] != null && PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]) minVal = 1;
			if (minVal != null) {
				popupHTML = popupHTML.replace("Poisson Distribution", "Shifted Poisson Distribution");
				discreteDescriptionStr += "The smallest value allowed is " + minVal;
			}

			var maxVal = PHYSICAL_PARAMETERS_TEMP[paramID]["maxVal"];
			if (maxVal != null) {
				popupHTML = popupHTML.replace("Poisson Distribution", "Shifted Poisson Distribution");
				discreteDescriptionStr += "<br>The largest value allowed is " + parseFloat(maxVal);
			};
			
			
		}
		
		if (PHYSICAL_PARAMETERS_TEMP[paramID]["zeroTruncated"]){
			popupHTML = popupHTML.replace("Normal Distribution", "Zero-truncated Normal Distribution");
		}
		
		$(popupHTML).appendTo('body');
		if (discreteDescriptionStr != "") $("#discreteDescription").html(discreteDescriptionStr);
	
		$("#SelectDistribution").val(PHYSICAL_PARAMETERS_TEMP[paramID]["distribution"])
		selectPriorDistribution();
	};

	get_PHYSICAL_PARAMETERS_controller(loadParams);
	

	window.setTimeout(function(){
		
		$("#main").click(function(){
			closePriorDistributionPopup();
		});
		
		$("#mySidenav").click(function(){
			closePriorDistributionPopup();
		});
		
	}, 50);
	
	
	
	
	
//	 background-color:008CBA

}


function closePriorDistributionPopup(){
	
	if ($("#popup_distn").length == 0) return;
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#popup_distn").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);
	PHYSICAL_PARAMETERS_TEMP = {};
	
}











