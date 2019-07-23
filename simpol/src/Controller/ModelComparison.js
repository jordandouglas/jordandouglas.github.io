
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


numberModelsBuilt = 1;


function initModelComparisonpanel(){

	numberModelsBuilt = 1;
	$("#ModelBuildingTable").html("");
	$("#ModelBuildingTable").append(getModelComparisonNewRowButtonTemplate(numberModelsBuilt));

	
}


// Create new model whose settings are those of the current model
function buildNewModel(){

	// Replace the current +new button with an empty template
	var numberModelsBuilt_temp = numberModelsBuilt;
	$("#modelRow_" + numberModelsBuilt_temp).html(getModelComparisonRowTemplate(numberModelsBuilt_temp));
	getParametersAndModelSettings_compact_controller(function(result){

		var objs = [];
		for (var obj in result.model){
			objs.push(obj + "=" + result.model[obj]);
		}
		for (var obj in result.parameters){
			objs.push(obj + "=" + result.parameters[obj]);
		}


		$("#modelBuildingDescription_" + numberModelsBuilt_temp).html(objs.join(", "));
	});

	// Add a new +new button
	numberModelsBuilt++;
	$("#ModelBuildingTable").append(getModelComparisonNewRowButtonTemplate(numberModelsBuilt));

}


// Create a new model where the settings are specified in the function arguments
function populateModelDescription(weight, description){

	// Replace the current +new button with an empty template
	var numberModelsBuilt_temp = numberModelsBuilt;
	$("#modelRow_" + numberModelsBuilt_temp).html(getModelComparisonRowTemplate(numberModelsBuilt_temp));

	// Model weight
	$("#modelWeight_" + numberModelsBuilt_temp).val(weight);

	// Model properties
	var objs = [];
	for (var property in description){
		objs.push(property + "=" + description[property]);
	}
	$("#modelBuildingDescription_" + numberModelsBuilt_temp).html(objs.join(", "));

	// Add a new +new button
	numberModelsBuilt++;
	$("#ModelBuildingTable").append(getModelComparisonNewRowButtonTemplate(numberModelsBuilt));


}





// Activate the selected model. Send the model information through to the WASM and activate it 
function activateModel(modelID){

	if ($("#activateModelBtn_" + modelID).hasClass("modelSelected")) return;

	// Update the view
	activateModel_changeView(modelID);


	// Send through the model information to the WASM
	var modelWeight = $("#modelWeight_" + modelID).val();
	var modelDescription = $("#modelBuildingDescription_" + modelID).val().replace(/ /g,''); // Remove all white spaces here because C++ is annoying
	activateModel_controller(modelID, modelWeight, modelDescription, function(){

		getNTPparametersAndSettings_controller(function(result){


			var params = result["params"];
			var model = result["model"]

			updateModelDOM(model);
			renderParameters_givenParameters(params);


		});
	});



}



function activateModel_changeView(modelID){


	// Activate button CSS
	$(".modelSelected").addClass("operation").removeClass("modelSelected");
	$("#activateModelBtn_" + modelID).addClass("modelSelected").removeClass("operation");


	// Model description textarea CSS
	$(".modelSelectedTextarea").removeClass("modelSelectedTextarea");
	$("#modelBuildingDescription_" + modelID).addClass("modelSelectedTextarea");



}



function getModelComparisonNewRowButtonTemplate(modelRowNum) {

	return `
		<tr id="modelRow_` + modelRowNum + `"  style="width:100%; padding:5 5;" class="selectedModel">
			<td style="padding:5 5" colspan=3>
				<br>
				&nbsp;&nbsp;&nbsp;&nbsp;<span onClick='buildNewModel()' title="Create a new model from the current settings" class="button ABCbtn">+ New model</span>

				<br><br>
			</td>
		</tr>
	`;


}



function getModelComparisonRowTemplate(modelNum) {

	return `

			<td style="padding:5 5">

				<table>
					<tr>
						<td style="text-align:right">
							<b>Model ID:</b> 
						</td>
						<td>
							`  + modelNum +` 
						</td>
					</tr>

					<tr>
						<td style="text-align:right">
							Weight:
						</td>
						<td>
							<input id="modelWeight_` + modelNum + `" type="number" min=0 class="variable param_box" style="width:50px; height: 20px" value=1 title="This model will be resampled at the beginning of each simulation with probability proportional to its weight."></input>
						</td>
					</tr>

				</table>
				 
			</td>

			<td style="padding:5 5; vertical-align:middle; width: 70%">

				<textarea id="modelBuildingDescription_` + modelNum + `" title="Description of all the model settings and the values of all parameters which do not have a prior distribution. A parameter may only have one prior distribution." style="width:100%; max-width:100%; min-width:100%; height: 6em; min-height:4em font-size: 16px" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">Retrieving model JSON...</textarea>

			</td>

			<td style="padding:5 5; text-alight:right">


				<img class="icon" onClick='deleteModel(` + modelNum + `)' src="../src/Images/close.png" style="cursor:pointer" title="Delete this model">

				<span id='activateModelBtn_` + modelNum + `' onClick='activateModel(` + modelNum + `)' title="Activate this model" class="operation button">Activate</span>
			

			</td>

	`;

}



