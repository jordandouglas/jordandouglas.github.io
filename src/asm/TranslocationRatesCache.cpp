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


#include "State.h"
#include "Settings.h"
#include "TranslocationRatesCache.h"


#include <iostream>
#include <vector>

using namespace std;




TranslocationRatesCache::TranslocationRatesCache(){
	
}


double TranslocationRatesCache::getTranslocationRates(State* state, bool fwd){

	int h = (int)hybridLen->getVal();


	// Polymerase is not backtracked. Use regular translocation table
	if (state->get_mRNAPosInActiveSite() > -2){
		
		
		int rowNum = state->get_nascentLength() - (h-1);
		int colNum = state->get_mRNAPosInActiveSite() + 1;
		
		
		auto rates = translocationRateTable[rowNum][colNum];
		double GDagRateModifier = exp(-GDagSlide->getVal());
		double forceGradientFwd = exp(( FAssist->getVal() * 1e-12 * (barrierPos->getVal()) * 1e-10) / (_kBT));
		double forceGradientBck = exp((-FAssist->getVal() * 1e-12 * (3.4-barrierPos->getVal()) * 1e-10) / (_kBT));
		double DGPostModifier = state->get_mRNAPosInActiveSite() == 1 ? exp(DGPost->getVal()) : 1;

		

		double hypertranslocationGradientForward = 1; // Modify the rate of hypertranslocating forwards
		double hypertranslocationGradientBackwards = 1; // Modify the rate of translocating backwards when in a hypertranslocated state
		if (currentModel->get_allowHypertranslocation()){
			//if (compactState[1] > 0) hypertranslocationGradientForward = Math.exp(-PARAMS_JS.PHYSICAL_PARAMETERS["DGHyperDag"]["val"] * 0.5);
			//if (compactState[1] > 1) hypertranslocationGradientBackwards = Math.exp(PARAMS_JS.PHYSICAL_PARAMETERS["DGHyperDag"]["val"] * 0.5);
		}


		//cout << "rates" << rates[0] << endl;



		if (rates[0] != -1) {
			if (fwd) return rates[1] * DGPostModifier * GDagRateModifier * hypertranslocationGradientForward * forceGradientFwd;
			else return rates[0] * DGPostModifier * GDagRateModifier * hypertranslocationGradientBackwards * forceGradientBck;
		}

		
		// Temporarily set state to inactive so it lets us backtrack
		//int temp = compactState[3];
		//compactState[3] = false;
		
		// If rates are not in table then add them and return them
		double kbck = state->calculateBackwardRate(false, false); // Important to include false or will end up in infinite loop
		double kfwd = state->calculateForwardRate(false, false);
		translocationRateTable[rowNum][colNum][0] = kbck;
		translocationRateTable[rowNum][colNum][1] = kfwd;



		if (fwd) return kfwd * DGPostModifier * GDagRateModifier * hypertranslocationGradientForward * forceGradientFwd;
		else return kbck * DGPostModifier * GDagRateModifier * hypertranslocationGradientBackwards * forceGradientBck;

		
		
	}
	
	
	// Polymerase is backtracked. Use backtracking table
	else{
		
		
		

		int rightHybridBase = state->get_mRNAPosInActiveSite() + state->get_nascentLength();
		int leftHybridBase = rightHybridBase + 1 - h;
		int indexNum = leftHybridBase - 1;

		auto rates = backtrackRateTable[indexNum];
		double GDagRateModifier = exp(-GDagSlide->getVal());
		double forceGradientFwd = exp(( FAssist->getVal() * 1e-12 * (barrierPos->getVal()) * 1e-10) / (_kBT));
		double forceGradientBck = exp((-FAssist->getVal() * 1e-12 * (3.4-barrierPos->getVal()) * 1e-10) / (_kBT));

		
		if (rates[0] != -1) {
			if (fwd) return rates[1] * GDagRateModifier * forceGradientFwd;
			else return rates[0] * GDagRateModifier * forceGradientBck;
		}
		
		
		// If rates are not in table then add them and return them
		double kbck = state->calculateBackwardRate(false, false); // Important to include false or will end up in infinite loop
		double kfwd = state->calculateForwardRate(false, false);
		backtrackRateTable[indexNum][0] = kbck;
		backtrackRateTable[indexNum][1] = kfwd;

		if (fwd) return kfwd * GDagRateModifier * forceGradientFwd;
		else return kbck * GDagRateModifier * forceGradientBck;

		
	}
		


}


void TranslocationRatesCache::buildTranslocationRateTable(string templSequence){

	// Don't calculate all at once, only calculating for active site positions 0 and 1. Simulation caches hypertranslocated rates as it goes. 
	// Most states are never sampled. Otherwise far too slow to load for n > 300
	
	
	// Rows are the lengths of the mRNA and cols are the position of the active site (minimum value -1, maximum value h-1). Backtracking rates are found in the backtracking table
	// Each entry is a tuple (kbck, kfwd)
	// There are n - h rows (n is total number of bases, h is hybrid length)
	// There are l + 1 entries in each row, where l is the length of the nascent strand in the row


	//cout << "Building translocation rate table..." << templSequence.length() << endl;
	
	int h = (int)hybridLen->getVal();
	int nLengths = templSequence.length() - h + 1;
	int nPositions = h + 1;
	if (nLengths <= 0) return;
	translocationRateTable = new double**[nLengths];


	for(int nascentLen = h-1; nascentLen < templSequence.length(); nascentLen ++){
		
		int rowNum = nascentLen - (h-1);
		translocationRateTable[rowNum] = new double*[nPositions];

		for (int activeSitePos = -1; activeSitePos <= h-1; activeSitePos ++){
			int colNum = activeSitePos + 1;

			// Will leave it empty and add values only as they are needed
			translocationRateTable[rowNum][colNum] = new double[2]; 
			translocationRateTable[rowNum][colNum][0] = -1; 
			translocationRateTable[rowNum][colNum][1] = -1; 
		}
		
	}


}



void TranslocationRatesCache::buildBacktrackRateTable(string templSequence){


	// Once the polymerase has entered state -2 (ie backtracked by 2 positions) then all backtracking rates 
	// are the same per position across different nascent strand lengths. The bases added onto the nascent strand
	// which are coming out of the NTP pore don't matter. This assumption would no longer hold if we started
	// folding the 3' end of the nascent strand

	//cout << "Building backtrack rate table..." << templSequence.length() << endl;

	int h = (int)hybridLen->getVal();
	if (templSequence.length() - h - 1 < 0) return;
	backtrackRateTable = new double*[templSequence.length() - h - 1];


	for (int leftHybridBase = 1; leftHybridBase <= templSequence.length() - h - 1; leftHybridBase ++){
		int indexNum = leftHybridBase - 1;

		// Will leave it empty and add values only as they are needed
		backtrackRateTable[indexNum] = new double[2];
		backtrackRateTable[indexNum][0] = -1; 
		backtrackRateTable[indexNum][1] = -1; 
	}


}