
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


ELONGATION_MODEL_TEMP = {};

function refreshFreeEnergy(){



	trueSlidingPeakHeights = [-1,-1,-1,-1,-1,-1]; // Defined by 6 heights, the central 4 are always displayed and possibly some of the outer 2 as well 
	trueSlidingTroughHeights = [0,0,0,0,0,0,0]; // Defined by 7 heights, the central 5 are always displayed and possibly some of the outer 2 as well 
	displaySlidingPeakHeights = trueSlidingPeakHeights.slice(); // The values which are displayed on the plot during transitions
	displaySlidingTroughHeights = trueSlidingTroughHeights.slice(); // The values which are displayed on the plot to enable animated transitions


	slippingPeakHeights = [ [-1,-1,-1,-1,-1,-1,-1] ];
	slippingTroughHeights = [ [0,0,0,0,0,0,0] ];
	TslippingPeakHeights = [-1,-1,-1,-1,-1,-1,-1]; 
	TslippingTroughHeights = [0,0,0,0,0,0,0]; 



}




/*  
	*****************
	  Sliding curve
	*****************
*/


function update_sliding_curve(dir){



	var updateHeights = function(dict){

		// Update the true heights
		//console.log("Height object", dict);
		trueSlidingPeakHeights = dict["slidingPeakHeights"];
		trueSlidingTroughHeights = dict["slidingTroughHeights"];


		// dir = -1: move waves right. dir = +1: move waves left. dir = 0: vertical syncing (ie change in landscape)
		var time = new Date();

		var animationTimeLandscape = 200;
		if (dir == 0) update_sliding_curve_vertical_sync(time.getMilliseconds(), animationTimeLandscape);
		else update_sliding_curve_horizontal_sync(time.getMilliseconds(), dir, animationTimeLandscape);


	};

	getSlidingHeights_controller(true, updateHeights);


}


// Moves the sliding curve a fraction closer to its true value, over the timecourse of ANIMATION_TIME
function update_sliding_curve_vertical_sync(startTime, animationTimeLandscape){

	// Calculate the fraction to move by
	var currentTime = new Date().getMilliseconds();
	if (currentTime < startTime) currentTime += 1000;
	var fractionToMoveBy = Math.min((currentTime - startTime) / (animationTimeLandscape * 0.9), 1);


	// Increment the display plot by this fraction
	for (p = 0; p < displaySlidingPeakHeights.length; p++){
		displaySlidingPeakHeights[p] += (trueSlidingPeakHeights[p] - displaySlidingPeakHeights[p]) * fractionToMoveBy;	
	}
	
	for (p = 0; p < displaySlidingTroughHeights.length; p++){
		displaySlidingTroughHeights[p] += (trueSlidingTroughHeights[p] - displaySlidingTroughHeights[p]) * fractionToMoveBy;	
	}

	// Draw the plot
	draw_sliding_plot(0);


	// If there is still time remaining then recurse
	if (fractionToMoveBy < 1){
		window.requestAnimationFrame(function(){
			 update_sliding_curve_vertical_sync(startTime, animationTimeLandscape)
		});
	}


	// If not the display heights will now be equal to the true heights and we stop recursing


}


function update_sliding_curve_horizontal_sync(startTime, dir, animationTimeLandscape){


	// Calculate the fraction to move by
	var currentTime = new Date().getMilliseconds();
	if (currentTime < startTime) currentTime += 1000;
	var fractionToMoveBy = Math.min((currentTime - startTime) / (animationTimeLandscape * 0.9), 1);





	// If there is still time remaining then recurse
	if (fractionToMoveBy < 1){

		// Move the plot curve a fraction to the left or right
		draw_sliding_plot(dir * 4/2 * Math.PI * fractionToMoveBy);

		window.requestAnimationFrame(function(){
			 update_sliding_curve_horizontal_sync(startTime, dir, animationTimeLandscape)
		});
	}


	// If not then we set the display heights to the true heights and we stop recursing
	else{
		displaySlidingPeakHeights = trueSlidingPeakHeights.slice();
		displaySlidingTroughHeights = trueSlidingTroughHeights.slice();

		// Move the plot curve a fraction to the left or right
		draw_sliding_plot(0);
		
		//console.log("trueSlidingPeakHeights", trueSlidingPeakHeights, "displaySlidingTroughHeights", displaySlidingTroughHeights);

	}

}








