
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


#include "XMLparser.h"
#include "tinyxml/tinyxml.h"
#include "Settings.h"
#include "Model.h"
#include "Parameter.h"
#include "ExperimentalData.h"


#include <iostream>
#include <list>
#include <math.h> 
#include <vector>


// Using tinyxml


using namespace std;

bool XMLparser::parseXMLFromFilename(char* fileName){


	cout << "parsing " << fileName << endl;
	TiXmlDocument doc(fileName);
	bool succ = doc.LoadFile();

	if (!succ) {
		cout << "Cannot load file " << string(fileName) << endl;
		return false;
	}

	XMLparser::parseXMLFromDocument(doc);
	return true;

}


bool XMLparser::parseXMLFromString(char* XMLdata){


	TiXmlDocument* doc = new TiXmlDocument();
	doc->Parse(XMLdata, 0, TIXML_ENCODING_UTF8);

	//if (!succ) {
		//cout << "Cannot read XML string: \n" << string(XMLdata) << endl;
		//return false;
	//}
	XMLparser::parseXMLFromDocument(*doc);
	delete doc;

	return true;

}



void XMLparser::parseXMLFromDocument(TiXmlDocument doc){



	//model->print();


	TiXmlElement *sessionEle = doc.FirstChildElement("session");
	if (sessionEle){


		ntrials_sim = sessionEle->Attribute("N") ? atoi(sessionEle->Attribute("N")) : ntrials_sim;

		// Parse sequence information
		TiXmlElement *sequenceEle = sessionEle->FirstChildElement("sequence");
		if (sequenceEle){

			seqID = sequenceEle->Attribute("seqID") ? sequenceEle->Attribute("seqID") : seqID;
			bool succ = Settings::setSequence(seqID);

			// If sequence does not already exist then create it
			if (!succ){
				
				string templateSeq = sequenceEle->Attribute("seq") ? sequenceEle->Attribute("seq") : "AAAAAAAAAAAAAAAAAAAAAAAAAA";
				string templateType = sequenceEle->Attribute("TemplateType") ? sequenceEle->Attribute("TemplateType") : "dsDNA";
				string primerType = sequenceEle->Attribute("PrimerType") ? sequenceEle->Attribute("PrimerType") : "ssRNA";

				Sequence* newSeq = new Sequence(seqID, templateType, primerType, templateSeq);
				sequences[seqID] = newSeq;
				Settings::setSequence(seqID);

			}



		}


		// Parse model settings
		TiXmlElement *modelEle = sessionEle->FirstChildElement("elongation-model");
		if (modelEle){

			// Iterate over model setting elements
			for(TiXmlElement* modelSetting = modelEle->FirstChildElement(); modelSetting; modelSetting=modelSetting->NextSiblingElement()) {

				string modelSettingName = modelSetting->Value();
				string value = modelSetting->Attribute("val") ? modelSetting->Attribute("val") : "";
				if (value != ""){


					if (modelSettingName == "allowBacktracking") currentModel->set_allowBacktracking(value == "true");
					else if (modelSettingName == "allowHypertranslocation") currentModel->set_allowHypertranslocation(value == "true");
					else if (modelSettingName == "allowInactivation") currentModel->set_allowInactivation(value == "true");
					else if (modelSettingName == "allowBacktrackWithoutInactivation") currentModel->set_allowBacktrackWithoutInactivation(value == "true");
					else if (modelSettingName == "allowGeometricCatalysis") currentModel->set_allowGeometricCatalysis(value == "true");
					else if (modelSettingName == "allowmRNAfolding") currentModel->set_allowmRNAfolding(value == "true");
					else if (modelSettingName == "allowMisincorporation") currentModel->set_allowMisincorporation(value == "true");
					else if (modelSettingName == "useFourNTPconcentrations") currentModel->set_useFourNTPconcentrations(value == "true");
					else if (modelSettingName == "NTPbindingNParams") currentModel->set_NTPbindingNParams(atoi(value.c_str()));
					else if (modelSettingName == "currentTranslocationModel") currentModel->set_currentTranslocationModel(value);
					else if (modelSettingName == "assumeBindingEquilibrium") currentModel->set_assumeBindingEquilibrium(value == "true");
					else if (modelSettingName == "assumeTranslocationEquilibrium") currentModel->set_assumeTranslocationEquilibrium(value == "true");
				}

			}

		}


		// Parse parameters
		TiXmlElement *parametersEle = sessionEle->FirstChildElement("parameters");
		if (parametersEle) {
			for(TiXmlElement* paramEle = parametersEle->FirstChildElement(); paramEle; paramEle=paramEle->NextSiblingElement()) {
				
				string paramID = paramEle->Value();


				// Get the parameter object
				Parameter *param;
				if (paramID == "NTPconc") param = NTPconc;
				else if (paramID == "ATPconc") param = ATPconc;
				else if (paramID == "CTPconc") param = CTPconc;
				else if (paramID == "GTPconc") param = GTPconc;
				else if (paramID == "UTPconc") param = UTPconc;

				else if (paramID == "hybridLen") param = hybridLen; 
				else if (paramID == "bubbleLeft") param = bubbleLeft; 
				else if (paramID == "bubbleRight") param = bubbleRight; 
				else if (paramID == "GDagSlide") param = GDagSlide; 
				else if (paramID == "DGPost") param = DGPost; 
				else if (paramID == "barrierPos") param = barrierPos; 
				else if (paramID == "FAssist") param = FAssist; 
				else if (paramID == "arrestTime") param = arrestTime; 
				else if (paramID == "kCat") param = kCat; 
				else if (paramID == "Kdiss") param = Kdiss; 
				else if (paramID == "RateBind") param = RateBind; 
				else continue;



				// If this parameter has multiple instances then place them all inside this parameter object (now a meta parameter)
				if (paramEle->Attribute("instances")){

					int ninstances = atoi(paramEle->Attribute("instances"));
					param->convertToMetaParameter(ninstances);

					// Iterate through all instance elements
					int instanceNum = 0;
					for(TiXmlElement* instanceEle = paramEle->FirstChildElement(); instanceEle && instanceNum < ninstances; instanceEle=instanceEle->NextSiblingElement()) {

						// Get the parameter object from the meta parameter
						Parameter* paramInstance = param->getParameterFromMetaParameter(instanceNum);
						instanceNum++;

						// Set the current distribution
						if (instanceEle->Attribute("distribution")) paramInstance->setPriorDistribution(instanceEle->Attribute("distribution"));


						// Set the distribution parameters
						for(const TiXmlAttribute* attr = instanceEle->FirstAttribute(); attr; attr=attr->Next()) {

							string attrName = attr->Name();
							double val = atof(attr->Value());
							paramInstance->setDistributionParameter(attrName, val);

						}


					}


				}

				else{

					// Set the current distribution
					if (paramEle->Attribute("distribution")) param->setPriorDistribution(paramEle->Attribute("distribution"));

					// Set the distribution parameters
					for(const TiXmlAttribute* attr = paramEle->FirstAttribute(); attr; attr=attr->Next()) {

						string attrName = attr->Name();
						double val = atof(attr->Value());
						param->setDistributionParameter(attrName, val);

					}
				}
			}
		}


		// Parse ABC settings
		TiXmlElement *abcEle = sessionEle->FirstChildElement("ABC");
		if (abcEle) {

			_numExperimentalObservations = 0;
			inferenceMethod = abcEle->Attribute("inferenceMethod") ? abcEle->Attribute("inferenceMethod") : inferenceMethod;
			ntrials_abc = abcEle->Attribute("ntrials") ? atoi(abcEle->Attribute("ntrials")) : ntrials_abc;
			testsPerData = abcEle->Attribute("testsPerData") ? atoi(abcEle->Attribute("testsPerData")) : testsPerData;
			_testsPerData_preburnin = abcEle->Attribute("testsPerData_preburnin") ? atoi(abcEle->Attribute("testsPerData_preburnin")) : _testsPerData_preburnin;
			_chiSqthreshold_min = abcEle->Attribute("chiSqthreshold_min") ? atof(abcEle->Attribute("chiSqthreshold_min")) : _chiSqthreshold_min;
			_chiSqthreshold_0 = abcEle->Attribute("chiSqthreshold_0") ? atof(abcEle->Attribute("chiSqthreshold_0")) : _chiSqthreshold_0;
			_chiSqthreshold_gamma = abcEle->Attribute("chiSqthreshold_gamma") ? atof(abcEle->Attribute("chiSqthreshold_gamma")) : _chiSqthreshold_gamma;
			burnin = abcEle->Attribute("burnin") ? atoi(abcEle->Attribute("burnin")) : burnin;
			logEvery = abcEle->Attribute("logEvery") ? atoi(abcEle->Attribute("logEvery")) : logEvery;


			// Parse experimental datasets
			for(TiXmlElement* experimentEle = abcEle->FirstChildElement(); experimentEle; experimentEle=experimentEle->NextSiblingElement()) {

				string experimentType = experimentEle->Attribute("dataType") ? experimentEle->Attribute("dataType") : "forceVelocity";

				// Find the number of observations
				int numObservations = 0;
				for(const TiXmlAttribute* attr = experimentEle->FirstAttribute(); attr; attr=attr->Next()) {
					string attrName = attr->Name();
					if (attrName.substr(0,3) == "obs") numObservations++;
				}
				if (numObservations == 0) continue;

				_numExperimentalObservations += numObservations;
				ExperimentalData experiment(experiments.size() + 1, experimentType, numObservations);

				// Set the constant NTP concentrations and force
				if (experimentEle->Attribute("ATPconc")) experiment.set_ATPconc(atof(experimentEle->Attribute("ATPconc")));
				if (experimentEle->Attribute("CTPconc")) experiment.set_CTPconc(atof(experimentEle->Attribute("CTPconc")));
				if (experimentEle->Attribute("GTPconc")) experiment.set_GTPconc(atof(experimentEle->Attribute("GTPconc")));
				if (experimentEle->Attribute("UTPconc")) experiment.set_UTPconc(atof(experimentEle->Attribute("UTPconc")));
				if (experimentEle->Attribute("force")) experiment.set_force(atof(experimentEle->Attribute("force")));




				// Add experimental settings (x-axis) and observations (y-axis)
				for (int obsNum = 1; obsNum <= numObservations; obsNum ++){

					// If the current observation does not exist then stop parsing
					string key = "obs" + to_string(obsNum);
					if (!experimentEle->Attribute(key.c_str())) break;
					string obs = experimentEle->Attribute(key.c_str());

					// Split string by comma
					vector<string> split_vector = Settings::split(obs, ',');
					double x = atof(split_vector.at(0).c_str());
					double y = atof(split_vector.at(1).c_str());
					experiment.addDatapoint(x, y);


				}


				// Add this experiment to the list of experiments
				experiments.push_back(experiment);

			}

		}




		// Parse estimated models
		TiXmlElement *estimateModelsEle = sessionEle->FirstChildElement("estimated-models");
		if (estimateModelsEle) {


			// Parse each model
			double weightSum = 0; // Sum of all model weights. Will normalise at the end so they sum to 1
			for(TiXmlElement* modelEle = estimateModelsEle->FirstChildElement(); modelEle; modelEle=modelEle->NextSiblingElement()) {

				Model* model = currentModel->clone();

				// Model id
				string id = modelEle->Attribute("id") ? modelEle->Attribute("id") : "x";
				model->setID(id);

				// Get the weight of this model
				double modelWeight = modelEle->Attribute("weight") ? atof(modelEle->Attribute("weight")) : 1;
				weightSum += modelWeight;
				model->setPriorProb(modelWeight);


				// Iterate through the model's settings and hardcoded parameters
				for(const TiXmlAttribute* attr = modelEle->FirstAttribute(); attr; attr=attr->Next()) {

					string attrName = attr->Name();
					string value = attr->Value();

					if (attrName == "id" || attrName == "weight") continue;


					if (value != ""){


						// Model settings
						if (attrName == "allowBacktracking") model->set_allowBacktracking(value == "true");
						else if (attrName == "allowHypertranslocation") model->set_allowHypertranslocation(value == "true");
						else if (attrName == "allowInactivation") model->set_allowInactivation(value == "true");
						else if (attrName == "allowBacktrackWithoutInactivation") model->set_allowBacktrackWithoutInactivation(value == "true");
						else if (attrName == "allowGeometricCatalysis") model->set_allowGeometricCatalysis(value == "true");
						else if (attrName == "allowmRNAfolding") model->set_allowmRNAfolding(value == "true");
						else if (attrName == "allowMisincorporation") model->set_allowMisincorporation(value == "true");
						else if (attrName == "useFourNTPconcentrations") model->set_useFourNTPconcentrations(value == "true");
						else if (attrName == "NTPbindingNParams") model->set_NTPbindingNParams(atoi(value.c_str()));
						else if (attrName == "currentTranslocationModel") model->set_currentTranslocationModel(value);
						else if (attrName == "assumeBindingEquilibrium") model->set_assumeBindingEquilibrium(value == "true");
						else if (attrName == "assumeTranslocationEquilibrium") model->set_assumeTranslocationEquilibrium(value == "true");
						
						
						// Parameters
						else if (attrName == "NTPconc") model->addParameterHardcoding("NTPconc", value);
						else if (attrName == "ATPconc") model->addParameterHardcoding("ATPconc", value);
						else if (attrName == "CTPconc") model->addParameterHardcoding("CTPconc", value);
						else if (attrName == "GTPconc") model->addParameterHardcoding("GTPconc", value);
						else if (attrName == "UTPconc") model->addParameterHardcoding("UTPconc", value);
						else if (attrName == "FAssist") model->addParameterHardcoding("FAssist", value); 

						else if (attrName == "hybridLen") model->addParameterHardcoding("hybridLen", value); 
						else if (attrName == "bubbleLeft") model->addParameterHardcoding("bubbleLeft", value); 
						else if (attrName == "bubbleRight") model->addParameterHardcoding("bubbleRight", value); 

						else if (attrName == "GDagSlide") model->addParameterHardcoding("GDagSlide", value); 
						else if (attrName == "DGPost") model->addParameterHardcoding("DGPost", value); 
						else if (attrName == "barrierPos") model->addParameterHardcoding("barrierPos", value); 

						else if (attrName == "kCat") model->addParameterHardcoding("kCat", value); 
						else if (attrName == "Kdiss") model->addParameterHardcoding("Kdiss", value); 
						else if (attrName == "RateBind") model->addParameterHardcoding("RateBind", value); 

						else if (attrName == "arrestTime") model->addParameterHardcoding("arrestTime", value);

					}


				}


				modelsToEstimate.push_back(*model);


			}


			// Normalise prior weights into probabilities
			for (list<Model>::iterator it=modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
				(*it).setPriorProb((*it).getPriorProb() / weightSum);
			}


			// Sample a model and its parameters randomly
			Settings::sampleModel();


		} else modelsToEstimate.push_back(*currentModel);




	}


	//complementSequence = Settings::complementSeq(templateSequence, TemplateType.substr(2) == "RNA");
	//Settings::print();


}