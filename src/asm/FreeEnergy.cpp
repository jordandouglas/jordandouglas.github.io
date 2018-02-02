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


#include "FreeEnergy.h"
#include "State.h"
#include "Settings.h"


#include <iostream>
#include <algorithm>
#include <map>
#include <vector>
#include <list>

using namespace std;

map<std::string, double> FreeEnergy::basepairingEnergy;

double FreeEnergy::getFreeEnergyOfHybrid(State* state){

	vector<string> hybridStrings = FreeEnergy::getHybridString(state);
	double hybridFreeEnergy = FreeEnergy::getHybridFreeEnergy(hybridStrings.at(0), hybridStrings.at(1), TemplateType.substr(2), PrimerType.substr(2));
	return hybridFreeEnergy;

}


double FreeEnergy::getFreeEnergyOfTranscriptionBubble(State* state){

	if (TemplateType.substr(0, 2) == "ss") return 0;
		
	double bubbleFreeEnergy = 0;
	
	int leftmostTemplatePos = state->getLeftBaseNumber() - (int)(bubbleLeft->getVal()) - 2;
	int leftmostComplementPos = leftmostTemplatePos;
	int rightmostTemplatePos = state->getRightBaseNumber() + (int)(bubbleRight->getVal());
	int rightmostComplementPos = rightmostTemplatePos;
	vector<string> bubbleStrings = FreeEnergy::getHybridStringOfTranscriptionBubble(leftmostTemplatePos, rightmostTemplatePos, leftmostComplementPos, rightmostComplementPos);
	//cout << "bubbleStrings " << bubbleStrings.at(0) << "/" <<  bubbleStrings.at(1) << endl;
	bubbleFreeEnergy = getFreeEnergyOfTranscriptionBubbleHybridString(bubbleStrings.at(0), bubbleStrings.at(1), TemplateType.substr(2));
	
	
	return bubbleFreeEnergy;
}


double FreeEnergy::getFreeEnergyOfIntermediateState(State* state1, State* state2){

	double freeEnergy = 0;

	
	vector<string> hybridStrings1 = FreeEnergy::getHybridString(state1);
	vector<string> hybridStrings2 = FreeEnergy::getHybridString(state2);
	vector<string> intermediateString = FreeEnergy::getHybridIntermediateString(hybridStrings1, hybridStrings2, state1->getLeftBaseNumber(), state2->getLeftBaseNumber());
	
	
	freeEnergy = getHybridFreeEnergy(intermediateString.at(0), intermediateString.at(1), TemplateType.substr(2), PrimerType.substr(2));
	
	
	return freeEnergy;


}


double FreeEnergy::getFreeEnergyOfTranscriptionBubbleIntermediate(State* state1, State* state2){

	if (TemplateType.substr(0,2)== "ss") return 0;
	double freeEnergy = 0;
	
	int leftmostTemplatePos = min(state1->getLeftBaseNumber(), state2->getLeftBaseNumber()) - (int)bubbleLeft->getVal() - 2;
	int leftmostComplementPos = leftmostTemplatePos;
	int rightmostTemplatePos = max(state1->getRightBaseNumber(), state2->getRightBaseNumber()) + (int)bubbleRight->getVal();
	int rightmostComplementPos = rightmostTemplatePos;


	// Take the intersection of missing basepairs if going for the sealing model
	if (currentModel->get_currentTranslocationModel() == "sealingBarriers"){
		leftmostTemplatePos ++;
		leftmostComplementPos ++;
		rightmostTemplatePos --;
		rightmostComplementPos --;
	}

	
	vector<string> hybridStrings = FreeEnergy::getHybridStringOfTranscriptionBubble(leftmostTemplatePos, rightmostTemplatePos, leftmostComplementPos, rightmostComplementPos);
	
	
	//System.out.println("hybridStrings " + hybridStrings[0] + "/" +  hybridStrings[1]);
	
	freeEnergy = getFreeEnergyOfTranscriptionBubbleHybridString(hybridStrings.at(0), hybridStrings.at(1), TemplateType.substr(2));
	
	return freeEnergy;

}