function updateModelDOM(elongation_model_temp){

	$("#SelectElongationModel").val(elongation_model_temp["id"]);
	$("#allowHypertranslocation").prop('checked', elongation_model_temp["allowHypertranslocation"]);
	$("#allowBacktracking").prop('checked', elongation_model_temp["allowBacktracking"]);
	$("#allowInactivation").prop('checked', elongation_model_temp["allowInactivation"]);
	$("#allowBacktrackWithoutInactivation").prop('checked', elongation_model_temp["allowBacktrackWithoutInactivation"]);
	$("#deactivateUponMisincorporation").prop('checked', elongation_model_temp["deactivateUponMisincorporation"]);
	$("#allowGeometricCatalysis").prop('checked', elongation_model_temp["allowGeometricCatalysis"]);
	$("#allowmRNAfolding").prop('checked', elongation_model_temp["allowmRNAfolding"]);
	$("#allowMisincorporation").prop('checked', elongation_model_temp["allowMisincorporation"]);
	$("#useFourNTPconcentrations").prop('checked', elongation_model_temp["useFourNTPconcentrations"]);
	$("#NTPbindingNParams").prop('checked', elongation_model_temp["NTPbindingNParams"] == 8);

	$("#assumeBindingEquilibrium").prop('checked', elongation_model_temp["assumeBindingEquilibrium"]);


	if (elongation_model_temp["allowBacktracking"] && elongation_model_temp["allowInactivation"]) $("#allowBacktrackWithoutInactivation_container").show(100);
	else $("#allowBacktrackWithoutInactivation_container").hide(100);

	//if (elongation_model_temp["allowInactivation"]) $("#deactivateUponMisincorporation_container").show(100);
	//else $("#deactivateUponMisincorporation_container").hide(100);


	if(elongation_model_temp["allowHypertranslocation"]) $("#GHyper_container").show(300);
	else  $("#GHyper_container").hide(0);
	
	
	if (elongation_model_temp["allowInactivation"]) {
		$("#kU_container").show(100);
		$("#kA_container").show(100);
	}
	else {
		$("#kU_container").hide(0);
		$("#kA_container").hide(0);
	}



	if (elongation_model_temp["id"] == "twoSiteBrownian") $("#GsecondarySitePenalty_container").show(100);
	else $("#GsecondarySitePenalty_container").hide(0);


	if (elongation_model_temp["allowmRNAfolding"]) {
		$("#nbpToFold_container").show(100);
		$("#nbpToFold_desc").show(100);

	}
	else {
		$("#nbpToFold_container").hide(0);
		$("#nbpToFold_desc").hide(0);
	}
	
	

	if (elongation_model_temp["allowMisincorporation"]) {
		$("#RateMisbind_container").show(100);
		//$("#TransitionTransversionRatio_container").show(100);
		$("#deactivateUponMisincorporation_container").show(100);

	}
	else {
		$("#RateMisbind_container").hide(0);
		//$("#TransitionTransversionRatio_container").hide(100);
		$("#deactivateUponMisincorporation_container").hide(0);
	}


	// 1 NTP concentration or 4
	if (elongation_model_temp["useFourNTPconcentrations"]) {
		$("#NTPconc_container").hide(0);
		$("#ATPconc_container").show(100);
		$("#CTPconc_container").show(100);
		$("#GTPconc_container").show(100);
		$("#UTPconc_container").show(100);

	}
	else {
		$("#NTPconc_container").show(100);
		$("#ATPconc_container").hide(0);
		$("#CTPconc_container").hide(0);
		$("#GTPconc_container").hide(0);
		$("#UTPconc_container").hide(0);
	}


	// 2 NTP parameters or 8
	if (elongation_model_temp["NTPbindingNParams"] == 8) {
		$(".NTPparams2").hide(0);
		$("#Kdiss_container").hide(0);
		$("#kCat_container").hide(0);
		$(".NTPparams8").show(100);
		$("#Kdiss_ATP_container").show(100);
		$("#Kdiss_CTP_container").show(100);
		$("#Kdiss_GTP_container").show(100);
		$("#Kdiss_UTP_container").show(100);
		$("#kCat_ATP_container").show(100);
		$("#kCat_CTP_container").show(100);
		$("#kCat_GTP_container").show(100);
		$("#kCat_UTP_container").show(100);


	}

	else {
		$(".NTPparams2").show(100);
		$("#Kdiss_container").show(100);
		$("#kCat_container").show(100);
		$(".NTPparams8").hide(0);
		$("#Kdiss_ATP_container").hide(0);
		$("#Kdiss_CTP_container").hide(0);
		$("#Kdiss_GTP_container").hide(0);
		$("#Kdiss_UTP_container").hide(0);
		$("#kCat_ATP_container").hide(0);
		$("#kCat_CTP_container").hide(0);
		$("#kCat_GTP_container").hide(0);
		$("#kCat_UTP_container").hide(0);
	}


	// Assume NTP binding at equilibrium
	if (elongation_model_temp["assumeBindingEquilibrium"]){
		$("#RateBind_container").hide(0);
	}
	else{
		$("#RateBind_container").show(100);
	}
	

	//if (elongation_model_temp["id"] == "twoSiteBrownian") $("#allowGeometricCatalysis_container").hide(100);
	//else $("#allowGeometricCatalysis_container").show(100);


};



function setModelOptions(){

	getElongationModels_controller(function(result){


		
		$("#SelectElongationModel").empty();
		var currentElongationModel = result["currentElongationModel"];
		var elongation_model = result["ELONGATION_MODELS"]
		var currentTranslocationModel = result["currentTranslocationModel"];
		var translocation_model = result["TRANSLOCATION_MODELS"];

		// Elongation models
		var dropdown = document.getElementById('SelectElongationModel');
		for (var mod in elongation_model){
			var opt = document.createElement('option');
 			opt.value = elongation_model[mod]["id"];
			opt.innerHTML = elongation_model[mod]["name"];
			dropdown.appendChild(opt);
		
		}

		console.log("Translocation models", translocation_model, "currentTranslocationModel", currentTranslocationModel);

		// Translocation models
		dropdown = document.getElementById('SelectTranslocationModel');
		for (var mod in translocation_model){
			var opt = document.createElement('option');
 			opt.value = translocation_model[mod]["id"];
			opt.innerHTML = translocation_model[mod]["name"];
			dropdown.appendChild(opt);
		
		} 


		ELONGATION_MODEL_TEMP = elongation_model[currentElongationModel];
		$("#SelectElongationModel").val(currentElongationModel);
		$("#SelectTranslocationModel").val(currentTranslocationModel);
		updateModelDOM(ELONGATION_MODEL_TEMP);

	});


	
	
}



function viewMisincorporationModel(){

	closeAllDialogs();
	
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getNTPModelDiagramTemplate();



	getMisbindMatrix_controller(function(misbindMatrix){

		//popupHTML = popupHTML.replace("XX_DESC_XX", desc);

		$(popupHTML).appendTo('body');

		var template_T_or_U = misbindMatrix["T"] != null ? "T" : "U";
		var primer_T_or_U = misbindMatrix["A"]["T"] != null ? "T" : "U";

		$("#templateTorU").html(template_T_or_U);
		if (template_T_or_U == "U") $("#templateTorU").css("background-color", "#00aeef");

		$("#primerTorU").html('<div style="width:80px">' + primer_T_or_U + '</div>');
		if (primer_T_or_U == "U") $("#primerTorU").css("background-color", "#00aeef");


		//var d = primer_T_or_U == "T" ? "d" : "";

		$("#kAT").html(roundToSF(misbindMatrix["A"][primer_T_or_U]));
		//$("#kAT").attr("title", "kbind x [" + d + primer_T_or_U + "TP]");
		$("#kAC").html(roundToSF(misbindMatrix["A"]["C"]));
		//$("#kAC").attr("title", "kmisbind x [" + d + "CTP]");
		$("#kAG").html(roundToSF(misbindMatrix["A"]["G"]));
		//$("#kAC").attr("title", "kmisbind x [" + d + "CTP]");
		$("#kAA").html(roundToSF(misbindMatrix["A"]["A"]));

		$("#kGT").html(roundToSF(misbindMatrix["G"][primer_T_or_U]));
		$("#kGC").html(roundToSF(misbindMatrix["G"]["C"]));
		$("#kGG").html(roundToSF(misbindMatrix["G"]["G"]));
		$("#kGA").html(roundToSF(misbindMatrix["G"]["A"]));

		$("#kCT").html(roundToSF(misbindMatrix["C"][primer_T_or_U]));
		$("#kCC").html(roundToSF(misbindMatrix["C"]["C"]));
		$("#kCG").html(roundToSF(misbindMatrix["C"]["G"]));
		$("#kCA").html(roundToSF(misbindMatrix["C"]["A"]));

		$("#kTT").html(roundToSF(misbindMatrix[template_T_or_U][primer_T_or_U]));
		$("#kTC").html(roundToSF(misbindMatrix[template_T_or_U]["C"]));
		$("#kTG").html(roundToSF(misbindMatrix[template_T_or_U]["G"]));
		$("#kTA").html(roundToSF(misbindMatrix[template_T_or_U]["A"]));





		drawModelDiagramCanvas();


	});
	
	window.setTimeout(function(){
		
		$("#main").click(function(){
			closeNTPModelDiagramPopup();
		});
		
		$("#mySidenav").click(function(){
			closeNTPModelDiagramPopup();
		});
		
	}, 50);
	



}




