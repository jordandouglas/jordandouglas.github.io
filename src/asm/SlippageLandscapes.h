

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


#ifndef SLIPPAGE_LANDSCAPES_H
#define SLIPPAGE_LANDSCAPES_H

#include <string>
#include <list>


using namespace std;

class SlippageLandscapes{



	// Creating / deleting slippage landscapes
	list<int> where_to_create_new_slipping_landscape;
	list<int> landscapes_to_reset;
	list<int> landscapes_to_delete;


	public:
		SlippageLandscapes();
		void add_where_to_create_new_slipping_landscape(int val);
		void add_landscapes_to_reset(int val);
		void add_landscapes_to_delete(int val);
		string toJSON();
		void reset();


		// Return sizes of these lists
		int get_where_to_create_new_slipping_landscape_size();
		int get_landscapes_to_reset_size();
		int get_landscapes_to_delete_size();


};

#endif