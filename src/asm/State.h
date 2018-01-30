
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

#include <string>

using namespace std;

class State{



	string nascentSequence;
	int mRNAPosInActiveSite;
	string boundNTP;
	bool terminated;



    public:
    	State(bool init);
    	State* clone();
    	State* print();
    	State* setToInitialState();
    	State* transcribe(int N);
		State* forward();
		double calculateForwardRate(bool lookupFirst, bool ignoreStateRestrictions);
		State* backward();
		double calculateBackwardRate(bool lookupFirst, bool ignoreStateRestrictions);
		State* bindNTP();
		double calculateBindNTPrate(bool ignoreStateRestrictions);
		State* releaseNTP();
		double calculateReleaseNTPRate(bool ignoreStateRestrictions);
		bool isTerminated();
		bool NTPbound();
		int get_mRNAPosInActiveSite();
		int get_nascentLength();
		string get_NascentSequence();
		int get_initialLength();
		int getLeftBaseNumber();
		int getRightBaseNumber();

		void set_mRNAPosInActiveSite(int newVal);
		void set_terminated(bool newVal);

		// Free energy calculations
		double calculateTranslocationFreeEnergy();
		double calculateForwardTranslocationFreeEnergyBarrier();
		double calculateBackwardTranslocationFreeEnergyBarrier();


};




#endif