function viewModel(){
	
	closeAllDialogs();
	
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getModelDiagramTemplate();




	getElongationModels_controller(function(result){

		var currentElongationModel = result["currentElongationModel"];
		ELONGATION_MODEL_TEMP = result["ELONGATION_MODELS"][currentElongationModel]; 
		popupHTML = popupHTML.replace("XX_NAME_XX", ELONGATION_MODEL_TEMP["name"]);

		console.log("Backtracking is allowed:", ELONGATION_MODEL_TEMP["allowBacktracking"]);
		console.log("Hypertranslocation is allowed:", ELONGATION_MODEL_TEMP["allowHypertranslocation"]);
		console.log("Inactivation is allowed:", ELONGATION_MODEL_TEMP["allowInactivation"]);


		var disableds = [];
		if (!ELONGATION_MODEL_TEMP["allowHypertranslocation"]) disableds.push("hypertranslocation");
		if (!ELONGATION_MODEL_TEMP["allowBacktracking"]) disableds.push("backtracking");
		if (!ELONGATION_MODEL_TEMP["allowInactivation"]) disableds.push("deactivation");
		if (ELONGATION_MODEL_TEMP["allowBacktracking"] && ELONGATION_MODEL_TEMP["allowInactivation"] && !ELONGATION_MODEL_TEMP["allowBacktrackWithoutInactivation"]) disableds.push("'backtracking while activated'");

		var desc = "";
		if (disableds.length > 0){
			desc = "With ";
			for (var i = 0; i < disableds.length; i ++){
				desc += disableds[i];
				if (i < disableds.length-2) desc += ", ";
				if (i == disableds.length-2) desc += " and ";
			}
			desc += " disabled.";


		}
		popupHTML = popupHTML.replace("XX_DESC_XX", desc);


		$(popupHTML).appendTo('body');

		drawModelDiagramCanvas();


	});
	
	window.setTimeout(function(){
		
		$("#main").click(function(){
			closeModelDiagramPopup();
		});
		
		$("#mySidenav").click(function(){
			closeModelDiagramPopup();
		});
		
	}, 50);
	
	
}


function closeNTPModelDiagramPopup(){

	if ($("#popup_NTPmodel").length == 0) return;
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#popup_NTPmodel").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);

}


function closeModelDiagramPopup(){
	
	if ($("#popup_model").length == 0) return;
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#popup_model").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);
	
}


function closeNTPModelPopup(){
	
	if ($("#popup_NTPmodel").length == 0) return;
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#popup_NTPmodel").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);
	
	
}


function getModelDiagramTemplate(){
	
	
	
	return `
		<div id='popup_model' style='background-color:adadad; padding: 10 10; position:absolute; width: 1200px; left:380; top:20vh; z-index:5;'>
			<div style='background-color: ebe9e7; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 30px'> Kinetic diagram for XX_NAME_XX </span>
				<span style='font-size: 30px; cursor:pointer; position:absolute; vertical-align:top; left:1190px; top:5px' onclick='closeModelDiagramPopup()'>&times;</span>
				<div style='padding:2; font-size:22px;'> XX_DESC_XX </div>

				<div id="modelDiagramDiv">
					<canvas id="modelDiagramCanvas" class="noselect" style="padding:10 10;" width=1000px height=600px></canvas>
				</div>
				

				<div style="font-size:24; height:60px;">
					<div id="kineticStateSescription" style="display:block; text-align:left">  </div>
				</div>
				<div style="font-size:15"> Hover over a state or arrow to read its description. </div>
				

			</div>
		</div>
	`;
	
	
	
}

// "A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e",
function getNTPModelDiagramTemplate(){

	return `
		<div id='popup_NTPmodel' style='background-color:adadad; padding: 10 10; position:fixed; width: 600px; left:380; top:20vh; z-index:5;'>
			<div style='background-color: ebe9e7; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 30px'> NTP binding rates </span>
				<span style='font-size: 30px; cursor:pointer; position:absolute; vertical-align:top; left:590px; top:5px' onclick='closeNTPModelDiagramPopup()'>&times;</span>
				<div style='padding:2; font-size:22px;'> Model for NTP binding which can lead to misincorporations</div>

				<br>
				<table cellspacing="5" cellpadding="5" id="NTPmodelDiagramTable" style="display:block; text-align:center; margin-left:40px; margin-right:40px; font-size:20px;  width:300px;  ">


					<tr>
							<td></td> <td></td> <td></td> <td colspan="4"> Primer </td> 
					</tr>

					<tr>
							<td></td> <td></td> <td></td> <td id="primerTorU" style="background-color:#1c75bc;">  </td> <td style="background-color:#f7941e;"> <div style="width:80px">C</div> </td> <td style="background-color:#00a14b"> <div style="width:80px">G</div> </td> <td style="background-color:#ed1c24"> <div style="width:80px">A</div> </td>
					</tr>

					<tr>
							<td rowspan="4"> <div class="vertical">Template</div> </td> <td></td>  
							<td style="background-color:#ed1c24">A</td> <td style="background-color:#858280" id="kAT"> 0 </td> <td style="background-color:#b3b3b3" id="kAC"> 0 </td> <td id="kAG"> 0 </td> <td id="kAA"> 0 </td>
					</tr>

					<tr>
							<td></td> <td style="background-color:#00a14b">G</td> <td style="background-color:#b3b3b3" id="kGT"> 0 </td> <td id="kGC" style="background-color:#858280"> 0 </td> <td id="kGG"> 0 </td> <td id="kGA"> 0 </td>
					</tr>

					<tr>
							<td></td> <td style="background-color:#f7941e;">C</td> <td id="kCT"> 0 </td> <td id="kCC"> 0 </td> <td id="kCG" style="background-color:#858280"> 0 </td> <td id="kCA" style="background-color:#b3b3b3"> 0 </td>
					</tr>

					<tr>
							<td></td> <td id="templateTorU" style="background-color:#1c75bc;">T</td> <td id="kTT"> 0 </td> <td id="kTC"> 0 </td> <td id="kTG" style="background-color:#b3b3b3"> 0 </td> <td id="kTA" style="background-color:#858280"> 0 </td>
					</tr>

				</table>


				<br><br>
				<div style="font-size:18"> Entry i,j is the rate constant (s<sup>-1</sup>) of binding jTP to base i. These rates are dependent on the concentrations of jTP, 
				the rate of binding (k<sub>bind</sub>), the rate of misbinding (k<sub>misbind</sub>) and the transition transversion ratio. </div>
				

			</div>
		</div>
	`;


}






