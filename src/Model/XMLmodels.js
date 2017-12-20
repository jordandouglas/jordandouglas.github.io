﻿
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

XML_MODELS_JS = {};

XML_MODELS_JS.SAMPLING_MODELS = false;
XML_MODELS_JS.XML_MODELS = [];
XML_MODELS_JS.currentModel = null;
XML_MODELS_JS.previousModel = null;

cachedModel = {};
cachedParams = {};




// Samples a new XML model and updates the parameters to reflect that of the new model
XML_MODELS_JS.sampleNewModel = function(){


	if (!XML_MODELS_JS.SAMPLING_MODELS) return;

	var runif = Math.floor(MER_JS.random() * (XML_MODELS_JS.XML_MODELS.length + (XML_MODELS_JS.currentModel == null ? 0 : -1)));
	if (XML_MODELS_JS.currentModel != null && XML_MODELS_JS.XML_MODELS[runif].name == XML_MODELS_JS.currentModel.name) runif ++; // Ensure that the current model is not sampled
	XML_MODELS_JS.previousModel = XML_MODELS_JS.currentModel;
	XML_MODELS_JS.currentModel = XML_MODELS_JS.XML_MODELS[runif];


	ABC_JS.ABC_parameters_and_metrics_this_simulation["model"] = {name: "Model", val: XML_MODELS_JS.currentModel.name};
	//console.log("Choosing model", XML_MODELS_JS.currentModel.name); 


	// Restore the model from the cached values
	XML_MODELS_JS.decache();

	// Cache the currently set values
	XML_MODELS_JS.cacheGlobals();

	// Set the new values
	XML_MODELS_JS.setGlobalsToCurrentModel();



}



// Set the global parameters and model settings to those of the currently selected model
XML_MODELS_JS.setGlobalsToCurrentModel = function(){


	if (!XML_MODELS_JS.SAMPLING_MODELS || XML_MODELS_JS.currentModel == null) return;

	// Change the model settings and/or parameters to that of the current model
	for (var modelSetting in XML_MODELS_JS.currentModel.model){
		FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel][modelSetting] = XML_MODELS_JS.currentModel.model[modelSetting]; // Set value
	} 
	for (var paramID in XML_MODELS_JS.currentModel.params){
		PARAMS_JS.PHYSICAL_PARAMETERS[paramID].val = XML_MODELS_JS.currentModel.params[paramID]; // Set value
		PARAMS_JS.PHYSICAL_PARAMETERS[paramID].priorVal = XML_MODELS_JS.currentModel.params[paramID]; 
	} 


}


// Cache the global model settings and parameters so we can restore them later
XML_MODELS_JS.decache = function(){


	if (!XML_MODELS_JS.SAMPLING_MODELS) return;

	// Restore the model from the cached values
	for (var modelSetting in cachedModel){
		FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel][modelSetting] = cachedModel[modelSetting];
	} 
	for (var paramID in cachedParams){
		PARAMS_JS.PHYSICAL_PARAMETERS[paramID].val = cachedParams[paramID];
		ABC_JS.ABC_parameters_and_metrics_this_simulation[paramID].priorVal = cachedParams[paramID]; 
	} 

}



// Cache the global model settings and parameters so we can restore them later
XML_MODELS_JS.cacheGlobals = function(){


	if (!XML_MODELS_JS.SAMPLING_MODELS || XML_MODELS_JS.currentModel == null) return;

	cachedModel = {};
	cachedParams = {};

	for (var modelSetting in XML_MODELS_JS.currentModel.model){
		cachedModel[modelSetting] = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel][modelSetting]; // Cache
	} 
	for (var paramID in XML_MODELS_JS.currentModel.params){
		cachedParams[paramID] = PARAMS_JS.PHYSICAL_PARAMETERS[paramID].val; // Cache
	} 


}



// Sets the current model to the one specified
XML_MODELS_JS.selectNewModel = function(modelName){

	if (!XML_MODELS_JS.SAMPLING_MODELS) return;

	for (var i = 0; i < XML_MODELS_JS.XML_MODELS.length; i ++){
		if (XML_MODELS_JS.XML_MODELS[i].name == modelName){
			XML_MODELS_JS.currentModel = XML_MODELS_JS.XML_MODELS[runif];
			PARAMS_JS.PHYSICAL_PARAMETERS = XML_MODELS_JS.currentModel.params;
			FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel] = XML_MODELS_JS.currentModel.model;
			return;
		}
	}

}






XML_MODELS_JS.addNewModel = function(modelName, modelSettings){


	XML_MODELS_JS.SAMPLING_MODELS = true;

	var XMLmodel = {};

	XMLmodel.name = modelName;
	XMLmodel.model = {};
	XMLmodel.params = {};



	// The list of model peroperties and parameter values which are specified in this model
	for (var X in modelSettings){


		// Model property
		if (FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel][X] != null){
			var val = modelSettings[X] == "true" ? true : modelSettings[X] == "false" ? false : modelSettings[X];
			XMLmodel.model[X] = val;
		}

		// Parameter value
		else if (PARAMS_JS.PHYSICAL_PARAMETERS[X] != null){
			XMLmodel.params[X] = parseFloat(modelSettings[X]);
		}

	}

    XML_MODELS_JS.XML_MODELS.push(XMLmodel);

}




if (RUNNING_FROM_COMMAND_LINE){

	module.exports = {
		SAMPLING_MODELS: XML_MODELS_JS.SAMPLING_MODELS,
		XML_MODELS: XML_MODELS_JS.XML_MODELS,
		addNewModel: XML_MODELS_JS.addNewModel,
		sampleNewModel: XML_MODELS_JS.sampleNewModel,
		selectNewModel: XML_MODELS_JS.selectNewModel,
		decache: XML_MODELS_JS.decache,
		cacheGlobals: XML_MODELS_JS.cacheGlobals,
		setGlobalsToCurrentModel: XML_MODELS_JS.setGlobalsToCurrentModel
	}

}

