﻿/* 
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
#include "FreeEnergy.h"
#include "SimPol_vRNA_interface.h"


#include <iostream>
#include <vector>
#include <cstring>
#include <thread>




using namespace std;




TranslocationRatesCache::TranslocationRatesCache(int templateLength){
	this->meanGibbsEnergyBarrier = -INF;
	this->usingDownstreamTable = true;
	this->templateLength = templateLength;
}


// Reset all translocation rate related caches. Does not reset the mRNA folding energy cache
void TranslocationRatesCache::initTranslocationRates(){
	this->reset_meanGibbsEnergyBarrier();
	this->buildTranslocationRateTable(); 
	this->buildBacktrackRateTable();
}





double TranslocationRatesCache::get_meanGibbsEnergyBarrier(){

	//cout << "get_meanGibbsEnergyBarrier" << endl;
	if (this->meanGibbsEnergyBarrier == -INF) this->meanGibbsEnergyBarrier = FreeEnergy::calculateMeanBarrierHeight();

	return this->meanGibbsEnergyBarrier;

}


void TranslocationRatesCache::reset_meanGibbsEnergyBarrier(){
	this->meanGibbsEnergyBarrier = -INF;
}



double TranslocationRatesCache::getTranslocationRates(State* state, bool fwd){
	

	int h = (int)hybridLen->getVal(true);


	// Polymerase is not backtracked. Use regular translocation table
	if (state->get_mRNAPosInActiveSite() > -2){
		
		
		int rowNum = state->get_nascentLength() - (h-1);
		int colNum = state->get_mRNAPosInActiveSite() + 1;


		if (rowNum >= this->translocationRateTable.size()){
			cout << "translocationRateTable oor: len: " << state->get_nascentLength() << ", h = " << h << ", rowNum: " << rowNum << endl;
			exit(0);
		}


		if (colNum >= this->translocationRateTable.at(rowNum).size()){
			cout << "translocationRateTable oor: rowNum: " << rowNum << " colNum " << colNum << endl;
			exit(0);
		}
	


		vector<double> rates = this->translocationRateTable.at(rowNum).at(colNum);

		// Parameterised translocation barrier height
		double backtrackBarrier = DGtaudag->getVal(true);

        
        if (!fwd && state->get_mRNAPosInActiveSite() == -1) backtrackBarrier += DGtaudagM->getVal(true);
        
        
        // Can apply the backtrack penalty if backtracking or backstepping while backtracking is prohibited
        if (currentModel->get_currentBacksteppingModel_int() == 0 || (!currentModel->get_allowBacktracking() && currentModel->get_currentBacksteppingModel_int() == -1)) {
        
            
    		// If going from 0 to -1, apply the backtrack barrier penalty
    		if (!fwd && state->get_mRNAPosInActiveSite() == 0 ) backtrackBarrier += DGtaudagM->getVal(true);


    		// If going from -1 to 0, apply the backtrack barrier penalty
    		if (fwd && state->get_mRNAPosInActiveSite() == -1 ) backtrackBarrier += DGtaudagM->getVal(true);
            
        }


        /*
		if (currentModel->get_allowBacktracking()){

			

		

			// If in the 0 position and going backwards and the backtracking barrier is between 0 and -1, apply the backtrack penalty
			if (state->get_mRNAPosInActiveSite() == 0 && !fwd && currentModel->get_currentBacksteppingModel_int() == 0) backtrackBarrier += DGtaudagM->getVal(true);

			// If in the -1 position and (going backwards and the backtracking barrier is between -1 and -2) OR (the backtracking barrier is between 0 and -1), apply the backtrack penalty
			else if (state->get_mRNAPosInActiveSite() == -1 && ((!fwd && currentModel->get_currentBacksteppingModel_int() == -1) || currentModel->get_currentBacksteppingModel_int() == 0)) backtrackBarrier += DGtaudagM->getVal(true);

			
		} */

		double GDagRateModifier = exp(-backtrackBarrier);

		double forceGradientFwd = exp(( FAssist->getVal(true) * 1e-12 * (barrierPos->getVal(true)) * 1e-10) / (_kBT));
		double forceGradientBck = exp((-FAssist->getVal(true) * 1e-12 * (3.4-barrierPos->getVal(true)) * 1e-10) / (_kBT));
		double DGtau1Modifier = state->get_mRNAPosInActiveSite() == 1 ? exp(DGtau1->getVal(true)) : 1;
		double RNAunfoldingBarrier = 1;
		
		
		double hypertranslocationModifier = 1;
		//double hypertranslocationGradientForward = 1; // Modify the rate of hypertranslocating forwards
		//double hypertranslocationGradientBackwards = 1; // Modify the rate of translocating backwards when in a hypertranslocated state
		if (currentModel->get_allowHypertranslocation()){
			//if (state->get_mRNAPosInActiveSite() > 0) hypertranslocationGradientForward = exp(-DGtaudagP->getVal() * 0.5);
			//if (state->get_mRNAPosInActiveSite() > 1) hypertranslocationGradientBackwards = exp(DGtaudagP->getVal() * 0.5);
			if ((fwd && state->get_mRNAPosInActiveSite() > 0) || (!fwd && state->get_mRNAPosInActiveSite() > 1)) hypertranslocationModifier =  exp(-DGtaudagP->getVal(false));

		}


		//cout << "F = " << FAssist->getVal(true) << ", delta1 = " << barrierPos->getVal(true) << endl;
		//cout << "kbck = " << rates[0] << ", kfwd = " << rates[1] << ", forceGradientFwd = " << forceGradientFwd << ", GDagRateModifier = " << GDagRateModifier  << endl;
		//if (fwd) cout << rates[1] * DGtau1Modifier * GDagRateModifier * hypertranslocationGradientForward * forceGradientFwd << endl;
		//else cout << rates[0] * DGtau1Modifier * GDagRateModifier * hypertranslocationGradientBackwards * forceGradientBck << endl;




		if (rates.at(0) != -1) {


			// RNA unfolding barrier heights 
			if (fwd && rates.at(1) != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
			else if (!fwd && rates.at(0) != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));

			//if (rates[0] >= INF || rates[1] >= INF || forceGradientFwd >= INF || forceGradientBck >= INF || GDagRateModifier >= INF)
				//cout << "rates[0]: " << rates[0] << ", rates[1]: " << rates[1] << ", forceGradientFwd: " << forceGradientFwd << " forceGradientBck: " << forceGradientBck << " GDagRateModifier: " << GDagRateModifier << endl;
			if (fwd) return rates.at(1) * DGtau1Modifier * GDagRateModifier * hypertranslocationModifier * forceGradientFwd * RNAunfoldingBarrier;
			else return rates.at(0) * DGtau1Modifier * GDagRateModifier * hypertranslocationModifier * forceGradientBck * RNAunfoldingBarrier;
		}


		// Temporarily set state to inactive so it lets us backtrack
		//int temp = compactState[3];
		//compactState[3] = false;
		
		// If rates are not in table then add them and return them
		double kbck = state->calculateBackwardRate(false, false); // Important to include false or will end up in infinite loop
		double kfwd = state->calculateForwardRate(false, false);
		rates.at(0) = kbck;
		rates.at(1) = kfwd;
		this->translocationRateTable.at(rowNum).at(colNum) = rates;


		// RNA unfolding barrier heights 
		if (fwd && rates.at(1) != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
		else if (!fwd && rates.at(0) != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));



		//cout << "Calculated rates " << kfwd << "," << kbck << " for index " <<  rowNum << "," << colNum << endl;


		if (fwd) return kfwd * DGtau1Modifier * GDagRateModifier * hypertranslocationModifier * forceGradientFwd * RNAunfoldingBarrier;
		else return kbck * DGtau1Modifier * GDagRateModifier * hypertranslocationModifier * forceGradientBck * RNAunfoldingBarrier;

		
		
	}
	
	
	// Polymerase is backtracked. Use backtracking table
	else{
		
		

		int leftHybridBase = state->getLeftNascentBaseNumber();
		int indexNum = leftHybridBase - 1;

		if (indexNum >= this->backtrackRateTable.size()){

			cout << "bt oor: indexNum: " << indexNum << endl;

		}

		vector<double> rates = this->backtrackRateTable.at(indexNum);

		double backtrackBarrier = DGtaudag->getVal(true) + DGtaudagM->getVal(true);
		double GDagRateModifier = exp(-backtrackBarrier);
		double forceGradientFwd = exp(( FAssist->getVal(true) * 1e-12 * (barrierPos->getVal(true)) * 1e-10) / (_kBT));
		double forceGradientBck = exp((-FAssist->getVal(true) * 1e-12 * (3.4-barrierPos->getVal(true)) * 1e-10) / (_kBT));
		double RNAunfoldingBarrier = 1;
		
		if (rates.at(0) != -1) {


			// RNA unfolding barrier heights 
			if (fwd && rates.at(1) != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
			else if (!fwd && rates.at(0) != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));



			if (fwd) return rates.at(1) * GDagRateModifier * forceGradientFwd * RNAunfoldingBarrier;
			else return rates.at(0) * GDagRateModifier * forceGradientBck * RNAunfoldingBarrier;
		}
		
		
		// If rates are not in table then add them and return them
		double kbck = state->calculateBackwardRate(false, false); // Important to include false or will end up in infinite loop
		double kfwd = state->calculateForwardRate(false, false);
		rates.at(0) = kbck;
		rates.at(1) = kfwd;
		this->backtrackRateTable.at(indexNum) = rates;



		//if (rates[0] >= INF || rates[1] >= INF || forceGradientFwd >= INF || forceGradientBck >= INF || GDagRateModifier >= INF)
			//cout << "b rates[0]: " << rates[0] << ", rates[1]: " << rates[1] << ", forceGradientFwd: " << forceGradientFwd << " forceGradientBck: " << forceGradientBck << " GDagRateModifier: " << GDagRateModifier << endl;
			

		// RNA unfolding barrier heights 
		if (fwd && rates.at(1) != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
		else if (!fwd && rates.at(0) != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));


		if (fwd) return kfwd * GDagRateModifier * forceGradientFwd * RNAunfoldingBarrier;
		else return kbck * GDagRateModifier * forceGradientBck * RNAunfoldingBarrier;

		
	}

}