function getNTPModelSettingsTemplate(){
	
	
	
	return `
		<div id='popup_NTPmodel' style='background-color:adadad; padding: 10 10; position:fixed; width: 800px; left:380; top:30vh; z-index:5;'>
			<div style='background-color: ebe9e7; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto'>
				<span style='font-size: 30px'> NTP parameters</span>

				<span style='font-size: 30px; cursor:pointer; position:absolute; left:770px; top:10px'>
					<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer; float:right" href="about/#polymerisation_ModelHelp"><img class="helpIcon" src="src/Images/help.png"></a>
				</span>
				<span style='font-size: 30px; cursor:pointer; position:absolute; vertical-align:top; left:793px; top:2px' onclick='closeNTPModelPopup()'>&times;</span>
				<div style='padding:2; font-size:22px;'> Select the parameters for binding, catalysing and misincorporating NTP</div>

				<div id="ntpmodelDiagramDiv" style="width:90%; margin:auto; vertical-align:middle; display:block">
					
					<br>
					<table style="width:100%; margin:auto; text-align:center">

						<tr id="NTPbindingNParams_container" title="Do you want two parameters for each NTP or two parameters shared by all four NTPs?">


							<td style="text-align:left; font-size:10px; float:left;">
								<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer; display:none" href="about/#RateBind_help"><img class="helpIcon" src="src/Images/help.png"></a>
					 		</td>

							 
							<td style="text-align:right;  width:110px">
					 			2 params  
					 		</td>
							 
					 		<td colspan=3 style="text-align:left;">
						 		<label class="switch">
							 		 <input type="checkbox" id="NTPbindingNParams" OnChange="userInputModel_controller()"> </input>
							 		 <span class="slider round notboolean"></span>
								</label> 
								<span style="font-size:15px; vertical-align:middle" >8 params</span>
					 		</td>


						</tr>

						<tr>
							<td style="width:100%" colspan=4>


								<table cellspacing="2" cellpadding="2" style="width:100%; margin:auto; text-align:center;">


									<tr style="font-size:18px; "> 

										<td></td>

										<td style="background-color:#b3b3b3; width:44%">
											<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer" href="about/#Kdissociate_ParamHelp"><img class="helpIcon" src="src/Images/help.png"></a> K<sub>D</sub>  (&mu;M)
										</td>


										<td style="background-color:#b3b3b3;  width:44%">
											<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer" href="about/#kCat_ParamHelp"><img class="helpIcon" src="src/Images/help.png"></a> k<sub>cat</sub> (s<sup>-1</sup>)
										</td>

									</tr>



									<tr class="NTPparams2" style="font-size:18px;"> 

										<td style="background-color:#b3b3b3; width:50px">
											[NTP]:
										</td>

										<td id="Kdiss_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number" id="Kdiss" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)">  
										 	<input type=image id='Kdiss_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>


										<td id="kCat_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number"id="kCat" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
					 						<input type=image id='kCat_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>

									</tr>


									<tr class="NTPparams8" style="font-size:18px;"> 

										<td style="background-color:#b3b3b3; width:50px">
											[ATP]:
										</td>


										<td id="Kdiss_ATP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number"id="Kdiss_ATP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
					 						<input type=image id='Kdiss_ATP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>

										<td id="kCat_ATP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number" id="kCat_ATP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
										 	<input type=image id='kCat_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>




									</tr>


									<tr class="NTPparams8" style="font-size:18px;"> 

										<td style="background-color:#b3b3b3; width:50px">
											[CTP]:
										</td>


										<td id="Kdiss_CTP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number"id="Kdiss_CTP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
					 						<input type=image id='Kdiss_CTP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>

										<td id="kCat_CTP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number" id="kCat_CTP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)">  
										 	<input type=image id='kCat_CTP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>




									</tr>


								<tr class="NTPparams8" style="font-size:18px;"> 

										<td style="background-color:#b3b3b3; width:50px">
											[GTP]:
										</td>



										<td id="Kdiss_GTP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number"id="Kdiss_GTP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)">
					 						<input type=image id='Kdiss_GTP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>

										<td id="kCat_GTP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number" id="kCat_GTP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)">  
										 	<input type=image id='kCat_GTP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>



									</tr>



								<tr class="NTPparams8" style="font-size:18px;"> 

										<td style="background-color:#b3b3b3; width:50px">
											[UTP]:
										</td>



										<td id="Kdiss_UTP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number"id="Kdiss_UTP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
					 						<input type=image id='Kdiss_UTP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>

										<td id="kCat_UTP_container" style="vertical-align:bottom; background-color:white;">
											<input class="variable"  type="number" id="kCat_UTP" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
										 	<input type=image id='kCat_UTP_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn_inline">  
										</td>

									</tr>						


								</table> 
							</td>



							



							<tr>
							<td colspan=4>

								<table style="width:50%; margin:auto">
								
								
									<tr id="assumeBindingEquilibrium_container" title="Assume that binding NTP is an equilibrium process? This assumption will speed up the simulation">


										<td style="text-align:left; font-size:10px; float:left;">
											<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer; display:none" href="about/#RateBind_help"><img class="helpIcon" src="src/Images/help.png"></a>
								 		</td>


								 		<td colspan=3>
									 		<label class="switch">
										 		 <input type="checkbox" id="assumeBindingEquilibrium" OnChange="userInputModel_controller()"> </input>
										 		 <span class="slider round"></span>
											</label> 
											<span style="font-size:15px; vertical-align:middle"> Assume NTP binding at equilibrium</span>
								 		</td>


									</tr>


									<tr id="RateBind_container">

										<td style="text-align:left; font-size:10px; float:left; width:20px">
								 			<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer" href="about/#RateBind_ParamHelp"><img class="helpIcon" src="src/Images/help.png"></a>
								 		</td>

										<td style="text-align:right; width:110px">
								 			k<sub>bind</sub> =  

								 		</td>

								 		<td>
								 			<input class="variable"  type="number" id="RateBind" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)">  &mu;M<sup>-1</sup>.s<sup>-1</sup>  
								 		</td>


								 		<td>
								 			<input type=image id='RateBind_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn">  
								 		</td>

								 	</tr>


									<!--
									<tr id="allowMisincorporation_container" title="Can the wrong nucleotide bind (during the simulation)?">


										<td style="text-align:left; font-size:10px; float:left;">
											<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer; display:none" href="about/#RateBind_help"><img class="helpIcon" src="src/Images/help.png"></a>
								 		</td>

										 
								 		<td colspan=3>
									 		<label class="switch">
										 		 <input type="checkbox" id="allowMisincorporation" OnChange="userInputModel_controller()"> </input>
										 		 <span class="slider round"></span>
											</label> 
											<span style="font-size:15px; vertical-align:middle" >Enable misincorporations</span>
								 		</td>


									</tr>
									-->

									<!--
									<tr id="deactivateUponMisincorporation_container" title="Does the polymerase enter the inactivated state upon a nucleotide misincorporation (during the simulation)?">

										<td style="text-align:left; float:left; width:20px">
											<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer; display:none" href="about/#RateMisbind_ParamHelp"><img class="helpIcon" src="src/Images/help.png"></a>
								 		</td>

								 		<td colspan=3>
									 		<label class="switch">
										 		 <input type="checkbox" id="deactivateUponMisincorporation" OnChange="userInputModel_controller()"> </input>
										 		 <span class="slider round"></span>
											</label> 
											<span style="font-size:15px; vertical-align:middle" >Inactivate after misincorporations</span>
								 		</td>


									</tr>
									-->



									<tr id="RateMisbind_container">


										<td style="text-align:left; font-size:10px; float:left;">
											<a title="Help" class="help" target="_blank" style="font-size:10px; padding:3; cursor:pointer" href="about/#RateMisbind_ParamHelp"><img class="helpIcon" src="src/Images/help.png"></a>
								 		</td>

										<td style="text-align:right">
							    			k<sub>misbind</sub> =  
											
										</td>

								 		<td>
								 			 <input class="variable"  type="number" id="RateMisbind" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)">  &mu;M<sup>-1</sup>.s<sup>-1</sup>  
								 		</td>


								 		<td>
								 			<input type=image id='RateMisbind_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn">  
								 		</td>

									</tr>
									
									
									
									

										</tr>

						


								</table>

							</td>

						</tr>


							

						</tr>





					</table>
						

					
				
					<div id="TransitionTransversionRatio_container" style="display:none">
						k<sub>transition</sub> / k<sub>transversion</sub> = <input class="variable"  type="number" id="TransitionTransversionRatio" style="vertical-align: middle; text-align:left; width: 70px" OnChange="update_this_parameter_controller(this)"> 
						<input type=image id='TransitionTransversionRatio_distn' title="Set the prior distribution for this parameter" onClick="changeDistribution(this)" src="src/Images/distn.png" class="distn">  
					</div>
				
					
				</div>
				
				<br><br>


			</div>
		</div>
	`;
	
	
	
}




