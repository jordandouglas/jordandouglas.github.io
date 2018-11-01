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


#ifndef HTML_OBJECT_H
#define HTML_OBJECT_H


#include "State.h"
#include "Settings.h"


#include <string>
#include <list>



// This class contains all information necessary for the object to be rendered onto the main canvas
class HTMLobject{


	string id;
	double x;
	double y;
	double dx;
	double dy;
	double width;
	double height;
	string src;
	int animationTime;

	string baseStr; // If nucleotide
	bool hasTP; // If nucleotide
	int ntPos; // If nucleotide
	string whichSeq; // If nucleotide
	bool isFolded; // If nucleotide
	bool isFoldAnchorPoint; // If nucleotide
	double foldX;
	double foldY;


	// Is a bond between two nucleotides
	bool isBond;
	int nt1;
	int nt2;
	bool basepair; // Basepair or backbone bond
	bool addBond; // Is the bond being added or removed

	bool needsAnimating;
	bool needsGenerating;
	bool needsSourceUpdate;
	bool needsDeleting;
	bool needsFolding;
	bool needsUnfolding;
	int zIndex;

	public:


		// Send a single instruction to the controller. eg. clear
		HTMLobject(string instruction);

		// Standard object constructor
		HTMLobject(string id, double x, double y, double width, double height, string src, int animation_time, int zIndex);

		// Nucleotide constructor
		HTMLobject(string id, double x, double y, double width, double height, string src, int animation_time, int zIndex, string baseStr, string whichSeq, bool hasTP, int ntPos);

		// Edge between two nucleotides
		HTMLobject(string id, int nt1, int nt2, bool basepair, bool add);


		string toJSON(bool render);
		void displace(double dx, double dy);
		void setAnimationTime(int animationTime);
		void updateSrc(string newSrc);
		void deleteObject();
		void setTP(bool addTP);
		void set_needsAnimating();
		void setAsAnchorPoint();

		string getID();
		string getBase();
		string getSrc();
		double getX();
		double getY();
		double getWidth();
		double getHeight();
		bool get_hasTP();
		bool get_needsGenerating();
		bool get_needsAnimating();
		bool get_needsSourceUpdate();
		bool get_needsDeleting();



		void setFoldedness(bool isFolded);
		void setFoldInitialPositions(double x, double y);




};


#endif