void TranslocationRatesCache::buildTranslocationRateTable(){

	// Don't calculate all at once, only calculating for active site positions 0 and 1. Simulation caches hypertranslocated rates as it goes. 
	
	// Rows are the lengths of the mRNA and cols are the position of the active site (minimum value -1, maximum value h-1). Backtracking rates are found in the backtracking table
	// Each entry is a tuple (kbck, kfwd)
	// There are n - h rows (n is total number of bases, h is hybrid length)
	// There are l + 1 entries in each row, where l is the length of the nascent strand in the row


	if (hybridLen == nullptr || (int)hybridLen->getVal(true) <= 0) return;
	
	int h = (int)hybridLen->getVal(true);



	int nLengths = this->templateLength - h + 1;
	int nPositions = h + 1;
	if (nLengths <= 0) return;




	// Delete the currently stored array
	for(unsigned int i = 0; i < this->translocationRateTable.size(); ++i){
		for (unsigned int j = 0; j < this->translocationRateTable.at(i).size(); ++j){
			this->translocationRateTable.at(i).at(j).clear();
		}
		this->translocationRateTable.at(i).clear();
	}
	this->translocationRateTable.clear();



	this->translocationRateTable.resize(nLengths);
	for(int nascentLen = h-1; nascentLen < this->templateLength; nascentLen ++){
		
		int rowNum = nascentLen - (h-1);
		this->translocationRateTable.at(rowNum).resize(nPositions);

		for (int activeSitePos = -1; activeSitePos <= h-1; activeSitePos ++){
			int colNum = activeSitePos + 1;

			// Will leave it empty and add values only as they are needed
			this->translocationRateTable.at(rowNum).at(colNum).resize(2);
			this->translocationRateTable.at(rowNum).at(colNum).at(0) = -1; 
			this->translocationRateTable.at(rowNum).at(colNum).at(1) = -1; 
		}
		
	}


}



