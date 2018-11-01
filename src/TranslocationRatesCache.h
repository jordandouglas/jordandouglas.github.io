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


#ifndef TRANSLOCATIONRATESCACHE_H
#define TRANSLOCATIONRATESCACHE_H

#include "State.h"

#include <string>
#include <vector>
#include <map>

using namespace std;


class TranslocationRatesCache{

	private:
		// double*** translocationRateTable;
		// double** backtrackRateTable;

		vector<vector<vector<double>>> translocationRateTable;
		vector<vector<double>> backtrackRateTable;


		double* upstreamRNABlockadeTable;
        vector<vector<double>> downstreamRNABlockadeTable;


		double getUpstreamRNABlockadeBarrierHeight(State* state);
		double getDownstreamRNABlockadeBarrierHeight(State* state);


		double meanGibbsEnergyBarrier;


	
	public:
		double getTranslocationRates(State* state, bool fwd);
		void buildTranslocationRateTable(string templSequence);
		void buildBacktrackRateTable(string templSequence);
		void buildUpstreamRNABlockadeTable(string templSequence);
		void buildDownstreamRNABlockadeTable(string templSequence);
		double get_meanGibbsEnergyBarrier();
		void reset_meanGibbsEnergyBarrier();

		TranslocationRatesCache();
		void initTranslocationRates(string templateSequence);
        void clear();

};


#endif