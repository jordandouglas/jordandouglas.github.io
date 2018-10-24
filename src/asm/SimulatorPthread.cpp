
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


#include "SimulatorPthread.h"
#include "Plots.h"

using namespace std;

vector<Simulator*> SimulatorPthread::simulators;

// Initialises N_THREADS simulators
void SimulatorPthread::init(){

	simulators.resize(N_THREADS);
	for (int i = 0; i < N_THREADS; i++){
        Plots* simulator_plots = new Plots();
   		simulators.at(i) = new Simulator(simulator_plots);
   	}


}




// Performs N simulations over N_THREADS threads and returns the mean velocity
SimulatorResultSummary* SimulatorPthread::performNSimulations(int N, bool verbose){


	// No threading
	if (N_THREADS == 1){
		SimulatorResultSummary* result = new SimulatorResultSummary(N);
		SimulatorPthread::createThreadAndSimulate(1, result, verbose);
        result->compute_meanRelativeTimePerLength();
		return result;
	}


	SimulatorResultSummary* mergedResult = new SimulatorResultSummary(N); // Returning this object


	// Allocate number of simulations to each thread
	// Each worker has same number of simulations, and if there are n remainders these are distributed equally among the first n threads 
	int simsFloor = floor(N / N_THREADS);
	int simsRemain = N % N_THREADS;
   	vector<thread*> threads(N_THREADS);
   	vector<SimulatorResultSummary*> results(N_THREADS);
	for (int i = 0; i < N_THREADS; i ++){
		int nSims = simsFloor;
		if (i < simsRemain) nSims ++;
		results.at(i) = new SimulatorResultSummary(nSims);
	}



	// Create threads
   	for (int i = 0; i < N_THREADS; i++){
   		threads.at(i) = new thread(SimulatorPthread::createThreadAndSimulate, i+1, results.at(i), verbose);
   	}


   	// Join threads
   	for (int i = 0; i < N_THREADS; i++){
   		threads.at(i)->join();
   	}


   	// Merge results into a single mean result
	double meanVelocity = 0;
	double meanTime = 0;
   	for (int i = 0; i < N_THREADS; i++){
   		meanVelocity += (results.at(i)->get_meanVelocity() * results.at(i)->get_ntrials()) / N;
   		meanTime += (results.at(i)->get_meanTimeElapsed() * results.at(i)->get_ntrials()) / N;
   		mergedResult->add_transcriptLengths(results.at(i)->get_transcriptLengths());



        // Merge times at each transcript length
        mergedResult->add_proportionOfTimePerLength(results.at(i)->get_proportionOfTimePerLength());


   		//cout << velocities.at(i)[0] << endl;
   		delete threads.at(i);
   		//results.at(i).clear();
   		delete results.at(i);


   	}


	mergedResult->compute_meanRelativeTimePerLength();
	results.clear();
	threads.clear();

   	//cout << "Mean velocity = " << meanVelocity << endl;

   	mergedResult->set_meanVelocity(meanVelocity);
	mergedResult->set_meanTimeElapsed(meanTime);


   	return mergedResult;
}




// Perform the number of simulations specified in the SimulatorResultSummary object and populate this object with a summary of the results
void SimulatorPthread::createThreadAndSimulate(int threadNum, SimulatorResultSummary* summary, bool verbose){


    State* initialState = new State(true);
    SimulatorPthread::simulators.at(threadNum-1)->perform_N_Trials(summary, initialState, verbose);
    summary->add_proportionOfTimePerLength(SimulatorPthread::simulators.at(threadNum-1)->getPlots()->getProportionOfTimePerLength());
    SimulatorPthread::simulators.at(threadNum-1)->getPlots()->clear();
   	delete initialState;


}