void TranslocationRatesCache::buildBacktrackRateTable(){
	


	// Once the polymerase has entered state -2 (ie backtracked by 2 positions) then all backtracking rates 
	// are the same per position across different nascent strand lengths. The bases added onto the nascent strand
	// which are coming out of the NTP pore don't matter. This assumption would no longer hold if we started
	// folding the 3' end of the nascent strand


	if (hybridLen == nullptr || (int)hybridLen->getVal(true) <= 0) return;


	int h = (int)hybridLen->getVal(true);
	if (this->templateLength - h - 1 < 0) return;



	// Clear the previous table
	for (unsigned int i = 0; i < this->backtrackRateTable.size(); ++i){
		this->backtrackRateTable.at(i).clear();
	}
	this->backtrackRateTable.clear();


	this->backtrackRateTable.resize(this->templateLength - h - 1);

	for (int leftHybridBase = 1; leftHybridBase <= this->templateLength - h - 1; leftHybridBase ++){
		int indexNum = leftHybridBase - 1;

		// Will leave it empty and add values only as they are needed
		this->backtrackRateTable.at(indexNum).resize(2);
		this->backtrackRateTable.at(indexNum).at(0) = -1; 
		this->backtrackRateTable.at(indexNum).at(1) = -1; 
	}




}




