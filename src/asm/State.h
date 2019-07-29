
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


#ifndef STATE_H
#define STATE_H


#include "SlippageLandscapes.h"

#include <string>
#include <list>
#include <deque>


using namespace std;

class State{



	string nascentSequence;
	int mRNAPosInActiveSite;
	string boundNTP;
	string NTPtoAdd;
	bool activated;

	bool terminated;
	int nextTemplateBaseToCopy;

	bool isGuiState;
	bool thereHaveBeenMutations;
	
	bool applyingMacroReaction;


	// Left and right base numbers in the hybrid. The template and nascent left / right may not be the same due to slippage
	int leftTemplateBase;
	int rightTemplateBase;
	int leftNascentBase;
	int rightNascentBase;
	int changeInLeftBulgePosition;


	// Fold information
	string _5primeStructure;
	string _3primeStructure;
	float _5primeMFE;
	float _3primeMFE;


	// Information on bulges
	deque<int> bulgePos;
	deque<int> bulgedBase;
	deque<int> bulgeSize;
	deque<int> partOfBulgeID;


	// Private slippage
	void diffuse_left(int S, SlippageLandscapes* DOMupdates);
	void diffuse_right(int S, SlippageLandscapes* DOMupdates);
	void form_bulge(int S, bool form_left, SlippageLandscapes* DOMupdates);
	void absorb_bulge(int S, bool absorb_right, bool destroy_entire_bulge, SlippageLandscapes* DOMupdates); 
	void fissureBulgeLeft(int S, SlippageLandscapes* DOMupdates);
	void fissureBulgeRight(int S, SlippageLandscapes* DOMupdates);
	void fuseBulgeLeft(int S, SlippageLandscapes* DOMupdates);
	void fuseBulgeRight(int S, SlippageLandscapes* DOMupdates);



	// Bulge management
	int create_new_slipping_params();
	void reset_slipping_params(int S);
	int delete_slipping_params(int S);
	int get_fissure_landscape_of(int S);


	// Folding
	float foldUpstream();
	float foldDownstream();
	int findBondsRecurse(int index, string structureString, int index0BaseNumber);


	

    public:
    	State(bool init);
    	State(bool init, bool guiState);
    	State* clone();
    	State* print();
    	State* setToInitialState();
    	string toJSON();

    	State* transcribe(int N);
    	list<int> getTranscribeActions(int N);
    	State* stutter(int N);
		list<int> getStutterActions(int N);

    	// Reactions and their rates
		State* forward();
		State* terminate();
		double calculateForwardRate(bool lookupFirst, bool ignoreStateRestrictions);
		State* backward();
		double calculateBackwardRate(bool lookupFirst, bool ignoreStateRestrictions);

		State* bindNTP();
		double calculateBindOrCatNTPrate(bool ignoreStateRestrictions);
		double calculateBindNTPrate(bool ignoreStateRestrictions);
		double calculateCatalysisRate(bool ignoreStateRestrictions);
		State* releaseNTP();
		double calculateReleaseNTPRate(bool ignoreStateRestrictions);

		State* activate();
		double calculateActivateRate(bool ignoreStateRestrictions);
		State* deactivate();
		double calculateDeactivateRate(bool ignoreStateRestrictions);

		State* cleave();
		double calculateCleavageRate(bool ignoreStateRestrictions);



		// Fold mRNA and store secondary structure strings
		void fold(bool fold5Prime, bool fold3Prime);
		void unfold();

		// Fold mRNA and returns a JSON string with information on where to position the folded bases
		string foldJSON(bool fold5Prime, bool fold3Prime);

		State* slipLeft(int S);
		State* slipRight(int S);
		string getSlipLeftLabel(int S);
		string getSlipRightLabel(int S);



		void setNextBaseToAdd(string baseToAdd);
		string getNextBaseToAdd();
		bool get_thereHaveBeenMutations();
		bool isTerminated();
		bool NTPbound();
		string get_boundNTP();
		int get_mRNAPosInActiveSite();
		int get_nascentLength();
		string get_NascentSequence();
		int get_initialLength();

		int getLeftNascentBaseNumber();
		int getLeftTemplateBaseNumber();
		int getRightNascentBaseNumber();
		int getRightTemplateBaseNumber();

		int getLeftBulgeBoundary(); 
		int get_nextTemplateBaseToCopy();
		bool get_activated();


		void set_terminated(bool newVal);

		// Free energy calculations
		double calculateTranslocationFreeEnergy(bool ignoreParametersAndSettings);
		double calculateForwardTranslocationFreeEnergyBarrier(bool ignoreParametersAndSettings);
		double calculateBackwardTranslocationFreeEnergyBarrier(bool ignoreParametersAndSettings);

		string get_5primeStructure();
		string get_3primeStructure();
		float get_5primeStructureMFE();
		float get_3primeStructureMFE();


};




#endif

