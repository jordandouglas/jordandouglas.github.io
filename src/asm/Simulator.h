
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


#ifndef SIMULATOR_H
#define SIMULATOR_H

#include "State.h"
#include "randomc/randomc.h"

#include <string>
#include <list>
#include <thread>


using namespace std;

class Simulator{



	void performSimulation(State* state, double* toReturn);
	void executeAction(State* s, int reactionToDo);
	double geometricTranslocationSampling(State* s);
	double geometricTranslocationBindingSampling(State* s);
	double geometricBindingSampling(State* s);

	// Animation mode
	bool animatingGUI;
	list<int> actionsToReturn;

	// Timer
	//void timer_start(unsigned int interval);


	// Store the number of trials remaining and the current state for GUI purposes
	int nTrialsTotalGUI;
	int nTrialsCompletedGUI;
	int niterationsUntilLastTimeoutCheck;
	double simulateForSeconds;
	double inSimulationTimeElapsedCurrentSimulation; // Time elapsed in the current simulation (for GUI)

	// Random number generation
	random_device rd; 
    CRandomMersenne* sfmt;

    public:
    	Simulator();
    	double perform_N_Trials(int N, State* state, bool verbose);
    	int getNtrialsTotal_GUI();
    	int getNtrialsCompleted_GUI();
    	list<int> sample_action_GUI();
    	void initialise_GUI_simulation(int N, double msUntilStop);
    	void perform_N_Trials_and_stop_GUI(double* toReturn);
    	void resume_trials_GUI(double* toReturn);
    	double rexp(double rate);
    	double runif();

};




#endif