double TranslocationRatesCache::getUpstreamRNABlockadeBarrierHeight(State* state){


	if (!currentModel->get_allowmRNAfolding()) return 0;



	


	// If the barrier height has already been cached, return it
	int pos = state->getLeftNascentBaseNumber() - 1 - rnaFoldDistance->getVal(true);
	if (pos < 0) return 0;


	//cout << "pos " << pos << ":" << this->upstreamRNABlockadeTable[pos] << endl;
	if (this->upstreamRNABlockadeTable[pos] != -INF) return this->upstreamRNABlockadeTable[pos];


    // If multiple threads are being used need to ensure that there is not another thread currently calculating the RNA structure
    if (N_THREADS > 1) {

        // Lock the thread
        pthread_mutex_lock(&MUTEX_LOCK_VRNA); 

        // Double check that the value still does not need to be calculated
        if (this->upstreamRNABlockadeTable[pos] != -INF) {
            pthread_mutex_unlock(&MUTEX_LOCK_VRNA); 
            return this->upstreamRNABlockadeTable[pos];
        }

    }




	// Otherwise calculate it
	double barrierHeight = 0;

	// Fold the RNA of this state
	State* clone = state->clone();
	clone->fold(true, false);


	// No structure
	if (clone->get_5primeStructure() == ""){

		barrierHeight = 0;

	}

	// Boundary model -> prohibit translocation if there is any structure here
	else if (currentModel->get_currentRNABlockadeModel() == "terminalBlockade"){


		string structure = clone->get_5primeStructure();
		if (structure.substr(structure.length()-1, 1) == ")") barrierHeight = INF;

		//cout << "terminalBlockade " << currentSequence->getID() << " " << structure << ":" << barrierHeight << endl;

	}


	// Otherwise we need to consider the current state and the back translocated state
	else {

		// Free energy of this structure
		float this_MFE = clone->get_5primeStructureMFE();
		string this_structure = clone->get_5primeStructure();


		// Free energy of the structure when polymerase moves upstream by 1 bp
		State* stateBck = clone->clone()->backward();
		stateBck->fold(true, false);
		float upstream_MFE = stateBck->get_5primeStructureMFE();
		string upstream_structure = stateBck->get_5primeStructure();

		if (this_structure.length() < 5 || upstream_structure.length() < 5) barrierHeight = 0;


		// Midpoint blockade: take the free energy of the two neighbouring structures and average them out
		else if (currentModel->get_currentRNABlockadeModel() == "midpointBlockade"){
			barrierHeight = (this_MFE + upstream_MFE) / 2 - this_MFE;
			cout << "Upstream midpoint barrier: " << barrierHeight << endl;
		}


		else if (currentModel->get_currentRNABlockadeModel() == "intersectionBlockade"){
			string transitionStructure = FreeEnergy::getSecondaryStructureStringIntersection(this_structure, upstream_structure);
			//cout << this_structure << "/" << upstream_structure  << "Transition intersection structure " << transitionStructure << endl;


			// Use RNAeval to compute the Gibbs energy of this structure
			string seq = clone->get_NascentSequence().substr(0, transitionStructure.length());
			char* seq_char = (char *) calloc(seq.length()+1, sizeof(char));
			char* structure_char = (char *) calloc(seq.length()+1, sizeof(char));
			strcpy(seq_char, seq.c_str());
			strcpy(structure_char, transitionStructure.c_str());

			barrierHeight = vRNA_eval(seq_char, structure_char) - this_MFE;
			cout << "Upstream intersection Gibbs energy: " << barrierHeight << endl;

			// Clean up
			free(seq_char);
			free(structure_char);
	


		}
		


	}

	delete clone;


	this->upstreamRNABlockadeTable[pos] = barrierHeight;

    //cout << "upstream " << barrierHeight << endl;

    // Unlock the thread
    if (N_THREADS > 1) pthread_mutex_unlock(&MUTEX_LOCK_VRNA); 

	return barrierHeight;




}