vector<string> FreeEnergy::getHybridString(State *state){

	string templateString = "";
	string nascentString = "";
	int stopWhenAt = (int)hybridLen->getVal();
	int rightBase = state->getRightBaseNumber();
	int leftBase = state->getLeftBaseNumber();

	for (int hybridPos = 0; hybridPos < stopWhenAt; hybridPos++){
			
			
		int baseNum = rightBase - hybridPos;

		
		// Go to next base if this one does not exist
		if (baseNum < 0 || baseNum < leftBase || baseNum > templateSequence.length() || baseNum > state->get_nascentLength()) continue;
		
		string gBase = templateSequence.substr(baseNum-1, 1);
		string nBase = state->get_NascentSequence().substr(baseNum-1, 1);
		
		templateString = gBase + templateString;
		nascentString = nBase + nascentString;
		
	}


	vector<string> hybridStrings(2);
	hybridStrings.at(0) = templateString;
	hybridStrings.at(1) = nascentString;
	return hybridStrings;

}



vector<string> FreeEnergy::getHybridStringOfTranscriptionBubble(int leftmostTemplatePos, int rightmostTemplatePos, int leftmostComplementPos, int rightmostComplementPos){

	// Build strings
		
	// template   3' AACGATTCGAT
	// complement 5' TTGCTAAGCTA
	string templateString = "";
	string complementString = "";
	
	//System.out.println("leftmostTemplatePos " + leftmostTemplatePos + " rightmostTemplatePos " + rightmostTemplatePos);
	
	for (int i = leftmostTemplatePos; i <= rightmostTemplatePos; i ++){
		if (i < 1) continue;
		if (i >= templateSequence.length()) break;
		templateString += templateSequence.substr(i, 1);
	}
	for (int i = leftmostComplementPos; i <= rightmostComplementPos; i ++){
		if (i < 1) continue;
		if (i >= templateSequence.length()) break;
		complementString += complementSequence.substr(i, 1);
	}
	
	
	vector<string> bubbleStrings(2);
	bubbleStrings.at(0) = templateString;
	bubbleStrings.at(1) = complementString;
	return bubbleStrings;

}



list<string> getListIntersection(list<string> list1, list<string> list2){

	list<string> intersection;
	for (list<string>::iterator it1 = list1.begin(); it1 != list1.end(); ++it1){
   		for (list<string>::iterator it2 = list2.begin(); it2 != list2.end(); ++it2){

   			// Match
			if (*it1 == *it2) {

				// Check that the item is not already in the intersection list
				bool alreadyFound = false;
				for (list<string>::iterator it3 = intersection.begin(); it3 != intersection.end(); ++it3){
					if (*it1 == *it3){
						alreadyFound = true;
						break;
					}
				}
				if (!alreadyFound) intersection.push_back(*it1);
				break;
			}

		}
	}

	return intersection;
}



list<string> getListUnion(list<string> list1, list<string> list2){

	list<string> unionset;
	for (list<string>::iterator it1 = list1.begin(); it1 != list1.end(); ++it1){

		// Check that the item is not already in the union list
		bool alreadyFound = false;
		for (list<string>::iterator it3 = unionset.begin(); it3 != unionset.end(); ++it3){
			if (*it1 == *it3){
				alreadyFound = true;
				break;
			}
		}
		if (!alreadyFound) unionset.push_back(*it1);

	}


	for (list<string>::iterator it1 = list2.begin(); it1 != list2.end(); ++it1){

		// Check that the item is not already in the union list
		bool alreadyFound = false;
		for (list<string>::iterator it3 = unionset.begin(); it3 != unionset.end(); ++it3){
			if (*it1 == *it3){
				alreadyFound = true;
				break;
			}
		}
		if (!alreadyFound) unionset.push_back(*it1);

	}

	return unionset;
}



