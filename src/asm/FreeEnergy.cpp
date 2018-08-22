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
#include <math.h> 
#include <ctype.h>
#include <stdio.h>

using namespace std;

map<std::string, double> FreeEnergy::basepairingEnergy;

double FreeEnergy::getFreeEnergyOfHybrid(State* state){

	vector<string> hybridStrings = FreeEnergy::getHybridString(state);

	//cout << "Hybrid strings " << hybridStrings.at(0) << "/" << hybridStrings.at(1) << endl;

	double danglingEndMultipler = 0.5 * (state->get_mRNAPosInActiveSite() == 1);
	double hybridFreeEnergy = FreeEnergy::getHybridFreeEnergy(hybridStrings.at(0), hybridStrings.at(1), TemplateType.substr(2), PrimerType.substr(2));

	// Account for a dangling base by 1) assuming that the danglng base was paired, and then 2) multiplying the free energy of this doublet by "danglingEndMultipler"
	if (danglingEndMultipler != 0) {
		
		string leftTemplateBase = hybridStrings.at(0).substr(hybridStrings.at(0).length()-1);
		string leftNascentBase = hybridStrings.at(1).substr(hybridStrings.at(1).length()-1);
		string rightTemplateBase = templateSequence.substr(state->getRightTemplateBaseNumber()-1, 1);
		string rightNascentBase = Settings::complementSeq(rightTemplateBase, PrimerType.substr(2) == "RNA");

		if (TemplateType.substr(2) == "DNA"){
			leftTemplateBase = "d" + leftTemplateBase;
			rightTemplateBase = "d" + rightTemplateBase;
		}
		if (PrimerType.substr(2) == "DNA"){
			leftNascentBase = "d" + leftNascentBase;
			rightNascentBase = "d" + rightNascentBase;
		}



		string dictKey = leftNascentBase + rightNascentBase + leftTemplateBase + rightTemplateBase;
		double energy = basepairingEnergy[dictKey];

		//cout << "Multiplying dangle by " << danglingEndMultipler << " | dangle: " << dictKey << " | energy: " << energy << endl;
		
		
		//cout << "Looking for " << dictKey << " found " << energy << endl;
		if (basepairingEnergy.find(dictKey) == basepairingEnergy.end()) hybridFreeEnergy += 1; // TODO: need to find dGU basepairing parameters 
		else hybridFreeEnergy += energy * danglingEndMultipler;


	}

	return hybridFreeEnergy;

}