double TranslocationRatesCache::getDownstreamRNABlockadeBarrierHeight(State* state){



	//cout << "getDownstreamRNABlockadeBarrierHeight" << endl;

	if (!currentModel->get_allowmRNAfolding()) return 0;

	
	int pos = state->getRightNascentBaseNumber() - 1 + rnaFoldDistance->getVal(true);
	if (pos < 0 || pos+1 > state->get_nascentLength() /* || pos >= templateSequence.length()*/) return 0;

    int rowNum = state->get_nascentLength() - 1;
    int colNum = state->get_mRNAPosInActiveSite() + state->get_nascentLength();

	   
   	// The downstream cache is not used when the sequence is long and on GUI, for memory purposes
   	// If the barrier height has already been cached, return it
	if (this->usingDownstreamTable) {
		if (this->downstreamRNABlockadeTable.at(rowNum).at(colNum) != -INF) return this->downstreamRNABlockadeTable.at(rowNum).at(colNum);
	
	    // If multiple threads are being used need to ensure that there is not another thread currently calculating the RNA structure
	    if (N_THREADS > 1) {
	
	        // Lock the thread
	        pthread_mutex_lock(&MUTEX_LOCK_VRNA); 
	
	        // Double check that the value still does not need to be calculated
	        if (this->downstreamRNABlockadeTable.at(rowNum).at(colNum) != -INF) {
	            pthread_mutex_unlock(&MUTEX_LOCK_VRNA); 
	            return this->downstreamRNABlockadeTable.at(rowNum).at(colNum);
	        }
	
	    }
    
    }



	// Otherwise calculate it
	double barrierHeight = 0;

	// Fold the RNA of this state
	State* clone = state->clone();
	clone->fold(false, true);


	// No structure
	if (clone->get_3primeStructure() == ""){
		barrierHeight = 0;
	}


	// Boundary model -> prohibit translocation if there is any structure here
	else if (currentModel->get_currentRNABlockadeModel() == "terminalBlockade"){


		string structure = clone->get_3primeStructure();
		if (structure.substr(0, 1) == "(") barrierHeight = INF;

		//cout << "downstream terminalBlockade " << structure << ":" << barrierHeight << endl;

	}


	// Otherwise we need to consider the current state and the forward translocated state
	else {


		// Free energy of this structure
		float this_MFE = clone->get_3primeStructureMFE();
		string this_structure = clone->get_3primeStructure();


		// Free energy of the structure when polymerase moves downstream by 1 bp
		State* stateFwd = clone->clone()->forward();
		stateFwd->fold(false, true);
		float downstream_MFE = stateFwd->get_3primeStructureMFE();
		string downstream_structure = stateFwd->get_3primeStructure();


		if (this_structure.length() < 5) barrierHeight = 0;

		// Midpoint blockade: take the free energy of the two neighbouring structures and average them out
		else if (currentModel->get_currentRNABlockadeModel() == "midpointBlockade"){
			barrierHeight = (this_MFE + downstream_MFE) / 2 - this_MFE;
			//cout << "Downstream midpoint barrier: " << barrierHeight << endl;
		}


		else if (currentModel->get_currentRNABlockadeModel() == "intersectionBlockade"){
			string transitionStructure = FreeEnergy::getSecondaryStructureStringIntersection(this_structure, "." + downstream_structure);
			//cout << this_structure << "/" << downstream_structure  << "Downstream transition intersection structure " << transitionStructure << endl;


			// Use RNAeval to compute the Gibbs energy of this structure
			string seq = clone->get_NascentSequence().substr(clone->getRightNascentBaseNumber(), transitionStructure.length());
			char* seq_char = (char *) calloc(seq.length()+1, sizeof(char));
			char* structure_char = (char *) calloc(seq.length()+1, sizeof(char));
			strcpy(seq_char, seq.c_str());
			strcpy(structure_char, transitionStructure.c_str());

			barrierHeight = vRNA_eval(seq_char, structure_char) - this_MFE;
			//cout << "Downstream Gibbs energy: " << barrierHeight << endl;

			// Clean up
			free(seq_char);
			free(structure_char);
	


		}


	}

	delete clone;



    if (this->usingDownstreamTable) this->downstreamRNABlockadeTable.at(rowNum).at(colNum) = barrierHeight;

    //cout << "downstream " << barrierHeight << endl;

    // Unlock the thread
    if (N_THREADS > 1) pthread_mutex_unlock(&MUTEX_LOCK_VRNA);


	return barrierHeight;

}





