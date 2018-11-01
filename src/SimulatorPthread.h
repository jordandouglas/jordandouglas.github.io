
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


#ifndef SIMULATOR_PTHREAD_H
#define SIMULATOR_PTHREAD_H


#include "Settings.h"
#include "Simulator.h"
#include "SimulatorResultSummary.h"

#include <string>
#include <iostream>
#include <vector>
#include <thread>

using namespace std;

class SimulatorPthread{

	static void createThreadAndSimulate(int threadNum, SimulatorResultSummary* summary, bool verbose);
	static vector<Simulator*> simulators;


	public:
		static void init();
		static SimulatorResultSummary* performNSimulations(int N, bool verbose);


};




#endif