vector<string> FreeEnergy::getHybridIntermediateString(vector<string> hybridStrings1, vector<string> hybridStrings2, int left1, int left2){

	
	// Build a list of basepairs between template and hybrid in each sequence
	list<string> basepairs1 = FreeEnergy::getBasePairs(hybridStrings1[0], hybridStrings1[1], left1);
	list<string> basepairs2 = FreeEnergy::getBasePairs(hybridStrings2[0], hybridStrings2[1], left2);

	// Find the basepairs which are in both sets (ie. the intersection)
	list<string> basepairsIntermediate = getListIntersection(basepairs1, basepairs2);


	string strIntermediateT = "";
	string strIntermediateN = "";
	
	

	// Convert the intermediate basepairs back into a string
	for (list<string>::iterator it = basepairsIntermediate.begin(); it != basepairsIntermediate.end(); ++it){
		

		// Split string by _
		vector<string> split_vector = Settings::split(*it, '_');

		
		int baseNum1 = atoi(split_vector.at(0).c_str());
		int baseIndex = baseNum1 - left1;
		
		
		string Tbase = hybridStrings1.at(0).substr(baseIndex, 1); // Intersection means that either string1 or string2 can be used
		string Nbase = hybridStrings1.at(1).substr(baseIndex, 1);
		
		strIntermediateT += Tbase;
		strIntermediateN += Nbase;

		
	}


	vector<string> intermediateStrings(2);
	intermediateStrings.at(0) = strIntermediateT;
	intermediateStrings.at(1) = strIntermediateN;
	return intermediateStrings;

}



list<string> FreeEnergy::getBasePairs(string templateString, string nascentString, int leftT){

	
	list<string> basePairs;

	int templateIndex = 0;
	int primerIndex = 0;

	while(true){
		
		// If we have exceeded the string lengths then exit
		if (templateIndex >= templateString.length() || primerIndex >= nascentString.length()) break;
		
		
		// If both are uppercase then they are basepaired
		//if (isUpperCase_WW(strT[templateIndex]) && isUpperCase_WW(strP[primerIndex])){

			//string key = to_string(templateIndex + leftT) + "_" + to_string(primerIndex + leftT);
			//basePairs.push_back(key);

			char szKeyText[32];
            sprintf( szKeyText, "%u_%u", templateIndex + leftT, primerIndex + leftT );
            basePairs.push_back(szKeyText);
			templateIndex++;
			primerIndex++;

            

		//}
		
		
		/*
		// If only one is uppercase then skip the other one
		else if (isUpperCase_WW(strT[templateIndex]) & !isUpperCase_WW(strP[primerIndex])){
			primerIndex++;
		}
		else if (!isUpperCase_WW(strT[templateIndex]) & isUpperCase_WW(strP[primerIndex])){
			templateIndex++;
		}
		
		
		// If neither are uppercase then skip both
		else if (!isUpperCase_WW(strT[templateIndex]) && !isUpperCase_WW(strP[primerIndex])){
			templateIndex++;
			primerIndex++;
		}*/

		
	}

	return basePairs;



}


double FreeEnergy::getHybridFreeEnergy(string templateString, string nascentString, string templateType, string nascentType){


	double freeEnergy = 0;
		
	for (int hybridPos = 0; hybridPos < min(templateString.length(), nascentString.length()) - 1; hybridPos ++){
		
		string thisNBase = nascentString.substr(hybridPos, 1);
		string thisGBase = templateString.substr(hybridPos, 1);
		
		string nextNBase = nascentString.substr(hybridPos+1, 1);
		string nextGBase = templateString.substr(hybridPos+1, 1);
		
		if (templateType == "DNA"){
			thisGBase = "d" + thisGBase;
			nextGBase = "d" + nextGBase;
		}
		if (nascentType == "DNA"){
			thisNBase = "d" + thisNBase;
			nextNBase = "d" + nextNBase;
		}
		string dictKey = thisNBase + nextNBase + thisGBase + nextGBase;
		double energy = basepairingEnergy[dictKey];
		
		//cout << "Looking for " << dictKey << " found " << energy << endl;
		if (basepairingEnergy.find(dictKey) == basepairingEnergy.end()) freeEnergy += 2; // TODO: need to find dGU basepairing parameters 
		else freeEnergy += energy;
		
	}
	
	
	return freeEnergy / _RT;
		

}