// Build a table of rates for translocating upstream from the current position.
// The active site position and transcript length don't matter - only the transcript position that is one basepair upstream of the polymerase matters
void TranslocationRatesCache::buildUpstreamRNABlockadeTable(){
	this->upstreamRNABlockadeTable = new double[this->templateLength];

	// Initialise all values at negative infinity
	for (int i = 0; i < this->templateLength; i ++){
		this->upstreamRNABlockadeTable[i] = -INF; 
	}

}


// Build a table of rates for translocating downstream from the current position.
// The active site position and transcript length don't matter - only the transcript position that is one basepair downstream of the polymerase matters
void TranslocationRatesCache::buildDownstreamRNABlockadeTable(){

	// This table is of size O(L^2) and is often not used. Large memory consumption
	// When using the GUI, will not build cache if sequence length is beyond a certain limit
	// Instead, rates will not be cached and are recalculated each time.
	
	if (this->templateLength > 8000 && _USING_GUI) {
		this->usingDownstreamTable = false;
		return; 
	}


    // Element i,j: the mRNA currently has length i and the polymerase position is j
    if (hybridLen == nullptr || (int)hybridLen->getVal(true) <= 0) return;

    int nLengths = this->templateLength;
    if (nLengths <= 0) return;

    this->downstreamRNABlockadeTable.clear();

    this->downstreamRNABlockadeTable.resize(nLengths);
    for(int nascentLen = 1; nascentLen <= nLengths; nascentLen ++){

        int rowNum = nascentLen - 1;
        this->downstreamRNABlockadeTable.at(rowNum).resize(nascentLen);

        for (int activeSitePos = -nascentLen; activeSitePos < 0; activeSitePos ++){
            int colNum = activeSitePos + nascentLen;
            this->downstreamRNABlockadeTable.at(rowNum).at(colNum) = -INF;
        }
        
    }





}




// Clear and delete all translocation rate related caches
void TranslocationRatesCache::clear(){


    // Clear the translocation table
    for(unsigned int i = 0; i < this->translocationRateTable.size(); ++i) {
        for (unsigned int j = 0; j < this->translocationRateTable.at(i).size(); ++j) {
            this->translocationRateTable.at(i).at(j).clear();
        }
        this->translocationRateTable.at(i).clear();
    }
    this->translocationRateTable.clear();


    // Clear the backtrack table
    for (unsigned int i = 0; i < this->backtrackRateTable.size(); ++i) {
        this->backtrackRateTable.at(i).clear();
    }
    this->backtrackRateTable.clear();
    
    
    
    // Clear the RNA folding tables
    delete [] this->upstreamRNABlockadeTable;
    
    for (unsigned int i = 0; i < this->downstreamRNABlockadeTable.size(); ++i) {
        this->downstreamRNABlockadeTable.at(i).clear();
    }
    this->downstreamRNABlockadeTable.clear();
	
    

}










