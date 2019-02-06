
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
#include "MCMC.h"


#include <iostream>
#include <list>
#include <math.h> 
#include <vector>


// Using tinyxml


using namespace std;

bool XMLparser::parseXMLFromFilename(char* fileName, Plots* plotsObj){


	cout << "Parsing " << fileName << endl;
	TiXmlDocument doc(fileName);
	bool succ = doc.LoadFile();

	if (!succ) {
		cout << "Cannot load file " << string(fileName) << endl;
		return false;
	}

	XMLparser::parseXMLFromDocument(doc, plotsObj);
	return true;

}


bool XMLparser::parseXMLFromString(const char* XMLdata, Plots* plotsObj){


	TiXmlDocument* doc = new TiXmlDocument();
	doc->Parse(XMLdata, 0, TIXML_ENCODING_UTF8);

	//if (!succ) {
		//cout << "Cannot read XML string: \n" << string(XMLdata) << endl;
		//return false;
	//}
	XMLparser::parseXMLFromDocument(*doc, plotsObj);
	delete doc;

	return true;

}


// Parse all information from the XML file
// If MCMC is in already progress (ie. MCMC::isInitialised() is set to true) then there are certain variables which we do not want to change eg. the experiments used by MCMC
void XMLparser::parseXMLFromDocument(TiXmlDocument doc, Plots* plotsObj){



	//model->print();

	TiXmlElement *sessionEle = doc.FirstChildElement("session");
	if (sessionEle){

        _animationSpeed = sessionEle->Attribute("speed") ? sessionEle->Attribute("speed") : _animationSpeed;
		ntrials_sim = sessionEle->Attribute("N") ? atoi(sessionEle->Attribute("N")) : ntrials_sim;
		if (sessionEle->Attribute("polymerase")){
			string pol = sessionEle->Attribute("polymerase");
			Settings::activatePolymerase(pol);
		}


		// Parse sequence information
		TiXmlElement *sequenceEle = sessionEle->FirstChildElement("sequence");
		if (sequenceEle){

			_seqID = sequenceEle->Attribute("seqID") ? sequenceEle->Attribute("seqID") : _seqID;
			bool succ = Settings::setSequence(_seqID);


			// If sequence does not already exist then create it
			if (!succ){
				
				string templateSeq = sequenceEle->Attribute("seq") ? sequenceEle->Attribute("seq") : "AAAAAAAAAAAAAAAAAAAAAAAAAA";
				string templateType = sequenceEle->Attribute("TemplateType") ? sequenceEle->Attribute("TemplateType") : "dsDNA";
				string primerType = sequenceEle->Attribute("PrimerType") ? sequenceEle->Attribute("PrimerType") : "ssRNA";



				Sequence* newSeq = new Sequence(_seqID, templateType, primerType, templateSeq);
				sequences[_seqID] = newSeq;
				Settings::setSequence(_seqID);

			}
            
             // delete sequenceEle;


		}
        
        
        
        // Parse plots
        TiXmlElement *plotsEle = sessionEle->FirstChildElement("plots");
        if (plotsEle){
        
            if (plotsObj != nullptr){
            
                
                // Hide the plots?
                string hidePlots = plotsEle->Attribute("hidden") ? plotsEle->Attribute("hidden") : "true";
                cout << "Hiding plots: " << hidePlots << endl;
                plotsObj->hideAllPlots(hidePlots == "true");
                
                
                for (int i = 1; i <= 4; i ++){
                
                    TiXmlElement *plotsSubEle = plotsEle->FirstChildElement(("plot" + to_string(i)).c_str());
                    if (plotsSubEle){
                    
                        // Get the name of the plot and create it
                        string plotName = plotsSubEle->Attribute("name") ? plotsSubEle->Attribute("name") : "";
                        if (plotName == "") continue;
                        plotsObj->userSelectPlot(i, plotName, false);
                        
                        
                        // Change the settings of the plot
                        string settings = "";
                        for(const TiXmlAttribute* attr = plotsSubEle->FirstAttribute(); attr; attr=attr->Next()) {
                            string attrName = attr->Name();
                            string val = attr->Value();
                            if (attrName != "name" && attrName != "plotFunction"){
                                settings = settings + val + "|";
                            }
                        }  
                                              
                        plotsObj->savePlotSettings(i, settings);
                    
                    }
                
                }
            
            
            
            
            }
        
        
            // delete plotsEle;
        
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
					else if (modelSettingName == "allowGeometricCatalysis") currentModel->set_allowGeometricCatalysis(value == "true");
					else if (modelSettingName == "subtractMeanBarrierHeight") currentModel->set_subtractMeanBarrierHeight(value == "true");
					else if (modelSettingName == "allowmRNAfolding") currentModel->set_allowmRNAfolding(value == "true");
					else if (modelSettingName == "allowMisincorporation") currentModel->set_allowMisincorporation(value == "true");
					else if (modelSettingName == "useFourNTPconcentrations") currentModel->set_useFourNTPconcentrations(value == "true");
					else if (modelSettingName == "NTPbindingNParams") currentModel->set_NTPbindingNParams(atoi(value.c_str()));
					else if (modelSettingName == "currentTranslocationModel") currentModel->set_currentTranslocationModel(value);
					else if (modelSettingName == "currentRNABlockadeModel") currentModel->set_currentRNABlockadeModel(value);
					else if (modelSettingName == "currentInactivationModel") currentModel->set_currentInactivationModel(value);
					else if (modelSettingName == "currentBacksteppingModel") currentModel->set_currentBacksteppingModel(value);
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
				else if (paramID == "DGtaudag") param = DGtaudag; 
				else if (paramID == "DGtau1") param = DGtau1; 
				else if (paramID == "barrierPos") param = barrierPos; 
				else if (paramID == "FAssist") param = FAssist; 
				else if (paramID == "arrestTime") param = arrestTime; 
				else if (paramID == "rnaFoldDistance") param = rnaFoldDistance; 
				else if (paramID == "kCat") param = kCat; 
				else if (paramID == "Kdiss") param = Kdiss; 
				else if (paramID == "RateBind") param = RateBind; 
				else if (paramID == "RateActivate") param = RateActivate; 
				else if (paramID == "RateDeactivate") param = RateDeactivate; 
				else if (paramID == "deltaGDaggerHybridDestabil") param = deltaGDaggerHybridDestabil; 
				else if (paramID == "DGtaudagM") param = DGtaudagM; 
				else if (paramID == "RateCleave") param = RateCleave; 
				else if (paramID == "CleavageLimit") param = CleavageLimit; 
				else if (paramID == "DGtaudagP") param = DGtaudagP; 
                else if (paramID == "haltPosition") param = haltPosition; 
                else if (paramID == "proposalWidth") param = proposalWidth; 

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


            // delete parametersEle;
            
		}




		// Parse ABC settings
		TiXmlElement *abcEle = sessionEle->FirstChildElement("ABC");
		if (abcEle) {

			

			if (!MCMC::isInitialised()) _numExperimentalObservations = 0;
			if (!MCMC::isInitialised()) inferenceMethod = abcEle->Attribute("inferenceMethod") ? abcEle->Attribute("inferenceMethod") : inferenceMethod;
			ntrials_abc = abcEle->Attribute("ntrials") ? atoi(abcEle->Attribute("ntrials")) : ntrials_abc;
			testsPerData = abcEle->Attribute("testsPerData") ? atoi(abcEle->Attribute("testsPerData")) : testsPerData;
			_testsPerData_preburnin = abcEle->Attribute("testsPerData_preburnin") ? atoi(abcEle->Attribute("testsPerData_preburnin")) : _testsPerData_preburnin;
			_chiSqthreshold_min = abcEle->Attribute("chiSqthreshold_min") ? atof(abcEle->Attribute("chiSqthreshold_min")) : _chiSqthreshold_min;
			_chiSqthreshold_0 = abcEle->Attribute("chiSqthreshold_0") ? atof(abcEle->Attribute("chiSqthreshold_0")) : _chiSqthreshold_0;
			_chiSqthreshold_gamma = abcEle->Attribute("chiSqthreshold_gamma") ? atof(abcEle->Attribute("chiSqthreshold_gamma")) : _chiSqthreshold_gamma;
            
            _RABC_epsilon = abcEle->Attribute("epsilon") ? atof(abcEle->Attribute("epsilon")) : _RABC_epsilon;
            _RABC_quantile = abcEle->Attribute("quantile") ? atof(abcEle->Attribute("quantile")) : _RABC_quantile;
            
			burnin = abcEle->Attribute("burnin") ? atoi(abcEle->Attribute("burnin")) : burnin;
			if (!MCMC::isInitialised()) logEvery = abcEle->Attribute("logEvery") ? atoi(abcEle->Attribute("logEvery")) : logEvery;



			if (!MCMC::isInitialised()) {

				// Delete all current experimental datasets
				for (list<ExperimentalData*>::iterator it = experiments.begin(); it != experiments.end(); ++it){
					(*it)->clear();
					delete (*it);
				}
				experiments.clear();

			}


			// Parse experimental datasets
			for(TiXmlElement* experimentEle = abcEle->FirstChildElement(); !MCMC::isInitialised() && experimentEle; experimentEle=experimentEle->NextSiblingElement()) {

				string experimentType = experimentEle->Attribute("dataType") ? experimentEle->Attribute("dataType") : "forceVelocity";

				// Find the number of observations. If this is a time gel then count the number of lanes
				int numObservations = 0;
				if (experimentType == "timeGel"){

					// Count number of lanes
					for(TiXmlElement* laneEle = experimentEle->FirstChildElement(); laneEle; laneEle=laneEle->NextSiblingElement()) {
						numObservations++;
					}	

				}
				else if (experimentType == "pauseEscape"){

					// Count number of times in the list
					if (experimentEle->Attribute("times")){
						string times = string(experimentEle->Attribute("times"));
						vector<string> times_split = Settings::split(times, ',');
						numObservations = times_split.size();
						times_split.clear();
					}

				}

				else if (experimentType == "pauseSites"){

					numObservations = 1;

				}


				else{
					for (const TiXmlAttribute* attr = experimentEle->FirstAttribute(); attr; attr=attr->Next()) {
						string attrName = attr->Name();
						if (attrName.substr(0,3) == "obs") numObservations++;
					}
				}
				if (numObservations == 0) continue;

				_numExperimentalObservations += numObservations;
				ExperimentalData* experiment = new ExperimentalData(experiments.size() + 1, experimentType, numObservations);

				// Set the constant NTP concentrations and force
				if (experimentEle->Attribute("ATPconc")) experiment->set_ATPconc(atof(experimentEle->Attribute("ATPconc")));
				if (experimentEle->Attribute("CTPconc")) experiment->set_CTPconc(atof(experimentEle->Attribute("CTPconc")));
				if (experimentEle->Attribute("GTPconc")) experiment->set_GTPconc(atof(experimentEle->Attribute("GTPconc")));
				if (experimentEle->Attribute("UTPconc")) experiment->set_UTPconc(atof(experimentEle->Attribute("UTPconc")));
				if (experimentEle->Attribute("force")) experiment->set_force(atof(experimentEle->Attribute("force")));
				if (experimentEle->Attribute("halt")) experiment->set_halt(atoi(experimentEle->Attribute("halt")));


				// Use a separate sequence for this dataset?
				if (experimentEle->Attribute("seq")) {
					string templateSeq = experimentEle->Attribute("seq");
					string templateType = experimentEle->Attribute("TemplateType") ? experimentEle->Attribute("TemplateType") : TemplateType;
					string primerType = experimentEle->Attribute("PrimerType") ? experimentEle->Attribute("PrimerType") : PrimerType;
					string seqID = "Sequence for experiment " + to_string(experiments.size()+1); 
					Sequence* newSeq = new Sequence(seqID, templateType, primerType, Settings::complementSeq(templateSeq, templateType.substr(2) == "RNA"));
					sequences[seqID] = newSeq;
					experiment->set_sequenceID(seqID);

				}

				// Use default sequence
				else experiment->set_sequenceID(_seqID);




				// Time gel data
				if (experimentType == "timeGel"){

					// Iterate through all lanes
					for(TiXmlElement* laneEle = experimentEle->FirstChildElement(); laneEle; laneEle=laneEle->NextSiblingElement()) {


						// Get the lane number
						int laneNum = stoi(string(laneEle->Value()).substr(4)); // Substring "laneXXX" into the lane number "XXX"
						

						// Find the time associated with this lane
						double time;
						if (laneEle->Attribute("time")) time = atof(laneEle->Attribute("time"));
						else continue;


						// Get the rectangle coordinates
						double rectTop, rectLeft, rectWidth, rectHeight, rectAngle, laneInterceptY;
						bool simulateLane;
						if (laneEle->Attribute("rectTop")) rectTop = atof(laneEle->Attribute("rectTop"));
						if (laneEle->Attribute("rectLeft")) rectLeft = atof(laneEle->Attribute("rectLeft"));
						if (laneEle->Attribute("rectWidth")) rectWidth = atof(laneEle->Attribute("rectWidth"));
						if (laneEle->Attribute("rectHeight")) rectHeight = atof(laneEle->Attribute("rectHeight"));
						if (laneEle->Attribute("rectAngle")) rectAngle = atof(laneEle->Attribute("rectAngle"));
						if (laneEle->Attribute("simulate")) simulateLane = string(laneEle->Attribute("simulate")) == "true" ? true : false;
						if (laneEle->Attribute("laneInterceptY")) laneInterceptY = atof(laneEle->Attribute("laneInterceptY"));



						if (laneEle->Attribute("densities")){

							// Parse the pixel densities
							vector<string> splitStr = Settings::split(string(laneEle->Attribute("densities")), ','); // Split by , to get values
							vector<double> densities(splitStr.size());
							for (int obsNum = 0; obsNum < splitStr.size(); obsNum ++){
								//cout << "obsNum " << obsNum << " " << splitStr.at(obsNum) << endl;
								densities.at(obsNum) = stof(splitStr.at(obsNum));
							}

							experiment->addTimeGelLane(laneNum, time, densities, rectTop, rectLeft, rectWidth, rectHeight, rectAngle, simulateLane, laneInterceptY);
							splitStr.clear();
						}

						else cout << "Cannot parse lane " << laneNum << " because there are no densities." << endl;


					}

				}



				else if (experimentType == "pauseEscape"){

					double Emax = 0;
					double Emin = 0;
					double t12 = 0;

					if (experimentEle->Attribute("pauseSite")) {
						vector<string> pauseSiteSplit = Settings::split(string(experimentEle->Attribute("pauseSite")), '-');

						// 1 pause site (max == min)
						if (pauseSiteSplit.size() == 1){
							int pauseSite = stoi(pauseSiteSplit.at(0));
							experiment->set_pauseSiteMin(pauseSite);
							experiment->set_pauseSiteMax(pauseSite);
						}

						// A range of pause sites (max > min)
						else if (pauseSiteSplit.size() == 2){
							int pauseSite_min = stoi(pauseSiteSplit.at(0));
							int pauseSite_max = stoi(pauseSiteSplit.at(1));
							experiment->set_pauseSiteMin(pauseSite_min);
							experiment->set_pauseSiteMax(pauseSite_max);
						}

						pauseSiteSplit.clear();
					}

					if (experimentEle->Attribute("Emax")) {
						Emax = atof(experimentEle->Attribute("Emax"));
						experiment->set_Emax(Emax);
					}

					if (experimentEle->Attribute("Emin")) {
						Emin = atof(experimentEle->Attribute("Emin"));
						experiment->set_Emin(Emin);
					}

					if (experimentEle->Attribute("t12")) {
						t12 = atof(experimentEle->Attribute("t12"));
						experiment->set_t12(t12);
					}



					// The times when the samples were made
					string times = string(experimentEle->Attribute("times"));
					vector<string> times_split = Settings::split(times, ',');

					for (int obsNum = 0; obsNum < numObservations; obsNum ++){

						double time = stof(times_split.at(obsNum));
						double rate = log(2) / t12;
						double expectedProb = (Emax - Emin) * exp(-time * rate) + Emin;
						experiment->addDatapoint(time, expectedProb);

					}

					times_split.clear();

				}






				else if (experimentType == "pauseSites"){



                    // Read in the indices
                    if (experimentEle->Attribute("indices")){

                        vector<string> indices_split = Settings::split(experimentEle->Attribute("indices"), ',');
                        vector<int> indices_vector(indices_split.size());
                        for (int i = 0; i < indices_split.size(); i ++){
                            indices_vector.at(i) = stoi(indices_split.at(i));
                        }

                        experiment->set_pauseSiteIndices(indices_vector);
                        indices_split.clear();


                    }


				}



				// Velocity data (not time gel)
				else {

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
						if (split_vector.size() == 2) experiment->addDatapoint(x, y);

						// Additionally parse the number of trials
						else if (split_vector.size() == 3){
							int n = atoi(split_vector.at(2).c_str());
							experiment->addDatapoint(x, y, n);
						}

						else {
							cout << "Error: cannot parse experimental observations." << endl;
							exit(0);
						}

						split_vector.clear();


					}

				}


				// Add this experiment to the list of experiments
				experiments.push_back(experiment);

			}

            // delete abcEle;
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
						else if (attrName == "allowGeometricCatalysis") model->set_allowGeometricCatalysis(value == "true");
						else if (attrName == "subtractMeanBarrierHeight") model->set_subtractMeanBarrierHeight(value == "true");
						else if (attrName == "allowmRNAfolding") model->set_allowmRNAfolding(value == "true");
						else if (attrName == "allowMisincorporation") model->set_allowMisincorporation(value == "true");
						else if (attrName == "useFourNTPconcentrations") model->set_useFourNTPconcentrations(value == "true");
						else if (attrName == "NTPbindingNParams") model->set_NTPbindingNParams(atoi(value.c_str()));
						else if (attrName == "currentTranslocationModel") model->set_currentTranslocationModel(value);
						else if (attrName == "currentInactivationModel") model->set_currentInactivationModel(value);
                        else if (attrName == "currentBacksteppingModel") model->set_currentBacksteppingModel(value);
                        else if (attrName == "currentRNABlockadeModel") model->set_currentRNABlockadeModel(value);
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

						else if (attrName == "DGtaudag") model->addParameterHardcoding("DGtaudag", value); 
						else if (attrName == "DGtau1") model->addParameterHardcoding("DGtau1", value); 
						else if (attrName == "barrierPos") model->addParameterHardcoding("barrierPos", value); 

						else if (attrName == "kCat") model->addParameterHardcoding("kCat", value); 
						else if (attrName == "Kdiss") model->addParameterHardcoding("Kdiss", value); 
						else if (attrName == "RateBind") model->addParameterHardcoding("RateBind", value); 

						else if (attrName == "arrestTime") model->addParameterHardcoding("arrestTime", value);
						else if (attrName == "rnaFoldDistance") model->addParameterHardcoding("rnaFoldDistance", value);


						else if (attrName == "RateActivate") model->addParameterHardcoding("RateActivate", value); 
						else if (attrName == "RateDeactivate") model->addParameterHardcoding("RateDeactivate", value); 
						else if (attrName == "DGtaudagM") model->addParameterHardcoding("DGtaudagM", value); 
						else if (attrName == "deltaGDaggerHybridDestabil") model->addParameterHardcoding("deltaGDaggerHybridDestabil", value); 
						else if (attrName == "RateCleave") model->addParameterHardcoding("RateCleave", value); 
						else if (attrName == "CleavageLimit") model->addParameterHardcoding("CleavageLimit", value); 
						else if (attrName == "DGtaudagP") model->addParameterHardcoding("DGtaudagP", value); 

					}


				}


				modelsToEstimate.push_back(model);


			}





			// Sample a model and its parameters randomly
			Settings::sampleModel();
			_sampleModels = true;
            
            // delete estimateModelsEle;
            
		} else modelsToEstimate.push_back(currentModel);
        
        
        // delete sessionEle;

	}




	//complementSequence = Settings::complementSeq(templateSequence, TemplateType.substr(2) == "RNA");
	//Settings::print();


}