double FreeEnergy::getFreeEnergyOfTranscriptionBubbleHybridString(string templateString, string complementString, string templateType){

	double freeEnergy = 0;

	//System.out.println(complementString + "\n" + templateString);
	for (int i = 0; i < templateString.length()-1; i ++){
		
		string d = templateType == "DNA" ? "d" : "";
		string thisTemplateBase = d + templateString.substr(i, 1);
		string thisComplementBase = d + complementString.substr(i, 1);
		string nextTemplateBase = d + templateString.substr(i+1, 1);
		string nextComplementBase = d + complementString.substr(i+1, 1);
		
		string dictKey = thisComplementBase + nextComplementBase + thisTemplateBase + nextTemplateBase;
		double energy = basepairingEnergy[dictKey];
		//System.out.println("Looking for dictkey " + dictKey + " found " + energy);
		if (basepairingEnergy.find(dictKey) == basepairingEnergy.end()) freeEnergy += 2; // TODO: need to find dGU basepairing parameters 
		else freeEnergy += energy;
		
	}
	
	return freeEnergy / _RT;

}


// Calculates the mean pre-posttranslocated equilibrium constant (kfwd / kbck) across the whole sequence
// Populates the provided array[3] with 1) meanEquilibriumConstant, 2) meanForwardRate and 3) meanBackwardsRate
void FreeEnergy::calculateMeanTranslocationEquilibriumConstant(double* results){

	State* state = new State(true);

	// Iterate until the end of the sequence
	state->transcribe(1);
	int nsites = templateSequence.length() - hybridLen->getVal() - bubbleLeft->getVal() - 3;
	vector<double> equilibriumConstants(nsites);
	vector<double> forwardRates(nsites);
	vector<double> backwardsRates(nsites);
	for (int i = 0; i < nsites; i ++){
	//while (state->get_mRNAPosInActiveSite() + state->get_nascentLength() + 1 <= templateSequence.length()){
		


		// Get rate of pre -> post
		state->backward();
		double kPreToPost = state->calculateForwardRate(true, true);

		// Get rate of post -> pre
		state->forward();
		double kPostToPre = state->calculateBackwardRate(true, true);
		
		// Calculate equilibrium constant
		equilibriumConstants.at(i) = kPreToPost / kPostToPre;
		forwardRates.at(i) = kPreToPost;
		backwardsRates.at(i) = kPostToPre;
		
		// Bind NTP and catalyse to get next state
		state->transcribe(1);
		
	}


	// Calculate mean equilibrium constant
	double meanEquilibriumConstant = 0;
	double meanForwardRate = 0;
	double meanBackwardsRate = 0;
	for (int i = 0; i < nsites; i ++) {
		meanEquilibriumConstant += equilibriumConstants.at(i) / nsites;
		meanForwardRate += forwardRates.at(i) / nsites;
		meanBackwardsRate += backwardsRates.at(i) / nsites;
	}
	
	results[0] = meanEquilibriumConstant;
	results[1] = meanForwardRate;
	results[2] = meanBackwardsRate;

	delete state;


}



