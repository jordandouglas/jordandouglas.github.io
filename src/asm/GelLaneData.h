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


#ifndef GELLANEDATA_H
#define GELLANEDATA_H

#include <string>
#include <vector>


using namespace std;


// Contains positions and intensities of bands in a lane
class GelLaneData{


	int laneNum;
	int currentBandNum;
	double time;
	vector<double> transcriptLengths;
	vector<double> densities;
	bool simulateLane;


	// Lane rectangle coordinates
	double rectTop;
	double rectLeft;
	double rectWidth;
	double rectHeight;
	double rectAngle;


	public:


		GelLaneData(int laneNum, double time, vector<double> densities, double rectTop, double rectLeft, double rectWidth, double rectHeight, double rectAngle, bool simulateLane);


		string toJSON();
		void clear();

		double get_time();
		double get_densityAt(int len);

};


#endif