double FreeEnergy::getFreeEnergyOfTranscriptionBubble(State* state){

	if (TemplateType.substr(0, 2) == "ss") return 0;
		
	double bubbleFreeEnergy = 0;
	
	int leftmostTemplatePos = state->getLeftTemplateBaseNumber() - (int)(bubbleLeft->getVal()) - 2;
	int leftmostComplementPos = leftmostTemplatePos;
	int rightmostTemplatePos = state->getRightTemplateBaseNumber() + (int)(bubbleRight->getVal());
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
	vector<string> intermediateString = FreeEnergy::getHybridIntermediateString(hybridStrings1, hybridStrings2, state1->getLeftTemplateBaseNumber(), state1->getLeftNascentBaseNumber(), state2->getLeftTemplateBaseNumber(), state2->getLeftNascentBaseNumber());

	freeEnergy = getHybridFreeEnergy(intermediateString.at(0), intermediateString.at(1), TemplateType.substr(2), PrimerType.substr(2));


	// Account for a dangling base by 1) assuming that the danglng base was paired, and then 2) multiplying the free energy of this doublet by "danglingEndMultipler"
	double danglingEndMultipler = 0.5 * ( (state1->get_mRNAPosInActiveSite() == 1 && state2->get_mRNAPosInActiveSite() == 0) || (state1->get_mRNAPosInActiveSite() == 0 && state2->get_mRNAPosInActiveSite() == 1));
	if (danglingEndMultipler != 0) {
		
		string leftTemplateBase, leftNascentBase, rightTemplateBase, rightNascentBase;

		// State 1 is posttranslocated
		if (state1->get_mRNAPosInActiveSite() == 1){
			leftTemplateBase = hybridStrings1.at(0).substr(hybridStrings1.at(0).length()-1);
			leftNascentBase = hybridStrings1.at(1).substr(hybridStrings1.at(1).length()-1);
			rightTemplateBase = templateSequence.substr(state1->getRightTemplateBaseNumber()-1, 1);
		}

		// State 2 is posttranslocated
		else{
			leftTemplateBase = hybridStrings2.at(0).substr(hybridStrings2.at(0).length()-1);
			leftNascentBase = hybridStrings2.at(1).substr(hybridStrings2.at(1).length()-1);
			rightTemplateBase = templateSequence.substr(state2->getRightTemplateBaseNumber()-1, 1);
		}

		rightNascentBase = Settings::complementSeq(rightTemplateBase, PrimerType.substr(2) == "RNA");
		


		if (TemplateType.substr(2) == "DNA"){
			leftTemplateBase = "d" + leftTemplateBase;
			rightTemplateBase = "d" + rightTemplateBase;
		}
		if (PrimerType.substr(2) == "DNA"){
			leftNascentBase = "d" + leftNascentBase;
			rightNascentBase = "d" + rightNascentBase;
		}


		string dictKey = leftNascentBase + rightNascentBase + leftTemplateBase + rightTemplateBase;
		double energy = basepairingEnergy[dictKey];

		//cout << "Multiplying dangle by " << danglingEndMultipler << " | dangle: " << dictKey << " | energy: " << energy << endl;
		
		//cout << "Looking for " << dictKey << " found " << energy << endl;
		if (basepairingEnergy.find(dictKey) == basepairingEnergy.end()) freeEnergy += 1; // TODO: need to find dGU basepairing parameters 
		else freeEnergy += energy * danglingEndMultipler;

	}
	
	
	return freeEnergy;


}