function drawModelDiagramCanvas(){

	if ($("#modelDiagramDiv").length == 0) return;
	getStateDiagramInfo_controller(function(result){

		var currentState = result["currentState"];

		
		var canvas = $("#modelDiagramCanvas")[0];
		if (canvas == null) return;
		


		var ctx = canvas.getContext('2d');
		ctx.globalAlpha = 1;
		ctx.clearRect(0, 0, canvas.width, canvas.height);


		stateHoverEvents = [];
		spacingBetweenStates = 120;
		arrowSpace = 20;
		var xCoordOfMainState = 550; // Main state is state (m,+1)
		var yCoordOfMainState = ELONGATION_MODEL_TEMP["allowInactivation"] ? 250 : 350;
		var stateWidth = 100;
		var stateHeight = 100;

		
		var widthScale = canvas.width;
		var heightScale = canvas.height;
		

		var m = currentState["rightGBase"] - currentState["mRNAPosInActiveSite"] + 1;
		var pretranslocatedDesc = ELONGATION_MODEL_TEMP["id"] == "twoSiteBrownian" ? 
								"The polymerase is <b>pretranslocated</b> and ready to bind NTP in the secondary binding site. The next base to be copied is at position " + m + ".": 
								"The polymerase is <b>pretranslocated</b>. The next base to be copied is at position " + m + ".";



		// NTP = \u1D3A\u1D40\u1D3E
		
		// Draw the central 4 states which are universal across all models


		var kU = parseFloat($("#kU").val());
		var kA = parseFloat($("#kA").val());
		var krelease = parseFloat($("#RateUnbind").val());
		var kcat = parseFloat($("#kCat").val());
		
		

		///////////////
		// m+1 state //
		var isCurrentState = currentState["mRNAPosInActiveSite"] == 1 && currentState["activated"] && !currentState["NTPbound"];
		plotState(ctx, "S(" + m + ",+1)", xCoordOfMainState, yCoordOfMainState, "The polymerase is <b>posttranslocated</b> and ready to bind the next NTP. The next base to be copied is at position " + m + ".", isCurrentState);

		var rateSum = result["kbind"] + result["k +1,0"] + (ELONGATION_MODEL_TEMP["allowHypertranslocation"] ? result["k +1,+2"] : 0) + (ELONGATION_MODEL_TEMP["allowInactivation"] ? kU : 0);
		plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace, yCoordOfMainState - arrowSpace, "up", "kbind", result["kbind"], rateSum);
		plotArrow_stateDiagram(ctx, xCoordOfMainState - arrowSpace, yCoordOfMainState + stateHeight - arrowSpace, "left", "kbck", result["k +1,0"], rateSum);
		if (ELONGATION_MODEL_TEMP["allowHypertranslocation"]) plotArrow_stateDiagram(ctx, xCoordOfMainState + stateWidth + arrowSpace, yCoordOfMainState + arrowSpace, "right", "kfwd", result["k +1,+2"], rateSum);
		if (ELONGATION_MODEL_TEMP["allowInactivation"]) plotArrow_stateDiagram(ctx, xCoordOfMainState + stateWidth - arrowSpace, yCoordOfMainState + stateHeight + arrowSpace, "down", "kU", kU, rateSum);
		///////////////



		///////////////
		// m0 state  //
		isCurrentState = currentState["mRNAPosInActiveSite"] == 0 && currentState["activated"] && !currentState["NTPbound"];
		var canBT = ELONGATION_MODEL_TEMP["allowBacktracking"] && (!ELONGATION_MODEL_TEMP["allowInactivation"] || (ELONGATION_MODEL_TEMP["allowInactivation"] && ELONGATION_MODEL_TEMP["allowBacktrackWithoutInactivation"]));
		plotState(ctx, "S(" + m + ",0)", 		xCoordOfMainState - spacingBetweenStates - stateWidth,	yCoordOfMainState, pretranslocatedDesc, isCurrentState);

		rateSum = result["k 0,+1"] + (canBT ? result["k 0,-1"] : 0) + (ELONGATION_MODEL_TEMP["id"] == "twoSiteBrownian" ? result["k bind0"] : 0)  + (ELONGATION_MODEL_TEMP["allowInactivation"] ? kU : 0);
		plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace - spacingBetweenStates,	yCoordOfMainState + arrowSpace, "right", "kfwd", result["k 0,+1"], rateSum);
		if (canBT) plotArrow_stateDiagram(ctx, xCoordOfMainState + -1*spacingBetweenStates - stateWidth - arrowSpace,	yCoordOfMainState + stateHeight - arrowSpace, "left", "kbck", result["k 0,-1"], rateSum);
		if (ELONGATION_MODEL_TEMP["id"] == "twoSiteBrownian") plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace - spacingBetweenStates - stateWidth, yCoordOfMainState - arrowSpace, "up", "kbind", result["k bind0"], rateSum);
		if (ELONGATION_MODEL_TEMP["allowInactivation"]) plotArrow_stateDiagram(ctx, xCoordOfMainState  - arrowSpace  - spacingBetweenStates, yCoordOfMainState + stateHeight + arrowSpace, "down", "kU", kU, rateSum);
		///////////////



		/////////////////
		// m+1 N state //
		isCurrentState = currentState["mRNAPosInActiveSite"] == 1 && currentState["activated"] && currentState["NTPbound"];
		plotState(ctx, "S(" + m + ",+1)\u1D3A", xCoordOfMainState,	yCoordOfMainState - spacingBetweenStates - stateHeight, "The polymerase is <b>posttranslocated</b> with NTP bound and ready for catalysis. The base being copied is at position " + m + ".", isCurrentState, "#328332");

		rateSum = krelease + kcat + (ELONGATION_MODEL_TEMP["id"] == "twoSiteBrownian" ? result["kN +1,0"] : 0);
		plotArrow_stateDiagram(ctx, xCoordOfMainState + stateWidth -  arrowSpace, yCoordOfMainState - spacingBetweenStates + arrowSpace, "down", "krelease", krelease, rateSum);
		plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace + stateWidth,	yCoordOfMainState - spacingBetweenStates - stateHeight/2, "right", "kcat", kcat, rateSum);
		if (ELONGATION_MODEL_TEMP["id"] == "twoSiteBrownian") plotArrow_stateDiagram(ctx, xCoordOfMainState - arrowSpace, yCoordOfMainState - spacingBetweenStates - arrowSpace, "left", "kbck", result["kN +1,0"], rateSum);
		////////////////


		/////////////////
		//  catalysed  //
		plotState(ctx, "S(" + (m+1) + ",0)", 	xCoordOfMainState + spacingBetweenStates + stateWidth,	yCoordOfMainState - spacingBetweenStates - stateHeight, "Catalysis has occurred and the polymerase is <b>pretranslocated</b> again. The next base to be copied is at position " + (m+1) + ".");
		////////////////


		// 2nd binding site
		if (ELONGATION_MODEL_TEMP["id"] == "twoSiteBrownian"){

			/////////////////
			// m0 N state  //
			isCurrentState = currentState["mRNAPosInActiveSite"] == 0 && currentState["activated"] && currentState["NTPbound"];
			plotState(ctx, "S(" + m + ",0)\u1D3A", xCoordOfMainState - spacingBetweenStates - stateWidth, yCoordOfMainState - spacingBetweenStates - stateHeight, "The polymerase is <b>pretranslocated</b> with NTP bound in the secondary binding site. The base being copied is at position " + m + ".", isCurrentState, "#328332");
			rateSum = result["k release0"] + result["kN 0,+1"];
			plotArrow_stateDiagram(ctx, xCoordOfMainState  - arrowSpace  - spacingBetweenStates, yCoordOfMainState - spacingBetweenStates + arrowSpace, "down", "krelease", result["k release0"], rateSum);
			plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace - spacingBetweenStates, yCoordOfMainState - spacingBetweenStates - stateHeight + arrowSpace, "right", "kfwd", result["kN 0,+1"], rateSum);
			/////////////////

		}



		// Backtrack state
		if (ELONGATION_MODEL_TEMP["allowBacktracking"]){

			/////////////////
			// m-1 state   //
			isCurrentState = currentState["mRNAPosInActiveSite"] == -1 && currentState["activated"];
			plotState(ctx, "S(" + m + ",-1)", xCoordOfMainState  + 2*(-spacingBetweenStates - stateWidth), yCoordOfMainState, "The polymerase is <b>backtracked</b> by 1 base. The next base to be copied is at position " + m + ".", isCurrentState);
			rateSum = result["k -1,-2"] + (canBT ? result["k -1,0"] : 0) + (ELONGATION_MODEL_TEMP["allowInactivation"] ? kU : 0);
			plotArrow_stateDiagram(ctx, xCoordOfMainState + -2*spacingBetweenStates - 2*stateWidth - arrowSpace,	yCoordOfMainState + stateHeight - arrowSpace, "left", "kbck", result["k -1,-2"], rateSum);
			if (canBT) plotArrow_stateDiagram(ctx, xCoordOfMainState + -2*spacingBetweenStates - stateWidth + arrowSpace,	yCoordOfMainState + arrowSpace, "right", "kfwd", result["k -1,0"], rateSum);
			if (ELONGATION_MODEL_TEMP["allowInactivation"]) plotArrow_stateDiagram(ctx, xCoordOfMainState  - arrowSpace  - 2*spacingBetweenStates -stateWidth, yCoordOfMainState + stateHeight + arrowSpace, "down", "kU", kU, rateSum);
			/////////////////


			// Dot dot dot arrows
			plotArrow_stateDiagram(ctx, xCoordOfMainState + -3*spacingBetweenStates - 2*stateWidth + arrowSpace,	yCoordOfMainState + arrowSpace, "right", "kfwd", result["k -2,-1"]);


		}


		// Hypertranslocated state
		if (ELONGATION_MODEL_TEMP["allowHypertranslocation"]){


			/////////////////
			// m+2 state   //
			isCurrentState = currentState["mRNAPosInActiveSite"] == 2 && currentState["activated"];
			plotState(ctx, "S(" + m + ",+2)", xCoordOfMainState + spacingBetweenStates + stateWidth, yCoordOfMainState, "The polymerase is <b>hypertranslocated</b> by 1 base. The next base to be copied is at position " + m + ".", isCurrentState);
			rateSum = result["k +2,+3"] + result["k +2,+1"] + (ELONGATION_MODEL_TEMP["allowInactivation"] ? kU : 0);
			plotArrow_stateDiagram(ctx, xCoordOfMainState + spacingBetweenStates + 2*stateWidth + arrowSpace, yCoordOfMainState + arrowSpace, "right", "kfwd", result["k +2,+3"], rateSum);
			plotArrow_stateDiagram(ctx, xCoordOfMainState + spacingBetweenStates + stateWidth - arrowSpace, yCoordOfMainState + stateHeight - arrowSpace, "left", "kbck", result["k +2,+1"], rateSum);
			if (ELONGATION_MODEL_TEMP["allowInactivation"]) plotArrow_stateDiagram(ctx, xCoordOfMainState - arrowSpace + 1*spacingBetweenStates + 2*stateWidth, yCoordOfMainState + stateHeight + arrowSpace, "down", "kU", kU, rateSum);
			/////////////////


			// Dot dot dot arrows
			plotArrow_stateDiagram(ctx, xCoordOfMainState + 2*spacingBetweenStates + 2*stateWidth - arrowSpace, yCoordOfMainState + stateHeight - arrowSpace, "left", "kbck", result["k +3,+2"]);

		}


		// Inactivated states
		if (ELONGATION_MODEL_TEMP["allowInactivation"]){

			/////////////////
			// m+1i state  //
			isCurrentState = currentState["mRNAPosInActiveSite"] == 1 && !currentState["activated"];
			plotState(ctx, "S(" + m + ",+1)\u2071", xCoordOfMainState, yCoordOfMainState + stateHeight + spacingBetweenStates, "The polymerase is <b>posttranslocated</b> and catalytically inactive. The next base to be copied is at position " + m + ".", isCurrentState, "#c0306d");
			rateSum = kA + result["k +1,0"] + (ELONGATION_MODEL_TEMP["allowHypertranslocation"] ? result["k +1,+2"] : 0);
			plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace, yCoordOfMainState + stateHeight + spacingBetweenStates - arrowSpace, "up", "kA", kA, rateSum);
			plotArrow_stateDiagram(ctx, xCoordOfMainState - arrowSpace, yCoordOfMainState + 2*stateHeight + spacingBetweenStates - arrowSpace, "left", "kbck", result["k +1,0"], rateSum);
			if (ELONGATION_MODEL_TEMP["allowHypertranslocation"]) plotArrow_stateDiagram(ctx, xCoordOfMainState + stateWidth + arrowSpace, yCoordOfMainState + stateHeight + spacingBetweenStates + arrowSpace, "right",  "kfwd", result["k +1,+2"], rateSum);
			/////////////////



			/////////////////
			// m0 i state  //
			isCurrentState = currentState["mRNAPosInActiveSite"] == 0 && !currentState["activated"];
			plotState(ctx, "S(" + m + ",0)\u2071",  xCoordOfMainState - spacingBetweenStates - stateWidth, yCoordOfMainState + stateHeight + spacingBetweenStates, "The polymerase is <b>pretranslocated</b> and catalytically inactive. The next base to be copied is at position " + m + ".", isCurrentState, "#c0306d");
			rateSum = kA + result["k 0,+1"] + (ELONGATION_MODEL_TEMP["allowBacktracking"] ? result["k 0,-1"] : 0);
			plotArrow_stateDiagram(ctx, xCoordOfMainState - spacingBetweenStates + arrowSpace, yCoordOfMainState + stateHeight + spacingBetweenStates + arrowSpace, "right", "kfwd", result["k 0,+1"], rateSum);
			plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace - spacingBetweenStates - stateWidth, yCoordOfMainState + stateHeight + spacingBetweenStates - arrowSpace, "up", "kA", kA, rateSum);
			if (ELONGATION_MODEL_TEMP["allowBacktracking"]) plotArrow_stateDiagram(ctx, xCoordOfMainState + -1*spacingBetweenStates - stateWidth - arrowSpace,	yCoordOfMainState + 2*stateHeight + spacingBetweenStates - arrowSpace, "left", "kbck", result["k 0,-1"], rateSum);
			/////////////////




			// Backtracked inactivated state
			if (ELONGATION_MODEL_TEMP["allowBacktracking"]){

				/////////////////
				// m-1 i state //
				isCurrentState = currentState["mRNAPosInActiveSite"] == -1 && !currentState["activated"];
				plotState(ctx, "S(" + m + ",-1)\u2071", xCoordOfMainState  + 2*(-spacingBetweenStates - stateWidth), yCoordOfMainState + stateHeight + spacingBetweenStates, "The polymerase is <b>backtracked</b> by 1 base and catalytically inactive. The next base to be copied is at position " + m + ".", isCurrentState, "#c0306d");
				rateSum = result["k -1,0"] + kA + result["k -1,-2"];
				plotArrow_stateDiagram(ctx, xCoordOfMainState + -2*spacingBetweenStates - stateWidth + arrowSpace,	yCoordOfMainState + stateHeight + spacingBetweenStates + arrowSpace, "right", "kfwd", result["k -1,0"], rateSum);
				plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace  - 2*spacingBetweenStates - 2*stateWidth, yCoordOfMainState + stateHeight + spacingBetweenStates - arrowSpace, "up", "kA", kA, rateSum);
				plotArrow_stateDiagram(ctx, xCoordOfMainState + -2*spacingBetweenStates - 2*stateWidth - arrowSpace,	yCoordOfMainState + 2*stateHeight + spacingBetweenStates - arrowSpace, "left", "kbck", result["k -1,-2"], rateSum);
				/////////////////


				// Dot dot dot arrows
				plotArrow_stateDiagram(ctx, xCoordOfMainState + -3*spacingBetweenStates - 2*stateWidth + arrowSpace,	yCoordOfMainState + stateHeight + spacingBetweenStates + arrowSpace, "right", "kfwd", result["k -2,-1"]);



			}


			// Hypertranslocated inactivated state
			if (ELONGATION_MODEL_TEMP["allowHypertranslocation"]){

				/////////////////
				// m+2 i state //
				isCurrentState = currentState["mRNAPosInActiveSite"] == 2 && !currentState["activated"];
				plotState(ctx, "S(" + m + ",+2)\u2071", xCoordOfMainState + spacingBetweenStates + stateWidth, yCoordOfMainState + stateHeight + spacingBetweenStates, "The polymerase is <b>hypertranslocated</b> by 1 base and catalytically inactive. The next base to be copied is at position " + m + ".", isCurrentState, "#c0306d");
				rateSum = result["k +2,+1"] + kA + result["k +2,+3"];
				plotArrow_stateDiagram(ctx, xCoordOfMainState + spacingBetweenStates + stateWidth - arrowSpace, yCoordOfMainState + 2*stateHeight + spacingBetweenStates - arrowSpace, "left", "kbck", result["k +2,+1"], rateSum);
				plotArrow_stateDiagram(ctx, xCoordOfMainState + spacingBetweenStates + 2*stateWidth + arrowSpace, yCoordOfMainState + stateHeight + spacingBetweenStates + arrowSpace, "right", "kfwd", result["k +2,+3"], rateSum);
				plotArrow_stateDiagram(ctx, xCoordOfMainState + arrowSpace + 1*spacingBetweenStates + 1*stateWidth, yCoordOfMainState + stateHeight + spacingBetweenStates - arrowSpace, "up", "kA", kA, rateSum);
				/////////////////

				// Dot dot dot arrows
				plotArrow_stateDiagram(ctx, xCoordOfMainState + 2*spacingBetweenStates + 2*stateWidth - arrowSpace, yCoordOfMainState + 2*stateHeight + spacingBetweenStates - arrowSpace, "left", "kbck", result["k +3,+2"]);


			}


		}




		// Hover events
		canvas.onmousemove = function(e) { 

			var rect = this.getBoundingClientRect();
			var mouseHover = false;
			for (var i = 0; i < stateHoverEvents.length; i++){
				
				if (stateHoverEvents[i](e, rect)){
					mouseHover = true;
				 	break;
				}

			}


			if (mouseHover){
				$("#modelDiagramCanvas").css('cursor','pointer');
			}

			else{
				//$("#kineticStateSescription").hide(1);
				$("#modelDiagramCanvas").css('cursor','auto');
			}


		};


	});




}