void FreeEnergy::init_BP_parameters(){


	basepairingEnergy.clear();

	// RNA-RNA
	basepairingEnergy["AAUU"] = -0.93;
	basepairingEnergy["UUAA"] = -0.93;
	basepairingEnergy["AUUA"] = -1.10;
	basepairingEnergy["UAAU"] = -1.33;
	basepairingEnergy["CUGA"] = -2.08;
	basepairingEnergy["AGUC"] = -2.08;
	basepairingEnergy["CAGU"] = -2.11;
	basepairingEnergy["UGAC"] = -2.11;
	basepairingEnergy["GUCA"] = -2.24;
	basepairingEnergy["ACUG"] = -2.24;
	basepairingEnergy["GACU"] = -2.35;
	basepairingEnergy["UCAG"] = -2.35;
	basepairingEnergy["CGGC"] = -2.36;
	basepairingEnergy["GGCC"] = -3.26;
	basepairingEnergy["CCGG"] = -3.26;
	basepairingEnergy["GCCG"] = -3.42;
	
	basepairingEnergy["AGUU"] = -0.55;
	basepairingEnergy["UUGA"] = -0.55;
	basepairingEnergy["AUUG"] = -1.36;
	basepairingEnergy["GUUA"] = -1.36;
	basepairingEnergy["CGGU"] = -1.41;
	basepairingEnergy["UGGC"] = -1.41;
	basepairingEnergy["CUGG"] = -2.11;
	basepairingEnergy["GGUC"] = -2.11;
	basepairingEnergy["GGCU"] = -1.53;
	basepairingEnergy["UCGG"] = -1.53;
	basepairingEnergy["GUCG"] = -2.51;
	basepairingEnergy["GCUG"] = -2.51;
	basepairingEnergy["GAUU"] = -1.27;
	basepairingEnergy["UUAG"] = -1.27;
	basepairingEnergy["GGUU"] = -0.50;
	basepairingEnergy["UUGG"] = -0.50;
	basepairingEnergy["GUUG"] = +1.29;
	basepairingEnergy["UGAU"] = -1.00;
	basepairingEnergy["UAGU"] = -1.00;
	basepairingEnergy["UGGU"] = +0.30;



	// RNA-DNA
	// Wu] = Peng] = Shu‐ichi Nakano] = and Naoki Sugimoto. "Temperature dependence of thermodynamic properties for DNA/DNA and RNA/DNA duplex formation." The FEBS Journal 269.12 (2002): 2821-2830.
	basepairingEnergy["AAdTdT"] = -1.00;
	basepairingEnergy["ACdTdG"] = -2.10;
	basepairingEnergy["AGdTdC"] = -1.80;
	basepairingEnergy["AUdTdA"] = -0.90;
	basepairingEnergy["CAdGdT"] = -0.90;
	basepairingEnergy["CCdGdG"] = -2.10;
	basepairingEnergy["CGdGdC"] = -1.70;
	basepairingEnergy["CUdGdA"] = -0.90;
	basepairingEnergy["GAdCdT"] = -1.30;
	basepairingEnergy["GCdCdG"] = -2.70;
	basepairingEnergy["GGdCdC"] = -2.90;
	basepairingEnergy["GUdCdA"] = -1.10;
	basepairingEnergy["UAdAdT"] = -0.60;
	basepairingEnergy["UCdAdG"] = -1.50;
	basepairingEnergy["UGdAdC"] = -1.60;
	basepairingEnergy["UUdAdA"] = -0.20;
	
	basepairingEnergy["dTdTAA"] = -1.00;
	basepairingEnergy["dGdTCA"] = -2.10;
	basepairingEnergy["dCdTGA"] = -1.80;
	basepairingEnergy["dAdTUA"] = -0.90;
	basepairingEnergy["dTdGAC"] = -0.90;
	basepairingEnergy["dGdGCC"] = -2.10;
	basepairingEnergy["dCdGGC"] = -1.70;
	basepairingEnergy["dAdGUC"] = -0.90;
	basepairingEnergy["dTdCAG"] = -1.30;
	basepairingEnergy["dGdCCG"] = -2.70;
	basepairingEnergy["dCdCGG"] = -2.90;
	basepairingEnergy["dAdCUG"] = -1.10;
	basepairingEnergy["dTdAAU"] = -0.60;
	basepairingEnergy["dGdACU"] = -1.50;
	basepairingEnergy["dCdAGU"] = -1.60;
	basepairingEnergy["dAdAUU"] = -0.20;
	
	
	// DNA-DNA
	basepairingEnergy["dAdAdTdT"] = -1.00;
	basepairingEnergy["dTdTdAdA"] = -1.00;
	basepairingEnergy["dAdTdTdA"] = -0.88;
	basepairingEnergy["dTdAdAdT"] = -0.58;
	basepairingEnergy["dCdTdGdA"] = -1.28;
	basepairingEnergy["dAdGdTdC"] = -1.28;
	basepairingEnergy["dCdAdGdT"] = -1.45;
	basepairingEnergy["dTdGdAdC"] = -1.45;
	basepairingEnergy["dGdTdCdA"] = -1.44;
	basepairingEnergy["dAdCdTdG"] = -1.44;
	basepairingEnergy["dGdAdCdT"] = -1.30;
	basepairingEnergy["dTdCdAdG"] = -1.30;
	basepairingEnergy["dCdGdGdC"] = -2.17;
	basepairingEnergy["dGdGdCdC"] = -1.84;
	basepairingEnergy["dCdCdGdG"] = -1.84;
	basepairingEnergy["dGdCdCdG"] = -2.24;


}