double FreeEnergy::getFreeEnergyOfTranscriptionBubbleIntermediate(State* state1, State* state2){

	if (TemplateType.substr(0,2)== "ss") return 0;
	double freeEnergy = 0;
	
	int leftmostTemplatePos = min(state1->getLeftTemplateBaseNumber(), state2->getLeftTemplateBaseNumber()) - (int)bubbleLeft->getVal() - 2;
	int leftmostComplementPos = leftmostTemplatePos;
	int rightmostTemplatePos = max(state1->getRightTemplateBaseNumber(), state2->getRightTemplateBaseNumber()) + (int)bubbleRight->getVal();
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


	int activeSiteShift = state->get_mRNAPosInActiveSite() > 1 ? 1 : 0;
	int stopWhenAt = (int)hybridLen->getVal();
	int templatePastBulge = 0;
	int nascentPastBulge = 0;

	for (int hybridPos = 0; hybridPos < stopWhenAt; hybridPos++){
			

		int templateBaseNum = state->getRightTemplateBaseNumber() - (hybridPos + templatePastBulge);
		int nascentBaseNum = state->getRightNascentBaseNumber() - (hybridPos + nascentPastBulge);

		//int baseNum = rightBase - hybridPos;

		
		// Go to next base if this one does not exist
		if (templateBaseNum <= 0 || templateBaseNum < state->getLeftTemplateBaseNumber() || templateBaseNum > templateSequence.length()) continue;
		if (nascentBaseNum <= 0 || nascentBaseNum < state->getLeftNascentBaseNumber() || nascentBaseNum > state->get_nascentLength()) continue;


		// Ensure that the rightMostMbase is part of the chain and not bound as free NTP
		if (state->NTPbound() && (nascentBaseNum == state->getRightNascentBaseNumber() || nascentBaseNum == state->getRightNascentBaseNumber()+1)) continue;


		string templateBase = templateSequence.substr(templateBaseNum-1, 1);
		string nascentBase = state->get_NascentSequence().substr(nascentBaseNum-1, 1);


		templateString = templateBase + templateString;
		nascentString = nascentBase + nascentString;
		
	}


	//cout << "Found hybrid strings " << templateString << "/" << nascentString << endl;

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



vector<string> FreeEnergy::getHybridIntermediateString(vector<string> hybridStrings1, vector<string> hybridStrings2, int leftTemplate1, int leftNascent1, int leftTemplate2, int leftNascent2){

	
	// Build a list of basepairs between template and hybrid in each sequence
	list<string> basepairs1 = FreeEnergy::getBasePairs(hybridStrings1[0], hybridStrings1[1], leftTemplate1, leftNascent1);
	list<string> basepairs2 = FreeEnergy::getBasePairs(hybridStrings2[0], hybridStrings2[1], leftTemplate2, leftNascent2);

	// Find the basepairs which are in both sets (ie. the intersection)
	list<string> basepairsIntermediate = getListIntersection(basepairs1, basepairs2);

	//list<string> basepairsIntermediate = getListUnion(basepairs1, basepairs2);


	string strIntermediateT = "";
	string strIntermediateN = "";
	
	

	// Convert the intermediate basepairs back into a string
	string Tbase;
	string Nbase;
	for (list<string>::iterator it = basepairsIntermediate.begin(); it != basepairsIntermediate.end(); ++it){
		

		//cout << "Intermediate string " << *it << endl;

		// Split string by _
		vector<string> split_vector = Settings::split(*it, '_');

		
		int template_baseNum = atoi(split_vector.at(0).c_str());
		int nascent_baseNum = atoi(split_vector.at(1).c_str());


		if (template_baseNum - leftTemplate1 < hybridStrings1.at(0).length()) Tbase = hybridStrings1.at(0).substr(template_baseNum - leftTemplate1, 1);
		else Tbase = hybridStrings2.at(0).substr(template_baseNum - leftTemplate2, 1);

		if (nascent_baseNum - leftNascent1 < hybridStrings1.at(1).length()) Nbase = hybridStrings1.at(1).substr(nascent_baseNum - leftNascent1, 1);
		else Nbase = hybridStrings2.at(1).substr(nascent_baseNum - leftNascent2, 1);
		
		strIntermediateT += Tbase;
		strIntermediateN += Nbase;

		
	}


	vector<string> intermediateStrings(2);
	intermediateStrings.at(0) = strIntermediateT;
	intermediateStrings.at(1) = strIntermediateN;
	return intermediateStrings;

}



list<string> FreeEnergy::getBasePairs(string templateString, string nascentString, int leftT, int leftN){

	
	list<string> basePairs;

	int templateIndex = 0;
	int nascentIndex = 0;

	while(true){
		
		// If we have exceeded the string lengths then exit
		if (templateIndex >= templateString.length() || nascentIndex >= nascentString.length()) break;
		



		// If both are uppercase then they are basepaired
		if (isupper(templateString[templateIndex]) && isupper(nascentString[nascentIndex])){
			
			char szKeyText[32];
            sprintf( szKeyText, "%u_%u", templateIndex + leftT, nascentIndex + leftN );
            basePairs.push_back(szKeyText);
			templateIndex++;
			nascentIndex++;
		}
		

		// If only one is uppercase then skip the other one
		else if (isupper(templateString[templateIndex]) && !isupper(nascentString[nascentIndex])){
			nascentIndex++;
		}
		else if (!isupper(templateString[templateIndex]) && isupper(nascentString[nascentIndex])){
			templateIndex++;
		}
		
		
		// If neither are uppercase then skip both
		else if (!isupper(templateString[templateIndex]) && !isupper(nascentString[nascentIndex])){
			templateIndex++;
			nascentIndex++;
		}

		
	}

	return basePairs;



}


double FreeEnergy::getHybridFreeEnergy(string templateString, string nascentString, string templateType, string nascentType){


	//cout << "Looking at hybrid " << templateString << "/" << nascentString << endl;

	double freeEnergy = 0;

	if (templateString.length() == 0 || nascentString.length() == 0) return freeEnergy;
		
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
	state->forward();


	int nsites = templateSequence.length() - state->get_nascentLength();
	vector<double> equilibriumConstantsBckOverFwd(nsites);
	vector<double> equilibriumConstantsFwdOverBck(nsites);
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
		equilibriumConstantsBckOverFwd.at(i) = kPostToPre / kPreToPost;
		equilibriumConstantsFwdOverBck.at(i) = kPreToPost / kPostToPre;
		forwardRates.at(i) = kPreToPost;
		backwardsRates.at(i) = kPostToPre;
		
		// Bind NTP and catalyse to get next state
		state->transcribe(1);
		
	}



	// Calculate geometric-mean equilibrium constant
	double meanEquilibriumConstant_BckOverFwd = 0;
	double meanEquilibriumConstant_FwdOverBck = 0;
	double meanForwardRate = 0;
	double meanBackwardsRate = 0;
	for (int i = 0; i < nsites; i ++) {
		meanEquilibriumConstant_BckOverFwd += log(equilibriumConstantsBckOverFwd.at(i));
		meanEquilibriumConstant_FwdOverBck += log(equilibriumConstantsFwdOverBck.at(i));
		meanForwardRate += forwardRates.at(i) / nsites;
		meanBackwardsRate += backwardsRates.at(i) / nsites;
	}



	results[0] = exp(meanEquilibriumConstant_BckOverFwd / nsites);
	results[1] = exp(meanEquilibriumConstant_FwdOverBck / nsites);
	results[2] = meanForwardRate;
	results[3] = meanBackwardsRate;

	delete state;

}