function plotArrow_stateDiagram(ctx, fromx, fromy, direction, label = "", rate = 0, rateSum = 0){

	ctx.globalAlpha = 1;
	var headlen = 10;
	var toy, tox;
	switch(direction) {
	    case "left":
	    	toy = fromy;
	    	tox = fromx - spacingBetweenStates + 3*arrowSpace;
	        break;
   	    case "right":
	    	toy = fromy;
	    	tox = fromx + spacingBetweenStates - 3*arrowSpace;
	        break;
	    case "up":
	    	toy = fromy - spacingBetweenStates + 3*arrowSpace;
	    	tox = fromx;
	        break;
	    case "down":
	    	toy = fromy + spacingBetweenStates - 3*arrowSpace;
	    	tox = fromx;
	        break;
	}


    //variables to be used when creating the arrow
    var angle = Math.atan2(toy-fromy,tox-fromx);

    var maxArrowSize = 30;
    var minArrowSize = 10;
    if (rate == 0 || rateSum == 0) arrowSize = 18;
    else arrowSize = (rate / rateSum) * (maxArrowSize - minArrowSize) + minArrowSize;


    //starting path of the arrow from the start square to the end square and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.strokeStyle = "#708090";
    ctx.lineWidth = arrowSize;
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),toy-headlen*Math.sin(angle+Math.PI/7));

    //path from the side point back to the tip of the arrow, and then again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

    //draws the paths created above
    ctx.lineWidth = arrowSize;
    ctx.stroke();
    ctx.fillStyle = "#708090";
    ctx.fill();


    // Label
    var labelWidthSpacer = arrowSize;
    var labelLengthSpacer = 18;

    var xLabPos, yLabPos;
    switch(direction) {
	    case "left":
	    	xLabPos = fromx;
	    	yLabPos = fromy + 12 + labelWidthSpacer;
	    	ctx.textAlign= "right";
	    	ctx.textBaseline="bottom"; 
	        break;
   	    case "right":
	    	xLabPos = fromx;
	    	yLabPos = fromy - labelWidthSpacer - 12;
	    	ctx.textAlign= "left";
	    	ctx.textBaseline="top"; 
	        break;
	    case "up":
	    	xLabPos = fromx - labelWidthSpacer + 5;
	    	yLabPos = fromy - labelLengthSpacer;
	    	ctx.textAlign= "right";
	    	ctx.textBaseline="top"; 
	        break;
	    case "down":
	    	xLabPos = fromx + labelWidthSpacer - 5;
	    	yLabPos = fromy + labelLengthSpacer;
	    	ctx.textAlign= "left";
	    	ctx.textBaseline="bottom"; 
	        break;
	}



	if (label == "") return;

	// Label
	ctx.fillStyle = "black";
	ctx.font = "14px Arial";

	ctx.fillText(label, xLabPos, yLabPos);



    // Mouseover event
	stateHoverEvents.push(function(e, rect) {


		if (label == "") return;

		var mouseInArrow = true;

        var mouseX = e.clientX - rect.left - 10;
		var mouseY = e.clientY - rect.top - 10;

		// X-axis collision
		if (direction == "up" || direction == "down") mouseInArrow = mouseInArrow && fromx - 20 <= mouseX && fromx + 20 >= mouseX; 
		else if(direction == "left") mouseInArrow = mouseInArrow && tox - headlen  <= mouseX && fromx >= mouseX; 
		else mouseInArrow = mouseInArrow && fromx  <= mouseX && tox + headlen >= mouseX; 


		// Y-axis collision
		if (direction == "left" || direction == "right") mouseInArrow = mouseInArrow && fromy - 20 <= mouseY && fromy + 20 >= mouseY; 
		else if(direction == "up") mouseInArrow = mouseInArrow && toy - headlen  <= mouseY && fromy >= mouseY; 
		else mouseInArrow = mouseInArrow && fromy  <= mouseY && toy + headlen >= mouseY; 

		if (mouseInArrow){
			var fullDescription = "Rate constant " + label + " = " + roundToSF(rate) +  "s\u207B\u00B9.";
			if (rateSum != 0) {
				var sf = 3;
				var prob = roundToSF(rate/rateSum, sf);
				while(rate != rateSum && prob == 1) { 	// Make sure that the probability does not equal 1 exactly (unless its actually 1)
					sf++;
					prob = roundToSF(rate/rateSum, sf);

					if (sf > 20) break;
				}
				fullDescription += " This reaction will occur with probability " + prob + ".";
			}
			$("#kineticStateSescription").html(fullDescription);
			return true;
		}
		return false;


	});


}



