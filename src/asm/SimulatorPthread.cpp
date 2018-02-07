
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

using namespace std;

vector<Simulator*> SimulatorPthread::simulators;

// Initialises N_THREADS simulators
void SimulatorPthread::init(){

	simulators.resize(N_THREADS);
	for (int i = 0; i < N_THREADS; i++){
   		simulators.at(i) = new Simulator();
   	}


}




// Performs N simulations over N_THREADS threads and returns the mean velocity
double SimulatorPthread::performNSimulations(int N, bool verbose){


	// No threading
	if (N_THREADS == 1){
		double result[1];
		SimulatorPthread::createThreadAndSimulate(1, N, result, verbose);
		double velocity = result[0];
		return velocity;
	}


	// Allocate number of simulations to each thread
	// Each worker has same number of simulations, and if there are n remainders these are distributed equally among the first n threads 
	vector<int> nSimsPerThread(N_THREADS);
	int simsFloor = floor(N / N_THREADS);
	int simsRemain = N % N_THREADS;
	for (int i = 0; i < N_THREADS; i ++){
		nSimsPerThread.at(i) = simsFloor;
		if (i < simsRemain) nSimsPerThread.at(i)++;
	}



	// Create threads
   	vector<thread*> threads(N_THREADS);
   	vector<double*> velocities(N_THREADS);
   	for (int i = 0; i < N_THREADS; i++){
   		velocities.at(i) = new double[1];
   		threads.at(i) = new thread(SimulatorPthread::createThreadAndSimulate, i+1, nSimsPerThread.at(i), velocities.at(i), verbose);
   	}


   	// Join threads
   	for (int i = 0; i < N_THREADS; i++){
   		threads.at(i)->join();
   	}


   	// Calculate mean velocity
   	double meanVelocity = 0;
   	for (int i = 0; i < N_THREADS; i++){
   		meanVelocity += (velocities.at(i)[0] * nSimsPerThread.at(i)) / N;
   		//cout << velocities.at(i)[0] << endl;
   	}

	
	nSimsPerThread.clear();
	velocities.clear();
	threads.clear();
	

   	//cout << "Mean velocity = " << meanVelocity << endl;
   	return meanVelocity;

}





void SimulatorPthread::createThreadAndSimulate(int threadNum, int nsims, double* toReturn, bool verbose){

	//cout << "Running " << nsims << " simulations on thread " << threadNum << endl;
    State* initialState = new State(true);
   	double velocity = SimulatorPthread::simulators.at(threadNum-1)->perform_N_Trials(nsims, initialState, verbose);
   	delete initialState;
	//cout << "Velocity " << velocity << endl;
   	toReturn[0] = velocity;

}