// Calculate the Gibbs energy of the translocation transition state, averaged across the whole sequence (arithmetic mean)
// This is a parameter-free estimate
// Only considers the main elongation pathway
double FreeEnergy::calculateMeanBarrierHeight(){

	double meanBarrierHeight = 0;


	State* state = new State(true);



	// Iterate until the end of the sequence
	int nsites = templateSequence.length() - state->get_nascentLength();
	for (int i = 0; i < nsites; i ++){

		meanBarrierHeight += state->calculateForwardTranslocationFreeEnergyBarrier(true);

		// Bind NTP and catalyse to get next state
		state->transcribe(1);

	}


	meanBarrierHeight = meanBarrierHeight / nsites;


	delete state;
	return meanBarrierHeight;

}



// Compare two RNA secondary structure strings and take the intersection between basepairs
string FreeEnergy::getSecondaryStructureStringIntersection(string str1, string str2){

	// Build the transition string (all dots)
	string transitionString = "";
	for (int i = 0; i < min(str1.length(), str2.length()); i ++)  transitionString += ".";

	// Iterate through the strings
	for (int i = 0; i < min(str1.length(), str2.length()); i ++){


		string char1 = str1.substr(i, 1);
		string char2 = str2.substr(i, 1);

		// If one or both are dots then the intersection string has a dot here
		if (char1 == "." || char2 == ".") continue;


		// If one or both are closing brackets then the intersection string at this position has already been set in a previous iteration 
		if (char1 == ")" || char2 == ")") continue;


		// Both are opening brackets. Need to check if the two correspond to the same basepair
		int indentationLevel = 1;
		for (int j = i+1; j < min(str1.length(), str2.length()); j ++){

			// Iterate until the current symbol is a closing bracket and the indentation level is 0
			string char1J = str1.substr(j, 1);
			if (char1J == "(") indentationLevel++;

			else if (char1J == ")"){
				indentationLevel--;

				if (indentationLevel == 0) {

					// Found the correct closing bracket. Check if the other string has a closing bracket here too
					string char2J = str2.substr(j, 1);
					if (char2J == ")"){

						// TODO: Set the position j in the transition string to a closing bracket and position i to an opening bracket
						transitionString = transitionString.replace(i, 1, "(").replace(j, 1, ")");

					}

					break;

				}
			}


		}


	}

	return transitionString;


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