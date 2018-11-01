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


#ifndef SIMULATORRESULTSUMMARY_H
#define SIMULATORRESULTSUMMARY_H



#include <string>
#include <list>
#include <vector>

using namespace std;


// Contains information on the results of a series of simulations
class SimulatorResultSummary{

	int ntrials;
	double meanVelocity;
	double meanTimeElapsed;
	list<int> transcriptLengths;
    list<vector<double>> proportionOfTimePerLength;
    vector<double> meanRelativeTimePerLength;


	public:

		SimulatorResultSummary(int ntrials);
		void set_meanVelocity(double v);
		void set_meanTimeElapsed(double t);
		void add_transcriptLength(int l);
		void add_transcriptLengths(list<int> l);
		void clear();

        void add_proportionOfTimePerLength(list<vector<double>> newProportionsOfTimePerLength);
        list<vector<double>> get_proportionOfTimePerLength();
        void compute_meanRelativeTimePerLength();
        vector<double> get_meanRelativeTimePerLength();
		int get_ntrials();
		double get_meanVelocity();
		double get_meanTimeElapsed();
		list<int> get_transcriptLengths();

};


#endif