function plotState(ctx, label, xCoord, yCoord, desc = "", isCurrentState = false, borderCol = "#008CBA", width = 100, height = 100){

		//var borderCol = "#708090";
		//var fillCol = "#008CBA";

		//var borderCol = "#008CBA";
		var fillCol = isCurrentState ? "#b3b3b3" : "white";

		var borderWidth = 4;


		// Border
		ctx.globalAlpha = 1;
		ctx.fillStyle = borderCol;
		ctx.fillRect(xCoord, yCoord, width, height); 


		// Inner
		ctx.globalAlpha = 1;
		ctx.fillStyle = fillCol;
		ctx.fillRect(xCoord + borderWidth, yCoord + borderWidth, width - 2*borderWidth, height - 2*borderWidth); 


		// Label
		ctx.fillStyle = "black";
		ctx.textBaseline="bottom"; 
		ctx.font = "18px Arial";
		ctx.textAlign= "center";
		ctx.fillText(label, xCoord + width/2, yCoord + height/2 + 10);



		// Mouseover event
		stateHoverEvents.push(function(e, rect) {


	        var mouseX = e.clientX - rect.left - 10;
			var mouseY = e.clientY - rect.top - 10;
			var mouseInSquare = xCoord <= mouseX && xCoord + width >= mouseX && yCoord <= mouseY && yCoord + height >= mouseY;
			if (mouseInSquare){
				var fullDescription = (isCurrentState ? "<span style='background-color:#b3b3b3'>Current state:</span>" : "State:") + " " + label + " : " + desc;
				$("#kineticStateSescription").html(fullDescription);
				//$("#kineticStateSescription").show(50);
				return true;
			}
			return false;

		});


}








function viewNTPModel(){
	
	
	
	closeAllDialogs();
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getNTPModelSettingsTemplate();



	getNTPparametersAndSettings_controller(function(result){


		var params = result["params"];
		var model = result["model"]

		$(popupHTML).appendTo('body');



		// 2 NTP parameters or 8
		$("#NTPbindingNParams").prop('checked', model["NTPbindingNParams"] == 8);




		updateModelDOM(model);
		renderParameters_givenParameters(params);


	});
	
	window.setTimeout(function(){

		$("#main").click(function(){
			closeNTPModelPopup();
		});
		
		$("#mySidenav").click(function(){
			closeNTPModelPopup();
		});
		
	}, 50);
	

	
	
	
}




